import { supabaseAdmin } from './supabase';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';
const GRAPH_API_IG = 'https://graph.instagram.com';

function getConfig() {
  return {
    appId: process.env.INSTAGRAM_APP_ID!,
    appSecret: process.env.INSTAGRAM_APP_SECRET!,
    redirectUri: process.env.INSTAGRAM_REDIRECT_URI!,
  };
}

export function getInstagramAuthUrl(): string {
  const { appId, redirectUri } = getConfig();
  const scopes = [
    'instagram_basic',
    'instagram_manage_insights',
    'pages_show_list',
    'pages_read_engagement',
    'ads_read',
  ].join(',');

  return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`;
}

export async function handleInstagramCallback(code: string, userEmail: string) {
  const { appId, appSecret, redirectUri } = getConfig();

  // 1. Exchange code for short-lived token
  const tokenRes = await fetch(
    `${GRAPH_API_BASE}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`,
  );
  const tokenData = await tokenRes.json();
  if (tokenData.error) throw new Error(tokenData.error.message);

  const shortLivedToken = tokenData.access_token;

  // 2. Exchange for long-lived token
  const longRes = await fetch(
    `${GRAPH_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`,
  );
  const longData = await longRes.json();
  if (longData.error) throw new Error(longData.error.message);

  const longLivedToken = longData.access_token;
  const expiresIn = longData.expires_in ?? 5184000; // default 60 days

  // 3. Get pages to find IG business account
  const pagesRes = await fetch(
    `${GRAPH_API_BASE}/me/accounts?access_token=${longLivedToken}`,
  );
  const pagesData = await pagesRes.json();
  let igUserId = '';

  if (pagesData.data && pagesData.data.length > 0) {
    const pageId = pagesData.data[0].id;
    const pageToken = pagesData.data[0].access_token;
    const igRes = await fetch(
      `${GRAPH_API_BASE}/${pageId}?fields=instagram_business_account&access_token=${pageToken}`,
    );
    const igData = await igRes.json();
    igUserId = igData.instagram_business_account?.id ?? '';
  }

  // If no business account, try basic IG user ID
  if (!igUserId) {
    const meRes = await fetch(
      `${GRAPH_API_IG}/me?fields=id&access_token=${longLivedToken}`,
    );
    const meData = await meRes.json();
    igUserId = meData.id ?? '';
  }

  // 4. Discover ad account
  let adAccountId = '';
  try {
    const adRes = await fetch(
      `${GRAPH_API_BASE}/me/adaccounts?fields=id,name,account_status&access_token=${longLivedToken}`,
    );
    const adData = await adRes.json();
    if (adData.data && adData.data.length > 0) {
      adAccountId = adData.data[0].id; // format: "act_XXXXX"
    }
  } catch {
    // ads_read permission may not be granted yet — ignore
  }

  // 5. Store in Supabase
  const { error } = await supabaseAdmin.from('instagram_tokens').upsert({
    id: userEmail,
    access_token: longLivedToken,
    user_id: igUserId,
    ad_account_id: adAccountId || null,
    token_type: 'long_lived',
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function isInstagramConnected(userEmail: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('instagram_tokens')
    .select('id')
    .eq('id', userEmail)
    .single();
  return !!data;
}

export async function disconnectInstagram(userEmail: string) {
  await supabaseAdmin.from('instagram_tokens').delete().eq('id', userEmail);
  await supabaseAdmin.from('instagram_posts').delete().eq('user_id', userEmail);
}

async function getTokenAndUserId(userEmail: string) {
  const { data } = await supabaseAdmin
    .from('instagram_tokens')
    .select('*')
    .eq('id', userEmail)
    .single();
  if (!data) return null;
  return { accessToken: data.access_token, userId: data.user_id };
}

export async function getAdAccountId(userEmail: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('instagram_tokens')
    .select('ad_account_id')
    .eq('id', userEmail)
    .single();
  return data?.ad_account_id ?? null;
}

export async function fetchInstagramPosts(userEmail: string) {
  const creds = await getTokenAndUserId(userEmail);
  if (!creds) return [];

  const { accessToken, userId } = creds;
  const fields = 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count';

  const res = await fetch(
    `${GRAPH_API_BASE}/${userId}/media?fields=${fields}&limit=25&access_token=${accessToken}`,
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const posts = (data.data ?? []).map((p: Record<string, unknown>) => ({
    ig_id: p.id as string,
    caption: (p.caption as string) ?? '',
    media_type: p.media_type as string,
    media_url: (p.media_url as string) ?? '',
    permalink: (p.permalink as string) ?? '',
    timestamp: p.timestamp as string,
    like_count: (p.like_count as number) ?? 0,
    comments_count: (p.comments_count as number) ?? 0,
    fetched_at: new Date().toISOString(),
    user_id: userEmail,
  }));

  // Upsert into Supabase
  for (const post of posts) {
    await supabaseAdmin.from('instagram_posts').upsert(post, { onConflict: 'ig_id' });
  }

  return posts;
}

export async function fetchPostInsights(mediaId: string, userEmail: string) {
  const creds = await getTokenAndUserId(userEmail);
  if (!creds) return null;

  const { accessToken } = creds;
  const metrics = 'impressions,reach,saved,engagement';

  const res = await fetch(
    `${GRAPH_API_BASE}/${mediaId}/insights?metric=${metrics}&access_token=${accessToken}`,
  );
  const data = await res.json();
  if (data.error) return null;

  const insights: Record<string, number> = {};
  for (const item of data.data ?? []) {
    insights[item.name] = item.values?.[0]?.value ?? 0;
  }

  // Update cached post
  if (Object.keys(insights).length > 0) {
    await supabaseAdmin
      .from('instagram_posts')
      .update({
        impressions: insights.impressions ?? 0,
        reach: insights.reach ?? 0,
        saved: insights.saved ?? 0,
        engagement: insights.engagement ?? 0,
      })
      .eq('ig_id', mediaId);
  }

  return insights;
}

export async function getCachedPosts(userEmail: string) {
  const { data } = await supabaseAdmin
    .from('instagram_posts')
    .select('*')
    .eq('user_id', userEmail)
    .order('timestamp', { ascending: false });
  return data ?? [];
}

export async function getInstagramContextForChat(userEmail: string): Promise<string> {
  const connected = await isInstagramConnected(userEmail);
  if (!connected) return '';

  const posts = await getCachedPosts(userEmail);
  if (posts.length === 0) return '';

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const thisWeek = posts.filter((p) => new Date(p.timestamp) >= oneWeekAgo);
  const lastWeek = posts.filter(
    (p) => new Date(p.timestamp) >= twoWeeksAgo && new Date(p.timestamp) < oneWeekAgo,
  );

  const sumMetrics = (arr: typeof posts) => ({
    count: arr.length,
    likes: arr.reduce((s, p) => s + (p.like_count ?? 0), 0),
    comments: arr.reduce((s, p) => s + (p.comments_count ?? 0), 0),
    impressions: arr.reduce((s, p) => s + (p.impressions ?? 0), 0),
    reach: arr.reduce((s, p) => s + (p.reach ?? 0), 0),
  });

  const tw = sumMetrics(thisWeek);
  const lw = sumMetrics(lastWeek);

  return `
## Instagram 데이터
- 연결 상태: 연결됨
- 총 캐시된 게시물: ${posts.length}개

### 이번 주 (최근 7일)
- 게시물 수: ${tw.count}개
- 좋아요: ${tw.likes} / 댓글: ${tw.comments}
- 노출: ${tw.impressions} / 도달: ${tw.reach}

### 지난 주
- 게시물 수: ${lw.count}개
- 좋아요: ${lw.likes} / 댓글: ${lw.comments}
- 노출: ${lw.impressions} / 도달: ${lw.reach}

### 최근 게시물 (최대 5개)
${posts
  .slice(0, 5)
  .map(
    (p, i) =>
      `${i + 1}. [${p.media_type}] "${(p.caption ?? '').slice(0, 50)}..." — 좋아요 ${p.like_count ?? 0}, 댓글 ${p.comments_count ?? 0}`,
  )
  .join('\n')}
`.trim();
}
