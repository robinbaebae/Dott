import { NextResponse } from 'next/server';
import { getInstagramAuthUrl } from '@/lib/instagram';

export async function GET() {
  const url = getInstagramAuthUrl();
  return NextResponse.redirect(url);
}
