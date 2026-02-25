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

const STATUS_FLOW: string[] = ['idea_proposed', 'topic_selected', 'drafting', 'review', 'confirmed', 'scheduled', 'published'];

// Version history (#12) — stored in localStorage
const VERSION_CACHE = 'dott_content_versions';

interface VersionEntry {
  projectId: string;
  status: string;
  topic: string;
  drafts: Record<string, unknown>;
  timestamp: string;
  note: string;
}

function loadVersions(): VersionEntry[] {
  try { const d = localStorage.getItem(VERSION_CACHE); return d ? JSON.parse(d) : []; } catch { return []; }
}
function saveVersions(v: VersionEntry[]) { localStorage.setItem(VERSION_CACHE, JSON.stringify(v.slice(-200))); }

export default function ContentProjectHistory() {
  const [projects, setProjects] = useState<ContentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [versions, setVersions] = useState<VersionEntry[]>([]);

  useEffect(() => { setVersions(loadVersions()); }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/content-project?limit=20');
      if (res.ok) {
        const data: ContentProject[] = await res.json();
        // Auto-record version snapshots on status changes
        const existing = loadVersions();
        const existingKeys = new Set(existing.map((v) => `${v.projectId}:${v.status}`));
        let changed = false;
        for (const p of data) {
          const key = `${p.id}:${p.status}`;
          if (!existingKeys.has(key)) {
            existing.push({
              projectId: p.id, status: p.status, topic: p.topic,
              drafts: p.drafts || {}, timestamp: p.updated_at || p.created_at,
              note: `상태 변경: ${STATUS_CONFIG[p.status]?.label || p.status}`,
            });
            changed = true;
          }
        }
        if (changed) { saveVersions(existing); setVersions(existing); }
        setProjects(data);
      }
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

  const getProjectVersions = (id: string) => versions.filter((v) => v.projectId === id).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

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
            <th className="text-center px-4 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[60px]">Ver</th>
            <th className="text-center px-4 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[40px]"></th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => {
            const statusCfg = STATUS_CONFIG[p.status] || { label: p.status, color: 'bg-muted' };
            const pVersions = getProjectVersions(p.id);
            const isExpanded = expandedId === p.id;
            return (
              <tr key={p.id} className="border-b last:border-0">
                <td className="px-4 py-3" colSpan={isExpanded ? 6 : 1}>
                  {isExpanded ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{p.topic}</p>
                        <button onClick={() => setExpandedId(null)} className="text-xs text-muted-foreground hover:text-foreground">닫기</button>
                      </div>
                      {/* Status flow visualization */}
                      <div className="flex items-center gap-1">
                        {STATUS_FLOW.map((s, i) => {
                          const cfg = STATUS_CONFIG[s];
                          const idx = STATUS_FLOW.indexOf(p.status);
                          const isPast = i <= idx;
                          return (
                            <div key={s} className="flex items-center gap-1">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${isPast ? cfg.color : 'bg-muted text-muted-foreground/40'}`}>{cfg.label}</span>
                              {i < STATUS_FLOW.length - 1 && <span className="text-muted-foreground/30">→</span>}
                            </div>
                          );
                        })}
                      </div>
                      {/* Version history (#12) */}
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">버전 이력</p>
                        {pVersions.length === 0 ? (
                          <p className="text-xs text-muted-foreground/60">이력이 없습니다.</p>
                        ) : (
                          <div className="space-y-1">
                            {pVersions.map((v, i) => (
                              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/30">
                                <Badge className={`text-[9px] ${STATUS_CONFIG[v.status]?.color || 'bg-muted'}`}>{STATUS_CONFIG[v.status]?.label || v.status}</Badge>
                                <span className="text-[11px] text-muted-foreground flex-1 truncate">{v.note}</span>
                                <span className="text-[10px] text-muted-foreground/60 shrink-0">{timeAgo(v.timestamp)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-sm truncate max-w-[300px]">{p.topic}</p>
                      {p.ideas?.[p.selected_idea_index ?? 0]?.title && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {p.ideas[p.selected_idea_index ?? 0].title}
                        </p>
                      )}
                    </>
                  )}
                </td>
                {!isExpanded && (
                  <>
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
                      <button onClick={() => setExpandedId(p.id)} className="text-[10px] text-violet-600 hover:underline" title="버전 이력">
                        {pVersions.length > 0 ? `v${pVersions.length}` : '—'}
                      </button>
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
                  </>
                )}
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
