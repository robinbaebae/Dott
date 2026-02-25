'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, TrendingUp, FileText, Target, Zap } from 'lucide-react';

interface BriefingData {
  report_text: string;
  stats: {
    actionBreakdown?: Record<string, number>;
    agentStats?: Record<string, number>;
    completedTasks?: number;
  };
  trends?: { keyword: string; change_rate: number }[];
  upcoming?: { title: string; date: string }[];
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  activity: <Zap className="size-3.5 text-amber-500" />,
  trends: <TrendingUp className="size-3.5 text-rose-500" />,
  tasks: <Target className="size-3.5 text-emerald-500" />,
  content: <FileText className="size-3.5 text-violet-500" />,
};

export default function DailyBriefingPanel() {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [trendHighlights, setTrendHighlights] = useState<{ keyword: string; change_rate: number }[]>([]);
  const [upcomingContent, setUpcomingContent] = useState<{ title: string; date: string }[]>([]);

  const today = new Date().toISOString().split('T')[0];

  const fetchBriefing = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch today's report
      const res = await fetch(`/api/daily-report?date=${today}`);
      if (res.ok) {
        const data = await res.json();
        setBriefing(data);
      } else if (res.status === 404) {
        // Auto-generate for today (#14)
        setGenerating(true);
        const postRes = await fetch('/api/daily-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: today }),
        });
        if (postRes.ok) {
          const data = await postRes.json();
          setBriefing(data);
        }
        setGenerating(false);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [today]);

  // Fetch trend highlights
  const fetchTrends = useCallback(async () => {
    try {
      const res = await fetch('/api/trends/keyword-trends?watchlist=true');
      if (res.ok) {
        const data: { keyword: string; change_rate: number }[] = await res.json();
        setTrendHighlights(data.filter((t) => t.change_rate >= 20).sort((a, b) => b.change_rate - a.change_rate).slice(0, 5));
      }
    } catch { /* silent */ }
  }, []);

  // Fetch upcoming content
  const fetchUpcoming = useCallback(async () => {
    try {
      const end = new Date();
      end.setDate(end.getDate() + 7);
      const res = await fetch(`/api/content-calendar?start=${today}&end=${end.toISOString().slice(0, 10)}`);
      if (res.ok) {
        const data: { title: string; scheduled_date: string }[] = await res.json();
        setUpcomingContent(data.slice(0, 5).map((d) => ({ title: d.title, date: d.scheduled_date })));
      }
    } catch { /* silent */ }
  }, [today]);

  useEffect(() => {
    fetchBriefing();
    fetchTrends();
    fetchUpcoming();
  }, [fetchBriefing, fetchTrends, fetchUpcoming]);

  const handleRegenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/daily-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today }),
      });
      if (res.ok) setBriefing(await res.json());
    } catch { /* silent */ }
    finally { setGenerating(false); }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="py-6 flex items-center justify-center gap-2">
          <Sparkles className="size-4 animate-pulse text-violet-500" />
          <span className="text-sm text-muted-foreground">브리핑 준비 중...</span>
        </CardContent>
      </Card>
    );
  }

  const reportLines = briefing?.report_text?.split('\n').filter(Boolean) || [];
  const previewLines = reportLines.slice(0, 4);
  const hasMore = reportLines.length > 4;
  const totalActions = briefing?.stats?.actionBreakdown
    ? Object.values(briefing.stats.actionBreakdown).reduce((s, n) => s + n, 0)
    : 0;

  return (
    <Card className="w-full bg-gradient-to-br from-violet-100/40 via-fuchsia-100/30 to-rose-100/30 dark:from-violet-950/15 dark:via-fuchsia-950/10 dark:to-rose-950/10 border-violet-200/30 dark:border-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-violet-500" />
            <CardTitle className="text-sm">오늘의 브리핑</CardTitle>
          </div>
          <button
            onClick={handleRegenerate}
            disabled={generating}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={`size-3 ${generating ? 'animate-spin' : ''}`} />
            {generating ? '생성 중...' : '새로 생성'}
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Quick stats row */}
        <div className="flex gap-3 flex-wrap">
          {totalActions > 0 && (
            <div className="flex items-center gap-1.5 text-[11px]">
              {SECTION_ICONS.activity}
              <span className="text-foreground/70">오늘 활동 <strong className="text-foreground">{totalActions}</strong>건</span>
            </div>
          )}
          {(briefing?.stats?.completedTasks ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 text-[11px]">
              {SECTION_ICONS.tasks}
              <span className="text-foreground/70">완료 태스크 <strong className="text-foreground">{briefing?.stats?.completedTasks}</strong>건</span>
            </div>
          )}
          {trendHighlights.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px]">
              {SECTION_ICONS.trends}
              <span className="text-foreground/70">급상승 키워드 <strong className="text-foreground">{trendHighlights.length}</strong>개</span>
            </div>
          )}
          {upcomingContent.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px]">
              {SECTION_ICONS.content}
              <span className="text-foreground/70">예정 콘텐츠 <strong className="text-foreground">{upcomingContent.length}</strong>개</span>
            </div>
          )}
        </div>

        {/* Trend highlights */}
        {trendHighlights.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {trendHighlights.map((t) => (
              <span key={t.keyword} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                t.change_rate >= 50 ? 'bg-red-500/15 text-red-600' : 'bg-orange-500/10 text-orange-600'
              }`}>
                {t.keyword} ▲{t.change_rate}%
              </span>
            ))}
          </div>
        )}

        {/* Upcoming content */}
        {upcomingContent.length > 0 && (
          <div className="space-y-1">
            {upcomingContent.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className="text-muted-foreground/60 w-14 shrink-0">{c.date.slice(5)}</span>
                <span className="text-foreground/80 truncate">{c.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* AI Report text */}
        {reportLines.length > 0 ? (
          <>
            <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
              {expanded ? reportLines.join('\n') : previewLines.join('\n')}
              {!expanded && hasMore && '...'}
            </div>
            {hasMore && (
              <button onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline">
                {expanded ? <>접기 <ChevronUp className="size-3" /></> : <>더 보기 <ChevronDown className="size-3" /></>}
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">아직 오늘의 브리핑이 없습니다. 활동이 쌓이면 자동 생성됩니다.</p>
        )}
      </CardContent>
    </Card>
  );
}
