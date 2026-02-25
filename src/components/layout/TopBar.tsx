'use client';

import { Bell, Search, X } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

interface Notification {
  id: string;
  action_type: string;
  agent_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const ACTION_META: Record<string, { label: string; color: string }> = {
  task_create: { label: '새 태스크', color: 'blue' },
  task_complete: { label: '태스크 완료', color: 'green' },
  banner_generate: { label: '배너 생성', color: 'peach' },
  ad_creatives_generated: { label: '광고 크리에이티브', color: 'amber' },
  content_materials_generated: { label: '콘텐츠 소재', color: 'pink' },
  content_drafts_generated: { label: '초안 생성', color: 'blue' },
  content_project_create: { label: '프로젝트 생성', color: 'green' },
  daily_report: { label: '데일리 리포트', color: 'amber' },
};

function getActionMeta(type: string) {
  return ACTION_META[type] || { label: type.replace(/_/g, ' '), color: 'blue' };
}

function colorClasses(color: string) {
  const map: Record<string, string> = {
    blue: 'bg-[var(--color-cat-blue)] text-[var(--color-cat-blue-text)]',
    pink: 'bg-[var(--color-cat-pink)] text-[var(--color-cat-pink-text)]',
    green: 'bg-[var(--color-cat-green)] text-[var(--color-cat-green-text)]',
    amber: 'bg-[var(--color-cat-amber)] text-[var(--color-cat-amber-text)]',
    peach: 'bg-[var(--color-cat-peach)] text-[var(--color-cat-peach-text)]',
  };
  return map[color] || map.blue;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export default function TopBar() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      // Consider items from the last hour as "unread"
      const oneHourAgo = Date.now() - 3600000;
      const count = (data.notifications || []).filter(
        (n: Notification) => new Date(n.created_at).getTime() > oneHourAgo
      ).length;
      setUnread(count);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="h-12 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-end px-4 gap-2 shrink-0 relative z-10">
      {/* Search (placeholder) */}
      <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer">
        <Search className="size-4" />
      </button>

      {/* Notifications */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => {
            setOpen(!open);
            if (!open) setUnread(0);
          }}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer relative"
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold text-foreground">알림</span>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="size-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  알림이 없습니다
                </div>
              ) : (
                notifications.map((n) => {
                  const meta = getActionMeta(n.action_type);
                  return (
                    <div
                      key={n.id}
                      className="px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold ${colorClasses(meta.color)}`}
                        >
                          {meta.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground truncate">
                            {(n.details as Record<string, string>)?.title ||
                              (n.details as Record<string, string>)?.description ||
                              meta.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {timeAgo(n.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
