import { supabaseAdmin } from './supabase';

const THREADS_API_BASE = 'https://graph.threads.net';

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getConfig() {
  return {
    appId: getEnvVar('THREADS_APP_ID'),
    appSecret: getEnvVar('THREADS_APP_SECRET'),
    redirectUri: getEnvVar('THREADS_REDIRECT_URI'),
  };
}

export function getThreadsAuthUrl(): string {
  const { appId, redirectUri } = getConfig();
  const scopes = 'threads_basic,threads_content_publish,threads_manage_insights,threads_manage_replies';

  return `${THREADS_API_BASE}/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&response_type=code`;
}

export async function handleThreadsCallback(code: string, userEmail: string) {
  const { appId, appSecret, redirectUri } = getConfig();

  // 1. Exchange code for short-lived token
  const tokenRes = await fetch(`${THREADS_API_BASE}/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }),
  });
  const tokenData = await tokenRes.json();
  if (tokenData.error) throw new Error(tokenData.error_message ?? tokenData.error);

  const shortLivedToken = tokenData.access_token;
  const userId = String(tokenData.user_id ?? '');

  // 2. Exchange for long-lived token
  const longRes = await fetch(
    `${THREADS_API_BASE}/access_token?grant_type=th_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`,
  );
  const longData = await longRes.json();
  if (longData.error) throw new Error(longData.error_message ?? longData.error);

  const longLivedToken = longData.access_token;
  const expiresIn = longData.expires_in ?? 5184000;

  // 3. Store in Supabase
  const { error } = await supabaseAdmin.from('threads_tokens').upsert({
    id: userEmail,
    access_token: longLivedToken,
    user_id: userId,
    expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function isThreadsConnected(userEmail: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('threads_tokens')
    .select('id')
    .eq('id', userEmail)
    .single();
  return !!data;
}

export async function disconnectThreads(userEmail: string) {
  await supabaseAdmin.from('threads_tokens').delete().eq('id', userEmail);
  await supabaseAdmin.from('threads_posts').delete().eq('user_id', userEmail);
}

async function getTokenAndUserId(userEmail: string) {
  const { data } = await supabaseAdmin
    .from('threads_tokens')
    .select('*')
    .eq('id', userEmail)
    .single();
  if (!data) return null;
  return { accessToken: data.access_token, userId: data.user_id };
}

export async function fetchThreadsPosts(userEmail: string) {
  const creds = await getTokenAndUserId(userEmail);
  if (!creds) return [];

  const { accessToken, userId } = creds;
  const fields = 'id,text,media_type,permalink,timestamp,like_count,reply_count,repost_count,quote_count';

  const res = await fetch(
    `${THREADS_API_BASE}/v1.0/${userId}/threads?fields=${fields}&limit=25&access_token=${accessToken}`,
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const posts = (data.data ?? []).map((p: Record<string, unknown>) => ({
    threads_id: p.id as string,
    text: (p.text as string) ?? '',
    media_type: (p.media_type as string) ?? '',
    permalink: (p.permalink as string) ?? '',
    timestamp: p.timestamp as string,
    like_count: (p.like_count as number) ?? 0,
    reply_count: (p.reply_count as number) ?? 0,
    repost_count: (p.repost_count as number) ?? 0,
    quote_count: (p.quote_count as number) ?? 0,
    fetched_at: new Date().toISOString(),
    user_id: userEmail,
  }));

  // Upsert into Supabase
  for (const post of posts) {
    await supabaseAdmin.from('threads_posts').upsert(post, { onConflict: 'threads_id' });
  }

  return posts;
}

export async function getCachedThreadsPosts(userEmail: string) {
  const { data } = await supabaseAdmin
    .from('threads_posts')
    .select('*')
    .eq('user_id', userEmail)
    .order('timestamp', { ascending: false });
  return data ?? [];
}
