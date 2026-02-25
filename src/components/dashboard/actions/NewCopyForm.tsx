'use client';

import { useState } from 'react';
import { Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { SectionTitle, Chip } from './shared';

const TONES = ['professional', 'playful', 'urgent', 'emotional', 'minimal', 'witty'];

interface CopyVariation {
  headline: string;
  body: string;
  tone: string;
}

export default function NewCopyForm({ onResult }: { onResult: (l: string, c: string) => void }) {
  const [copy, setCopy] = useState('');
  const [referenceCopy, setReferenceCopy] = useState('');
  const [tone, setTone] = useState('professional');
  const [maxLength, setMaxLength] = useState<number>(0);
  const [useEmoji, setUseEmoji] = useState(false);
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [variations, setVariations] = useState<CopyVariation[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!copy.trim()) return;
    setLoading(true);
    setVariations([]);
    try {
      const res = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copy, referenceCopy, tone, maxLength: maxLength || undefined, useEmoji, count }),
      });
      if (res.ok) {
        const data: CopyVariation[] = await res.json();
        setVariations(data);
        const text = data
          .map((v, i) => `**#${i + 1} [${v.tone}]**\n**${v.headline}**\n${v.body}`)
          .join('\n\n---\n\n');
        onResult('📊 광고 카피 변형', text);
        toast.success(`${data.length}개 카피가 생성되었습니다`);
      } else {
        toast.error('카피 생성에 실패했습니다');
      }
    } catch {
      toast.error('카피 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyVariation = async (v: CopyVariation, idx: number) => {
    await navigator.clipboard.writeText(`${v.headline}\n${v.body}`);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-3">
      <div>
        <SectionTitle>제품 설명 / 핵심 메시지 *</SectionTitle>
        <textarea
          value={copy}
          onChange={(e) => setCopy(e.target.value)}
          rows={3}
          placeholder="제품 설명, 광고 카피, 또는 핵심 메시지를 입력하세요..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div>
        <SectionTitle>레퍼런스 카피 (선택)</SectionTitle>
        <textarea
          value={referenceCopy}
          onChange={(e) => setReferenceCopy(e.target.value)}
          rows={2}
          placeholder="참고할 기존 카피가 있다면 붙여넣기..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div>
        <SectionTitle>톤</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <Chip key={t} label={t} active={tone === t} onClick={() => setTone(t)} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <SectionTitle>글자수 제한</SectionTitle>
          <input
            type="number"
            value={maxLength || ''}
            onChange={(e) => setMaxLength(Number(e.target.value))}
            placeholder="제한 없음"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <SectionTitle>생성 개수</SectionTitle>
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value))))}
            min={1}
            max={20}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <SectionTitle>이모지</SectionTitle>
          <button
            type="button"
            onClick={() => setUseEmoji(!useEmoji)}
            className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors cursor-pointer ${
              useEmoji
                ? 'bg-accent text-accent-foreground border-accent'
                : 'bg-background text-muted-foreground border-border hover:border-accent/40'
            }`}
          >
            {useEmoji ? '🔛 ON' : 'OFF'}
          </button>
        </div>
      </div>
      <button
        onClick={handleGenerate}
        disabled={!copy.trim() || loading}
        className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors cursor-pointer flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 className="size-4 animate-spin" /> 생성 중...</> : `Generate ${count}개 카피`}
      </button>

      {/* Variations preview */}
      {variations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border space-y-2">
          <SectionTitle>생성된 카피 ({variations.length}개)</SectionTitle>
          <div className="space-y-2 max-h-64 overflow-auto">
            {variations.map((v, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-muted-foreground">{v.tone}</span>
                    <p className="text-sm font-medium text-foreground">{v.headline}</p>
                    <p className="text-xs text-muted-foreground mt-1">{v.body}</p>
                  </div>
                  <button
                    onClick={() => handleCopyVariation(v, i)}
                    className="p-1.5 rounded-lg hover:bg-muted cursor-pointer shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {copiedIdx === i ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5 text-muted-foreground" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
