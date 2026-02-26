'use client';

import { type NodeProps } from '@xyflow/react';
import NodeShell from './NodeShell';
import { usePromotionCanvasStore } from '@/store/promotion-canvas-store';
import { Users } from 'lucide-react';

const SEGMENT_TAGS = ['VIP', '신규', '휴면', '일반', '재구매', '이탈위험'];

export default function AudienceNode({ id, data, selected }: NodeProps) {
  const updateNodeData = usePromotionCanvasStore((s) => s.updateNodeData);

  const segmentName = (data.segmentName as string) || '';
  const description = (data.description as string) || '';
  const tags = (data.tags as string[]) || [];

  const toggleTag = (tag: string) => {
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    updateNodeData(id, { tags: next });
  };

  return (
    <NodeShell
      typeLabel="타겟"
      color="border-l-green-500"
      width="w-[240px]"
      selected={selected}
    >
      <div className="space-y-2">
        {/* Name */}
        <div className="flex items-center gap-2">
          <Users className="size-3.5 text-green-500 shrink-0" />
          <input
            className="flex-1 text-xs font-medium bg-transparent border-none outline-none placeholder:text-muted-foreground/40"
            value={segmentName}
            onChange={(e) => updateNodeData(id, { segmentName: e.target.value })}
            placeholder="세그먼트명"
          />
        </div>

        {/* Description */}
        <textarea
          className="w-full text-[11px] px-2 py-1 rounded border border-border bg-card/50 resize-none"
          rows={2}
          value={description}
          onChange={(e) => updateNodeData(id, { description: e.target.value })}
          placeholder="타겟 설명..."
        />

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {SEGMENT_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`text-[10px] px-1.5 py-0.5 rounded-full cursor-pointer transition-colors ${
                tags.includes(tag)
                  ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </NodeShell>
  );
}
