'use client';

import { type NodeProps } from '@xyflow/react';
import NodeShell from './NodeShell';
import { usePromotionCanvasStore } from '@/store/promotion-canvas-store';

const NOTE_COLORS = [
  { key: 'yellow', border: 'border-l-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/10' },
  { key: 'pink', border: 'border-l-pink-400', bg: 'bg-pink-50 dark:bg-pink-900/10' },
  { key: 'blue', border: 'border-l-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/10' },
  { key: 'green', border: 'border-l-green-400', bg: 'bg-green-50 dark:bg-green-900/10' },
  { key: 'purple', border: 'border-l-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/10' },
];

export default function NoteNode({ id, data, selected }: NodeProps) {
  const updateNodeData = usePromotionCanvasStore((s) => s.updateNodeData);

  const text = (data.text as string) || '';
  const colorKey = (data.colorKey as string) || 'yellow';
  const noteColor = NOTE_COLORS.find((c) => c.key === colorKey) || NOTE_COLORS[0];

  return (
    <NodeShell
      typeLabel="메모"
      color={noteColor.border}
      width="w-[200px]"
      selected={selected}
      actions={
        <div className="flex gap-0.5">
          {NOTE_COLORS.map((c) => (
            <button
              key={c.key}
              onClick={() => updateNodeData(id, { colorKey: c.key })}
              className={`size-3 rounded-full cursor-pointer ${c.border.replace('border-l-', 'bg-')} ${
                colorKey === c.key ? 'ring-1 ring-offset-1 ring-accent' : ''
              }`}
            />
          ))}
        </div>
      }
    >
      <textarea
        className={`w-full text-xs px-2 py-1.5 rounded resize-none border-none outline-none ${noteColor.bg}`}
        rows={4}
        value={text}
        onChange={(e) => updateNodeData(id, { text: e.target.value })}
        placeholder="메모를 입력하세요..."
      />
    </NodeShell>
  );
}
