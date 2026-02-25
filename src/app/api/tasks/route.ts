import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import { requireAuth } from '@/lib/auth-guard';

// GET - 전체 업무 조회
export async function GET() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('user_id', userEmail)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST - 업무 생성
export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .insert({
      title: body.title,
      description: body.description || null,
      status: body.status || 'todo',
      due_date: body.due_date || null,
      urgent: body.urgent ?? false,
      important: body.important ?? false,
      user_id: userEmail,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logActivity('task_create', null, { title: body.title });
  return NextResponse.json(data, { status: 201 });
}

// PATCH - 업무 수정
export async function PATCH(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const ALLOWED_FIELDS = ['title', 'description', 'status', 'due_date', 'urgent', 'important'];

  const body = await req.json();
  const { id } = body;
  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userEmail)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (updates.status === 'done') {
    await logActivity('task_complete', null, { id, title: data?.title });
  }
  return NextResponse.json(data);
}

// DELETE - 업무 삭제
export async function DELETE(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabaseAdmin.from('tasks').delete().eq('id', id).eq('user_id', userEmail);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
