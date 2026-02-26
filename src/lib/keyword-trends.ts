import { supabaseAdmin } from './supabase';
import { TrendArticle, KeywordTrend } from '@/types';

/** Create a keyword snapshot for watchlist keywords based on article matching */
export async function createWatchlistSnapshot(
  watchlistKeywords: string[]
): Promise<KeywordTrend[]> {
  if (watchlistKeywords.length === 0) return [];

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data: articles, error: fetchError } = await supabaseAdmin
    .from('trend_articles')
    .select('*')
    .gte('pub_date', since.toISOString())
    .order('pub_date', { ascending: false });

  if (fetchError) {
    console.error('[keyword-trends] Failed to fetch articles:', fetchError.message, fetchError.code);
  }

  const allArticles = (articles as TrendArticle[] | null) ?? [];
  console.log(`[keyword-trends] Found ${allArticles.length} articles from last 30 days`);
  const today = new Date().toISOString().split('T')[0];
  const inserted: KeywordTrend[] = [];

  for (const kw of watchlistKeywords) {
    const lower = kw.toLowerCase();
    // Match against title and source
    const matched = allArticles.filter(
      (a) =>
        a.title.toLowerCase().includes(lower) ||
        (a.source && a.source.toLowerCase().includes(lower))
    );

    const { data, error } = await supabaseAdmin
      .from('keyword_trends')
      .upsert(
        {
          keyword: kw,
          count: matched.length,
          snapshot_date: today,
          source: 'watchlist',
          related_article_ids: matched.map((a) => a.id),
        },
        { onConflict: 'keyword,snapshot_date,source' }
      )
      .select()
      .single();

    if (error) {
      console.error(`[keyword-trends] Upsert failed for "${kw}":`, error.message, error.code, error.details);
    } else if (data) {
      inserted.push(data);
    }
  }

  return inserted;
}

/** Get keyword trends with week-over-week change rate, optionally filtered by keywords */
export async function getKeywordTrends(
  keywords?: string[]
): Promise<(KeywordTrend & { prev_count: number; change_rate: number })[]> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];

  let query = supabaseAdmin
    .from('keyword_trends')
    .select('*')
    .eq('snapshot_date', todayStr)
    .order('count', { ascending: false });

  if (keywords && keywords.length > 0) {
    query = query.in('keyword', keywords);
  } else {
    query = query.limit(10);
  }

  const { data: current } = await query;

  if (!current || current.length === 0) {
    // Try the most recent snapshot date
    let latestQuery = supabaseAdmin
      .from('keyword_trends')
      .select('snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(1);

    if (keywords && keywords.length > 0) {
      latestQuery = latestQuery.in('keyword', keywords);
    }

    const { data: latest } = await latestQuery;
    if (!latest || latest.length === 0) return [];

    const latestDate = latest[0].snapshot_date;
    let fallbackQuery = supabaseAdmin
      .from('keyword_trends')
      .select('*')
      .eq('snapshot_date', latestDate)
      .order('count', { ascending: false });

    if (keywords && keywords.length > 0) {
      fallbackQuery = fallbackQuery.in('keyword', keywords);
    } else {
      fallbackQuery = fallbackQuery.limit(10);
    }

    const { data: latestData } = await fallbackQuery;
    if (!latestData) return [];

    const prevDate = new Date(latestDate);
    prevDate.setDate(prevDate.getDate() - 7);
    return attachChangeRates(latestData, prevDate.toISOString().split('T')[0]);
  }

  return attachChangeRates(current, weekAgoStr);
}

/** Get historical trend data for given keywords over the last N days */
export async function getKeywordHistory(
  keywords: string[],
  days = 30
): Promise<{ keyword: string; snapshot_date: string; count: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  const { data } = await supabaseAdmin
    .from('keyword_trends')
    .select('keyword, snapshot_date, count')
    .in('keyword', keywords)
    .gte('snapshot_date', sinceStr)
    .order('snapshot_date', { ascending: true });

  return data ?? [];
}

async function attachChangeRates(
  current: KeywordTrend[],
  prevDateStr: string
): Promise<(KeywordTrend & { prev_count: number; change_rate: number })[]> {
  const { data: previous } = await supabaseAdmin
    .from('keyword_trends')
    .select('keyword, count')
    .eq('snapshot_date', prevDateStr);

  const prevMap = new Map<string, number>();
  if (previous) {
    for (const p of previous) {
      prevMap.set(p.keyword, p.count);
    }
  }

  return current.map((kw) => {
    const prevCount = prevMap.get(kw.keyword) ?? 0;
    const changeRate = prevCount > 0
      ? Math.round(((kw.count - prevCount) / prevCount) * 100)
      : kw.count > 0 ? 100 : 0;
    return { ...kw, prev_count: prevCount, change_rate: changeRate };
  });
}
