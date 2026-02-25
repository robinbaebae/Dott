'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Calendar, ChevronLeft, ChevronRight, Plus, Trash2, Copy, CalendarDays, LayoutGrid, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface MarketingEvent {
  title: string;
  start: string;
  end: string;
  category: string;
  description: string;
}

const MARKETING_CAT_COLORS: Record<string, string> = {
  '이슈&기념일': 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  '행사': 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
  '공휴일': 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
  '절기': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  '기타': 'bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400',
};

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
  brand_message: 'bg-amber-500',
  newsletter: 'bg-violet-500',
  linkedin: 'bg-sky-600',
  twitter: 'bg-cyan-500',
  friendtalk: 'bg-yellow-500',
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  threads: 'Threads',
  blog: 'Blog',
  brand_message: '\uBE0C\uB79C\uB4DC\uBA54\uC138\uC9C0',
  newsletter: 'Newsletter',
  linkedin: 'LinkedIn',
  twitter: 'Twitter',
  friendtalk: '\uCE5C\uAD6C\uD1A1',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-amber-100 text-amber-800',
  published: 'bg-green-100 text-green-800',
};

const STATUS_FLOW: ('draft' | 'scheduled' | 'published')[] = ['draft', 'scheduled', 'published'];
const STATUS_LABELS: Record<string, string> = { draft: 'Draft', scheduled: 'Scheduled', published: 'Published' };

type ViewMode = 'week' | 'month';

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

function getMonthDates(baseDate: Date): Date[] {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay() === 0 ? -6 : 1 - firstDay.getDay();
  const start = new Date(year, month, 1 + startOffset);

  const dates: Date[] = [];
  // Always show 6 weeks to keep consistent height
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
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
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [marketingEvents, setMarketingEvents] = useState<MarketingEvent[]>([]);
  const [showMarketing, setShowMarketing] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [time, setTime] = useState('');
  const [content, setContent] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'draft' | 'scheduled' | 'published'>('draft');

  const weekDates = getWeekDates(baseDate);
  const monthDates = useMemo(() => getMonthDates(baseDate), [baseDate]);

  const dateRange = useMemo(() => {
    if (viewMode === 'week') {
      return { start: formatDate(weekDates[0]), end: formatDate(weekDates[6]) };
    }
    return { start: formatDate(monthDates[0]), end: formatDate(monthDates[41]) };
  }, [viewMode, weekDates, monthDates]);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/content-calendar?start=${dateRange.start}&end=${dateRange.end}`);
      if (res.ok) setItems(await res.json());
    } catch {
      toast.error('\uCE98\uB9B0\uB354 \uB370\uC774\uD130\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4');
    }
  }, [dateRange.start, dateRange.end]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Fetch marketing events from i-boss
  const fetchMarketingEvents = useCallback(async () => {
    if (!showMarketing) return;
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth() + 1;
    try {
      const res = await fetch(`/api/marketing-calendar?year=${year}&month=${month}`);
      if (res.ok) setMarketingEvents(await res.json());
    } catch {
      // silent
    }
  }, [baseDate, showMarketing]);

  useEffect(() => {
    fetchMarketingEvents();
  }, [fetchMarketingEvents]);

  const prevPeriod = () => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - (viewMode === 'week' ? 7 : 30));
    setBaseDate(d);
  };

  const nextPeriod = () => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + (viewMode === 'week' ? 7 : 30));
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
      toast.success(editItem ? '\uCF58\uD150\uCE20\uAC00 \uC218\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4' : '\uCF58\uD150\uCE20\uAC00 \uCD94\uAC00\uB418\uC5C8\uC2B5\uB2C8\uB2E4');
      setDialogOpen(false);
      fetchItems();
    } catch {
      toast.error(editItem ? '\uCF58\uD150\uCE20 \uC218\uC815\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4' : '\uCF58\uD150\uCE20 \uCD94\uAC00\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4');
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await fetch(`/api/content-calendar?id=${id}`, { method: 'DELETE' });
      toast.success('\uCF58\uD150\uCE20\uAC00 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4');
      setDialogOpen(false);
      fetchItems();
    } catch {
      toast.error('\uCF58\uD150\uCE20 \uC0AD\uC81C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4');
    }
  };

  // #4 Duplicate content
  const duplicateItem = async (item: CalendarItem) => {
    try {
      await fetch('/api/content-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${item.title} (copy)`,
          platform: item.platform,
          scheduled_date: item.scheduled_date,
          scheduled_time: item.scheduled_time,
          content: item.content,
          notes: item.notes,
        }),
      });
      toast.success('\uCF58\uD150\uCE20\uAC00 \uBCF5\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4');
      setDialogOpen(false);
      fetchItems();
    } catch {
      toast.error('\uBCF5\uC81C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4');
    }
  };

  // #11 Quick status change
  const cycleStatus = async (item: CalendarItem) => {
    const currentIdx = STATUS_FLOW.indexOf(item.status);
    const nextStatus = STATUS_FLOW[(currentIdx + 1) % STATUS_FLOW.length];
    try {
      await fetch('/api/content-calendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, status: nextStatus }),
      });
      fetchItems();
      toast.success(`${STATUS_LABELS[nextStatus]}\uB85C \uBCC0\uACBD\uB418\uC5C8\uC2B5\uB2C8\uB2E4`);
    } catch {
      toast.error('\uC0C1\uD0DC \uBCC0\uACBD \uC2E4\uD328');
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
      toast.error('\uB0A0\uC9DC \uBCC0\uACBD\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const today = formatDate(new Date());

  const periodLabel = useMemo(() => {
    if (viewMode === 'week') {
      return `${weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} \u2014 ${weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return baseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [viewMode, weekDates, baseDate]);

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-accent" />
            <h2 className="text-base font-semibold">Content Calendar</h2>
          </div>
          <div className="flex items-center gap-1">
            {/* Marketing events toggle */}
            <button
              onClick={() => setShowMarketing(!showMarketing)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium mr-1 transition-colors ${
                showMarketing
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
              title={showMarketing ? '마케팅 일정 숨기기' : '마케팅 일정 표시'}
            >
              <Sparkles className="size-3" />
              마케팅
            </button>
            {/* #3 View mode toggle */}
            <div className="flex gap-0.5 mr-2 p-0.5 rounded-md bg-muted/50">
              <button onClick={() => setViewMode('week')}
                className={`p-1 rounded transition-colors ${viewMode === 'week' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                title="Week view">
                <CalendarDays className="size-3.5" />
              </button>
              <button onClick={() => setViewMode('month')}
                className={`p-1 rounded transition-colors ${viewMode === 'month' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                title="Month view">
                <LayoutGrid className="size-3.5" />
              </button>
            </div>
            <Button variant="ghost" size="sm" onClick={prevPeriod}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToday} className="text-xs">
              Today
            </Button>
            <Button variant="ghost" size="sm" onClick={nextPeriod}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{periodLabel}</p>

        {/* Calendar grid */}
        {viewMode === 'week' ? (
          /* Weekly grid */
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((d, i) => {
              const dateStr = formatDate(d);
              const dayItems = items.filter((item) => item.scheduled_date === dateStr);
              const isToday = dateStr === today;

              const dayMarketing = showMarketing ? marketingEvents.filter((ev) => ev.start <= dateStr && ev.end >= dateStr) : [];

              return (
                <DayCell key={dateStr} dateStr={dateStr} dayName={DAY_NAMES[i]} dayNum={d.getDate()} isToday={isToday} isCurrentMonth={true}
                  dayItems={dayItems} marketingEvents={dayMarketing} minH="min-h-[140px]"
                  onDragOver={handleDragOver} onDrop={handleDrop} onAdd={openAddDialog} onEdit={openEditDialog}
                  onDragStart={handleDragStart} onCycleStatus={cycleStatus} />
              );
            })}
          </div>
        ) : (
          /* Monthly grid */
          <div>
            <div className="grid grid-cols-7 gap-px mb-1">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-center text-[10px] text-muted-foreground/60 uppercase tracking-wide py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDates.map((d) => {
                const dateStr = formatDate(d);
                const dayItems = items.filter((item) => item.scheduled_date === dateStr);
                const isToday = dateStr === today;
                const isCurrentMonth = d.getMonth() === baseDate.getMonth();

                const dayMarketing = showMarketing ? marketingEvents.filter((ev) => ev.start <= dateStr && ev.end >= dateStr) : [];

                return (
                  <DayCell key={dateStr} dateStr={dateStr} dayNum={d.getDate()} isToday={isToday} isCurrentMonth={isCurrentMonth}
                    dayItems={dayItems} marketingEvents={dayMarketing} minH="min-h-[80px]" compact
                    onDragOver={handleDragOver} onDrop={handleDrop} onAdd={openAddDialog} onEdit={openEditDialog}
                    onDragStart={handleDragStart} onCycleStatus={cycleStatus} />
                );
              })}
            </div>
          </div>
        )}

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

              {/* #11 Status with flow indicator */}
              {editItem && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                  <div className="flex gap-1">
                    {STATUS_FLOW.map((s, i) => (
                      <button key={s} onClick={() => setStatus(s)}
                        className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                          status === s ? STATUS_COLORS[s] + ' ring-1 ring-offset-1 ring-current' : 'text-muted-foreground/50 bg-muted/30 hover:bg-muted/50'
                        }`}>
                        {i > 0 && <span className="mr-0.5">&rarr;</span>}
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
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
                  <>
                    {/* #4 Duplicate button */}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => duplicateItem(editItem)}
                      title="Duplicate"
                    >
                      <Copy className="size-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => deleteItem(editItem.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// Shared day cell for both week and month views
function DayCell({
  dateStr, dayName, dayNum, isToday, isCurrentMonth, dayItems, marketingEvents, minH, compact,
  onDragOver, onDrop, onAdd, onEdit, onDragStart, onCycleStatus,
}: {
  dateStr: string; dayName?: string; dayNum: number; isToday: boolean; isCurrentMonth: boolean;
  dayItems: CalendarItem[]; marketingEvents?: MarketingEvent[]; minH: string; compact?: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, date: string) => void;
  onAdd: (date: string) => void;
  onEdit: (item: CalendarItem) => void;
  onDragStart: (e: React.DragEvent, item: CalendarItem) => void;
  onCycleStatus: (item: CalendarItem) => void;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, dateStr)}
      className={`${minH} rounded-lg border p-1.5 transition-colors ${
        isToday ? 'border-accent/40 bg-accent/5' : isCurrentMonth ? 'border-border' : 'border-border/30 bg-muted/10'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div>
          {dayName && <span className="text-[10px] text-muted-foreground">{dayName} </span>}
          <span className={`text-xs font-medium ${isToday ? 'text-accent' : isCurrentMonth ? '' : 'text-muted-foreground/40'}`}>
            {dayNum}
          </span>
        </div>
        <button
          onClick={() => onAdd(dateStr)}
          className="p-0.5 rounded hover:bg-muted transition-colors opacity-0 hover:opacity-100"
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '')}
        >
          <Plus className="size-3 text-muted-foreground" />
        </button>
      </div>

      <div className="space-y-0.5">
        {/* Marketing events */}
        {marketingEvents?.map((ev, idx) => (
          <div
            key={`mkt-${idx}`}
            className={`px-1 py-0.5 rounded text-[9px] truncate ${MARKETING_CAT_COLORS[ev.category] || MARKETING_CAT_COLORS['기타']}`}
            title={ev.description || ev.title}
          >
            {ev.title}
          </div>
        ))}
        {/* Content items */}
        {dayItems.map((item) => (
          <div key={item.id} className="group/item flex items-center gap-0.5">
            <button
              draggable
              onDragStart={(e) => onDragStart(e, item)}
              onClick={() => onEdit(item)}
              className={`flex-1 text-left ${compact ? 'p-0.5' : 'p-1'} rounded text-xs hover:bg-muted/50 transition-colors cursor-grab active:cursor-grabbing min-w-0`}
            >
              <div className="flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${PLATFORM_COLORS[item.platform] || 'bg-gray-400'}`} />
                <span className="truncate font-medium" style={{ fontSize: compact ? '10px' : '12px' }}>{item.title}</span>
              </div>
              {!compact && item.scheduled_time && (
                <span className="text-[10px] text-muted-foreground ml-2.5">
                  {item.scheduled_time.substring(0, 5)}
                </span>
              )}
            </button>
            {/* #11 Quick status badge (click to cycle) */}
            <button
              onClick={(e) => { e.stopPropagation(); onCycleStatus(item); }}
              className={`shrink-0 text-[8px] px-1 py-0.5 rounded-full opacity-0 group-hover/item:opacity-100 transition-opacity ${STATUS_COLORS[item.status]}`}
              title={`Click to change status (current: ${item.status})`}
            >
              {item.status === 'draft' ? 'D' : item.status === 'scheduled' ? 'S' : 'P'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
