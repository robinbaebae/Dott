import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get('type') || 'all';
  const search = req.nextUrl.searchParams.get('q') || '';

  const results: Record<string, unknown[]> = {};

  // Banners
  if (type === 'all' || type === 'banner') {
    let query = supabase
      .from('banners')
      .select('id, copy, size, html, created_at')
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
    let query = supabase
      .from('insights')
      .select('id, url, title, description, thumbnail_url, source_domain, swipe_category, tags, created_at')
      .eq('content_type', 'swipe')
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
    let query = supabase
      .from('competitor_ads')
      .select('id, competitor_id, platform, ad_url, creative_type, copy_text, cta_text, screenshot_url, discovered_at')
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
