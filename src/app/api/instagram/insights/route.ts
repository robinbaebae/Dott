import { NextRequest, NextResponse } from 'next/server';
import { fetchPostInsights } from '@/lib/instagram';
import { requireAuth } from '@/lib/auth-guard';

export async function GET(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const mediaId = req.nextUrl.searchParams.get('mediaId');

  if (!mediaId) {
    return NextResponse.json({ error: 'mediaId is required' }, { status: 400 });
  }

  const insights = await fetchPostInsights(mediaId, userEmail);
  if (!insights) {
    return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
  }

  return NextResponse.json(insights);
}
