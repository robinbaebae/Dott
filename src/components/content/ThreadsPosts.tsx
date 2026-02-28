'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Unplug } from 'lucide-react';
import { toast } from 'sonner';
import type { ThreadsPost } from '@/types';

export default function ThreadsPosts() {
  const [connected, setConnected] = useState(false);
  const [posts, setPosts] = useState<ThreadsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/threads/posts');
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
      await fetch('/api/threads/posts', { method: 'POST' });
      await loadPosts();
    } finally {
      setRefreshing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const res = await fetch('/api/threads/posts', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to disconnect');
      setConnected(false);
      setPosts([]);
    } catch {
      toast.error('Failed to disconnect Threads');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Threads</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Threads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm font-medium text-muted-foreground mb-1">Threads 연동 준비 중</p>
            <p className="text-xs text-muted-foreground/70">
              Threads API 연동이 완료되면 포스트 성과를 확인할 수 있습니다
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Threads</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh"
            >
              <RefreshCw className={`size-3 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={handleDisconnect} title="Disconnect">
              <Unplug className="size-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No posts found. Try refreshing.
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
                <div className="flex items-end justify-between mb-2">
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(post.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-xs line-clamp-3 mb-2">
                  {post.text || '(No content)'}
                </p>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>likes {post.like_count}</span>
                  <span>replies {post.reply_count}</span>
                  <span>reposts {post.repost_count}</span>
                  <span>quotes {post.quote_count}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
