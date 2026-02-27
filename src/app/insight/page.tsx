'use client';

import { useCallback, useEffect, useState, KeyboardEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Link as LinkIcon, Plus, Search, Archive, Lightbulb, Tag, CheckSquare, Square, LayoutGrid, List } from 'lucide-react';
import { toast } from 'sonner';
import type { Insight, InsightContentType } from '@/types';
import { BookmarkImportDialog } from '@/components/insight/BookmarkImportDialog';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const FILTER_TABS: { value: InsightContentType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'article', label: 'Article' },
  { value: 'video', label: 'Video' },
  { value: 'tweet', label: 'Tweet' },
  { value: 'pdf', label: 'PDF' },
  { value: 'memory', label: 'Memory' },
  { value: 'swipe', label: 'Swipe' },
];

const TYPE_COLOR: Record<InsightContentType, string> = {
  article: 'bg-blue-100 text-blue-800',
  video: 'bg-red-100 text-red-800',
  tweet: 'bg-sky-100 text-sky-800',
  pdf: 'bg-amber-100 text-amber-800',
  other: 'bg-gray-100 text-gray-800',
  memory: 'bg-orange-100 text-orange-800',
  swipe: 'bg-violet-100 text-violet-800',
};

const SWIPE_CATEGORIES = ['Headline', 'CTA', 'Email', 'Ad', 'Landing Page', 'Social'];

const INSIGHT_TAG_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
];

function getInsightTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return INSIGHT_TAG_COLORS[Math.abs(hash) % INSIGHT_TAG_COLORS.length];
}

export default function ResearchPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [filter, setFilter] = useState<InsightContentType | 'all'>('all');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [swipeMode, setSwipeMode] = useState(false);
  const [swipeCategory, setSwipeCategory] = useState('Headline');
  const [search, setSearch] = useState('');
  const [allUrls, setAllUrls] = useState<Set<string>>(new Set());
  const duplicateUrl = url.trim() ? allUrls.has(url.trim().replace(/\/+$/, '')) : false;

  // #5 Tag filter
  const [tagFilter, setTagFilter] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);

  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Electron detection
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.readChromeBookmarks;

  // #6 Bulk selection
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkTagInput, setBulkTagInput] = useState('');

  // Fetch all saved URLs once for duplicate detection
  useEffect(() => {
    fetch('/api/insights').then(async (res) => {
      if (res.ok) {
        const data: Insight[] = await res.json();
        setAllUrls(new Set(data.map((d) => d.url.replace(/\/+$/, ''))));
        // Collect all unique tags
        const tags = new Set<string>();
        for (const d of data) {
          if (d.tags) d.tags.forEach((t) => tags.add(t));
        }
        setAllTags(Array.from(tags).sort());
      }
    });
  }, [insights]);

  const fetchInsights = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('content_type', filter);
    if (search) params.set('q', search);
    if (tagFilter) params.set('tag', tagFilter);
    const qs = params.toString();
    const res = await fetch(`/api/insights${qs ? `?${qs}` : ''}`);
    if (res.ok) {
      setInsights(await res.json());
    }
  }, [filter, search, tagFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchInsights, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchInsights, search]);

  const saveUrl = async () => {
    if (!url.trim() || saving || duplicateUrl) return;
    setSaving(true);
    try {
      const body: Record<string, string> = { url: url.trim() };
      if (swipeMode) {
        body.content_type = 'swipe';
        body.swipe_category = swipeCategory;
      }
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setUrl('');
        fetchInsights();
        toast.success('링크가 아카이브되었습니다');
      } else {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Insight save error:', err);
        toast.error(err.error || '아카이브에 실패했습니다');
      }
    } catch (e) {
      console.error('Insight save exception:', e);
      toast.error('아카이브 중 오류가 발생했습니다');
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

  // #6 Bulk tag operations
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === insights.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(insights.map((i) => i.id)));
    }
  };

  const applyBulkTag = async () => {
    const tag = bulkTagInput.trim();
    if (!tag || selected.size === 0) return;
    const promises = insights
      .filter((i) => selected.has(i.id))
      .map((i) => {
        const updated = [...new Set([...(i.tags || []), tag])];
        return updateInsight(i.id, { tags: updated });
      });
    await Promise.all(promises);
    setBulkTagInput('');
    setSelected(new Set());
    setBulkMode(false);
    fetchInsights();
    toast.success(`${promises.length}개 인사이트에 "${tag}" 태그 추가됨`);
  };

  // Filter insights by tag (client-side)
  const displayedInsights = tagFilter
    ? insights.filter((i) => i.tags?.includes(tagFilter))
    : insights;

  return (
    <div className="max-w-6xl mx-auto px-6 pt-2 pb-0 space-y-4 animate-in fade-in duration-500">

      {/* URL input */}
      <div className="space-y-1.5">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="보관하고 싶은 링크를 넣어주세요"
              className={`w-full rounded-xl border bg-background pl-11 pr-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 transition-all duration-200 ${
                duplicateUrl
                  ? 'border-amber-400 focus:border-amber-400 focus:ring-amber-300/20'
                  : 'border-border focus:border-pink-400 focus:ring-pink-300/20'
              }`}
            />
          </div>
          <button
            onClick={saveUrl}
            disabled={!url.trim() || saving || duplicateUrl}
            className="shrink-0 p-2 rounded-lg text-muted-foreground hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-950/30 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            {saving ? (
              <div className="size-4 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Archive className="size-4" />
            )}
          </button>
        </div>
        {duplicateUrl && (
          <p className="text-xs text-amber-500 pl-1">이미 저장된 링크입니다</p>
        )}
      </div>

      {/* Search + Filter tabs + Tag filter + View toggle */}
      <div className="flex items-center gap-3 flex-wrap pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/60" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search insights..."
            className="rounded-lg border border-border bg-background pl-9 pr-3 py-1.5 text-xs w-56 focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-muted-foreground/50"
          />
        </div>
        <div className="flex gap-0.5 p-0.5 rounded-xl bg-muted/30 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                filter === tab.value
                  ? 'bg-card text-foreground elevation-1'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* #5 Tag filter */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1">
            <Tag className="size-3 text-muted-foreground" />
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="text-xs border border-border rounded-lg px-2 py-1 bg-background text-foreground"
            >
              <option value="">All Tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>#{t}</option>
              ))}
            </select>
            {tagFilter && (
              <button onClick={() => setTagFilter('')} className="p-0.5 rounded hover:bg-muted">
                <X className="size-3 text-muted-foreground" />
              </button>
            )}
          </div>
        )}
        {/* Chrome bookmark import (Electron only) */}
        {isElectron && <BookmarkImportDialog onImported={fetchInsights} />}
        {/* View mode toggle */}
        <div className="ml-auto flex gap-1 p-1 rounded-xl bg-muted/50 border border-border/50">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <List className="size-4" />
          </button>
        </div>
        {/* #6 Bulk mode toggle */}
        <button
          onClick={() => { setBulkMode(!bulkMode); setSelected(new Set()); }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors ${
            bulkMode ? 'bg-violet-500 text-white' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <CheckSquare className="size-3" />
          Bulk Edit
        </button>
      </div>

      {/* #6 Bulk tag bar */}
      {bulkMode && selected.size > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-violet-300 bg-violet-50 dark:bg-violet-950/20">
          <button onClick={selectAll} className="text-xs text-violet-600 hover:underline">
            {selected.size === insights.length ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-xs text-violet-600">{selected.size}개 선택</span>
          <div className="flex-1" />
          <input
            value={bulkTagInput}
            onChange={(e) => setBulkTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applyBulkTag(); }}
            placeholder="Tag name"
            className="px-2 py-1 text-xs rounded-md border border-violet-300 bg-white dark:bg-background w-32"
          />
          <button
            onClick={applyBulkTag}
            disabled={!bulkTagInput.trim()}
            className="px-3 py-1 rounded-md bg-violet-500 text-white text-xs font-medium disabled:opacity-50"
          >
            Apply Tag
          </button>
        </div>
      )}

      {/* Insight cards */}
      {displayedInsights.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No insights saved yet. Paste a URL above to get started.
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {displayedInsights.map((insight) => (
            <InsightCard
              key={insight.id}
              insight={insight}
              onDelete={deleteInsight}
              onUpdate={updateInsight}
              bulkMode={bulkMode}
              isSelected={selected.has(insight.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {displayedInsights.map((insight) => (
            <InsightRow
              key={insight.id}
              insight={insight}
              onDelete={deleteInsight}
              onUpdate={updateInsight}
              bulkMode={bulkMode}
              isSelected={selected.has(insight.id)}
              onToggleSelect={toggleSelect}
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
  bulkMode,
  isSelected,
  onToggleSelect,
}: {
  insight: Insight;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: { memo?: string; tags?: string[] }) => void;
  bulkMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
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
    <Card className={`group relative overflow-hidden hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-violet-500' : ''}`}>
      {/* #6 Bulk selection checkbox */}
      {bulkMode && (
        <button
          onClick={() => onToggleSelect(insight.id)}
          className="absolute top-2 left-2 z-10 p-0.5 rounded bg-background/80"
        >
          {isSelected ? <CheckSquare className="size-4 text-violet-500" /> : <Square className="size-4 text-muted-foreground/40" />}
        </button>
      )}
      {insight.thumbnail_url && (
        <div className="h-24 overflow-hidden bg-muted">
          <img
            src={insight.thumbnail_url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${TYPE_COLOR[insight.content_type]}`}>
              {insight.content_type}
            </Badge>
            {insight.content_type === 'swipe' && insight.swipe_category && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-300 text-violet-700">
                {insight.swipe_category}
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground">{savedDate}</span>
          </div>
          <button
            onClick={() => onDelete(insight.id)}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted transition-opacity shrink-0"
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
          <p className="text-xs font-medium line-clamp-2 hover:text-primary transition-colors leading-snug">
            {insight.title || insight.url}
          </p>
          {insight.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
              {insight.description}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {insight.source_domain}
          </p>
        </a>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${getInsightTagColor(tag)}`}
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
              className="text-[10px] bg-transparent border-b border-accent/30 outline-none w-16 px-1 py-0.5"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setShowTagInput(true)}
              className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-accent transition-colors"
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
            className="w-full text-xs rounded-lg border border-border bg-muted/30 px-3 py-2 placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/40 resize-none transition-colors"
          />
          {memoSaved && (
            <span className="absolute right-2 bottom-3 text-[10px] text-green-600">Saved</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InsightRow({
  insight,
  onDelete,
  onUpdate,
  bulkMode,
  isSelected,
  onToggleSelect,
}: {
  insight: Insight;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: { memo?: string; tags?: string[] }) => void;
  bulkMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const [tags, setTags] = useState<string[]>(insight.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed || tags.includes(trimmed)) { setTagInput(''); return; }
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

  const savedDate = new Date(insight.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className={`group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors ${isSelected ? 'ring-2 ring-violet-500 bg-muted/30' : ''}`}>
      {bulkMode && (
        <button onClick={() => onToggleSelect(insight.id)} className="shrink-0">
          {isSelected ? <CheckSquare className="size-4 text-violet-500" /> : <Square className="size-4 text-muted-foreground/40" />}
        </button>
      )}
      {insight.thumbnail_url && (
        <img src={insight.thumbnail_url} alt="" className="size-10 rounded object-cover shrink-0 bg-muted" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <a href={insight.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium truncate hover:text-primary transition-colors">
            {insight.title || insight.url}
          </a>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${TYPE_COLOR[insight.content_type]}`}>
            {insight.content_type}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{insight.source_domain}</span>
          {tags.map((tag) => (
            <span key={tag} className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0 text-[10px] ${getInsightTagColor(tag)}`}>
              #{tag}
              <button onClick={() => removeTag(tag)} className="hover:text-destructive"><X className="size-2" /></button>
            </span>
          ))}
          {showTagInput ? (
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } else if (e.key === 'Escape') { setShowTagInput(false); setTagInput(''); } }}
              onBlur={() => { if (tagInput.trim()) addTag(); else setShowTagInput(false); }}
              placeholder="tag"
              className="text-[10px] bg-transparent border-b border-accent/30 outline-none w-14 px-1"
              autoFocus
            />
          ) : (
            <button onClick={() => setShowTagInput(true)} className="text-[10px] text-muted-foreground hover:text-accent transition-colors">
              <Plus className="size-2.5" />
            </button>
          )}
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground shrink-0">{savedDate}</span>
      <button
        onClick={() => onDelete(insight.id)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-opacity shrink-0"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}
