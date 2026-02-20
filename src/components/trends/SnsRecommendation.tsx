'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface KeywordItem {
  word: string;
  count: number;
  articles: { id: string; title: string; link: string }[];
}

export default function SnsRecommendation() {
  const [keywords, setKeywords] = useState<KeywordItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/trends/keywords');
        if (res.ok) {
          const data = await res.json();
          setKeywords(data);
        }
      } catch (err) {
        console.error('Failed to fetch keywords:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">SNS Content Ideas</h2>
          <p className="text-sm text-muted-foreground">Trending keyword-based content ideas</p>
        </div>
        <p className="text-sm text-muted-foreground py-4">Analyzing...</p>
      </div>
    );
  }

  if (keywords.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">SNS Content Ideas</h2>
        <p className="text-sm text-muted-foreground">Trending keyword-based content ideas</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {keywords.map((kw) => (
          <Card
            key={kw.word}
            className="min-w-[200px] max-w-[240px] shrink-0 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-default"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base font-bold text-primary">#{kw.word}</span>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  {kw.count}x
                </span>
              </div>
              {kw.articles[0] && (
                <a
                  href={kw.articles[0].link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground line-clamp-2 hover:text-foreground transition-colors"
                >
                  {kw.articles[0].title}
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
