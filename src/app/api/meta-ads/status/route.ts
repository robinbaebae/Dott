import { NextResponse } from 'next/server';
import { isMetaAdsConnected } from '@/lib/meta-ads';
import { getAdAccountId } from '@/lib/instagram';

export async function GET() {
  try {
    const connected = await isMetaAdsConnected();
    const adAccountId = connected ? await getAdAccountId() : null;
    return NextResponse.json({ connected, adAccountId: adAccountId ?? undefined });
  } catch (error) {
    console.error('Meta Ads status error:', error);
    return NextResponse.json({ connected: false }, { status: 500 });
  }
}
