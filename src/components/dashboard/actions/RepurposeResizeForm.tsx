'use client';

import { useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SectionTitle, Chip } from './shared';

const SIZE_GROUPS: { group: string; sizes: string[] }[] = [
  { group: 'SNS', sizes: ['1080x1080', '1080x1920', '1200x628', '1200x675'] },
  { group: 'Meta DA', sizes: ['1200x628', '1080x1080', '1080x1920'] },
  { group: 'GDN Popular', sizes: ['300x250', '336x280', '728x90', '300x600'] },
  { group: 'GDN Mobile', sizes: ['320x50', '320x100'] },
  { group: 'GDN Other', sizes: ['160x600', '468x60', '970x90', '970x250'] },
];

// Deduplicate sizes across groups
const ALL_SIZES = Array.from(new Set(SIZE_GROUPS.flatMap((g) => g.sizes)));

export default function RepurposeResizeForm({ onResult }: { onResult: (l: string, c: string) => void }) {
  const [sourceImage, setSourceImage] = useState('');
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSourceImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const toggleSize = (s: string) =>
    setSelectedSizes((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const selectGroup = (group: string) => {
    const g = SIZE_GROUPS.find((sg) => sg.group === group);
    if (!g) return;
    setSelectedSizes((prev) => {
      const next = new Set(prev);
      const allSelected = g.sizes.every((s) => next.has(s));
      if (allSelected) {
        g.sizes.forEach((s) => next.delete(s));
      } else {
        g.sizes.forEach((s) => next.add(s));
      }
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!sourceImage || selectedSizes.size === 0) return;
    setLoading(true);
    try {
      const results: string[] = [];
      for (const size of Array.from(selectedSizes)) {
        try {
          const res = await fetch('/api/banner/variation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: sourceImage, targetSize: size }),
          });
          if (res.ok) {
            const data = await res.json();
            results.push(`**${size}** → [미리보기](/banner/${data.id})`);
          }
        } catch { /* skip individual failure */ }
      }
      if (results.length > 0) {
        onResult('🔄 리퍼포징 완료', `사이즈 변환 완료:\n\n${results.join('\n')}`);
        toast.success(`${results.length}개 배너가 생성되었습니다`);
      } else {
        toast.error('변환에 실패했습니다');
      }
    } catch {
      toast.error('변환에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <SectionTitle>소스 배너 이미지 *</SectionTitle>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        {sourceImage ? (
          <div className="flex items-center gap-3">
            <img src={sourceImage} alt="source" className="h-20 rounded-lg object-contain border border-border" />
            <button onClick={() => { setSourceImage(''); if (fileRef.current) fileRef.current.value = ''; }} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">삭제</button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} className="px-3 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-accent/40 cursor-pointer">
            이미지 업로드
          </button>
        )}
      </div>
      <div>
        <SectionTitle>타겟 사이즈 선택</SectionTitle>
        {SIZE_GROUPS.map((g) => (
          <div key={g.group} className="mb-2">
            <button
              type="button"
              onClick={() => selectGroup(g.group)}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer mb-1"
            >
              {g.group} {g.sizes.every((s) => selectedSizes.has(s)) ? '✓' : ''}
            </button>
            <div className="flex flex-wrap gap-2 mt-1">
              {g.sizes.map((s) => (
                <Chip key={`${g.group}-${s}`} label={s} active={selectedSizes.has(s)} onClick={() => toggleSize(s)} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={handleGenerate}
        disabled={!sourceImage || selectedSizes.size === 0 || loading}
        className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors cursor-pointer flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 className="size-4 animate-spin" /> 변환 중 ({selectedSizes.size}개)...</> : `Generate ${selectedSizes.size}개 변형`}
      </button>
    </div>
  );
}
