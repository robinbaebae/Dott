'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, RefreshCw } from 'lucide-react';

interface PerformanceData {
  analysis: string;
  hasData: boolean;
  stats?: {
    igPostsCount: number;
    threadsPostsCount: number;
    totalLikes: number;
    totalComments: number;
  };
  analyzedAt: string;
}

const CACHE_KEY = 'dott_performance_insights';

export default function PerformanceInsights() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        setData(JSON.parse(cached));
      } catch {
        // ignore
      }
    }
  }, []);

  const analyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/performance-insights', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        setData(result);
        setExpanded(true);
        localStorage.setItem(CACHE_KEY, JSON.stringify(result));
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-accent" />
            <h2 className="text-base font-semibold">Performance Insights</h2>
            {data?.analyzedAt && (
              <span className="text-xs text-muted-foreground">
                Last: {formatDate(data.analyzedAt)}
              </span>
            )}
          </div>
          <Button
            size="sm"
            onClick={analyze}
            disabled={analyzing}
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'Analyzing...' : data ? 'Refresh' : 'Analyze Performance'}
          </Button>
        </div>

        {analyzing && !data && (
          <div className="flex items-center justify-center py-8">
            <div className="size-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {data && data.hasData && data.stats && (
          <>
            {/* Stats overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-2 rounded-lg bg-pink-50">
                <p className="text-lg font-semibold">{data.stats.igPostsCount}</p>
                <p className="text-xs text-muted-foreground">IG Posts</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-gray-50">
                <p className="text-lg font-semibold">{data.stats.threadsPostsCount}</p>
                <p className="text-xs text-muted-foreground">Threads</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-red-50">
                <p className="text-lg font-semibold">{data.stats.totalLikes.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Likes</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-blue-50">
                <p className="text-lg font-semibold">{data.stats.totalComments.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Comments</p>
              </div>
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-accent hover:underline"
            >
              {expanded ? 'Hide analysis' : 'Show full analysis'}
            </button>

            {expanded && (
              <div className="prose prose-sm max-w-none dark:prose-invert text-sm leading-relaxed whitespace-pre-wrap rounded-lg border bg-muted/20 p-4 max-h-96 overflow-y-auto">
                {data.analysis}
              </div>
            )}
          </>
        )}

        {data && !data.hasData && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {data.analysis}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
