'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface CalendarItem {
  id: string;
  title: string;
  platform: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: 'draft' | 'scheduled' | 'published';
  content: string;
  notes: string;
  created_at: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-500',
  threads: 'bg-gray-800',
  blog: 'bg-green-500',
  newsletter: 'bg-blue-500',
  linkedin: 'bg-sky-600',
  twitter: 'bg-cyan-500',
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  threads: 'Threads',
  blog: 'Blog',
  newsletter: 'Newsletter',
  linkedin: 'LinkedIn',
  twitter: 'Twitter',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
};

function getWeekDates(baseDate: Date): Date[] {
  const start = new Date(baseDate);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  start.setDate(start.getDate() + diff);

  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates[i] = d;
  }
  return dates;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ContentCalendar() {
  const [baseDate, setBaseDate] = useState(new Date());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<CalendarItem | null>(null);
  const [selectedDate, setSelectedDate] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [time, setTime] = useState('');
  const [content, setContent] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'draft' | 'scheduled' | 'published'>('draft');

  const weekDates = getWeekDates(baseDate);
  const weekStart = formatDate(weekDates[0]);
  const weekEnd = formatDate(weekDates[6]);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/content-calendar?start=${weekStart}&end=${weekEnd}`);
      if (res.ok) setItems(await res.json());
    } catch {
      toast.error('캘린더 데이터를 불러오지 못했습니다');
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const prevWeek = () => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - 7);
    setBaseDate(d);
  };

  const nextWeek = () => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 7);
    setBaseDate(d);
  };

  const goToday = () => setBaseDate(new Date());

  const openAddDialog = (date: string) => {
    setEditItem(null);
    setSelectedDate(date);
    setTitle('');
    setPlatform('instagram');
    setTime('');
    setContent('');
    setNotes('');
    setStatus('draft');
    setDialogOpen(true);
  };

  const openEditDialog = (item: CalendarItem) => {
    setEditItem(item);
    setSelectedDate(item.scheduled_date);
    setTitle(item.title);
    setPlatform(item.platform);
    setTime(item.scheduled_time || '');
    setContent(item.content);
    setNotes(item.notes);
    setStatus(item.status);
    setDialogOpen(true);
  };

  const saveItem = async () => {
    if (!title.trim()) return;

    try {
      if (editItem) {
        await fetch('/api/content-calendar', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editItem.id,
            title,
            platform,
            scheduled_date: selectedDate,
            scheduled_time: time || null,
            content,
            notes,
            status,
          }),
        });
      } else {
        await fetch('/api/content-calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            platform,
            scheduled_date: selectedDate,
            scheduled_time: time || null,
            content,
            notes,
          }),
        });
      }
      toast.success(editItem ? '콘텐츠가 수정되었습니다' : '콘텐츠가 추가되었습니다');
      setDialogOpen(false);
      fetchItems();
    } catch {
      toast.error(editItem ? '콘텐츠 수정에 실패했습니다' : '콘텐츠 추가에 실패했습니다');
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await fetch(`/api/content-calendar?id=${id}`, { method: 'DELETE' });
      toast.success('콘텐츠가 삭제되었습니다');
      setDialogOpen(false);
      fetchItems();
    } catch {
      toast.error('콘텐츠 삭제에 실패했습니다');
    }
  };

  const handleDragStart = (e: React.DragEvent, item: CalendarItem) => {
    e.dataTransfer.setData('calendar-item-id', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e: React.DragEvent, date: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('calendar-item-id');
    if (!itemId) return;

    try {
      await fetch('/api/content-calendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, scheduled_date: date }),
      });
      fetchItems();
    } catch {
      toast.error('날짜 변경에 실패했습니다');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const today = formatDate(new Date());

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-accent" />
            <h2 className="text-base font-semibold">Content Calendar</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={prevWeek}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToday} className="text-xs">
              Today
            </Button>
            <Button variant="ghost" size="sm" onClick={nextWeek}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* Week label */}
        <p className="text-sm text-muted-foreground">
          {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          {' — '}
          {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>

        {/* Weekly grid */}
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((d, i) => {
            const dateStr = formatDate(d);
            const dayItems = items.filter((item) => item.scheduled_date === dateStr);
            const isToday = dateStr === today;

            return (
              <div
                key={dateStr}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, dateStr)}
                className={`min-h-[140px] rounded-lg border p-2 transition-colors ${
                  isToday ? 'border-accent/40 bg-accent/5' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs text-muted-foreground">{DAY_NAMES[i]}</span>
                    <span className={`text-sm font-medium ml-1 ${isToday ? 'text-accent' : ''}`}>
                      {d.getDate()}
                    </span>
                  </div>
                  <button
                    onClick={() => openAddDialog(dateStr)}
                    className="p-0.5 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 hover:opacity-100"
                    style={{ opacity: undefined }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '')}
                  >
                    <Plus className="size-3 text-muted-foreground" />
                  </button>
                </div>

                <div className="space-y-1">
                  {dayItems.map((item) => (
                    <button
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                      onClick={() => openEditDialog(item)}
                      className="w-full text-left p-1.5 rounded text-xs hover:bg-muted/50 transition-colors cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PLATFORM_COLORS[item.platform] || 'bg-gray-400'}`} />
                        <span className="truncate font-medium">{item.title}</span>
                      </div>
                      {item.scheduled_time && (
                        <span className="text-[10px] text-muted-foreground ml-2.5">
                          {item.scheduled_time.substring(0, 5)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem ? 'Edit Content' : 'Add Content'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <Input
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Platform</label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PLATFORM_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Time</label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              {editItem && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                  <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Content</label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Content body..."
                  rows={3}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes..."
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={saveItem} disabled={!title.trim()} className="flex-1">
                  {editItem ? 'Update' : 'Add'}
                </Button>
                {editItem && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => deleteItem(editItem.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
