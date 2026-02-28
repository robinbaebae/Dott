'use client';

import { useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { SectionTitle, Chip } from './shared';

interface TopicSuggestion {
  title: string;
  type: string;
  hook: string;
}

interface TopicSuggestFormProps {
  onSelect: (title: string, contentType: 'blog' | 'newsletter') => void;
}

export default function TopicSuggestForm({ onSelect }: TopicSuggestFormProps) {
  const [keyword, setKeyword] = useState('');
  const [contentType, setContentType] = useState<'blog' | 'newsletter'>('blog');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);

  const handleGenerate = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setSuggestions([]);
    try {
      const res = await fetch('/api/topic-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, contentType }),
      });
      if (res.ok) {
        const data: TopicSuggestion[] = await res.json();
        setSuggestions(data);
        toast.success(`${data.length}개 소재가 추천되었습니다`);
      } else {
        toast.error('소재 추천에 실패했습니다');
      }
    } catch {
      toast.error('소재 추천에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <SectionTitle>키워드 / 주제</SectionTitle>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="예: 노코드 마케팅, SaaS 성장 전략"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div>
        <SectionTitle>콘텐츠 타입</SectionTitle>
        <div className="flex gap-2">
          <Chip label="블로그" active={contentType === 'blog'} onClick={() => setContentType('blog')} />
          <Chip label="뉴스레터" active={contentType === 'newsletter'} onClick={() => setContentType('newsletter')} />
        </div>
      </div>
      <button
        onClick={handleGenerate}
        disabled={!keyword.trim() || loading}
        className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors cursor-pointer flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 className="size-4 animate-spin" /> 추천 중...</> : '소재 추천 받기'}
      </button>

      {/* Suggestions list */}
      {suggestions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <SectionTitle>추천 소재 ({suggestions.length}개) — 클릭하여 선택</SectionTitle>
          <div className="space-y-2 max-h-72 overflow-auto">
            {suggestions.map((s, i) => (
              <button
                key={s.title}
                onClick={() => onSelect(s.title, contentType)}
                className="w-full text-left p-3 rounded-lg border border-border bg-card hover:border-accent/40 hover:bg-accent/5 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{s.type}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.hook}</p>
                  </div>
                  <Check className="size-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
