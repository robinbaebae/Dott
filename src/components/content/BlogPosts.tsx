'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, FileText } from 'lucide-react';

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

function fmt(n: number): string {
  return n.toLocaleString('ko-KR');
}

export default function BlogPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    // TODO: Replace with actual API call when blog integration is ready
    // fetch('/api/blog/posts').then(r => r.json()).then(data => setPosts(data.posts ?? []));
  }, []);

  const platforms = ['all', ...new Set(posts.map((p) => p.platform))];
  const filtered = filter === 'all' ? posts : posts.filter((p) => p.platform === filter);

  const totalViews = posts.reduce((s, p) => s + p.views, 0);
  const totalLikes = posts.reduce((s, p) => s + p.likes, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Blog</CardTitle>
          </div>
          {posts.length > 0 && (
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
          )}
        </div>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="size-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">연동된 블로그가 없습니다</p>
            <p className="text-xs text-muted-foreground/70 mt-1">블로그 플랫폼을 연동하면 포스트 성과를 추적할 수 있습니다</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg border border-border p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Posts</p>
                <p className="text-lg font-semibold mt-0.5">{posts.length}</p>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
