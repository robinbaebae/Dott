import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';

export async function GET(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const promotionId = req.nextUrl.searchParams.get('promotionId');
  if (!promotionId) {
    return NextResponse.json({ error: 'Missing promotionId' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('promotion_channels')
    .select('*')
    .eq('promotion_id', promotionId)
    .eq('user_id', userEmail)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ channels: data || [] });
}

export async function POST(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const body = await req.json();
  const { promotion_id, channel_type, budget_amount, usp, cta_text, enabled } = body;

  if (!promotion_id || !channel_type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('promotion_channels')
    .insert({
      promotion_id,
      user_id: userEmail,
      channel_type,
      budget_amount: budget_amount || 0,
      usp: usp || '',
      cta_text: cta_text || '',
      enabled: enabled !== false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity('promotion_channel_create', null, { channel_type, promotion_id }, userEmail);
  return NextResponse.json({ channel: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing channel id' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('promotion_channels')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userEmail)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ channel: data });
}

export async function DELETE(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing channel id' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('promotion_channels')
    .delete()
    .eq('id', id)
    .eq('user_id', userEmail);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
