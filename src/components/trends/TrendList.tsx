'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendArticle, TrendCategory } from '@/types';

const POLL_INTERVAL = 60 * 60 * 1000; // 1시간

const CATEGORY_TABS: { value: TrendCategory | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'beauty', label: '뷰티' },
  { value: 'fashion', label: '패션' },
];

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

  return (
    <div className="space-y-4">
      {/* 헤더: 필터 탭 + 새로고침 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
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
              마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={triggerRefresh} disabled={isLoading}>
            {isLoading ? '수집 중...' : '새로고침'}
          </Button>
        </div>
      </div>

      {/* 아티클 목록 */}
      {isLoading && articles.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">트렌드 기사를 불러오는 중...</p>
      ) : articles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              아직 수집된 기사가 없습니다. 새로고침 버튼을 눌러 기사를 수집해보세요.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {articles.map((article) => (
            <a
              key={article.id}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug line-clamp-2">
                        {article.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {article.source && (
                          <span className="text-xs text-muted-foreground">{article.source}</span>
                        )}
                        {article.pub_date && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(article.pub_date).toLocaleDateString('ko-KR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {article.category === 'beauty' ? '뷰티' : '패션'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
