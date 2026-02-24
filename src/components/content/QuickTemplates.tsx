'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Copy, Check, Zap } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  variables: string[];
}

const CATEGORIES: { label: string; color: string; templates: Template[] }[] = [
  {
    label: 'SNS',
    color: 'bg-pink-100 text-pink-800',
    templates: [
      { id: 'instagram-caption', name: 'Instagram Caption', variables: ['topic', 'tone', 'target_audience'] },
      { id: 'threads-post', name: 'Threads Post', variables: ['topic', 'key_message'] },
      { id: 'hashtag-generator', name: 'Hashtag Generator', variables: ['topic', 'industry'] },
    ],
  },
  {
    label: 'Ads',
    color: 'bg-orange-100 text-orange-800',
    templates: [
      { id: 'ad-headline', name: 'Ad Headline', variables: ['product', 'benefit', 'target_audience'] },
      { id: 'cta-generator', name: 'CTA Generator', variables: ['product', 'goal'] },
      { id: 'product-description', name: 'Product Description', variables: ['product', 'features', 'target_audience'] },
    ],
  },
  {
    label: 'Email',
    color: 'bg-blue-100 text-blue-800',
    templates: [
      { id: 'newsletter-subject', name: 'Newsletter Subject', variables: ['topic', 'newsletter_name'] },
      { id: 'newsletter-body', name: 'Newsletter Body', variables: ['topic', 'key_points', 'cta_goal'] },
      { id: 'email-cta', name: 'Email CTA', variables: ['goal', 'offer'] },
    ],
  },
  {
    label: 'Blog',
    color: 'bg-green-100 text-green-800',
    templates: [
      { id: 'blog-title', name: 'Blog Title', variables: ['topic', 'keyword'] },
      { id: 'blog-outline', name: 'Blog Outline', variables: ['topic', 'keyword', 'target_audience'] },
      { id: 'blog-intro', name: 'Blog Intro', variables: ['topic', 'target_audience'] },
    ],
  },
];

const VARIABLE_LABELS: Record<string, string> = {
  topic: 'Topic / Subject',
  tone: 'Tone (e.g. casual, professional)',
  target_audience: 'Target Audience',
  key_message: 'Key Message',
  industry: 'Industry',
  product: 'Product / Service',
  benefit: 'Key Benefit',
  features: 'Features',
  goal: 'Goal',
  offer: 'Offer / Promotion',
  newsletter_name: 'Newsletter Name',
  key_points: 'Key Points',
  cta_goal: 'CTA Goal',
  keyword: 'SEO Keyword',
};

export default function QuickTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [result, setResult] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setVariables({});
    setResult('');
    setDialogOpen(true);
  };

  const generate = async () => {
    if (!selectedTemplate || generating) return;
    setGenerating(true);
    setResult('');
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          variables,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data.result);
      }
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-accent" />
          <h2 className="text-base font-semibold">Quick Templates</h2>
        </div>

        <div className="space-y-4">
          {CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <Badge variant="secondary" className={`${cat.color} mb-2`}>
                {cat.label}
              </Badge>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {cat.templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openTemplate(t)}
                    className="text-left p-3 rounded-lg border hover:border-accent/40 hover:bg-accent/5 transition-all text-sm"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              {selectedTemplate?.variables.map((v) => (
                <div key={v}>
                  <label className="text-sm font-medium mb-1 block">
                    {VARIABLE_LABELS[v] || v}
                  </label>
                  <Input
                    value={variables[v] || ''}
                    onChange={(e) =>
                      setVariables((prev) => ({ ...prev, [v]: e.target.value }))
                    }
                    placeholder={`Enter ${VARIABLE_LABELS[v] || v}...`}
                  />
                </div>
              ))}
              <Button
                onClick={generate}
                disabled={generating}
                className="w-full"
              >
                {generating ? 'Generating...' : 'Generate'}
              </Button>

              {generating && (
                <div className="flex items-center justify-center py-4">
                  <div className="size-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {result && (
                <div className="relative">
                  <div className="rounded-lg border bg-muted/30 p-4 text-sm whitespace-pre-wrap max-h-80 overflow-y-auto">
                    {result}
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="absolute top-2 right-2 p-1.5 rounded hover:bg-muted transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check className="size-3.5 text-green-600" />
                    ) : (
                      <Copy className="size-3.5 text-muted-foreground" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
