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
    <div className="max-w-6xl mx-auto px-6 pt-2 pb-12 space-y-4 animate-in fade-in duration-500">
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
