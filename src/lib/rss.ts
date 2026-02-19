import Parser from 'rss-parser';
import { supabase } from './supabase';
import { TrendArticle } from '@/types';

const parser = new Parser();

const FEEDS = [
  {
    url: 'https://news.google.com/rss/search?q=뷰티+트렌드&hl=ko&gl=KR&ceid=KR:ko',
    category: 'beauty' as const,
  },
  {
    url: 'https://news.google.com/rss/search?q=패션+트렌드&hl=ko&gl=KR&ceid=KR:ko',
    category: 'fashion' as const,
  },
];

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

        const { error } = await supabase
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
      console.error(`Failed to fetch RSS feed (${feed.category}):`, err);
    }
  }

  return { inserted, total };
}

export async function getArticles(category?: string): Promise<TrendArticle[]> {
  let query = supabase
    .from('trend_articles')
    .select('*')
    .order('pub_date', { ascending: false })
    .limit(50);

  if (category && (category === 'beauty' || category === 'fashion')) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
