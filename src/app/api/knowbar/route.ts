import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { classifyTask, executeAgentTask } from '@/lib/agents';
import { logActivity } from '@/lib/activity';
import { getInstagramContextForChat } from '@/lib/instagram';
import { getMetaAdsContextForChat } from '@/lib/meta-ads';
import { getWebSearchContext } from '@/lib/web-search';
import { getRecentAttendees } from '@/lib/google';
import { generateCompletion } from '@/lib/claude';
import { BANNER_GENERATION_PROMPT } from '@/lib/prompts';
import { spawn } from 'child_process';

const CLAUDE_PATH = '/Users/sooyoungbae/.npm-global/bin/claude';

const KNOWBAR_SYSTEM_PROMPT = `You are "Dott", a world-class AI assistant embedded in a marketing tool called Dott.
You are as capable, knowledgeable, and helpful as the best AI assistants available today.

CORE CAPABILITIES:
- You can answer ANY question — marketing, business, tech, coding, writing, analysis, strategy, general knowledge, and more.
- You think step-by-step for complex questions and provide thorough, well-structured answers.
- You write excellent copy, brainstorm creative ideas, analyze data, explain concepts, and solve problems.
- You are honest: if you don't know something or are uncertain, you say so clearly.

LANGUAGE:
Always reply in the SAME language the user writes in. Korean → Korean. English → English. Match their tone.

FORMATTING:
- Use clear structure: bullet points, numbered lists, bold text, tables where helpful.
- Use markdown tables (| header | header |) when comparing items or showing structured data.
- For short factual questions, be concise. For complex questions, be thorough.
- Don't artificially limit your response length — answer as fully as the question requires.

SOURCES / REFERENCES:
- When you reference external information, web search results, or specific data sources, ALWAYS include a "출처" section at the bottom.
- Format: \n\n---\n**출처**\n- [Title](URL)\n- [Title](URL)
- If web search context is provided, cite the relevant sources you used.
- If no external sources were used (pure knowledge), you may omit the section.

TASK DETECTION:
If the user wants to create a task, to-do, reminder, or schedule something (e.g. "add task: ...", "remind me to ...", "need to ...", "todo: ...", "오늘 미팅 있어", "내일까지 제안서 보내야 해", "~해야 해", "~할 일"), respond with this at the very beginning:
<task>{"title":"the task title in the user's language","urgent":true/false,"important":true/false}</task>
Then follow with a short, friendly confirmation.
- Set urgent=true if the task has a tight deadline, needs immediate attention, or the user expresses urgency.
- Set important=true if the task has significant impact, is strategic, or the user emphasizes its importance.
- Default both to false if unclear.

MEMORY DETECTION:
If the user wants to remember something (e.g. "remember this", "기억해줘", "save this", "이거 메모해줘", "note this down"), respond with this at the very beginning:
<memory>{"content":"the thing to remember, in the user's language"}</memory>
Then follow with a short, friendly confirmation.

CALENDAR EVENT / MEETING BOOKING:
When the user wants to schedule a meeting or create a calendar event:
1. If the user says something vague like "미팅 예약", "회의 잡아줘", "일정 등록", ASK for the missing details:
   - 누구와 (who / meeting title)
   - 언제 (date and time)
   Example response: "미팅을 잡아드릴게요! 누구와 언제 미팅하실 건가요?"
2. Once you have ALL required info (title + date + time), create the event by responding with:
<calendar>{"summary":"event title with attendee name","date":"YYYY-MM-DD","startTime":"HH:mm","endTime":"HH:mm","attendees":[{"email":"email@example.com","displayName":"Name"}]}</calendar>
예약이 완료됐습니다! 📅
Then show: [날짜] [시간] [미팅 제목] 으로 등록했어요.
- Use 24-hour time format.
- If no end time is specified, default to 1 hour after start time.
- If the date is "내일", calculate tomorrow's date. If "오늘", use today's date. Today is ${new Date().toISOString().split('T')[0]}.
- IMPORTANT: Use the conversation history to gather previously mentioned details. Don't ask again for info already provided.
- ATTENDEE MATCHING: A "최근 미팅 참석자 목록" may be provided in the context. Use it to match attendee names.
  - If the user mentions a name, search the attendee list for matches.
  - If there are MULTIPLE people with the same name (동명이인), show all matches with their email and meeting count, and ask which person they mean.
    Example: "김태훈님이 2명 있어요:\n1) 김태훈 (taehun@a.com) - 최근 5회 미팅\n2) 김태훈 (th.kim@b.com) - 최근 2회 미팅\n어느 분과 미팅하시나요?"
  - If only ONE match is found, use that person's email directly in the attendees field.
  - If NO match is found, say "이전에 미팅한 기록이 없는데, 이메일 주소를 알려주시겠어요?" and wait for the email.
- If the user doesn't provide an attendee email and no match is found, you can still create the event without attendees (omit the attendees field).

EMAIL REPLY DETECTION:
If the user wants to reply to an email or compose an email (e.g. "이 메일에 답장해줘", "reply to this email", "이메일 작성해줘"), respond with this at the very beginning:
<email>{"to":"recipient email if known","topic":"what the email is about","tone":"professional"}</email>
Then follow with a short, friendly confirmation.
- tone can be: professional, casual, friendly, urgent

For everything else, give the best possible answer you can.`;

// Detection instructions injected into agent messages so all agents can use structured tags
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
   Example response: "미팅을 잡아드릴게요! 누구와 언제 미팅하실 건가요?"
2. Once you have ALL required info (title + date + time), create the event by responding with:
<calendar>{"summary":"event title with attendee name","date":"YYYY-MM-DD","startTime":"HH:mm","endTime":"HH:mm","attendees":[{"email":"email@example.com","displayName":"Name"}]}</calendar>
예약이 완료됐습니다! 📅
Then show: [날짜] [시간] [미팅 제목] 으로 등록했어요.
- Use 24-hour time format.
- If no end time is specified, default to 1 hour after start time.
- If the date is "내일", calculate tomorrow's date. If "오늘", use today's date. Today is ${new Date().toISOString().split('T')[0]}.
- IMPORTANT: Use the conversation history to gather previously mentioned details. Don't ask again for info already provided.
- ATTENDEE MATCHING: A "최근 미팅 참석자 목록" may be provided in the context. Use it to match attendee names.
  - If the user mentions a name, search the attendee list for matches.
  - If there are MULTIPLE people with the same name (동명이인), show all matches with their email and meeting count, and ask which person they mean.
    Example: "김태훈님이 2명 있어요:\n1) 김태훈 (taehun@a.com) - 최근 5회 미팅\n2) 김태훈 (th.kim@b.com) - 최근 2회 미팅\n어느 분과 미팅하시나요?"
  - If only ONE match is found, use that person's email directly in the attendees field.
  - If NO match is found, say "이전에 미팅한 기록이 없는데, 이메일 주소를 알려주시겠어요?" and wait for the email.
- If the user doesn't provide an attendee email and no match is found, you can still create the event without attendees (omit the attendees field).

EMAIL REPLY DETECTION:
If the user wants to reply to an email or compose an email, respond with this at the very beginning:
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
    // Step 0: Classify task via Orchestrator (on raw message — no context needed)
    let classification;
    try {
      classification = await classifyTask(message);
    } catch {
      classification = { agentId: 'marketing', skill: '', reasoning: 'fallback', isAsync: false, needsWebSearch: false, searchQuery: '' };
    }

    // Step 1: Gather context from connected services (+ web search if needed)
    let contextString = '';
    try {
      const contextPromises: Promise<string>[] = [
        getInstagramContextForChat(),
        getMetaAdsContextForChat(),
      ];
      if (classification.needsWebSearch && classification.searchQuery) {
        contextPromises.push(getWebSearchContext(classification.searchQuery));
      }
      const contextResults = await Promise.all(contextPromises);
      const parts = contextResults.filter(Boolean);
      if (parts.length > 0) {
        contextString = `\n\n--- Context ---\n${parts.join('\n\n')}`;
      }
    } catch {
      // context fetch failed — continue without it
    }

    // Build conversation context from history
    let historyContext = '';
    if (history.length > 0) {
      historyContext = '\n\n--- Conversation History ---\n' +
        history.map((m: { role: string; content: string }) =>
          `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
        ).join('\n') + '\n---\n\n';
    }

    // Detect meeting-related conversation and inject recent attendees
    const allText = historyContext + message;
    const isMeetingContext = /미팅|회의|일정|예약|스케줄|meeting|schedule|캘린더|calendar/i.test(allText);
    let attendeesContext = '';
    if (isMeetingContext) {
      try {
        const recentAttendees = await getRecentAttendees();
        if (recentAttendees.length > 0) {
          const list = recentAttendees.slice(0, 50).map(a =>
            `- ${a.name || '(이름 없음)'} <${a.email}> (최근 ${a.count}회 미팅)`
          ).join('\n');
          attendeesContext = `\n\n--- 최근 미팅 참석자 목록 ---\n${list}\n---\n` +
            `위 목록에서 사용자가 언급한 이름과 일치하는 사람을 찾으세요.\n` +
            `동명이인이 있으면 이메일 주소와 미팅 횟수를 보여주고 어느 분인지 확인하세요.\n` +
            `목록에 없는 사람이면 "이전에 미팅한 기록이 없는데, 이메일 주소를 알려주시겠어요?" 라고 확인하세요.\n`;
        }
      } catch {
        // attendee fetch failed — continue without it
      }
    }

    const enrichedMessage = historyContext + message + contextString + attendeesContext + DETECTION_INSTRUCTIONS;

    // Step 2: Execute via agent
    let result;
    try {
      result = await executeAgentTask(classification.agentId, enrichedMessage, classification.skill);
    } catch {
      // Fallback: direct Claude CLI call
      result = await fallbackDirectCall(enrichedMessage);
    }

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

    const webSearchUsed = !!(classification.needsWebSearch && classification.searchQuery);

    // Log token usage (approximate: ~4 chars per token)
    const tokensIn = Math.ceil(enrichedMessage.length / 4);
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

// Fallback: direct Claude CLI call when agent system fails
async function fallbackDirectCall(message: string) {
  const fullPrompt = `${KNOWBAR_SYSTEM_PROMPT}\n\n---\nUser: ${message}`;
  const args = ['--print', fullPrompt];

  const env = {
    HOME: process.env.HOME || '',
    PATH: process.env.PATH || '',
    USER: process.env.USER || '',
    SHELL: process.env.SHELL || '/bin/zsh',
    TMPDIR: process.env.TMPDIR || '/tmp',
    LANG: process.env.LANG || 'en_US.UTF-8',
  } as unknown as NodeJS.ProcessEnv;

  const response = await new Promise<string>((resolve, reject) => {
    const proc = spawn(CLAUDE_PATH, args, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
      } else {
        resolve(stdout.trim());
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });

  return {
    response,
    agentId: 'marketing',
    agentName: 'Dott',
    agentIcon: '',
    skill: '',
  };
}
