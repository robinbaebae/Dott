import Parser from 'rss-parser';
import { supabaseAdmin } from './supabase';
import { TrendArticle } from '@/types';

const parser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; DottBot/1.0)',
    'Accept': 'application/rss+xml, application/xml, text/xml',
  },
  timeout: 10000,
});

const FEED_QUERIES: { query: string; category: 'ai' | 'planning' | 'marketing' | 'tech' }[] = [
  { query: '디지털 마케팅 트렌드', category: 'marketing' },
  { query: '마케팅 전략 그로스해킹', category: 'marketing' },
  { query: '서비스 기획 IT 기획', category: 'planning' },
  { query: 'AI 인공지능 트렌드', category: 'ai' },
  { query: 'IT 테크 SaaS 트렌드', category: 'tech' },
  { query: '퍼포먼스 마케팅 광고', category: 'marketing' },
];

const FEEDS = FEED_QUERIES.map(({ query, category }) => ({
  url: `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`,
  category,
}));

function extractSource(title: string): { cleanTitle: string; source: string | null } {
  // Google News titles format: "기사 제목 - 매체명"
  const match = title.match(/^(.+)\s-\s([^-]+)$/);
  if (match) {
    return { cleanTitle: match[1].trim(), source: match[2].trim() };
  }
  return { cleanTitle: title, source: null };
}

export async function fetchAndStoreArticles(): Promise<{ inserted: number; total: number }> {
  let inserted = 0;
  let total = 0;

  for (const feed of FEEDS) {
    try {
      const result = await parser.parseURL(feed.url);

      for (const item of result.items) {
        if (!item.title || !item.link) continue;
        total++;

        const { cleanTitle, source } = extractSource(item.title);
        const pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : null;

        const { error } = await supabaseAdmin
          .from('trend_articles')
          .upsert(
            {
              title: cleanTitle,
              link: item.link,
              source,
              category: feed.category,
              pub_date: pubDate,
            },
            { onConflict: 'link' }
          );

        if (!error) inserted++;
      }
    } catch (err) {
      console.error(`[RSS] Failed to fetch feed (${feed.category}, ${feed.url}):`, err instanceof Error ? err.message : err);
    }
  }

  return { inserted, total };
}

export async function getArticles(category?: string, since?: string): Promise<TrendArticle[]> {
  let query = supabaseAdmin
    .from('trend_articles')
    .select('*')
    .order('pub_date', { ascending: false })
    .limit(50);

  if (category && ['ai', 'planning', 'marketing', 'tech'].includes(category)) {
    query = query.eq('category', category);
  }

  if (since) {
    query = query.gte('created_at', since);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
