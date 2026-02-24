'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendSummary, TrendArticle, TrendCategory } from '@/types';
import { supabase } from '@/lib/supabase';

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

const FILTER_TABS: { value: TrendCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'planning', label: 'Planning' },
  { value: 'ai', label: 'AI' },
  { value: 'tech', label: 'Tech' },
];

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

export default function IndustryCurationCard() {
  const [summary, setSummary] = useState<TrendSummary | null>(null);
  const [articles, setArticles] = useState<TrendArticle[]>([]);
  const [generating, setGenerating] = useState(false);
  const [showArticles, setShowArticles] = useState(false);
  const [filter, setFilter] = useState<TrendCategory | 'all'>('all');

  const fetchSummary = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/trends/summary', { signal });
      if (res.ok && !signal?.aborted) setSummary(await res.json());
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('Failed to fetch summary:', err);
    }
  };

  const fetchArticles = async (currentFilter: TrendCategory | 'all', signal?: AbortSignal) => {
    const ago = new Date();
    ago.setDate(ago.getDate() - 7);

    let query = supabase
      .from('trend_articles')
      .select('*')
      .gte('pub_date', ago.toISOString())
      .order('pub_date', { ascending: false })
      .limit(30);

    if (currentFilter !== 'all') query = query.eq('category', currentFilter);

    const { data } = await query;
    if (!signal?.aborted) setArticles(data ?? []);
  };

  const generateSummary = async () => {
    setGenerating(true);
    try {
      const body = filter !== 'all' ? { category: filter } : {};
      const res = await fetch('/api/trends/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) setSummary(await res.json());
    } catch (err) {
      console.error('Failed to generate summary:', err);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchSummary(controller.signal);
    fetchArticles(filter, controller.signal);
    const interval = setInterval(() => {
      fetchSummary(controller.signal);
      fetchArticles(filter, controller.signal);
    }, 5 * 60 * 1000);
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [filter]);

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const parsed = parseSummary(summary);

  // Category stats for articles
  const catStats = articles.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <Card>
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">업계 트렌드 큐레이션</h2>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                5분 읽기
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{today} · AI 기반 뉴스 요약</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={generateSummary}
            disabled={generating}
            className="text-xs"
          >
            {generating ? '생성 중...' : 'Generate'}
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mt-3">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === tab.value
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category stats bar */}
        {articles.length > 0 && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t">
            <span className="text-[11px] text-muted-foreground">
              {articles.length}건 수집
            </span>
            <div className="flex gap-2">
              {Object.entries(catStats).map(([cat, count]) => (
                <span
                  key={cat}
                  className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    CATEGORY_COLORS[cat] || 'bg-muted text-muted-foreground'
                  }`}
                >
                  {cat} {count}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <CardContent className="pt-4">
        {summary && parsed ? (
          <div className="space-y-4">
            {/* Trends table */}
            {parsed.trends.length > 0 && (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-10">
                        #
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[160px]">
                        Topic
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
                        Summary
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[200px]">
                        Implication
                      </th>
                      <th className="text-center px-4 py-2.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[70px]">
                        Impact
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.trends.map((t, i) => {
                      const impact = IMPACT_CONFIG[t.impact || 'medium'];
                      const catColor = CATEGORY_COLORS[t.category || ''] || '';
                      return (
                        <tr
                          key={i}
                          className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-3 text-muted-foreground text-xs align-top">
                            {i + 1}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="font-medium text-sm leading-snug">{t.topic}</div>
                            {t.category && (
                              <span
                                className={`inline-block text-[10px] px-1.5 py-0.5 rounded mt-1 font-medium ${catColor}`}
                              >
                                {t.category}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <ul className="space-y-1">
                              {summarize(t.summary).map((point, j) => (
                                <li key={j} className="flex gap-1.5 text-muted-foreground text-[13px] leading-snug">
                                  <span className="text-muted-foreground/40 shrink-0">·</span>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                            {t.sources.length > 0 && (
                              <span className="text-[10px] text-muted-foreground/50 mt-1 inline-block">
                                [{t.sources.join(',')}]
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <span className="text-orange-600 dark:text-orange-400 text-xs leading-relaxed">
                              {t.implication}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top text-center">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold ${impact.text}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${impact.dot}`} />
                              {impact.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Action points */}
            {parsed.action_points.length > 0 && (
              <div className="bg-muted/40 rounded-lg p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Action Points
                </p>
                <ul className="space-y-1.5">
                  {parsed.action_points.map((ap, i) => (
                    <li key={i} className="text-sm flex gap-2 items-start">
                      <span className="text-orange-500 shrink-0 mt-0.5">→</span>
                      <span className="leading-relaxed">{ap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Fallback: raw text */}
            {parsed.trends.length === 0 && (
              <div className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">
                {summary.summary_text}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">
            오늘의 트렌드 요약이 아직 없습니다.{' '}
            <button onClick={generateSummary} disabled={generating} className="underline">
              Generate
            </button>
            를 눌러주세요.
          </div>
        )}

        {/* Article list toggle */}
        <div className="mt-4 pt-4 border-t">
          <button
            onClick={() => setShowArticles(!showArticles)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-medium"
          >
            <span className="text-[10px]">{showArticles ? '▼' : '▶'}</span>
            원본 기사 ({articles.length}건)
          </button>
          {showArticles && articles.length > 0 && (
            <div className="mt-3 overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-3 py-2 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[80px]">
                      Category
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
                      Title
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[80px]">
                      Source
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-[11px] text-muted-foreground uppercase tracking-wide w-[80px]">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((a) => {
                    const catColor = CATEGORY_COLORS[a.category] || 'bg-muted text-muted-foreground';
                    const isNew = a.pub_date && (Date.now() - new Date(a.pub_date).getTime()) < 24 * 60 * 60 * 1000;
                    return (
                      <tr key={a.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${catColor}`}>
                            {a.category}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <a
                            href={a.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] hover:underline hover:text-foreground text-muted-foreground line-clamp-1"
                          >
                            {a.title}
                          </a>
                          {isNew && (
                            <span className="ml-1.5 text-[9px] font-bold text-red-500 uppercase">
                              NEW
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground/60">
                          {a.source || '-'}
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-muted-foreground/50">
                          {a.pub_date ? timeAgo(a.pub_date) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Split a long summary into max 3 concise bullet points */
function summarize(text: string, max = 3): string[] {
  // If already has sentence breaks, split on them
  const sentences = text
    .split(/(?<=[.다요음니])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= max) return sentences;
  return sentences.slice(0, max);
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

  // Try JSON first
  try {
    const jsonStr = summary.summary_text.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    const parsed = JSON.parse(jsonStr);
    if (parsed.trends && Array.isArray(parsed.trends)) {
      return {
        trends: parsed.trends,
        action_points: parsed.action_points || [],
      };
    }
  } catch {
    // Not JSON — try markdown parsing
  }

  // Parse markdown format
  return parseMarkdownSummary(summary.summary_text);
}

function parseMarkdownSummary(text: string): ParsedSummary {
  const trends: TrendItem[] = [];
  const action_points: string[] = [];

  // Split into sections by ## headings
  const sections = text.split(/^## /m).filter(Boolean);

  for (const section of sections) {
    const lines = section.trim().split('\n');
    const heading = lines[0]?.replace(/^#+\s*/, '').trim() || '';

    // Check if this is an action points section
    if (/액션\s*포인트|action/i.test(heading)) {
      for (const line of lines.slice(1)) {
        // Match "1. **text**" or "- text" patterns
        const match = line.match(/^\d+\.\s+\**(.+?)\**\s*[—\-–]\s*(.+)/) ||
                      line.match(/^\d+\.\s+\**(.+?)\**$/);
        if (match) {
          const full = match[2] ? `${match[1]} — ${match[2]}` : match[1];
          action_points.push(full.replace(/\*\*/g, ''));
        }
      }
      continue;
    }

    // Check if heading starts with a number (trend section)
    const trendMatch = heading.match(/^\d+\.\s*\S*\s*(.+)/);
    if (!trendMatch) continue;

    const topic = trendMatch[1].replace(/\*\*/g, '').trim();
    const bodyLines = lines.slice(1);

    // Extract summary (regular paragraphs) and implication (blockquote)
    let summaryText = '';
    let implication = '';

    for (const line of bodyLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === '---') continue;

      if (trimmed.startsWith('>')) {
        // Blockquote = implication
        implication = trimmed
          .replace(/^>\s*/, '')
          .replace(/\*\*시사점:\*\*\s*/i, '')
          .replace(/\*\*시사점\*\*:?\s*/i, '')
          .replace(/\*\*/g, '')
          .trim();
      } else if (!trimmed.startsWith('#') && !trimmed.startsWith('*2')) {
        // Regular text = summary
        if (summaryText) summaryText += ' ';
        summaryText += trimmed.replace(/\*\*/g, '');
      }
    }

    if (topic && (summaryText || implication)) {
      // Guess category from content
      let category: string | undefined;
      const combined = (topic + summaryText + implication).toLowerCase();
      if (/ai|인공지능|llm|gpt|머신러닝/.test(combined)) category = 'ai';
      else if (/마케팅|광고|그로스|ctr|roas|바이럴/.test(combined)) category = 'marketing';
      else if (/기획|ux|플랫폼|서비스|제품/.test(combined)) category = 'planning';
      else if (/테크|saas|보안|개발|인프라/.test(combined)) category = 'tech';

      // Guess impact from language
      let impact: 'high' | 'medium' | 'low' = 'medium';
      if (/폭발|급증|핵심|대규모|새로운 가능성|부상/.test(combined)) impact = 'high';
      else if (/점점|추세|확산/.test(combined)) impact = 'medium';

      trends.push({
        topic,
        summary: summaryText,
        implication: implication || '—',
        impact,
        category,
        sources: [],
      });
    }
  }

  return { trends, action_points };
}
