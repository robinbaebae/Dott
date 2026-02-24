import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { runAgentPipeline } from '@/lib/agents';
import { logActivity } from '@/lib/activity';
import { generateCompletion } from '@/lib/claude';
import { BANNER_GENERATION_PROMPT } from '@/lib/prompts';

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

LANGUAGE: Always reply in the SAME language the user writes in. Korean → Korean. English → English.
--- END INSTRUCTIONS ---
`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = body.message;
  const history: { role: string; content: string }[] = body.history || [];
  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'message required' }, { status: 400 });
  }

  try {
    // Run the full agent pipeline: classify → context → execute
    const result = await runAgentPipeline(message, {
      history,
      extraInstructions: DETECTION_INSTRUCTIONS,
    });

    const responseText = result.response;

    // Step 3: Check for task creation
    const taskMatch = responseText.match(/<task>\s*(\{[^}]+\})\s*<\/task>/);
    let taskCreated = false;
    let taskTitle = '';

    if (taskMatch) {
      try {
        const taskData = JSON.parse(taskMatch[1]);
        taskTitle = taskData.title;
        if (taskTitle) {
          await supabase.from('tasks').insert({
            title: taskTitle,
            status: 'todo',
            urgent: taskData.urgent ?? false,
            important: taskData.important ?? false,
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
          await supabase.from('insights').insert({
            url: '',
            title: memoryData.content.slice(0, 100),
            description: memoryData.content,
            memo: '',
            content_type: 'memory',
            thumbnail_url: '',
            source_domain: 'dott',
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
          const htmlResult = await generateCompletion(BANNER_GENERATION_PROMPT, userPrompt);
          const cleanHtml = htmlResult
            .replace(/^```html?\n?/i, '')
            .replace(/\n?```$/i, '')
            .trim();

          const { data: banner } = await supabase
            .from('banners')
            .insert({ copy, reference, size, html: cleanHtml })
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

    const cleanResponse = responseText
      .replace(/<task>\s*\{[^}]+\}\s*<\/task>\s*/g, '')
      .replace(/<memory>\s*\{[^}]+\}\s*<\/memory>\s*/g, '')
      .replace(/<banner>\s*\{[\s\S]*?\}\s*<\/banner>\s*/g, '')
      .replace(/<calendar>\s*\{[\s\S]*?\}\s*<\/calendar>\s*/g, '')
      .replace(/<email>\s*\{[^}]+\}\s*<\/email>\s*/g, '')
      .trim();

    const webSearchUsed = !!result.webSearchUsed;

    // Log token usage (approximate: ~4 chars per token)
    const tokensIn = Math.ceil(message.length / 4);
    const tokensOut = Math.ceil(cleanResponse.length / 4);
    try {
      await supabase.from('token_usage').insert({
        tokens_in: tokensIn,
        tokens_out: tokensOut,
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
    });
  } catch (error) {
    console.error('KnowBar error:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
