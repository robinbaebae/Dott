'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Search,
  Loader2,
  Trash2,
  ExternalLink,
  FileText,
  Target,
  Link2,
  BarChart3,
  Send,
} from 'lucide-react';
import type { SeoBrief, SeoOutlineSection } from '@/types';

export default function SeoBriefGenerator() {
  const [briefs, setBriefs] = useState<SeoBrief[]>([]);
  const [selected, setSelected] = useState<SeoBrief | null>(null);
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchBriefs = useCallback(async () => {
    try {
      const res = await fetch('/api/seo-brief');
      if (res.ok) {
        const data = await res.json();
        setBriefs(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchBriefs();
  }, [fetchBriefs]);

  const generate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/seo-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '생성 실패');
      }
      const data = await res.json();
      setBriefs((prev) => [data, ...prev]);
      setSelected(data);
      setTopic('');
      toast.success('SEO 브리프가 생성됐어요');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '생성 실패');
    } finally {
      setGenerating(false);
    }
  };

  const deleteBrief = async (id: string) => {
    try {
      await fetch(`/api/seo-brief?id=${id}`, { method: 'DELETE' });
      setBriefs((prev) => prev.filter((b) => b.id !== id));
      if (selected?.id === id) setSelected(null);
      toast.success('삭제됐어요');
    } catch {
      toast.error('삭제 실패');
    }
  };

  const sendToCompose = async () => {
    if (!selected) return;
    setSending(true);
    try {
      const res = await fetch('/api/seo-brief', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, action: 'send_to_compose' }),
      });
      if (!res.ok) throw new Error('전송 실패');
      setSelected((prev) => prev ? { ...prev, status: 'sent_to_compose' } : null);
      setBriefs((prev) =>
        prev.map((b) => (b.id === selected.id ? { ...b, status: 'sent_to_compose' as const } : b))
      );
      toast.success('Compose로 전송됐어요! Compose 탭에서 확인하세요.');
    } catch {
      toast.error('전송 실패');
    } finally {
      setSending(false);
    }
  };

  const statusLabel = (status: SeoBrief['status']) => {
    switch (status) {
      case 'draft': return '초안';
      case 'in_progress': return '진행 중';
      case 'completed': return '완료';
      case 'sent_to_compose': return 'Compose 전송됨';
    }
  };

  const statusColor = (status: SeoBrief['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
      case 'in_progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'sent_to_compose': return 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300';
    }
  };

  return (
    <div className="flex gap-5 h-[calc(100vh-140px)]">
      {/* Left — Input + History */}
      <div className="w-72 shrink-0 flex flex-col gap-4">
        {/* Input */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold">SEO 브리프 생성</h3>
          <Input
            placeholder="주제 또는 키워드 입력"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !generating && generate()}
            disabled={generating}
          />
          <Button
            onClick={generate}
            disabled={generating || !topic.trim()}
            className="w-full"
            size="sm"
          >
            {generating ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1.5" />
                생성 중...
              </>
            ) : (
              <>
                <Search className="size-4 mr-1.5" />
                브리프 생성
              </>
            )}
          </Button>
        </div>

        {/* History */}
        <div className="bg-card border border-border rounded-lg flex-1 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">히스토리</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {briefs.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                아직 브리프가 없어요
              </div>
            ) : (
              briefs.map((brief) => (
                <button
                  key={brief.id}
                  onClick={() => setSelected(brief)}
                  className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/50 transition-colors ${
                    selected?.id === brief.id ? 'bg-muted/70' : ''
                  }`}
                >
                  <div className="text-sm font-medium truncate">{brief.topic}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusColor(brief.status)}`}>
                      {statusLabel(brief.status)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(brief.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Center — Brief Detail */}
      <div className="flex-1 overflow-y-auto">
        {!selected ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            왼쪽에서 주제를 입력하거나 히스토리에서 브리프를 선택하세요
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">{selected.topic}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(selected.status)}`}>
                    {statusLabel(selected.status)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    예상 {selected.word_count_estimate?.toLocaleString()}자
                  </span>
                </div>
              </div>
            </div>

            {/* Keywords */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Target className="size-4 text-violet-500" />
                키워드
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">메인 키워드</div>
                <Badge variant="default" className="text-sm">{selected.primary_keyword}</Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">서브 키워드</div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.secondary_keywords?.map((kw) => (
                    <Badge key={kw} variant="secondary">{kw}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">검색 의도</div>
                <p className="text-sm">{selected.search_intent}</p>
              </div>
            </div>

            {/* Title Tags */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-4 text-violet-500" />
                타이틀 태그 후보
              </div>
              <div className="space-y-2">
                {selected.title_tags?.map((tag, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground mt-0.5 shrink-0">#{i + 1}</span>
                    <span className="text-sm">{tag}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Meta Descriptions */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BarChart3 className="size-4 text-violet-500" />
                메타 디스크립션 후보
              </div>
              <div className="space-y-2">
                {selected.meta_descriptions?.map((desc, i) => (
                  <div key={i} className="bg-muted/50 rounded p-3">
                    <span className="text-xs text-muted-foreground">#{i + 1}</span>
                    <p className="text-sm mt-1">{desc}</p>
                    <span className="text-[11px] text-muted-foreground">{desc.length}자</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Content Outline */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-4 text-violet-500" />
                콘텐츠 아웃라인
              </div>
              <div className="space-y-2">
                {(selected.content_outline as SeoOutlineSection[])?.map((section, i) => (
                  <div
                    key={i}
                    className={`border-l-2 ${section.level === 'h2' ? 'border-violet-500 pl-3' : 'border-violet-300 pl-6'} py-1.5`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground uppercase">{section.level}</span>
                      <span className="text-sm font-medium">{section.heading}</span>
                      {section.word_count > 0 && (
                        <span className="text-[11px] text-muted-foreground">~{section.word_count}자</span>
                      )}
                    </div>
                    {section.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Internal Links */}
            {selected.internal_link_suggestions && (selected.internal_link_suggestions as string[]).length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Link2 className="size-4 text-violet-500" />
                  내부 링크 제안
                </div>
                <div className="space-y-1">
                  {(selected.internal_link_suggestions as string[]).map((link, i) => (
                    <div key={i} className="text-sm flex items-center gap-2">
                      <ExternalLink className="size-3 text-muted-foreground" />
                      {link}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Competitor Notes */}
            {selected.competitor_notes && (
              <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                <div className="text-sm font-semibold">경쟁 콘텐츠 분석</div>
                <p className="text-sm text-muted-foreground">{selected.competitor_notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right — Actions */}
      <div className="w-52 shrink-0 space-y-3">
        {selected && (
          <>
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold">액션</h3>
              <Button
                onClick={sendToCompose}
                disabled={sending || selected.status === 'sent_to_compose'}
                className="w-full"
                size="sm"
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                ) : (
                  <Send className="size-4 mr-1.5" />
                )}
                {selected.status === 'sent_to_compose' ? '전송 완료' : 'Compose로 보내기'}
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteBrief(selected.id)}
                className="w-full"
                size="sm"
              >
                <Trash2 className="size-4 mr-1.5" />
                삭제
              </Button>
            </div>

            {/* Quick Info */}
            <div className="bg-card border border-border rounded-lg p-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>메인 키워드</span>
                <span className="font-medium text-foreground">{selected.primary_keyword}</span>
              </div>
              <div className="flex justify-between">
                <span>서브 키워드</span>
                <span className="font-medium text-foreground">{selected.secondary_keywords?.length || 0}개</span>
              </div>
              <div className="flex justify-between">
                <span>아웃라인 섹션</span>
                <span className="font-medium text-foreground">{(selected.content_outline as SeoOutlineSection[])?.length || 0}개</span>
              </div>
              <div className="flex justify-between">
                <span>예상 분량</span>
                <span className="font-medium text-foreground">{selected.word_count_estimate?.toLocaleString()}자</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
