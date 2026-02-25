import { NextRequest, NextResponse } from 'next/server';
import { handleCallback } from '@/lib/google';
import { requireAuth } from '@/lib/auth-guard';

export async function GET(request: NextRequest) {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/?google=error', request.url));
  }

  try {
    await handleCallback(code, userEmail);
    return NextResponse.redirect(new URL('/?google=connected', request.url));
  } catch {
    return NextResponse.redirect(new URL('/?google=error', request.url));
  }
}
