import { NextRequest } from 'next/server';
import { streamChatResponse } from '@/lib/claude';
import { MARKETING_SYSTEM_PROMPT } from '@/lib/prompts';
import { supabase } from '@/lib/supabase';

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

  // Claude 스트리밍 호출
  const messages = [
    ...history.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ];

  const stream = await streamChatResponse(MARKETING_SYSTEM_PROMPT, messages);

  // ReadableStream으로 변환
  const encoder = new TextEncoder();
  let fullResponse = '';

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        // 먼저 세션 ID 전송
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'session_id', sessionId: currentSessionId })}\n\n`)
        );

        for await (const event of stream) {
          if (event.type === 'content_block_delta') {
            const delta = event.delta;
            if ('text' in delta) {
              fullResponse += delta.text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'text', content: delta.text })}\n\n`)
              );
            }
          }
        }

        // 어시스턴트 메시지 저장
        await supabase.from('chat_messages').insert({
          session_id: currentSessionId,
          role: 'assistant',
          content: fullResponse,
        });

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        controller.close();
      } catch (error) {
        console.error('Stream error:', error);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', content: '응답 생성 중 오류가 발생했습니다.' })}\n\n`)
        );
        controller.close();
      }
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
