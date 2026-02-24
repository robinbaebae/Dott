'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  competitorId: string;
  onAdded: () => void;
  trigger?: React.ReactNode;
}

export default function AddAdDialog({ competitorId, onAdded, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [adUrl, setAdUrl] = useState('');
  const [platform, setPlatform] = useState('meta');
  const [creativeType, setCreativeType] = useState('image');
  const [copyText, setCopyText] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adUrl.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/competitors/${competitorId}/ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ad_url: adUrl.trim(),
          platform,
          creative_type: creativeType,
          copy_text: copyText.trim() || undefined,
          cta_text: ctaText.trim() || undefined,
        }),
      });

      if (res.ok) {
        setAdUrl('');
        setCopyText('');
        setCtaText('');
        setOpen(false);
        onAdded();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" size="sm">+ 광고 추가</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>광고 소재 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">광고 URL *</label>
            <Input
              value={adUrl}
              onChange={(e) => setAdUrl(e.target.value)}
              placeholder="https://www.facebook.com/ads/library/..."
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">플랫폼</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="meta">Meta</option>
                <option value="google">Google</option>
                <option value="naver">Naver</option>
                <option value="kakao">Kakao</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">크리에이티브 유형</label>
              <select
                value={creativeType}
                onChange={(e) => setCreativeType(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="carousel">Carousel</option>
                <option value="text">Text</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">광고 카피</label>
            <Textarea
              value={copyText}
              onChange={(e) => setCopyText(e.target.value)}
              placeholder="광고 텍스트를 입력하면 AI 분석이 실행됩니다"
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-medium">CTA</label>
            <Input
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="예: 지금 시작하기"
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving || !adUrl.trim()}>
            {saving ? 'AI 분석 중...' : '추가 + AI 분석'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
