'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  platform: 'naver' | 'tistory' | 'wordpress' | 'medium';
  url: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
}

const PLATFORM_STYLE: Record<string, { label: string; color: string }> = {
  naver: { label: 'Naver', color: 'bg-green-500/10 text-green-700' },
  tistory: { label: 'Tistory', color: 'bg-orange-500/10 text-orange-700' },
  wordpress: { label: 'WordPress', color: 'bg-blue-500/10 text-blue-700' },
  medium: { label: 'Medium', color: 'bg-gray-500/10 text-gray-700' },
};

// Mock data
const MOCK_POSTS: BlogPost[] = [
  { id: 'b1', title: '2026 봄 뷰티 트렌드 총정리', excerpt: '올해 봄 시즌 뷰티 트렌드를 정리했습니다. 내추럴 글로우부터 비비드 컬러까지...', platform: 'naver', url: '#', publishedAt: '2026-02-18', views: 3240, likes: 89, comments: 23 },
  { id: 'b2', title: '마케터가 알아야 할 AI 툴 5선', excerpt: 'AI 기반 마케팅 자동화 툴 중 실무에서 바로 쓸 수 있는 5가지를 소개합니다...', platform: 'tistory', url: '#', publishedAt: '2026-02-15', views: 5120, likes: 142, comments: 31 },
  { id: 'b3', title: '인스타그램 릴스 알고리즘 변화', excerpt: '2026년 인스타그램 릴스 알고리즘이 어떻게 변했는지 분석합니다...', platform: 'naver', url: '#', publishedAt: '2026-02-12', views: 2870, likes: 67, comments: 15 },
  { id: 'b4', title: 'How to Build a Content Strategy', excerpt: 'A comprehensive guide to building a content strategy that drives growth...', platform: 'medium', url: '#', publishedAt: '2026-02-10', views: 1890, likes: 54, comments: 8 },
  { id: 'b5', title: '브랜드 스토리텔링 실전 가이드', excerpt: '소비자 공감을 이끌어내는 브랜드 스토리텔링 실전 노하우를 공유합니다...', platform: 'naver', url: '#', publishedAt: '2026-02-08', views: 4560, likes: 112, comments: 27 },
  { id: 'b6', title: 'SEO 최적화 체크리스트 2026', excerpt: '검색엔진 최적화를 위한 최신 체크리스트. 기술 SEO부터 콘텐츠 SEO까지...', platform: 'tistory', url: '#', publishedAt: '2026-02-05', views: 6780, likes: 198, comments: 45 },
];

function fmt(n: number): string {
  return n.toLocaleString('ko-KR');
}

export default function BlogPosts() {
  const [filter, setFilter] = useState<string>('all');

  const platforms = ['all', ...new Set(MOCK_POSTS.map((p) => p.platform))];
  const filtered = filter === 'all' ? MOCK_POSTS : MOCK_POSTS.filter((p) => p.platform === filter);

  const totalViews = MOCK_POSTS.reduce((s, p) => s + p.views, 0);
  const totalLikes = MOCK_POSTS.reduce((s, p) => s + p.likes, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Blog</CardTitle>
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Mock Data</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {platforms.map((p) => (
                <button
                  key={p}
                  onClick={() => setFilter(p)}
                  className={`px-2 py-1 rounded-md text-[11px] transition-colors ${
                    filter === p
                      ? 'bg-muted text-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  {p === 'all' ? 'All' : PLATFORM_STYLE[p]?.label ?? p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Posts</p>
            <p className="text-lg font-semibold mt-0.5">{MOCK_POSTS.length}</p>
          </div>
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Views</p>
            <p className="text-lg font-semibold mt-0.5">{fmt(totalViews)}</p>
          </div>
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Likes</p>
            <p className="text-lg font-semibold mt-0.5">{fmt(totalLikes)}</p>
          </div>
        </div>

        {/* Posts list */}
        <div className="space-y-2">
          {filtered.map((post) => (
            <a
              key={post.id}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className={`text-[10px] ${PLATFORM_STYLE[post.platform]?.color}`}>
                    {PLATFORM_STYLE[post.platform]?.label}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(post.publishedAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                <p className="text-sm font-medium truncate">{post.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{post.excerpt}</p>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                  <span>Views {fmt(post.views)}</span>
                  <span>Likes {fmt(post.likes)}</span>
                  <span>Comments {fmt(post.comments)}</span>
                </div>
              </div>
              <ExternalLink className="size-3.5 text-muted-foreground shrink-0 mt-1" />
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
