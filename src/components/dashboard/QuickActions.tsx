'use client';

import type { QuickActionCategory } from '@/types';
import {
  Wrench,
  Paintbrush,
  FileText,
  Mail,
} from 'lucide-react';

interface CategoryCard {
  type: QuickActionCategory;
  icon: typeof Wrench;
  label: string;
  desc: string;
  iconColor: string;
  bgColor: string;
}

const CATEGORIES: CategoryCard[] = [
  { type: 'content-tools', icon: Wrench, label: '콘텐츠 도구', desc: '캡션, 리퍼포징, UTM, 해시태그', iconColor: 'text-pink-500', bgColor: 'bg-pink-500/10' },
  { type: 'ad-banner-copy', icon: Paintbrush, label: '광고 배너 & 카피', desc: '배너 생성, 카피 변형', iconColor: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  { type: 'newsletter-blog', icon: FileText, label: '뉴스레터 & 블로그', desc: '소재 추천 → 초안 → 최종화', iconColor: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  { type: 'email-compose', icon: Mail, label: '이메일', desc: '이메일 작성 → 미리보기 → Gmail 저장', iconColor: 'text-sky-500', bgColor: 'bg-sky-500/10' },
];

interface QuickActionsProps {
  onSelect: (action: QuickActionCategory) => void;
  compact?: boolean;
}

export default function QuickActions({ onSelect, compact }: QuickActionsProps) {
  if (compact) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-1.5">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.type}
                onClick={() => onSelect(c.type)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <Icon className={`size-3.5 shrink-0 ${c.iconColor}`} />
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.type}
              onClick={() => onSelect(c.type)}
              className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card hover:border-accent/40 hover:bg-accent/5 transition-all text-left cursor-pointer group"
            >
              <div className={`p-2 rounded-lg ${c.bgColor} transition-colors shrink-0`}>
                <Icon className={`size-4 ${c.iconColor} transition-colors`} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground block">{c.label}</span>
                <span className="text-xs text-muted-foreground leading-relaxed">{c.desc}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
