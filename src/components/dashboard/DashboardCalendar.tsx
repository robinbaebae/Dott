'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  addMonths,
  addDays,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  eachDayOfInterval,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, Unplug } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { CalendarEvent, Task } from '@/types';

type CalendarView = 'month' | 'week' | 'day';

export default function DashboardCalendar({ compact = false }: { compact?: boolean }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('week');
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const getRange = useCallback(() => {
    switch (view) {
      case 'month':
        return {
          start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
          end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
        };
      case 'week':
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 }),
        };
      case 'day':
        return {
          start: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()),
          end: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59),
        };
    }
  }, [currentDate, view]);

  const range = getRange();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const [calRes, tasksRes] = await Promise.all([
        fetch(
          `/api/calendar?timeMin=${encodeURIComponent(range.start.toISOString())}&timeMax=${encodeURIComponent(range.end.toISOString())}`,
        ),
        fetch('/api/tasks'),
      ]);

      const calData = await calRes.json();
      setConnected(calData.connected);
      setEvents(calData.events ?? []);

      const tasksData: Task[] = await tasksRes.json();
      const rangeTasks = tasksData.filter((t) => {
        if (!t.due_date) return false;
        const d = parseISO(t.due_date);
        return d >= range.start && d <= range.end;
      });
      setTasks(rangeTasks);
    } catch {
      setEvents([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [range.start.toISOString(), range.end.toISOString()]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google') === 'connected') {
      window.history.replaceState({}, '', '/');
      fetchEvents();
    }
  }, []);

  const goToday = () => setCurrentDate(new Date());
  const goPrev = () => {
    if (view === 'month') setCurrentDate((d) => addMonths(d, -1));
    else if (view === 'week') setCurrentDate((d) => addWeeks(d, -1));
    else setCurrentDate((d) => addDays(d, -1));
  };
  const goNext = () => {
    if (view === 'month') setCurrentDate((d) => addMonths(d, 1));
    else if (view === 'week') setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  };

  const eventsForDay = (day: Date) =>
    events.filter((e) => {
      const start = parseISO(e.start);
      if (e.allDay) {
        const end = parseISO(e.end);
        return day >= start && day < end;
      }
      return isSameDay(start, day);
    });

  const tasksForDay = (day: Date) =>
    tasks.filter((t) => {
      if (!t.due_date) return false;
      return isSameDay(parseISO(t.due_date), day);
    });

  const handleDisconnect = async () => {
    await fetch('/api/calendar', { method: 'DELETE' });
    setConnected(false);
    setEvents([]);
  };

  const headerLabel = () => {
    if (view === 'month') return format(currentDate, 'yyyy년 M월', { locale: ko });
    if (view === 'day') return format(currentDate, 'yyyy년 M월 d일 EEEE', { locale: ko });
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
    const we = endOfWeek(currentDate, { weekStartsOn: 1 });
    return `${format(ws, 'yyyy년 M월 d일', { locale: ko })} — ${format(we, 'M월 d일', { locale: ko })}`;
  };

  const days = view === 'month'
    ? eachDayOfInterval({ start: range.start, end: range.end })
    : view === 'week'
    ? Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek(currentDate, { weekStartsOn: 1 }));
        d.setDate(d.getDate() + i);
        return d;
      })
    : [currentDate];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="size-4" />
                캘린더
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 dark:bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                  캘린더
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-pink-500/10 dark:bg-pink-500/20 px-2 py-0.5 text-[10px] font-medium text-pink-700 dark:text-pink-300">
                  내 태스크
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{headerLabel()}</p>
          </div>
          <div className="flex items-center gap-1">
            {/* View toggle */}
            <div className="flex items-center border border-border rounded-lg overflow-hidden mr-2">
              {(['month', 'week', 'day'] as CalendarView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-2.5 py-1 text-[10px] capitalize transition-colors ${
                    view === v
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {v === 'month' ? '월' : v === 'week' ? '주' : '일'}
                </button>
              ))}
            </div>
            {connected && (
              <Button variant="ghost" size="icon-xs" onClick={handleDisconnect} title="연결 해제">
                <Unplug className="size-3" />
              </Button>
            )}
            <Button variant="ghost" size="icon-xs" onClick={goPrev}>
              <ChevronLeft className="size-3" />
            </Button>
            <Button variant="ghost" size="xs" onClick={goToday}>
              오늘
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={goNext}>
              <ChevronRight className="size-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!connected && !loading ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CalendarDays className="size-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Google 캘린더를 연결하여 일정을 확인하세요
            </p>
            <Button asChild>
              <a href="/api/google/auth">Google 캘린더 연결</a>
            </Button>
          </div>
        ) : view === 'month' ? (
          <MonthView days={days} currentDate={currentDate} eventsForDay={eventsForDay} tasksForDay={tasksForDay} compact={compact} />
        ) : (
          <TimelineView days={days} eventsForDay={eventsForDay} tasksForDay={tasksForDay} compact={compact} />
        )}
      </CardContent>
    </Card>
  );
}

/* ---- Month grid view ---- */
function MonthView({
  days,
  currentDate,
  eventsForDay,
  tasksForDay,
  compact = false,
}: {
  days: Date[];
  currentDate: Date;
  eventsForDay: (d: Date) => CalendarEvent[];
  tasksForDay: (d: Date) => Task[];
  compact?: boolean;
}) {
  return (
    <div>
      {/* Day of week header */}
      <div className="grid grid-cols-7 mb-1">
        {['월', '화', '수', '목', '금', '토', '일'].map((d) => (
          <div key={d} className="text-center text-[10px] text-muted-foreground uppercase py-1">
            {d}
          </div>
        ))}
      </div>
      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = eventsForDay(day);
          const dayTasks = tasksForDay(day);
          const today = isToday(day);
          const inMonth = isSameMonth(day, currentDate);

          return (
            <div
              key={day.toISOString()}
              className={`${compact ? 'min-h-[44px]' : 'min-h-[60px]'} border-t border-border p-1 ${
                !inMonth ? 'opacity-30' : ''
              }`}
            >
              <p
                className={`text-xs text-center mb-0.5 ${
                  today
                    ? 'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center mx-auto'
                    : 'text-muted-foreground'
                }`}
              >
                {format(day, 'd')}
              </p>
              <div className="space-y-0.5">
                {dayEvents.slice(0, compact ? 1 : 2).map((e) => (
                  <div key={e.id} className="text-[9px] truncate rounded px-1 bg-violet-500/10 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300">
                    {!e.allDay && <span className="text-violet-600/70 dark:text-violet-400/80">{format(parseISO(e.start), 'HH:mm')} </span>}
                    {e.title}
                  </div>
                ))}
                {dayTasks.slice(0, compact ? 1 : 2).map((t) => (
                  <div key={t.id} className="text-[9px] truncate rounded px-1 bg-green-500/10 dark:bg-green-500/20 text-pink-700 dark:text-pink-300">
                    {t.title}
                  </div>
                ))}
                {dayEvents.length + dayTasks.length > 2 && (
                  <p className="text-[8px] text-muted-foreground text-center">
                    +{dayEvents.length + dayTasks.length - 2} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Week/Day timeline view (reuses old WeeklyCalendar layout) ---- */
function TimelineView({
  days,
  eventsForDay,
  tasksForDay,
  compact = false,
}: {
  days: Date[];
  eventsForDay: (d: Date) => CalendarEvent[];
  tasksForDay: (d: Date) => Task[];
  compact?: boolean;
}) {
  return (
    <div className="space-y-0">
      {days.map((day) => {
        const dayEvents = eventsForDay(day);
        const dayTasks = tasksForDay(day);
        const today = isToday(day);
        const hasItems = dayEvents.length > 0 || dayTasks.length > 0;

        return (
          <div
            key={day.toISOString()}
            className={`flex gap-3 ${compact ? 'py-1.5' : 'py-2.5'} border-b border-border last:border-b-0 ${
              today ? 'bg-primary/5 -mx-6 px-6 rounded-lg' : ''
            }`}
          >
            <div className={`${compact ? 'w-10' : 'w-14'} shrink-0 text-center pt-0.5`}>
              <p className="text-[10px] text-muted-foreground uppercase">
                {format(day, 'EEE', { locale: ko })}
              </p>
              <p className={`${compact ? 'text-base' : 'text-lg'} font-semibold leading-tight ${today ? 'text-primary' : ''}`}>
                {format(day, 'd')}
              </p>
            </div>

            <div className="flex-1 relative">
              {hasItems && (
                <div className="absolute left-0 top-1 bottom-1 w-px bg-border" />
              )}
              {!hasItems && (
                <p className="text-xs text-muted-foreground py-1 pl-4">일정 없음</p>
              )}
              <div className="space-y-1.5 pl-4">
                {dayEvents.map((event) => (
                  <div key={event.id} className="relative flex items-start gap-2">
                    <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-violet-500 -translate-x-[3px]" />
                    <div className="flex-1 rounded-md bg-violet-500/10 dark:bg-violet-500/20 px-2.5 py-1.5">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-violet-700 dark:text-violet-300 truncate">
                          {event.title}
                        </p>
                        <span className="text-[10px] text-violet-600/70 dark:text-violet-400/80 shrink-0">
                          {event.allDay
                            ? '종일'
                            : `${format(parseISO(event.start), 'HH:mm')}–${format(parseISO(event.end), 'HH:mm')}`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {dayTasks.map((task) => {
                  const hasTime = task.due_date?.includes('T');
                  const timeStr = hasTime
                    ? new Date(task.due_date!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
                    : null;
                  return (
                    <div key={task.id} className="relative flex items-start gap-2">
                      <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-pink-500 -translate-x-[3px]" />
                      <div className="flex-1 rounded-md bg-pink-500/10 dark:bg-pink-500/20 px-2.5 py-1.5">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-pink-700 dark:text-pink-300 truncate">
                            {task.title}
                          </p>
                          <span className="text-[10px] text-pink-600/70 dark:text-pink-400/80 shrink-0">
                            {timeStr ?? (task.status === 'todo'
                              ? '할 일'
                              : task.status === 'in_progress'
                              ? '진행 중'
                              : task.status === 'on_hold'
                              ? '보류'
                              : '완료')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
