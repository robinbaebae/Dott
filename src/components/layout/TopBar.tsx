'use client';

import { Bell, Search, X, Target, Layers, PenTool, Users, Lightbulb, Calendar, TrendingUp, BarChart3, CreditCard, Megaphone, Wrench, Settings, FileText, Home } from 'lucide-react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';

const SEARCH_ITEMS: { href: string; label: string; description: string; icon: LucideIcon }[] = [
  { href: '/', label: 'Dashboard', description: '대시보드 홈', icon: Home },
  { href: '/ads', label: 'Ad Analytics', description: '광고 성과 분석', icon: Target },
  { href: '/analytics', label: 'Analytics', description: '사이트 분석', icon: BarChart3 },
  { href: '/assets', label: 'Assets', description: '에셋 라이브러리', icon: Layers },
  { href: '/content', label: 'Content', description: '콘텐츠 제작', icon: PenTool },
  { href: '/influencer', label: 'Influencer', description: '인플루언서 검색', icon: Users },
  { href: '/insight', label: 'Insight', description: '마케팅 인사이트', icon: Lightbulb },
  { href: '/memo', label: 'Memo', description: '메모 관리', icon: FileText },
  { href: '/tasks', label: 'Tasks', description: '태스크 관리', icon: Calendar },
  { href: '/trends', label: 'Trends', description: '트렌드 리서치', icon: TrendingUp },
  { href: '/ledger', label: 'Ledger', description: '법인카드 가계부', icon: CreditCard },
  { href: '/promotion', label: 'Promotion', description: '프로모션 설계', icon: Megaphone },
  { href: '/tools', label: 'Utilities', description: '마케팅 도구', icon: Wrench },
  { href: '/settings', label: 'Settings', description: '환경 설정', icon: Settings },
];

interface Notification {
  id: string;
  action_type: string;
  agent_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const ACTION_META: Record<string, { label: string; color: string; path: string }> = {
  task_create: { label: '새 태스크', color: 'blue', path: '/tasks' },
  task_complete: { label: '태스크 완료', color: 'green', path: '/tasks' },
  banner_generate: { label: '배너 생성', color: 'peach', path: '/content' },
  ad_creatives_generated: { label: '광고 크리에이티브', color: 'amber', path: '/content' },
  content_materials_generated: { label: '콘텐츠 소재', color: 'pink', path: '/content' },
  content_drafts_generated: { label: '초안 생성', color: 'blue', path: '/content' },
  content_project_create: { label: '프로젝트 생성', color: 'green', path: '/content' },
  daily_report: { label: '데일리 리포트', color: 'amber', path: '/' },
  insight_generated: { label: '인사이트', color: 'blue', path: '/insight' },
  trend_report: { label: '트렌드', color: 'pink', path: '/trends' },
  influencer_search: { label: '인플루언서', color: 'green', path: '/influencer' },
  ad_report: { label: '광고 리포트', color: 'amber', path: '/ads' },
  memo_create: { label: '메모', color: 'blue', path: '/memo' },
  promotion_create: { label: '프로모션', color: 'peach', path: '/promotion' },
};

const PAGE_META: Record<string, { icon: LucideIcon; title: string }> = {
  '/': { icon: Home, title: 'Dashboard' },
  '/ads': { icon: Target, title: '광고 성과' },
  '/assets': { icon: Layers, title: '에셋 라이브러리' },
  '/content': { icon: PenTool, title: '콘텐츠' },
  '/influencer': { icon: Users, title: '인플루언서' },
  '/insight': { icon: Lightbulb, title: '인사이트' },
  '/memo': { icon: FileText, title: '메모' },
  '/tasks': { icon: Calendar, title: '태스크' },
  '/trends': { icon: TrendingUp, title: '트렌드' },
  '/analytics': { icon: BarChart3, title: '애널리틱스' },
  '/ledger': { icon: CreditCard, title: '법인카드 가계부' },
  '/promotion': { icon: Megaphone, title: '프로모션 설계' },
  '/tools': { icon: Wrench, title: '마케팅 도구' },
  '/settings': { icon: Settings, title: '설정' },
};

function getActionMeta(type: string) {
  return ACTION_META[type] || { label: type.replace(/_/g, ' '), color: 'blue', path: '/' };
}

const READ_KEY = 'dott-notif-read';

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
  const pathname = usePathname();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return SEARCH_ITEMS;
    const q = searchQuery.toLowerCase();
    return SEARCH_ITEMS.filter(
      (item) => item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Cmd+K to open search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setSearchQuery('');
      }
      if (e.key === 'Escape') setSearchOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  // Load read IDs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(READ_KEY);
      if (stored) setReadIds(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }
  }, []);

  // Find matching page meta
  const pageMeta = PAGE_META[pathname] || Object.entries(PAGE_META).find(
    ([path]) => path !== '/' && pathname.startsWith(path)
  )?.[1];

  const PageIcon = pageMeta?.icon;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      const items: Notification[] = data.notifications || [];
      setNotifications(items);
      // Unread = not in readIds set
      const stored = localStorage.getItem(READ_KEY);
      const readSet = stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
      const count = items.filter((n) => !readSet.has(n.id)).length;
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
    <div className="h-10 flex items-center justify-between px-5 shrink-0 relative z-10 mx-1 mt-1 rounded-xl backdrop-blur-[8px] backdrop-saturate-[1.3] bg-white/8 dark:bg-white/3 border border-white/20 dark:border-white/6 shadow-sm">
      {/* Page title */}
      <div className="flex items-center gap-2.5">
        {PageIcon && <PageIcon className="size-4 text-accent" />}
        {pageMeta && <h1 className="text-sm font-semibold">{pageMeta.title}</h1>}
      </div>

      {/* Right side: Search + Notifications */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => { setSearchOpen(true); setSearchQuery(''); }}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          title="검색 (⌘K)"
        >
          <Search className="size-4" />
        </button>

        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              setOpen(!open);
              if (!open) {
                // Mark all current notifications as read
                const allIds = new Set([...readIds, ...notifications.map((n) => n.id)]);
                setReadIds(allIds);
                setUnread(0);
                // Keep only last 200 IDs to prevent localStorage bloat
                const arr = [...allIds].slice(-200);
                localStorage.setItem(READ_KEY, JSON.stringify(arr));
              }
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
            <div className="absolute right-0 top-full mt-2 w-80 glass-float rounded-xl z-50 overflow-hidden">
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
                    const isRead = readIds.has(n.id);
                    return (
                      <button
                        key={n.id}
                        onClick={() => {
                          router.push(meta.path);
                          setOpen(false);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0 cursor-pointer ${isRead ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          {!isRead && (
                            <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
                          )}
                          <span
                            className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-lg text-[10px] font-semibold ${colorClasses(meta.color)}`}
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
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={() => setSearchOpen(false)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-lg glass-float rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="size-4 text-muted-foreground shrink-0" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchResults.length > 0) {
                    router.push(searchResults[0].href);
                    setSearchOpen(false);
                  }
                }}
                placeholder="페이지 검색..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground border border-border">
                ESC
              </kbd>
            </div>
            <div className="max-h-72 overflow-y-auto py-1">
              {searchResults.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  검색 결과가 없습니다
                </div>
              ) : (
                searchResults.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => { router.push(item.href); setSearchOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <Icon className="size-4 text-muted-foreground shrink-0" />
                      <div className="text-left">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-[11px] text-muted-foreground">{item.description}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
