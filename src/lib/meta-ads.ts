import { supabase } from './supabase';
import { getAdAccountId } from './instagram';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

async function getTokenAndAdAccount() {
  const { data } = await supabase
    .from('instagram_tokens')
    .select('access_token, ad_account_id')
    .eq('id', 'default')
    .single();
  if (!data || !data.ad_account_id) return null;
  return { accessToken: data.access_token as string, adAccountId: data.ad_account_id as string };
}

export async function isMetaAdsConnected(): Promise<boolean> {
  const adAccountId = await getAdAccountId();
  return !!adAccountId;
}

export async function fetchMetaCampaigns() {
  const creds = await getTokenAndAdAccount();
  if (!creds) return [];

  const { accessToken, adAccountId } = creds;
  const fields = 'id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time';

  const res = await fetch(
    `${GRAPH_API_BASE}/${adAccountId}/campaigns?fields=${fields}&limit=50&access_token=${accessToken}`,
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const campaigns = (data.data ?? []).map((c: Record<string, unknown>) => ({
    campaign_id: c.id as string,
    name: c.name as string,
    status: c.status as string,
    objective: (c.objective as string) ?? '',
    daily_budget: c.daily_budget ? Number(c.daily_budget) : null,
    lifetime_budget: c.lifetime_budget ? Number(c.lifetime_budget) : null,
    created_time: c.created_time as string,
    updated_time: c.updated_time as string,
    fetched_at: new Date().toISOString(),
  }));

  for (const campaign of campaigns) {
    await supabase
      .from('meta_ad_campaigns')
      .upsert(campaign, { onConflict: 'campaign_id' });
  }

  return campaigns;
}

export async function fetchMetaInsights(datePreset = 'last_14d') {
  const creds = await getTokenAndAdAccount();
  if (!creds) return [];

  const { accessToken, adAccountId } = creds;
  const fields = 'impressions,clicks,ctr,cpc,cpm,spend,actions,cost_per_action_type';

  const res = await fetch(
    `${GRAPH_API_BASE}/${adAccountId}/insights?fields=${fields}&time_increment=1&date_preset=${datePreset}&access_token=${accessToken}`,
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const insights = (data.data ?? []).map((row: Record<string, unknown>) => {
    const actions = (row.actions as Array<{ action_type: string; value: string }>) ?? [];
    const conversions = actions
      .filter((a) => a.action_type === 'offsite_conversion' || a.action_type === 'purchase')
      .reduce((sum, a) => sum + Number(a.value), 0);

    return {
      campaign_id: null as string | null,
      date_start: row.date_start as string,
      date_stop: row.date_stop as string,
      impressions: Number(row.impressions ?? 0),
      clicks: Number(row.clicks ?? 0),
      ctr: Number(row.ctr ?? 0),
      cpc: Number(row.cpc ?? 0),
      cpm: Number(row.cpm ?? 0),
      spend: Number(row.spend ?? 0),
      conversions,
      cost_per_action_type: row.cost_per_action_type ?? [],
      actions: row.actions ?? [],
      fetched_at: new Date().toISOString(),
    };
  });

  for (const insight of insights) {
    await supabase
      .from('meta_ad_insights')
      .upsert(insight, { onConflict: 'campaign_id,date_start,date_stop' });
  }

  return insights;
}

export async function fetchCampaignInsights(campaignId: string, datePreset = 'last_14d') {
  const creds = await getTokenAndAdAccount();
  if (!creds) return [];

  const { accessToken } = creds;
  const fields = 'impressions,clicks,ctr,cpc,cpm,spend,actions,cost_per_action_type';

  const res = await fetch(
    `${GRAPH_API_BASE}/${campaignId}/insights?fields=${fields}&time_increment=1&date_preset=${datePreset}&access_token=${accessToken}`,
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const insights = (data.data ?? []).map((row: Record<string, unknown>) => {
    const actions = (row.actions as Array<{ action_type: string; value: string }>) ?? [];
    const conversions = actions
      .filter((a) => a.action_type === 'offsite_conversion' || a.action_type === 'purchase')
      .reduce((sum, a) => sum + Number(a.value), 0);

    return {
      campaign_id: campaignId,
      date_start: row.date_start as string,
      date_stop: row.date_stop as string,
      impressions: Number(row.impressions ?? 0),
      clicks: Number(row.clicks ?? 0),
      ctr: Number(row.ctr ?? 0),
      cpc: Number(row.cpc ?? 0),
      cpm: Number(row.cpm ?? 0),
      spend: Number(row.spend ?? 0),
      conversions,
      cost_per_action_type: row.cost_per_action_type ?? [],
      actions: row.actions ?? [],
      fetched_at: new Date().toISOString(),
    };
  });

  for (const insight of insights) {
    await supabase
      .from('meta_ad_insights')
      .upsert(insight, { onConflict: 'campaign_id,date_start,date_stop' });
  }

  return insights;
}

/**
 * Create a Meta Ads campaign via Marketing API
 */
export async function createMetaCampaign(params: {
  name: string;
  objective?: string;
  dailyBudget: number; // in KRW cents
  status?: string;
}): Promise<{ campaignId: string } | null> {
  const creds = await getTokenAndAdAccount();
  if (!creds) return null;

  const { accessToken, adAccountId } = creds;

  const res = await fetch(`${GRAPH_API_BASE}/${adAccountId}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: params.name,
      objective: params.objective || 'OUTCOME_TRAFFIC',
      status: params.status || 'PAUSED',
      special_ad_categories: [],
      daily_budget: params.dailyBudget,
      access_token: accessToken,
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const campaignId = data.id as string;

  // Save to local DB
  await supabase.from('meta_ad_campaigns').upsert({
    campaign_id: campaignId,
    name: params.name,
    status: params.status || 'PAUSED',
    objective: params.objective || 'OUTCOME_TRAFFIC',
    daily_budget: params.dailyBudget,
    created_time: new Date().toISOString(),
    updated_time: new Date().toISOString(),
    fetched_at: new Date().toISOString(),
  }, { onConflict: 'campaign_id' });

  return { campaignId };
}

/**
 * Update campaign status (ACTIVE, PAUSED, ARCHIVED)
 */
export async function updateCampaignStatus(
  campaignId: string,
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
): Promise<boolean> {
  const creds = await getTokenAndAdAccount();
  if (!creds) return false;

  const res = await fetch(`${GRAPH_API_BASE}/${campaignId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status,
      access_token: creds.accessToken,
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  await supabase
    .from('meta_ad_campaigns')
    .update({ status, updated_time: new Date().toISOString() })
    .eq('campaign_id', campaignId);

  return data.success ?? true;
}

export async function getCachedCampaigns() {
  const { data } = await supabase
    .from('meta_ad_campaigns')
    .select('*')
    .order('created_time', { ascending: false });
  return data ?? [];
}

export async function getCachedInsights(days = 14) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabase
    .from('meta_ad_insights')
    .select('*')
    .gte('date_start', since.toISOString().split('T')[0])
    .order('date_start', { ascending: true });
  return data ?? [];
}

export async function getMetaAdsContextForChat(): Promise<string> {
  const connected = await isMetaAdsConnected();
  if (!connected) return '';

  const campaigns = await getCachedCampaigns();
  const insights = await getCachedInsights(14);

  if (campaigns.length === 0 && insights.length === 0) return '';

  const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE');
  const totalSpend = insights.reduce((s, i) => s + Number(i.spend ?? 0), 0);
  const totalImpressions = insights.reduce((s, i) => s + Number(i.impressions ?? 0), 0);
  const totalClicks = insights.reduce((s, i) => s + Number(i.clicks ?? 0), 0);
  const totalConversions = insights.reduce((s, i) => s + Number(i.conversions ?? 0), 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;

  const topCampaigns = [...campaigns]
    .sort((a, b) => (b.daily_budget ?? 0) - (a.daily_budget ?? 0))
    .slice(0, 5);

  return `
## Meta Ads 데이터
- 연결 상태: 연결됨
- 총 캠페인: ${campaigns.length}개 (활성: ${activeCampaigns.length}개)

### 최근 14일 성과
- 총 광고비: $${totalSpend.toFixed(2)}
- 노출: ${totalImpressions.toLocaleString()}
- 클릭: ${totalClicks.toLocaleString()}
- CTR: ${avgCtr.toFixed(2)}%
- 평균 CPC: $${avgCpc.toFixed(2)}
- 전환: ${totalConversions}건

### 주요 캠페인 (최대 5개)
${topCampaigns
  .map(
    (c, i) =>
      `${i + 1}. [${c.status}] "${c.name}" — 일일예산: ${c.daily_budget ? `$${(c.daily_budget / 100).toFixed(0)}` : 'N/A'}`,
  )
  .join('\n')}
`.trim();
}
