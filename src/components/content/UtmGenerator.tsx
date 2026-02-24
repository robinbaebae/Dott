'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, Check, Plus, X, Clock } from 'lucide-react';

interface CustomParam {
  key: string;
  value: string;
}

interface UtmHistoryEntry {
  url: string;
  date: string;
}

const STORAGE_KEY = 'dott_utm_history';

export default function UtmGenerator() {
  const [baseUrl, setBaseUrl] = useState('');
  const [source, setSource] = useState('');
  const [medium, setMedium] = useState('');
  const [campaign, setCampaign] = useState('');
  const [term, setTerm] = useState('');
  const [content, setContent] = useState('');
  const [customParams, setCustomParams] = useState<CustomParam[]>([]);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<UtmHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const generatedUrl = (() => {
    if (!baseUrl.trim()) return '';
    try {
      const url = new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`);
      if (source) url.searchParams.set('utm_source', source);
      if (medium) url.searchParams.set('utm_medium', medium);
      if (campaign) url.searchParams.set('utm_campaign', campaign);
      if (term) url.searchParams.set('utm_term', term);
      if (content) url.searchParams.set('utm_content', content);
      customParams.forEach((p) => {
        if (p.key && p.value) url.searchParams.set(p.key, p.value);
      });
      return url.toString();
    } catch {
      return '';
    }
  })();

  const copyUrl = async () => {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    // Save to history
    const entry: UtmHistoryEntry = { url: generatedUrl, date: new Date().toISOString() };
    const updated = [entry, ...history].slice(0, 20);
    setHistory(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
  };

  const addCustomParam = () => {
    setCustomParams([...customParams, { key: '', value: '' }]);
  };

  const updateCustomParam = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...customParams];
    updated[index][field] = val;
    setCustomParams(updated);
  };

  const removeCustomParam = (index: number) => {
    setCustomParams(customParams.filter((_, i) => i !== index));
  };

  const loadFromHistory = (entry: UtmHistoryEntry) => {
    try {
      const url = new URL(entry.url);
      setBaseUrl(`${url.origin}${url.pathname}`);
      setSource(url.searchParams.get('utm_source') || '');
      setMedium(url.searchParams.get('utm_medium') || '');
      setCampaign(url.searchParams.get('utm_campaign') || '');
      setTerm(url.searchParams.get('utm_term') || '');
      setContent(url.searchParams.get('utm_content') || '');
      setShowHistory(false);
    } catch { /* ignore */ }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">UTM Link Generator</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Create trackable campaign URLs</p>
          </div>
          {history.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="gap-1.5">
              <Clock className="size-3.5" />
              History
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* History dropdown */}
        {showHistory && history.length > 0 && (
          <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
            {history.map((entry, i) => (
              <button
                key={i}
                onClick={() => loadFromHistory(entry)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors"
              >
                <p className="truncate text-foreground">{entry.url}</p>
                <p className="text-muted-foreground text-[10px]">{new Date(entry.date).toLocaleString()}</p>
              </button>
            ))}
          </div>
        )}

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Base URL *</label>
          <Input
            placeholder="https://example.com/page"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Source *</label>
            <Input placeholder="google, facebook, newsletter" value={source} onChange={(e) => setSource(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Medium *</label>
            <Input placeholder="cpc, email, social" value={medium} onChange={(e) => setMedium(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Campaign *</label>
          <Input placeholder="spring_sale, product_launch" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Term</label>
            <Input placeholder="running+shoes" value={term} onChange={(e) => setTerm(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Content</label>
            <Input placeholder="logolink, textlink" value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
        </div>

        {/* Custom parameters */}
        {customParams.map((param, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder="Parameter name"
              value={param.key}
              onChange={(e) => updateCustomParam(i, 'key', e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Value"
              value={param.value}
              onChange={(e) => updateCustomParam(i, 'value', e.target.value)}
              className="flex-1"
            />
            <Button variant="ghost" size="icon-xs" onClick={() => removeCustomParam(i)}>
              <X className="size-3" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addCustomParam} className="gap-1.5">
          <Plus className="size-3" />
          Add custom parameter
        </Button>

        {/* Preview */}
        {generatedUrl && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <p className="text-xs text-muted-foreground">Generated URL</p>
            <p className="text-sm break-all font-mono">{generatedUrl}</p>
            <Button size="sm" onClick={copyUrl} className="gap-1.5">
              {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {copied ? 'Copied' : 'Copy URL'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
