import { NextResponse } from 'next/server';
import { getRecentEmails, isGmailConnected } from '@/lib/gmail';
import { requireAuth } from '@/lib/auth-guard';

export async function GET() {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const connected = await isGmailConnected(userEmail);
    if (!connected) {
      return NextResponse.json({ connected: false, emails: [] });
    }

    const emails = await getRecentEmails(10, userEmail);
    return NextResponse.json({ connected: true, emails });
  } catch (error) {
    console.error('Gmail fetch error:', error);
    return NextResponse.json({ connected: false, emails: [] });
  }
}
