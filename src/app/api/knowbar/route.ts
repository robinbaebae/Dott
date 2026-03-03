import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { runAgentPipeline } from '@/lib/agents';
import { logActivity } from '@/lib/activity';
import { generateCompletion, getUserApiKey } from '@/lib/claude';
import { BANNER_GENERATION_PROMPT, BANNER_EDIT_PROMPT, FIGMA_DESIGN_PROMPT, FIGMA_DESIGN_EDIT_PROMPT } from '@/lib/prompts';
import { getBrandGuideContext } from '@/lib/brand-guide';
import { requireAuth } from '@/lib/auth-guard';

// Vercel serverless 타임아웃 확장 (기본 10초 → 60초)
export const maxDuration = 60;

const isDev = process.env.NODE_ENV === 'development';

// Detection instructions injected so all agents can use structured response tags
const DETECTION_INSTRUCTIONS = `

--- IMPORTANT INSTRUCTIONS ---
You MUST follow these tag-based response instructions:

TASK DETECTION:
If the user wants to create a task, to-do, reminder, or schedule something, respond with this at the very beginning:
<task>{"title":"the task title in the user's language","urgent":true/false,"important":true/false}</task>
Then follow with a short, friendly confirmation.

MEMORY DETECTION:
If the user wants to remember something, respond with this at the very beginning:
<memory>{"content":"the thing to remember, in the user's language"}</memory>
Then follow with a short, friendly confirmation.

CALENDAR EVENT / MEETING BOOKING:
When the user wants to schedule a meeting or create a calendar event:
1. If the user says something vague like "미팅 예약", "회의 잡아줘", "일정 등록", ASK for the missing details:
   - 누구와 (who / meeting title)
   - 언제 (date and time)
2. Once you have ALL required info (title + date + time), create the event by responding with:
<calendar>{"summary":"event title","date":"YYYY-MM-DD","startTime":"HH:mm","endTime":"HH:mm","attendees":[{"email":"...","displayName":"..."}]}</calendar>
Then show: [날짜] [시간] [미팅 제목] 으로 등록했어요.
- Use 24-hour time. If no end time, default to +1 hour.
- Today is ${new Date().toISOString().split('T')[0]}. "내일" = tomorrow, "오늘" = today.
- Use conversation history — don't re-ask for info already provided.
- Match attendee names from the 참석자 목록 if provided.

EMAIL REPLY DETECTION:
If the user wants to compose an email, respond with this at the very beginning:
<email>{"to":"recipient email if known","topic":"what the email is about","tone":"professional"}</email>
Then follow with a short, friendly confirmation.

BLOG POST DETECTION:
If the user wants to write a blog post, article, or long-form content, respond with this at the very beginning:
<blog>{"title":"블로그 제목","content":"마크다운 본문 (최소 500자, 소제목/리스트 포함)","meta_description":"SEO 설명 1줄","header_copy":"헤더이미지에 들어갈 짧은 카피 (10자 이내)"}</blog>
Then follow with a short confirmation like "블로그 초안이랑 헤더이미지 만들었어요! 수정할 부분 말씀해주세요."

BANNER/HEADER IMAGE SHOW DETECTION:
If the user wants to SEE or RE-DISPLAY a previously generated banner or header image (e.g. "이미지 보여줘", "헤더 다시 보여줘", "배너 보여줘"):
<banner_show>{}</banner_show>
Then follow with a short confirmation like "이전에 만든 헤더 이미지를 다시 불러왔어요!"
The system will automatically find and display the most recent banner.

BANNER/HEADER IMAGE EDIT DETECTION:
If the user wants to MODIFY a previously generated banner or header image (color change, text change, layout change, etc.):
<banner_edit>{"instruction":"사용자의 수정 요청 원문 그대로"}</banner_edit>
Then follow with a short confirmation. The system will automatically find the most recent banner to edit.

TASK STATUS UPDATE:
If the user wants to mark a task as done, complete, or change its status (e.g. "그 태스크 완료해줘", "XX 끝났어"):
<task_update>{"title":"task title to search for","status":"done"}</task_update>
Then follow with a short confirmation like "완료 처리했어요!"

MEMO CREATION:
If the user says "메모해줘", "기록해줘", "적어둬" with specific content to save:
<memo>{"title":"short memo title","content":"full memo content"}</memo>
Then confirm like "메모 저장했어요!"

CONTENT SCHEDULE:
If the user wants to schedule a social media post (e.g. "내일 인스타 포스팅 예약해줘"):
<schedule>{"title":"content title","platform":"instagram","date":"YYYY-MM-DD"}</schedule>
Then confirm like "콘텐츠 예약했어요!"

FIGMA DESIGN:
If the user wants to create a design, visual, creative, or graphic for Figma (e.g. "인스타 포스트 디자인 만들어줘", "프로모션 배너 피그마에 만들어줘", "소셜 미디어 카드 디자인해줘", "랜딩페이지 섹션 만들어줘"):
<figma_design>{"description":"detailed design description in Korean","size":"1080x1080","type":"social_post"}</figma_design>
- description: 디자인의 상세 설명 (레이아웃, 색상, 텍스트 내용, 스타일 등 가능한 구체적으로)
- size: 디자인 사이즈 (Instagram: 1080x1080, Story: 1080x1920, Facebook: 1200x630, 프레젠테이션: 1920x1080, 세로: 1080x1350)
- type: social_post, story, banner, presentation, card, infographic, landing_section
Then confirm like "피그마 디자인을 생성할게요! 잠시만 기다려주세요."

FIGMA DESIGN EDIT:
If the user wants to MODIFY a previously generated Figma design (e.g. "배경색 바꿔줘", "텍스트 크기 키워줘", "CTA 버튼 추가해줘"):
<figma_design_edit>{"instruction":"user's edit request verbatim"}</figma_design_edit>
Then confirm like "디자인을 수정할게요!"

LANGUAGE: Always reply in the SAME language the user writes in. Korean → Korean. English → English.
--- END INSTRUCTIONS ---
`;

export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;
  const apiKey = await getUserApiKey(userEmail);


  const body = await req.json();
  const message = body.message;
  const history: { role: string; content: string }[] = body.history || [];
  const lastBannerId: string | undefined = body.lastBannerId;
  const lastFigmaDesignId: string | undefined = body.lastFigmaDesignId;
  if (isDev) console.log('[knowbar] message:', message, '| lastBannerId:', lastBannerId, '| lastFigmaDesignId:', lastFigmaDesignId);
  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'message required' }, { status: 400 });
  }

  try {
    // ─── Shortcut: detect design requests early → skip full pipeline ───
    const isDesignRequest = /디자인|피그마.*(디자인|작업|생성|제작)|figma|포스트.*만들|배너.*만들|카드.*만들|템플릿.*만들|소셜.*미디어.*만들|인스타.*만들|크리에이티브.*만들|design.*make|design.*create/i.test(message);
    const isDesignEdit = lastFigmaDesignId && /수정|바꿔|변경|키워|줄여|추가|제거|색상|컬러|폰트|텍스트|배경|edit|change|modify/i.test(message);

    if (isDesignRequest || isDesignEdit) {
      if (isDev) console.log('[knowbar] Design shortcut — skipping full pipeline');

      let brandContext = '';
      try { brandContext = await getBrandGuideContext(userEmail); } catch { /* */ }

      let figmaDesignResult: { designId: string; html: string; description: string; size: string; status: string } | undefined;

      if (isDesignEdit && lastFigmaDesignId) {
        // Edit existing design
        const { data: existing } = await supabaseAdmin
          .from('figma_designs')
          .select('id, html')
          .eq('id', lastFigmaDesignId)
          .single();

        if (existing?.html) {
          const editPrompt = `Existing HTML:\n${existing.html}\n\nEdit request: ${message}\n\nReturn ONLY the modified HTML. Start with <!DOCTYPE html>.${brandContext ? `\n\nBrand context:\n${brandContext}` : ''}`;
          const editedHtml = await generateCompletion(apiKey, FIGMA_DESIGN_EDIT_PROMPT, editPrompt);
          const cleanHtml = editedHtml.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').replace(/^[\s\S]*?(<!DOCTYPE)/i, '$1').trim();

          await supabaseAdmin
            .from('figma_designs')
            .update({ html: cleanHtml, updated_at: new Date().toISOString() })
            .eq('id', existing.id);

          figmaDesignResult = {
            designId: existing.id,
            html: cleanHtml,
            description: message.slice(0, 200),
            size: '',
            status: 'generated',
          };
        }
      } else {
        // New design
        let size = '1080x1080';
        const sizeMatch = message.match(/(\d{3,4})\s*[x×]\s*(\d{3,4})/);
        if (sizeMatch) size = `${sizeMatch[1]}x${sizeMatch[2]}`;
        else if (/스토리|story|릴스|reels/i.test(message)) size = '1080x1920';
        else if (/페이스북|facebook|og/i.test(message)) size = '1200x630';
        else if (/프레젠|presentation|슬라이드/i.test(message)) size = '1920x1080';
        else if (/세로|portrait|1350/i.test(message)) size = '1080x1350';

        const designPrompt = `Create a ${size} design for: ${message}\n\nReturn ONLY the complete HTML document. Start with <!DOCTYPE html> and end with </html>. Use a fixed-size container of exactly ${size.replace('x', 'px width and ')}px height. No explanations.${brandContext ? `\n\nBrand context:\n${brandContext}` : ''}`;
        const designHtml = await generateCompletion(apiKey, FIGMA_DESIGN_PROMPT, designPrompt);
        const cleanHtml = designHtml.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').replace(/^[\s\S]*?(<!DOCTYPE)/i, '$1').trim();

        const { data: saved } = await supabaseAdmin
          .from('figma_designs')
          .insert({
            user_id: userEmail,
            prompt: message.slice(0, 200),
            size,
            html: cleanHtml,
            status: 'generated',
          })
          .select('id')
          .single();

        if (saved) {
          figmaDesignResult = {
            designId: saved.id,
            html: cleanHtml,
            description: message.slice(0, 200),
            size,
            status: 'generated',
          };
        }
      }

      if (figmaDesignResult) {
        await logActivity('figma_design', 'design', { designId: figmaDesignResult.designId });

        const confirmMsg = isDesignEdit
          ? '디자인을 수정했어요! 아래 미리보기를 확인해주세요. 추가 수정이 필요하면 말씀해주세요.'
          : '디자인을 생성했어요! 아래 미리보기를 확인하고, Figma로 바로 보낼 수 있어요. 수정이 필요하면 말씀해주세요.';

        return NextResponse.json({
          response: confirmMsg,
          agentId: 'design',
          agentName: 'Design Expert',
          agentIcon: '🎨',
          skill: 'figma_design',
          figmaDesign: {
            designId: figmaDesignResult.designId,
            html: figmaDesignResult.html,
            description: figmaDesignResult.description,
            size: figmaDesignResult.size,
            status: figmaDesignResult.status,
          },
        });
      }
    }

    // ─── Normal path: full agent pipeline ───

    // Run the full agent pipeline: classify → context → execute
    const result = await runAgentPipeline(message, {
      history,
      extraInstructions: DETECTION_INSTRUCTIONS,
      userEmail,
    });

    const responseText = result.response;
    if (isDev) console.log('[knowbar] raw response (first 300):', responseText.slice(0, 300));

    // Step 3: Check for task creation
    const taskMatch = responseText.match(/<task>\s*(\{[^}]+\})\s*<\/task>/);
    let taskCreated = false;
    let taskTitle = '';

    if (taskMatch) {
      try {
        const taskData = JSON.parse(taskMatch[1]);
        taskTitle = taskData.title;
        if (taskTitle) {
          await supabaseAdmin.from('tasks').insert({
            title: taskTitle,
            status: 'todo',
            urgent: taskData.urgent ?? false,
            important: taskData.important ?? false,
            user_id: userEmail,
          });
          taskCreated = true;
        }
      } catch {
        // parse error — ignore
      }
    }

    // Step 4: Check for memory creation
    const memoryMatch = responseText.match(/<memory>\s*(\{[^}]+\})\s*<\/memory>/);
    let memoryCreated = false;

    if (memoryMatch) {
      try {
        const memoryData = JSON.parse(memoryMatch[1]);
        if (memoryData.content) {
          await supabaseAdmin.from('insights').insert({
            url: '',
            title: memoryData.content.slice(0, 100),
            description: memoryData.content,
            memo: '',
            content_type: 'memory',
            thumbnail_url: '',
            source_domain: 'dott',
            user_id: userEmail,
          });
          memoryCreated = true;
        }
      } catch {
        // parse error — ignore
      }
    }

    // Step 5: Check for banner creation
    const bannerMatch = responseText.match(/<banner>\s*(\{[\s\S]*?\})\s*<\/banner>/);
    let bannerId: string | undefined;

    if (bannerMatch) {
      try {
        const bannerData = JSON.parse(bannerMatch[1]);
        const { copy, size = '1080x1080', reference = '' } = bannerData;
        if (copy) {
          const userPrompt = `카피: ${copy}\n사이즈: ${size}\n참고사항: ${reference}`;
          const htmlResult = await generateCompletion(apiKey, BANNER_GENERATION_PROMPT, userPrompt);
          const cleanHtml = htmlResult
            .replace(/^```html?\n?/i, '')
            .replace(/\n?```$/i, '')
            .trim();

          const { data: banner } = await supabaseAdmin
            .from('banners')
            .insert({ copy, reference, size, html: cleanHtml, user_id: userEmail })
            .select()
            .single();

          if (banner) {
            bannerId = banner.id;
          }
        }
      } catch {
        // banner parse/generation error — continue without it
      }
    }

    // Step 5b: Check for blog post creation
    const blogMatch = responseText.match(/<blog>\s*(\{[\s\S]*?\})\s*<\/blog>/);
    let blogTitle: string | undefined;
    let blogContent: string | undefined;
    let blogMetaDesc: string | undefined;
    let bannerHtml: string | undefined;

    if (blogMatch) {
      try {
        const blogData = JSON.parse(blogMatch[1]);
        blogTitle = blogData.title;
        blogContent = blogData.content;
        blogMetaDesc = blogData.meta_description;
        const headerCopy = blogData.header_copy || blogData.title;

        if (headerCopy) {
          const userPrompt = `카피: ${headerCopy}\n사이즈: 1200x630\n참고사항: 블로그 헤더이미지, 세련되고 모던한 디자인, 코드앤버터 브랜드 #5B4D6E 퍼플 계열`;
          const htmlResult = await generateCompletion(apiKey, BANNER_GENERATION_PROMPT, userPrompt);
          const cleanHtml = htmlResult
            .replace(/^```html?\n?/i, '')
            .replace(/\n?```$/i, '')
            .trim();

          const { data: banner } = await supabaseAdmin
            .from('banners')
            .insert({ copy: headerCopy, reference: 'blog-header', size: '1200x630', html: cleanHtml, user_id: userEmail })
            .select()
            .single();

          if (banner) {
            bannerId = banner.id;
            bannerHtml = cleanHtml;
          }
        }
      } catch {
        // blog parse error — continue
      }
    }

    // Step 5c: Check for banner edit request
    const bannerEditMatch = responseText.match(/<banner_edit>\s*(\{[\s\S]*?\})\s*<\/banner_edit>/);

    if (bannerEditMatch) {
      try {
        const editData = JSON.parse(bannerEditMatch[1]);
        const targetBannerId = editData.bannerId || lastBannerId;

        if (targetBannerId && editData.instruction) {
          const { data: existing } = await supabaseAdmin
            .from('banners')
            .select('html, copy, size')
            .eq('id', targetBannerId)
            .single();

          if (existing?.html) {
            const editPrompt = `기존 HTML:\n${existing.html}\n\n수정 요청: ${editData.instruction}`;
            const editedHtml = await generateCompletion(apiKey, BANNER_EDIT_PROMPT, editPrompt);
            const cleanEdited = editedHtml
              .replace(/^```html?\n?/i, '')
              .replace(/\n?```$/i, '')
              .trim();

            await supabaseAdmin
              .from('banners')
              .update({ html: cleanEdited })
              .eq('id', targetBannerId);

            bannerId = targetBannerId;
            bannerHtml = cleanEdited;
          }
        }
      } catch {
        // banner edit error — continue
      }
    }

    // Step 5d: Check for banner show (re-display existing banner)
    // Works via <banner_show> tag, keyword fallback, or fetches latest banner from DB
    const bannerShowMatch = responseText.match(/<banner_show>\s*(\{[\s\S]*?\})\s*<\/banner_show>/);
    const mentionsBanner = /배너|헤더|이미지|불러|보여|banner|header|image/i.test(responseText);

    if (isDev) console.log('[knowbar] banner check — bannerId:', bannerId, '| lastBannerId:', lastBannerId, '| bannerShowMatch:', !!bannerShowMatch, '| mentionsBanner:', mentionsBanner);

    if (!bannerId && (bannerShowMatch || (lastBannerId && mentionsBanner))) {
      try {
        // Priority: explicit tag bannerId > lastBannerId from history > latest from DB
        let targetId = lastBannerId;
        if (bannerShowMatch) {
          const showData = JSON.parse(bannerShowMatch[1]);
          targetId = showData.bannerId || lastBannerId;
        }

        // If still no targetId, fetch the most recent banner from DB
        if (!targetId) {
          const { data: latest } = await supabaseAdmin
            .from('banners')
            .select('id')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          targetId = latest?.id;
        }

        if (isDev) console.log('[knowbar] fetching banner:', targetId);

        if (targetId) {
          const { data: existing, error: bannerErr } = await supabaseAdmin
            .from('banners')
            .select('id, html')
            .eq('id', targetId)
            .single();

          if (isDev) console.log('[knowbar] banner fetch result — found:', !!existing?.html, '| error:', bannerErr?.message);

          if (existing?.html) {
            bannerId = existing.id;
            bannerHtml = existing.html;
          }
        }
      } catch (e) {
        console.error('[knowbar] banner show error:', e);
      }
    }

    // Step 6: Check for calendar event creation
    const calendarMatch = responseText.match(/<calendar>\s*(\{[\s\S]*?\})\s*<\/calendar>/);
    let calendarCreated = false;

    if (calendarMatch) {
      try {
        const calData = JSON.parse(calendarMatch[1]);
        if (calData.summary && calData.date && calData.startTime) {
          const endTime = calData.endTime || (() => {
            const [h, m] = calData.startTime.split(':').map(Number);
            return `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
          })();
          const startISO = `${calData.date}T${calData.startTime}:00+09:00`;
          const endISO = `${calData.date}T${endTime}:00+09:00`;

          const calRes = await fetch(`${req.nextUrl.origin}/api/calendar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              summary: calData.summary,
              startTime: startISO,
              endTime: endISO,
              attendees: calData.attendees || undefined,
            }),
          });
          calendarCreated = calRes.ok;
        }
      } catch {
        // calendar parse/create error — ignore
      }
    }

    // Step 7: Check for email compose
    const emailMatch = responseText.match(/<email>\s*(\{[^}]+\})\s*<\/email>/);
    let emailDrafted = false;

    if (emailMatch) {
      try {
        const emailData = JSON.parse(emailMatch[1]);
        if (emailData.topic) {
          const composeRes = await fetch(`${req.nextUrl.origin}/api/gmail/compose`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'generate',
              to: emailData.to || '',
              topic: emailData.topic,
              details: emailData.details || '',
              tone: emailData.tone || 'professional',
            }),
          });
          emailDrafted = composeRes.ok;
        }
      } catch {
        // email compose error — ignore
      }
    }

    // Step 8: Check for task status update
    const taskUpdateMatch = responseText.match(/<task_update>\s*(\{[\s\S]*?\})\s*<\/task_update>/);
    let taskUpdated = false;
    let taskUpdateTitle = '';

    if (taskUpdateMatch) {
      try {
        const updateData = JSON.parse(taskUpdateMatch[1]);
        if (updateData.title) {
          taskUpdateTitle = updateData.title;
          const newStatus = updateData.status || 'done';
          // Find task by title (fuzzy match)
          const { data: matchedTasks } = await supabaseAdmin
            .from('tasks')
            .select('id, title')
            .eq('user_id', userEmail)
            .neq('status', 'done')
            .ilike('title', `%${updateData.title}%`)
            .limit(1);
          if (matchedTasks && matchedTasks.length > 0) {
            await supabaseAdmin.from('tasks').update({ status: newStatus }).eq('id', matchedTasks[0].id);
            taskUpdated = true;
            taskUpdateTitle = matchedTasks[0].title;
          }
        }
      } catch { /* parse error */ }
    }

    // Step 9: Check for memo creation → save to memos table
    const memoMatch = responseText.match(/<memo>\s*(\{[\s\S]*?\})\s*<\/memo>/);
    let memoCreated = false;
    let memoTitle = '';

    if (memoMatch) {
      try {
        const memoData = JSON.parse(memoMatch[1]);
        if (memoData.title || memoData.content) {
          memoTitle = memoData.title || memoData.content?.slice(0, 50) || '';
          const content = memoData.content || memoTitle;
          // Parse #tags from content
          const tagMatches = content.match(/#([^\s#]+)/g);
          const tags = tagMatches ? [...new Set(tagMatches.map((m: string) => m.slice(1)))] : [];
          await supabaseAdmin.from('memos').insert({
            user_id: userEmail,
            title: memoTitle,
            content,
            tags,
            pinned: false,
          });
          memoCreated = true;
        }
      } catch { /* parse error */ }
    }

    // Step 10: Check for content schedule
    const scheduleMatch = responseText.match(/<schedule>\s*(\{[\s\S]*?\})\s*<\/schedule>/);
    let scheduleCreated = false;
    let scheduleTitle = '';

    if (scheduleMatch) {
      try {
        const scheduleData = JSON.parse(scheduleMatch[1]);
        if (scheduleData.title) {
          scheduleTitle = scheduleData.title;
          await supabaseAdmin.from('content_calendar').insert({
            title: scheduleData.title,
            platform: scheduleData.platform || 'instagram',
            scheduled_date: scheduleData.date || new Date().toISOString().split('T')[0],
            status: 'scheduled',
            user_id: userEmail,
          });
          scheduleCreated = true;
        }
      } catch { /* parse error */ }
    }

    // Step 11: Check for Figma design creation
    const figmaDesignMatch = responseText.match(/<figma_design>\s*(\{[\s\S]*?\})\s*<\/figma_design>/);
    let figmaDesign: { designId: string; html: string; description: string; size: string; status: string } | undefined;

    if (figmaDesignMatch) {
      try {
        const designData = JSON.parse(figmaDesignMatch[1]);
        if (designData.description) {
          // Get brand context
          let brandContext = '';
          try { brandContext = await getBrandGuideContext(userEmail); } catch { /* */ }

          const designPrompt = `디자인 요청: ${designData.description}\n사이즈: ${designData.size || '1080x1080'}\n유형: ${designData.type || 'social_post'}${brandContext ? `\n\n브랜드 컨텍스트:\n${brandContext}` : ''}`;
          const designHtml = await generateCompletion(apiKey, FIGMA_DESIGN_PROMPT, designPrompt);
          const cleanHtml = designHtml.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();

          // Save to DB
          const { data: saved } = await supabaseAdmin
            .from('figma_designs')
            .insert({
              user_id: userEmail,
              prompt: designData.description,
              size: designData.size || '1080x1080',
              html: cleanHtml,
              status: 'generated',
            })
            .select('id')
            .single();

          if (saved) {
            figmaDesign = {
              designId: saved.id,
              html: cleanHtml,
              description: designData.description,
              size: designData.size || '1080x1080',
              status: 'generated',
            };
          }
        }
      } catch (e) {
        console.error('[knowbar] figma design error:', e);
      }
    }

    // Step 11b: Check for Figma design edit
    const figmaDesignEditMatch = responseText.match(/<figma_design_edit>\s*(\{[\s\S]*?\})\s*<\/figma_design_edit>/);

    if (figmaDesignEditMatch && !figmaDesign) {
      try {
        const editData = JSON.parse(figmaDesignEditMatch[1]);
        // Find the most recent figma_design for this user
        const targetDesignId = editData.designId || lastFigmaDesignId;

        let existingHtml = '';
        let existingId = targetDesignId;

        if (targetDesignId) {
          const { data: existing } = await supabaseAdmin
            .from('figma_designs')
            .select('id, html')
            .eq('id', targetDesignId)
            .single();
          existingHtml = existing?.html || '';
          existingId = existing?.id;
        }

        if (!existingHtml) {
          // Fallback: get most recent design
          const { data: latest } = await supabaseAdmin
            .from('figma_designs')
            .select('id, html')
            .eq('user_id', userEmail)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          existingHtml = latest?.html || '';
          existingId = latest?.id;
        }

        if (existingHtml && editData.instruction) {
          let brandContext = '';
          try { brandContext = await getBrandGuideContext(userEmail); } catch { /* */ }

          const editPrompt = `기존 HTML:\n${existingHtml}\n\n수정 요청: ${editData.instruction}${brandContext ? `\n\n브랜드 컨텍스트:\n${brandContext}` : ''}`;
          const editedHtml = await generateCompletion(apiKey, FIGMA_DESIGN_EDIT_PROMPT, editPrompt);
          const cleanEdited = editedHtml.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim();

          // Update DB
          if (existingId) {
            await supabaseAdmin
              .from('figma_designs')
              .update({ html: cleanEdited, updated_at: new Date().toISOString() })
              .eq('id', existingId);
          }

          figmaDesign = {
            designId: existingId,
            html: cleanEdited,
            description: editData.instruction,
            size: '',
            status: 'generated',
          };
        }
      } catch (e) {
        console.error('[knowbar] figma design edit error:', e);
      }
    }

    // Step 11c: Fallback — if no figma_design tag but response contains raw HTML (CLI often does this)
    if (!figmaDesign && !bannerId) {
      const isDesignRequest = /디자인|피그마|figma|포스트.*만들|배너.*만들|카드.*만들|템플릿/i.test(message);
      const htmlCodeBlock = responseText.match(/```html?\s*\n([\s\S]*?)```/);
      const rawHtmlMatch = !htmlCodeBlock ? responseText.match(/(<!DOCTYPE html[\s\S]*<\/html>)/i) : null;
      const extractedHtml = htmlCodeBlock?.[1]?.trim() || rawHtmlMatch?.[1]?.trim();

      if (isDesignRequest && extractedHtml && extractedHtml.length > 100) {
        try {
          // Detect size from message or default
          let size = '1080x1080';
          const sizeMatch = message.match(/(\d{3,4})\s*[x×]\s*(\d{3,4})/);
          if (sizeMatch) size = `${sizeMatch[1]}x${sizeMatch[2]}`;
          else if (/스토리|story|릴스|reels/i.test(message)) size = '1080x1920';
          else if (/페이스북|facebook|og/i.test(message)) size = '1200x630';
          else if (/프레젠|presentation|슬라이드/i.test(message)) size = '1920x1080';

          const { data: saved } = await supabaseAdmin
            .from('figma_designs')
            .insert({
              user_id: userEmail,
              prompt: message.slice(0, 200),
              size,
              html: extractedHtml,
              status: 'generated',
            })
            .select('id')
            .single();

          if (saved) {
            figmaDesign = {
              designId: saved.id,
              html: extractedHtml,
              description: message.slice(0, 200),
              size,
              status: 'generated',
            };
          }
        } catch (e) {
          console.error('[knowbar] figma design fallback error:', e);
        }
      }
    }

    let cleanResponse = responseText
      .replace(/<task>\s*\{[^}]+\}\s*<\/task>\s*/g, '')
      .replace(/<memory>\s*\{[^}]+\}\s*<\/memory>\s*/g, '')
      .replace(/<banner>\s*\{[\s\S]*?\}\s*<\/banner>\s*/g, '')
      .replace(/<blog>\s*\{[\s\S]*?\}\s*<\/blog>\s*/g, '')
      .replace(/<banner_edit>\s*\{[\s\S]*?\}\s*<\/banner_edit>\s*/g, '')
      .replace(/<banner_show>\s*\{[\s\S]*?\}\s*<\/banner_show>\s*/g, '')
      .replace(/<calendar>\s*\{[\s\S]*?\}\s*<\/calendar>\s*/g, '')
      .replace(/<email>\s*\{[^}]+\}\s*<\/email>\s*/g, '')
      .replace(/<task_update>\s*\{[\s\S]*?\}\s*<\/task_update>\s*/g, '')
      .replace(/<memo>\s*\{[\s\S]*?\}\s*<\/memo>\s*/g, '')
      .replace(/<schedule>\s*\{[\s\S]*?\}\s*<\/schedule>\s*/g, '')
      .replace(/<figma_design>\s*\{[\s\S]*?\}\s*<\/figma_design>\s*/g, '')
      .replace(/<figma_design_edit>\s*\{[\s\S]*?\}\s*<\/figma_design_edit>\s*/g, '')
      .trim();

    // When figmaDesign was created, strip out any raw HTML from response text
    if (figmaDesign) {
      cleanResponse = cleanResponse
        .replace(/```html?\s*\n[\s\S]*?```/g, '')
        .replace(/<!DOCTYPE html[\s\S]*<\/html>/gi, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      // If nothing meaningful left, provide a default message
      if (!cleanResponse || cleanResponse.length < 10) {
        cleanResponse = `디자인을 생성했어요! 아래 미리보기를 확인하고, Figma로 바로 보낼 수 있어요. 수정이 필요하면 말씀해주세요.`;
      }
    }

    const webSearchUsed = !!result.webSearchUsed;

    // Log token usage (approximate: ~4 chars per token)
    const tokensIn = Math.ceil(message.length / 4);
    const tokensOut = Math.ceil(cleanResponse.length / 4);
    try {
      await supabaseAdmin.from('token_usage').insert({
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        user_id: userEmail,
      });
    } catch { /* skip */ }

    // Log activity
    await logActivity('chat', result.agentId, {
      skill: result.skill,
      agentName: result.agentName,
      taskCreated,
      memoryCreated,
      webSearchUsed,
      bannerId,
    });

    if (isDev) console.log('[knowbar] FINAL — bannerId:', bannerId, '| bannerHtml length:', bannerHtml?.length ?? 0, '| blogTitle:', blogTitle);

    return NextResponse.json({
      response: cleanResponse,
      agentId: result.agentId,
      agentName: result.agentName,
      agentIcon: result.agentIcon,
      skill: result.skill,
      taskCreated,
      taskTitle,
      memoryCreated,
      bannerId,
      bannerHtml,
      blogTitle,
      blogContent,
      blogMetaDesc,
      calendarEventCreated: calendarCreated,
      emailDraft: emailDrafted,
      taskUpdated,
      taskUpdateTitle,
      memoCreated,
      memoTitle,
      scheduleCreated,
      scheduleTitle,
      figmaDesign: figmaDesign ? {
        designId: figmaDesign.designId,
        html: figmaDesign.html,
        description: figmaDesign.description,
        size: figmaDesign.size,
        status: figmaDesign.status,
      } : undefined,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('KnowBar error:', errMsg, error);

    // Detect CLI not found error and return user-friendly message
    if (error instanceof Error && (error.name === 'ClaudeCliNotFoundError' || errMsg === 'CLAUDE_CLI_NOT_FOUND' || errMsg.includes('CLAUDE_CLI_NOT_FOUND'))) {
      return NextResponse.json({
        error: 'CLAUDE_CLI_NOT_FOUND',
        userMessage: 'Claude Code CLI가 설치되어 있지 않아 AI 기능을 사용할 수 없습니다.\n\n설치 방법:\n1. 터미널을 열어주세요\n2. npm install -g @anthropic-ai/claude-code 를 입력해주세요\n3. claude 명령어로 로그인해주세요\n4. Dott을 재시작해주세요',
      }, { status: 503 });
    }

    return NextResponse.json({ error: `Failed: ${errMsg}` }, { status: 500 });
  }
}
