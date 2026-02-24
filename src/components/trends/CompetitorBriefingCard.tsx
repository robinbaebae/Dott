'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Competitor, CompetitorBriefing } from '@/types';
import AddCompetitorDialog from './AddCompetitorDialog';

interface BriefingItem {
  category: string;
  title: string;
  detail: string;
  impact: string;
  action: string;
}

interface ParsedBriefing {
  key_points: string[];
  items: BriefingItem[];
}

export default function CompetitorBriefingCard() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<CompetitorBriefing | null>(null);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchCompetitors = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/competitors', { signal });
      if (res.ok && !signal?.aborted) {
        const data = await res.json();
        setCompetitors(data);
        if (data.length > 0 && !selected) setSelected(data[0].id);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to fetch competitors:', err);
    }
  };

  const fetchBriefing = async (id: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/competitors/${id}/briefing`, { signal });
      if (res.ok && !signal?.aborted) setBriefing(await res.json());
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to fetch briefing:', err);
    }
  };

  const generateBriefing = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/competitors/${selected}/briefing`, { method: 'POST' });
      if (res.ok) setBriefing(await res.json());
    } catch (err) {
      console.error('Failed to generate briefing:', err);
    } finally {
      setGenerating(false);
    }
  };

  const deleteCompetitor = async (id: string) => {
    if (!confirm('이 경쟁사를 삭제하시겠습니까?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/competitors?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        const remaining = competitors.filter((c) => c.id !== id);
        setCompetitors(remaining);
        if (selected === id) {
          setSelected(remaining[0]?.id ?? null);
          setBriefing(null);
        }
      }
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchCompetitors(controller.signal);
    const interval = setInterval(() => fetchCompetitors(controller.signal), 5 * 60 * 1000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (selected) {
      const controller = new AbortController();
      setBriefing(null);
      fetchBriefing(selected, controller.signal);
      const interval = setInterval(() => fetchBriefing(selected, controller.signal), 5 * 60 * 1000);
      return () => {
        controller.abort();
        clearInterval(interval);
      };
    }
  }, [selected]);

  const parsed = parseBriefing(briefing);
  const selectedName = competitors.find((c) => c.id === selected)?.name;

  return (
    <Card>
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">주간 경쟁사 브리핑</h2>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                매주 월요일 자동
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              경쟁사 동향 AI 분석 · 대응 전략 제안
            </p>
          </div>
          <AddCompetitorDialog onAdded={fetchCompetitors} />
        </div>

        {/* Competitor tabs */}
        {competitors.length > 0 && (
          <div className="flex gap-1.5 mt-3 overflow-x-auto">
            {competitors.map((c) => (
              <div key={c.id} className="flex items-center shrink-0">
                <button
                  onClick={() => setSelected(c.id)}
                  className={`px-3 py-1 rounded-l-full text-xs font-medium transition-colors ${
                    selected === c.id
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {c.name}
                </button>
                <button
                  onClick={() => deleteCompetitor(c.id)}
                  disabled={deleting === c.id}
                  className={`px-1.5 py-1 rounded-r-full text-[10px] transition-colors ${
                    selected === c.id
                      ? 'bg-foreground text-background hover:bg-foreground/80'
                      : 'text-muted-foreground hover:bg-destructive hover:text-destructive-foreground'
                  }`}
                  title="삭제"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <CardContent className="pt-4">
        {competitors.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            등록된 경쟁사가 없습니다.{' '}
            <AddCompetitorDialog
              onAdded={fetchCompetitors}
              trigger={<button className="underline">경쟁사 추가</button>}
            />
          </div>
        ) : briefing && parsed ? (
          <div className="space-y-4">
            {/* Key points */}
            {parsed.key_points.length > 0 && (
              <div className="bg-muted/40 rounded-lg p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  이번 주 주목 포인트
                </p>
                <ol className="space-y-1.5">
                  {parsed.key_points.map((point, i) => (
                    <li key={i} className="text-sm flex gap-2 items-start">
                      <span className="font-bold text-orange-500 shrink-0">{i + 1}.</span>
                      <span className="leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Briefing table */}
            {parsed.items.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide w-[80px]">
                        구분
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">
                        동향
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide w-[160px]">
                        영향
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide w-[160px]">
                        대응
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.items.map((item, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-4 py-3 align-top">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {item.category}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">
                            {item.detail}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs align-top leading-relaxed">
                          {item.impact}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className="text-orange-600 dark:text-orange-400 text-xs leading-relaxed">
                            {item.action}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Fallback: raw text */
              <div className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">
                {briefing.briefing_text}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {selectedName && <p className="mb-3">{selectedName}의 브리핑이 아직 없습니다.</p>}
            <Button onClick={generateBriefing} disabled={generating} variant="outline" size="sm">
              {generating ? 'AI 브리핑 생성 중...' : '브리핑 생성'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function parseBriefing(briefing: CompetitorBriefing | null): ParsedBriefing | null {
  if (!briefing) return null;
  try {
    const parsed = JSON.parse(briefing.briefing_text);
    if (parsed.items && Array.isArray(parsed.items)) {
      return {
        key_points: parsed.key_points || briefing.key_points || [],
        items: parsed.items,
      };
    }
  } catch {
    // Not JSON — legacy format
  }
  return {
    key_points: briefing.key_points || [],
    items: [],
  };
}
