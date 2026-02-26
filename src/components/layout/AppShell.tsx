'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useState, useEffect, lazy, Suspense } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import FloatingPet from './FloatingPet';

/* ── Lazy-load all tab pages ── */
const DashboardPage = lazy(() => import('@/app/page.client'));
const AdsPage = lazy(() => import('@/app/ads/page'));
const AssetsPage = lazy(() => import('@/app/assets/page'));
const ContentPage = lazy(() => import('@/app/content/page'));
const InfluencerPage = lazy(() => import('@/app/influencer/page'));
const InsightPage = lazy(() => import('@/app/insight/page'));
const MemoPage = lazy(() => import('@/app/memo/page'));
const TasksPage = lazy(() => import('@/app/tasks/page'));
const TrendsPage = lazy(() => import('@/app/trends/page'));
const LedgerPage = lazy(() => import('@/app/ledger/page'));
const PromotionPage = lazy(() => import('@/app/promotion/page'));
const ToolsPage = lazy(() => import('@/app/tools/page'));
const SettingsPage = lazy(() => import('@/app/settings/page'));

/* ── Tab registry ── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TAB_PAGES: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  '/': DashboardPage,
  '/ads': AdsPage,
  '/assets': AssetsPage,
  '/content': ContentPage,
  '/influencer': InfluencerPage,
  '/insight': InsightPage,
  '/memo': MemoPage,
  '/tasks': TasksPage,
  '/trends': TrendsPage,
  '/ledger': LedgerPage,
  '/promotion': PromotionPage,
  '/tools': ToolsPage,
  '/settings': SettingsPage,
};

const TAB_PATHS = Object.keys(TAB_PAGES);

function TabFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-pulse text-muted-foreground text-sm">로딩 중...</div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Track which tabs have been visited (lazy mount)
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(new Set());

  // Determine current tab path (normalize sub-paths)
  const currentTab = TAB_PATHS.find(
    (p) => p === pathname || (p !== '/' && pathname.startsWith(p + '/'))
  ) || null;

  // Mount tab when first visited
  useEffect(() => {
    if (currentTab) {
      setMountedTabs((prev) => {
        if (prev.has(currentTab)) return prev;
        return new Set(prev).add(currentTab);
      });
    }
  }, [currentTab]);

  // Loading state
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen app-gradient">
        <div className="animate-pulse text-muted-foreground text-sm">로딩 중</div>
      </div>
    );
  }

  // Not authenticated — render children (landing page) full-screen
  if (!session) {
    return <>{children}</>;
  }

  // If pathname is not a known tab (e.g. /banner/[id], /chat), render normally
  if (!currentTab) {
    return (
      <div className="flex h-screen pt-10 px-3 pb-3 gap-3 app-gradient">
        <div className="fixed top-0 left-0 right-0 h-10 z-50" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
        <FloatingPet />
      </div>
    );
  }

  // Authenticated with tab — render all visited tabs, show only active
  return (
    <div className="flex h-screen pt-10 px-3 pb-3 gap-3 app-gradient">
      <div className="fixed top-0 left-0 right-0 h-10 z-50" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-hidden relative">
          {TAB_PATHS.map((tabPath) => {
            if (!mountedTabs.has(tabPath)) return null;
            const TabComponent = TAB_PAGES[tabPath];
            const isActive = tabPath === currentTab;
            return (
              <div
                key={tabPath}
                className="absolute inset-0 overflow-auto"
                style={{ display: isActive ? 'block' : 'none' }}
              >
                <Suspense fallback={<TabFallback />}>
                  <TabComponent />
                </Suspense>
              </div>
            );
          })}
        </main>
      </div>
      <FloatingPet />
    </div>
  );
}
