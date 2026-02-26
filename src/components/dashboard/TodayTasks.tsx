'use client';

import { useState, useEffect, useCallback, useRef, KeyboardEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListTodo, Clock, Loader2, Plus, X, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { isSameDay, parseISO, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, addDays, isToday as checkIsToday } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Task } from '@/types';

/* ─── Mini DateTimePicker popover ─── */
function DateTimePicker({
  initial,
  onConfirm,
  onClear,
  onClose,
}: {
  initial: Date | null;
  onConfirm: (d: Date) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [month, setMonth] = useState(() => initial || new Date());
  const [selected, setSelected] = useState<Date | null>(initial ?? new Date());
  const [hour, setHour] = useState(() => (initial ? initial.getHours() : new Date().getHours()));
  const [minute, setMinute] = useState(() => (initial ? initial.getMinutes() : 0));
  const ref = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Build calendar grid
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days: Date[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }

  const handleConfirm = () => {
    if (!selected) return;
    const d = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), hour, minute);
    onConfirm(d);
  };

  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 z-50 glass-float rounded-xl p-3 w-[260px] animate-in fade-in zoom-in-95 duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Month nav */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setMonth((m) => addMonths(m, -1))} className="p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer">
          <ChevronLeft className="size-3.5 text-muted-foreground" />
        </button>
        <span className="text-xs font-medium text-foreground">
          {format(month, 'yyyy년 M월', { locale: ko })}
        </span>
        <button onClick={() => setMonth((m) => addMonths(m, 1))} className="p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer">
          <ChevronRight className="size-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-1">
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
          <div key={d} className="text-center text-[10px] text-muted-foreground/60 py-0.5">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const inMonth = day.getMonth() === month.getMonth();
          const isSelected = selected && isSameDay(day, selected);
          const isToday = checkIsToday(day);
          return (
            <button
              key={i}
              onClick={() => setSelected(day)}
              className={`size-8 rounded-lg text-[11px] flex items-center justify-center transition-all cursor-pointer
                ${!inMonth ? 'text-muted-foreground/25' : 'text-foreground'}
                ${isSelected ? 'bg-accent text-accent-foreground font-semibold' : 'hover:bg-muted'}
                ${isToday && !isSelected ? 'ring-1 ring-accent/40 font-medium' : ''}
              `}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      {/* Time selector */}
      <div className="mt-2 pt-2 border-t border-border">
        <div className="flex items-center gap-2 justify-center">
          <Clock className="size-3 text-muted-foreground/60" />
          {/* Hour */}
          <select
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="bg-muted/50 rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent/40 appearance-none text-center w-12 cursor-pointer"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">:</span>
          {/* Minute */}
          <select
            value={minute}
            onChange={(e) => setMinute(Number(e.target.value))}
            className="bg-muted/50 rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent/40 appearance-none text-center w-12 cursor-pointer"
          >
            {MINUTES.map((m) => (
              <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-2 flex items-center gap-2">
        {initial && (
          <button
            onClick={onClear}
            className="flex-1 text-[11px] py-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            삭제
          </button>
        )}
        <button
          onClick={handleConfirm}
          disabled={!selected}
          className="flex-1 text-[11px] py-1.5 rounded-lg bg-accent text-accent-foreground font-medium hover:bg-accent/90 disabled:opacity-30 transition-colors cursor-pointer"
        >
          확인
        </button>
      </div>
    </div>
  );
}

/* ─── Format due date for display ─── */
function formatDue(due: string): string {
  const d = parseISO(due);
  const now = new Date();
  const hasTime = due.includes('T');
  const time = hasTime ? format(d, 'HH:mm') : '';

  if (isSameDay(d, now)) return time || '오늘';
  // Check tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(d, tomorrow)) return time ? `내일 ${time}` : '내일';

  // Same year → M/d, different year → yy.M.d
  const dateStr = d.getFullYear() === now.getFullYear()
    ? format(d, 'M/d', { locale: ko })
    : format(d, 'yy.M.d');
  return time ? `${dateStr} ${time}` : dateStr;
}

/* ─── Main Component ─── */
export default function TodayTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [pickerTaskId, setPickerTaskId] = useState<string | null>(null);

  const sortTasks = (list: Task[]) =>
    [...list].sort((a, b) => {
      if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
      if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
      const aTime = a.due_date ? parseISO(a.due_date).getTime() : Infinity;
      const bTime = b.due_date ? parseISO(b.due_date).getTime() : Infinity;
      return aTime - bTime;
    });

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      const data: Task[] = await res.json();
      const filtered = data.filter((t) => t.status !== 'done');
      setTasks(sortTasks(filtered));
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleAdd = async () => {
    const title = input.trim();
    if (!title || adding) return;
    setAdding(true);
    setInput('');
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, status: 'todo' }),
      });
      if (res.ok) {
        const newTask: Task = await res.json();
        setTasks((prev) => sortTasks([...prev, newTask]));
      }
    } catch {
      // silent
    } finally {
      setAdding(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const toggleDone = async (task: Task) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, status: 'done' }),
      });
    } catch {
      setTasks((prev) => sortTasks([...prev, task]));
    }
  };

  const setTaskDueDate = async (task: Task, date: Date) => {
    const due_date = date.toISOString();
    setTasks((prev) => sortTasks(prev.map((t) => (t.id === task.id ? { ...t, due_date } : t))));
    setPickerTaskId(null);
    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, due_date }),
      });
    } catch {
      setTasks((prev) => sortTasks(prev.map((t) => (t.id === task.id ? task : t))));
    }
  };

  const clearTaskDueDate = async (task: Task) => {
    setTasks((prev) => sortTasks(prev.map((t) => (t.id === task.id ? { ...t, due_date: null } : t))));
    setPickerTaskId(null);
    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, due_date: null }),
      });
    } catch {
      setTasks((prev) => sortTasks(prev.map((t) => (t.id === task.id ? task : t))));
    }
  };

  const activeCount = tasks.length;

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="size-4 text-pink-500 dark:text-pink-400" />
            <CardTitle className="text-sm">할일</CardTitle>
          </div>
          {activeCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/15 text-pink-500 dark:text-pink-400 font-medium">
              {activeCount}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Quick-add */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="할 일 추가..."
            className="flex-1 min-w-0 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent transition-colors"
          />
          <button
            onClick={handleAdd}
            disabled={!input.trim() || adding}
            className="p-1.5 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 disabled:opacity-30 transition-colors cursor-pointer shrink-0"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        {/* Task list */}
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">할 일을 추가해보세요</p>
        ) : (
          <div className="relative space-y-0">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-pink-300/40 via-blue-300/30 to-orange-300/30 dark:from-pink-700/30 dark:via-blue-700/20 dark:to-orange-700/20" />

            {tasks.map((task) => {
              const hasDue = !!task.due_date;
              const isPickerOpen = pickerTaskId === task.id;

              return (
                <div key={task.id} className="flex items-start gap-3 py-1.5 relative">
                  {/* Dot */}
                  <button
                    onClick={() => toggleDone(task)}
                    className={`relative z-10 mt-1 size-[15px] rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-colors hover:ring-2 hover:ring-accent/30 ${
                      task.status === 'in_progress'
                        ? 'bg-yellow-500'
                        : 'bg-border hover:bg-accent/50'
                    }`}
                    title="완료 처리"
                  >
                    {task.status === 'in_progress' && (
                      <Clock className="size-2 text-white" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0 relative">
                    <span className="text-sm truncate block text-foreground/80">
                      {task.title}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      {/* Date chip / add-date button */}
                      {hasDue ? (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => setPickerTaskId(isPickerOpen ? null : task.id)}
                            className="flex items-center gap-1 rounded-full bg-accent/10 hover:bg-accent/20 pl-1.5 pr-2 py-0.5 transition-colors cursor-pointer"
                          >
                            <CalendarDays className="size-2.5 text-accent" />
                            <span className="text-[11px] font-medium text-accent">
                              {formatDue(task.due_date!)}
                            </span>
                          </button>
                          <button
                            onClick={() => clearTaskDueDate(task)}
                            className="p-0.5 rounded-full hover:bg-muted/80 text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer"
                          >
                            <X className="size-2.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setPickerTaskId(isPickerOpen ? null : task.id)}
                          className="flex items-center gap-1 rounded-full border border-dashed border-border hover:border-accent/40 hover:bg-accent/5 px-2 py-0.5 transition-all cursor-pointer group"
                        >
                          <CalendarDays className="size-2.5 text-muted-foreground/40 group-hover:text-accent/60" />
                          <span className="text-[10px] text-muted-foreground/40 group-hover:text-accent/60">날짜</span>
                        </button>
                      )}

                      {/* Status badge */}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        task.status === 'in_progress'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {task.status === 'in_progress' ? '진행 중' : '할 일'}
                      </span>
                    </div>

                    {/* Calendar picker popover */}
                    {isPickerOpen && (
                      <DateTimePicker
                        initial={task.due_date ? parseISO(task.due_date) : null}
                        onConfirm={(d) => setTaskDueDate(task, d)}
                        onClear={() => clearTaskDueDate(task)}
                        onClose={() => setPickerTaskId(null)}
                      />
                    )}
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
