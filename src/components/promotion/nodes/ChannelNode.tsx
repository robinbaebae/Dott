'use client';

import { type NodeProps } from '@xyflow/react';
import NodeShell from './NodeShell';
import { usePromotionCanvasStore } from '@/store/promotion-canvas-store';
import { Sparkles, Power } from 'lucide-react';

export const CHANNEL_CONFIG: Record<string, { label: string; icon: string; color: string; borderColor: string }> = {
  instagram: { label: '인스타그램', icon: '📸', color: 'bg-pink-500/10 text-pink-600', borderColor: 'border-l-pink-500' },
  facebook: { label: '페이스북', icon: '👤', color: 'bg-blue-500/10 text-blue-600', borderColor: 'border-l-blue-500' },
  google: { label: '구글 광고', icon: '🔍', color: 'bg-emerald-500/10 text-emerald-600', borderColor: 'border-l-emerald-500' },
  naver: { label: '네이버', icon: '🟢', color: 'bg-green-500/10 text-green-600', borderColor: 'border-l-green-500' },
  youtube: { label: '유튜브', icon: '▶️', color: 'bg-red-500/10 text-red-600', borderColor: 'border-l-red-500' },
  email: { label: '이메일', icon: '✉️', color: 'bg-violet-500/10 text-violet-600', borderColor: 'border-l-violet-500' },
  sms: { label: 'SMS', icon: '💬', color: 'bg-amber-500/10 text-amber-600', borderColor: 'border-l-amber-500' },
  kakao: { label: '카카오', icon: '💛', color: 'bg-yellow-500/10 text-yellow-600', borderColor: 'border-l-yellow-500' },
};

export default function ChannelNode({ id, data, selected }: NodeProps) {
  const updateNodeData = usePromotionCanvasStore((s) => s.updateNodeData);

  const channelType = (data.channelType as string) || 'instagram';
  const config = CHANNEL_CONFIG[channelType] || CHANNEL_CONFIG.instagram;
  const budgetAmount = (data.budgetAmount as number) || 0;
  const budgetPercent = (data.budgetPercent as number) || 0;
  const usp = (data.usp as string) || '';
  const enabled = data.enabled !== false;
  const aiGenerating = data.aiGenerating === true;

  const fmt = (n: number) => n.toLocaleString('ko-KR');

  return (
    <NodeShell
      typeLabel={config.label}
      color={config.borderColor}
      width="w-[260px]"
      selected={selected}
      actions={
        <button
          onClick={() => updateNodeData(id, { enabled: !enabled })}
          className={`p-0.5 rounded cursor-pointer ${enabled ? 'text-green-500' : 'text-muted-foreground/40'}`}
          title={enabled ? '활성' : '비활성'}
        >
          <Power className="size-3" />
        </button>
      }
    >
      <div className={`space-y-2 ${!enabled ? 'opacity-40' : ''}`}>
        {/* Channel Icon + Name */}
        <div className="flex items-center gap-2">
          <span className="text-base">{config.icon}</span>
          <span className="text-xs font-medium">{config.label}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${config.color}`}>
            {budgetPercent > 0 ? `${budgetPercent}%` : '—'}
          </span>
        </div>

        {/* Budget */}
        <div>
          <label className="text-[10px] text-muted-foreground">예산</label>
          <input
            type="number"
            className="w-full text-xs px-2 py-1 rounded border border-border bg-card/50 mt-0.5"
            value={budgetAmount || ''}
            onChange={(e) => updateNodeData(id, { budgetAmount: parseInt(e.target.value) || 0 })}
            placeholder="0"
          />
          {budgetAmount > 0 && (
            <span className="text-[10px] text-muted-foreground">{fmt(budgetAmount)}원</span>
          )}
        </div>

        {/* USP Preview */}
        {usp && (
          <p className="text-[11px] text-muted-foreground/80 line-clamp-2">{usp}</p>
        )}

        {/* AI Generate Button */}
        <button
          disabled={aiGenerating}
          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors cursor-pointer disabled:opacity-50 w-full justify-center"
          onClick={() => {
            // Dispatch custom event for AI generation
            window.dispatchEvent(new CustomEvent('generate-channel-copy', { detail: { nodeId: id, channelType } }));
          }}
        >
          <Sparkles className="size-3" />
          {aiGenerating ? 'AI 생성 중...' : 'AI 카피 생성'}
        </button>
      </div>
    </NodeShell>
  );
}
