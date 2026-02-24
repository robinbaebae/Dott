import { NextRequest, NextResponse } from 'next/server';
import { logActivity, getDailyActivity } from '@/lib/activity';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const activities = await getDailyActivity(date);
    return NextResponse.json(activities);
  } catch (error) {
    console.error('Activity API error:', error);
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { actionType, agentId, details } = await req.json();
    if (!actionType) {
      return NextResponse.json({ error: 'actionType required' }, { status: 400 });
    }
    await logActivity(actionType, agentId, details);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Activity log error:', error);
    return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 });
  }
}
