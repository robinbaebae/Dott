'use client';

import { usePromotionCanvasStore } from '@/store/promotion-canvas-store';
import { CHANNEL_CONFIG } from './nodes/ChannelNode';
import { X, Trash2, Sparkles } from 'lucide-react';

const TYPES = ['할인율', '정액할인', '1+1', '무료배송', '쿠폰', '사은품', '기타'];
const TARGETS = ['전체', '신규고객', '기존고객', 'VIP', '휴면고객'];
const GOALS = ['인지도 확대', '매출 증대', '신규 고객 확보', '재구매 유도', '재고 소진', '시즌 프로모션'];
const SEGMENT_TAGS = ['VIP', '신규', '휴면', '일반', '재구매', '이탈위험'];

const inputClass =
  'w-full text-xs px-2.5 py-1.5 rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted-foreground/40';

export default function PromotionDetailPanel() {
  const selectedNodeId = usePromotionCanvasStore((s) => s.selectedNodeId);
  const nodes = usePromotionCanvasStore((s) => s.nodes);
  const updateNodeData = usePromotionCanvasStore((s) => s.updateNodeData);
  const removeNode = usePromotionCanvasStore((s) => s.removeNode);
  const setSelectedNodeId = usePromotionCanvasStore((s) => s.setSelectedNodeId);

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const d = node.data;
  const update = (data: Record<string, unknown>) => updateNodeData(node.id, data);

  return (
    <div className="w-[300px] h-full glass-panel overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {node.type === 'promotionHub' && '허브 설정'}
          {node.type === 'channel' && `${CHANNEL_CONFIG[(d.channelType as string) || 'instagram']?.label || '채널'} 설정`}
          {node.type === 'message' && '메시지 설정'}
          {node.type === 'audience' && '타겟 설정'}
          {node.type === 'budget' && '예산 설정'}
          {node.type === 'timeline' && '타임라인 설정'}
          {node.type === 'note' && '메모'}
        </span>
        <div className="flex items-center gap-1">
          {node.type !== 'promotionHub' && (
            <button
              onClick={() => {
                removeNode(node.id);
              }}
              className="p-1 rounded hover:bg-destructive/10 cursor-pointer"
              title="노드 삭제"
            >
              <Trash2 className="size-3 text-destructive/70" />
            </button>
          )}
          <button
            onClick={() => setSelectedNodeId(null)}
            className="p-1 rounded hover:bg-muted/50 cursor-pointer"
          >
            <X className="size-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* PromotionHub */}
        {node.type === 'promotionHub' && (
          <>
            <Field label="프로모션명">
              <input className={inputClass} value={(d.name as string) || ''} onChange={(e) => update({ name: e.target.value })} placeholder="프로모션명" />
            </Field>
            <Field label="유형">
              <select className={inputClass} value={(d.type as string) || '할인율'} onChange={(e) => update({ type: e.target.value })}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="할인 상세">
              <input className={inputClass} value={(d.discountValue as string) || ''} onChange={(e) => update({ discountValue: e.target.value })} placeholder="20% / 5,000원" />
            </Field>
            <Field label="대상">
              <select className={inputClass} value={(d.target as string) || '전체'} onChange={(e) => update({ target: e.target.value })}>
                {TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="목표">
              <select className={inputClass} value={(d.goal as string) || ''} onChange={(e) => update({ goal: e.target.value })}>
                <option value="">선택...</option>
                {GOALS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="시작일">
                <input type="date" className={inputClass} value={(d.startDate as string) || ''} onChange={(e) => update({ startDate: e.target.value })} />
              </Field>
              <Field label="종료일">
                <input type="date" className={inputClass} value={(d.endDate as string) || ''} onChange={(e) => update({ endDate: e.target.value })} />
              </Field>
            </div>
          </>
        )}

        {/* Channel */}
        {node.type === 'channel' && (
          <>
            <Field label="예산 (원)">
              <input type="number" className={inputClass} value={(d.budgetAmount as number) || ''} onChange={(e) => update({ budgetAmount: parseInt(e.target.value) || 0 })} placeholder="0" />
            </Field>
            <Field label="USP (핵심 메시지)">
              <textarea className={`${inputClass} resize-none`} rows={3} value={(d.usp as string) || ''} onChange={(e) => update({ usp: e.target.value })} placeholder="이 채널의 핵심 셀링 포인트..." />
            </Field>
            <Field label="CTA">
              <input className={inputClass} value={(d.ctaText as string) || ''} onChange={(e) => update({ ctaText: e.target.value })} placeholder="지금 바로 확인하기" />
            </Field>
            <button
              className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors cursor-pointer w-full justify-center"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('generate-channel-copy', {
                  detail: { nodeId: node.id, channelType: d.channelType },
                }));
              }}
            >
              <Sparkles className="size-3" />
              AI 카피 생성
            </button>
            {(d.aiCopy as string) && (
              <Field label="AI 생성 카피">
                <div className="text-[11px] leading-relaxed p-2 bg-muted/30 rounded max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                  {d.aiCopy as string}
                </div>
              </Field>
            )}
          </>
        )}

        {/* Message */}
        {node.type === 'message' && (
          <>
            <Field label="USP (핵심 메시지)">
              <textarea className={`${inputClass} resize-none`} rows={3} value={(d.usp as string) || ''} onChange={(e) => update({ usp: e.target.value })} placeholder="핵심 셀링 포인트..." />
            </Field>
            <Field label="CTA">
              <input className={inputClass} value={(d.ctaText as string) || ''} onChange={(e) => update({ ctaText: e.target.value })} placeholder="지금 바로 확인하기" />
            </Field>
            <button
              className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors cursor-pointer w-full justify-center"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('generate-channel-copy', {
                  detail: { nodeId: node.id, channelType: d.channelType },
                }));
              }}
            >
              <Sparkles className="size-3" />
              AI 카피 생성
            </button>
          </>
        )}

        {/* Audience */}
        {node.type === 'audience' && (
          <>
            <Field label="세그먼트명">
              <input className={inputClass} value={(d.segmentName as string) || ''} onChange={(e) => update({ segmentName: e.target.value })} placeholder="세그먼트명" />
            </Field>
            <Field label="설명">
              <textarea className={`${inputClass} resize-none`} rows={3} value={(d.description as string) || ''} onChange={(e) => update({ description: e.target.value })} placeholder="타겟 설명..." />
            </Field>
            <Field label="태그">
              <div className="flex flex-wrap gap-1">
                {SEGMENT_TAGS.map((tag) => {
                  const tags = (d.tags as string[]) || [];
                  const active = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => {
                        const next = active ? tags.filter((t) => t !== tag) : [...tags, tag];
                        update({ tags: next });
                      }}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full cursor-pointer transition-colors ${
                        active
                          ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </Field>
          </>
        )}

        {/* Budget */}
        {node.type === 'budget' && (
          <Field label="총 예산 (원)">
            <input type="number" className={inputClass} value={(d.totalBudget as number) || ''} onChange={(e) => update({ totalBudget: parseInt(e.target.value) || 0 })} placeholder="총 예산" />
          </Field>
        )}

        {/* Timeline — dates handled in node */}
        {node.type === 'timeline' && (
          <p className="text-xs text-muted-foreground">타임라인은 노드에서 직접 편집하세요.</p>
        )}

        {/* Note */}
        {node.type === 'note' && (
          <Field label="메모">
            <textarea className={`${inputClass} resize-none`} rows={6} value={(d.text as string) || ''} onChange={(e) => update({ text: e.target.value })} placeholder="메모를 입력하세요..." />
          </Field>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}
