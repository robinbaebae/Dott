'use client';

import { useState, useEffect } from 'react';
import { RotateCcw, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useKnowbarStore } from '@/store/knowbar-store';

interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  urgent: boolean;
  important: boolean;
}

interface ResumeItem {
  id: string;
  type: 'overdue' | 'inprogress' | 'urgent' | 'draft';
  title: string;
  badge: string;
  href?: string;
  sessionId?: string;
  overdueDays?: number;
}

function getDotColor(type: ResumeItem['type']) {
  switch (type) {
    case 'overdue': return 'bg-red-500';
    case 'inprogress': return 'bg-amber-500';
    case 'urgent': return 'bg-accent';
    case 'draft': return 'bg-accent/60';
  }
}

function getBadgeStyle(type: ResumeItem['type']) {
  switch (type) {
    case 'overdue': return 'bg-red-500/10 text-red-600 dark:text-red-400';
    case 'inprogress': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
    case 'urgent': return 'bg-accent/10 text-accent';
    case 'draft': return 'bg-muted text-muted-foreground';
  }
}

export default function ResumePanel() {
  const [items, setItems] = useState<ResumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const sessions = useKnowbarStore((s) => s.sessions);
  const loadSession = useKnowbarStore((s) => s.loadSession);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) return;
      const tasks: Task[] = await res.json();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result: ResumeItem[] = [];

      // 1. Overdue tasks
      const overdue = tasks
        .filter((t) => t.due_date && new Date(t.due_date) < today && t.status !== 'done')
        .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

      for (const t of overdue) {
        const diffDays = Math.ceil((today.getTime() - new Date(t.due_date!).getTime()) / 86400000);
        result.push({
          id: t.id,
          type: 'overdue',
          title: t.title,
          badge: `${diffDays}일 지남`,
          href: '/tasks',
          overdueDays: diffDays,
        });
      }

      // 2. In-progress tasks
      const inProgress = tasks.filter((t) => t.status === 'in_progress');
      for (const t of inProgress) {
        result.push({
          id: t.id,
          type: 'inprogress',
          title: t.title,
          badge: '진행 중',
          href: '/tasks',
        });
      }

      // 3. Urgent + important todo
      const urgentTodo = tasks.filter(
        (t) => t.status === 'todo' && t.urgent && t.important
      );
      for (const t of urgentTodo) {
        result.push({
          id: t.id,
          type: 'urgent',
          title: t.title,
          badge: '긴급',
          href: '/tasks',
        });
      }

      // 4. Recent draft session (max 1)
      if (sessions.length > 0) {
        const latest = sessions[0]; // already sorted by created_at desc
        result.push({
          id: latest.id,
          type: 'draft',
          title: latest.title || '최근 대화',
          badge: '대화 이어하기',
          sessionId: latest.id,
        });
      }

      setItems(result.slice(0, 5));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  if (loading || items.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-4 w-full border-l-2 border-l-accent/40">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <RotateCcw className="size-4 text-accent" />
        <span className="text-sm font-semibold text-foreground">이어서 하기</span>
        <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground">
          {items.length}
        </span>
      </div>

      {/* Items */}
      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 py-2 px-2 rounded-xl group/item hover:bg-muted/30 transition-colors"
          >
            {/* Urgency dot */}
            <div className={`size-2 rounded-full shrink-0 ${getDotColor(item.type)}`} />

            {/* Title + badge */}
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <p className="text-sm truncate text-foreground/80">{item.title}</p>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${getBadgeStyle(item.type)}`}
              >
                {item.badge}
              </span>
            </div>

            {/* Quick action */}
            {item.sessionId ? (
              <button
                onClick={() => loadSession('tab-1', item.sessionId!)}
                className="opacity-0 group-hover/item:opacity-100 transition-opacity text-[11px] px-2.5 py-1 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 flex items-center gap-1 shrink-0 cursor-pointer"
              >
                이어하기 <ArrowRight className="size-3" />
              </button>
            ) : (
              <Link
                href={item.href || '/tasks'}
                className="opacity-0 group-hover/item:opacity-100 transition-opacity text-[11px] px-2.5 py-1 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 flex items-center gap-1 shrink-0"
              >
                태스크로 <ArrowRight className="size-3" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
