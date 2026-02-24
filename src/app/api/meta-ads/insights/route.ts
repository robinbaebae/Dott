import { NextRequest, NextResponse } from 'next/server';
import { fetchMetaInsights, getCachedInsights } from '@/lib/meta-ads';

interface TimeDataResponse {
  label: string;
  spend: number;
  conversions: number;
  clicks: number;
  impressions: number;
  roas: number;
  ctr: number;
}

export async function GET(req: NextRequest) {
  try {
    const period = req.nextUrl.searchParams.get('period') ?? 'daily';
    const refresh = req.nextUrl.searchParams.get('refresh') === 'true';

    // Determine how far back to fetch
    let days: number;
    let datePreset: string;
    switch (period) {
      case 'weekly':
        days = 56; // 8 weeks
        datePreset = 'last_60d';
        break;
      case 'monthly':
        days = 180; // 6 months
        datePreset = 'last_180d';
        break;
      default:
        days = 14;
        datePreset = 'last_14d';
        break;
    }

    if (refresh) {
      await fetchMetaInsights(datePreset);
    }

    const insights = await getCachedInsights(days);

    let timeData: TimeDataResponse[];

    if (period === 'daily') {
      // Each row = one day
      timeData = insights
        .filter((i) => !i.campaign_id) // account-level only
        .map((i) => {
          const d = new Date(i.date_start);
          const impressions = Number(i.impressions ?? 0);
          const clicks = Number(i.clicks ?? 0);
          const spend = Number(i.spend ?? 0);
          const conversions = Number(i.conversions ?? 0);
          return {
            label: `${d.getMonth() + 1}/${d.getDate()}`,
            spend,
            conversions,
            clicks,
            impressions,
            roas: spend > 0 ? +((conversions * 50) / spend).toFixed(1) : 0,
            ctr: impressions > 0 ? +((clicks / impressions) * 100).toFixed(2) : 0,
          };
        });
    } else if (period === 'weekly') {
      // Aggregate into weeks
      const weekMap = new Map<string, TimeDataResponse>();
      const accountInsights = insights.filter((i) => !i.campaign_id);

      for (const i of accountInsights) {
        const d = new Date(i.date_start);
        // Get Monday of this week
        const day = d.getDay();
        const monday = new Date(d);
        monday.setDate(d.getDate() - ((day + 6) % 7));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const key = monday.toISOString().split('T')[0];
        const label = `${monday.getMonth() + 1}/${monday.getDate()}~${sunday.getMonth() + 1}/${sunday.getDate()}`;

        const existing = weekMap.get(key) ?? {
          label,
          spend: 0,
          conversions: 0,
          clicks: 0,
          impressions: 0,
          roas: 0,
          ctr: 0,
        };

        existing.spend += Number(i.spend ?? 0);
        existing.conversions += Number(i.conversions ?? 0);
        existing.clicks += Number(i.clicks ?? 0);
        existing.impressions += Number(i.impressions ?? 0);
        weekMap.set(key, existing);
      }

      timeData = [...weekMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, w]) => ({
          ...w,
          roas: w.spend > 0 ? +((w.conversions * 50) / w.spend).toFixed(1) : 0,
          ctr: w.impressions > 0 ? +((w.clicks / w.impressions) * 100).toFixed(2) : 0,
        }));
    } else {
      // Monthly
      const monthMap = new Map<string, TimeDataResponse>();
      const accountInsights = insights.filter((i) => !i.campaign_id);

      for (const i of accountInsights) {
        const d = new Date(i.date_start);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;

        const existing = monthMap.get(key) ?? {
          label,
          spend: 0,
          conversions: 0,
          clicks: 0,
          impressions: 0,
          roas: 0,
          ctr: 0,
        };

        existing.spend += Number(i.spend ?? 0);
        existing.conversions += Number(i.conversions ?? 0);
        existing.clicks += Number(i.clicks ?? 0);
        existing.impressions += Number(i.impressions ?? 0);
        monthMap.set(key, existing);
      }

      timeData = [...monthMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, m]) => ({
          ...m,
          roas: m.spend > 0 ? +((m.conversions * 50) / m.spend).toFixed(1) : 0,
          ctr: m.impressions > 0 ? +((m.clicks / m.impressions) * 100).toFixed(2) : 0,
        }));
    }

    return NextResponse.json({ data: timeData });
  } catch (error) {
    console.error('Meta Ads insights error:', error);
    return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
  }
}
