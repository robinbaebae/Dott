import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { supabase } from '@/lib/supabase';

const CLAUDE_PATH = '/Users/sooyoungbae/.npm-global/bin/claude';

const KNOWBAR_SYSTEM_PROMPT = `You are "Ditto", a world-class AI assistant embedded in a marketing tool called Butter.
You are as capable, knowledgeable, and helpful as the best AI assistants available today.

CORE CAPABILITIES:
- You can answer ANY question — marketing, business, tech, coding, writing, analysis, strategy, general knowledge, and more.
- You think step-by-step for complex questions and provide thorough, well-structured answers.
- You write excellent copy, brainstorm creative ideas, analyze data, explain concepts, and solve problems.
- You are honest: if you don't know something or are uncertain, you say so clearly.

LANGUAGE:
Always reply in the SAME language the user writes in. Korean → Korean. English → English. Match their tone.

FORMATTING:
- Use clear structure: bullet points, numbered lists, bold text where helpful.
- For short factual questions, be concise. For complex questions, be thorough.
- Don't artificially limit your response length — answer as fully as the question requires.

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

For everything else, give the best possible answer you can.`;

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'message required' }, { status: 400 });
  }

  try {
    const fullPrompt = `${KNOWBAR_SYSTEM_PROMPT}\n\n---\nUser: ${message}`;
    const args = ['--print', fullPrompt];

    const env: Record<string, string> = {
      HOME: process.env.HOME || '',
      PATH: process.env.PATH || '',
      USER: process.env.USER || '',
      SHELL: process.env.SHELL || '/bin/zsh',
      TMPDIR: process.env.TMPDIR || '/tmp',
      LANG: process.env.LANG || 'en_US.UTF-8',
    };

    const result = await new Promise<string>((resolve, reject) => {
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

    // Check for task creation
    const taskMatch = result.match(/<task>\s*(\{[^}]+\})\s*<\/task>/);
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

    // Check for memory creation
    const memoryMatch = result.match(/<memory>\s*(\{[^}]+\})\s*<\/memory>/);
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
            source_domain: 'ditto',
          });
          memoryCreated = true;
        }
      } catch {
        // parse error — ignore
      }
    }

    const cleanResponse = result
      .replace(/<task>\s*\{[^}]+\}\s*<\/task>\s*/g, '')
      .replace(/<memory>\s*\{[^}]+\}\s*<\/memory>\s*/g, '')
      .trim();

    return NextResponse.json({
      response: cleanResponse,
      taskCreated,
      taskTitle,
      memoryCreated,
    });
  } catch (error) {
    console.error('KnowBar error:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
