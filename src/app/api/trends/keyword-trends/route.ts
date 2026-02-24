import { NextResponse } from 'next/server';
import { getKeywordTrends, createKeywordSnapshot } from '@/lib/keyword-trends';

export async function GET() {
  try {
    const trends = await getKeywordTrends();
    return NextResponse.json(trends);
  } catch (error) {
    console.error('GET /api/trends/keyword-trends error:', error);
    return NextResponse.json({ error: 'Failed to fetch keyword trends' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const snapshot = await createKeywordSnapshot();
    return NextResponse.json({ created: snapshot.length, data: snapshot });
  } catch (error) {
    console.error('POST /api/trends/keyword-trends error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create snapshot';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
