'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ContentWorkflow from '@/components/content/ContentWorkflow';
import SeoBriefGenerator from '@/components/content/SeoBriefGenerator';
import EmailSequenceBuilder from '@/components/content/EmailSequenceBuilder';
import ContentCalendar from '@/components/content/ContentCalendar';
import MediaLibrary from '@/components/content/MediaLibrary';
import ContentProjectHistory from '@/components/content/ContentProjectHistory';

const TABS = [
  { key: 'compose', label: 'Compose', activeColor: 'text-pink-600 border-pink-500 dark:text-pink-400 dark:border-pink-400' },
  { key: 'seo', label: 'SEO', activeColor: 'text-blue-600 border-blue-500 dark:text-blue-400 dark:border-blue-400' },
  { key: 'email', label: 'Email', activeColor: 'text-amber-600 border-amber-500 dark:text-amber-400 dark:border-amber-400' },
  { key: 'calendar', label: 'Calendar', activeColor: 'text-emerald-600 border-emerald-500 dark:text-emerald-400 dark:border-emerald-400' },
  { key: 'media', label: 'Media Library', activeColor: 'text-orange-600 border-orange-500 dark:text-orange-400 dark:border-orange-400' },
  { key: 'history', label: 'History', activeColor: 'text-sky-600 border-sky-500 dark:text-sky-400 dark:border-sky-400' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function ContentPageInner() {
  const searchParams = useSearchParams();
  const topicFromTrend = searchParams.get('topic') || '';
  const [activeTab, setActiveTab] = useState<TabKey>('compose');

  return (
    <>
      {/* Tab bar — sticky top, surface background like mockup */}
      <div className="sticky top-0 z-10 flex gap-0 border-b border-border bg-card px-8">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3.5 text-[13px] font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? tab.activeColor
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="p-7">
        {activeTab === 'compose' && <ContentWorkflow initialTopic={topicFromTrend} />}
        {activeTab === 'seo' && <SeoBriefGenerator />}
        {activeTab === 'email' && <EmailSequenceBuilder />}
        {activeTab === 'calendar' && <ContentCalendar />}
        {activeTab === 'media' && <MediaLibrary />}
        {activeTab === 'history' && <ContentProjectHistory />}
      </div>
    </>
  );
}

export default function ContentPage() {
  return (
    <Suspense>
      <ContentPageInner />
    </Suspense>
  );
}
