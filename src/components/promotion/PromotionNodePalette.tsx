'use client';

import { type DragEvent } from 'react';
import {
  Crown,
  Radio,
  MessageSquare,
  Users,
  DollarSign,
  Clock,
  StickyNote,
} from 'lucide-react';
import { CHANNEL_CONFIG } from './nodes/ChannelNode';
import type { PromotionNodeType } from '@/store/promotion-canvas-store';

interface PaletteItem {
  type: PromotionNodeType;
  label: string;
  icon: React.ReactNode;
  description: string;
  channelType?: string;
}

const BASE_ITEMS: PaletteItem[] = [
  { type: 'audience', label: '타겟', icon: <Users className="size-4" />, description: '타겟 세그먼트' },
  { type: 'budget', label: '예산', icon: <DollarSign className="size-4" />, description: '예산 배분' },
  { type: 'timeline', label: '타임라인', icon: <Clock className="size-4" />, description: '프로모션 단계' },
  { type: 'message', label: '메시지', icon: <MessageSquare className="size-4" />, description: '카피 메시지' },
  { type: 'note', label: '메모', icon: <StickyNote className="size-4" />, description: '자유 메모' },
];

const CHANNEL_ITEMS: PaletteItem[] = Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => ({
  type: 'channel' as PromotionNodeType,
  label: cfg.label,
  icon: <span className="text-sm">{cfg.icon}</span>,
  description: '마케팅 채널',
  channelType: key,
}));

export default function PromotionNodePalette() {
  const onDragStart = (e: DragEvent, item: PaletteItem) => {
    const data = JSON.stringify({
      type: item.type,
      channelType: item.channelType,
    });
    e.dataTransfer.setData('application/promotion-node', data);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-[220px] h-full glass-panel overflow-y-auto flex flex-col">
      <div className="px-3 py-2 border-b border-border/50">
        <p className="text-[11px] font-medium text-muted-foreground">노드 팔레트</p>
      </div>

      {/* Channels */}
      <div className="px-2 pt-2">
        <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider px-1 mb-1.5">
          채널
        </p>
        <div className="space-y-0.5">
          {CHANNEL_ITEMS.map((item) => (
            <div
              key={item.channelType}
              draggable
              onDragStart={(e) => onDragStart(e, item)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 cursor-grab active:cursor-grabbing transition-colors group"
            >
              {item.icon}
              <span className="text-xs">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Other Nodes */}
      <div className="px-2 pt-3">
        <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider px-1 mb-1.5">
          구성요소
        </p>
        <div className="space-y-0.5">
          {BASE_ITEMS.map((item) => (
            <div
              key={`${item.type}-${item.label}`}
              draggable
              onDragStart={(e) => onDragStart(e, item)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 cursor-grab active:cursor-grabbing transition-colors group"
            >
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                {item.icon}
              </span>
              <div>
                <span className="text-xs">{item.label}</span>
                <p className="text-[9px] text-muted-foreground/50">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
