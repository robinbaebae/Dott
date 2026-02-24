'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { LayoutDashboard, BarChart3, FileText, Search, TrendingUp, Settings, LogOut } from 'lucide-react';
import ThemeToggle from '@/components/shared/ThemeToggle';

const navItems = [
  { href: '/', label: '대시보드', icon: LayoutDashboard },
  { href: '/analytics', label: '분석', icon: BarChart3 },
  { href: '/content', label: '콘텐츠', icon: FileText },
  { href: '/research', label: '리서치', icon: Search },
  { href: '/trends', label: '트렌드', icon: TrendingUp },
  { href: '/settings', label: '설정', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  if (pathname === '/' && status !== 'authenticated') {
    return null;
  }

  return (
    <aside className="w-60 h-screen border-r border-border bg-card flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-6">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo-dott.png" alt="Dott" className="h-8 w-8 rounded-lg" />
          <div>
            <span className="text-lg tracking-tight text-foreground block leading-tight">
              D<span className="text-accent">*</span>tt
            </span>
            <span className="text-[10px] text-muted-foreground leading-none">AI 브랜드 비서</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                active
                  ? 'bg-primary/30 text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Theme toggle + User */}
      <div className="px-3 pb-4 space-y-2">
        <div className="flex items-center gap-2 px-3 py-2">
          <ThemeToggle />
        </div>
        {session && (
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <LogOut className="size-4" />
            {session.user?.name ?? '로그아웃'}
          </button>
        )}
      </div>
    </aside>
  );
}
