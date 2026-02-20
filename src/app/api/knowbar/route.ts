import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '@/lib/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const KNOWBAR_SYSTEM_PROMPT = `You are "Ditto", a world-class AI assistant embedded in a marketing tool called Butter.
You are as capable, knowledgeable, and helpful as the best AI assistants available today.

CORE CAPABILITIES:
- You can answer ANY question — marketing, business, tech, coding, writing, analysis, strategy, general knowledge, and more.
- You think step-by-step for complex questions and provide thorough, well-structured answers.
- You write excellent copy, brainstorm creative ideas, analyze data, explain concepts, and solve problems.
- You use web search to find current, accurate information whenever the question involves recent data, statistics, news, trends, or anything time-sensitive.
- You are honest: if you don't know something or are uncertain, you say so clearly.

LANGUAGE:
Always reply in the SAME language the user writes in. Korean → Korean. English → English. Match their tone.

FORMATTING:
- Use clear structure: bullet points, numbered lists, bold text where helpful.
- For short factual questions, be concise. For complex questions, be thorough.
- Don't artificially limit your response length — answer as fully as the question requires.

TASK DETECTION:
If the user wants to create a task, to-do, reminder, or schedule something (e.g. "add task: ...", "remind me to ...", "need to ...", "todo: ...", "오늘 미팅 있어", "내일까지 제안서 보내야 해", "~해야 해", "~할 일"), respond with this at the very beginning:
<task>{"title":"the task title in the user's language"}</task>
Then follow with a short, friendly confirmation.

For everything else, give the best possible answer you can.`;

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'message required' }, { status: 400 });
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: KNOWBAR_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: message }],
    });

    // Extract text from response content blocks
    let result = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        result += block.text;
      }
    }

    // Check for task creation
    const taskMatch = result.match(/<task>\s*(\{[^}]+\})\s*<\/task>/);
    let taskCreated = false;
    let taskTitle = '';

    if (taskMatch) {
      try {
        const taskData = JSON.parse(taskMatch[1]);
        taskTitle = taskData.title;
        if (taskTitle) {
          await supabase.from('tasks').insert({ title: taskTitle, status: 'todo' });
          taskCreated = true;
        }
      } catch {
        // parse error — ignore, just return the text
      }
    }

    // Strip the <task> tag from the visible response
    const cleanResponse = result.replace(/<task>\s*\{[^}]+\}\s*<\/task>\s*/g, '').trim();

    return NextResponse.json({
      response: cleanResponse,
      taskCreated,
      taskTitle,
    });
  } catch (error) {
    console.error('KnowBar error:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
