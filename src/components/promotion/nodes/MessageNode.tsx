'use client';

import { type NodeProps } from '@xyflow/react';
import NodeShell from './NodeShell';
import { usePromotionCanvasStore } from '@/store/promotion-canvas-store';
import { CHANNEL_CONFIG } from './ChannelNode';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function MessageNode({ id, data, selected }: NodeProps) {
  const updateNodeData = usePromotionCanvasStore((s) => s.updateNodeData);
  const [expanded, setExpanded] = useState(false);

  const channelType = (data.channelType as string) || 'instagram';
  const config = CHANNEL_CONFIG[channelType] || CHANNEL_CONFIG.instagram;
  const usp = (data.usp as string) || '';
  const ctaText = (data.ctaText as string) || '';
  const aiCopy = (data.aiCopy as string) || '';

  return (
    <NodeShell
      typeLabel={`메시지 — ${config.label}`}
      color={config.borderColor}
      width="w-[280px]"
      selected={selected}
    >
      <div className="space-y-2">
        {/* USP */}
        <div>
          <label className="text-[10px] text-muted-foreground">USP (핵심 메시지)</label>
          <textarea
            className="w-full text-xs px-2 py-1 rounded border border-border bg-card/50 mt-0.5 resize-none"
            rows={2}
            value={usp}
            onChange={(e) => updateNodeData(id, { usp: e.target.value })}
            placeholder="이 채널의 핵심 셀링 포인트..."
          />
        </div>

        {/* CTA */}
        <div>
          <label className="text-[10px] text-muted-foreground">CTA</label>
          <input
            className="w-full text-xs px-2 py-1 rounded border border-border bg-card/50 mt-0.5"
            value={ctaText}
            onChange={(e) => updateNodeData(id, { ctaText: e.target.value })}
            placeholder="지금 바로 확인하기"
          />
        </div>

        {/* AI Copy */}
        {aiCopy && (
          <div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[10px] text-accent cursor-pointer"
            >
              {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              AI 생성 카피
            </button>
            {expanded && (
              <div className="mt-1 p-2 bg-muted/30 rounded text-[11px] leading-relaxed prose prose-sm dark:prose-invert max-w-none max-h-[200px] overflow-y-auto">
                <ReactMarkdown>{aiCopy}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Generate */}
        <button
          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors cursor-pointer w-full justify-center"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('generate-channel-copy', { detail: { nodeId: id, channelType } }));
          }}
        >
          <Sparkles className="size-3" />
          AI 카피 생성
        </button>
      </div>
    </NodeShell>
  );
}
