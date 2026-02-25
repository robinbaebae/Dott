import { NextResponse } from 'next/server';
import { getRecentDrafts } from '@/lib/gmail';
import { requireAuth } from '@/lib/auth-guard';

export async function GET() {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const drafts = await getRecentDrafts(10, userEmail);
    return NextResponse.json(drafts);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
