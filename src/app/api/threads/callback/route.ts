import { NextRequest, NextResponse } from 'next/server';
import { handleThreadsCallback } from '@/lib/threads';
import { requireAuth } from '@/lib/auth-guard';

export async function GET(req: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const code = req.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/?threads=error', req.url));
  }

  try {
    await handleThreadsCallback(code, userEmail);
    return NextResponse.redirect(new URL('/?threads=connected', req.url));
  } catch (error) {
    console.error('Threads callback error:', error);
    return NextResponse.redirect(new URL('/?threads=error', req.url));
  }
}
