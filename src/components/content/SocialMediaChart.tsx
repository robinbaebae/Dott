'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { InstagramPost, ThreadsPost } from '@/types';

interface DayData {
  date: string;
  label: string;
  igLikes: number;
  igComments: number;
  igPosts: number;
  thLikes: number;
  thReplies: number;
  thPosts: number;
}

function getLast7Days(): { date: string; label: string }[] {
  const days: { date: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
  }
  return days;
}

function aggregateByDay(
  igPosts: InstagramPost[],
  thPosts: ThreadsPost[],
): DayData[] {
  const days = getLast7Days();
  const igMap = new Map<string, InstagramPost[]>();
  const thMap = new Map<string, ThreadsPost[]>();

  for (const p of igPosts) {
    const key = new Date(p.timestamp).toISOString().slice(0, 10);
    if (!igMap.has(key)) igMap.set(key, []);
    igMap.get(key)!.push(p);
  }

  for (const p of thPosts) {
    const key = new Date(p.timestamp).toISOString().slice(0, 10);
    if (!thMap.has(key)) thMap.set(key, []);
    thMap.get(key)!.push(p);
  }

  return days.map(({ date, label }) => {
    const ig = igMap.get(date) ?? [];
    const th = thMap.get(date) ?? [];
    return {
      date,
      label,
      igLikes: ig.reduce((s, p) => s + (p.like_count ?? 0), 0),
      igComments: ig.reduce((s, p) => s + (p.comments_count ?? 0), 0),
      igPosts: ig.length,
      thLikes: th.reduce((s, p) => s + (p.like_count ?? 0), 0),
      thReplies: th.reduce((s, p) => s + (p.reply_count ?? 0), 0),
      thPosts: th.length,
    };
  });
}

type MetricKey = 'likes' | 'engagement' | 'posts';

const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'likes', label: 'Likes' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'posts', label: 'Posts' },
];

function getDataKeys(metric: MetricKey): { ig: keyof DayData; th: keyof DayData; igLabel: string; thLabel: string } {
  switch (metric) {
    case 'likes':
      return { ig: 'igLikes', th: 'thLikes', igLabel: 'IG Likes', thLabel: 'TH Likes' };
    case 'engagement':
      return { ig: 'igComments', th: 'thReplies', igLabel: 'IG Comments', thLabel: 'TH Replies' };
    case 'posts':
      return { ig: 'igPosts', th: 'thPosts', igLabel: 'IG Posts', thLabel: 'TH Posts' };
  }
}

export default function SocialMediaChart() {
  const [data, setData] = useState<DayData[]>([]);
  const [igConnected, setIgConnected] = useState(false);
  const [thConnected, setThConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<MetricKey>('likes');

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

      const igPosts: InstagramPost[] = igData.connected ? igData.posts ?? [] : [];
      const thPosts: ThreadsPost[] = thData.connected ? thData.posts ?? [] : [];

      setData(aggregateByDay(igPosts, thPosts));
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
          <CardTitle className="text-base">Daily Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-[260px] flex items-center justify-center">
          <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!igConnected && !thConnected) return null;

  const keys = getDataKeys(metric);
  const hasIg = igConnected;
  const hasTh = thConnected;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Daily Trend — Last 7 Days</CardTitle>
          <div className="flex gap-1">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors ${
                  metric === m.key
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="igGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E1306C" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#E1306C" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="thGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#000000" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#000000" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,77,0,0.08)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid rgba(255,77,0,0.2)',
              }}
            />
            <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            {hasIg && (
              <Area
                type="monotone"
                dataKey={keys.ig}
                name={keys.igLabel}
                stroke="#E1306C"
                strokeWidth={2}
                fill="url(#igGrad)"
                dot={{ r: 3, fill: '#E1306C' }}
                activeDot={{ r: 5 }}
              />
            )}
            {hasTh && (
              <Area
                type="monotone"
                dataKey={keys.th}
                name={keys.thLabel}
                stroke="#000000"
                strokeWidth={2}
                fill="url(#thGrad)"
                dot={{ r: 3, fill: '#000000' }}
                activeDot={{ r: 5 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
