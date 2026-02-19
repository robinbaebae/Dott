'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Task, ChatSession, TrendArticle } from '@/types';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [trends, setTrends] = useState<TrendArticle[]>([]);

  useEffect(() => {
    async function load() {
      const [tasksRes, sessionsRes, trendsRes] = await Promise.all([
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('chat_sessions').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('trend_articles').select('*').order('pub_date', { ascending: false }).limit(5),
      ]);
      if (tasksRes.data) setTasks(tasksRes.data);
      if (sessionsRes.data) setSessions(sessionsRes.data);
      if (trendsRes.data) setTrends(trendsRes.data);
    }
    load();
  }, []);

  const todoCount = tasks.filter((t) => t.status === 'todo').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-sm text-muted-foreground mt-1">오늘의 마케팅 현황을 한눈에 확인하세요</p>
      </div>

      {/* 업무 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">할 일</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{todoCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">진행 중</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{inProgressCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">완료</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{doneCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 최근 채팅 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">최근 대화</CardTitle>
              <Link href="/chat">
                <Button variant="ghost" size="sm">모두 보기</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">아직 대화가 없습니다</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <Link
                    key={session.id}
                    href="/chat"
                    className="block p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <p className="text-sm font-medium truncate">{session.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(session.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 빠른 액션 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">빠른 액션</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/chat" className="block">
              <Button variant="outline" className="w-full justify-start gap-2">
                💬 AI에게 질문하기
              </Button>
            </Link>
            <Link href="/tasks" className="block">
              <Button variant="outline" className="w-full justify-start gap-2">
                📋 업무 추가하기
              </Button>
            </Link>
            <Link href="/automation" className="block">
              <Button variant="outline" className="w-full justify-start gap-2">
                ⚡ 자동화 실행하기
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* 최근 업무 */}
      {tasks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">최근 업무</CardTitle>
              <Link href="/tasks">
                <Button variant="ghost" size="sm">모두 보기</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                  <div>
                    <p className="text-sm font-medium">{task.title}</p>
                    {task.due_date && (
                      <p className="text-xs text-muted-foreground">📅 {task.due_date}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {task.status === 'todo' ? '할 일' : task.status === 'in_progress' ? '진행 중' : '완료'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 최근 트렌드 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">최근 트렌드</CardTitle>
            <Link href="/trends">
              <Button variant="ghost" size="sm">모두 보기</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {trends.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              아직 수집된 트렌드 기사가 없습니다.{' '}
              <Link href="/trends" className="underline">트렌드 페이지</Link>에서 수집을 시작해보세요.
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
                    <p className="text-sm font-medium truncate">{article.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {article.source}
                      {article.pub_date && ` · ${new Date(article.pub_date).toLocaleDateString('ko-KR')}`}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 ml-2 text-xs">
                    {article.category === 'beauty' ? '뷰티' : '패션'}
                  </Badge>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
