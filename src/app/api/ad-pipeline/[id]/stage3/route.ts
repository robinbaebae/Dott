import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import { createMetaCampaign } from '@/lib/meta-ads';
import { withTimeout } from '@/lib/api-utils';
import { requireAuth } from '@/lib/auth-guard';

// POST — Stage 3: Create Meta ad campaign
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userEmail = await requireAuth();
    if (userEmail instanceof NextResponse) return userEmail;

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { campaign_name, daily_budget, targeting, auto_publish } = body;

    const { data: project, error: fetchErr } = await supabaseAdmin
      .from('ad_creative_projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', userEmail)
      .single();

    if (fetchErr || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check Meta connection
    const { data: token } = await supabaseAdmin
      .from('instagram_tokens')
      .select('access_token, ad_account_id')
      .eq('id', userEmail)
      .single();

    if (!token?.ad_account_id) {
      return NextResponse.json({
        error: 'Meta Ads 계정이 연결되어 있지 않습니다. Settings에서 연결해주세요.',
      }, { status: 400 });
    }

    const name = campaign_name || project.name;
    const budget = daily_budget || 10000; // default 10,000 KRW

    // Create actual campaign via Meta Marketing API
    let campaignId: string | null = null;
    let campaignStatus = 'PAUSED';

    try {
      const result = await withTimeout(
        createMetaCampaign({
          name,
          dailyBudget: budget,
          status: auto_publish ? 'ACTIVE' : 'PAUSED',
        }, userEmail),
        30000,
        '캠페인 생성 시간 초과'
      );

      if (result) {
        campaignId = result.campaignId;
        campaignStatus = auto_publish ? 'ACTIVE' : 'PAUSED';
      }
    } catch (metaErr) {
      console.error('Meta campaign creation failed:', metaErr);
      // Continue with local-only config if Meta API fails
    }

    const campaignConfig = {
      campaign_name: name,
      daily_budget: budget,
      targeting: targeting || {},
      ad_account_id: token.ad_account_id,
      creatives_count: project.creatives?.length || 0,
      copies_count: project.ad_copies?.length || 0,
      campaign_status: campaignStatus,
      meta_api_created: !!campaignId,
    };

    const { data, error } = await supabaseAdmin
      .from('ad_creative_projects')
      .update({
        campaign_config: campaignConfig,
        campaign_id: campaignId,
        status: 'stage_4',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userEmail)
      .select()
      .single();

    if (error) throw error;

    await logActivity('ad_campaign_created', 'marketing', {
      campaignId,
      campaignConfig,
      metaApiCreated: !!campaignId,
    });

    return NextResponse.json({
      ...data,
      meta_campaign_created: !!campaignId,
      message: campaignId
        ? `캠페인이 Meta Ads에 생성되었습니다 (${campaignStatus})`
        : '캠페인 설정이 저장되었습니다. Meta API 연동 후 실제 캠페인이 생성됩니다.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
