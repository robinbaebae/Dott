'use client';

import KnowBar from '@/components/shared/KnowBar';
import SocialMediaTracker from '@/components/content/SocialMediaTracker';
import InstagramPosts from '@/components/content/InstagramPosts';
import ThreadsPosts from '@/components/content/ThreadsPosts';
import BannerGenerator from '@/components/content/BannerGenerator';

export default function ContentPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 pt-24 pb-12 space-y-8">
      <h1 className="text-2xl tracking-tight">Content</h1>

      <KnowBar />

      <SocialMediaTracker />
      <InstagramPosts />
      <ThreadsPosts />
      <BannerGenerator />
    </div>
  );
}
