'use client';

import { useState } from 'react';
import { Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';

interface Recommendation {
  influencer_id: string;
  name: string;
  score: number;
  reasoning: string;
}

interface Props {
  onSelect: (id: string) => void;
}

export default function AIRecommendation({ onSelect }: Props) {
  const [goal, setGoal] = useState('');
  const [budget, setBudget] = useState('');
  const [platform, setPlatform] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Recommendation[]>([]);

  const recommend = async () => {
    if (!goal.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch('/api/influencers/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: goal.trim(),
          budget: budget || undefined,
          platform: platform || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.recommendations || []);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || '추천 생성 실패');
      }
    } catch {
      toast.error('추천 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 text-[12px] rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-accent/30';

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <h3 className="text-[12px] font-semibold flex items-center gap-1.5">
        <Star className="size-3.5 text-amber-500" />
        AI 인플루언서 추천
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="캠페인 목표 *"
          className={inputClass}
        />
        <input
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="예산 (선택)"
          className={inputClass}
        />
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={inputClass}>
          <option value="">전체 플랫폼</option>
          <option value="instagram">Instagram</option>
          <option value="youtube">YouTube</option>
          <option value="tiktok">TikTok</option>
          <option value="blog">Blog</option>
        </select>
        <button
          onClick={recommend}
          disabled={loading || !goal.trim()}
          className="text-[12px] py-2 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : '추천 받기'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-2 pt-2">
          {results.map((r, i) => (
            <div
              key={r.influencer_id}
              className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/10 transition-colors cursor-pointer"
              onClick={() => onSelect(r.influencer_id)}
            >
              <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                <span className="text-[12px] font-bold text-amber-600">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-semibold">{r.name}</p>
                  <span className="text-[11px] font-bold text-amber-600">{r.score}점</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{r.reasoning}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
