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
import { ScrollArea } from '@/components/ui/scroll-area';
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
      // Filter tasks with due_date within the week
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

  // Check for ?google=connected param on mount
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
              {/* Legend chips */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                  캘린더
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-700">
                  나의 할일
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
              Google 캘린더를 연결하면 일정을 확인할 수 있어요
            </p>
            <Button asChild>
              <a href="/api/google/auth">Google 캘린더 연결하기</a>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dayEvents = eventsForDay(day);
              const dayTasks = tasksForDay(day);
              const today = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`rounded-lg border p-2 min-h-[160px] ${today ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <div className="text-center mb-1">
                    <p className="text-[10px] text-muted-foreground">
                      {format(day, 'EEE', { locale: ko })}
                    </p>
                    <p
                      className={`text-sm font-medium ${today ? 'text-primary' : ''}`}
                    >
                      {format(day, 'd')}
                    </p>
                  </div>
                  <ScrollArea className="h-[120px]">
                    <div className="space-y-1">
                      {/* Google Calendar events - blue */}
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] leading-tight"
                        >
                          <p className="font-medium truncate text-blue-700">{event.title}</p>
                          {!event.allDay && (
                            <p className="text-blue-600/70">
                              {format(parseISO(event.start), 'HH:mm')}
                            </p>
                          )}
                          {event.allDay && (
                            <p className="text-blue-600/70">종일</p>
                          )}
                        </div>
                      ))}

                      {/* Dotted separator when both exist */}
                      {dayEvents.length > 0 && dayTasks.length > 0 && (
                        <div className="border-t border-dashed border-border my-1" />
                      )}

                      {/* Tasks - green */}
                      {dayTasks.map((task) => (
                        <div
                          key={task.id}
                          className="rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] leading-tight"
                        >
                          <p className="font-medium truncate text-green-700">{task.title}</p>
                          <p className="text-green-600/70">
                            {task.status === 'todo' ? '할 일' : task.status === 'in_progress' ? '진행 중' : '완료'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
