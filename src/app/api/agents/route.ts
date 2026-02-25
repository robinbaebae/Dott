import { NextResponse } from 'next/server';
import { getAgents, getAgentStatus } from '@/lib/agents';
import { requireAuth } from '@/lib/auth-guard';

export async function GET() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  try {
    const [agents, activeTasks] = await Promise.all([
      getAgents(),
      getAgentStatus(userEmail),
    ]);

    return NextResponse.json({ agents, activeTasks });
  } catch (error) {
    console.error('Agents API error:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}
