'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { InstagramPost, ThreadsPost } from '@/types';

interface PlatformStats {
  posts: number;
  likes: number;
  comments: number;
  impressions: number;
  reach: number;
}

interface ThreadsStats {
  posts: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
}

function getRecentPosts<T extends { timestamp: string }>(posts: T[], days: number): T[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return posts.filter((p) => new Date(p.timestamp) >= cutoff);
}

export default function SocialMediaTracker() {
  const [igConnected, setIgConnected] = useState(false);
  const [thConnected, setThConnected] = useState(false);
  const [igStats, setIgStats] = useState<PlatformStats | null>(null);
  const [thStats, setThStats] = useState<ThreadsStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [igRes, thRes] = await Promise.all([
        fetch('/api/instagram/posts'),
        fetch('/api/threads/posts'),
      ]);
      const igData = await igRes.json();
      const thData = await thRes.json();

      setIgConnected(igData.connected);
      setThConnected(thData.connected);

      if (igData.connected && igData.posts) {
        const recent: InstagramPost[] = getRecentPosts(igData.posts, 7);
        setIgStats({
          posts: recent.length,
          likes: recent.reduce((s, p) => s + (p.like_count ?? 0), 0),
          comments: recent.reduce((s, p) => s + (p.comments_count ?? 0), 0),
          impressions: recent.reduce((s, p) => s + (p.impressions ?? 0), 0),
          reach: recent.reduce((s, p) => s + (p.reach ?? 0), 0),
        });
      }

      if (thData.connected && thData.posts) {
        const recent: ThreadsPost[] = getRecentPosts(thData.posts, 7);
        setThStats({
          posts: recent.length,
          likes: recent.reduce((s, p) => s + (p.like_count ?? 0), 0),
          replies: recent.reduce((s, p) => s + (p.reply_count ?? 0), 0),
          reposts: recent.reduce((s, p) => s + (p.repost_count ?? 0), 0),
          quotes: recent.reduce((s, p) => s + (p.quote_count ?? 0), 0),
        });
      }
    } catch {
      // best effort
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Owned Media — Last 7 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  const neitherConnected = !igConnected && !thConnected;

  if (neitherConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Owned Media — Last 7 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Instagram 또는 Threads를 연동하면 성과 요약을 확인할 수 있습니다
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Owned Media — Last 7 Days</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Instagram stats */}
          {igConnected && igStats && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-pink-500" />
                <p className="text-sm font-medium">Instagram</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Posts" value={igStats.posts} />
                <Stat label="Likes" value={igStats.likes} />
                <Stat label="Comments" value={igStats.comments} />
                {igStats.impressions > 0 && <Stat label="Impressions" value={igStats.impressions} />}
                {igStats.reach > 0 && <Stat label="Reach" value={igStats.reach} />}
              </div>
            </div>
          )}

          {/* Threads stats */}
          {thConnected && thStats && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-800" />
                <p className="text-sm font-medium">Threads</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Posts" value={thStats.posts} />
                <Stat label="Likes" value={thStats.likes} />
                <Stat label="Replies" value={thStats.replies} />
                <Stat label="Reposts" value={thStats.reposts} />
                <Stat label="Quotes" value={thStats.quotes} />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg">{value.toLocaleString()}</p>
    </div>
  );
}
