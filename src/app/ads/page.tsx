'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, Check } from 'lucide-react';
import KnowBar from '@/components/shared/KnowBar';
import AdBannerGenerator from '@/components/content/AdBannerGenerator';

interface AdVariation {
  headline: string;
  body: string;
  tone: string;
}

const TONE_COLOR: Record<string, string> = {
  professional: 'bg-blue-100 text-blue-800',
  playful: 'bg-pink-100 text-pink-800',
  urgent: 'bg-red-100 text-red-800',
  emotional: 'bg-purple-100 text-purple-800',
  minimal: 'bg-gray-100 text-gray-800',
};

export default function AdsPage() {
  const [copy, setCopy] = useState('');
  const [variations, setVariations] = useState<AdVariation[]>([]);
  const [generating, setGenerating] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const generate = async () => {
    if (!copy.trim() || generating) return;
    setGenerating(true);
    setVariations([]);
    try {
      const res = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copy }),
      });
      if (res.ok) {
        const data = await res.json();
        setVariations(data);
      }
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 pt-24 pb-12 space-y-8 animate-in fade-in duration-500">
      <h1 className="text-2xl tracking-tight">Ads</h1>

      <KnowBar />

      {/* Ad Banner Generator */}
      <AdBannerGenerator />

      {/* Ad Copy Variations */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Your ad copy or product description</label>
            <Textarea
              value={copy}
              onChange={(e) => setCopy(e.target.value)}
              placeholder="Enter your ad copy, product description, or key message..."
              rows={4}
            />
          </div>
          <Button onClick={generate} disabled={!copy.trim() || generating} className="w-full">
            {generating ? 'Generating...' : 'Generate variations'}
          </Button>
        </CardContent>
      </Card>

      {variations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {variations.map((v, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className={TONE_COLOR[v.tone] || 'bg-gray-100 text-gray-800'}>
                    {v.tone}
                  </Badge>
                  <button
                    onClick={() => copyToClipboard(`${v.headline}\n${v.body}`, i)}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedIdx === i ? (
                      <Check className="size-3.5 text-green-600" />
                    ) : (
                      <Copy className="size-3.5 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <h3 className="text-base font-semibold leading-snug">{v.headline}</h3>
                <p className="text-sm text-muted-foreground">{v.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {generating && (
        <div className="flex items-center justify-center py-8">
          <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
