import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';

export async function GET(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const status = req.nextUrl.searchParams.get('status');

  let query = supabaseAdmin
    .from('promotions')
    .select('*')
    .eq('user_id', userEmail)
    .order('created_at', { ascending: false });

  if (status && status !== '전체') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ promotions: data || [] });
}

export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from('promotions')
    .insert({
      user_id: userEmail,
      name: body.name || '',
      type: body.type || '할인율',
      discount_value: body.discount_value || '',
      target: body.target || '전체',
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      budget: body.budget || 0,
      goal: body.goal || '',
      description: body.description || '',
      ai_copy: body.ai_copy || '',
      status: body.status || 'draft',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity('promotion_create', null, { promotion_id: data.id, name: data.name }, userEmail);
  return NextResponse.json({ promotion: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing promotion id' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('promotions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userEmail)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ promotion: data });
}

export async function DELETE(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing promotion id' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('promotions')
    .delete()
    .eq('id', id)
    .eq('user_id', userEmail);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity('promotion_delete', null, { promotion_id: id }, userEmail);
  return NextResponse.json({ success: true });
}
