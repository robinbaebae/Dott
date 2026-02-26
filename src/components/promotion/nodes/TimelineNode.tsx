'use client';

import { type NodeProps } from '@xyflow/react';
import NodeShell from './NodeShell';
import { usePromotionCanvasStore } from '@/store/promotion-canvas-store';
import { Clock } from 'lucide-react';

const PHASES = [
  { key: 'pre', label: '사전홍보', color: 'bg-blue-400' },
  { key: 'launch', label: '런칭', color: 'bg-green-500' },
  { key: 'maintain', label: '유지', color: 'bg-amber-400' },
  { key: 'end', label: '종료', color: 'bg-muted-foreground/40' },
];

export default function TimelineNode({ id, data, selected }: NodeProps) {
  const updateNodeData = usePromotionCanvasStore((s) => s.updateNodeData);

  const phases = (data.phases as { key: string; date: string }[]) || PHASES.map((p) => ({ key: p.key, date: '' }));

  const updatePhaseDate = (key: string, date: string) => {
    const next = phases.map((p) => (p.key === key ? { ...p, date } : p));
    updateNodeData(id, { phases: next });
  };

  return (
    <NodeShell
      typeLabel="타임라인"
      color="border-l-blue-500"
      width="w-[400px]"
      selected={selected}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="size-3.5 text-blue-500 shrink-0" />
          <span className="text-xs font-medium">프로모션 단계</span>
        </div>

        {/* Phase Bar */}
        <div className="flex gap-0.5 w-full">
          {PHASES.map((phase) => (
            <div key={phase.key} className="flex-1">
              <div className={`h-3 rounded-sm ${phase.color}`} />
              <p className="text-[9px] text-center mt-0.5 text-muted-foreground">{phase.label}</p>
            </div>
          ))}
        </div>

        {/* Date inputs */}
        <div className="grid grid-cols-4 gap-1">
          {PHASES.map((phase) => {
            const phaseData = phases.find((p) => p.key === phase.key);
            return (
              <input
                key={phase.key}
                type="date"
                className="text-[9px] px-1 py-0.5 rounded border border-border bg-card/50 w-full"
                value={phaseData?.date || ''}
                onChange={(e) => updatePhaseDate(phase.key, e.target.value)}
                title={`${phase.label} 시작일`}
              />
            );
          })}
        </div>
      </div>
    </NodeShell>
  );
}
