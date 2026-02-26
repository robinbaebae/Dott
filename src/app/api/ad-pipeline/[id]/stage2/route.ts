import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateCompletion, getUserApiKey } from '@/lib/claude';
import { AD_COPY_GENERATION_PROMPT } from '@/lib/prompts';
import { logActivity } from '@/lib/activity';
import { withTimeout } from '@/lib/api-utils';
import { requireAuth } from '@/lib/auth-guard';

// POST — Stage 2: Generate ad copies for each creative
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;
    const apiKey = await getUserApiKey(userEmail);


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
    if (creatives.length === 0) {
      return NextResponse.json({ error: 'No creatives found. Run Stage 1 first.' }, { status: 400 });
    }

    const creativeList = creatives
      .map((c: { copy: string; size: string }, i: number) => `${i + 1}. 카피: "${c.copy}" / 사이즈: ${c.size}`)
      .join('\n');

    const response = await withTimeout(
      generateCompletion(
        apiKey,
        AD_COPY_GENERATION_PROMPT,
        `다음 ${creatives.length}개 광고 크리에이티브에 대한 카피를 작성해주세요:\n\n${creativeList}\n\n브랜드: 코드앤버터 (노코드 팝업/배너 SaaS)`
      ),
      60000,
      '광고 카피 생성 시간 초과'
    );

    let adCopies: Array<{ creative_index: number; headline: string; primary_text: string; description: string; cta: string }> = [];
    try {
      const jsonStr = response.replace(/^[^[]*/, '').replace(/[^\]]*$/, '');
      const parsed = JSON.parse(jsonStr);
      adCopies = parsed.map((c: Record<string, string>, i: number) => ({
        creative_index: i,
        headline: c.headline || '',
        primary_text: c.primary_text || '',
        description: c.description || '',
        cta: c.cta || 'LEARN_MORE',
      }));
    } catch {
      adCopies = creatives.map((_: unknown, i: number) => ({
        creative_index: i,
        headline: 'Generated headline',
        primary_text: response.slice(0, 125),
        description: 'Learn more',
        cta: 'LEARN_MORE',
      }));
    }

    const { data, error } = await supabaseAdmin
      .from('ad_creative_projects')
      .update({ ad_copies: adCopies, status: 'stage_3', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userEmail)
      .select()
      .single();

    if (error) throw error;
    await logActivity('ad_copies_generated', 'marketing', { count: adCopies.length });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
