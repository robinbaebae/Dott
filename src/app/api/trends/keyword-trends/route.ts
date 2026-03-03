import { NextRequest, NextResponse } from 'next/server';
import { getKeywordTrends, createWatchlistSnapshot, getKeywordHistory } from '@/lib/keyword-trends';
import { getWatchlist } from '@/lib/keyword-watchlist';
import { requireAuth } from '@/lib/auth-guard';

const isDev = process.env.NODE_ENV === 'development';

export async function GET(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  try {
    const keywords = req.nextUrl.searchParams.get('keywords');
    const days = parseInt(req.nextUrl.searchParams.get('days') || '30', 10);
    const watchlistOnly = req.nextUrl.searchParams.get('watchlist') === 'true';

    if (keywords) {
      const list = keywords.split(',').map((k) => k.trim()).filter(Boolean);
      const history = await getKeywordHistory(list, days);
      return NextResponse.json(history);
    }

    if (watchlistOnly) {
      const watchlist = await getWatchlist(userEmail);
      const kwNames = watchlist.map((w) => w.keyword);
      const trends = await getKeywordTrends(kwNames);
      return NextResponse.json(trends);
    }

    const trends = await getKeywordTrends();
    return NextResponse.json(trends);
  } catch (error) {
    console.error('GET /api/trends/keyword-trends error:', error);
    return NextResponse.json({ error: 'Failed to fetch keyword trends' }, { status: 500 });
  }
}

export async function POST() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  try {
    const watchlist = await getWatchlist(userEmail);
    const keywords = watchlist.map((w) => w.keyword);
    if (isDev) console.log(`[keyword-trends] Creating snapshot for ${keywords.length} keywords:`, keywords);
    const snapshot = await createWatchlistSnapshot(keywords);
    if (isDev) console.log(`[keyword-trends] Snapshot created: ${snapshot.length} entries`);
    return NextResponse.json({ created: snapshot.length, data: snapshot });
  } catch (error) {
    console.error('POST /api/trends/keyword-trends error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create snapshot';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
