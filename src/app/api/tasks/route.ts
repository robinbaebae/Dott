import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';

// GET - 전체 업무 조회
export async function GET() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST - 업무 생성
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: body.title,
      description: body.description || null,
      status: body.status || 'todo',
      due_date: body.due_date || null,
      urgent: body.urgent ?? false,
      important: body.important ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logActivity('task_create', null, { title: body.title });
  return NextResponse.json(data, { status: 201 });
}

// PATCH - 업무 수정
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...updates } = body;

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
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
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
