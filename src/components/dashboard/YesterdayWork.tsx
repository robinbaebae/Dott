'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';

interface DailyReport {
  report_date: string;
  report_text: string;
  stats: {
    actionBreakdown?: Record<string, number>;
    agentStats?: Record<string, number>;
    completedTasks?: number;
  };
}

const ACTION_LABELS: Record<string, { label: string; icon: string }> = {
  chat: { label: '대화', icon: '💬' },
  task_created: { label: '태스크 생성', icon: '📝' },
  task_completed: { label: '태스크 완료', icon: '✅' },
  insight_saved: { label: '인사이트', icon: '💡' },
  content_generated: { label: '콘텐츠', icon: '✍️' },
  competitor_added: { label: '경쟁사', icon: '🔍' },
  banner_created: { label: '배너', icon: '🎨' },
};

function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[d.getDay()];
  return `${month}/${day} (${dayName})`;
}

export default function YesterdayWork() {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const date = getYesterdayDate();

    async function fetchReport() {
      try {
        // Try cached report first
        const res = await fetch(`/api/daily-report?date=${date}`);
        if (res.ok) {
          const data = await res.json();
          setReport(data);
          setLoading(false);
          return;
        }

        // No cached report — generate one
        if (res.status === 404) {
          const postRes = await fetch('/api/daily-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date }),
          });
          if (postRes.ok) {
            const data = await postRes.json();
            // Check if report indicates no activity
            if (!data.stats || Object.keys(data.stats).length === 0) {
              setEmpty(true);
            } else {
              setReport(data);
            }
          }
        }
      } catch {
        // silently fail — this is a non-critical UI element
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, []);

  if (loading) {
    return (
      <Card className="w-full animate-pulse">
        <CardContent className="py-6">
          <div className="h-4 bg-muted rounded w-1/3 mb-3" />
          <div className="h-3 bg-muted rounded w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (empty || !report) {
    if (!loading && (empty || !report)) {
      return (
        <Card className="w-full">
          <CardContent className="py-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ClipboardList className="size-4" />
              <span className="text-sm">어제는 기록된 활동이 없습니다</span>
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  const breakdown = report.stats?.actionBreakdown || {};
  const statEntries = Object.entries(breakdown);
  const dateLabel = formatDateLabel(report.report_date);

  // For collapsed text: show first ~3 lines
  const lines = report.report_text.split('\n').filter(Boolean);
  const previewText = lines.slice(0, 3).join('\n');
  const hasMore = lines.length > 3;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-4 text-accent" />
            <CardTitle className="text-sm">어제 작업한 것들</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">{dateLabel}</span>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Action type stats */}
        {statEntries.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {statEntries.map(([action, count]) => {
              const meta = ACTION_LABELS[action];
              return (
                <div
                  key={action}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/50 text-xs"
                >
                  <span>{meta?.icon || '📌'}</span>
                  <span className="text-muted-foreground">{meta?.label || action}</span>
                  <span className="font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* AI summary text */}
        <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
          {expanded ? report.report_text : previewText}
          {!expanded && hasMore && '...'}
        </div>

        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-accent hover:underline"
          >
            {expanded ? (
              <>접기 <ChevronUp className="size-3" /></>
            ) : (
              <>더 보기 <ChevronDown className="size-3" /></>
            )}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
