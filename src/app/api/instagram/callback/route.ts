import { NextRequest, NextResponse } from 'next/server';
import { handleInstagramCallback } from '@/lib/instagram';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/?instagram=error', req.url));
  }

  try {
    await handleInstagramCallback(code);
    return NextResponse.redirect(new URL('/?instagram=connected', req.url));
  } catch (error) {
    console.error('Instagram callback error:', error);
    return NextResponse.redirect(new URL('/?instagram=error', req.url));
  }
}
