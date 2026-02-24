'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ContentProject } from '@/types';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  idea_proposed: { label: '아이디어', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  topic_selected: { label: '주제 선택', color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
  drafting: { label: '작성 중', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  review: { label: '검토 대기', color: 'bg-orange-500/15 text-orange-600 dark:text-orange-400' },
  confirmed: { label: '확정', color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  scheduled: { label: '스케줄', color: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  published: { label: '게시 완료', color: 'bg-green-500/15 text-green-600 dark:text-green-400' },
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-500/15 text-pink-600 dark:text-pink-400',
  threads: 'bg-gray-500/15 text-gray-600 dark:text-gray-400',
  blog: 'bg-green-500/15 text-green-600 dark:text-green-400',
};

export default function ContentProjectHistory() {
  const [projects, setProjects] = useState<ContentProject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/content-project?limit=20');
      if (res.ok) setProjects(await res.json());
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    const interval = setInterval(fetchProjects, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const deleteProject = async (id: string) => {
    try {
      await fetch(`/api/content-project?id=${id}`, { method: 'DELETE' });
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <p className="text-xs text-muted-foreground py-4">로딩 중...</p>;
  }

  if (projects.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        아직 프로젝트가 없어요. 위에서 첫 콘텐츠를 만들어보세요!
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="text-left px-4 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">Topic</th>
            <th className="text-left px-4 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[120px]">Platforms</th>
            <th className="text-left px-4 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[80px]">Status</th>
            <th className="text-right px-4 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[80px]">Date</th>
            <th className="text-center px-4 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[40px]"></th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => {
            const statusCfg = STATUS_CONFIG[p.status] || { label: p.status, color: 'bg-muted' };
            return (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-sm truncate max-w-[300px]">{p.topic}</p>
                  {p.ideas?.[p.selected_idea_index ?? 0]?.title && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {p.ideas[p.selected_idea_index ?? 0].title}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {p.platforms?.map((pl) => (
                      <span key={pl} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PLATFORM_COLORS[pl] || 'bg-muted'}`}>
                        {pl.slice(0, 2).toUpperCase()}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge className={`text-[10px] ${statusCfg.color}`}>{statusCfg.label}</Badge>
                </td>
                <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                  {timeAgo(p.created_at)}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => deleteProject(p.id)}
                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                    title="삭제"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return '방금';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}
