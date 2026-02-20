'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { GripVertical } from 'lucide-react';
import { Task } from '@/types';

interface Quadrant {
  key: string;
  label: string;
  sublabel: string;
  urgent: boolean;
  important: boolean;
  color: string;
  bgColor: string;
  dot: string;
  dropHighlight: string;
}

const QUADRANTS: Quadrant[] = [
  { key: 'do-first', label: 'Do First', sublabel: 'Urgent & Important', urgent: true, important: true, color: 'text-red-700', bgColor: 'bg-red-500/5 border-red-500/20', dot: 'bg-red-500', dropHighlight: 'ring-2 ring-red-500/50 bg-red-500/10' },
  { key: 'schedule', label: 'Schedule', sublabel: 'Important & Not Urgent', urgent: false, important: true, color: 'text-yellow-700', bgColor: 'bg-yellow-500/5 border-yellow-500/20', dot: 'bg-yellow-500', dropHighlight: 'ring-2 ring-yellow-500/50 bg-yellow-500/10' },
  { key: 'delegate', label: 'Delegate', sublabel: 'Urgent & Not Important', urgent: true, important: false, color: 'text-orange-700', bgColor: 'bg-orange-500/5 border-orange-500/20', dot: 'bg-orange-500', dropHighlight: 'ring-2 ring-orange-500/50 bg-orange-500/10' },
  { key: 'eliminate', label: 'Eliminate', sublabel: 'Not Urgent & Not Important', urgent: false, important: false, color: 'text-gray-600', bgColor: 'bg-gray-500/5 border-gray-500/20', dot: 'bg-gray-400', dropHighlight: 'ring-2 ring-gray-400/50 bg-gray-500/10' },
];

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDueTime, setNewDueTime] = useState('');
  const [newUrgent, setNewUrgent] = useState(false);
  const [newImportant, setNewImportant] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const dragCounters = useRef<Record<string, number>>({});

  const loadTasks = useCallback(async () => {
    const res = await fetch('/api/tasks');
    const data = await res.json();
    setTasks(data);
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const createTask = async () => {
    if (!newTitle.trim()) return;

    let dueDate: string | null = null;
    if (newDueDate) {
      dueDate = newDueTime ? `${newDueDate}T${newDueTime}:00` : newDueDate;
    }

    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle,
        description: newDescription || null,
        due_date: dueDate,
        urgent: newUrgent,
        important: newImportant,
      }),
    });
    setNewTitle('');
    setNewDescription('');
    setNewDueDate('');
    setNewDueTime('');
    setNewUrgent(false);
    setNewImportant(false);
    setDialogOpen(false);
    loadTasks();
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, ...updates }),
    });
    loadTasks();
  };

  const deleteTask = async (taskId: string) => {
    await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' });
    loadTasks();
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverKey(null);
    dragCounters.current = {};
  };

  const handleDragEnter = (e: React.DragEvent, quadrantKey: string) => {
    e.preventDefault();
    dragCounters.current[quadrantKey] = (dragCounters.current[quadrantKey] || 0) + 1;
    setDragOverKey(quadrantKey);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (quadrantKey: string) => {
    dragCounters.current[quadrantKey] = (dragCounters.current[quadrantKey] || 0) - 1;
    if (dragCounters.current[quadrantKey] <= 0) {
      dragCounters.current[quadrantKey] = 0;
      if (dragOverKey === quadrantKey) {
        setDragOverKey(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent, quadrant: Quadrant) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const alreadyInQuadrant = (task.urgent ?? false) === quadrant.urgent && (task.important ?? false) === quadrant.important;
      if (!alreadyInQuadrant) {
        updateTask(taskId, { urgent: quadrant.urgent, important: quadrant.important });
      }
    }
    setDraggedTaskId(null);
    setDragOverKey(null);
    dragCounters.current = {};
  };

  const tasksForQuadrant = (q: Quadrant) =>
    tasks.filter((t) => (t.urgent ?? false) === q.urgent && (t.important ?? false) === q.important);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Task Board</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">+ New task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add new task</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <Input
                placeholder="Task title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Textarea
                placeholder="Description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                  <Input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Time</label>
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
                  <span className="text-sm">Urgent</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setNewImportant(!newImportant)}
                    className={`w-10 h-5 rounded-full transition-colors ${newImportant ? 'bg-yellow-500' : 'bg-gray-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${newImportant ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-sm">Important</span>
                </label>
              </div>
              <Button onClick={createTask} className="w-full">
                Add
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Eisenhower 2x2 Matrix */}
      <div className="grid grid-cols-2 gap-3">
        {QUADRANTS.map((q) => {
          const qTasks = tasksForQuadrant(q);
          const isDragOver = dragOverKey === q.key && draggedTaskId !== null;
          return (
            <div
              key={q.key}
              onDragEnter={(e) => handleDragEnter(e, q.key)}
              onDragOver={handleDragOver}
              onDragLeave={() => handleDragLeave(q.key)}
              onDrop={(e) => handleDrop(e, q)}
              className={`rounded-xl border p-3 min-h-[200px] transition-all duration-200 ${
                isDragOver ? q.dropHighlight : q.bgColor
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${q.dot}`} />
                <span className={`text-sm font-medium ${q.color}`}>{q.label}</span>
                <span className="text-[10px] text-muted-foreground">{q.sublabel}</span>
                <span className="text-xs text-muted-foreground ml-auto">{qTasks.length}</span>
              </div>

              <div className="space-y-2">
                {qTasks.map((task) => (
                  <Card
                    key={task.id}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-150 select-none ${
                      draggedTaskId === task.id ? 'opacity-30 scale-95' : ''
                    }`}
                  >
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                        <GripVertical className="size-3.5 text-muted-foreground/40 shrink-0" />
                        <span className="truncate">{task.title}</span>
                        {task.status === 'done' && (
                          <span className="text-[10px] text-green-600 shrink-0 ml-auto">Done</span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 pl-8">
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground">
                            {formatDueDate(task.due_date)}
                          </span>
                        )}
                        <div className="flex items-center gap-2 ml-auto">
                          {task.status !== 'done' && (
                            <button
                              onClick={() => updateTask(task.id, { status: 'done' })}
                              className="text-xs text-muted-foreground hover:text-green-600 transition-colors"
                            >
                              Done
                            </button>
                          )}
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Drop zone indicator when empty and dragging */}
                {qTasks.length === 0 && draggedTaskId && (
                  <div className="border-2 border-dashed border-current/20 rounded-lg p-4 text-center text-xs text-muted-foreground">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDueDate(dateStr: string): string {
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${date} ${time}`;
  }
  return dateStr;
}
