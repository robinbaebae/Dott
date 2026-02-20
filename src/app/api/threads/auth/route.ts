import { NextResponse } from 'next/server';
import { getThreadsAuthUrl } from '@/lib/threads';

export async function GET() {
  const url = getThreadsAuthUrl();
  return NextResponse.redirect(url);
}
