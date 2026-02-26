'use client';

import { useState, useEffect, useCallback, useMemo, DragEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock,
  Calendar,
  GripVertical,
  MessageSquare,
  X,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  parseISO,
  differenceInCalendarDays,
} from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Task } from '@/types';

// ─── Constants ───

const STATUS_DOT: Record<string, string> = {
  todo: 'bg-gray-400',
  in_progress: 'bg-blue-500',
  done: 'bg-green-500',
};

const EVENT_COLORS = [
  'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
];

function getPriority(task: Task): '높음' | '보통' | '낮음' {
  if (task.urgent && task.important) return '높음';
  if (task.urgent || task.important) return '보통';
  return '낮음';
}

function getEventColor(index: number) {
  return EVENT_COLORS[index % EVENT_COLORS.length];
}

// ─── Main Page ───

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newDueTime, setNewDueTime] = useState('');
  const [newUrgent, setNewUrgent] = useState(false);
  const [newImportant, setNewImportant] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTargetDay, setDropTargetDay] = useState<number | null>(null);
  const [memoTaskId, setMemoTaskId] = useState<string | null>(null);
  const [memoText, setMemoText] = useState('');
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) setTasks(await res.json());
    } catch {
      toast.error('태스크를 불러오지 못했습니다');
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // Scroll timeline to today on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      const todayEl = document.querySelector('[data-today="true"]');
      if (todayEl) {
        const container = document.getElementById('task-timeline');
        if (container) {
          const elTop = (todayEl as HTMLElement).offsetTop;
          container.scrollTop = Math.max(0, elTop - 200);
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [currentMonth]);

  const createTask = async () => {
    if (!newTitle.trim()) return;
    let dueDate: string | null = null;
    if (newDueDate) {
      dueDate = newDueTime ? `${newDueDate}T${newDueTime}:00` : newDueDate;
    }
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription || null,
          due_date: dueDate,
          urgent: newUrgent,
          important: newImportant,
          status: 'todo',
        }),
      });
      toast.success('태스크가 추가되었습니다');
      setNewTitle('');
      setNewDescription('');
      setNewDueDate(new Date().toISOString().slice(0, 10));
      setNewDueTime('');
      setNewUrgent(false);
      setNewImportant(false);
      setDialogOpen(false);
      loadTasks();
    } catch {
      toast.error('태스크 생성에 실패했습니다');
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, ...updates }),
      });
      loadTasks();
    } catch {
      toast.error('업데이트 실패');
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' });
      loadTasks();
    } catch {
      toast.error('삭제 실패');
    }
  };

  // ─── Drag & Drop ───

  const handleDragStart = (e: DragEvent, taskId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDropTargetDay(null);
  };

  const handleDayDragOver = (e: DragEvent, day: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetDay(day);
  };

  const handleDayDrop = (e: DragEvent, day: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    const dateStr = `${currentYear}-${String(currentMonthNum + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    updateTask(taskId, { due_date: dateStr });
    setDraggedTaskId(null);
    setDropTargetDay(null);
    toast.success('일정이 이동되었습니다');
  };

  // ─── Memo ───

  const openMemo = (task: Task) => {
    setMemoTaskId(task.id);
    setMemoText(task.description || '');
  };

  const saveMemo = () => {
    if (memoTaskId) {
      updateTask(memoTaskId, { description: memoText || null });
      setMemoTaskId(null);
      setMemoText('');
      toast.success('메모가 저장되었습니다');
    }
  };

  // ─── Derived data ───

  const currentMonthNum = currentMonth.getMonth();
  const currentYear = currentMonth.getFullYear();

  const daysInMonth = useMemo(() => {
    const lastDay = new Date(currentYear, currentMonthNum + 1, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => i + 1);
  }, [currentYear, currentMonthNum]);

  const filteredTasks = useMemo(() => {
    if (!statusFilter) return tasks;
    return tasks.filter((t) => t.status === statusFilter);
  }, [tasks, statusFilter]);

  const tasksByDay = useMemo(() => {
    const map: Record<number, Task[]> = {};
    for (const task of filteredTasks) {
      if (!task.due_date) continue;
      const d = parseISO(task.due_date);
      if (d.getMonth() === currentMonthNum && d.getFullYear() === currentYear) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(task);
      }
    }
    return map;
  }, [filteredTasks, currentMonthNum, currentYear]);

  const unscheduledTasks = useMemo(
    () => filteredTasks.filter((t) => !t.due_date),
    [filteredTasks]
  );

  const upcomingTasks = useMemo(() => {
    const now = new Date();
    return tasks
      .filter((t) => {
        if (t.status === 'done' || !t.due_date) return false;
        const d = parseISO(t.due_date);
        const diff = differenceInCalendarDays(d, now);
        return diff >= 0 && diff <= 14;
      })
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  }, [tasks]);

  const tasksOnDate = useCallback(
    (date: Date) => tasks.filter((t) => t.due_date && isSameDay(parseISO(t.due_date), date)),
    [tasks]
  );

  const todoCount = tasks.filter((t) => t.status === 'todo').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;

  return (
    <div className="max-w-6xl mx-auto px-6 pt-2 pb-12 space-y-4 animate-in fade-in duration-500">
      {/* Controls */}
      <div className="flex items-center justify-end gap-2">
          {statusFilter && (
            <button
              onClick={() => setStatusFilter(null)}
              className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors"
            >
              Clear
            </button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                <Plus className="size-3.5" />
                새 태스크
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 태스크 추가</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <Input
                  placeholder="태스크 제목"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createTask()}
                />
                <Textarea
                  placeholder="설명 / 메모 (선택사항)"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">날짜</label>
                    <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">시간</label>
                    <Input type="time" value={newDueTime} onChange={(e) => setNewDueTime(e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <button
                      type="button"
                      onClick={() => setNewUrgent(!newUrgent)}
                      className={`w-10 h-5 rounded-full transition-colors ${newUrgent ? 'bg-red-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${newUrgent ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                    <span className="text-sm">긴급</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <button
                      type="button"
                      onClick={() => setNewImportant(!newImportant)}
                      className={`w-10 h-5 rounded-full transition-colors ${newImportant ? 'bg-yellow-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${newImportant ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                    <span className="text-sm">중요</span>
                  </label>
                </div>
                <Button onClick={createTask} className="w-full">추가</Button>
              </div>
            </DialogContent>
          </Dialog>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          {/* Month selector — compact dropdown style */}
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, -1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ChevronLeft className="size-4 text-muted-foreground" />
            </button>
            <div className="relative">
              <button
                onClick={() => setMonthPickerOpen(!monthPickerOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-sm font-medium"
              >
                {format(currentMonth, 'yyyy년 M월', { locale: ko })}
                <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${monthPickerOpen ? 'rotate-180' : ''}`} />
              </button>
              {monthPickerOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMonthPickerOpen(false)} />
                  <div className="absolute top-full left-0 mt-1 z-50 glass-float rounded-xl p-2 grid grid-cols-3 gap-1 w-[200px]">
                    {Array.from({ length: 12 }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setCurrentMonth(new Date(currentYear, i, 1));
                          setMonthPickerOpen(false);
                        }}
                        className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          currentMonthNum === i
                            ? 'bg-foreground text-background'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        {format(new Date(currentYear, i, 1), 'MMM', { locale: ko })}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="ml-1 px-2.5 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              오늘
            </button>
          </div>

          {/* Unscheduled tasks — draggable */}
          {unscheduledTasks.length > 0 && (
            <div className="border rounded-xl overflow-hidden mb-4">
              <div className="px-4 py-3">
                <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-2">
                  Unscheduled
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{unscheduledTasks.length}</span>
                  <span className="text-[10px] text-muted-foreground/50 ml-1">드래그하여 날짜에 배치</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {unscheduledTasks.map((task, idx) => {
                    const isDone = task.status === 'done';
                    const isDragging = draggedTaskId === task.id;
                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        className={`group/task flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium cursor-grab active:cursor-grabbing transition-all ${getEventColor(idx + 3)} ${
                          isDone ? 'opacity-50 line-through' : ''
                        } ${isDragging ? 'opacity-30 scale-95' : ''}`}
                      >
                        <GripVertical className="size-3 text-current opacity-30 shrink-0" />
                        <div className={`size-1.5 rounded-full shrink-0 ${STATUS_DOT[task.status]}`} />
                        <span className="truncate max-w-[160px]">{task.title}</span>
                        <div className="hidden group-hover/task:flex items-center gap-0.5 ml-1">
                          <button onClick={() => openMemo(task)} className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10" title="메모">
                            <MessageSquare className="size-3" />
                          </button>
                          <button onClick={() => updateTask(task.id, { status: isDone ? 'todo' : 'done' })} className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10">
                            <Check className="size-3" />
                          </button>
                          <button onClick={() => deleteTask(task.id)} className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10">
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Day rows — scrollable timeline */}
          <div className="border rounded-xl overflow-hidden">
            <div className="max-h-[520px] overflow-y-auto" id="task-timeline">
              {daysInMonth.map((day) => {
                const dayTasks = (tasksByDay[day] || []).sort((a, b) => {
                  const aTime = a.due_date?.includes('T') ? new Date(a.due_date).getTime() : Infinity;
                  const bTime = b.due_date?.includes('T') ? new Date(b.due_date).getTime() : Infinity;
                  return aTime - bTime;
                });
                const date = new Date(currentYear, currentMonthNum, day);
                const today = isToday(date);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const dayOfWeek = format(date, 'EEE', { locale: ko });
                const isDropTarget = dropTargetDay === day;

                return (
                  <div
                    key={day}
                    data-today={today ? 'true' : undefined}
                    onDragOver={(e) => handleDayDragOver(e, day)}
                    onDragLeave={() => { if (dropTargetDay === day) setDropTargetDay(null); }}
                    onDrop={(e) => handleDayDrop(e, day)}
                    className={`flex gap-0 border-b last:border-b-0 transition-colors ${
                      today ? 'bg-accent/5' : ''
                    } ${isDropTarget && draggedTaskId ? 'bg-accent/10 ring-1 ring-inset ring-accent/30' : ''}`}
                  >
                    {/* Day column */}
                    <div className={`w-16 shrink-0 py-3 px-3 text-center border-r ${isWeekend ? 'opacity-50' : ''}`}>
                      <p className="text-[10px] text-muted-foreground uppercase">{dayOfWeek}</p>
                      <span
                        className={`inline-flex items-center justify-center text-sm font-semibold mt-0.5 ${
                          today
                            ? 'bg-foreground text-background size-7 rounded-full'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {day}
                      </span>
                    </div>

                    {/* Timeline content */}
                    <div className="flex-1 min-w-0 py-2.5 px-3">
                      {dayTasks.length === 0 ? (
                        <div className="flex items-center h-full min-h-[28px]">
                          <span className="text-xs text-muted-foreground/30">
                            {isDropTarget && draggedTaskId ? '여기에 놓기' : isWeekend ? 'Weekend' : 'No events.'}
                          </span>
                        </div>
                      ) : (
                        <div className="relative space-y-1.5">
                          {dayTasks.length > 1 && (
                            <div className="absolute left-[3px] top-2 bottom-2 w-px bg-border" />
                          )}
                          {dayTasks.map((task, idx) => {
                            const isDone = task.status === 'done';
                            const hasTime = task.due_date?.includes('T');
                            const timeStr = hasTime ? format(parseISO(task.due_date!), 'HH:mm') : null;
                            const hasMemo = !!task.description;

                            return (
                              <div key={task.id} className="flex items-start gap-3 relative group/task">
                                <div className={`relative z-10 mt-1.5 size-[7px] rounded-full shrink-0 ring-2 ring-background ${STATUS_DOT[task.status]}`} />
                                <div
                                  className={`flex-1 flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${getEventColor(idx)} ${
                                    isDone ? 'opacity-50' : ''
                                  }`}
                                >
                                  <span className="text-[10px] opacity-60 w-10 shrink-0 font-mono">
                                    {timeStr || '—:—'}
                                  </span>
                                  <span className={`truncate ${isDone ? 'line-through' : ''}`}>
                                    {task.title}
                                  </span>
                                  {hasMemo && (
                                    <MessageSquare className="size-3 opacity-40 shrink-0" />
                                  )}
                                  {getPriority(task) === '높음' && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-200/50 text-red-700 dark:bg-red-800/30 dark:text-red-400 shrink-0">!</span>
                                  )}
                                  <div className="hidden group-hover/task:flex items-center gap-0.5 ml-auto shrink-0">
                                    <button onClick={() => openMemo(task)} className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10" title="메모">
                                      <MessageSquare className="size-3" />
                                    </button>
                                    <button onClick={() => updateTask(task.id, { status: isDone ? 'todo' : 'done' })} className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10" title={isDone ? '미완료' : '완료'}>
                                      <Check className="size-3" />
                                    </button>
                                    <button onClick={() => deleteTask(task.id)} className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10" title="삭제">
                                      <Trash2 className="size-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── RIGHT: Mini Calendar + Upcoming ─── */}
        <div className="w-[280px] shrink-0 space-y-3">
          <MiniCalendar
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            onSelectDate={(d) => {
              setSelectedDate(d);
              setCurrentMonth(d);
            }}
            onChangeMonth={setCurrentMonth}
            tasksOnDate={tasksOnDate}
          />

          {/* Stats */}
          <div className="flex items-center justify-center gap-4 text-[11px]">
            <button
              onClick={() => setStatusFilter(statusFilter === 'todo' ? null : 'todo')}
              className={`flex items-center gap-1.5 transition-colors ${statusFilter === 'todo' ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <span className="size-2 rounded-full bg-gray-400" />
              Todo {todoCount}
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'in_progress' ? null : 'in_progress')}
              className={`flex items-center gap-1.5 transition-colors ${statusFilter === 'in_progress' ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <span className="size-2 rounded-full bg-blue-500" />
              Progress {inProgressCount}
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'done' ? null : 'done')}
              className={`flex items-center gap-1.5 transition-colors ${statusFilter === 'done' ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <span className="size-2 rounded-full bg-green-500" />
              Done {doneCount}
            </button>
          </div>

          {/* Upcoming tasks */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-sm font-semibold">Upcoming tasks</h3>
            </div>
            <div className="space-y-1.5">
              {upcomingTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">예정된 태스크가 없습니다</p>
              ) : (
                upcomingTasks.slice(0, 6).map((task, idx) => {
                  const daysLeft = differenceInCalendarDays(parseISO(task.due_date!), new Date());
                  const daysLeftText = daysLeft === 0 ? 'Today' : `${daysLeft} Days left`;
                  const daysLeftColor = daysLeft === 0
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : daysLeft <= 2
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';

                  return (
                    <div key={task.id} className={`rounded-xl px-3 py-2 ${getEventColor(idx)} transition-all hover:shadow-sm`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{task.title}</p>
                          <div className="flex items-center gap-1 mt-0.5 text-[10px] opacity-70">
                            <Clock className="size-2.5" />
                            <span>
                              {format(parseISO(task.due_date!), 'M월 d일', { locale: ko })}
                              {task.due_date?.includes('T') && ` · ${format(parseISO(task.due_date!), 'HH:mm')}`}
                            </span>
                          </div>
                        </div>
                        <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${daysLeftColor}`}>
                          {daysLeftText}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Memo Dialog ─── */}
      <Dialog open={!!memoTaskId} onOpenChange={(open) => { if (!open) { setMemoTaskId(null); setMemoText(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-4" />
              메모
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <p className="text-xs text-muted-foreground">
              {tasks.find((t) => t.id === memoTaskId)?.title}
            </p>
            <Textarea
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              placeholder="메모를 입력하세요..."
              rows={4}
              className="resize-none"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setMemoTaskId(null); setMemoText(''); }}>
                취소
              </Button>
              <Button variant="outline" size="sm" onClick={saveMemo}>
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Mini Calendar ───

function MiniCalendar({
  currentMonth,
  selectedDate,
  onSelectDate,
  onChangeMonth,
  tasksOnDate,
}: {
  currentMonth: Date;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  onChangeMonth: (d: Date) => void;
  tasksOnDate: (d: Date) => Task[];
}) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => onChangeMonth(addMonths(currentMonth, -1))} className="p-1 rounded hover:bg-muted transition-colors">
          <ChevronLeft className="size-4 text-muted-foreground" />
        </button>
        <h3 className="text-sm font-semibold">
          {format(currentMonth, 'yyyy년 M월', { locale: ko })}
        </h3>
        <button onClick={() => onChangeMonth(addMonths(currentMonth, 1))} className="p-1 rounded hover:bg-muted transition-colors">
          <ChevronRight className="size-4 text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
          <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const selected = isSameDay(day, selectedDate);
          const dayTasks = tasksOnDate(day);
          const hasTodo = dayTasks.some((t) => t.status === 'todo');
          const hasProgress = dayTasks.some((t) => t.status === 'in_progress');
          const hasDone = dayTasks.some((t) => t.status === 'done');

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={`relative flex flex-col items-center py-1.5 rounded-lg text-xs transition-all ${
                !inMonth ? 'text-muted-foreground/30' : ''
              } ${today && !selected ? 'font-bold text-foreground' : ''} ${
                selected ? 'bg-foreground text-background font-bold' : 'hover:bg-muted'
              }`}
            >
              <span>{format(day, 'd')}</span>
              {inMonth && dayTasks.length > 0 && !selected && (
                <div className="flex gap-0.5 mt-0.5">
                  {hasTodo && <span className="size-1 rounded-full bg-gray-400" />}
                  {hasProgress && <span className="size-1 rounded-full bg-blue-500" />}
                  {hasDone && <span className="size-1 rounded-full bg-green-500" />}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
