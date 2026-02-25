import { NextResponse } from 'next/server';
import { getThreadsAuthUrl } from '@/lib/threads';
import { requireAuth } from '@/lib/auth-guard';

export async function GET() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const url = getThreadsAuthUrl();
  return NextResponse.redirect(url);
}
