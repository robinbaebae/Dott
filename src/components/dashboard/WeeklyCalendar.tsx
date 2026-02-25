'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  format,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, Unplug } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { CalendarEvent, Task } from '@/types';

export default function WeeklyCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const timeMin = weekStart.toISOString();
      const timeMax = weekEnd.toISOString();

      const [calRes, tasksRes] = await Promise.all([
        fetch(
          `/api/calendar?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
        ),
        fetch('/api/tasks'),
      ]);

      const calData = await calRes.json();
      setConnected(calData.connected);
      setEvents(calData.events ?? []);

      const tasksData: Task[] = await tasksRes.json();
      const weekTasks = tasksData.filter((t) => {
        if (!t.due_date) return false;
        const d = parseISO(t.due_date);
        return d >= weekStart && d <= weekEnd;
      });
      setTasks(weekTasks);
    } catch {
      setEvents([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [weekStart.toISOString(), weekEnd.toISOString()]);

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
  const goPrev = () => setCurrentDate((d) => addWeeks(d, -1));
  const goNext = () => setCurrentDate((d) => addWeeks(d, 1));

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

  const dateRange = `${format(weekStart, 'yyyy년 M월 d일', { locale: ko })} — ${format(weekEnd, 'M월 d일', { locale: ko })}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="size-4" />
                주간 캘린더
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-300">
                  캘린더
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-pink-500/10 px-2 py-0.5 text-[10px] font-medium text-pink-700 dark:text-pink-300">
                  내 태스크
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{dateRange}</p>
          </div>
          <div className="flex items-center gap-1">
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
        ) : (
          <div className="space-y-0">
            {days.map((day) => {
              const dayEvents = eventsForDay(day);
              const dayTasks = tasksForDay(day);
              const today = isToday(day);
              const hasItems = dayEvents.length > 0 || dayTasks.length > 0;

              return (
                <div
                  key={day.toISOString()}
                  className={`flex gap-4 py-2.5 border-b border-border last:border-b-0 ${
                    today ? 'bg-primary/5 -mx-6 px-6 rounded-lg' : ''
                  }`}
                >
                  {/* Date column */}
                  <div className="w-14 shrink-0 text-center pt-0.5">
                    <p className="text-[10px] text-muted-foreground uppercase">
                      {format(day, 'EEE', { locale: ko })}
                    </p>
                    <p
                      className={`text-lg font-semibold leading-tight ${
                        today ? 'text-primary' : ''
                      }`}
                    >
                      {format(day, 'd')}
                    </p>
                  </div>

                  {/* Timeline line + items */}
                  <div className="flex-1 relative">
                    {hasItems && (
                      <div className="absolute left-0 top-1 bottom-1 w-px bg-border" />
                    )}

                    {!hasItems && (
                      <p className="text-xs text-muted-foreground py-1 pl-4">일정 없음</p>
                    )}

                    <div className="space-y-1.5 pl-4">
                      {/* Google Calendar events */}
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className="relative flex items-start gap-2"
                        >
                          <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-violet-500 -translate-x-[3px]" />
                          <div className="flex-1 rounded-md bg-violet-500/10 px-2.5 py-1.5">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-medium text-violet-700 truncate">
                                {event.title}
                              </p>
                              <span className="text-[10px] text-violet-600/70 shrink-0">
                                {event.allDay
                                  ? '종일'
                                  : format(parseISO(event.start), 'HH:mm')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Tasks */}
                      {dayTasks.map((task) => (
                        <div
                          key={task.id}
                          className="relative flex items-start gap-2"
                        >
                          <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full bg-pink-500 -translate-x-[3px]" />
                          <div className="flex-1 rounded-md bg-pink-500/10 px-2.5 py-1.5">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-medium text-pink-700 truncate">
                                {task.title}
                              </p>
                              <span className="text-[10px] text-pink-600/70 shrink-0">
                                {task.status === 'todo'
                                  ? '할 일'
                                  : task.status === 'in_progress'
                                  ? '진행 중'
                                  : '완료'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
