'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Plus, Trash2 } from 'lucide-react';
import { SectionTitle } from './shared';

interface UtmHistoryItem {
  url: string;
  created: string;
}

const HISTORY_KEY = 'dott-utm-history';

function loadHistory(): UtmHistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch { return []; }
}

function saveHistory(items: UtmHistoryItem[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 50)));
}

export default function UtmForm({ onResult }: { onResult: (l: string, c: string) => void }) {
  const [baseUrl, setBaseUrl] = useState('');
  const [source, setSource] = useState('');
  const [medium, setMedium] = useState('');
  const [campaign, setCampaign] = useState('');
  const [term, setTerm] = useState('');
  const [content, setContent] = useState('');
  const [customParams, setCustomParams] = useState<{ key: string; value: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<UtmHistoryItem[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const buildUrl = () => {
    if (!baseUrl.trim() || !source.trim() || !medium.trim() || !campaign.trim()) return '';
    try {
      const raw = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
      const url = new URL(raw);
      url.searchParams.set('utm_source', source);
      url.searchParams.set('utm_medium', medium);
      url.searchParams.set('utm_campaign', campaign);
      if (term.trim()) url.searchParams.set('utm_term', term);
      if (content.trim()) url.searchParams.set('utm_content', content);
      customParams.forEach((p) => {
        if (p.key.trim() && p.value.trim()) url.searchParams.set(p.key, p.value);
      });
      return url.toString();
    } catch {
      return '';
    }
  };

  const generatedUrl = buildUrl();

  const handleCopyAndInject = async () => {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    // Save to history
    const newItem: UtmHistoryItem = { url: generatedUrl, created: new Date().toISOString() };
    const updated = [newItem, ...history.filter((h) => h.url !== generatedUrl)];
    setHistory(updated);
    saveHistory(updated);

    onResult('🔗 UTM 링크 생성', generatedUrl);
  };

  const handleCopyHistory = async (url: string, idx: number) => {
    await navigator.clipboard.writeText(url);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleDeleteHistory = (idx: number) => {
    const updated = history.filter((_, i) => i !== idx);
    setHistory(updated);
    saveHistory(updated);
  };

  return (
    <div className="space-y-3">
      <div>
        <SectionTitle>Base URL *</SectionTitle>
        <input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://example.com" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <SectionTitle>Source *</SectionTitle>
          <input type="text" value={source} onChange={(e) => setSource(e.target.value)} placeholder="google" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <SectionTitle>Medium *</SectionTitle>
          <input type="text" value={medium} onChange={(e) => setMedium(e.target.value)} placeholder="cpc" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <SectionTitle>Campaign *</SectionTitle>
          <input type="text" value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="spring_sale" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <SectionTitle>Term</SectionTitle>
          <input type="text" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="running+shoes" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <SectionTitle>Content</SectionTitle>
          <input type="text" value={content} onChange={(e) => setContent(e.target.value)} placeholder="logolink" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
      </div>

      {/* Custom params */}
      {customParams.map((p, i) => (
        <div key={i} className="flex gap-2 items-end">
          <div className="flex-1">
            <input type="text" value={p.key} onChange={(e) => setCustomParams((prev) => prev.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} placeholder="key" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="flex-1">
            <input type="text" value={p.value} onChange={(e) => setCustomParams((prev) => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} placeholder="value" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <button onClick={() => setCustomParams((prev) => prev.filter((_, j) => j !== i))} className="p-2 rounded-lg hover:bg-muted cursor-pointer">
            <Trash2 className="size-4 text-muted-foreground" />
          </button>
        </div>
      ))}
      <button
        onClick={() => setCustomParams((prev) => [...prev, { key: '', value: '' }])}
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
      >
        <Plus className="size-3" /> 커스텀 파라미터 추가
      </button>

      {generatedUrl && (
        <div className="p-3 rounded-lg bg-muted/50 border border-border text-xs break-all font-mono text-foreground">
          {generatedUrl}
        </div>
      )}

      <button
        onClick={handleCopyAndInject}
        disabled={!generatedUrl}
        className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors cursor-pointer flex items-center justify-center gap-2"
      >
        {copied ? <><Check className="size-4" /> 복사됨!</> : <><Copy className="size-4" /> 복사 & 채팅에 추가</>}
      </button>

      {/* History */}
      {history.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <SectionTitle>히스토리</SectionTitle>
          <div className="space-y-2 max-h-48 overflow-auto">
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-foreground truncate">{h.url}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(h.created).toLocaleDateString('ko-KR')}</p>
                </div>
                <button onClick={() => handleCopyHistory(h.url, i)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer shrink-0">
                  {copiedIdx === i ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5 text-muted-foreground" />}
                </button>
                <button onClick={() => handleDeleteHistory(i)} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer shrink-0">
                  <Trash2 className="size-3.5 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
