'use client';

import DottPrompt from '@/components/dashboard/DottPrompt';

export default function DashboardPageClient() {
  return (
    <div className="relative min-h-full">
      <div className="fixed inset-0 -z-10 dashboard-gradient" />
      <div className="max-w-5xl mx-auto px-6 pt-2 pb-4 animate-in fade-in duration-500">
        <DottPrompt />
      </div>
    </div>
  );
}
