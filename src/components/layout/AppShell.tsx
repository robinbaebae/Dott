'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useState, useEffect, lazy, Suspense } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import FloatingPet from './FloatingPet';
import DemoBanner from './DemoBanner';
import ElectronLogin from '@/components/auth/ElectronLogin';
import ExitSummaryModal from '@/components/dashboard/ExitSummaryModal';

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
const AnalyticsPage = lazy(() => import('@/app/analytics/page'));

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
  '/analytics': AnalyticsPage,
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
  const [isElectron, setIsElectron] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ((window as any).electronAPI) setIsElectron(true);
      if (sessionStorage.getItem('dott-guest') === 'true') setIsGuest(true);
      if (sessionStorage.getItem('dott-demo') === 'true') {
        setIsDemo(true);
        // Install demo fetch interceptor + preload ad analytics
        import('@/lib/demo-interceptor').then(({ setupDemoInterceptor }) => {
          setupDemoInterceptor();
        });
        import('@/lib/demo-data').then(({ DEMO_AD_CSV, DEMO_AD_ANALYTICS, DEMO_WEEKLY_REPORT }) => {
          if (!localStorage.getItem('dott_ad_analytics')) {
            const lines = DEMO_AD_CSV.split('\n');
            const rows = [];
            for (let i = 1; i < lines.length; i++) {
              const f = lines[i].split(',');
              if (f.length < 17) continue;
              rows.push({
                date: f[0], campaign: f[1], adSet: f[2], creative: f[3],
                impressions: +f[4], reach: +f[5], frequency: +f[6],
                clicks: +f[7], linkClicks: +f[8], ctrAll: +f[9],
                ctrLink: +f[10], cpc: +f[11], cpm: +f[12],
                spend: +f[13], conversions: +f[14], convValue: +f[15],
                roas: +f[16],
              });
            }
            const stored = { ...DEMO_AD_ANALYTICS, meta: { ...DEMO_AD_ANALYTICS.meta, rows } };
            localStorage.setItem('dott_ad_analytics', JSON.stringify(stored));
          }
          if (!localStorage.getItem('dott_weekly_report')) {
            localStorage.setItem('dott_weekly_report', JSON.stringify(DEMO_WEEKLY_REPORT));
          }
        });
      }
    }
  }, []);

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

  // Not authenticated and not demo and not guest
  if (!session && !isDemo && !isGuest) {
    // Electron app: show login screen directly
    if (isElectron) return <ElectronLogin />;
    // Web: show landing page
    return <>{children}</>;
  }

  const showDemo = isDemo;

  const topOffset = isElectron ? 'pt-12' : 'pt-3';

  // If pathname is not a known tab (e.g. /banner/[id], /chat), render normally
  if (!currentTab) {
    return (
      <div className={`flex h-screen ${topOffset} px-3 pb-0 gap-3 app-gradient`}>
        {isElectron && <div className="fixed top-0 left-0 right-0 h-12 z-50" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />}
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {showDemo && <DemoBanner />}
          <TopBar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
        <FloatingPet />
        <ExitSummaryModal />
      </div>
    );
  }

  // Authenticated (or demo) with tab — render all visited tabs, show only active
  return (
    <div className={`flex h-screen ${topOffset} px-3 pb-0 gap-3 app-gradient`}>
      {isElectron && <div className="fixed top-0 left-0 right-0 h-12 z-50" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />}
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {showDemo && <DemoBanner />}
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
      <ExitSummaryModal />
    </div>
  );
}
