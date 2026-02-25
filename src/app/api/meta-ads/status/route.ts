import { NextResponse } from 'next/server';
import { isMetaAdsConnected } from '@/lib/meta-ads';
import { getAdAccountId } from '@/lib/instagram';
import { requireAuth } from '@/lib/auth-guard';

export async function GET() {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const connected = await isMetaAdsConnected(userEmail);
    const adAccountId = connected ? await getAdAccountId(userEmail) : null;
    return NextResponse.json({ connected, adAccountId: adAccountId ?? undefined });
  } catch (error) {
    console.error('Meta Ads status error:', error);
    return NextResponse.json({ connected: false }, { status: 500 });
  }
}
