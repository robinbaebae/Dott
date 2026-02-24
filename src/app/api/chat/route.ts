import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: 세션 목록 또는 특정 세션 메시지 조회
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');

  // 특정 세션의 메시지 조회
  if (sessionId) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ messages: data ?? [] });
  }

  // 세션 목록 조회 (최근 30개)
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ sessions: data ?? [] });
}

// POST: 메시지 저장 (세션 자동 생성)
export async function POST(req: NextRequest) {
  const { sessionId, role, content, metadata } = await req.json();

  if (!content || !role) {
    return NextResponse.json({ error: 'content and role required' }, { status: 400 });
  }

  let currentSessionId = sessionId;

  // 세션이 없으면 새로 생성
  if (!currentSessionId) {
    const title = content.slice(0, 40) + (content.length > 40 ? '...' : '');
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ title })
      .select('id')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
    currentSessionId = data.id;
  }

  // 메시지 저장
  const { error } = await supabase.from('chat_messages').insert({
    session_id: currentSessionId,
    role,
    content,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessionId: currentSessionId });
}

// DELETE: 세션 삭제
export async function DELETE(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// PATCH: 세션 제목 업데이트
export async function PATCH(req: NextRequest) {
  const { sessionId, title } = await req.json();
  if (!sessionId || !title) {
    return NextResponse.json({ error: 'sessionId and title required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('chat_sessions')
    .update({ title })
    .eq('id', sessionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
