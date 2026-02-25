import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/google';
import { requireAuth } from '@/lib/auth-guard';

export async function GET() {
  const userEmail = await requireAuth();
  if (userEmail instanceof NextResponse) return userEmail;

  const url = getAuthUrl();
  return NextResponse.redirect(url);
}
