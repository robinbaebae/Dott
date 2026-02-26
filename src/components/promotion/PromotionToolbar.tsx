'use client';

import { usePromotionCanvasStore } from '@/store/promotion-canvas-store';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Maximize,
  LayoutGrid,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Check,
  Loader2,
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

interface PromotionToolbarProps {
  promotionName: string;
  promotionStatus: string;
  onBack: () => void;
  onAutoLayout: () => void;
  onGenerateAll: () => void;
  isGeneratingAll: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  draft: '초안',
  active: '진행 중',
  ended: '종료',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-green-500/15 text-green-600 dark:text-green-400',
  ended: 'bg-muted/50 text-muted-foreground/60',
};

export default function PromotionToolbar({
  promotionName,
  promotionStatus,
  onBack,
  onAutoLayout,
  onGenerateAll,
  isGeneratingAll,
}: PromotionToolbarProps) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const undo = usePromotionCanvasStore((s) => s.undo);
  const redo = usePromotionCanvasStore((s) => s.redo);
  const isDirty = usePromotionCanvasStore((s) => s.isDirty);
  const isSaving = usePromotionCanvasStore((s) => s.isSaving);
  const historyIndex = usePromotionCanvasStore((s) => s.historyIndex);
  const historyLength = usePromotionCanvasStore((s) => s.history.length);

  return (
    <div className="h-[44px] glass-panel flex items-center justify-between px-3 gap-3">
      {/* Left */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onBack}
          className="p-1 rounded hover:bg-muted/50 cursor-pointer shrink-0"
          title="목록으로"
        >
          <ArrowLeft className="size-4 text-muted-foreground" />
        </button>
        <span className="text-sm font-semibold truncate">{promotionName || '프로모션'}</span>
        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[promotionStatus] || STATUS_COLORS.draft}`}>
          {STATUS_LABELS[promotionStatus] || promotionStatus}
        </span>
      </div>

      {/* Center — Zoom controls */}
      <div className="flex items-center gap-1">
        <button onClick={onAutoLayout} className="p-1 rounded hover:bg-muted/50 cursor-pointer" title="자동 정렬">
          <LayoutGrid className="size-3.5 text-muted-foreground" />
        </button>
        <button onClick={() => fitView({ padding: 0.2, duration: 300 })} className="p-1 rounded hover:bg-muted/50 cursor-pointer" title="전체 보기">
          <Maximize className="size-3.5 text-muted-foreground" />
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button onClick={() => zoomOut({ duration: 200 })} className="p-1 rounded hover:bg-muted/50 cursor-pointer" title="축소">
          <ZoomOut className="size-3.5 text-muted-foreground" />
        </button>
        <button onClick={() => zoomIn({ duration: 200 })} className="p-1 rounded hover:bg-muted/50 cursor-pointer" title="확대">
          <ZoomIn className="size-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={undo}
          disabled={historyIndex <= 0}
          className="p-1 rounded hover:bg-muted/50 cursor-pointer disabled:opacity-30"
          title="실행 취소 (Ctrl+Z)"
        >
          <Undo2 className="size-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={redo}
          disabled={historyIndex >= historyLength - 1}
          className="p-1 rounded hover:bg-muted/50 cursor-pointer disabled:opacity-30"
          title="다시 실행 (Ctrl+Shift+Z)"
        >
          <Redo2 className="size-3.5 text-muted-foreground" />
        </button>

        <div className="w-px h-4 bg-border mx-1" />

        {/* Save status */}
        <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
          {isSaving ? (
            <><Loader2 className="size-3 animate-spin" /> 저장 중...</>
          ) : isDirty ? (
            '변경됨'
          ) : (
            <><Check className="size-3" /> 저장됨</>
          )}
        </span>

        <div className="w-px h-4 bg-border mx-1" />

        {/* AI Generate All */}
        <button
          onClick={onGenerateAll}
          disabled={isGeneratingAll}
          className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
        >
          {isGeneratingAll ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Sparkles className="size-3" />
          )}
          {isGeneratingAll ? 'AI 생성 중...' : 'AI 전체생성'}
        </button>
      </div>
    </div>
  );
}
