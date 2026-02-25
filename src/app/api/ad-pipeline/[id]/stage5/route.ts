import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCompletion } from '@/lib/claude';
import { AD_PERFORMANCE_REPORT_PROMPT } from '@/lib/prompts';
import { logActivity } from '@/lib/activity';
import { withTimeout } from '@/lib/api-utils';
import { requireAuth } from '@/lib/auth-guard';

// POST — Stage 5: AI performance analysis report
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

    const creatives = project.creatives || [];
    const adCopies = project.ad_copies || [];
    const perfData = project.performance_data || {};

    const context = `
캠페인: ${project.name}
크리에이티브 ${creatives.length}개, 카피 ${adCopies.length}개

성과 데이터:
- Impressions: ${perfData.impressions || 0}
- Clicks: ${perfData.clicks || 0}
- CTR: ${perfData.ctr || '0'}%
- CPC: ${perfData.cpc || '0'}원
- Spend: ${perfData.spend || 0}원
- Conversions: ${perfData.conversions || 0}

크리에이티브 목록:
${creatives.map((c: { copy: string; size: string }, i: number) => `${i + 1}. [${c.size}] "${c.copy}"`).join('\n')}

광고 카피:
${adCopies.map((c: { headline: string; primary_text: string }, i: number) => `${i + 1}. Headline: "${c.headline}" / Primary: "${c.primary_text}"`).join('\n')}
    `.trim();

    const report = await withTimeout(
      generateCompletion(AD_PERFORMANCE_REPORT_PROMPT, context),
      60000,
      '성과 리포트 생성 시간 초과'
    );

    const { data, error } = await supabaseAdmin
      .from('ad_creative_projects')
      .update({
        ai_report: report,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userEmail)
      .select()
      .single();

    if (error) throw error;
    await logActivity('ad_report_generated', 'marketing', { projectId: id });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
