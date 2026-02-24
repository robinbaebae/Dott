'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ExternalLink, Image, Layers, Eye } from 'lucide-react';

type AssetType = 'all' | 'banner' | 'swipe' | 'competitor_ad';

interface BannerAsset {
  asset_type: 'banner';
  id: string;
  copy: string;
  size: string;
  html: string;
  created_at: string;
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
}

type Asset = BannerAsset | SwipeAsset | CompetitorAdAsset;

const TABS: { value: AssetType; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <Layers className="size-3.5" /> },
  { value: 'banner', label: 'Banners', icon: <Image className="size-3.5" /> },
  { value: 'swipe', label: 'Swipe Files', icon: <Eye className="size-3.5" /> },
  { value: 'competitor_ad', label: 'Competitor Ads', icon: <ExternalLink className="size-3.5" /> },
];

const SWIPE_COLORS: Record<string, string> = {
  headline: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  cta: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  email: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  ad: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  landing: 'bg-pink-500/15 text-pink-600 dark:text-pink-400',
  social: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
};

export default function AssetsPage() {
  const [tab, setTab] = useState<AssetType>('all');
  const [search, setSearch] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewBanner, setPreviewBanner] = useState<BannerAsset | null>(null);

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

  const counts = {
    banner: assets.filter((a) => a.asset_type === 'banner').length,
    swipe: assets.filter((a) => a.asset_type === 'swipe').length,
    competitor_ad: assets.filter((a) => a.asset_type === 'competitor_ad').length,
  };

  return (
    <div className="max-w-6xl mx-auto px-6 pt-24 pb-12 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl tracking-tight">Assets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            배너, 스와이프 파일, 경쟁사 광고 소재 통합 라이브러리
          </p>
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search assets..."
          className="w-56 h-8 text-xs"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
              tab === t.value
                ? 'bg-accent text-accent-foreground border-accent'
                : 'border-border text-muted-foreground hover:bg-muted'
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

      {/* Content */}
      {loading ? (
        <div className="text-center py-20 text-sm text-muted-foreground">로딩 중...</div>
      ) : assets.length === 0 ? (
        <div className="text-center py-20 text-sm text-muted-foreground">
          {search ? '검색 결과가 없습니다.' : '아직 에셋이 없습니다. 배너를 생성하거나 스와이프 파일을 저장해보세요.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {assets.map((asset) => {
            if (asset.asset_type === 'banner') return <BannerCard key={`b-${asset.id}`} asset={asset} onPreview={setPreviewBanner} />;
            if (asset.asset_type === 'swipe') return <SwipeCard key={`s-${asset.id}`} asset={asset} />;
            if (asset.asset_type === 'competitor_ad') return <CompetitorAdCard key={`c-${asset.id}`} asset={asset} />;
            return null;
          })}
        </div>
      )}

      {/* Banner preview */}
      {previewBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPreviewBanner(null)}>
          <div className="bg-card rounded-xl border shadow-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div>
                <p className="text-sm font-medium truncate">{previewBanner.copy}</p>
                <p className="text-[10px] text-muted-foreground">{previewBanner.size}</p>
              </div>
              <button onClick={() => setPreviewBanner(null)} className="text-xs text-muted-foreground hover:text-foreground">
                Close
              </button>
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

// ─── Card Components ───

function BannerCard({ asset, onPreview }: { asset: BannerAsset; onPreview: (a: BannerAsset) => void }) {
  return (
    <button
      onClick={() => onPreview(asset)}
      className="relative aspect-square rounded-xl border overflow-hidden bg-card transition-all hover:scale-[1.02] hover:border-accent/40 text-left"
    >
      <Badge className="absolute top-2 right-2 z-10 text-[9px] bg-accent/10 text-accent border-accent/20">
        {asset.size}
      </Badge>
      <Badge variant="secondary" className="absolute top-2 left-2 z-10 text-[9px]">Banner</Badge>
      <iframe
        srcDoc={asset.html}
        className="w-full h-full pointer-events-none"
        sandbox="allow-same-origin"
        style={{ border: 'none', transform: 'scale(0.25)', transformOrigin: 'top left', width: '400%', height: '400%' }}
      />
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
        <p className="text-[10px] text-white truncate">{asset.copy}</p>
      </div>
    </button>
  );
}

function SwipeCard({ asset }: { asset: SwipeAsset }) {
  const catColor = SWIPE_COLORS[asset.swipe_category] || 'bg-muted text-muted-foreground';
  return (
    <a
      href={asset.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border overflow-hidden bg-card transition-all hover:scale-[1.02] hover:border-accent/40"
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-muted/30 relative overflow-hidden">
        {asset.thumbnail_url ? (
          <img src={asset.thumbnail_url} alt={asset.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
            <Eye className="size-8" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          <Badge variant="secondary" className="text-[9px]">Swipe</Badge>
          {asset.swipe_category && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${catColor}`}>
              {asset.swipe_category}
            </span>
          )}
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-xs font-medium line-clamp-2 leading-snug">{asset.title || asset.source_domain}</p>
        {asset.source_domain && (
          <p className="text-[10px] text-muted-foreground mt-1 truncate">{asset.source_domain}</p>
        )}
      </div>
    </a>
  );
}

function CompetitorAdCard({ asset }: { asset: CompetitorAdAsset }) {
  return (
    <a
      href={asset.ad_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border overflow-hidden bg-card transition-all hover:scale-[1.02] hover:border-accent/40"
    >
      <div className="aspect-square bg-muted/30 relative overflow-hidden">
        {asset.screenshot_url ? (
          <img src={asset.screenshot_url} alt="Ad" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
            <ExternalLink className="size-8" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
          <Badge variant="secondary" className="text-[9px]">Ad</Badge>
          <Badge variant="outline" className="text-[9px] bg-background/80">{asset.platform}</Badge>
        </div>
        {asset.cta_text && (
          <div className="absolute bottom-2 right-2">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-foreground/80 text-background font-medium">
              {asset.cta_text}
            </span>
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs line-clamp-2 leading-snug text-muted-foreground">
          {asset.copy_text || asset.ad_url}
        </p>
      </div>
    </a>
  );
}
