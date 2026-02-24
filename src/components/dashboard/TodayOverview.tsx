'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, CheckCircle2, Circle, Clock, Loader2 } from 'lucide-react';
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

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-accent" />
            <CardTitle className="text-sm">오늘 일정</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">{todayLabel}</span>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {!connected && items.filter(i => i.type === 'event').length === 0 && (
          <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-muted/30">
            <CalendarDays className="size-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              <a href="/api/google/auth" className="text-accent hover:underline">Google 캘린더 연결</a>하면 일정을 볼 수 있어요
            </span>
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">오늘 예정된 일정이 없습니다</p>
        ) : (
          <div className="relative space-y-0">
            {/* Timeline line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

            {items.map((item) => (
              <div key={item.id} className="flex items-start gap-3 py-1.5 relative">
                {/* Dot */}
                <div className={`relative z-10 mt-1 size-[15px] rounded-full flex items-center justify-center shrink-0 ${
                  item.type === 'event'
                    ? 'bg-blue-500'
                    : item.status === 'in_progress'
                    ? 'bg-yellow-500'
                    : 'bg-border'
                }`}>
                  {item.type === 'task' && item.status === 'in_progress' && (
                    <Clock className="size-2 text-white" />
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
                      <span className="text-[10px] text-blue-600 dark:text-blue-400">종일</span>
                    )}
                    {item.time && (
                      <span className="text-[10px] text-muted-foreground">
                        {item.time}{item.endTime ? ` – ${item.endTime}` : ''}
                      </span>
                    )}
                    {item.type === 'task' && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        item.status === 'in_progress'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {item.status === 'in_progress' ? '진행 중' : '할 일'}
                      </span>
                    )}
                    {item.type === 'event' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        미팅
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
