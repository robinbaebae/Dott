'use client';

import { useCallback, useEffect, useState, KeyboardEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Link as LinkIcon, Plus } from 'lucide-react';
import type { Insight, InsightContentType } from '@/types';

const FILTER_TABS: { value: InsightContentType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'article', label: 'Article' },
  { value: 'video', label: 'Video' },
  { value: 'tweet', label: 'Tweet' },
  { value: 'pdf', label: 'PDF' },
  { value: 'memory', label: 'Memory' },
];

const TYPE_COLOR: Record<InsightContentType, string> = {
  article: 'bg-blue-100 text-blue-800',
  video: 'bg-red-100 text-red-800',
  tweet: 'bg-sky-100 text-sky-800',
  pdf: 'bg-amber-100 text-amber-800',
  other: 'bg-gray-100 text-gray-800',
  memory: 'bg-orange-100 text-orange-800',
};

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [filter, setFilter] = useState<InsightContentType | 'all'>('all');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchInsights = useCallback(async () => {
    const params = filter !== 'all' ? `?content_type=${filter}` : '';
    const res = await fetch(`/api/insights${params}`);
    if (res.ok) {
      setInsights(await res.json());
    }
  }, [filter]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const saveUrl = async () => {
    if (!url.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (res.ok) {
        setUrl('');
        fetchInsights();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveUrl();
    }
  };

  const deleteInsight = async (id: string) => {
    await fetch(`/api/insights?id=${id}`, { method: 'DELETE' });
    fetchInsights();
  };

  const updateInsight = async (id: string, updates: { memo?: string; tags?: string[] }) => {
    await fetch('/api/insights', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-6 pt-24 pb-12 space-y-6 animate-in fade-in duration-500">
      <h1 className="text-2xl tracking-tight">Insights</h1>

      {/* URL input */}
      <div className="relative cursor-text">
        <LinkIcon className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-muted-foreground/60" />
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste a URL and press Enter..."
          className="w-full rounded-2xl border-2 border-[#FF4D00]/40 bg-background pl-14 pr-6 py-5 text-lg placeholder:text-muted-foreground focus:outline-none focus:border-[#FF4D00] focus:shadow-[0_0_0_4px_rgba(255,77,0,0.08)] transition-all duration-300"
        />
        {saving && (
          <div className="absolute right-5 top-1/2 -translate-y-1/2">
            <div className="size-5 border-2 border-[#FF4D00] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={filter === tab.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Insight cards */}
      {insights.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No insights saved yet. Paste a URL above to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onDelete={deleteInsight}
              onUpdate={updateInsight}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InsightCard({
  insight,
  onDelete,
  onUpdate,
}: {
  insight: Insight;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: { memo?: string; tags?: string[] }) => void;
}) {
  const [memo, setMemo] = useState(insight.memo || '');
  const [memoSaved, setMemoSaved] = useState(false);
  const [tags, setTags] = useState<string[]>(insight.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  const handleMemoBlur = () => {
    if (memo !== (insight.memo || '')) {
      onUpdate(insight.id, { memo });
      setMemoSaved(true);
      setTimeout(() => setMemoSaved(false), 1500);
    }
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed || tags.includes(trimmed)) {
      setTagInput('');
      return;
    }
    const updated = [...tags, trimmed];
    setTags(updated);
    setTagInput('');
    setShowTagInput(false);
    onUpdate(insight.id, { tags: updated });
  };

  const removeTag = (tag: string) => {
    const updated = tags.filter((t) => t !== tag);
    setTags(updated);
    onUpdate(insight.id, { tags: updated });
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Escape') {
      setShowTagInput(false);
      setTagInput('');
    }
  };

  const savedDate = new Date(insight.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Card className="group relative overflow-hidden hover:shadow-md transition-shadow">
      {insight.thumbnail_url && (
        <div className="h-32 overflow-hidden bg-muted">
          <img
            src={insight.thumbnail_url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={TYPE_COLOR[insight.content_type]}>
              {insight.content_type}
            </Badge>
            <span className="text-[10px] text-muted-foreground">{savedDate}</span>
          </div>
          <button
            onClick={() => onDelete(insight.id)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-opacity"
          >
            <X className="size-3" />
          </button>
        </div>

        <a
          href={insight.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <p className="text-sm font-medium line-clamp-2 hover:text-primary transition-colors">
            {insight.title || insight.url}
          </p>
          {insight.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {insight.description}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">
            {insight.source_domain}
          </p>
        </a>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-[#FF4D00]/10 text-[#FF4D00] px-2 py-0.5 text-[10px]"
            >
              #{tag}
              <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                <X className="size-2.5" />
              </button>
            </span>
          ))}
          {showTagInput ? (
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={() => {
                if (tagInput.trim()) addTag();
                else setShowTagInput(false);
              }}
              placeholder="tag name"
              className="text-[10px] bg-transparent border-b border-[#FF4D00]/30 outline-none w-16 px-1 py-0.5"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setShowTagInput(true)}
              className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-[#FF4D00] transition-colors"
            >
              <Plus className="size-2.5" />
              tag
            </button>
          )}
        </div>

        {/* Memo */}
        <div className="relative">
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            onBlur={handleMemoBlur}
            placeholder="Add a memo..."
            rows={2}
            className="w-full text-xs rounded-lg border border-border bg-muted/30 px-3 py-2 placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#FF4D00]/40 resize-none transition-colors"
          />
          {memoSaved && (
            <span className="absolute right-2 bottom-3 text-[10px] text-green-600">Saved</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
