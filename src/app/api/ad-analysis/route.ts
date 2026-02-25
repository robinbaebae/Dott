import { NextRequest, NextResponse } from 'next/server';
import { generateCompletion } from '@/lib/claude';
import { logActivity } from '@/lib/activity';
import { requireAuth } from '@/lib/auth-guard';

const SYSTEM_PROMPT = `You are an expert digital advertising analyst.
Analyze the provided campaign performance data and provide actionable insights.

Your analysis should include:
1. **전체 성과 요약** (2-3 sentences)
2. **우수 캠페인** — 상위 캠페인과 성과가 좋은 이유
3. **개선 필요 캠페인** — 부진 캠페인과 구체적 개선 방안
4. **예산 배분 제안** — 어디에 예산을 늘리고 줄여야 하는지
5. **핵심 지표 분석** — CTR, CPC, ROAS 등 주요 지표 해석
6. **최적화 액션** — 바로 실행 가능한 3-5개 액션 아이템

Write in Korean. Be concise, data-driven, and actionable.
Use markdown formatting with headers (##) and bullet points.
Include specific numbers from the data to support your analysis.`;

export async function POST(req: NextRequest) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const { campaigns, platform } = await req.json();

    if (!campaigns || !Array.isArray(campaigns) || campaigns.length === 0) {
      return NextResponse.json({ error: 'campaigns data required' }, { status: 400 });
    }

    // Summarize for prompt
    const summary = campaigns.map((c: Record<string, unknown>) => ({
      name: c.name,
      status: c.status,
      spend: c.spend,
      conversions: c.conversions,
      roas: c.roas,
      ctr: c.ctr,
      cpc: c.cpc,
      clicks: c.clicks,
      impressions: c.impressions,
      convRate: c.convRate,
      costPerConv: c.costPerConv,
    }));

    const totalSpend = campaigns.reduce((s: number, c: Record<string, number>) => s + (c.spend || 0), 0);
    const totalConv = campaigns.reduce((s: number, c: Record<string, number>) => s + (c.conversions || 0), 0);
    const totalClicks = campaigns.reduce((s: number, c: Record<string, number>) => s + (c.clicks || 0), 0);
    const totalImpressions = campaigns.reduce((s: number, c: Record<string, number>) => s + (c.impressions || 0), 0);

    const platformName = platform === 'google' ? 'Google Ads' : 'Meta Ads';

    const userMessage = `Platform: ${platformName}
Total campaigns: ${campaigns.length}
Total spend: ₩${totalSpend.toLocaleString()}
Total conversions: ${totalConv}
Total clicks: ${totalClicks.toLocaleString()}
Total impressions: ${totalImpressions.toLocaleString()}
Overall CTR: ${totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0}%

Campaign data:
${JSON.stringify(summary, null, 2)}`;

    const analysis = await generateCompletion(SYSTEM_PROMPT, userMessage);

    await logActivity('ad_analysis_generated', null, {
      platform,
      campaignCount: campaigns.length,
      totalSpend,
    });

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Ad analysis error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
