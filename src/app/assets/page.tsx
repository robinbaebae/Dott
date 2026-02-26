'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ExternalLink, Image, Layers, Eye, Download, Trash2, FolderOpen, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

type AssetType = 'all' | 'banner' | 'swipe' | 'competitor_ad';

interface BannerAsset {
  asset_type: 'banner';
  id: string;
  copy: string;
  size: string;
  html: string;
  created_at: string;
  folder?: string;
}

interface SwipeAsset {
  asset_type: 'swipe';
  id: string;
  url: string;
  title: string;
  description: string;
  thumbnail_url: string;
  source_domain: string;
  swipe_category: string;
  tags: string[];
  created_at: string;
  folder?: string;
}

interface CompetitorAdAsset {
  asset_type: 'competitor_ad';
  id: string;
  platform: string;
  ad_url: string;
  creative_type: string;
  copy_text: string | null;
  cta_text: string | null;
  screenshot_url: string | null;
  discovered_at: string;
  folder?: string;
}

type Asset = BannerAsset | SwipeAsset | CompetitorAdAsset;

const TABS: { value: AssetType; label: string; icon: React.ReactNode; activeColor: string }[] = [
  { value: 'all', label: 'All', icon: <Layers className="size-3.5" />, activeColor: 'bg-accent text-accent-foreground' },
  { value: 'banner', label: 'Banners', icon: <Image className="size-3.5" />, activeColor: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30' },
  { value: 'swipe', label: 'Swipe Files', icon: <Eye className="size-3.5" />, activeColor: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30' },
  { value: 'competitor_ad', label: 'Competitor Ads', icon: <ExternalLink className="size-3.5" />, activeColor: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30' },
];

const SWIPE_COLORS: Record<string, string> = {
  headline: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  cta: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  email: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  ad: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  landing: 'bg-pink-500/15 text-pink-600 dark:text-pink-400',
  social: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
};

// #13 Folder/collection system (localStorage)
const FOLDER_KEY = 'dott_asset_folders';

function loadFolders(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(FOLDER_KEY) || '{}'); } catch { return {}; }
}
function saveFolders(map: Record<string, string>) {
  localStorage.setItem(FOLDER_KEY, JSON.stringify(map));
}

export default function AssetsPage() {
  const [tab, setTab] = useState<AssetType>('all');
  const [search, setSearch] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewBanner, setPreviewBanner] = useState<BannerAsset | null>(null);

  // #13 Folders
  const [folderMap, setFolderMap] = useState<Record<string, string>>({});
  const [folderFilter, setFolderFilter] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [assigningFolder, setAssigningFolder] = useState<string | null>(null); // asset id

  useEffect(() => {
    setFolderMap(loadFolders());
  }, []);

  const allFolders = useMemo(() => {
    const set = new Set(Object.values(folderMap));
    return Array.from(set).filter(Boolean).sort();
  }, [folderMap]);

  const assignFolder = (assetId: string, folder: string) => {
    const updated = { ...folderMap, [assetId]: folder };
    setFolderMap(updated);
    saveFolders(updated);
    setAssigningFolder(null);
    toast.success(`"${folder}" \uD3F4\uB354\uC5D0 \uCD94\uAC00\uB428`);
  };

  const removeFolder = (assetId: string) => {
    const updated = { ...folderMap };
    delete updated[assetId];
    setFolderMap(updated);
    saveFolders(updated);
  };

  const createFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    setNewFolderName('');
    setShowNewFolder(false);
    if (assigningFolder) {
      assignFolder(assigningFolder, name);
    }
    toast.success(`"${name}" \uD3F4\uB354 \uC0DD\uC131\uB428`);
  };

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: tab });
      if (search) params.set('q', search);
      const res = await fetch(`/api/assets?${params}`);
      if (res.ok) {
        const data = await res.json();
        const merged: Asset[] = [
          ...(data.banners || []),
          ...(data.swipes || []),
          ...(data.competitor_ads || []),
        ];
        // Sort by date descending
        merged.sort((a, b) => {
          const dateA = 'created_at' in a ? a.created_at : (a as CompetitorAdAsset).discovered_at;
          const dateB = 'created_at' in b ? b.created_at : (b as CompetitorAdAsset).discovered_at;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
        setAssets(merged);
      }
    } catch {
      // skip
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => {
    const timer = setTimeout(fetchAssets, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchAssets]);

  const downloadBanner = (banner: BannerAsset) => {
    const blob = new Blob([banner.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `banner-${banner.copy.slice(0, 20).replace(/\s+/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteAsset = useCallback(async (id: string, asset_type: string) => {
    if (!confirm('\uC774 \uC5D0\uC14B\uC744 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?')) return;
    try {
      const res = await fetch('/api/assets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, asset_type }),
      });
      if (res.ok) {
        setAssets((prev) => prev.filter((a) => a.id !== id));
        toast.success('\uC5D0\uC14B\uC774 \uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4');
      } else {
        toast.error('\uC0AD\uC81C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4');
      }
    } catch {
      toast.error('\uC0AD\uC81C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4');
    }
  }, []);

  // #13 Filter by folder
  const displayedAssets = useMemo(() => {
    if (!folderFilter) return assets;
    return assets.filter((a) => folderMap[a.id] === folderFilter);
  }, [assets, folderFilter, folderMap]);

  const counts = {
    banner: assets.filter((a) => a.asset_type === 'banner').length,
    swipe: assets.filter((a) => a.asset_type === 'swipe').length,
    competitor_ad: assets.filter((a) => a.asset_type === 'competitor_ad').length,
  };

  return (
    <div className="max-w-6xl mx-auto px-6 pt-2 pb-12 space-y-4 animate-in fade-in duration-500">
      {/* Search */}
      <div className="flex justify-end">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search assets..."
          className="w-56 h-8 text-xs"
        />
      </div>

      {/* Tabs */}
      <div className="inline-flex gap-0.5 p-0.5 rounded-xl bg-muted/30">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === t.value
                ? 'bg-card text-foreground elevation-1'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon}
            {t.label}
            {tab === 'all' && t.value !== 'all' && counts[t.value] > 0 && (
              <span className="text-[10px] opacity-60">{counts[t.value]}</span>
            )}
          </button>
        ))}
      </div>

      {/* #13 Folder filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <FolderOpen className="size-3.5 text-muted-foreground" />
        <div className="inline-flex gap-0.5 p-0.5 rounded-xl bg-muted/30">
          <button
            onClick={() => setFolderFilter('')}
            className={`px-2.5 py-0.5 rounded-lg text-xs transition-colors ${
              !folderFilter ? 'bg-card elevation-1 font-medium' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          {allFolders.map((f) => (
            <button
              key={f}
              onClick={() => setFolderFilter(f)}
              className={`px-2.5 py-0.5 rounded-lg text-xs transition-colors ${
                folderFilter === f ? 'bg-card elevation-1 font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        {showNewFolder ? (
          <div className="flex items-center gap-1">
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
              placeholder="Folder name"
              className="px-2 py-0.5 text-xs border rounded-md w-28 bg-background"
              autoFocus
            />
            <button onClick={createFolder} className="text-xs text-accent hover:underline">Add</button>
            <button onClick={() => setShowNewFolder(false)}><X className="size-3 text-muted-foreground" /></button>
          </div>
        ) : (
          <button onClick={() => setShowNewFolder(true)} className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-accent">
            <Plus className="size-3" /> Folder
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-20 text-sm text-muted-foreground">로딩 중...</div>
      ) : displayedAssets.length === 0 ? (
        <div className="text-center py-20 text-sm text-muted-foreground">
          {search ? '\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.' : '\uC544\uC9C1 \uC5D0\uC14B\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uBC30\uB108\uB97C \uC0DD\uC131\uD558\uAC70\uB098 \uC2A4\uC640\uC774\uD504 \uD30C\uC77C\uC744 \uC800\uC7A5\uD574\uBCF4\uC138\uC694.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {displayedAssets.map((asset) => {
            const folder = folderMap[asset.id];
            if (asset.asset_type === 'banner') return <BannerCard key={`b-${asset.id}`} asset={asset} folder={folder} allFolders={allFolders} onPreview={setPreviewBanner} onDownload={downloadBanner} onDelete={deleteAsset} onAssignFolder={assignFolder} onRemoveFolder={removeFolder} onNewFolder={(id) => { setAssigningFolder(id); setShowNewFolder(true); }} />;
            if (asset.asset_type === 'swipe') return <SwipeCard key={`s-${asset.id}`} asset={asset} folder={folder} allFolders={allFolders} onDelete={deleteAsset} onAssignFolder={assignFolder} onRemoveFolder={removeFolder} onNewFolder={(id) => { setAssigningFolder(id); setShowNewFolder(true); }} />;
            if (asset.asset_type === 'competitor_ad') return <CompetitorAdCard key={`c-${asset.id}`} asset={asset} folder={folder} allFolders={allFolders} onDelete={deleteAsset} onAssignFolder={assignFolder} onRemoveFolder={removeFolder} onNewFolder={(id) => { setAssigningFolder(id); setShowNewFolder(true); }} />;
            return null;
          })}
        </div>
      )}

      {/* Banner preview */}
      {previewBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPreviewBanner(null)}>
          <div className="glass-float rounded-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div>
                <p className="text-sm font-medium truncate">{previewBanner.copy}</p>
                <p className="text-[10px] text-muted-foreground">{previewBanner.size}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadBanner(previewBanner)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-950/30 transition-colors"
                  title="\uB2E4\uC6B4\uB85C\uB4DC"
                >
                  <Download className="size-4" />
                </button>
                <button onClick={() => setPreviewBanner(null)} className="text-xs text-muted-foreground hover:text-foreground">
                  Close
                </button>
              </div>
            </div>
            <div className="flex justify-center p-6 bg-muted/10">
              <iframe
                srcDoc={previewBanner.html}
                className="rounded-lg"
                style={{ width: 400, height: 400, border: 'none' }}
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// #13 Folder dropdown for card
function FolderBadge({ assetId, folder, allFolders, onAssign, onRemove, onNew }: {
  assetId: string; folder?: string; allFolders: string[];
  onAssign: (id: string, folder: string) => void;
  onRemove: (id: string) => void;
  onNew: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (folder) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[8px] bg-muted/80 text-muted-foreground px-1.5 py-0.5 rounded-full">
        <FolderOpen className="size-2" />{folder}
        <button onClick={(e) => { e.stopPropagation(); onRemove(assetId); }}><X className="size-2" /></button>
      </span>
    );
  }
  return (
    <div className="relative">
      <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="opacity-0 group-hover:opacity-100 text-[8px] bg-muted/80 text-muted-foreground px-1.5 py-0.5 rounded-full transition-opacity flex items-center gap-0.5">
        <FolderOpen className="size-2" />folder
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 glass-float rounded-xl z-20 py-1 min-w-[100px]" onClick={(e) => e.stopPropagation()}>
          {allFolders.map((f) => (
            <button key={f} onClick={() => { onAssign(assetId, f); setOpen(false); }}
              className="block w-full text-left px-3 py-1 text-xs hover:bg-muted">{f}</button>
          ))}
          <button onClick={() => { onNew(assetId); setOpen(false); }}
            className="block w-full text-left px-3 py-1 text-xs text-accent hover:bg-muted border-t">
            + New Folder
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Card Components ───

function BannerCard({ asset, folder, allFolders, onPreview, onDownload, onDelete, onAssignFolder, onRemoveFolder, onNewFolder }: {
  asset: BannerAsset; folder?: string; allFolders: string[];
  onPreview: (a: BannerAsset) => void; onDownload: (a: BannerAsset) => void; onDelete: (id: string, type: string) => void;
  onAssignFolder: (id: string, f: string) => void; onRemoveFolder: (id: string) => void; onNewFolder: (id: string) => void;
}) {
  return (
    <div
      className="group relative aspect-square rounded-xl border overflow-hidden bg-card transition-all hover:scale-[1.02] hover:border-accent/40 cursor-pointer"
      onClick={() => onPreview(asset)}
    >
      <Badge className="absolute top-2 right-2 z-10 text-[10px] bg-accent/10 text-accent border-accent/20">
        {asset.size}
      </Badge>
      <Badge variant="secondary" className="absolute top-2 left-2 z-10 text-[10px]">Banner</Badge>
      <iframe
        srcDoc={asset.html}
        className="w-full h-full pointer-events-none"
        sandbox="allow-same-origin"
        style={{ border: 'none', transform: 'scale(0.25)', transformOrigin: 'top left', width: '400%', height: '400%' }}
      />
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
        <div className="flex items-end justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-white truncate">{asset.copy}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <p className="text-[10px] text-white/60">{new Date(asset.created_at).toLocaleDateString('ko-KR')}</p>
              <FolderBadge assetId={asset.id} folder={folder} allFolders={allFolders} onAssign={onAssignFolder} onRemove={onRemoveFolder} onNew={onNewFolder} />
            </div>
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
            <button
              onClick={(e) => { e.stopPropagation(); onDownload(asset); }}
              className="p-1 rounded-md bg-white/20 hover:bg-white/40 text-white"
              title="\uB2E4\uC6B4\uB85C\uB4DC"
            >
              <Download className="size-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(asset.id, 'banner'); }}
              className="p-1 rounded-md bg-white/20 hover:bg-red-500/60 text-white"
              title="\uC0AD\uC81C"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SwipeCard({ asset, folder, allFolders, onDelete, onAssignFolder, onRemoveFolder, onNewFolder }: {
  asset: SwipeAsset; folder?: string; allFolders: string[];
  onDelete: (id: string, type: string) => void;
  onAssignFolder: (id: string, f: string) => void; onRemoveFolder: (id: string) => void; onNewFolder: (id: string) => void;
}) {
  const catColor = SWIPE_COLORS[asset.swipe_category] || 'bg-muted text-muted-foreground';
  return (
    <div className="group relative rounded-xl border overflow-hidden bg-card transition-all hover:scale-[1.02] hover:border-accent/40">
      <a href={asset.url} target="_blank" rel="noopener noreferrer" className="block">
        <div className="aspect-square bg-muted/30 relative overflow-hidden">
          {asset.thumbnail_url ? (
            <img src={asset.thumbnail_url} alt={asset.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
              <Eye className="size-8" />
            </div>
          )}
          <div className="absolute top-2 left-2 flex gap-1">
            <Badge variant="secondary" className="text-[10px]">Swipe</Badge>
            {asset.swipe_category && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${catColor}`}>
                {asset.swipe_category}
              </span>
            )}
          </div>
        </div>
        <div className="p-2.5">
          <p className="text-xs font-medium line-clamp-2 leading-snug">{asset.title || asset.source_domain}</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] text-muted-foreground truncate">{asset.source_domain}</p>
            <p className="text-[10px] text-muted-foreground/60 shrink-0">{new Date(asset.created_at).toLocaleDateString('ko-KR')}</p>
          </div>
          <div className="mt-1">
            <FolderBadge assetId={asset.id} folder={folder} allFolders={allFolders} onAssign={onAssignFolder} onRemove={onRemoveFolder} onNew={onNewFolder} />
          </div>
        </div>
      </a>
      <button
        onClick={() => onDelete(asset.id, 'swipe')}
        className="absolute top-2 right-2 p-1 rounded-md bg-black/40 hover:bg-red-500/70 text-white opacity-0 group-hover:opacity-100 transition-all z-10"
        title="\uC0AD\uC81C"
      >
        <Trash2 className="size-3" />
      </button>
    </div>
  );
}

function CompetitorAdCard({ asset, folder, allFolders, onDelete, onAssignFolder, onRemoveFolder, onNewFolder }: {
  asset: CompetitorAdAsset; folder?: string; allFolders: string[];
  onDelete: (id: string, type: string) => void;
  onAssignFolder: (id: string, f: string) => void; onRemoveFolder: (id: string) => void; onNewFolder: (id: string) => void;
}) {
  return (
    <div className="group relative rounded-xl border overflow-hidden bg-card transition-all hover:scale-[1.02] hover:border-accent/40">
      <a href={asset.ad_url} target="_blank" rel="noopener noreferrer" className="block">
        <div className="aspect-square bg-muted/30 relative overflow-hidden">
          {asset.screenshot_url ? (
            <img src={asset.screenshot_url} alt="Ad" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
              <ExternalLink className="size-8" />
            </div>
          )}
          <div className="absolute top-2 left-2 flex gap-1">
            <Badge variant="secondary" className="text-[10px]">Ad</Badge>
            <Badge variant="outline" className="text-[10px] bg-background/80">{asset.platform}</Badge>
          </div>
          {asset.cta_text && (
            <div className="absolute bottom-2 right-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/80 text-background font-medium">
                {asset.cta_text}
              </span>
            </div>
          )}
        </div>
        <div className="p-2.5">
          <p className="text-xs line-clamp-2 leading-snug text-muted-foreground">
            {asset.copy_text || asset.ad_url}
          </p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] text-muted-foreground/60">{new Date(asset.discovered_at).toLocaleDateString('ko-KR')}</p>
            <FolderBadge assetId={asset.id} folder={folder} allFolders={allFolders} onAssign={onAssignFolder} onRemove={onRemoveFolder} onNew={onNewFolder} />
          </div>
        </div>
      </a>
      <button
        onClick={() => onDelete(asset.id, 'competitor_ad')}
        className="absolute top-2 right-2 p-1 rounded-md bg-black/40 hover:bg-red-500/70 text-white opacity-0 group-hover:opacity-100 transition-all z-10"
        title="\uC0AD\uC81C"
      >
        <Trash2 className="size-3" />
      </button>
    </div>
  );
}
