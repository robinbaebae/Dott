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
    <div className="max-w-6xl mx-auto px-6 pt-24 pb-16">
      {/* Header */}
      <h1 className="text-2xl font-semibold tracking-tight">Content</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-5">AI Content Studio</p>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-border mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-[13px] font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'text-accent border-accent'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'compose' && <ContentWorkflow />}
      {activeTab === 'calendar' && <ContentCalendar />}
      {activeTab === 'media' && <MediaLibrary />}
      {activeTab === 'pipeline' && <AdPipeline />}
      {activeTab === 'history' && <ContentProjectHistory />}
    </div>
  );
}
