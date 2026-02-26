'use client';

import { Influencer } from '@/types';
import { Pencil, Mail, ExternalLink, Trash2 } from 'lucide-react';

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-500/15 text-pink-600 dark:text-pink-400',
  youtube: 'bg-red-500/15 text-red-600 dark:text-red-400',
  tiktok: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  blog: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

interface Props {
  influencer: Influencer;
  onEdit: () => void;
  onSelect: () => void;
}

export default function InfluencerCard({ influencer: inf, onEdit, onSelect }: Props) {
  const platformColor = PLATFORM_COLORS[inf.platform] || 'bg-muted text-muted-foreground';

  return (
    <div className="rounded-lg border bg-card p-4 hover:bg-muted/10 transition-colors group">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-bold text-muted-foreground">
          {inf.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-semibold truncate">{inf.name}</h3>
            <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${platformColor}`}>
              {inf.platform}
            </span>
          </div>
          {inf.handle && (
            <p className="text-[12px] text-muted-foreground">@{inf.handle}</p>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-muted transition-colors" title="수정">
            <Pencil className="size-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 rounded-md bg-muted/30">
          <p className="text-[13px] font-bold">{formatNumber(inf.followers)}</p>
          <p className="text-[10px] text-muted-foreground">팔로워</p>
        </div>
        <div className="text-center p-2 rounded-md bg-muted/30">
          <p className="text-[13px] font-bold">{inf.engagement_rate.toFixed(1)}%</p>
          <p className="text-[10px] text-muted-foreground">참여율</p>
        </div>
        <div className="text-center p-2 rounded-md bg-muted/30">
          <p className="text-[13px] font-bold">{inf.avg_likes ? formatNumber(inf.avg_likes) : '-'}</p>
          <p className="text-[10px] text-muted-foreground">평균 좋아요</p>
        </div>
      </div>

      {/* Category & Price */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {inf.category && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted font-medium">
            {inf.category}
          </span>
        )}
        {inf.price_range && (
          <span className="text-[11px] text-muted-foreground">
            {inf.price_range}
          </span>
        )}
      </div>

      {/* Tags */}
      {inf.tags && inf.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {inf.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent-foreground">
              {tag}
            </span>
          ))}
          {inf.tags.length > 4 && (
            <span className="text-[10px] text-muted-foreground">+{inf.tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <button
          onClick={onSelect}
          className="flex-1 text-[11px] px-3 py-1.5 rounded-lg bg-accent/10 text-accent-foreground hover:bg-accent/20 transition-colors text-center cursor-pointer"
        >
          <Mail className="size-3 inline mr-1" />
          아웃리치
        </button>
        {inf.handle && (
          <a
            href={
              inf.platform === 'instagram' ? `https://instagram.com/${inf.handle}` :
              inf.platform === 'youtube' ? `https://youtube.com/@${inf.handle}` :
              inf.platform === 'tiktok' ? `https://tiktok.com/@${inf.handle}` :
              '#'
            }
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            title="프로필 보기"
          >
            <ExternalLink className="size-3.5 text-muted-foreground" />
          </a>
        )}
      </div>
    </div>
  );
}
