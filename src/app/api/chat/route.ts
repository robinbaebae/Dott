import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';

// GET: 세션 목록 또는 특정 세션 메시지 조회
export async function GET(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const sessionId = req.nextUrl.searchParams.get('sessionId');

  // 특정 세션의 메시지 조회
  if (sessionId) {
    // Verify session ownership before returning messages
    const { data: session } = await supabaseAdmin
      .from('chat_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userEmail)
      .single();

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
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
  const { data, error } = await supabaseAdmin
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userEmail)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ sessions: data ?? [] });
}

// POST: 메시지 저장 (세션 자동 생성)
export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const { sessionId, role, content, metadata } = await req.json();

  if (!content || !role) {
    return NextResponse.json({ error: 'content and role required' }, { status: 400 });
  }

  let currentSessionId = sessionId;

  // 세션이 없으면 새로 생성
  if (!currentSessionId) {
    const title = content.slice(0, 40) + (content.length > 40 ? '...' : '');
    const { data, error } = await supabaseAdmin
      .from('chat_sessions')
      .insert({ title, user_id: userEmail })
      .select('id')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }
    currentSessionId = data.id;
  }

  // 메시지 저장
  const { error } = await supabaseAdmin.from('chat_messages').insert({
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
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('chat_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userEmail);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// PATCH: 세션 제목 업데이트
export async function PATCH(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const { sessionId, title } = await req.json();
  if (!sessionId || !title) {
    return NextResponse.json({ error: 'sessionId and title required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('chat_sessions')
    .update({ title })
    .eq('id', sessionId)
    .eq('user_id', userEmail);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
