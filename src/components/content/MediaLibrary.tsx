'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';
import { BannerDesign } from '@/types';

const FILTERS = ['All', 'Banners', 'Favorites'] as const;

export default function MediaLibrary() {
  const [banners, setBanners] = useState<BannerDesign[]>([]);
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [favs, setFavs] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('dott-media-favs') || '[]');
      setFavs(new Set(stored));
    } catch { /* ignore */ }
  }, []);

  const toggleFav = (id: string) => {
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem('dott-media-favs', JSON.stringify([...next]));
      return next;
    });
  };

  const fetchBanners = useCallback(async () => {
    try {
      const res = await fetch('/api/banner');
      if (res.ok) {
        const data = await res.json();
        setBanners(Array.isArray(data) ? data : data.banners || []);
      }
    } catch { /* skip */ }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const filtered = banners.filter((b) => {
    if (search && !b.copy.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'Banners' && !b.size) return false;
    if (filter === 'Favorites' && !favs.has(b.id)) return false;
    return true;
  });

  const previewBanner = banners.find((b) => b.id === previewId);

  return (
    <div>
      {/* Filters + Search */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filter === f
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search media..."
          className="w-56 h-8 text-xs"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          {banners.length === 0
            ? 'Media Library is empty. Create banners in Compose or Ad Pipeline.'
            : 'No results found.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((b) => (
            <button
              key={b.id}
              onClick={() => setPreviewId(previewId === b.id ? null : b.id)}
              className={`relative aspect-square rounded-xl border overflow-hidden bg-card transition-all hover:scale-[1.02] ${
                previewId === b.id ? 'border-accent ring-2 ring-accent/20' : 'border-border'
              }`}
            >
              <Badge className="absolute top-2 right-2 text-[9px] bg-accent/10 text-accent border-accent/20">
                {b.size}
              </Badge>
              <button
                onClick={(e) => { e.stopPropagation(); toggleFav(b.id); }}
                className="absolute top-2 left-2 p-1 rounded-full bg-black/30 hover:bg-black/50 transition-colors cursor-pointer"
              >
                <Star className={`size-3 ${favs.has(b.id) ? 'fill-yellow-400 text-yellow-400' : 'text-white/70'}`} />
              </button>
              <iframe
                srcDoc={b.html}
                className="w-full h-full pointer-events-none"
                sandbox="allow-same-origin"
                style={{ border: 'none', transform: 'scale(0.25)', transformOrigin: 'top left', width: '400%', height: '400%' }}
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                <p className="text-[10px] text-white truncate">{b.copy}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Preview panel */}
      {previewBanner && (
        <div className="mt-4 border rounded-xl overflow-hidden bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div>
              <p className="text-sm font-medium">{previewBanner.copy}</p>
              <p className="text-[10px] text-muted-foreground">{previewBanner.size} &bull; {new Date(previewBanner.created_at).toLocaleDateString()}</p>
            </div>
            <button onClick={() => setPreviewId(null)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
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
      )}
    </div>
  );
}
