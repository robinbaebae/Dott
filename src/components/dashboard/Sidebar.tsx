'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: '대시보드', icon: '📊' },
  { href: '/chat', label: 'AI 채팅', icon: '💬' },
  { href: '/tasks', label: '업무 관리', icon: '📋' },
  { href: '/automation', label: '자동화', icon: '⚡' },
  { href: '/trends', label: '트렌드', icon: '📈' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 border-r border-border bg-sidebar flex flex-col h-screen shrink-0">
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-bold text-sidebar-foreground">
          🧈 버터
        </h1>
        <p className="text-xs text-muted-foreground mt-1">마케팅 AI 어시스턴트</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              pathname === item.href
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground">코드앤버터 마케팅팀</p>
      </div>
    </aside>
  );
}
