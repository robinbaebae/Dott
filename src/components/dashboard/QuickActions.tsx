'use client';

import type { QuickActionType } from '@/types';
import {
  FileText,
  Paintbrush,
  Mail,
  BarChart3,
  Link2,
  FileEdit,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';

interface Tool {
  type: QuickActionType;
  icon: typeof FileText;
  label: string;
  desc: string;
}

const TOOLS: Tool[] = [
  { type: 'template', icon: FileText, label: '콘텐츠 도구', desc: '템플릿 생성 & 리퍼포징' },
  { type: 'banner', icon: Paintbrush, label: '배너', desc: '새 배너 생성 & 사이즈 변환' },
  { type: 'ad-copy', icon: BarChart3, label: '광고 카피', desc: '다양한 톤의 카피 변형' },
  { type: 'email', icon: Mail, label: '이메일', desc: 'AI 마케팅 이메일 작성' },
  { type: 'utm', icon: Link2, label: 'UTM 링크', desc: '캠페인 트래킹 링크 생성' },
];

const HERO_STEPS = ['아이디어', '초안', '배너', '발행'];

interface QuickActionsProps {
  onSelect: (action: QuickActionType) => void;
  compact?: boolean;
}

export default function QuickActions({ onSelect, compact }: QuickActionsProps) {
  if (compact) {
    return (
      <div className="space-y-2">
        {/* Hero — compact */}
        <button
          onClick={() => onSelect('content')}
          className="w-full p-2.5 rounded-lg border border-accent/30 bg-accent/5 hover:bg-accent/10 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-accent/20">
              <FileEdit className="size-3.5 text-accent" />
            </div>
            <div className="flex-1 text-left">
              <div className="text-xs font-medium text-foreground">콘텐츠 제작</div>
              <div className="text-[10px] text-muted-foreground">AI 워크플로우</div>
            </div>
            <ArrowRight className="size-3.5 text-accent/40 group-hover:text-accent transition-colors shrink-0" />
          </div>
        </button>

        {/* Grid — compact */}
        <div className="grid grid-cols-2 gap-1.5">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.type}
                onClick={() => onSelect(t.type)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <Icon className="size-3.5 shrink-0" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Hero card — 콘텐츠 제작 */}
      <button
        onClick={() => onSelect('content')}
        className="w-full p-5 rounded-xl border border-accent/30 bg-gradient-to-br from-accent/5 to-accent/10 hover:from-accent/10 hover:to-accent/15 hover:border-accent/50 transition-all duration-300 cursor-pointer group text-left"
      >
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-accent/20 group-hover:bg-accent/30 transition-colors shrink-0">
            <FileEdit className="size-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-foreground">콘텐츠 제작</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent">
                AI 워크플로우
              </span>
            </div>
            <div className="flex items-center gap-1">
              {HERO_STEPS.map((step, i) => (
                <span key={step} className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{step}</span>
                  {i < HERO_STEPS.length - 1 && <ChevronRight className="size-3 text-muted-foreground/40" />}
                </span>
              ))}
            </div>
          </div>
          <ArrowRight className="size-4 text-accent/40 group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>
      </button>

      {/* Tool grid */}
      <div className="grid grid-cols-2 gap-2">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.type}
              onClick={() => onSelect(t.type)}
              className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card hover:border-accent/40 hover:bg-accent/5 transition-all text-left cursor-pointer group"
            >
              <div className="p-2 rounded-lg bg-muted group-hover:bg-accent/10 transition-colors shrink-0">
                <Icon className="size-4 text-muted-foreground group-hover:text-accent transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground block">{t.label}</span>
                <span className="text-xs text-muted-foreground leading-relaxed">{t.desc}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
