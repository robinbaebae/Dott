'use client';

import { useState } from 'react';
import KeywordWatchlistCard from '@/components/trends/KeywordWatchlistCard';
import IndustryCurationCard from '@/components/trends/IndustryCurationCard';
import CompetitorIntelCard from '@/components/trends/CompetitorIntelCard';

const TABS = [
  { id: 'watchlist', label: '키워드 워치리스트', activeColor: 'bg-rose-500 text-white' },
  { id: 'curation', label: '큐레이션', activeColor: 'bg-sky-500 text-white' },
  { id: 'competitor', label: '경쟁사 분석', activeColor: 'bg-orange-500 text-white' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function TrendsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('watchlist');

  return (
    <div className="max-w-6xl mx-auto px-6 pt-6 pb-16">
      {/* Tab navigation */}
      <nav className="-mx-6 px-6 py-3 border-b mb-8">
        <div className="flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                activeTab === tab.id
                  ? `${tab.activeColor} shadow-sm`
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Tab content */}
      {activeTab === 'watchlist' && <KeywordWatchlistCard />}
      {activeTab === 'curation' && <IndustryCurationCard />}
      {activeTab === 'competitor' && <CompetitorIntelCard />}
    </div>
  );
}
