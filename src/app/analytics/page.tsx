'use client';

import SocialMediaTracker from '@/components/content/SocialMediaTracker';
import SocialMediaChart from '@/components/content/SocialMediaChart';
import InstagramPosts from '@/components/content/InstagramPosts';
import ThreadsPosts from '@/components/content/ThreadsPosts';
import BlogPosts from '@/components/content/BlogPosts';
import AdPerformance from '@/components/content/AdPerformance';
import PerformanceInsights from '@/components/content/PerformanceInsights';

export default function AnalyticsPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 pt-24 pb-12 space-y-8 animate-in fade-in duration-500">
      <h1 className="text-2xl font-semibold tracking-tight bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 dark:from-rose-400 dark:via-pink-400 dark:to-fuchsia-400 bg-clip-text text-transparent">Analytics</h1>

      <SocialMediaTracker />
      <SocialMediaChart />
      <InstagramPosts />
      <ThreadsPosts />
      <BlogPosts />
      <AdPerformance />
      <PerformanceInsights />
    </div>
  );
}
