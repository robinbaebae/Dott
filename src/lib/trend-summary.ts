import { supabaseAdmin } from './supabase';
import { generateCompletion, getUserApiKey } from './claude';
import { TREND_SUMMARY_PROMPT } from './prompts';
import { TrendArticle, TrendSummary } from '@/types';

/** Get today's cached summary, or null */
export async function getTodaySummary(): Promise<TrendSummary | null> {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabaseAdmin
    .from('trend_summaries')
    .select('*')
    .eq('summary_date', today)
    .single();
  return data ?? null;
}

/** Generate an AI summary for today's articles and cache it */
export async function generateTrendSummary(category?: string, userEmail?: string, force?: boolean): Promise<TrendSummary> {
  const today = new Date().toISOString().split('T')[0];

  // Check cache first (skip if force regeneration)
  if (!force) {
    const existing = await getTodaySummary();
    if (existing) return existing;
  }

  // Fetch recent articles (last 7 days)
  const dayAgo = new Date();
  dayAgo.setDate(dayAgo.getDate() - 7);

  let query = supabaseAdmin
    .from('trend_articles')
    .select('*')
    .gte('pub_date', dayAgo.toISOString())
    .order('pub_date', { ascending: false })
    .limit(30);

  if (category && ['ai', 'planning', 'marketing', 'tech'].includes(category)) {
    query = query.eq('category', category);
  }

  const { data: articles, error: fetchError } = await query;
  if (fetchError) throw fetchError;
  if (!articles || articles.length === 0) {
    throw new Error('No articles found for today');
  }

  // Build article list for the prompt
  const articleList = (articles as TrendArticle[])
    .map((a, i) => `${i + 1}. [${a.category}] ${a.title} (${a.source || 'unknown'})`)
    .join('\n');

  const userMessage = `오늘 수집된 기사 목록:\n\n${articleList}\n\n이 기사들을 바탕으로 오늘의 IT 마케팅/기획 트렌드 요약을 작성해주세요.`;

  const apiKey = await getUserApiKey(userEmail || '');


  const summaryText = await generateCompletion(apiKey, TREND_SUMMARY_PROMPT, userMessage);
  const articleIds = articles.map((a) => a.id);

  const { data, error } = await supabaseAdmin
    .from('trend_summaries')
    .upsert(
      {
        summary_date: today,
        summary_text: summaryText,
        article_ids: articleIds,
      },
      { onConflict: 'summary_date' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Get recent summaries */
export async function getRecentSummaries(limit = 7): Promise<TrendSummary[]> {
  const { data, error } = await supabaseAdmin
    .from('trend_summaries')
    .select('*')
    .order('summary_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
