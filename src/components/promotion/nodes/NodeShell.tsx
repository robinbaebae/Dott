'use client';

import { type ReactNode } from 'react';
import { Handle, Position } from '@xyflow/react';

interface NodeShellProps {
  typeLabel: string;
  color: string; // Tailwind border-l color class e.g. "border-l-purple-500"
  width?: string;
  selected?: boolean;
  children: ReactNode;
  actions?: ReactNode;
  handles?: { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean };
}

export default function NodeShell({
  typeLabel,
  color,
  width = 'w-[260px]',
  selected = false,
  children,
  actions,
  handles = { top: true, bottom: true, left: true, right: true },
}: NodeShellProps) {
  return (
    <div
      className={`
        ${width} bg-card rounded-xl border border-border border-l-4 ${color}
        elevation-1 transition-shadow
        ${selected ? 'ring-2 ring-accent/40 elevation-2' : 'hover:elevation-2'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {typeLabel}
        </span>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>

      {/* Content */}
      <div className="px-3 py-2.5">{children}</div>

      {/* Handles */}
      {handles.top && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-2.5 !h-2.5 !bg-border !border-2 !border-card hover:!bg-accent !-top-[5px]"
        />
      )}
      {handles.bottom && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-2.5 !h-2.5 !bg-border !border-2 !border-card hover:!bg-accent !-bottom-[5px]"
        />
      )}
      {handles.left && (
        <Handle
          type="target"
          position={Position.Left}
          id="left"
          className="!w-2.5 !h-2.5 !bg-border !border-2 !border-card hover:!bg-accent !-left-[5px]"
        />
      )}
      {handles.right && (
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          className="!w-2.5 !h-2.5 !bg-border !border-2 !border-card hover:!bg-accent !-right-[5px]"
        />
      )}
    </div>
  );
}
