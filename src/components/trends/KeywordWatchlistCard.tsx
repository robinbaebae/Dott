'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { KeywordWatchItem, KeywordTrend, TrendArticle } from '@/types';
import { toast } from 'sonner';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

type TrendWithChange = KeywordTrend & { prev_count: number; change_rate: number };

function Sparkline({ data, spike }: { data: { date: string; count: number }[]; spike?: boolean }) {
  if (data.length < 2) return <span className="text-[10px] text-muted-foreground/40">—</span>;
  return (
    <ResponsiveContainer width={100} height={28}>
      <LineChart data={data}>
        <XAxis dataKey="date" hide />
        <Tooltip
          contentStyle={{ fontSize: 11, padding: '4px 8px', borderRadius: 6, background: 'var(--background)', border: '1px solid var(--border)' }}
          labelStyle={{ fontSize: 10, color: 'var(--muted-foreground)' }}
          formatter={(value: unknown) => [`${Number(value) || 0}건`, '언급']}
          labelFormatter={(label: unknown) => String(label)}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke={spike ? '#ef4444' : 'currentColor'}
          strokeWidth={spike ? 2 : 1.5}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ChangeBadge({ rate }: { rate: number }) {
  if (rate === 0) return null;
  const isUp = rate > 0;
  const isSpike = rate >= 50;
  const isStrong = Math.abs(rate) >= 30;

  let cls: string;
  let label = '';
  if (isSpike) {
    cls = 'text-red-600 bg-red-500/15 font-bold animate-pulse';
    label = '급상승';
  } else if (isUp && isStrong) {
    cls = 'text-rose-500 bg-rose-500/10';
  } else if (isUp) {
    cls = 'text-orange-500 bg-orange-500/10';
  } else if (isStrong) {
    cls = 'text-blue-500 bg-blue-500/10';
  } else {
    cls = 'text-sky-500 bg-sky-500/10';
  }

  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cls}`}>
      {isUp ? '▲' : '▼'}{Math.abs(rate)}%{label ? ` ${label}` : ''}
    </span>
  );
}

// ─── Alert Settings (#9) ─────────────────────────────────
const ALERT_CACHE_KEY = 'dott_keyword_alerts';

interface AlertConfig {
  keyword: string;
  threshold: number; // change_rate threshold to alert
  enabled: boolean;
}

function loadAlertConfigs(): Record<string, AlertConfig> {
  try {
    const cached = localStorage.getItem(ALERT_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch { return {}; }
}
function saveAlertConfigs(configs: Record<string, AlertConfig>) {
  localStorage.setItem(ALERT_CACHE_KEY, JSON.stringify(configs));
}

// ─── Competitor Keywords (#10) ───────────────────────────
const COMPETITOR_KW_CACHE = 'dott_competitor_keywords';

interface CompetitorKeywordEntry {
  keyword: string;
  competitor: string;
  addedAt: string;
}

function loadCompetitorKeywords(): CompetitorKeywordEntry[] {
  try {
    const cached = localStorage.getItem(COMPETITOR_KW_CACHE);
    return cached ? JSON.parse(cached) : [];
  } catch { return []; }
}
function saveCompetitorKeywords(entries: CompetitorKeywordEntry[]) {
  localStorage.setItem(COMPETITOR_KW_CACHE, JSON.stringify(entries));
}

export default function KeywordWatchlistCard() {
  const [watchlist, setWatchlist] = useState<KeywordWatchItem[]>([]);
  const [trends, setTrends] = useState<TrendWithChange[]>([]);
  const [history, setHistory] = useState<Record<string, { date: string; count: number }[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [articles, setArticles] = useState<TrendArticle[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const prevTrendsRef = useRef<Map<string, number>>(new Map());

  // Alert configs (#9)
  const [alertConfigs, setAlertConfigs] = useState<Record<string, AlertConfig>>({});
  const [showAlertSettings, setShowAlertSettings] = useState(false);

  // Competitor keywords (#10)
  const [competitorKeywords, setCompetitorKeywords] = useState<CompetitorKeywordEntry[]>([]);
  const [showCompetitorPanel, setShowCompetitorPanel] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState('');
  const [newCompKeyword, setNewCompKeyword] = useState('');

  // Load alert configs & competitor keywords on mount
  useEffect(() => {
    setAlertConfigs(loadAlertConfigs());
    setCompetitorKeywords(loadCompetitorKeywords());
  }, []);

  const fetchWatchlist = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/trends/watchlist', { signal });
      if (res.ok && !signal?.aborted) {
        const data = await res.json();
        setWatchlist(data);
        return data as KeywordWatchItem[];
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to fetch watchlist:', err);
    }
    return null;
  }, []);

  const fetchTrends = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/trends/keyword-trends?watchlist=true', { signal });
      if (res.ok && !signal?.aborted) {
        const data: TrendWithChange[] = await res.json();
        setTrends((prev) => {
          // Detect spikes compared to previous fetch
          const prevMap = prevTrendsRef.current;
          const configs = loadAlertConfigs();
          for (const t of data) {
            const prevCount = prevMap.get(t.keyword);
            const alertCfg = configs[t.keyword];
            const threshold = alertCfg?.enabled !== false ? (alertCfg?.threshold ?? 50) : Infinity;
            if (prevCount !== undefined && t.count > prevCount && t.change_rate >= threshold) {
              toast(`"${t.keyword}" 급상승 감지! (▲${t.change_rate}%)`, {
                icon: '🔴',
              });
            }
          }
          // Update prev ref
          const newMap = new Map<string, number>();
          for (const t of data) newMap.set(t.keyword, t.count);
          prevTrendsRef.current = newMap;
          return data;
        });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to fetch trends:', err);
    }
  }, []);

  const fetchHistory = useCallback(async (keywords: string[], signal?: AbortSignal) => {
    if (keywords.length === 0) return;
    try {
      const res = await fetch(
        `/api/trends/keyword-trends?keywords=${encodeURIComponent(keywords.join(','))}&days=30`,
        { signal }
      );
      if (res.ok && !signal?.aborted) {
        const data: { keyword: string; snapshot_date: string; count: number }[] = await res.json();
        const grouped: Record<string, { date: string; count: number }[]> = {};
        for (const d of data) {
          if (!grouped[d.keyword]) grouped[d.keyword] = [];
          grouped[d.keyword].push({ date: d.snapshot_date, count: d.count });
        }
        setHistory(grouped);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to fetch history:', err);
    }
  }, []);

  const fetchArticlesForKeyword = useCallback(async (keyword: string) => {
    try {
      const res = await fetch('/api/trends');
      if (res.ok) {
        const all: TrendArticle[] = await res.json();
        const lower = keyword.toLowerCase();
        setArticles(all.filter((a) => a.title.toLowerCase().includes(lower)).slice(0, 15));
      }
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    }
  }, []);

  const refreshData = useCallback(async (signal?: AbortSignal) => {
    // 1. Fetch watchlist FIRST so keywords show immediately
    const list = await fetchWatchlist(signal);
    // 2. Fetch trends in parallel with background refresh
    await fetchTrends(signal);
    if (list && list.length > 0) {
      await fetchHistory(list.map((w: KeywordWatchItem) => w.keyword), signal);
    }
    // 3. Background: refresh RSS + snapshot (slow), then re-fetch
    try {
      const rssRes = await fetch('/api/trends', { method: 'POST', signal });
      if (!rssRes.ok) console.warn('[watchlist] RSS refresh failed:', rssRes.status);
    } catch (e) {
      if (!(e instanceof DOMException && (e as DOMException).name === 'AbortError')) {
        console.warn('[watchlist] RSS refresh error:', e);
      }
    }
    try {
      const snapRes = await fetch('/api/trends/keyword-trends', { method: 'POST', signal });
      if (!snapRes.ok) console.warn('[watchlist] Snapshot failed:', snapRes.status);
    } catch (e) {
      if (!(e instanceof DOMException && (e as DOMException).name === 'AbortError')) {
        console.warn('[watchlist] Snapshot error:', e);
      }
    }
    // 4. Re-fetch with fresh data
    await fetchTrends(signal);
    const updatedList = await fetchWatchlist(signal);
    if (updatedList && updatedList.length > 0) {
      await fetchHistory(updatedList.map((w: KeywordWatchItem) => w.keyword), signal);
    }
  }, [fetchTrends, fetchWatchlist, fetchHistory]);

  useEffect(() => {
    const controller = new AbortController();
    // Initial load: fetch watchlist immediately, then background refresh
    refreshData(controller.signal);
    // Auto-refresh every 5 minutes
    const interval = setInterval(() => {
      refreshData(controller.signal);
    }, 5 * 60 * 1000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [refreshData]);

  const handleAdd = async () => {
    const kw = newKeyword.trim();
    if (!kw) return;
    setAdding(true);
    try {
      const res = await fetch('/api/trends/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: kw }),
      });
      if (res.ok) {
        const item: KeywordWatchItem = await res.json();
        setWatchlist((prev) => [...prev, item]);
        setNewKeyword('');
        toast.success(`"${item.keyword}" 추가됨 — 데이터 수집 중...`);
        // Immediately search for this keyword
        try {
          await fetch('/api/trends', { method: 'POST' }); // refresh RSS
          await fetch('/api/trends/keyword-trends', { method: 'POST' }); // snapshot
        } catch (e) {
          console.warn('[watchlist] Background refresh failed:', e);
        }
        await fetchTrends();
        await fetchHistory([...watchlist.map((w) => w.keyword), item.keyword]);
        toast.success(`"${item.keyword}" 데이터 수집 완료`);
      } else if (res.status === 409) {
        // Already exists — refresh list to show it
        toast.info(`"${kw}" 이미 추적 중입니다. 목록을 갱신합니다.`);
        setNewKeyword('');
        await refreshData();
      } else {
        const err = await res.json();
        toast.error(err.error || '키워드 추가 실패');
      }
    } catch {
      toast.error('키워드 추가 실패');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (id: string, keyword: string) => {
    try {
      const res = await fetch(`/api/trends/watchlist?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setWatchlist((prev) => prev.filter((w) => w.id !== id));
        if (expanded === keyword) {
          setExpanded(null);
          setArticles([]);
        }
        toast.success(`"${keyword}" 삭제됨`);
      }
    } catch {
      toast.error('삭제 실패');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshData();
      toast.success('트렌드 데이터 갱신 완료');
    } catch (err) {
      console.error('[watchlist] Refresh failed:', err);
      toast.error('갱신 실패 — 콘솔에서 상세 오류 확인');
    } finally {
      setRefreshing(false);
    }
  };

  const toggleExpand = (keyword: string) => {
    if (expanded === keyword) {
      setExpanded(null);
      setArticles([]);
    } else {
      setExpanded(keyword);
      fetchArticlesForKeyword(keyword);
    }
  };

  const getTrend = (keyword: string) => trends.find((t) => t.keyword === keyword);
  const isSpike = (rate: number) => rate >= 50;

  return (
    <Card>
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">키워드 워치리스트</h2>
            {watchlist.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {watchlist.length}개 추적 중
              </Badge>
            )}
            {trends.some((t) => t.change_rate >= 50) && (
              <Badge className="text-[10px] px-1.5 py-0 bg-red-500 text-white">
                급상승 감지
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-xs"
          >
            {refreshing ? '갱신 중...' : 'Refresh'}
          </Button>
        </div>

        {/* Add keyword input */}
        <div className="flex gap-2 mt-3">
          <Input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="키워드 입력 (예: AI 에이전트)"
            className="h-8 text-sm"
          />
          <Button
            onClick={handleAdd}
            disabled={adding || !newKeyword.trim()}
            size="sm"
            className="h-8 px-4 text-xs shrink-0"
          >
            {adding ? '수집 중...' : '추가'}
          </Button>
        </div>

        {/* Toggle buttons for alert settings + competitor monitoring */}
        <div className="flex gap-1.5 mt-2">
          <button onClick={() => { setShowAlertSettings(!showAlertSettings); setShowCompetitorPanel(false); }}
            className={`px-2.5 py-1 rounded-md text-[11px] transition-colors border ${showAlertSettings ? 'bg-amber-500/15 text-amber-600 border-amber-500/30' : 'text-muted-foreground border-border hover:bg-muted/50'}`}>
            알림 설정
          </button>
          <button onClick={() => { setShowCompetitorPanel(!showCompetitorPanel); setShowAlertSettings(false); }}
            className={`px-2.5 py-1 rounded-md text-[11px] transition-colors border ${showCompetitorPanel ? 'bg-violet-500/15 text-violet-600 border-violet-500/30' : 'text-muted-foreground border-border hover:bg-muted/50'}`}>
            경쟁사 모니터링
          </button>
        </div>

        {/* Alert Settings Panel (#9) */}
        {showAlertSettings && (
          <div className="mt-2 rounded-lg border bg-muted/20 p-3 space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">키워드별 알림 임계값</p>
            {watchlist.length === 0 ? (
              <p className="text-xs text-muted-foreground">키워드를 먼저 추가하세요</p>
            ) : (
              watchlist.map((w) => {
                const cfg = alertConfigs[w.keyword] ?? { keyword: w.keyword, threshold: 50, enabled: true };
                return (
                  <div key={w.id} className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const updated = { ...alertConfigs, [w.keyword]: { ...cfg, enabled: !cfg.enabled } };
                        setAlertConfigs(updated); saveAlertConfigs(updated);
                      }}
                      className={`size-4 rounded border text-[10px] flex items-center justify-center ${cfg.enabled ? 'bg-amber-500 border-amber-500 text-white' : 'border-border text-muted-foreground'}`}
                    >{cfg.enabled ? '✓' : ''}</button>
                    <span className="text-xs w-28 truncate">{w.keyword}</span>
                    <input
                      type="range" min={10} max={100} step={10}
                      value={cfg.threshold}
                      onChange={(e) => {
                        const updated = { ...alertConfigs, [w.keyword]: { ...cfg, threshold: Number(e.target.value) } };
                        setAlertConfigs(updated); saveAlertConfigs(updated);
                      }}
                      className="flex-1 h-1 accent-amber-500"
                    />
                    <span className="text-[10px] text-muted-foreground w-10 text-right">≥{cfg.threshold}%</span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Competitor Keyword Monitoring Panel (#10) */}
        {showCompetitorPanel && (
          <div className="mt-2 rounded-lg border bg-muted/20 p-3 space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">경쟁사 키워드 모니터링</p>
            <div className="flex gap-2">
              <Input value={newCompetitor} onChange={(e) => setNewCompetitor(e.target.value)}
                placeholder="경쟁사명" className="h-7 text-xs flex-1" />
              <Input value={newCompKeyword} onChange={(e) => setNewCompKeyword(e.target.value)}
                placeholder="키워드" className="h-7 text-xs flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCompetitor.trim() && newCompKeyword.trim()) {
                    const entry: CompetitorKeywordEntry = { keyword: newCompKeyword.trim(), competitor: newCompetitor.trim(), addedAt: new Date().toISOString() };
                    const updated = [...competitorKeywords, entry];
                    setCompetitorKeywords(updated); saveCompetitorKeywords(updated);
                    setNewCompKeyword('');
                    // Also add to watchlist
                    setNewKeyword(newCompKeyword.trim());
                    setTimeout(() => handleAdd(), 100);
                  }
                }} />
              <Button size="sm" className="h-7 text-[10px] px-2 shrink-0"
                disabled={!newCompetitor.trim() || !newCompKeyword.trim()}
                onClick={() => {
                  const entry: CompetitorKeywordEntry = { keyword: newCompKeyword.trim(), competitor: newCompetitor.trim(), addedAt: new Date().toISOString() };
                  const updated = [...competitorKeywords, entry];
                  setCompetitorKeywords(updated); saveCompetitorKeywords(updated);
                  // Auto-add to watchlist
                  setNewKeyword(newCompKeyword.trim());
                  setNewCompKeyword('');
                  setTimeout(() => handleAdd(), 100);
                }}>추가</Button>
            </div>
            {competitorKeywords.length > 0 && (
              <div className="space-y-1 mt-1">
                {competitorKeywords.map((ck, i) => {
                  const trend = getTrend(ck.keyword);
                  return (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded bg-card/50 border border-border/50">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-600 font-medium">{ck.competitor}</span>
                      <span className="text-xs flex-1 truncate">{ck.keyword}</span>
                      {trend && <ChangeBadge rate={trend.change_rate} />}
                      <span className="text-[10px] text-muted-foreground">{trend?.count ?? '···'}</span>
                      <button onClick={() => {
                        const updated = competitorKeywords.filter((_, j) => j !== i);
                        setCompetitorKeywords(updated); saveCompetitorKeywords(updated);
                      }} className="text-muted-foreground/40 hover:text-destructive text-xs">✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <CardContent className="pt-4">
        {watchlist.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            키워드를 추가하여 트렌드를 추적하세요
          </div>
        ) : (
          <div className="space-y-1">
            {/* Column headers */}
            <div className="flex items-center gap-3 px-3 py-1 text-[10px] text-muted-foreground/60 uppercase tracking-wide">
              <span className="w-36 shrink-0">키워드</span>
              <span className="w-[100px] shrink-0">30일 추이</span>
              <span className="w-12 text-right shrink-0">언급</span>
              <span className="w-20 shrink-0">변화율</span>
              <span className="w-12 text-right shrink-0">기사</span>
            </div>

            {watchlist.map((w) => {
              const trend = getTrend(w.keyword);
              const sparkData = history[w.keyword] || [];
              const isExpanded = expanded === w.keyword;
              const spiked = trend ? isSpike(trend.change_rate) : false;
              const articleCount = trend?.related_article_ids?.length ?? 0;

              return (
                <div key={w.id}>
                  <button
                    onClick={() => toggleExpand(w.keyword)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      spiked
                        ? 'bg-red-500/5 hover:bg-red-500/10 border border-red-500/20'
                        : isExpanded
                          ? 'bg-muted/50'
                          : 'hover:bg-muted/30'
                    }`}
                  >
                    <span className={`font-medium text-sm w-36 truncate shrink-0 ${spiked ? 'text-red-600 dark:text-red-400' : ''}`}>
                      {w.keyword}
                    </span>
                    <span className="w-[100px] shrink-0 text-muted-foreground">
                      <Sparkline data={sparkData} spike={spiked} />
                    </span>
                    <span className={`text-xs w-12 text-right shrink-0 font-mono ${spiked ? 'text-red-600 dark:text-red-400 font-bold' : 'text-muted-foreground'}`}>
                      {trend ? trend.count : <span className="text-muted-foreground/30">···</span>}
                    </span>
                    <span className="w-20 shrink-0">
                      {trend ? <ChangeBadge rate={trend.change_rate} /> : <span className="text-[10px] text-muted-foreground/30">수집중</span>}
                    </span>
                    <span className="text-[11px] text-muted-foreground w-12 text-right shrink-0">
                      {articleCount > 0 ? `${articleCount}건` : '—'}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(w.id, w.keyword);
                      }}
                      className="ml-auto shrink-0 text-muted-foreground/30 hover:text-destructive text-xs px-1 transition-colors cursor-pointer"
                      title="삭제"
                    >
                      ✕
                    </span>
                  </button>

                  {/* Expanded: related articles */}
                  {isExpanded && (
                    <div className="mx-3 mb-2 rounded-lg border bg-muted/20 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          &quot;{w.keyword}&quot; 관련 기사
                        </p>
                        {trend && (
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span>현재 <strong className="text-foreground">{trend.count}</strong>건 언급</span>
                            {trend.prev_count > 0 && (
                              <>
                                <span>·</span>
                                <span>지난주 <strong className="text-foreground">{trend.prev_count}</strong>건</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                      {articles.length > 0 ? (
                        <ul className="space-y-2">
                          {articles.map((a) => (
                            <li key={a.id} className="flex items-start gap-2">
                              <span className="text-muted-foreground/40 shrink-0 text-xs mt-0.5">·</span>
                              <div className="min-w-0 flex-1">
                                <a
                                  href={a.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm hover:underline text-muted-foreground hover:text-foreground line-clamp-1"
                                >
                                  {a.title}
                                </a>
                              </div>
                              <span className="text-[10px] text-muted-foreground/40 shrink-0">
                                {a.source || ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground/60">관련 기사가 없습니다.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
