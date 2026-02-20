'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Task, TaskStatus } from '@/types';

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: 'To do', color: 'bg-gray-100 text-gray-800' },
  in_progress: { label: 'In progress', color: 'bg-blue-100 text-blue-800' },
  done: { label: 'Done', color: 'bg-green-100 text-green-800' },
};

const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'done'];

export default function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

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
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle,
        description: newDescription || null,
        due_date: newDueDate || null,
      }),
    });
    setNewTitle('');
    setNewDescription('');
    setNewDueDate('');
    setDialogOpen(false);
    loadTasks();
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    await fetch('/api/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, status }),
    });
    loadTasks();
  };

  const deleteTask = async (taskId: string) => {
    await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' });
    loadTasks();
  };

  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: TaskStatus) => {
    if (draggedTaskId) {
      updateTaskStatus(draggedTaskId, status);
      setDraggedTaskId(null);
    }
  };

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
              <Input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
              <Button onClick={createTask} className="w-full">
                Add
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map((status) => (
          <div
            key={status}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(status)}
            className="bg-muted/40 rounded-lg p-3 min-h-[300px]"
          >
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary" className={STATUS_CONFIG[status].color}>
                {STATUS_CONFIG[status].label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {tasks.filter((t) => t.status === status).length}
              </span>
            </div>

            <div className="space-y-2">
              {tasks
                .filter((t) => t.status === status)
                .map((task) => (
                  <Card
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        {task.due_date && (
                          <span className="text-xs text-muted-foreground">
                            {task.due_date}
                          </span>
                        )}
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="text-xs text-muted-foreground hover:text-destructive transition-colors ml-auto"
                        >
                          Delete
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
