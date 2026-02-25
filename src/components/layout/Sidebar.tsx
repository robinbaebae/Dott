'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useState, useEffect } from 'react';
import ThemeToggle from '@/components/shared/ThemeToggle';

const STORAGE_KEY = 'dott-sidebar-collapsed';

const navItems = [
  { href: '/', label: 'Dashboard', symbol: '~', color: '', bold: true },
  { href: '/ads', label: 'Ad Analytics', symbol: '$', color: 'text-orange-500 dark:text-orange-400' },
  { href: '/assets', label: 'Assets', symbol: '&', color: 'text-sky-500 dark:text-sky-400' },
  { href: '/content', label: 'Content', symbol: '+', color: 'text-pink-500 dark:text-pink-400' },
  { href: '/influencer', label: 'Influencer', symbol: '%', color: 'text-purple-500 dark:text-purple-400' },
  { href: '/insight', label: 'Insight', symbol: '@', color: 'text-blue-500 dark:text-blue-400' },
  { href: '/memo', label: 'Memo', symbol: '=', color: 'text-teal-500 dark:text-teal-400' },
  { href: '/tasks', label: 'Tasks', symbol: '!', color: 'text-amber-500 dark:text-amber-400' },
  { href: '/trends', label: 'Trends', symbol: '#', color: 'text-rose-500 dark:text-rose-400' },
];

const toolItems = [
  { href: '/settings', label: 'Settings', symbol: '*' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  if (pathname === '/' && status !== 'authenticated') {
    return null;
  }

  return (
    <aside
      className={`${
        collapsed ? 'w-14' : 'w-56'
      } h-screen border-r border-border bg-sidebar flex flex-col shrink-0 transition-all duration-200 overflow-hidden`}
    >
      {/* Logo + Toggle */}
      <div className={`flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-5'} py-5`}>
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/logo-dott.png" alt="Dott" className="h-8 w-8 rounded-xl" />
            <span className="text-[15px] font-semibold tracking-tight text-foreground">
              D<span className="text-accent">*</span>tt
            </span>
          </Link>
        )}
        <button
          onClick={toggleCollapsed}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 pt-2">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 ${collapsed ? 'justify-center px-1' : 'px-3'} py-2 rounded-lg text-[13px] transition-colors ${
                  active
                    ? 'bg-accent/15 text-accent font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <span className={`w-4 text-center font-mono text-sm shrink-0 ${active ? 'text-accent' : (item.color || 'text-muted-foreground/60')}`}>
                  {item.symbol}
                </span>
                {!collapsed && <span className={`truncate ${'bold' in item && item.bold ? 'font-semibold' : ''}`}>{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Tools section */}
        <div className="mt-6">
          {!collapsed && (
            <p className="px-3 mb-2 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
              Tools
            </p>
          )}
          <div className="space-y-0.5">
            {toolItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 ${collapsed ? 'justify-center px-1' : 'px-3'} py-2 rounded-lg text-[13px] transition-colors ${
                    active
                      ? 'bg-accent/15 text-accent font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <span className={`w-4 text-center font-mono text-sm shrink-0 ${active ? 'text-accent' : 'text-muted-foreground/60'}`}>
                    {item.symbol}
                  </span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Bottom: Theme toggle + User */}
      <div className="px-2 pb-4 space-y-1">
        <div className={`flex items-center gap-2 ${collapsed ? 'justify-center px-1' : 'px-3'} py-2`}>
          <ThemeToggle />
        </div>
        {session && (
          <button
            onClick={() => signOut()}
            title={collapsed ? (session.user?.name ?? '로그아웃') : undefined}
            className={`w-full flex items-center gap-3 ${collapsed ? 'justify-center px-1' : 'px-3'} py-2 rounded-lg text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer`}
          >
            <LogOut className="size-3.5 shrink-0" />
            {!collapsed && <span className="truncate">{session.user?.name ?? '로그아웃'}</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
