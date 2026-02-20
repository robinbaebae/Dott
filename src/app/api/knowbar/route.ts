import { NextRequest, NextResponse } from 'next/server';
import { generateCompletion } from '@/lib/claude';
import { supabase } from '@/lib/supabase';

const KNOWBAR_SYSTEM_PROMPT = `You are "Ditto", a marketing AI assistant built into a marketing tool.
You help solo marketers with questions, tasks, and content.

IMPORTANT — Task detection:
If the user's message looks like they want to create a task or to-do item (e.g. "add task: ...", "remind me to ...", "need to ...", "todo: ..."), you MUST respond with a JSON block at the very beginning of your response:
<task>{"title":"the task title"}</task>

Then follow with a short confirmation message.

If it's NOT a task, just answer the question helpfully and concisely in 1-3 sentences. Use the same language the user writes in.

Examples:
User: "add task: update the landing page copy"
Response: <task>{"title":"Update the landing page copy"}</task>
Got it! I've added that task for you.

User: "what's a good CTR for Instagram ads?"
Response: A good CTR for Instagram feed ads is typically 0.5–1.5%. Stories tend to perform at 0.3–0.8%. If you're above these benchmarks, you're doing well.`;

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'message required' }, { status: 400 });
  }

  try {
    const result = await generateCompletion(KNOWBAR_SYSTEM_PROMPT, message);

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
