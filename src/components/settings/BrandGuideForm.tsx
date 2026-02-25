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
import { X, ChevronDown, ChevronRight } from 'lucide-react';
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
  product_type: '',
  industry: '',
  competitors: [],
  usp: '',
  pricing_model: '',
  customer_pain_points: [],
  key_features: [],
  company_size: '',
};

export default function BrandGuideForm() {
  const [guide, setGuide] = useState<BrandGuide>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [productOpen, setProductOpen] = useState(false);

  // Keyword input buffers
  const [kwInput, setKwInput] = useState('');
  const [avoidInput, setAvoidInput] = useState('');
  const [competitorInput, setCompetitorInput] = useState('');
  const [painInput, setPainInput] = useState('');
  const [featureInput, setFeatureInput] = useState('');

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

  const addKeyword = (field: 'keywords' | 'avoid_keywords' | 'competitors' | 'customer_pain_points' | 'key_features', value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const current = guide[field];
    if (!current.includes(trimmed)) {
      update(field, [...current, trimmed]);
    }
  };

  const removeKeyword = (field: 'keywords' | 'avoid_keywords' | 'competitors' | 'customer_pain_points' | 'key_features', value: string) => {
    update(field, guide[field].filter((k) => k !== value));
  };

  const handleKwKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: 'keywords' | 'avoid_keywords' | 'competitors' | 'customer_pain_points' | 'key_features',
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

      {/* Product Context — Collapsible */}
      <div className="border border-border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setProductOpen(!productOpen)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
        >
          <span>Product Context</span>
          {productOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>

        {productOpen && (
          <div className="px-4 pb-4 space-y-4 border-t border-border">
            <div className="grid grid-cols-2 gap-3 pt-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">제품 유형</label>
                <Input
                  placeholder="예: SaaS, 이커머스, 앱"
                  value={guide.product_type}
                  onChange={(e) => update('product_type', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">산업</label>
                <Input
                  placeholder="예: 마케팅 테크, 이커머스"
                  value={guide.industry}
                  onChange={(e) => update('industry', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">USP (핵심 차별점)</label>
              <Textarea
                placeholder="우리 제품만의 핵심 차별화 포인트"
                value={guide.usp}
                onChange={(e) => update('usp', e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">가격 모델</label>
                <Input
                  placeholder="예: 프리미엄, 구독형, 1회성"
                  value={guide.pricing_model}
                  onChange={(e) => update('pricing_model', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">기업 규모</label>
                <Input
                  placeholder="예: 스타트업, SMB, 엔터프라이즈"
                  value={guide.company_size}
                  onChange={(e) => update('company_size', e.target.value)}
                />
              </div>
            </div>

            {/* Competitors */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">경쟁사</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {guide.competitors.map((c) => (
                  <Badge key={c} variant="secondary" className="gap-1 pr-1">
                    {c}
                    <button onClick={() => removeKeyword('competitors', c)} className="hover:text-destructive">
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="경쟁사 입력 후 Enter"
                value={competitorInput}
                onChange={(e) => setCompetitorInput(e.target.value)}
                onKeyDown={(e) => handleKwKeyDown(e, 'competitors', competitorInput, setCompetitorInput)}
              />
            </div>

            {/* Customer Pain Points */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">고객 페인포인트</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {guide.customer_pain_points.map((p) => (
                  <Badge key={p} variant="outline" className="gap-1 pr-1">
                    {p}
                    <button onClick={() => removeKeyword('customer_pain_points', p)} className="hover:text-destructive">
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="고객 페인포인트 입력 후 Enter"
                value={painInput}
                onChange={(e) => setPainInput(e.target.value)}
                onKeyDown={(e) => handleKwKeyDown(e, 'customer_pain_points', painInput, setPainInput)}
              />
            </div>

            {/* Key Features */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">핵심 기능</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {guide.key_features.map((f) => (
                  <Badge key={f} variant="secondary" className="gap-1 pr-1">
                    {f}
                    <button onClick={() => removeKeyword('key_features', f)} className="hover:text-destructive">
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                placeholder="핵심 기능 입력 후 Enter"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={(e) => handleKwKeyDown(e, 'key_features', featureInput, setFeatureInput)}
              />
            </div>
          </div>
        )}
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
