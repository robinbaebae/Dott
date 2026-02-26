import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';

export async function GET(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const { searchParams } = req.nextUrl;
  const year = searchParams.get('year');
  const month = searchParams.get('month');
  const category = searchParams.get('category');

  let query = supabaseAdmin
    .from('expenses')
    .select('*')
    .eq('user_id', userEmail)
    .order('date', { ascending: false });

  if (year && month) {
    const start = `${year}-${month.padStart(2, '0')}-01`;
    const endMonth = parseInt(month);
    const endYear = parseInt(year);
    const nextMonth = endMonth === 12 ? 1 : endMonth + 1;
    const nextYear = endMonth === 12 ? endYear + 1 : endYear;
    const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
    query = query.gte('date', start).lt('date', end);
  }

  if (category && category !== '전체') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expenses: data || [] });
}

export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from('expenses')
    .insert({
      user_id: userEmail,
      date: body.date || new Date().toISOString().split('T')[0],
      description: body.description || '',
      amount: body.amount || 0,
      category: body.category || '기타',
      payment_method: body.payment_method || '법인카드',
      memo: body.memo || '',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity('expense_create', null, { expense_id: data.id, amount: data.amount }, userEmail);
  return NextResponse.json({ expense: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing expense id' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('expenses')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userEmail)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expense: data });
}

export async function DELETE(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing expense id' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('expenses')
    .delete()
    .eq('id', id)
    .eq('user_id', userEmail);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity('expense_delete', null, { expense_id: id }, userEmail);
  return NextResponse.json({ success: true });
}
