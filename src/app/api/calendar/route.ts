import { NextRequest, NextResponse } from 'next/server';
import { getCalendarEvents, createCalendarEvent, isConnected, disconnect } from '@/lib/google';
import { requireAuth } from '@/lib/auth-guard';

export async function GET(request: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const connected = await isConnected(userEmail);
  if (!connected) {
    return NextResponse.json({ connected: false, events: [] });
  }

  const timeMin = request.nextUrl.searchParams.get('timeMin');
  const timeMax = request.nextUrl.searchParams.get('timeMax');

  if (!timeMin || !timeMax) {
    return NextResponse.json(
      { error: 'timeMin and timeMax are required' },
      { status: 400 },
    );
  }

  try {
    const events = await getCalendarEvents(timeMin, timeMax, userEmail);
    return NextResponse.json({ connected: true, events });
  } catch {
    return NextResponse.json({ connected: true, events: [] });
  }
}

export async function POST(request: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const connected = await isConnected(userEmail);
  if (!connected) {
    return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 401 });
  }

  try {
    const { summary, startTime, endTime, description, attendees } = await request.json();
    if (!summary || !startTime || !endTime) {
      return NextResponse.json({ error: 'summary, startTime, endTime required' }, { status: 400 });
    }
    const event = await createCalendarEvent(summary, startTime, endTime, description, attendees, userEmail);
    return NextResponse.json({ ok: true, event });
  } catch (error) {
    console.error('Calendar create error:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

export async function DELETE() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  await disconnect(userEmail);
  return NextResponse.json({ ok: true });
}
