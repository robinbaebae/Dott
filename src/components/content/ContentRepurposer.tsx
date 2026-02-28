'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, RefreshCw } from 'lucide-react';

const PLATFORMS = [
  { value: 'blog', label: 'Blog' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'threads', label: 'Threads' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'twitter', label: 'Twitter' },
];

const PLATFORM_COLOR: Record<string, string> = {
  blog: 'bg-green-100 text-green-800',
  instagram: 'bg-pink-100 text-pink-800',
  threads: 'bg-gray-100 text-gray-800',
  newsletter: 'bg-blue-100 text-blue-800',
  linkedin: 'bg-sky-100 text-sky-800',
  twitter: 'bg-cyan-100 text-cyan-800',
};

interface RepurposedContent {
  platform: string;
  content: string;
}

export default function ContentRepurposer() {
  const [content, setContent] = useState('');
  const [sourceFormat, setSourceFormat] = useState('blog');
  const [targetFormats, setTargetFormats] = useState<string[]>([]);
  const [results, setResults] = useState<RepurposedContent[]>([]);
  const [generating, setGenerating] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const toggleTarget = (platform: string) => {
    setTargetFormats((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const repurpose = async () => {
    if (!content.trim() || targetFormats.length === 0 || generating) return;
    setGenerating(true);
    setResults([]);
    try {
      const res = await fetch('/api/repurpose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, sourceFormat, targetFormats }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
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

  const availableTargets = PLATFORMS.filter((p) => p.value !== sourceFormat);

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="size-4 text-accent" />
          <h2 className="text-base font-semibold">Content Repurposing</h2>
        </div>

        {/* Source platform */}
        <div>
          <label className="text-sm font-medium mb-1.5 block">Source platform</label>
          <div className="flex gap-1.5 flex-wrap">
            {PLATFORMS.map((p) => (
              <Button
                key={p.value}
                variant={sourceFormat === p.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSourceFormat(p.value);
                  setTargetFormats((prev) => prev.filter((t) => t !== p.value));
                }}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Original content */}
        <div>
          <label className="text-sm font-medium mb-1.5 block">Original content</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste your original content here..."
            rows={6}
          />
        </div>

        {/* Target platforms */}
        <div>
          <label className="text-sm font-medium mb-1.5 block">Target platforms</label>
          <div className="flex gap-2 flex-wrap">
            {availableTargets.map((p) => (
              <label
                key={p.value}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={targetFormats.includes(p.value)}
                  onChange={() => toggleTarget(p.value)}
                  className="rounded border-gray-300 text-accent focus:ring-accent"
                />
                <span className="text-sm">{p.label}</span>
              </label>
            ))}
          </div>
        </div>

        <Button
          onClick={repurpose}
          disabled={!content.trim() || targetFormats.length === 0 || generating}
          className="w-full"
        >
          {generating ? 'Repurposing...' : 'Repurpose'}
        </Button>

        {/* Results */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {results.map((r, i) => (
              <Card key={r.platform} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className={PLATFORM_COLOR[r.platform] || 'bg-gray-100 text-gray-800'}
                    >
                      {r.platform}
                    </Badge>
                    <button
                      onClick={() => copyToClipboard(r.content, i)}
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
                  <p className="text-sm whitespace-pre-wrap">{r.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {generating && (
          <div className="flex items-center justify-center py-6">
            <div className="size-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
