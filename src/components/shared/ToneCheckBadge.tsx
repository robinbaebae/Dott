'use client';

import { useState } from 'react';

interface ToneCheckResult {
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
}

export default function ToneCheckBadge({ content }: { content: string }) {
  const [result, setResult] = useState<ToneCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const check = async () => {
    if (!content || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/tone-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setOpen(true);
      }
    } catch { /* skip */ }
    setLoading(false);
  };

  const scoreColor = result
    ? result.score >= 8 ? 'text-green-600' : result.score >= 5 ? 'text-amber-600' : 'text-red-500'
    : '';

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={check}
        disabled={loading || !content}
        className="text-xs px-2.5 py-1 rounded-md border border-border bg-card hover:bg-muted transition-colors cursor-pointer disabled:opacity-40"
      >
        {loading ? '검수 중...' : '톤 검수'}
      </button>

      {result && open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setOpen(false)}>
          <div className="glass-float rounded-xl p-5 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">톤 검수 결과</h3>
              <span className={`text-2xl font-bold ${scoreColor}`}>{result.score}/10</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{result.summary}</p>
            {result.strengths.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-medium text-green-600 mb-1">잘된 점</p>
                {result.strengths.map((s, i) => (
                  <p key={i} className="text-xs text-muted-foreground">• {s}</p>
                ))}
              </div>
            )}
            {result.improvements.length > 0 && (
              <div>
                <p className="text-xs font-medium text-amber-600 mb-1">개선점</p>
                {result.improvements.map((s, i) => (
                  <p key={i} className="text-xs text-muted-foreground">• {s}</p>
                ))}
              </div>
            )}
            <button
              onClick={() => setOpen(false)}
              className="mt-4 w-full text-xs py-2 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
