import { NextResponse } from 'next/server';
import { getAgents, getAgentStatus } from '@/lib/agents';

export async function GET() {
  try {
    const [agents, activeTasks] = await Promise.all([
      getAgents(),
      getAgentStatus(),
    ]);

    return NextResponse.json({ agents, activeTasks });
  } catch (error) {
    console.error('Agents API error:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}
