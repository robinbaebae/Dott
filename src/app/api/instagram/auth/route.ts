import { NextResponse } from 'next/server';
import { getInstagramAuthUrl } from '@/lib/instagram';
import { requireAuth } from '@/lib/auth-guard';

export async function GET() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const url = getInstagramAuthUrl();
  return NextResponse.redirect(url);
}
