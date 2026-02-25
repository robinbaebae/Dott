'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Influencer } from '@/types';
import { Instagram, Youtube, Pencil } from 'lucide-react';

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const PLATFORM_ICON: Record<string, React.ReactNode> = {
  instagram: <Instagram className="size-3.5" />,
  youtube: <Youtube className="size-3.5" />,
  tiktok: <span className="text-[10px] font-bold leading-none">TT</span>,
  blog: <span className="text-[10px] font-bold leading-none">B</span>,
};

interface InfluencerCardProps {
  influencer: Influencer;
  onEdit: () => void;
  onSelect?: () => void;
}

export default function InfluencerCard({ influencer, onEdit, onSelect }: InfluencerCardProps) {
  return (
    <Card
      className="hover-lift press-scale cursor-pointer group relative"
      onClick={() => onSelect?.()}
    >
      <CardContent className="p-4 flex items-start gap-3">
        {/* Avatar */}
        {influencer.profile_image_url ? (
          <img
            src={influencer.profile_image_url}
            alt={influencer.name}
            className="size-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="size-10 rounded-full bg-accent/15 text-accent flex items-center justify-center text-sm font-semibold shrink-0">
            {influencer.name.charAt(0)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Name + Handle */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-sm font-semibold truncate">{influencer.name}</span>
            {influencer.handle && (
              <span className="text-xs text-muted-foreground truncate">@{influencer.handle}</span>
            )}
          </div>

          {/* Platform badge + followers + engagement */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/15 text-accent">
              {PLATFORM_ICON[influencer.platform] ?? influencer.platform}
            </span>
            <span>{formatFollowers(influencer.followers)} 팔로워</span>
            <span>{influencer.engagement_rate.toFixed(1)}%</span>
          </div>

          {/* Category + price */}
          <div className="flex items-center gap-2">
            {influencer.category && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {influencer.category}
              </span>
            )}
            {influencer.price_range && (
              <span className="text-[11px] text-muted-foreground">{influencer.price_range}</span>
            )}
          </div>
        </div>

        {/* Edit button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-muted cursor-pointer"
          aria-label="수정"
        >
          <Pencil className="size-3.5 text-muted-foreground" />
        </button>
      </CardContent>
    </Card>
  );
}
