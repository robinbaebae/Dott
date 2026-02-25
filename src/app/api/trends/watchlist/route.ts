import { NextRequest, NextResponse } from 'next/server';
import { getWatchlist, addWatchlistKeyword, removeWatchlistKeyword } from '@/lib/keyword-watchlist';
import { logActivity } from '@/lib/activity';
import { requireAuth } from '@/lib/auth-guard';

export async function GET() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  try {
    const list = await getWatchlist(userEmail);
    return NextResponse.json(list);
  } catch (error) {
    console.error('GET /api/trends/watchlist error:', error);
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  try {
    const body = await request.json();
    if (!body.keyword) {
      return NextResponse.json({ error: 'keyword is required' }, { status: 400 });
    }
    const item = await addWatchlistKeyword(body.keyword, userEmail);
    await logActivity('watchlist_add', 'research', { keyword: body.keyword }, userEmail);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('POST /api/trends/watchlist error:', error);
    const message = error instanceof Error ? error.message : 'Failed to add keyword';
    const status = message === '이미 추가된 키워드입니다' ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    await removeWatchlistKeyword(id, userEmail);
    await logActivity('watchlist_remove', 'research', { id }, userEmail);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/trends/watchlist error:', error);
    return NextResponse.json({ error: 'Failed to remove keyword' }, { status: 500 });
  }
}
