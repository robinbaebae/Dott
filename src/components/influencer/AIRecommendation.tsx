'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Search, AlertCircle } from 'lucide-react';

interface RecommendationResult {
  influencer_id: string;
  name: string;
  score: number;
  reasoning: string;
  handle?: string;
  platform?: string;
  followers?: number;
}

interface AIRecommendationProps {
  onSelect: (influencerId: string) => void;
}

const PLATFORMS = [
  { value: '', label: '전체' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'blog', label: '블로그' },
];

export default function AIRecommendation({ onSelect }: AIRecommendationProps) {
  const [goal, setGoal] = useState('');
  const [budget, setBudget] = useState<number | ''>('');
  const [platform, setPlatform] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RecommendationResult[]>([]);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!goal.trim() || loading) return;
    setLoading(true);
    setResults([]);
    setError('');
    try {
      const res = await fetch('/api/influencers/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: goal.trim(),
          budget: budget || undefined,
          platform: platform || undefined,
          category: category.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResults(data.recommendations ?? []);
      } else {
        setError(data.error || '추천을 가져오지 못했습니다.');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    }
    setLoading(false);
  };

  const inputClass =
    'w-full text-sm px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted-foreground/50';
  const labelClass = 'text-xs font-medium text-muted-foreground mb-1 block';

  const scoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-500/15 text-green-600';
    if (score >= 70) return 'bg-amber-500/15 text-amber-600';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-4">
      {/* Search form */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="size-4 text-accent" />
            <span className="text-sm font-semibold">AI 인플루언서 추천</span>
          </div>

          <div>
            <label className={labelClass}>캠페인 목표</label>
            <input
              className={inputClass}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="MZ세대 대상 신제품 인지도 확보..."
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>예산 (만원)</label>
              <input
                type="number"
                className={inputClass}
                value={budget}
                onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : '')}
                placeholder="100"
              />
            </div>
            <div>
              <label className={labelClass}>플랫폼</label>
              <select
                className={inputClass}
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>카테고리</label>
              <input
                className={inputClass}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="뷰티, 패션..."
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!goal.trim() || loading}
            className="w-full flex items-center justify-center gap-1.5 text-xs py-2.5 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40"
          >
            <Search className="size-3.5" />
            {loading ? '분석 중...' : '추천 받기'}
          </button>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-destructive/10 text-destructive text-xs">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground px-1">
            추천 결과 ({results.length}명)
          </p>
          {results.map((r) => (
            <Card
              key={r.influencer_id}
              className="hover-lift press-scale cursor-pointer"
              onClick={() => onSelect(r.influencer_id)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                {/* Score badge */}
                <div
                  className={`shrink-0 size-10 rounded-full flex items-center justify-center text-sm font-bold ${scoreColor(r.score)}`}
                >
                  {r.score}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sm font-semibold">{r.name}</span>
                    {r.handle && (
                      <span className="text-xs text-muted-foreground">@{r.handle}</span>
                    )}
                  </div>
                  {r.platform && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-accent/15 text-accent mr-1">
                      {r.platform}
                    </span>
                  )}
                  {r.followers != null && (
                    <span className="text-xs text-muted-foreground">
                      {r.followers >= 1000
                        ? `${(r.followers / 1000).toFixed(1)}K`
                        : r.followers}{' '}
                      팔로워
                    </span>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.reasoning}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state after search */}
      {!loading && results.length === 0 && goal.trim() && (
        <div className="text-center py-8 text-xs text-muted-foreground/50">
          추천 결과가 없습니다
        </div>
      )}
    </div>
  );
}
