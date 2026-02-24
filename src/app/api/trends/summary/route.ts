import { NextRequest, NextResponse } from 'next/server';
import { getTodaySummary, generateTrendSummary } from '@/lib/trend-summary';
import { logActivity } from '@/lib/activity';

export async function GET() {
  try {
    const summary = await getTodaySummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error('GET /api/trends/summary error:', error);
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const summary = await generateTrendSummary(body.category);
    await logActivity('summary_generate', 'research', { category: body.category });
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate summary';
    console.error('POST /api/trends/summary error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
