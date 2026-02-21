'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendArticle } from '@/types';
import { supabase } from '@/lib/supabase';
import DashboardCalendar from '@/components/dashboard/DashboardCalendar';
import TaskBoard from '@/components/dashboard/TaskBoard';
import ColorBar from '@/components/dashboard/ColorBar';
import LandingPage from '@/components/landing/LandingPage';

export default function Page() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground text-sm">loading</div>
      </div>
    );
  }

  if (!session) {
    return <LandingPage />;
  }

  return <Dashboard />;
}

/* ---- Dashboard (authenticated) ----------------------------------- */
function Dashboard() {
  const [trends, setTrends] = useState<TrendArticle[]>([]);

  const loadData = async () => {
    const trendsRes = await supabase
      .from('trend_articles')
      .select('*')
      .order('pub_date', { ascending: false })
      .limit(5);
    if (trendsRes.data) setTrends(trendsRes.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 pt-24 pb-12 space-y-6 animate-in fade-in duration-500">
      <h1 className="text-2xl tracking-tight">Dashboard</h1>

      {/* Calendar + Task Board side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashboardCalendar compact />
        <TaskBoard />
      </div>

      {/* Recent trends */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent trends</CardTitle>
            <Link href="/trends">
              <Button variant="ghost" size="sm" className="text-xs">View all</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {trends.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No trend articles collected yet.{' '}
              <Link href="/trends" className="underline">Start collecting</Link> from the trends page.
            </p>
          ) : (
            <div className="space-y-2">
              {trends.map((article) => (
                <a
                  key={article.id}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{article.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {article.source}
                      {article.pub_date && ` · ${new Date(article.pub_date).toLocaleDateString()}`}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 ml-2 text-xs">
                    {article.category === 'beauty' ? 'Beauty' : article.category === 'fashion' ? 'Fashion' : article.category === 'ai' ? 'AI/Tech' : article.category === 'marketing' ? 'Marketing' : 'Planning'}
                  </Badge>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ColorBar />
    </div>
  );
}
