import { NextRequest, NextResponse } from 'next/server';
import { handleCallback } from '@/lib/google';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/?google=error', request.url));
  }

  try {
    await handleCallback(code);
    return NextResponse.redirect(new URL('/?google=connected', request.url));
  } catch {
    return NextResponse.redirect(new URL('/?google=error', request.url));
  }
}
