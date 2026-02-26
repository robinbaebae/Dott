'use client';

import { type EdgeProps, getSmoothStepPath } from '@xyflow/react';

export default function PromotionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });

  return (
    <path
      id={id}
      d={edgePath}
      className={`
        fill-none stroke-[2px] transition-colors
        ${selected ? 'stroke-accent' : 'stroke-border hover:stroke-accent/60'}
      `}
    />
  );
}
