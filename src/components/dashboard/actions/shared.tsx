'use client';

import { ReactNode } from 'react';

export function SectionTitle({ children }: { children: ReactNode }) {
  return <label className="text-sm font-medium text-foreground block mb-1.5">{children}</label>;
}

export function Chip({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
        active
          ? color ?? 'bg-accent text-accent-foreground border-accent'
          : 'bg-card text-muted-foreground border-border hover:border-accent/40'
      }`}
    >
      {label}
    </button>
  );
}

export function SegmentedTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-muted/50 mb-4">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex-1 px-3 py-2 rounded-md text-sm transition-all cursor-pointer ${
            active === t.key
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
