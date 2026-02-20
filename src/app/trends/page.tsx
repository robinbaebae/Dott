'use client';

import SnsRecommendation from '@/components/trends/SnsRecommendation';
import TrendList from '@/components/trends/TrendList';

export default function TrendsPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 pt-24 pb-12 space-y-6">
      <h1 className="text-2xl tracking-tight">Trends</h1>
      <SnsRecommendation />
      <TrendList />
    </div>
  );
}
