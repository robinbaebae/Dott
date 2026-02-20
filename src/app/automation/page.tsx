'use client';

import BannerGenerator from '@/components/content/BannerGenerator';
import InstagramPosts from '@/components/content/InstagramPosts';
import ThreadsPosts from '@/components/content/ThreadsPosts';
import AdBannerGenerator from '@/components/content/AdBannerGenerator';

export default function ContentPage() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">컨텐츠</h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI로 마케팅 컨텐츠를 만들고 성과를 확인하세요
        </p>
      </div>

      {/* 온드 미디어 컨텐츠 생성 */}
      <BannerGenerator />

      {/* Instagram */}
      <InstagramPosts />

      {/* Threads */}
      <ThreadsPosts />

      {/* 광고 배너 생성 (GDN 사이즈 베리에이션) */}
      <AdBannerGenerator />
    </div>
  );
}
