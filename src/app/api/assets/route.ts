import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-guard';

export async function GET(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const type = req.nextUrl.searchParams.get('type') || 'all';
  const search = req.nextUrl.searchParams.get('q') || '';

  const results: Record<string, unknown[]> = {};

  // Banners
  if (type === 'all' || type === 'banner') {
    let query = supabaseAdmin
      .from('banners')
      .select('id, copy, size, html, created_at')
      .eq('user_id', userEmail)
      .order('created_at', { ascending: false })
      .limit(50);
    if (search) query = query.ilike('copy', `%${search}%`);
    const { data } = await query;
    results.banners = (data || []).map((b) => ({
      ...b,
      asset_type: 'banner' as const,
    }));
  }

  // Swipe files (insights with content_type = 'swipe')
  if (type === 'all' || type === 'swipe') {
    let query = supabaseAdmin
      .from('insights')
      .select('id, url, title, description, thumbnail_url, source_domain, swipe_category, tags, created_at')
      .eq('content_type', 'swipe')
      .eq('user_id', userEmail)
      .order('created_at', { ascending: false })
      .limit(50);
    if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    const { data } = await query;
    results.swipes = (data || []).map((s) => ({
      ...s,
      asset_type: 'swipe' as const,
    }));
  }

  // Competitor ads
  if (type === 'all' || type === 'competitor_ad') {
    let query = supabaseAdmin
      .from('competitor_ads')
      .select('id, competitor_id, platform, ad_url, creative_type, copy_text, cta_text, screenshot_url, discovered_at')
      .eq('user_id', userEmail)
      .order('discovered_at', { ascending: false })
      .limit(50);
    if (search) query = query.ilike('copy_text', `%${search}%`);
    const { data } = await query;
    results.competitor_ads = (data || []).map((a) => ({
      ...a,
      asset_type: 'competitor_ad' as const,
    }));
  }

  return NextResponse.json(results);
}

export async function DELETE(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const { id, asset_type } = await req.json();
  if (!id || !asset_type) {
    return NextResponse.json({ error: 'id and asset_type required' }, { status: 400 });
  }

  const tableMap: Record<string, string> = {
    banner: 'banners',
    swipe: 'insights',
    competitor_ad: 'competitor_ads',
  };

  const table = tableMap[asset_type];
  if (!table) {
    return NextResponse.json({ error: 'invalid asset_type' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from(table)
    .delete()
    .eq('id', id)
    .eq('user_id', userEmail);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
