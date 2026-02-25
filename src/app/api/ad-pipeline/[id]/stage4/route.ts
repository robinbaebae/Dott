import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import { fetchCampaignInsights } from '@/lib/meta-ads';
import { withTimeout } from '@/lib/api-utils';
import { requireAuth } from '@/lib/auth-guard';

// POST — Stage 4: Collect campaign performance data
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const { id } = await params;

    const { data: project, error: fetchErr } = await supabaseAdmin
      .from('ad_creative_projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', userEmail)
      .single();

    if (fetchErr || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    let performanceData: Record<string, unknown> = {};
    let fetchedFromApi = false;

    // Try to fetch live data from Meta API if campaign exists
    if (project.campaign_id) {
      try {
        const insights = await withTimeout(
          fetchCampaignInsights(project.campaign_id, 'last_14d', userEmail),
          30000,
          '성과 데이터 수집 시간 초과'
        );

        if (insights && insights.length > 0) {
          const totals = insights.reduce(
            (acc: { impressions: number; clicks: number; spend: number; conversions: number }, row: Record<string, number>) => ({
              impressions: acc.impressions + (row.impressions || 0),
              clicks: acc.clicks + (row.clicks || 0),
              spend: acc.spend + (row.spend || 0),
              conversions: acc.conversions + (row.conversions || 0),
            }),
            { impressions: 0, clicks: 0, spend: 0, conversions: 0 }
          );

          performanceData = {
            ...totals,
            ctr: totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : '0',
            cpc: totals.clicks > 0 ? (totals.spend / totals.clicks).toFixed(0) : '0',
            daily: insights,
          };
          fetchedFromApi = true;
        }
      } catch (apiErr) {
        console.error('Failed to fetch campaign insights from Meta:', apiErr);
      }
    }

    // Fallback: check cached insights from DB
    if (!fetchedFromApi && project.campaign_id) {
      const { data: insights } = await supabaseAdmin
        .from('meta_ad_insights')
        .select('*')
        .eq('campaign_id', project.campaign_id)
        .order('date_start', { ascending: false })
        .limit(14);

      if (insights && insights.length > 0) {
        const totals = insights.reduce(
          (acc, row) => ({
            impressions: acc.impressions + (row.impressions || 0),
            clicks: acc.clicks + (row.clicks || 0),
            spend: acc.spend + (row.spend || 0),
            conversions: acc.conversions + (row.conversions || 0),
          }),
          { impressions: 0, clicks: 0, spend: 0, conversions: 0 }
        );

        performanceData = {
          ...totals,
          ctr: totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : '0',
          cpc: totals.clicks > 0 ? (totals.spend / totals.clicks).toFixed(0) : '0',
          daily: insights,
          source: 'cached',
        };
      }
    }

    // No data at all
    if (Object.keys(performanceData).length === 0) {
      performanceData = {
        note: '캠페인 집행 후 성과 데이터가 여기에 표시됩니다.',
        impressions: 0,
        clicks: 0,
        spend: 0,
        ctr: '0',
      };
    }

    const { data, error } = await supabaseAdmin
      .from('ad_creative_projects')
      .update({
        performance_data: performanceData,
        status: 'stage_5',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userEmail)
      .select()
      .single();

    if (error) throw error;
    await logActivity('ad_performance_collected', 'marketing', {
      hasData: !!project.campaign_id,
      fetchedFromApi,
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
