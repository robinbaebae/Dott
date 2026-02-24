'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import type { BrandGuide } from '@/types';
import { TONE_OPTIONS } from '@/types';

const EMPTY: BrandGuide = {
  id: 'default',
  brand_name: '',
  brand_description: '',
  target_audience: '',
  tone: 'professional',
  keywords: [],
  avoid_keywords: [],
  website_url: '',
  additional_notes: '',
  updated_at: '',
};

export default function BrandGuideForm() {
  const [guide, setGuide] = useState<BrandGuide>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Keyword input buffers
  const [kwInput, setKwInput] = useState('');
  const [avoidInput, setAvoidInput] = useState('');

  const fetchGuide = useCallback(async () => {
    try {
      const res = await fetch('/api/brand-guide');
      if (res.ok) {
        const data = await res.json();
        setGuide({ ...EMPTY, ...data });
      }
    } catch {
      // use defaults
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchGuide();
  }, [fetchGuide]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/brand-guide', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guide),
      });
      if (res.ok) {
        const data = await res.json();
        setGuide({ ...EMPTY, ...data });
        toast.success('브랜드 가이드가 저장됐어요');
      } else {
        toast.error('저장에 실패했어요');
      }
    } catch {
      toast.error('저장에 실패했어요');
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof BrandGuide, value: unknown) => {
    setGuide((prev) => ({ ...prev, [field]: value }));
  };

  const addKeyword = (field: 'keywords' | 'avoid_keywords', value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const current = guide[field];
    if (!current.includes(trimmed)) {
      update(field, [...current, trimmed]);
    }
  };

  const removeKeyword = (field: 'keywords' | 'avoid_keywords', value: string) => {
    update(field, guide[field].filter((k) => k !== value));
  };

  const handleKwKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: 'keywords' | 'avoid_keywords',
    input: string,
    setInput: (v: string) => void
  ) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addKeyword(field, input);
      setInput('');
    }
  };

  if (!loaded) {
    return <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">로딩 중...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Brand Name */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">브랜드명 *</label>
        <Input
          placeholder="예: 코드앤버터"
          value={guide.brand_name}
          onChange={(e) => update('brand_name', e.target.value)}
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">브랜드 설명</label>
        <Textarea
          placeholder="브랜드의 미션, 핵심 가치, 주요 제품/서비스를 간단히 설명해주세요"
          value={guide.brand_description}
          onChange={(e) => update('brand_description', e.target.value)}
          rows={3}
        />
      </div>

      {/* Target Audience + Tone */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">타겟 오디언스</label>
          <Input
            placeholder="예: 20-30대 마케터, SMB 대표"
            value={guide.target_audience}
            onChange={(e) => update('target_audience', e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">톤앤매너</label>
          <Select value={guide.tone} onValueChange={(v) => update('tone', v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Keywords */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">핵심 키워드</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {guide.keywords.map((kw) => (
            <Badge key={kw} variant="secondary" className="gap-1 pr-1">
              {kw}
              <button onClick={() => removeKeyword('keywords', kw)} className="hover:text-destructive">
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
        <Input
          placeholder="키워드 입력 후 Enter"
          value={kwInput}
          onChange={(e) => setKwInput(e.target.value)}
          onKeyDown={(e) => handleKwKeyDown(e, 'keywords', kwInput, setKwInput)}
        />
      </div>

      {/* Avoid Keywords */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">지양 키워드</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {guide.avoid_keywords.map((kw) => (
            <Badge key={kw} variant="outline" className="gap-1 pr-1 text-destructive border-destructive/30">
              {kw}
              <button onClick={() => removeKeyword('avoid_keywords', kw)} className="hover:text-destructive">
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
        <Input
          placeholder="지양할 키워드 입력 후 Enter"
          value={avoidInput}
          onChange={(e) => setAvoidInput(e.target.value)}
          onKeyDown={(e) => handleKwKeyDown(e, 'avoid_keywords', avoidInput, setAvoidInput)}
        />
      </div>

      {/* Website */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">웹사이트</label>
        <Input
          placeholder="https://example.com"
          value={guide.website_url}
          onChange={(e) => update('website_url', e.target.value)}
        />
      </div>

      {/* Additional Notes */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">추가 참고사항</label>
        <Textarea
          placeholder="AI가 참고해야 할 추가 브랜드 규칙이나 스타일 가이드"
          value={guide.additional_notes}
          onChange={(e) => update('additional_notes', e.target.value)}
          rows={2}
        />
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={saving || !guide.brand_name.trim()}>
          {saving ? '저장 중...' : '저장'}
        </Button>
      </div>
    </div>
  );
}
