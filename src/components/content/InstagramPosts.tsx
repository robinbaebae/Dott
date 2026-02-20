'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Unplug } from 'lucide-react';
import type { InstagramPost } from '@/types';

export default function InstagramPosts() {
  const [connected, setConnected] = useState(false);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/instagram/posts');
      const data = await res.json();
      setConnected(data.connected);
      setPosts(data.posts ?? []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/instagram/posts', { method: 'POST' });
      await loadPosts();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDisconnect = async () => {
    await fetch('/api/instagram/posts', { method: 'DELETE' });
    setConnected(false);
    setPosts([]);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Instagram</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </CardContent>
      </Card>
    );
  }

  if (!connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Instagram</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-4xl mb-3">📸</p>
            <p className="text-sm text-muted-foreground mb-4">
              Instagram을 연결하면 게시물 성과를 확인할 수 있어요
            </p>
            <Button asChild>
              <a href="/api/instagram/auth">Instagram 연결하기</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Instagram</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleRefresh}
              disabled={refreshing}
              title="새로고침"
            >
              <RefreshCw className={`size-3 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={handleDisconnect} title="연결 해제">
              <Unplug className="size-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            게시물이 없습니다. 새로고침을 눌러주세요.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {posts.slice(0, 9).map((post) => (
              <a
                key={post.id}
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {post.media_type}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(post.timestamp).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <p className="text-xs line-clamp-2 mb-2">
                  {post.caption || '(캡션 없음)'}
                </p>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>❤️ {post.like_count}</span>
                  <span>💬 {post.comments_count}</span>
                  {post.impressions != null && post.impressions > 0 && (
                    <span>👁 {post.impressions}</span>
                  )}
                  {post.reach != null && post.reach > 0 && (
                    <span>📡 {post.reach}</span>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
