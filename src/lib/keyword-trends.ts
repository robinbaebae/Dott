import { supabase } from './supabase';
import { extractKeywords } from './keywords';
import { TrendArticle, KeywordTrend } from '@/types';

/** Create a keyword snapshot for today based on recent articles */
export async function createKeywordSnapshot(): Promise<KeywordTrend[]> {
  // Fetch articles from the last 30 days (wider window for keyword analysis)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 30);

  const { data: articles, error: fetchError } = await supabase
    .from('trend_articles')
    .select('*')
    .gte('pub_date', weekAgo.toISOString())
    .order('pub_date', { ascending: false });

  if (fetchError) throw fetchError;
  if (!articles || articles.length === 0) return [];

  const keywords = extractKeywords(articles as TrendArticle[]);
  const today = new Date().toISOString().split('T')[0];
  const inserted: KeywordTrend[] = [];

  for (const kw of keywords) {
    const articleIds = kw.articles.map((a) => a.id);
    const { data, error } = await supabase
      .from('keyword_trends')
      .upsert(
        {
          keyword: kw.word,
          count: kw.count,
          snapshot_date: today,
          source: 'rss',
          related_article_ids: articleIds,
        },
        { onConflict: 'keyword,snapshot_date,source' }
      )
      .select()
      .single();

    if (!error && data) inserted.push(data);
  }

  return inserted;
}

/** Get keyword trends with week-over-week change rate */
export async function getKeywordTrends(): Promise<
  (KeywordTrend & { prev_count: number; change_rate: number })[]
> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];

  // Get this week's snapshot (latest date)
  const { data: current } = await supabase
    .from('keyword_trends')
    .select('*')
    .eq('snapshot_date', todayStr)
    .order('count', { ascending: false })
    .limit(10);

  if (!current || current.length === 0) {
    // Try the most recent snapshot date
    const { data: latest } = await supabase
      .from('keyword_trends')
      .select('snapshot_date')
      .order('snapshot_date', { ascending: false })
      .limit(1);

    if (!latest || latest.length === 0) return [];

    const latestDate = latest[0].snapshot_date;
    const { data: latestData } = await supabase
      .from('keyword_trends')
      .select('*')
      .eq('snapshot_date', latestDate)
      .order('count', { ascending: false })
      .limit(10);

    if (!latestData) return [];

    // Get previous week's data
    const prevDate = new Date(latestDate);
    prevDate.setDate(prevDate.getDate() - 7);
    const prevStr = prevDate.toISOString().split('T')[0];

    return attachChangeRates(latestData, prevStr);
  }

  return attachChangeRates(current, weekAgoStr);
}

async function attachChangeRates(
  current: KeywordTrend[],
  prevDateStr: string
): Promise<(KeywordTrend & { prev_count: number; change_rate: number })[]> {
  const { data: previous } = await supabase
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
