'use client';

import { useState, useEffect, useMemo } from 'react';
import { Flame, Activity } from 'lucide-react';

interface HeatmapDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface HeatmapData {
  days: HeatmapDay[];
  streak: number;
  longestStreak: number;
  totalThisMonth: number;
  todayCount: number;
}

const LEVEL_COLORS = [
  'bg-muted/30 dark:bg-muted/20',
  'bg-[#9B82A8]/30 dark:bg-[#9B82A8]/25',
  'bg-[#9B82A8]/60 dark:bg-[#9B82A8]/50',
  'bg-[#7B5B8B]/80 dark:bg-[#7B5B8B]/70',
  'bg-[#5B4D6E] dark:bg-[#9B82A8]',
];

const MONTH_LABELS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const DAY_LABELS = ['월','','수','','금','',''];

export default function ActivityHeatmap() {
  const [data, setData] = useState<HeatmapData | null>(null);

  useEffect(() => {
    fetch('/api/activity-heatmap')
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {});

    // Refetch on tab focus
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetch('/api/activity-heatmap')
          .then((r) => (r.ok ? r.json() : null))
          .then(setData)
          .catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Organize days into weeks (columns)
  const { weeks, monthMarkers } = useMemo(() => {
    if (!data?.days?.length) return { weeks: [], monthMarkers: [] };

    // Group into weeks (7-day columns, Mon=0 .. Sun=6)
    const cols: HeatmapDay[][] = [];
    let col: HeatmapDay[] = [];

    for (let i = 0; i < data.days.length; i++) {
      const d = new Date(data.days[i].date);
      const dow = (d.getDay() + 6) % 7; // Mon=0

      if (i === 0 && dow > 0) {
        // Pad first week
        for (let p = 0; p < dow; p++) col.push({ date: '', count: -1, level: 0 });
      }

      col.push(data.days[i]);

      if (col.length === 7) {
        cols.push(col);
        col = [];
      }
    }
    if (col.length > 0) {
      while (col.length < 7) col.push({ date: '', count: -1, level: 0 });
      cols.push(col);
    }

    // Month markers
    const markers: { col: number; label: string }[] = [];
    let lastMonth = -1;
    for (let c = 0; c < cols.length; c++) {
      const firstReal = cols[c].find((d) => d.date);
      if (firstReal?.date) {
        const month = parseInt(firstReal.date.slice(5, 7), 10) - 1;
        if (month !== lastMonth) {
          markers.push({ col: c, label: MONTH_LABELS[month] });
          lastMonth = month;
        }
      }
    }

    return { weeks: cols, monthMarkers: markers };
  }, [data]);

  if (!data) return null;

  return (
    <div className="glass-card rounded-2xl p-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">활동 히트맵</span>
        </div>
        {data.streak > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/10 text-accent">
            <Flame className="size-3.5" />
            <span className="text-xs font-semibold">{data.streak}일 연속</span>
          </div>
        )}
      </div>

      {/* Heatmap Grid */}
      <div className="flex gap-0.5 overflow-hidden">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 mr-1 pt-4">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="h-[10px] flex items-center">
              <span className="text-[9px] text-muted-foreground w-3">{label}</span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 min-w-0">
          {/* Month labels */}
          <div className="flex gap-0.5 mb-0.5 h-3">
            {weeks.map((_, colIdx) => {
              const marker = monthMarkers.find((m) => m.col === colIdx);
              return (
                <div key={colIdx} className="flex-1 min-w-[10px]">
                  {marker && (
                    <span className="text-[9px] text-muted-foreground">{marker.label}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Cells - row by row (Mon first) */}
          {Array.from({ length: 7 }).map((_, rowIdx) => (
            <div key={rowIdx} className="flex gap-0.5 mb-0.5">
              {weeks.map((week, colIdx) => {
                const cell = week[rowIdx];
                if (!cell || cell.count < 0) {
                  return <div key={colIdx} className="flex-1 min-w-[10px] h-[10px]" />;
                }
                return (
                  <div
                    key={colIdx}
                    className={`flex-1 min-w-[10px] h-[10px] rounded-[2px] ${LEVEL_COLORS[cell.level]} heatmap-cell`}
                    title={`${cell.date}: ${cell.count}건 활동`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mt-3 text-[11px] text-muted-foreground">
        <span>이번 달 총 {data.totalThisMonth}건</span>
        <div className="flex items-center gap-1">
          <span>최장 {data.longestStreak}일 연속</span>
          <span className="mx-1.5">·</span>
          <span>오늘 {data.todayCount}건</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-1.5">
        <span className="text-[9px] text-muted-foreground mr-0.5">적음</span>
        {LEVEL_COLORS.map((cls, i) => (
          <div key={i} className={`w-[10px] h-[10px] rounded-[2px] ${cls}`} />
        ))}
        <span className="text-[9px] text-muted-foreground ml-0.5">많음</span>
      </div>
    </div>
  );
}
