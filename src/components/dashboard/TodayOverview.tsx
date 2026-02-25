'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, CheckCircle2, Circle, Clock, Loader2, AlertTriangle } from 'lucide-react';
import { format, parseISO, isSameDay, isToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { CalendarEvent, Task } from '@/types';

interface TimelineItem {
  id: string;
  type: 'event' | 'task';
  title: string;
  time: string | null; // HH:mm or null for all-day/no-time
  endTime: string | null;
  allDay: boolean;
  status?: Task['status'];
  urgent?: boolean;
  sortKey: number; // for ordering
}

export default function TodayOverview() {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const fetchToday = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    try {
      const [calRes, tasksRes] = await Promise.all([
        fetch(
          `/api/calendar?timeMin=${encodeURIComponent(start.toISOString())}&timeMax=${encodeURIComponent(end.toISOString())}`,
        ),
        fetch('/api/tasks'),
      ]);

      const calData = await calRes.json();
      setConnected(calData.connected);
      const events: CalendarEvent[] = calData.events ?? [];

      const tasksData: Task[] = await tasksRes.json();

      // Build timeline items
      const timeline: TimelineItem[] = [];

      // Calendar events for today
      for (const event of events) {
        const eventStart = parseISO(event.start);
        if (event.allDay || isSameDay(eventStart, now)) {
          timeline.push({
            id: `event-${event.id}`,
            type: 'event',
            title: event.title,
            time: event.allDay ? null : format(eventStart, 'HH:mm'),
            endTime: event.allDay ? null : format(parseISO(event.end), 'HH:mm'),
            allDay: event.allDay,
            sortKey: event.allDay ? -1 : eventStart.getTime(),
          });
        }
      }

      // Tasks: today's due tasks + in_progress + todo (no date)
      for (const task of tasksData) {
        if (task.status === 'done') continue;
        const isDueToday = task.due_date && isSameDay(parseISO(task.due_date), now);
        const isActive = task.status === 'in_progress';
        const isNoDueDate = !task.due_date && task.status === 'todo';

        if (isDueToday || isActive || isNoDueDate) {
          const hasTime = task.due_date?.includes('T');
          const time = hasTime ? format(parseISO(task.due_date!), 'HH:mm') : null;
          timeline.push({
            id: `task-${task.id}`,
            type: 'task',
            title: task.title,
            time,
            endTime: null,
            allDay: false,
            status: task.status,
            urgent: task.urgent && task.important,
            sortKey: hasTime ? parseISO(task.due_date!).getTime() : (isActive ? 0 : Infinity),
          });
        }
      }

      // Sort: all-day first, then by time
      timeline.sort((a, b) => a.sortKey - b.sortKey);
      setItems(timeline);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const todayLabel = format(new Date(), 'M월 d일 EEEE', { locale: ko });

  // Stats
  const eventCount = items.filter((i) => i.type === 'event').length;
  const taskCount = items.filter((i) => i.type === 'task').length;
  const urgentCount = items.filter((i) => i.type === 'task' && i.urgent).length;

  // NOW line position
  const nowKey = Date.now();

  return (
    <Card className="w-full bg-gradient-to-br from-amber-100/50 via-pink-100/40 to-violet-200/50 dark:from-amber-950/10 dark:via-pink-950/8 dark:to-violet-950/12 border-pink-200/30 dark:border-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-violet-500 dark:text-violet-400" />
            <CardTitle className="text-sm">오늘 일정</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">{todayLabel}</span>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {!connected && items.filter(i => i.type === 'event').length === 0 && (
          <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-white/40 dark:bg-white/5">
            <CalendarDays className="size-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              <a href="/api/google/auth" className="text-violet-600 dark:text-violet-400 hover:underline">Google 캘린더 연결</a>하면 일정을 볼 수 있어요
            </span>
          </div>
        )}

        {/* Stats bar */}
        {items.length > 0 && (
          <div className="flex gap-3 mb-3">
            <span className="flex items-center gap-1.5 text-[11px] text-foreground/70">
              <CalendarDays className="size-3 text-violet-500 dark:text-violet-400" />
              미팅 {eventCount}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-foreground/70">
              <CheckCircle2 className="size-3 text-pink-500 dark:text-pink-400" />
              할 일 {taskCount}
            </span>
            {urgentCount > 0 && (
              <span className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                <AlertTriangle className="size-3" />
                긴급 {urgentCount}
              </span>
            )}
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">오늘 예정된 일정이 없습니다</p>
        ) : (
          <div className="relative space-y-0">
            {/* Timeline line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-pink-200/60 dark:bg-violet-700/30" />

            {items.map((item, idx) => {
              // Insert NOW line before the first item whose sortKey > now
              const showNow =
                item.sortKey > 0 &&
                item.sortKey > nowKey &&
                (idx === 0 || items[idx - 1].sortKey <= nowKey);

              return (
                <div key={item.id}>
                  {showNow && (
                    <div className="flex items-center gap-2 py-1 relative">
                      <div className="relative z-10 size-[7px] rounded-full bg-violet-500 dark:bg-violet-400 shrink-0 ml-[4px]" />
                      <div className="flex-1 border-t border-violet-400 dark:border-violet-500" />
                      <span className="text-[10px] text-violet-600 dark:text-violet-400 font-medium shrink-0">NOW</span>
                    </div>
                  )}
                  <div className={`flex items-start gap-3 py-1.5 relative rounded-md ${
                    item.urgent ? 'bg-amber-100/50 dark:bg-amber-900/15 -mx-1 px-1' : ''
                  }`}>
                    {/* Dot */}
                    <div className={`relative z-10 mt-1 size-[15px] rounded-full flex items-center justify-center shrink-0 ${
                      item.type === 'event'
                        ? 'bg-violet-500 dark:bg-violet-400'
                        : item.urgent
                        ? 'bg-amber-500 dark:bg-amber-400'
                        : item.status === 'in_progress'
                        ? 'bg-pink-500 dark:bg-pink-400'
                        : 'bg-pink-200 dark:bg-violet-700'
                    }`}>
                      {item.type === 'task' && item.status === 'in_progress' && (
                        <Clock className="size-2 text-white" />
                      )}
                      {item.urgent && item.type === 'task' && (
                        <AlertTriangle className="size-2 text-white" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm truncate ${
                          item.type === 'event' ? 'text-foreground' : 'text-foreground/80'
                        }`}>
                          {item.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.allDay && (
                          <span className="text-[10px] text-violet-600 dark:text-violet-400">종일</span>
                        )}
                        {item.time && (
                          <span className="text-[10px] text-muted-foreground">
                            {item.time}{item.endTime ? ` – ${item.endTime}` : ''}
                          </span>
                        )}
                        {item.type === 'task' && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            item.urgent
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : item.status === 'in_progress'
                              ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
                              : 'bg-white/50 text-foreground/50 dark:bg-white/5 dark:text-foreground/40'
                          }`}>
                            {item.urgent ? '긴급' : item.status === 'in_progress' ? '진행 중' : '할 일'}
                          </span>
                        )}
                        {item.type === 'event' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                            미팅
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* NOW line at bottom if all items are past */}
            {items.length > 0 && items[items.length - 1].sortKey > 0 && items[items.length - 1].sortKey <= nowKey && (
              <div className="flex items-center gap-2 py-1 relative">
                <div className="relative z-10 size-[7px] rounded-full bg-violet-500 dark:bg-violet-400 shrink-0 ml-[4px]" />
                <div className="flex-1 border-t border-violet-400 dark:border-violet-500" />
                <span className="text-[10px] text-violet-600 dark:text-violet-400 font-medium shrink-0">NOW</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
