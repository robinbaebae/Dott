import { NextRequest, NextResponse } from 'next/server';
import { getCalendarEvents, isConnected, disconnect } from '@/lib/google';

export async function GET(request: NextRequest) {
  const connected = await isConnected();
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
    const events = await getCalendarEvents(timeMin, timeMax);
    return NextResponse.json({ connected: true, events });
  } catch {
    return NextResponse.json({ connected: true, events: [] });
  }
}

export async function DELETE() {
  await disconnect();
  return NextResponse.json({ ok: true });
}
