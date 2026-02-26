'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { TrendingUp, RefreshCw, ChevronDown, ChevronRight, X, ExternalLink, Loader2, Pencil, Lightbulb, Bookmark, BookmarkCheck, Rss, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { TrendArticle, TrendSummary, Competitor, CompetitorBriefing, CompetitorAd } from '@/types';
import AddCompetitorDialog from '@/components/trends/AddCompetitorDialog';
import AddAdDialog from '@/components/trends/AddAdDialog';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────
interface TrendItem {
  topic: string;
  summary: string;
  implication: string;
  impact?: 'high' | 'medium' | 'low';
  category?: string;
  sources: number[];
}

interface ParsedSummary {
  trends: TrendItem[];
  action_points: string[];
}

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

interface ContentIdea {
  title: string;
  description: string;
  platform: string;
  hook: string;
  based_on: string;
}

interface CustomFeed {
  id: string;
  name: string;
  url: string;
  category: string;
  enabled: boolean;
}

// ─── Constants ────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  marketing: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  planning: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  ai: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  tech: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
};

const IMPACT_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  high: { label: 'HIGH', dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
  medium: { label: 'MID', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  low: { label: 'LOW', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
};

// ─── Section wrapper ──────────────────────────────────
function Section({
  title,
  badge,
  defaultOpen = false,
  action,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-5 py-4 text-left"
      >
        {open ? <ChevronDown className="size-4 text-muted-foreground shrink-0" /> : <ChevronRight className="size-4 text-muted-foreground shrink-0" />}
        <h2 className="text-sm font-semibold flex-1">{title}</h2>
        {badge}
        {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
      </button>
      {open && <CardContent className="pt-0 pb-5 px-5">{children}</CardContent>}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════
export default function TrendsDashboard() {
  const router = useRouter();

  // ─── Shared state ───────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ─── Curation state ─────────────────────────────────
  const [summary, setSummary] = useState<TrendSummary | null>(null);
  const [articles, setArticles] = useState<TrendArticle[]>([]);
  const [generating, setGenerating] = useState(false);
  const [readerArticle, setReaderArticle] = useState<TrendArticle | null>(null);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerError, setReaderError] = useState(false);
  const readerRef = useRef<HTMLDivElement>(null);

  // ─── Competitor state ───────────────────────────────
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedComp, setSelectedComp] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<CompetitorBriefing | null>(null);
  const [ads, setAds] = useState<CompetitorAd[]>([]);
  const [genBriefing, setGenBriefing] = useState(false);
  const [expandedAd, setExpandedAd] = useState<string | null>(null);

  // ─── Content ideas state ────────────────────────────
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [genIdeas, setGenIdeas] = useState(false);

  // ─── Bookmarked (insight-saved) URLs ────────────────
  const [bookmarkedUrls, setBookmarkedUrls] = useState<Set<string>>(new Set());

  // ─── Custom feeds state ─────────────────────────────
  const [customFeeds, setCustomFeeds] = useState<CustomFeed[]>([]);
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedCat, setNewFeedCat] = useState('marketing');
  const [addingFeed, setAddingFeed] = useState(false);

  // ─── Data fetching ──────────────────────────────────
  const fetchArticles = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/trends', { signal });
      if (res.ok && !signal?.aborted) {
        const data = await res.json();
        setArticles(data.articles ?? data ?? []);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }, []);

  const fetchSummary = useCallback(async (signal?: AbortSignal, autoGenerate = false) => {
    try {
      const res = await fetch('/api/trends/summary', { signal });
      if (res.ok && !signal?.aborted) {
        const data = await res.json();
        if (data && data.id) { setSummary(data); return; }
      }
      if (autoGenerate && !signal?.aborted) generateSummary();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCompetitors = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/competitors', { signal });
      if (res.ok && !signal?.aborted) {
        const data = await res.json();
        setCompetitors(data);
        if (data.length > 0 && !selectedComp) setSelectedComp(data[0].id);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBriefing = useCallback(async (id: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/competitors/${id}/briefing`, { signal });
      if (res.ok && !signal?.aborted) {
        const data = await res.json();
        if (data && data.id) { setBriefing(data); return; }
      }
      if (!signal?.aborted && new Date().getHours() >= 10) {
        setGenBriefing(true);
        try {
          const genRes = await fetch(`/api/competitors/${id}/briefing`, { method: 'POST', signal });
          if (genRes.ok && !signal?.aborted) setBriefing(await genRes.json());
        } finally { setGenBriefing(false); }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }, []);

  const fetchAds = useCallback(async (id: string, signal?: AbortSignal) => {
    try {
      const res = await fetch(`/api/competitors/${id}/ads`, { signal });
      if (res.ok && !signal?.aborted) setAds(await res.json());
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }, []);

  // ─── Custom feeds fetching ───────────────────────────
  const fetchCustomFeeds = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/trends/feeds', { signal });
      if (res.ok && !signal?.aborted) setCustomFeeds(await res.json());
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
  }, []);

  // ─── Master refresh ─────────────────────────────────
  const refreshAll = useCallback(async (signal?: AbortSignal) => {
    fetch('/api/trends', { method: 'POST', signal }).catch(() => {});
    await Promise.all([
      fetchArticles(signal),
      fetchSummary(signal, true),
      fetchCompetitors(signal),
      fetchCustomFeeds(signal),
    ]);
    setLastUpdated(new Date());
  }, [fetchArticles, fetchSummary, fetchCompetitors, fetchCustomFeeds]);

  // ─── Initial load + auto refresh ───────────────────
  // Fetch bookmarked URLs on mount
  const fetchBookmarkedUrls = useCallback(async () => {
    try {
      const res = await fetch('/api/insights');
      if (res.ok) {
        const data = await res.json();
        setBookmarkedUrls(new Set(data.map((d: { url: string }) => d.url.replace(/\/+$/, ''))));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refreshAll(controller.signal);
    fetchBookmarkedUrls();
    const interval = setInterval(() => refreshAll(controller.signal), 5 * 60 * 1000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [refreshAll, fetchBookmarkedUrls]);

  // ─── Competitor selection effect ────────────────────
  useEffect(() => {
    if (!selectedComp) return;
    const controller = new AbortController();
    setBriefing(null);
    setAds([]);
    setExpandedAd(null);
    fetchBriefing(selectedComp, controller.signal);
    fetchAds(selectedComp, controller.signal);
    return () => controller.abort();
  }, [selectedComp, fetchBriefing, fetchAds]);

  // ─── Curation actions ──────────────────────────────
  const generateSummary = async (force = false) => {
    setGenerating(true);
    try {
      const res = await fetch('/api/trends/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      if (res.ok) setSummary(await res.json());
    } catch {} finally { setGenerating(false); }
  };

  const openReader = async (article: TrendArticle) => {
    setReaderArticle(article);
    setReaderError(false);
    setTimeout(() => readerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    if (article.content_text && article.fetched_at) return;
    setReaderLoading(true);
    try {
      const res = await fetch('/api/trends/article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: article.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setReaderArticle(data);
        if (!data.content_text) setReaderError(true);
      } else { setReaderError(true); }
    } catch { setReaderError(true); }
    finally { setReaderLoading(false); }
  };

  // ─── Competitor actions ─────────────────────────────
  const generateCompBriefing = async () => {
    if (!selectedComp) return;
    setGenBriefing(true);
    try {
      const res = await fetch(`/api/competitors/${selectedComp}/briefing`, { method: 'POST' });
      if (res.ok) { setBriefing(await res.json()); toast.success('브리핑 생성 완료'); }
    } catch { toast.error('브리핑 생성 실패'); }
    finally { setGenBriefing(false); }
  };

  const deleteCompetitor = async (id: string) => {
    if (!confirm('이 경쟁사를 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/competitors?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        const remaining = competitors.filter((c) => c.id !== id);
        setCompetitors(remaining);
        if (selectedComp === id) {
          setSelectedComp(remaining[0]?.id ?? null);
          setBriefing(null);
          setAds([]);
        }
      }
    } catch {}
  };

  // ─── Content idea actions ────────────────────────────
  const generateIdeas = async () => {
    setGenIdeas(true);
    try {
      const res = await fetch('/api/trends/ideas', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setIdeas(Array.isArray(data) ? data : []);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || '아이디어 생성 실패');
      }
    } catch { toast.error('아이디어 생성 실패'); }
    finally { setGenIdeas(false); }
  };

  // ─── Swipe save action ─────────────────────────────
  const saveToInsight = async (article: TrendArticle) => {
    const normalizedUrl = article.link.replace(/\/+$/, '');
    // Toggle: if already bookmarked, remove it
    if (bookmarkedUrls.has(normalizedUrl)) {
      try {
        // Find the insight ID to delete
        const res = await fetch('/api/insights');
        if (res.ok) {
          const all = await res.json();
          const match = all.find((d: { url: string }) => d.url.replace(/\/+$/, '') === normalizedUrl);
          if (match) {
            await fetch(`/api/insights?id=${match.id}`, { method: 'DELETE' });
            setBookmarkedUrls((prev) => { const next = new Set(prev); next.delete(normalizedUrl); return next; });
            toast.success('북마크가 해제되었습니다');
          }
        }
      } catch { toast.error('삭제 실패'); }
      return;
    }

    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: article.link }),
      });
      if (res.ok) {
        setBookmarkedUrls((prev) => new Set(prev).add(normalizedUrl));
        // Add category as tag
        const saved = await res.json();
        if (article.category) {
          await fetch('/api/insights', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: saved.id, tags: ['trend', article.category] }),
          });
        }
        toast.success(`인사이트에 저장되었습니다`);
      } else if (res.status === 409) {
        setBookmarkedUrls((prev) => new Set(prev).add(normalizedUrl));
        toast.info('이미 저장된 기사입니다');
      } else {
        toast.error('저장 실패');
      }
    } catch { toast.error('저장 실패'); }
  };

  // ─── Custom feed actions ────────────────────────────
  const addCustomFeed = async () => {
    if (!newFeedName.trim() || !newFeedUrl.trim()) return;
    setAddingFeed(true);
    try {
      const res = await fetch('/api/trends/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFeedName.trim(), url: newFeedUrl.trim(), category: newFeedCat }),
      });
      if (res.ok) {
        const feed = await res.json();
        setCustomFeeds((prev) => [...prev, feed]);
        setNewFeedName('');
        setNewFeedUrl('');
        toast.success('피드 추가 완료');
      } else if (res.status === 409) {
        toast.info('이미 등록된 피드입니다');
      } else {
        toast.error('피드 추가 실패');
      }
    } catch { toast.error('피드 추가 실패'); }
    finally { setAddingFeed(false); }
  };

  const removeCustomFeed = async (id: string) => {
    try {
      const res = await fetch(`/api/trends/feeds?id=${id}`, { method: 'DELETE' });
      if (res.ok) setCustomFeeds((prev) => prev.filter((f) => f.id !== id));
    } catch {}
  };

  // ─── Derived data ───────────────────────────────────
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const parsed = parseSummary(summary);
  const parsedBriefing = parseBriefingData(briefing);
  const selectedCompName = competitors.find((c) => c.id === selectedComp)?.name;

  // Category stats
  const catStats = articles.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + 1;
    return acc;
  }, {});

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refreshAll(); toast.success('데이터 갱신 완료'); }
    catch { toast.error('갱신 실패'); }
    finally { setRefreshing(false); }
  };

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  return (
    <div className="max-w-6xl mx-auto px-6 pt-2 pb-12 space-y-4 animate-in fade-in duration-500">
      {/* ─── Controls ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {today}
          {lastUpdated && <> · 마지막 갱신 {lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</>}
        </p>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="text-xs gap-1.5">
          <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? '갱신 중...' : '전체 갱신'}
        </Button>
      </div>

      {/* ═══ Section 1: AI 브리핑 ═══════════════ */}
      <Section
        title="오늘의 트렌드 브리핑"
        badge={
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            AI 요약 · {articles.length}건 분석
          </Badge>
        }
        action={
          <Button variant="ghost" size="sm" onClick={() => generateSummary(true)} disabled={generating} className="text-[11px] h-7 px-2">
            {generating ? <Loader2 className="size-3 animate-spin" /> : '재생성'}
          </Button>
        }
      >
        {summary && parsed ? (
          <div className="space-y-4">
            {parsed.trends.length > 0 && (
              <div className="space-y-2">
                {parsed.trends.map((t, i) => {
                  const impact = IMPACT_CONFIG[t.impact || 'medium'];
                  const catColor = CATEGORY_COLORS[t.category || ''] || '';
                  return (
                    <div key={i} className="rounded-lg border p-4 hover:bg-muted/10 transition-colors group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className="text-xs font-bold text-muted-foreground/40 mt-0.5 shrink-0 w-5 text-right">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-[13px] font-semibold leading-snug">{t.topic}</h4>
                              {t.category && <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${catColor}`}>{t.category}</span>}
                              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${impact.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${impact.dot}`} />
                                {impact.label}
                              </span>
                            </div>
                            <div className="mt-1.5 space-y-0.5">
                              {summarize(t.summary).map((point, j) => (
                                <p key={j} className="text-[12px] text-muted-foreground leading-relaxed flex gap-1.5">
                                  <span className="text-muted-foreground/30 shrink-0">·</span>
                                  <span>{point}</span>
                                </p>
                              ))}
                            </div>
                            {t.implication && t.implication !== '—' && (
                              <p className="mt-2 text-[12px] text-orange-600 dark:text-orange-400 leading-relaxed bg-orange-500/5 rounded px-2 py-1">
                                💡 {t.implication}
                              </p>
                            )}
                          </div>
                        </div>
                        <button onClick={() => router.push(`/content?topic=${encodeURIComponent(t.topic)}`)} title="콘텐츠 만들기" className="p-1.5 rounded-md text-muted-foreground/30 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-950/30 transition-colors opacity-0 group-hover:opacity-100">
                          <Pencil className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {parsed.action_points.length > 0 && (
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wide">Action Points</p>
                <ul className="space-y-1.5">
                  {parsed.action_points.map((ap, i) => (
                    <li key={i} className="text-[12px] flex gap-2 items-start">
                      <span className="text-orange-500 shrink-0 mt-0.5">→</span>
                      <span className="leading-relaxed">{ap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {parsed.trends.length === 0 && (
              <div className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">{summary.summary_text}</div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground">
            {generating ? (
              <div className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" /> AI 브리핑 생성 중...</div>
            ) : (
              <>오늘의 트렌드 요약이 아직 없습니다. <button onClick={() => generateSummary()} className="underline">생성하기</button></>
            )}
          </div>
        )}
      </Section>

      {/* ═══ Section 2: 콘텐츠 아이디어 허브 ═══ */}
      <Section
        title="콘텐츠 아이디어"
        defaultOpen={false}
        badge={ideas.length > 0 ? <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{ideas.length}개</Badge> : undefined}
        action={
          <Button variant="ghost" size="sm" onClick={generateIdeas} disabled={genIdeas} className="text-[11px] h-7 px-2 gap-1">
            <Lightbulb className="size-3" />
            {genIdeas ? <Loader2 className="size-3 animate-spin" /> : '생성'}
          </Button>
        }
      >
        {genIdeas ? (
          <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> 트렌드 기반 아이디어 생성 중...
          </div>
        ) : ideas.length > 0 ? (
          <div className="space-y-2">
            {ideas.map((idea, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/10 transition-colors group">
                <span className="text-[12px] font-bold text-muted-foreground/40 mt-0.5 shrink-0 w-5 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-semibold leading-snug">{idea.title}</p>
                    <Badge variant="outline" className="text-[11px] px-1.5 py-0 shrink-0">{idea.platform}</Badge>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{idea.description}</p>
                  {idea.hook && <p className="text-[12px] text-orange-600 dark:text-orange-400 mt-1.5 italic">&ldquo;{idea.hook}&rdquo;</p>}
                  <p className="text-[11px] text-muted-foreground/50 mt-1">based on: {idea.based_on}</p>
                </div>
                <button
                  onClick={() => router.push(`/content?topic=${encodeURIComponent(idea.title)}`)}
                  title="이 아이디어로 콘텐츠 만들기"
                  className="p-1.5 rounded-md text-muted-foreground/30 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-950/30 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Pencil className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground">
            오늘의 트렌드를 기반으로 콘텐츠 아이디어를 AI가 제안합니다.
            <br /><button onClick={generateIdeas} className="underline mt-1 inline-block">아이디어 생성하기</button>
          </div>
        )}
      </Section>

      {/* ═══ Section 3: 뉴스 피드 ═══════════════ */}
      <Section
        title="뉴스 피드"
        badge={
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{articles.length}건</Badge>
            {Object.entries(catStats).map(([cat, count]) => (
              <span key={cat} className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[cat] || 'bg-muted text-muted-foreground'}`}>
                {cat} {count}
              </span>
            ))}
          </div>
        }
      >
        {articles.length > 0 ? (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-3 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[72px]">Category</th>
                    <th className="text-left px-3 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">Title</th>
                    <th className="text-left px-3 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[80px]">Source</th>
                    <th className="text-right px-3 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[50px]">Date</th>
                    <th className="w-[32px]" />
                  </tr>
                </thead>
                <tbody>
                  {articles.slice(0, 30).map((a) => {
                    const catColor = CATEGORY_COLORS[a.category] || 'bg-muted text-muted-foreground';
                    const isNew = a.pub_date && (Date.now() - new Date(a.pub_date).getTime()) < 24 * 60 * 60 * 1000;
                    return (
                      <tr
                        key={a.id}
                        className="border-b last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => openReader(a)}
                      >
                        <td className="px-3 py-2.5">
                          <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${catColor}`}>{a.category}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-[12px] hover:underline text-foreground/80 hover:text-foreground line-clamp-1">{a.title}</span>
                          {isNew && <span className="ml-1.5 text-[10px] font-bold text-red-500 uppercase">NEW</span>}
                        </td>
                        <td className="px-3 py-2.5 text-[12px] text-muted-foreground/60 truncate max-w-[80px]">{a.source || '-'}</td>
                        <td className="px-3 py-2.5 text-right text-[12px] text-muted-foreground/50">{a.pub_date ? timeAgo(a.pub_date) : '-'}</td>
                        <td className="px-1 py-2.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); saveToInsight(a); }}
                            title={bookmarkedUrls.has(a.link.replace(/\/+$/, '')) ? '북마크 해제' : '인사이트에 저장'}
                            className={`p-1 rounded-md transition-colors ${
                              bookmarkedUrls.has(a.link.replace(/\/+$/, ''))
                                ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                                : 'text-muted-foreground/30 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                            }`}
                          >
                            {bookmarkedUrls.has(a.link.replace(/\/+$/, ''))
                              ? <BookmarkCheck className="size-3.5" />
                              : <Bookmark className="size-3.5" />
                            }
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Inline reader */}
            {readerArticle && (
              <div ref={readerRef} className="rounded-lg border bg-background overflow-hidden animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-start justify-between gap-3 px-4 py-3 border-b bg-muted/30">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold leading-snug line-clamp-2">{readerArticle.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {readerArticle.source && <span className="text-[11px] text-muted-foreground">{readerArticle.source}</span>}
                      {readerArticle.pub_date && <span className="text-[11px] text-muted-foreground/50">{timeAgo(readerArticle.pub_date)}</span>}
                    </div>
                  </div>
                  <button onClick={() => { setReaderArticle(null); setReaderError(false); }} className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="px-4 py-4 max-h-[400px] overflow-y-auto">
                  {readerLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2"><Loader2 className="size-4 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">본문 로딩 중...</span></div>
                  ) : readerError || !readerArticle.content_text ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground mb-3">본문을 가져올 수 없습니다.</p>
                      <a href={readerArticle.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                        <ExternalLink className="size-3.5" />원문 보기
                      </a>
                    </div>
                  ) : (
                    <>
                      {readerArticle.og_image && (
                        <div className="mb-4 rounded-lg overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={readerArticle.og_image} alt="" className="w-full h-auto max-h-[200px] object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                      )}
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: readerArticle.content_html || readerArticle.content_text }} />
                    </>
                  )}
                </div>
                <div className="px-4 py-2 border-t bg-muted/20 flex items-center justify-end">
                  <a href={readerArticle.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <ExternalLink className="size-3" />원문 보기
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground">수집된 기사가 없습니다.</div>
        )}
      </Section>

      {/* ═══ Section 4: 경쟁사 인텔 ═════════════ */}
      <Section
        title="경쟁사 인텔리전스"
        badge={
          competitors.length > 0 ? (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{competitors.length}개 추적</Badge>
          ) : undefined
        }
        action={<AddCompetitorDialog onAdded={fetchCompetitors} />}
      >
        {competitors.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            등록된 경쟁사가 없습니다.{' '}
            <AddCompetitorDialog onAdded={fetchCompetitors} trigger={<button className="underline">경쟁사 추가</button>} />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Competitor tabs */}
            <div className="inline-flex gap-0.5 p-0.5 rounded-xl bg-muted/30 overflow-x-auto">
              {competitors.map((c) => (
                <div key={c.id} className="flex items-stretch shrink-0">
                  <button
                    onClick={() => setSelectedComp(c.id)}
                    className={`px-3 py-1 rounded-l-lg text-xs font-medium transition-colors ${
                      selectedComp === c.id ? 'bg-card text-foreground elevation-1' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >{c.name}</button>
                  <button
                    onClick={() => deleteCompetitor(c.id)}
                    className={`px-1.5 py-1 rounded-r-lg text-[10px] transition-colors ${
                      selectedComp === c.id ? 'bg-card text-foreground elevation-1 hover:text-destructive' : 'text-muted-foreground hover:bg-destructive hover:text-destructive-foreground'
                    }`}
                    title="삭제"
                  >✕</button>
                </div>
              ))}
            </div>

            {/* Briefing */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">주간 브리핑</h3>
                <Button variant="ghost" size="sm" onClick={generateCompBriefing} disabled={genBriefing} className="text-[11px] h-6 px-2">
                  {genBriefing ? <Loader2 className="size-3 animate-spin" /> : '생성'}
                </Button>
              </div>

              {briefing && parsedBriefing ? (
                <div className="space-y-3">
                  {parsedBriefing.key_points.length > 0 && (
                    <div className="bg-muted/40 rounded-lg p-3">
                      <ol className="space-y-1.5">
                        {parsedBriefing.key_points.map((point, i) => (
                          <li key={i} className="text-[12px] flex gap-2 items-start">
                            <span className="font-bold text-orange-500 shrink-0">{i + 1}.</span>
                            <span className="leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {parsedBriefing.items.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/40">
                            <th className="text-left px-3 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[72px]">구분</th>
                            <th className="text-left px-3 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">동향</th>
                            <th className="text-left px-3 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[140px]">영향</th>
                            <th className="text-left px-3 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[140px]">대응</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedBriefing.items.map((item, i) => (
                            <tr key={i} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                              <td className="px-3 py-2.5 align-top"><Badge variant="outline" className="text-[11px] px-1.5 py-0">{item.category}</Badge></td>
                              <td className="px-3 py-2.5 align-top">
                                <p className="font-medium text-[12px]">{item.title}</p>
                                <p className="text-muted-foreground text-[12px] mt-0.5 leading-relaxed">{item.detail}</p>
                              </td>
                              <td className="px-3 py-2.5 text-muted-foreground text-[12px] align-top leading-relaxed">{item.impact}</td>
                              <td className="px-3 py-2.5 align-top"><span className="text-orange-600 dark:text-orange-400 text-[12px]">{item.action}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  {genBriefing ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-4 animate-spin" /> 브리핑 생성 중...</span> : `${selectedCompName || '경쟁사'}의 브리핑이 아직 없습니다.`}
                </div>
              )}
            </div>

            {/* Ads */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">광고 트래킹</h3>
                {selectedComp && <AddAdDialog competitorId={selectedComp} onAdded={() => selectedComp && fetchAds(selectedComp)} />}
              </div>

              {ads.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  등록된 광고 소재가 없습니다.
                  {selectedComp && <> <AddAdDialog competitorId={selectedComp} onAdded={() => selectedComp && fetchAds(selectedComp)} trigger={<button className="underline">추가</button>} /></>}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left px-3 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[90px]">플랫폼</th>
                        <th className="text-left px-3 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">카피</th>
                        <th className="text-left px-3 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[80px]">CTA</th>
                        <th className="text-left px-3 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[50px]">분석</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ads.map((ad) => (
                        <React.Fragment key={ad.id}>
                          <tr
                            className={`border-b last:border-0 cursor-pointer transition-colors ${expandedAd === ad.id ? 'bg-muted/30' : 'hover:bg-muted/20'}`}
                            onClick={() => setExpandedAd(expandedAd === ad.id ? null : ad.id)}
                          >
                            <td className="px-3 py-2.5 align-top">
                              <div className="flex items-center gap-1">
                                <Badge variant="secondary" className="text-[11px] px-1.5 py-0">{ad.platform}</Badge>
                                <Badge variant="outline" className="text-[11px] px-1.5 py-0">{ad.creative_type}</Badge>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              {ad.copy_text ? (
                                <p className="line-clamp-2 text-[12px] leading-relaxed">{ad.copy_text}</p>
                              ) : (
                                <a href={ad.ad_url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-muted-foreground hover:underline truncate block max-w-[300px]" onClick={(e) => e.stopPropagation()}>{ad.ad_url}</a>
                              )}
                            </td>
                            <td className="px-3 py-2.5 align-top">
                              {ad.cta_text && <span className="inline-block px-2 py-0.5 bg-foreground/10 rounded text-[12px] font-medium">{ad.cta_text}</span>}
                            </td>
                            <td className="px-3 py-2.5 align-top text-center">
                              {ad.ai_analysis ? <span className="text-[11px] text-green-600 dark:text-green-400">{expandedAd === ad.id ? '▲' : '▼'}</span> : <span className="text-[11px] text-muted-foreground">—</span>}
                            </td>
                          </tr>
                          {expandedAd === ad.id && ad.ai_analysis && (
                            <tr className="border-b last:border-0">
                              <td colSpan={4} className="px-3 py-3 bg-muted/20">
                                <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">AI Analysis</p>
                                <div className="text-[12px] text-muted-foreground leading-relaxed whitespace-pre-wrap">{ad.ai_analysis}</div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* ═══ Section 5: RSS 소스 관리 ═══════════ */}
      <Section
        title="RSS 소스 관리"
        defaultOpen={false}
        badge={
          customFeeds.length > 0 ? (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              기본 6개 + 커스텀 {customFeeds.length}개
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">기본 6개</Badge>
          )
        }
      >
        <div className="space-y-4">
          {/* Default feeds (read-only) */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wide">기본 피드</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '디지털 마케팅 트렌드', cat: 'marketing' },
                { label: '마케팅 전략 그로스해킹', cat: 'marketing' },
                { label: '서비스 기획 IT 기획', cat: 'planning' },
                { label: 'AI 인공지능 트렌드', cat: 'ai' },
                { label: 'IT 테크 SaaS 트렌드', cat: 'tech' },
                { label: '퍼포먼스 마케팅 광고', cat: 'marketing' },
              ].map((f) => (
                <span key={f.label} className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md font-medium ${CATEGORY_COLORS[f.cat] || 'bg-muted text-muted-foreground'}`}>
                  <Rss className="size-3" />{f.label}
                </span>
              ))}
            </div>
          </div>

          {/* Custom feeds */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wide">커스텀 피드</p>
            {customFeeds.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {customFeeds.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card/50">
                    <Rss className="size-3 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium flex-1 truncate">{f.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${CATEGORY_COLORS[f.category] || 'bg-muted text-muted-foreground'}`}>{f.category}</span>
                    <span className="text-[10px] text-muted-foreground/40 truncate max-w-[200px]">{f.url}</span>
                    <button onClick={() => removeCustomFeed(f.id)} className="p-1 text-muted-foreground/30 hover:text-destructive transition-colors" title="삭제">
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new feed form */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 min-w-0">
                <Input
                  value={newFeedName}
                  onChange={(e) => setNewFeedName(e.target.value)}
                  placeholder="피드 이름 (예: 요즘IT)"
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex-[2] min-w-0">
                <Input
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomFeed()}
                  placeholder="RSS URL (예: https://example.com/rss)"
                  className="h-8 text-sm"
                />
              </div>
              <select
                value={newFeedCat}
                onChange={(e) => setNewFeedCat(e.target.value)}
                className="h-8 text-xs rounded-md border bg-background px-2"
              >
                <option value="marketing">marketing</option>
                <option value="ai">ai</option>
                <option value="tech">tech</option>
                <option value="planning">planning</option>
              </select>
              <Button variant="outline" onClick={addCustomFeed} disabled={addingFeed || !newFeedName.trim() || !newFeedUrl.trim()} size="sm" className="h-8 px-3 text-xs shrink-0">
                <Plus className="size-3 mr-1" />
                {addingFeed ? '...' : '추가'}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/50 mt-1.5">
              RSS/Atom 피드 URL을 등록하면 다음 갱신 시 자동으로 기사가 수집됩니다.
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ─── Utility functions ────────────────────────────────

function summarize(text: string, max = 3): string[] {
  const sentences = text.split(/(?<=[.다요음니])\s+/).map((s) => s.trim()).filter(Boolean);
  return sentences.length <= max ? sentences : sentences.slice(0, max);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return '방금';
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function parseSummary(summary: TrendSummary | null): ParsedSummary | null {
  if (!summary) return null;
  try {
    const jsonStr = summary.summary_text.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    const parsed = JSON.parse(jsonStr);
    if (parsed.trends && Array.isArray(parsed.trends)) {
      return { trends: parsed.trends, action_points: parsed.action_points || [] };
    }
  } catch {}
  return parseMarkdownSummary(summary.summary_text);
}

function parseMarkdownSummary(text: string): ParsedSummary {
  const trends: TrendItem[] = [];
  const action_points: string[] = [];
  const sections = text.split(/^## /m).filter(Boolean);

  for (const section of sections) {
    const lines = section.trim().split('\n');
    const heading = lines[0]?.replace(/^#+\s*/, '').trim() || '';

    if (/액션\s*포인트|action/i.test(heading)) {
      for (const line of lines.slice(1)) {
        const match = line.match(/^\d+\.\s+\**(.+?)\**\s*[—\-–]\s*(.+)/) || line.match(/^\d+\.\s+\**(.+?)\**$/);
        if (match) {
          const full = match[2] ? `${match[1]} — ${match[2]}` : match[1];
          action_points.push(full.replace(/\*\*/g, ''));
        }
      }
      continue;
    }

    const trendMatch = heading.match(/^\d+\.\s*\S*\s*(.+)/);
    if (!trendMatch) continue;

    const topic = trendMatch[1].replace(/\*\*/g, '').trim();
    let summaryText = '';
    let implication = '';

    for (const line of lines.slice(1)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === '---') continue;
      if (trimmed.startsWith('>')) {
        implication = trimmed.replace(/^>\s*/, '').replace(/\*\*시사점:\*\*\s*/i, '').replace(/\*\*시사점\*\*:?\s*/i, '').replace(/\*\*/g, '').trim();
      } else if (!trimmed.startsWith('#') && !trimmed.startsWith('*2')) {
        if (summaryText) summaryText += ' ';
        summaryText += trimmed.replace(/\*\*/g, '');
      }
    }

    if (topic && (summaryText || implication)) {
      let category: string | undefined;
      const combined = (topic + summaryText + implication).toLowerCase();
      if (/ai|인공지능|llm|gpt|머신러닝/.test(combined)) category = 'ai';
      else if (/마케팅|광고|그로스|ctr|roas|바이럴/.test(combined)) category = 'marketing';
      else if (/기획|ux|플랫폼|서비스|제품/.test(combined)) category = 'planning';
      else if (/테크|saas|보안|개발|인프라/.test(combined)) category = 'tech';

      let impact: 'high' | 'medium' | 'low' = 'medium';
      if (/폭발|급증|핵심|대규모|새로운 가능성|부상/.test(combined)) impact = 'high';

      trends.push({ topic, summary: summaryText, implication: implication || '—', impact, category, sources: [] });
    }
  }
  return { trends, action_points };
}

function parseBriefingData(briefing: CompetitorBriefing | null): ParsedBriefing | null {
  if (!briefing) return null;
  try {
    const parsed = JSON.parse(briefing.briefing_text);
    if (parsed.items && Array.isArray(parsed.items)) {
      return { key_points: parsed.key_points || briefing.key_points || [], items: parsed.items };
    }
  } catch {}
  return { key_points: briefing.key_points || [], items: [] };
}
