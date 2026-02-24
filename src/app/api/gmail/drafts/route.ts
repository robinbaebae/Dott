import { NextResponse } from 'next/server';
import { getRecentDrafts } from '@/lib/gmail';

export async function GET() {
  try {
    const drafts = await getRecentDrafts(10);
    return NextResponse.json(drafts);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
