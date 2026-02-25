'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Competitor, CompetitorBriefing, CompetitorAd } from '@/types';
import AddCompetitorDialog from './AddCompetitorDialog';
import AddAdDialog from './AddAdDialog';
import { toast } from 'sonner';

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

export default function CompetitorIntelCard() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<CompetitorBriefing | null>(null);
  const [ads, setAds] = useState<CompetitorAd[]>([]);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedAd, setExpandedAd] = useState<string | null>(null);

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

  const fetchBriefing = async (id: string, signal?: AbortSignal, autoGenerate = false) => {
    try {
      const res = await fetch(`/api/competitors/${id}/briefing`, { signal });
      if (res.ok && !signal?.aborted) {
        const data = await res.json();
        if (data && data.id) {
          setBriefing(data);
          return;
        }
      }
      // No briefing — auto-generate if it's past 10 AM today
      if (autoGenerate && !signal?.aborted && !generating) {
        const now = new Date();
        if (now.getHours() >= 10) {
          setGenerating(true);
          try {
            const genRes = await fetch(`/api/competitors/${id}/briefing`, { method: 'POST', signal });
            if (genRes.ok && !signal?.aborted) {
              const data = await genRes.json();
              setBriefing(data);
              const name = competitors.find((c) => c.id === id)?.name;
              toast.success(`${name || '경쟁사'} 주간 브리핑이 업데이트되었습니다`);
            }
          } finally {
            setGenerating(false);
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to fetch briefing:', err);
    }
  };

  const fetchAds = async (id: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/competitors/${id}/ads`, { signal });
      if (res.ok && !signal?.aborted) setAds(await res.json());
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to fetch ads:', err);
    }
  };

  const generateBriefing = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/competitors/${selected}/briefing`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setBriefing(data);
        toast.success(`${selectedName || '경쟁사'} 브리핑 생성 완료`);
      }
    } catch (err) {
      console.error('Failed to generate briefing:', err);
      toast.error('브리핑 생성 실패');
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
          setAds([]);
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
      setAds([]);
      setExpandedAd(null);
      Promise.all([
        fetchBriefing(selected, controller.signal, true),
        fetchAds(selected, controller.signal),
      ]);
      const interval = setInterval(() => {
        fetchBriefing(selected, controller.signal, true);
        fetchAds(selected, controller.signal);
      }, 5 * 60 * 1000);
      return () => {
        controller.abort();
        clearInterval(interval);
      };
    }
  }, [selected]);

  const parsed = parseBriefing(briefing);
  const selectedName = competitors.find((c) => c.id === selected)?.name;
  const analyzedCount = ads.filter((a) => a.ai_analysis).length;

  return (
    <Card>
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">경쟁사 분석</h2>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                브리핑 + 광고
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              경쟁사 동향 AI 분석 · 광고 소재 트래킹
            </p>
          </div>
          <AddCompetitorDialog onAdded={fetchCompetitors} />
        </div>

        {/* Competitor tabs */}
        {competitors.length > 0 && (
          <div className="flex gap-1.5 mt-3 overflow-x-auto">
            {competitors.map((c) => (
              <div key={c.id} className="flex items-stretch shrink-0">
                <button
                  onClick={() => setSelected(c.id)}
                  className={`px-3 rounded-l-full text-xs font-medium transition-colors flex items-center ${
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
                  className={`px-1.5 rounded-r-full text-[10px] transition-colors flex items-center ${
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
        ) : (
          <div className="space-y-6">
            {/* === Section 1: 주간 브리핑 === */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-semibold">주간 브리핑</h3>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  매주 월요일 자동
                </Badge>
              </div>

              {briefing && parsed ? (
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
                    <div className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">
                      {briefing.briefing_text}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  {selectedName && <p className="mb-3">{selectedName}의 브리핑이 아직 없습니다.</p>}
                  <Button onClick={generateBriefing} disabled={generating} variant="outline" size="sm">
                    {generating ? 'AI 브리핑 생성 중...' : '브리핑 생성'}
                  </Button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t" />

            {/* === Section 2: 광고 트래킹 === */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">광고 트래킹</h3>
                {selected && (
                  <AddAdDialog
                    competitorId={selected}
                    onAdded={() => selected && fetchAds(selected)}
                  />
                )}
              </div>

              {ads.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  등록된 광고 소재가 없습니다.{' '}
                  {selected && (
                    <AddAdDialog
                      competitorId={selected}
                      onAdded={() => selected && fetchAds(selected)}
                      trigger={<button className="underline">광고 추가하기</button>}
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary bar */}
                  {analyzedCount > 0 && (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        총 <strong className="text-foreground">{ads.length}</strong>건
                      </span>
                      <span>·</span>
                      <span>
                        AI 분석 완료 <strong className="text-foreground">{analyzedCount}</strong>건
                      </span>
                    </div>
                  )}

                  {/* Ad table */}
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide w-[100px]">
                            플랫폼
                          </th>
                          <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide">
                            카피
                          </th>
                          <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide w-[100px]">
                            CTA
                          </th>
                          <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wide w-[60px]">
                            분석
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {ads.map((ad) => (
                          <>
                            <tr
                              key={ad.id}
                              className={`border-b last:border-0 cursor-pointer transition-colors ${
                                expandedAd === ad.id ? 'bg-muted/30' : 'hover:bg-muted/20'
                              }`}
                              onClick={() => setExpandedAd(expandedAd === ad.id ? null : ad.id)}
                            >
                              <td className="px-4 py-3 align-top">
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {ad.platform}
                                  </Badge>
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {ad.creative_type}
                                  </Badge>
                                </div>
                              </td>
                              <td className="px-4 py-3 align-top">
                                {ad.copy_text ? (
                                  <p className="line-clamp-2 text-sm leading-relaxed">{ad.copy_text}</p>
                                ) : (
                                  <a
                                    href={ad.ad_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-muted-foreground hover:underline truncate block max-w-[300px]"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {ad.ad_url}
                                  </a>
                                )}
                              </td>
                              <td className="px-4 py-3 align-top">
                                {ad.cta_text && (
                                  <span className="inline-block px-2 py-0.5 bg-foreground/10 rounded text-xs font-medium">
                                    {ad.cta_text}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 align-top text-center">
                                {ad.ai_analysis ? (
                                  <span className="text-[10px] text-green-600 dark:text-green-400">
                                    {expandedAd === ad.id ? '▲' : '▼'}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">—</span>
                                )}
                              </td>
                            </tr>
                            {/* Expanded AI analysis row */}
                            {expandedAd === ad.id && ad.ai_analysis && (
                              <tr key={`${ad.id}-analysis`} className="border-b last:border-0">
                                <td colSpan={4} className="px-4 py-4 bg-muted/20">
                                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                                    AI Analysis
                                  </p>
                                  <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                    {ad.ai_analysis}
                                  </div>
                                  {ad.ad_url && (
                                    <a
                                      href={ad.ad_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-block mt-2 text-xs text-muted-foreground/60 hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      원본 링크 →
                                    </a>
                                  )}
                                </td>
                              </tr>
                            )}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
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
