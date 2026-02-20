'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: '대시보드', icon: '📊' },
  { href: '/chat', label: 'AI 채팅', icon: '💬' },
  { href: '/tasks', label: '업무 관리', icon: '📋' },
  { href: '/automation', label: '컨텐츠', icon: '🎨' },
  { href: '/trends', label: '트렌드', icon: '📈' },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border backdrop-blur-sm bg-background/80">
      <div className="max-w-7xl mx-auto flex items-center justify-between h-14 px-6">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <h1 className="text-lg font-bold">🐰 Ditto</h1>
        </Link>

        {/* Center: Nav items */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                pathname === item.href
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              )}
            >
              <span className="text-xs">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right: Team label */}
        <p className="text-xs text-muted-foreground shrink-0">코드앤버터 마케팅팀</p>
      </div>
    </header>
  );
}
