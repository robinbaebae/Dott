'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Competitor, CompetitorAd } from '@/types';
import AddAdDialog from './AddAdDialog';

export default function CompetitorAdTrackingCard() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [ads, setAds] = useState<CompetitorAd[]>([]);
  const [expandedAd, setExpandedAd] = useState<string | null>(null);

  const fetchCompetitors = async () => {
    try {
      const res = await fetch('/api/competitors');
      if (res.ok) {
        const data = await res.json();
        setCompetitors(data);
        if (data.length > 0 && !selected) setSelected(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch competitors:', err);
    }
  };

  const fetchAds = async (id: string) => {
    try {
      const res = await fetch(`/api/competitors/${id}/ads`);
      if (res.ok) setAds(await res.json());
    } catch (err) {
      console.error('Failed to fetch ads:', err);
    }
  };

  useEffect(() => {
    fetchCompetitors();
    const interval = setInterval(fetchCompetitors, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selected) {
      setAds([]);
      fetchAds(selected);
      const interval = setInterval(() => fetchAds(selected), 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [selected]);

  const analyzedCount = ads.filter((a) => a.ai_analysis).length;

  return (
    <Card>
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">경쟁사 광고 소재 트래킹</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              광고 소재 수집 · AI 카피/CTA 분석
            </p>
          </div>
          <div className="flex items-center gap-2">
            {competitors.length > 0 && (
              <select
                value={selected || ''}
                onChange={(e) => setSelected(e.target.value)}
                className="rounded-full border border-input bg-background px-3 py-1 text-xs font-medium"
              >
                {competitors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            {selected && (
              <AddAdDialog
                competitorId={selected}
                onAdded={() => selected && fetchAds(selected)}
              />
            )}
          </div>
        </div>
      </div>

      <CardContent className="pt-4">
        {competitors.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            경쟁사를 먼저 등록해주세요.
          </div>
        ) : ads.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
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
      </CardContent>
    </Card>
  );
}
