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
  { value: '1080x1080', label: 'Square (1080x1080)' },
  { value: '1200x628', label: 'Facebook/LinkedIn (1200x628)' },
  { value: '1080x1920', label: 'Story/Reels (1080x1920)' },
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
        <CardTitle className="text-lg">Owned Media Content</CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter copy and references to let AI design your banner
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Copy *</label>
            <Textarea
              placeholder="Enter the copy for your banner"
              value={copy}
              onChange={(e) => setCopy(e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Reference / Notes</label>
            <Textarea
              placeholder="Design style, colors, tone, etc."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              rows={2}
            />
          </div>

          {/* Image upload */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Reference Image</label>
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
                  <p className="text-xs text-muted-foreground">Will be used as reference</p>
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
                Upload image
              </Button>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Size</label>
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
            {isGenerating ? 'Generating...' : 'Generate content'}
          </Button>

          {/* Generated result - link instead of preview */}
          {banner && (
            <div className="flex items-center gap-3 p-4 border rounded-lg bg-green-500/5 border-green-500/20">
              <div className="flex-1">
                <p className="text-sm font-medium text-green-700">Content generated successfully</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Open the link to view the result
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
                  Open
                </a>
              </Button>
            </div>
          )}

          {isGenerating && (
            <div className="flex items-center justify-center py-4">
              <p className="text-sm text-muted-foreground">AI is generating the design...</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
