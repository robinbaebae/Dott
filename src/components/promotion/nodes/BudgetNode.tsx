'use client';

import { type NodeProps } from '@xyflow/react';
import NodeShell from './NodeShell';
import { usePromotionCanvasStore } from '@/store/promotion-canvas-store';
import { DollarSign } from 'lucide-react';

export default function BudgetNode({ id, data, selected }: NodeProps) {
  const updateNodeData = usePromotionCanvasStore((s) => s.updateNodeData);
  const nodes = usePromotionCanvasStore((s) => s.nodes);

  const totalBudget = (data.totalBudget as number) || 0;
  const fmt = (n: number) => n.toLocaleString('ko-KR');

  // Gather channel budgets from all channel nodes
  const channelBudgets = nodes
    .filter((n) => n.type === 'channel' && n.data.enabled !== false)
    .map((n) => ({
      label: (n.data.channelType as string) || 'unknown',
      amount: (n.data.budgetAmount as number) || 0,
    }))
    .filter((c) => c.amount > 0);

  const allocated = channelBudgets.reduce((s, c) => s + c.amount, 0);
  const remaining = totalBudget - allocated;

  // Color map for bar segments
  const barColors: Record<string, string> = {
    instagram: 'bg-pink-500',
    facebook: 'bg-blue-500',
    google: 'bg-emerald-500',
    naver: 'bg-green-500',
    youtube: 'bg-red-500',
    email: 'bg-violet-500',
    sms: 'bg-amber-500',
    kakao: 'bg-yellow-500',
  };

  const channelLabels: Record<string, string> = {
    instagram: '인스타',
    facebook: '페북',
    google: '구글',
    naver: '네이버',
    youtube: '유튜브',
    email: '이메일',
    sms: 'SMS',
    kakao: '카카오',
  };

  return (
    <NodeShell
      typeLabel="예산"
      color="border-l-amber-500"
      width="w-[300px]"
      selected={selected}
    >
      <div className="space-y-2.5">
        {/* Total Budget */}
        <div className="flex items-center gap-2">
          <DollarSign className="size-4 text-amber-500 shrink-0" />
          <input
            type="number"
            className="flex-1 text-lg font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/40"
            value={totalBudget || ''}
            onChange={(e) => updateNodeData(id, { totalBudget: parseInt(e.target.value) || 0 })}
            placeholder="총 예산"
          />
          <span className="text-xs text-muted-foreground">원</span>
        </div>

        {/* Stack Bar */}
        {totalBudget > 0 && channelBudgets.length > 0 && (
          <div>
            <div className="w-full h-5 rounded-full bg-muted/30 overflow-hidden flex">
              {channelBudgets.map((c) => {
                const pct = Math.min((c.amount / totalBudget) * 100, 100);
                return (
                  <div
                    key={c.label}
                    className={`h-full ${barColors[c.label] || 'bg-muted'} transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${channelLabels[c.label] || c.label}: ${fmt(c.amount)}원 (${pct.toFixed(1)}%)`}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
              {channelBudgets.map((c) => (
                <span key={c.label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className={`size-2 rounded-full ${barColors[c.label] || 'bg-muted'}`} />
                  {channelLabels[c.label] || c.label} {fmt(c.amount)}원
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="flex justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
          <span>배분: {fmt(allocated)}원</span>
          <span className={remaining < 0 ? 'text-red-500' : ''}>
            잔여: {fmt(remaining)}원
          </span>
        </div>
      </div>
    </NodeShell>
  );
}
