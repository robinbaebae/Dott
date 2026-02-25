import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';

export async function GET(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const search = req.nextUrl.searchParams.get('search') || '';
  const tag = req.nextUrl.searchParams.get('tag') || '';

  let query = supabaseAdmin
    .from('memos')
    .select('*')
    .eq('user_id', userEmail)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false });

  if (search) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  }
  if (tag) {
    query = query.contains('tags', [tag]);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ memos: data || [] });
}

export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from('memos')
    .insert({
      user_id: userEmail,
      title: body.title || '',
      content: body.content || '',
      tags: body.tags || [],
      pinned: body.pinned || false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity('memo_create', null, { memo_id: data.id, title: data.title }, userEmail);

  return NextResponse.json({ memo: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing memo id' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('memos')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userEmail)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ memo: data });
}

export async function DELETE(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing memo id' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('memos')
    .delete()
    .eq('id', id)
    .eq('user_id', userEmail);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity('memo_delete', null, { memo_id: id }, userEmail);

  return NextResponse.json({ success: true });
}
