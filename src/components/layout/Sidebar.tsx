'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import ThemeToggle from '@/components/shared/ThemeToggle';

const navItems = [
  { href: '/', label: 'Dashboard', symbol: '~' },
  { href: '/content', label: 'Content', symbol: '+' },
  { href: '/assets', label: 'Assets', symbol: '&' },
  { href: '/trends', label: 'Trends', symbol: '#' },
  { href: '/research', label: 'Research', symbol: '@' },
  { href: '/tasks', label: 'Tasks', symbol: '!' },
];

const toolItems = [
  { href: '/settings', label: 'Settings', symbol: '*' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  if (pathname === '/' && status !== 'authenticated') {
    return null;
  }

  return (
    <aside className="w-56 h-screen border-r border-border bg-sidebar flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo-dott.png" alt="Dott" className="h-8 w-8 rounded-xl" />
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            D<span className="text-accent">*</span>tt
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-2">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                  active
                    ? 'bg-accent/15 text-accent font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <span className={`w-4 text-center font-mono text-sm ${active ? 'text-accent' : 'text-muted-foreground/60'}`}>
                  {item.symbol}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Tools section */}
        <div className="mt-6">
          <p className="px-3 mb-2 text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">
            Tools
          </p>
          <div className="space-y-0.5">
            {toolItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                    active
                      ? 'bg-accent/15 text-accent font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <span className={`w-4 text-center font-mono text-sm ${active ? 'text-accent' : 'text-muted-foreground/60'}`}>
                    {item.symbol}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Bottom: Theme toggle + User */}
      <div className="px-3 pb-4 space-y-1">
        <div className="flex items-center gap-2 px-3 py-2">
          <ThemeToggle />
        </div>
        {session && (
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <LogOut className="size-3.5" />
            {session.user?.name ?? '로그아웃'}
          </button>
        )}
      </div>
    </aside>
  );
}
