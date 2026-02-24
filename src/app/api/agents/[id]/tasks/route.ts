import { NextRequest, NextResponse } from 'next/server';
import { getAgentHistory } from '@/lib/agents';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tasks = await getAgentHistory(id);
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Agent tasks API error:', error);
    return NextResponse.json({ error: 'Failed to fetch agent tasks' }, { status: 500 });
  }
}
