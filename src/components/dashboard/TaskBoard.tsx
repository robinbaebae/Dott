'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { Plus, Trash2, Check, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { Task } from '@/types';

function getPriority(task: Task): '높음' | '보통' | '낮음' {
  if (task.urgent && task.important) return '높음';
  if (task.urgent || task.important) return '보통';
  return '낮음';
}

const PRIORITY_STYLE: Record<string, string> = {
  '높음': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  '보통': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  '낮음': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const STATUS_STYLE: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  'in_progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const STATUS_LABEL: Record<string, string> = {
  todo: '할 일',
  'in_progress': '진행 중',
  done: '완료',
};

const SECTION_COLORS: Record<string, string> = {
  todo: 'border-l-gray-400',
  in_progress: 'border-l-blue-500',
  done: 'border-l-green-500',
};

const SECTION_ORDER: Task['status'][] = ['todo', 'in_progress', 'done'];

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newDueTime, setNewDueTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [newUrgent, setNewUrgent] = useState(false);
  const [newImportant, setNewImportant] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [inlineAddSection, setInlineAddSection] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ section: string; taskId?: string } | null>(null);
  const dragCounter = useRef(0);

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data);
    } catch {
      toast.error('태스크를 불러오지 못했습니다');
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const groupedTasks = useMemo(() => {
    const groups: Record<string, Task[]> = { todo: [], in_progress: [], done: [] };
    for (const task of tasks) {
      const key = task.status || 'todo';
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    }
    return groups;
  }, [tasks]);

  const createTask = async (status?: Task['status']) => {
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
          status: status || 'todo',
        }),
      });
      toast.success('태스크가 추가되었습니다');
      setNewTitle('');
      setNewDescription('');
      setNewDueDate(new Date().toISOString().slice(0, 10));
      setNewDueTime(new Date().toTimeString().slice(0, 5));
      setNewUrgent(false);
      setNewImportant(false);
      setDialogOpen(false);
      loadTasks();
    } catch {
      toast.error('태스크 생성에 실패했습니다');
    }
  };

  const createInlineTask = async (status: string) => {
    if (!inlineTitle.trim()) {
      setInlineAddSection(null);
      return;
    }

    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: inlineTitle,
          status,
        }),
      });
      toast.success('태스크가 추가되었습니다');
      setInlineTitle('');
      setInlineAddSection(null);
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
      toast.error('태스크 업데이트에 실패했습니다');
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' });
      toast.success('태스크가 삭제되었습니다');
      loadTasks();
    } catch {
      toast.error('태스크 삭제에 실패했습니다');
    }
  };

  const cycleStatus = (task: Task) => {
    const current = SECTION_ORDER.indexOf(task.status);
    const next = SECTION_ORDER[(current + 1) % SECTION_ORDER.length];
    updateTask(task.id, { status: next });
  };

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleDragStart = (task: Task) => {
    setDraggedTaskId(task.id);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDropTarget(null);
    dragCounter.current = 0;
  };

  const handleDropOnSection = (targetSection: string) => {
    if (!draggedTaskId) return;
    const task = tasks.find((t) => t.id === draggedTaskId);
    if (task && task.status !== targetSection) {
      updateTask(task.id, { status: targetSection as Task['status'] });
    }
    setDraggedTaskId(null);
    setDropTarget(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold bg-gradient-to-r from-amber-600 via-pink-600 to-violet-600 dark:from-amber-400 dark:via-pink-400 dark:to-violet-400 bg-clip-text text-transparent">태스크 보드</h2>
          <span className="text-xs text-muted-foreground">{tasks.length}개</span>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
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
                placeholder="설명 (선택사항)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">날짜</label>
                  <Input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">시간</label>
                  <Input
                    type="time"
                    value={newDueTime}
                    onChange={(e) => setNewDueTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setNewUrgent(!newUrgent)}
                    className={`w-10 h-5 rounded-full transition-colors ${newUrgent ? 'bg-red-500' : 'bg-gray-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${newUrgent ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-sm">긴급</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setNewImportant(!newImportant)}
                    className={`w-10 h-5 rounded-full transition-colors ${newImportant ? 'bg-yellow-500' : 'bg-gray-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${newImportant ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-sm">중요</span>
                </label>
              </div>
              <Button onClick={() => createTask()} className="w-full">
                추가
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Column Headers */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-8 px-2 py-2.5" />
              <th className="w-8 px-1 py-2.5" />
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-[11px] tracking-wider">태스크명</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-[11px] tracking-wider w-28">마감일</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-[11px] tracking-wider w-20">우선순위</th>
              <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-[11px] tracking-wider w-24">상태</th>
              <th className="w-10 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {SECTION_ORDER.map((section) => {
              const sectionTasks = groupedTasks[section] || [];
              const isCollapsed = collapsedSections[section];

              return (
                <SectionGroup
                  key={section}
                  section={section}
                  tasks={sectionTasks}
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleSection(section)}
                  onCycleStatus={cycleStatus}
                  onUpdateTask={updateTask}
                  onDeleteTask={deleteTask}
                  inlineAddActive={inlineAddSection === section}
                  inlineTitle={inlineTitle}
                  onInlineAddStart={() => { setInlineAddSection(section); setInlineTitle(''); }}
                  onInlineTitleChange={setInlineTitle}
                  onInlineAddSubmit={() => createInlineTask(section)}
                  onInlineAddCancel={() => setInlineAddSection(null)}
                  draggedTaskId={draggedTaskId}
                  dropTarget={dropTarget}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDropOnSection={handleDropOnSection}
                  onDropTargetChange={setDropTarget}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SectionGroup({
  section,
  tasks,
  isCollapsed,
  onToggle,
  onCycleStatus,
  onUpdateTask,
  onDeleteTask,
  inlineAddActive,
  inlineTitle,
  onInlineAddStart,
  onInlineTitleChange,
  onInlineAddSubmit,
  onInlineAddCancel,
  draggedTaskId,
  dropTarget,
  onDragStart,
  onDragEnd,
  onDropOnSection,
  onDropTargetChange,
}: {
  section: string;
  tasks: Task[];
  isCollapsed: boolean;
  onToggle: () => void;
  onCycleStatus: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  inlineAddActive: boolean;
  inlineTitle: string;
  onInlineAddStart: () => void;
  onInlineTitleChange: (v: string) => void;
  onInlineAddSubmit: () => void;
  onInlineAddCancel: () => void;
  draggedTaskId: string | null;
  dropTarget: { section: string; taskId?: string } | null;
  onDragStart: (task: Task) => void;
  onDragEnd: () => void;
  onDropOnSection: (section: string) => void;
  onDropTargetChange: (target: { section: string; taskId?: string } | null) => void;
}) {
  return (
    <>
      {/* Section Header Row */}
      <tr
        className={`border-b border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors border-l-3 ${SECTION_COLORS[section]} ${
          draggedTaskId && dropTarget?.section === section && !dropTarget?.taskId ? 'bg-accent/10' : ''
        }`}
        onClick={onToggle}
        onDragOver={(e) => {
          if (!draggedTaskId) return;
          e.preventDefault();
          onDropTargetChange({ section });
        }}
        onDragLeave={() => {
          if (dropTarget?.section === section && !dropTarget?.taskId) onDropTargetChange(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          onDropOnSection(section);
        }}
      >
        <td className="px-2 py-2" colSpan={7}>
          <div className="flex items-center gap-2">
            {isCollapsed
              ? <ChevronRight className="size-3.5 text-muted-foreground" />
              : <ChevronDown className="size-3.5 text-muted-foreground" />
            }
            <span className="text-xs font-semibold">{STATUS_LABEL[section] || section}</span>
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {tasks.length}
            </span>
          </div>
        </td>
      </tr>

      {/* Task Rows */}
      {!isCollapsed && tasks.map((task) => {
        const priority = getPriority(task);
        const isDone = task.status === 'done';
        const isDragging = draggedTaskId === task.id;
        const isDropTarget = dropTarget?.section === section && dropTarget?.taskId === task.id;
        return (
          <tr
            key={task.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              onDragStart(task);
            }}
            onDragEnd={onDragEnd}
            onDragOver={(e) => {
              if (!draggedTaskId || draggedTaskId === task.id) return;
              e.preventDefault();
              onDropTargetChange({ section, taskId: task.id });
            }}
            onDragLeave={() => {
              if (dropTarget?.taskId === task.id) onDropTargetChange(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDropOnSection(section);
            }}
            className={`border-b border-border/50 hover:bg-muted/20 transition-colors group border-l-3 ${SECTION_COLORS[section]} ${
              isDragging ? 'opacity-40' : ''
            } ${isDropTarget ? 'border-t-2 border-t-accent' : ''}`}
          >
            {/* Drag handle */}
            <td className="px-2 py-2.5">
              <GripVertical className="size-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
            </td>

            {/* Checkbox */}
            <td className="px-1 py-2.5">
              <button
                onClick={() => onUpdateTask(task.id, { status: isDone ? 'todo' : 'done' })}
                className={`size-[18px] rounded-full border-2 flex items-center justify-center transition-colors ${
                  isDone
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 hover:border-accent dark:border-gray-600'
                }`}
              >
                {isDone && <Check className="size-2.5" />}
              </button>
            </td>

            {/* Task name + description */}
            <td className="px-3 py-2.5">
              <p className={`text-sm ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                {task.title}
              </p>
              {task.description && (
                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                  {task.description}
                </p>
              )}
            </td>

            {/* Due date */}
            <td className="px-3 py-2.5 text-xs text-muted-foreground">
              {task.due_date ? formatDueDate(task.due_date) : ''}
            </td>

            {/* Priority */}
            <td className="px-3 py-2.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${PRIORITY_STYLE[priority]}`}>
                {priority}
              </span>
            </td>

            {/* Status */}
            <td className="px-3 py-2.5">
              <button
                onClick={() => onCycleStatus(task)}
                className={`text-[10px] px-2 py-0.5 rounded-full cursor-pointer transition-colors ${STATUS_STYLE[task.status] || STATUS_STYLE.todo}`}
              >
                {STATUS_LABEL[task.status] || '할 일'}
              </button>
            </td>

            {/* Delete */}
            <td className="px-2 py-2.5">
              <button
                onClick={() => onDeleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all"
              >
                <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </td>
          </tr>
        );
      })}

      {/* Inline Add Row */}
      {!isCollapsed && (
        <tr className={`border-b border-border/30 border-l-3 ${SECTION_COLORS[section]}`}>
          <td colSpan={7} className="px-3 py-1.5">
            {inlineAddActive ? (
              <div className="flex items-center gap-2 pl-7">
                <input
                  autoFocus
                  type="text"
                  value={inlineTitle}
                  onChange={(e) => onInlineTitleChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onInlineAddSubmit();
                    if (e.key === 'Escape') onInlineAddCancel();
                  }}
                  onBlur={() => { if (!inlineTitle.trim()) onInlineAddCancel(); }}
                  placeholder="태스크명 입력 후 Enter..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                />
              </div>
            ) : (
              <button
                onClick={onInlineAddStart}
                className="flex items-center gap-1.5 pl-7 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors w-full py-0.5"
              >
                <Plus className="size-3" />
                태스크 추가...
              </button>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function formatDueDate(dateStr: string): string {
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    const date = d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${date} ${time}`;
  }
  return dateStr;
}
