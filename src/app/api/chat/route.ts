import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { spawn } from 'child_process';

const CLAUDE_PATH = '/Users/sooyoungbae/.npm-global/bin/claude';

export async function POST(req: NextRequest) {
  const { sessionId, message, history } = await req.json();

  // 세션이 없으면 새로 생성
  let currentSessionId = sessionId;
  if (!currentSessionId) {
    const { data } = await supabase
      .from('chat_sessions')
      .insert({ title: message.slice(0, 30) + (message.length > 30 ? '...' : '') })
      .select('id')
      .single();
    currentSessionId = data?.id;
  }

  // 사용자 메시지 저장
  await supabase.from('chat_messages').insert({
    session_id: currentSessionId,
    role: 'user',
    content: message,
  });

  // Claude Code CLI 호출 (--print로 stdout 스트리밍)
  const args = ['--print', message];

  // 최소한의 env만 전달 (Claude Code 세션 env 간섭 방지)
  const env: Record<string, string> = {
    HOME: process.env.HOME || '',
    PATH: process.env.PATH || '',
    USER: process.env.USER || '',
    SHELL: process.env.SHELL || '/bin/zsh',
    TMPDIR: process.env.TMPDIR || '/tmp',
    LANG: process.env.LANG || 'en_US.UTF-8',
  };

  const encoder = new TextEncoder();
  let fullResponse = '';

  const readableStream = new ReadableStream({
    start(controller) {
      // 먼저 세션 ID 전송
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'session_id', sessionId: currentSessionId })}\n\n`)
      );

      const proc = spawn(CLAUDE_PATH, args, {
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      proc.stdout.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        fullResponse += text;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`)
        );
      });

      proc.stderr.on('data', (chunk: Buffer) => {
        console.error('Claude CLI stderr:', chunk.toString());
      });

      proc.on('close', async () => {
        // 어시스턴트 메시지 저장
        if (fullResponse.trim()) {
          await supabase.from('chat_messages').insert({
            session_id: currentSessionId,
            role: 'assistant',
            content: fullResponse.trim(),
          });
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        controller.close();
      });

      proc.on('error', (err) => {
        console.error('Claude CLI error:', err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', content: 'Claude Code 연결에 실패했습니다.' })}\n\n`)
        );
        controller.close();
      });
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
