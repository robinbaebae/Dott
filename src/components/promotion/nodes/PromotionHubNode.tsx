'use client';

import { type NodeProps } from '@xyflow/react';
import NodeShell from './NodeShell';
import { usePromotionCanvasStore } from '@/store/promotion-canvas-store';
import { Crown } from 'lucide-react';

const STATUS_OPTS = [
  { value: 'draft', label: '초안' },
  { value: 'active', label: '진행 중' },
  { value: 'ended', label: '종료' },
];

export default function PromotionHubNode({ id, data, selected }: NodeProps) {
  const updateNodeData = usePromotionCanvasStore((s) => s.updateNodeData);

  const name = (data.name as string) || '';
  const type = (data.type as string) || '';
  const discountValue = (data.discountValue as string) || '';
  const startDate = (data.startDate as string) || '';
  const endDate = (data.endDate as string) || '';
  const goal = (data.goal as string) || '';
  const status = (data.status as string) || 'draft';

  return (
    <NodeShell
      typeLabel="Hub"
      color="border-l-purple-500"
      width="w-[320px]"
      selected={selected}
      handles={{ top: false, bottom: true, left: false, right: true }}
    >
      <div className="space-y-2.5">
        {/* Name */}
        <div className="flex items-center gap-2">
          <Crown className="size-4 text-purple-500 shrink-0" />
          <input
            className="flex-1 text-sm font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/40"
            value={name}
            onChange={(e) => updateNodeData(id, { name: e.target.value })}
            placeholder="프로모션명"
          />
        </div>

        {/* Type + Discount */}
        <div className="flex items-center gap-1.5">
          {type && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
              {type}
            </span>
          )}
          {discountValue && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">
              {discountValue}
            </span>
          )}
        </div>

        {/* Period */}
        {(startDate || endDate) && (
          <p className="text-[11px] text-muted-foreground">
            {startDate || '?'} ~ {endDate || '?'}
          </p>
        )}

        {/* Goal */}
        {goal && (
          <p className="text-[11px] text-muted-foreground/70">{goal}</p>
        )}

        {/* Status */}
        <select
          value={status}
          onChange={(e) => updateNodeData(id, { status: e.target.value })}
          className="w-full text-[11px] px-2 py-1 rounded border border-border bg-card cursor-pointer"
        >
          {STATUS_OPTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
    </NodeShell>
  );
}
