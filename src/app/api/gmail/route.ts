import { NextResponse } from 'next/server';
import { getRecentEmails, isGmailConnected } from '@/lib/gmail';

export async function GET() {
  try {
    const connected = await isGmailConnected();
    if (!connected) {
      return NextResponse.json({ connected: false, emails: [] });
    }

    const emails = await getRecentEmails(10);
    return NextResponse.json({ connected: true, emails });
  } catch (error) {
    console.error('Gmail fetch error:', error);
    return NextResponse.json({ connected: false, emails: [] });
  }
}
