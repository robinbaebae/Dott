import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import { sanitizeFilterValue } from '@/lib/postgrest-sanitize';

export async function GET(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const search = req.nextUrl.searchParams.get('search') || '';
  const tag = req.nextUrl.searchParams.get('tag') || '';
  const trash = req.nextUrl.searchParams.get('trash') === 'true';

  let query = supabaseAdmin
    .from('memos')
    .select('*')
    .eq('user_id', userEmail);

  // Filter: trash vs active (graceful if deleted_at column doesn't exist yet)
  if (trash) {
    query = query.not('deleted_at', 'is', null);
    query = query.order('deleted_at', { ascending: false });
  } else {
    query = query.is('deleted_at', null);
    query = query
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false });
  }

  if (search) {
    query = query.or(`title.ilike.%${sanitizeFilterValue(search)}%,content.ilike.%${sanitizeFilterValue(search)}%`);
  }
  if (tag) {
    query = query.contains('tags', [tag]);
  }

  let { data, error } = await query;

  // Fallback: if deleted_at column doesn't exist yet, retry without it
  if (error && error.message?.includes('deleted_at')) {
    let fallbackQuery = supabaseAdmin
      .from('memos')
      .select('*')
      .eq('user_id', userEmail)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (search) {
      fallbackQuery = fallbackQuery.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }
    if (tag) {
      fallbackQuery = fallbackQuery.contains('tags', [tag]);
    }

    const fallback = await fallbackQuery;
    data = fallback.data;
    error = fallback.error;
  }

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

// DELETE: soft delete (move to trash) or permanent delete
export async function DELETE(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const id = req.nextUrl.searchParams.get('id');
  const permanent = req.nextUrl.searchParams.get('permanent') === 'true';
  if (!id) {
    return NextResponse.json({ error: 'Missing memo id' }, { status: 400 });
  }

  if (permanent) {
    // Hard delete — permanently remove from DB
    const { error } = await supabaseAdmin
      .from('memos')
      .delete()
      .eq('id', id)
      .eq('user_id', userEmail);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logActivity('memo_permanent_delete', null, { memo_id: id }, userEmail);
  } else {
    // Soft delete — set deleted_at
    const { error } = await supabaseAdmin
      .from('memos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userEmail);

    if (error && error.message?.includes('deleted_at')) {
      // Fallback: column doesn't exist yet, do hard delete
      const { error: fallbackError } = await supabaseAdmin
        .from('memos')
        .delete()
        .eq('id', id)
        .eq('user_id', userEmail);

      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      }
    } else if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logActivity('memo_delete', null, { memo_id: id }, userEmail);
  }

  return NextResponse.json({ success: true });
}
