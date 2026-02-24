'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KeywordTrend, TrendArticle } from '@/types';
import { supabase } from '@/lib/supabase';

type KW = KeywordTrend & { prev_count: number; change_rate: number };

export default function KeywordTrendCard() {
  const [keywords, setKeywords] = useState<KW[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [articles, setArticles] = useState<TrendArticle[]>([]);

  const fetchTrends = async (signal?: AbortSignal) => {
    const res = await fetch('/api/trends/keyword-trends', { signal }).catch(() => null);
    if (res?.ok && !signal?.aborted) setKeywords(await res.json());
  };

  const refresh = async () => {
    setLoading(true);
    try {
      await fetch('/api/trends', { method: 'POST' });
      await fetch('/api/trends/keyword-trends', { method: 'POST' });
      await fetchTrends();
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (kw: KW) => {
    if (expanded === kw.keyword) {
      setExpanded(null);
      return;
    }
    setExpanded(kw.keyword);
    if (kw.related_article_ids?.length) {
      const { data } = await supabase.from('trend_articles').select('*').in('id', kw.related_article_ids);
      setArticles(data ?? []);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchTrends(controller.signal);
    const interval = setInterval(() => fetchTrends(controller.signal), 5 * 60 * 1000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  return (
    <Card>
      <div className="px-6 pt-6 pb-2 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">키워드 트렌드 감지</h2>
          <p className="text-xs text-muted-foreground mt-0.5">RSS 기사 키워드 주간 비교 · SEO 활용 가능</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading} className="text-xs">
          {loading ? '수집 중...' : 'Refresh'}
        </Button>
      </div>
      <CardContent>
        {keywords.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            키워드 데이터가 없습니다. <button onClick={refresh} className="underline">Refresh</button>를 눌러주세요.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Keyword chips */}
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw) => (
                <button
                  key={kw.keyword}
                  onClick={() => toggle(kw)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm border transition-all ${
                    expanded === kw.keyword
                      ? 'bg-foreground text-background border-foreground'
                      : 'hover:bg-muted border-border'
                  }`}
                >
                  <span className="font-semibold">#{kw.keyword}</span>
                  <span className="text-xs opacity-60">{kw.count}</span>
                  {kw.change_rate > 0 && (
                    <Badge
                      variant={kw.change_rate >= 50 ? 'destructive' : 'secondary'}
                      className="text-[10px] px-1.5 py-0 ml-0.5"
                    >
                      +{kw.change_rate}%
                    </Badge>
                  )}
                </button>
              ))}
            </div>

            {/* Expanded articles */}
            {expanded && articles.length > 0 && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  #{expanded} 관련 기사
                </p>
                {articles.map((a) => (
                  <a
                    key={a.id}
                    href={a.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-baseline gap-2 text-sm hover:text-foreground text-muted-foreground"
                  >
                    <span className="shrink-0 w-1 h-1 rounded-full bg-muted-foreground mt-2" />
                    <span className="hover:underline">{a.title}</span>
                    {a.source && <span className="text-xs opacity-40 shrink-0">{a.source}</span>}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
