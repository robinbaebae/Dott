'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImagePlus, X, ExternalLink } from 'lucide-react';
import { BannerDesign } from '@/types';

const SIZES = [
  { value: '1080x1080', label: '정사각형 (1080x1080)' },
  { value: '1200x628', label: '페이스북/링크드인 (1200x628)' },
  { value: '1080x1920', label: '스토리/릴스 (1080x1920)' },
];

export default function BannerGenerator() {
  const [copy, setCopy] = useState('');
  const [reference, setReference] = useState('');
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceImageName, setReferenceImageName] = useState('');
  const [size, setSize] = useState('1080x1080');
  const [isGenerating, setIsGenerating] = useState(false);
  const [banner, setBanner] = useState<BannerDesign | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setReferenceImage(reader.result as string);
      setReferenceImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setReferenceImage(null);
    setReferenceImageName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generateBanner = async () => {
    if (!copy.trim()) return;
    setIsGenerating(true);
    setBanner(null);
    try {
      const res = await fetch('/api/banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copy, reference, size, referenceImage }),
      });
      if (res.ok) {
        const data = await res.json();
        setBanner(data);
      }
    } catch (err) {
      console.error('Failed to generate banner:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">온드 미디어 컨텐츠 생성</CardTitle>
        <p className="text-sm text-muted-foreground">
          카피와 레퍼런스를 입력하면 AI가 배너를 디자인합니다
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">카피 *</label>
            <Textarea
              placeholder="배너에 들어갈 카피를 입력하세요"
              value={copy}
              onChange={(e) => setCopy(e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">레퍼런스 / 참고사항</label>
            <Textarea
              placeholder="디자인 스타일, 색상, 톤앤매너 등"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              rows={2}
            />
          </div>

          {/* Image upload */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">참고 이미지</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {referenceImage ? (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                <img
                  src={referenceImage}
                  alt="Reference"
                  className="w-16 h-16 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{referenceImageName}</p>
                  <p className="text-xs text-muted-foreground">참고 이미지로 사용됩니다</p>
                </div>
                <Button variant="ghost" size="icon-xs" onClick={removeImage}>
                  <X className="size-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-center gap-2 h-16 border-dashed"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="size-4" />
                이미지 업로드
              </Button>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">사이즈</label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={generateBanner}
            disabled={!copy.trim() || isGenerating}
            className="w-full"
          >
            {isGenerating ? '생성 중...' : '컨텐츠 생성'}
          </Button>

          {/* Generated result - link instead of preview */}
          {banner && (
            <div className="flex items-center gap-3 p-4 border rounded-lg bg-green-500/5 border-green-500/20">
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700">컨텐츠가 생성되었습니다</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  링크를 열어 결과를 확인하세요
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`/banner/${banner.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-1.5"
                >
                  <ExternalLink className="size-3" />
                  열기
                </a>
              </Button>
            </div>
          )}

          {isGenerating && (
            <div className="flex items-center justify-center py-4">
              <p className="text-sm text-muted-foreground">AI가 디자인을 생성하고 있습니다...</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
