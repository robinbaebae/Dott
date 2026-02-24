import { NextRequest, NextResponse } from 'next/server';
import {
  fetchMetaCampaigns,
  fetchCampaignInsights,
  getCachedCampaigns,
  getCachedInsights,
} from '@/lib/meta-ads';
import { logActivity } from '@/lib/activity';

interface CampaignResponse {
  id: string;
  name: string;
  status: 'Active' | 'Paused' | 'Ended';
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  spend: number;
  conversions: number;
  convRate: number;
  roas: number;
  costPerConv: number;
}

function mapStatus(raw: string): 'Active' | 'Paused' | 'Ended' {
  switch (raw) {
    case 'ACTIVE': return 'Active';
    case 'PAUSED': return 'Paused';
    default: return 'Ended';
  }
}

export async function GET(req: NextRequest) {
  try {
    const refresh = req.nextUrl.searchParams.get('refresh') === 'true';

    let campaigns;
    if (refresh) {
      campaigns = await fetchMetaCampaigns();
      // Also fetch account-level insights for per-campaign aggregation
      for (const c of campaigns.slice(0, 20)) {
        try {
          await fetchCampaignInsights(c.campaign_id);
        } catch {
          // skip individual campaign insight errors
        }
      }
    }

    const cached = await getCachedCampaigns();
    const insights = await getCachedInsights(30);

    // Build per-campaign aggregated metrics
    const result: CampaignResponse[] = cached.map((c) => {
      const campaignInsights = insights.filter((i) => i.campaign_id === c.campaign_id);
      const totalImpressions = campaignInsights.reduce((s, i) => s + Number(i.impressions ?? 0), 0);
      const totalClicks = campaignInsights.reduce((s, i) => s + Number(i.clicks ?? 0), 0);
      const totalSpend = campaignInsights.reduce((s, i) => s + Number(i.spend ?? 0), 0);
      const totalConversions = campaignInsights.reduce((s, i) => s + Number(i.conversions ?? 0), 0);

      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
      const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
      const convRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
      const costPerConv = totalConversions > 0 ? totalSpend / totalConversions : 0;
      // Estimate ROAS (revenue / spend) — without revenue data, use conversions * avg order value estimate
      const roas = totalSpend > 0 ? (totalConversions * 50) / totalSpend : 0;

      return {
        id: c.campaign_id,
        name: c.name,
        status: mapStatus(c.status),
        impressions: totalImpressions,
        clicks: totalClicks,
        ctr: +ctr.toFixed(2),
        cpc: +cpc.toFixed(2),
        cpm: +cpm.toFixed(2),
        spend: +totalSpend.toFixed(2),
        conversions: totalConversions,
        convRate: +convRate.toFixed(2),
        roas: +roas.toFixed(1),
        costPerConv: +costPerConv.toFixed(2),
      };
    });

    await logActivity('meta_ads_fetch', 'marketing', { campaignCount: result.length, refresh });

    return NextResponse.json({ campaigns: result });
  } catch (error) {
    console.error('Meta Ads campaigns error:', error);
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
  }
}
