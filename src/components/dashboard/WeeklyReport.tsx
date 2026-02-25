'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, RefreshCw } from 'lucide-react';

interface ReportData {
  report: string;
  stats: {
    totalTasks: number;
    doneTasks: number;
    insightsCount: number;
    igPostsCount: number;
    threadsPostsCount: number;
  };
  generatedAt: string;
}

const CACHE_KEY = 'dott_weekly_report';

export default function WeeklyReport() {
  const [data, setData] = useState<ReportData | null>(null);
  const [generating, setGenerating] = useState(false);
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

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/weekly-report', { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        setData(result);
        setExpanded(true);
        localStorage.setItem(CACHE_KEY, JSON.stringify(result));
      }
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-blue-500 dark:text-blue-400" />
            <CardTitle className="text-base">주간 리포트</CardTitle>
            {data && (
              <span className="text-xs text-muted-foreground">
                최근: {formatDate(data.generatedAt)}
              </span>
            )}
          </div>
          <Button
            size="sm"
            onClick={generate}
            disabled={generating}
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? '생성 중...' : data ? '새로고침' : '생성'}
          </Button>
        </div>
      </CardHeader>

      {data && (
        <CardContent className="pt-0">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
              <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">{data.stats.doneTasks}/{data.stats.totalTasks}</p>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-400/60">완료 태스크</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <p className="text-lg font-semibold text-blue-700 dark:text-blue-400">{data.stats.insightsCount}</p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/60">인사이트</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-pink-50 dark:bg-pink-950/20">
              <p className="text-lg font-semibold text-pink-700 dark:text-pink-400">{data.stats.igPostsCount}</p>
              <p className="text-xs text-pink-600/70 dark:text-pink-400/60">IG 게시물</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20">
              <p className="text-lg font-semibold text-orange-700 dark:text-orange-400">{data.stats.threadsPostsCount}</p>
              <p className="text-xs text-orange-600/70 dark:text-orange-400/60">스레드</p>
            </div>
          </div>

          {/* Toggle report */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-accent hover:underline mb-2"
          >
            {expanded ? '리포트 접기' : '전체 리포트 보기'}
          </button>

          {expanded && (
            <div className="prose prose-sm max-w-none dark:prose-invert mt-2 text-sm leading-relaxed whitespace-pre-wrap rounded-lg border bg-muted/20 p-4 max-h-96 overflow-y-auto">
              {data.report}
            </div>
          )}
        </CardContent>
      )}

      {generating && !data && (
        <CardContent className="pt-0">
          <div className="flex items-center justify-center py-8">
            <div className="size-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
