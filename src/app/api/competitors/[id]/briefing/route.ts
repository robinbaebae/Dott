import { NextRequest, NextResponse } from 'next/server';
import { getWeeklyBriefing, generateBriefing } from '@/lib/competitors';
import { logActivity } from '@/lib/activity';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const briefing = await getWeeklyBriefing(id);
    return NextResponse.json(briefing);
  } catch (error) {
    console.error('GET /api/competitors/[id]/briefing error:', error);
    return NextResponse.json({ error: 'Failed to fetch briefing' }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const briefing = await generateBriefing(id);
    await logActivity('briefing_generate', 'research', { competitorId: id });
    return NextResponse.json(briefing);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate briefing';
    console.error('POST /api/competitors/[id]/briefing error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
