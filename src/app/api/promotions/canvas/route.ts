import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const promotionId = req.nextUrl.searchParams.get('promotionId');
  if (!promotionId) {
    return NextResponse.json({ error: 'Missing promotionId' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('promotion_canvas')
    .select('*')
    .eq('promotion_id', promotionId)
    .eq('user_id', userEmail)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ canvas: data || null });
}

export async function PUT(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const body = await req.json();
  const { promotionId, nodes, edges, viewport } = body;

  if (!promotionId) {
    return NextResponse.json({ error: 'Missing promotionId' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('promotion_canvas')
    .upsert(
      {
        promotion_id: promotionId,
        user_id: userEmail,
        nodes: nodes || [],
        edges: edges || [],
        viewport: viewport || { x: 0, y: 0, zoom: 1 },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'promotion_id' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ canvas: data });
}
