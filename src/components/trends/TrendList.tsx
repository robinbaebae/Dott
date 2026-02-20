'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendArticle, TrendCategory, TREND_CATEGORIES } from '@/types';

const POLL_INTERVAL = 60 * 60 * 1000; // 1시간

const CATEGORY_TABS: { value: TrendCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  ...TREND_CATEGORIES,
];

const CATEGORY_DOT: Record<TrendCategory, string> = {
  beauty: 'bg-purple-500',
  fashion: 'bg-pink-500',
  ai: 'bg-blue-500',
  planning: 'bg-amber-500',
  marketing: 'bg-green-500',
};

const CATEGORY_LABEL: Record<TrendCategory, string> = {
  marketing: 'Marketing',
  planning: 'Planning',
  ai: 'AI/Tech',
  fashion: 'Fashion',
  beauty: 'Beauty',
};

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

function groupByDate(articles: TrendArticle[]): { date: string; items: TrendArticle[] }[] {
  const groups: Record<string, TrendArticle[]> = {};

  for (const article of articles) {
    const dateKey = article.pub_date
      ? new Date(article.pub_date).toISOString().split('T')[0]
      : 'unknown';
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(article);
  }

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, items }));
}

export default function TrendList() {
  const [articles, setArticles] = useState<TrendArticle[]>([]);
  const [category, setCategory] = useState<TrendCategory | 'all'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = category !== 'all' ? `?category=${category}` : '';
      const res = await fetch(`/api/trends${params}`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch trend articles:', err);
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  const triggerRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await fetch('/api/trends', { method: 'POST' });
      await fetchArticles();
    } catch (err) {
      console.error('Failed to refresh trends:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchArticles]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  useEffect(() => {
    const interval = setInterval(fetchArticles, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchArticles]);

  const grouped = useMemo(() => groupByDate(articles), [articles]);

  return (
    <div className="space-y-4">
      {/* 헤더: 필터 탭 + 새로고침 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          {CATEGORY_TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={category === tab.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={triggerRefresh} disabled={isLoading}>
            {isLoading ? 'Collecting...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* 타임라인 */}
      {isLoading && articles.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Loading trend articles...</p>
      ) : articles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No articles collected yet. Click the Refresh button to start collecting.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ date, items }) => (
            <div key={date} className="relative">
              {/* 날짜 헤더 */}
              <div className="sticky top-16 z-10 bg-background/95 backdrop-blur-sm pb-2 mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {date !== 'unknown' ? formatDateLabel(date) : 'No date'}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {items.length} items
                  </span>
                </h3>
              </div>

              {/* 타임라인 아이템 */}
              <div className="relative pl-6 border-l-2 border-border space-y-1">
                {items.map((article) => (
                  <a
                    key={article.id}
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block relative py-2.5 px-4 -ml-[1px] rounded-r-lg hover:bg-accent/50 transition-colors"
                  >
                    {/* 타임라인 도트 */}
                    <div
                      className={`absolute -left-[calc(0.75rem+1px)] top-4 w-2.5 h-2.5 rounded-full border-2 border-background ${CATEGORY_DOT[article.category]}`}
                    />

                    <div className="flex items-start gap-3">
                      {/* 시간 */}
                      <span className="text-xs text-muted-foreground w-12 shrink-0 pt-0.5">
                        {article.pub_date
                          ? new Date(article.pub_date).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '--:--'}
                      </span>

                      {/* 콘텐츠 */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
                          {article.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {CATEGORY_LABEL[article.category]}
                          </Badge>
                          {article.source && (
                            <span className="text-xs text-muted-foreground">{article.source}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
