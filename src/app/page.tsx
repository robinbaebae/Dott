'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Task, ChatSession, TrendArticle } from '@/types';
import { supabase } from '@/lib/supabase';
import WeeklyCalendar from '@/components/dashboard/WeeklyCalendar';
import DashboardSearch from '@/components/dashboard/DashboardSearch';
import FloatingActions from '@/components/dashboard/FloatingActions';

export default function DashboardPage() {
  const [entered, setEntered] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [landingInput, setLandingInput] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [trends, setTrends] = useState<TrendArticle[]>([]);

  useEffect(() => {
    if (sessionStorage.getItem('ditto_entered') === 'true') {
      setEntered(true);
    }
  }, []);

  useEffect(() => {
    if (!entered) return;
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
  }, [entered]);

  const handleLandingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!landingInput.trim()) return;
    setTransitioning(true);
    setTimeout(() => {
      sessionStorage.setItem('ditto_entered', 'true');
      setEntered(true);
    }, 600);
  };

  const todoCount = tasks.filter((t) => t.status === 'todo').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;

  // Landing state
  if (!entered) {
    return (
      <div
        className={`flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] transition-all duration-500 ${
          transitioning ? 'opacity-0 -translate-y-8' : 'opacity-100 translate-y-0'
        }`}
      >
        <div className="text-center space-y-6 max-w-2xl px-6">
          <h1 className="text-6xl font-bold tracking-tight">
            Me too, Same here
          </h1>
          <p className="text-lg text-muted-foreground">
            마케터의 고민에 공감하고, 함께 해결하는 AI 어시스턴트
          </p>
          <form onSubmit={handleLandingSubmit} className="mt-8">
            <div className="flex gap-2 max-w-md mx-auto">
              <input
                type="text"
                value={landingInput}
                onChange={(e) => setLandingInput(e.target.value)}
                placeholder="오늘 하고 싶은 말을 입력하세요"
                className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <Button type="submit" disabled={!landingInput.trim()}>
                시작하기
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard state
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-sm text-muted-foreground mt-1">오늘의 마케팅 현황을 한눈에 확인하세요</p>
      </div>

      {/* AI 검색 입력창 */}
      <DashboardSearch />

      {/* 주간 캘린더 (타임라인) */}
      <WeeklyCalendar />

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

      {/* Floating actions widget */}
      <FloatingActions />
    </div>
  );
}
