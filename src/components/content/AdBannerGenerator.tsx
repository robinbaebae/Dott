'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImagePlus, X, ExternalLink, Loader2 } from 'lucide-react';
import { BannerDesign } from '@/types';

const GDN_SIZES = [
  { value: '300x250', label: 'Medium Rectangle', group: 'Popular' },
  { value: '336x280', label: 'Large Rectangle', group: 'Popular' },
  { value: '728x90', label: 'Leaderboard', group: 'Popular' },
  { value: '300x600', label: 'Half Page', group: 'Popular' },
  { value: '320x50', label: 'Mobile Banner', group: 'Mobile' },
  { value: '320x100', label: 'Large Mobile Banner', group: 'Mobile' },
  { value: '160x600', label: 'Wide Skyscraper', group: 'Other' },
  { value: '468x60', label: 'Banner', group: 'Other' },
  { value: '970x90', label: 'Large Leaderboard', group: 'Other' },
  { value: '970x250', label: 'Billboard', group: 'Other' },
  { value: '250x250', label: 'Square', group: 'Other' },
  { value: '200x200', label: 'Small Square', group: 'Other' },
  { value: '120x600', label: 'Skyscraper', group: 'Other' },
];

export default function AdBannerGenerator() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceImageName, setSourceImageName] = useState('');
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [results, setResults] = useState<Map<string, BannerDesign>>(new Map());
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSourceImage(reader.result as string);
      setSourceImageName(file.name);
      setResults(new Map());
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSourceImage(null);
    setSourceImageName('');
    setResults(new Map());
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size],
    );
  };

  const selectAll = () => {
    if (selectedSizes.length === GDN_SIZES.length) {
      setSelectedSizes([]);
    } else {
      setSelectedSizes(GDN_SIZES.map((s) => s.value));
    }
  };

  const generateVariations = async () => {
    if (!sourceImage || selectedSizes.length === 0) return;

    for (const size of selectedSizes) {
      if (results.has(size)) continue;

      setGenerating((prev) => new Set(prev).add(size));
      try {
        const res = await fetch('/api/banner/variation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: sourceImage, targetSize: size }),
        });
        if (res.ok) {
          const data: BannerDesign = await res.json();
          setResults((prev) => new Map(prev).set(size, data));
        }
      } catch (err) {
        console.error(`Failed to generate ${size}:`, err);
      } finally {
        setGenerating((prev) => {
          const next = new Set(prev);
          next.delete(size);
          return next;
        });
      }
    }
  };

  const isGenerating = generating.size > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ad Banner Generator</CardTitle>
        <p className="text-sm text-muted-foreground">
          Upload a banner to generate GDN size variations
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {/* Source image upload */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Source Banner *</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {sourceImage ? (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                <img
                  src={sourceImage}
                  alt="Source banner"
                  className="w-24 h-24 object-contain rounded bg-white"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{sourceImageName}</p>
                  <p className="text-xs text-muted-foreground">Source banner</p>
                </div>
                <Button variant="ghost" size="icon-xs" onClick={removeImage}>
                  <X className="size-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full justify-center gap-2 h-20 border-dashed"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="size-5" />
                Upload banner image
              </Button>
            )}
          </div>

          {/* GDN Size selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Target Sizes *</label>
              <Button variant="ghost" size="xs" onClick={selectAll}>
                {selectedSizes.length === GDN_SIZES.length ? 'Deselect all' : 'Select all'}
              </Button>
            </div>

            {['Popular', 'Mobile', 'Other'].map((group) => (
              <div key={group} className="mb-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  {group}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {GDN_SIZES.filter((s) => s.group === group).map((s) => {
                    const isSelected = selectedSizes.includes(s.value);
                    const hasResult = results.has(s.value);
                    const isGen = generating.has(s.value);
                    return (
                      <button
                        key={s.value}
                        onClick={() => toggleSize(s.value)}
                        className={`
                          inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors
                          ${isSelected ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'}
                          ${hasResult ? 'border-green-500 bg-green-500/5 text-green-700' : ''}
                          ${isGen ? 'border-blue-500 bg-blue-500/5 text-blue-700' : ''}
                        `}
                      >
                        {isGen && <Loader2 className="size-2.5 animate-spin" />}
                        {s.value}
                        <span className="text-[9px] opacity-60">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={generateVariations}
            disabled={!sourceImage || selectedSizes.length === 0 || isGenerating}
            className="w-full"
          >
            {isGenerating
              ? `Generating... (${results.size}/${selectedSizes.length})`
              : `Generate ${selectedSizes.length} sizes`}
          </Button>

          {/* Results */}
          {results.size > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Results</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Array.from(results.entries()).map(([size, banner]) => (
                  <div
                    key={size}
                    className="flex items-center justify-between p-3 border rounded-lg bg-green-500/5 border-green-500/20"
                  >
                    <div>
                      <Badge variant="secondary" className="text-[10px]">{size}</Badge>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {GDN_SIZES.find((s) => s.value === size)?.label}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={`/banner/${banner.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="gap-1"
                      >
                        <ExternalLink className="size-3" />
                        Open
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
