import { NextRequest, NextResponse } from 'next/server';
import { getCompetitorAds, addCompetitorAd } from '@/lib/competitors';
import { logActivity } from '@/lib/activity';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ads = await getCompetitorAds(id);
    return NextResponse.json(ads);
  } catch (error) {
    console.error('GET /api/competitors/[id]/ads error:', error);
    return NextResponse.json({ error: 'Failed to fetch ads' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (!body.ad_url) {
      return NextResponse.json({ error: 'ad_url is required' }, { status: 400 });
    }
    const ad = await addCompetitorAd({ ...body, competitor_id: id });
    await logActivity('ad_analysis', 'research', { competitorId: id });
    return NextResponse.json(ad, { status: 201 });
  } catch (error) {
    console.error('POST /api/competitors/[id]/ads error:', error);
    return NextResponse.json({ error: 'Failed to add ad' }, { status: 500 });
  }
}
