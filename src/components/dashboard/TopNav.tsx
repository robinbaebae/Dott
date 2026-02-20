'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/automation', label: 'Content' },
  { href: '/ads', label: 'Ads' },
  { href: '/insights', label: 'Insight' },
  { href: '/trends', label: 'Trend' },
];

export default function TopNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  if (pathname === '/' && status !== 'authenticated') {
    return null;
  }

  return (
    <>
      {/* Gradient accent bar */}
      <div className="gradient-top w-full fixed top-0 z-[60]" />

      {/* Floating dark pill nav */}
      <header className="fixed top-5 left-0 right-0 z-50 px-6">
        <nav className="max-w-4xl mx-auto nav-blur text-white px-6 py-3 rounded-full flex items-center justify-between border border-white/10 shadow-2xl">
          {/* Left: Logo */}
          <Link href="/" className="shrink-0">
            <img src="/logo.png" alt="Ditto" className="h-10 w-10 rounded-full" />
          </Link>

          {/* Center: Nav links */}
          <div className="flex items-center gap-8 text-sm text-gray-300">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'hover:text-white transition-colors',
                  pathname === item.href && 'text-white'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right: Auth */}
          <div className="shrink-0">
            {session ? (
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                {session.user?.name ?? 'Sign out'}
              </button>
            ) : (
              <button
                onClick={() => signIn('google')}
                className="bg-white text-black px-5 py-2 rounded-full text-sm hover:bg-[#FF4D00] hover:text-white transition-all duration-300 cursor-pointer"
              >
                Get started
              </button>
            )}
          </div>
        </nav>
      </header>
    </>
  );
}
