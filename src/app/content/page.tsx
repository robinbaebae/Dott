'use client';

import { useState } from 'react';
import ContentWorkflow from '@/components/content/ContentWorkflow';
import ContentCalendar from '@/components/content/ContentCalendar';
import MediaLibrary from '@/components/content/MediaLibrary';
import AdPipeline from '@/components/content/AdPipeline';
import ContentProjectHistory from '@/components/content/ContentProjectHistory';

const TABS = [
  { key: 'compose', label: 'Compose' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'media', label: 'Media Library' },
  { key: 'pipeline', label: 'Ad Pipeline' },
  { key: 'history', label: 'History' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function ContentPage() {
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
                ? 'text-accent border-accent'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="p-7">
        {activeTab === 'compose' && <ContentWorkflow />}
        {activeTab === 'calendar' && <ContentCalendar />}
        {activeTab === 'media' && <MediaLibrary />}
        {activeTab === 'pipeline' && <AdPipeline />}
        {activeTab === 'history' && <ContentProjectHistory />}
      </div>
    </>
  );
}
