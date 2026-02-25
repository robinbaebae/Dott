import { NextRequest, NextResponse } from 'next/server';
import { getAgentHistory } from '@/lib/agents';
import { requireAuth } from '@/lib/auth-guard';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  try {
    const { id } = await params;
    const tasks = await getAgentHistory(id, 20, userEmail);
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Agent tasks API error:', error);
    return NextResponse.json({ error: 'Failed to fetch agent tasks' }, { status: 500 });
  }
}
