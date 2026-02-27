'use client';

import { useState, useEffect } from 'react';
import { Zap, CheckCircle2, Clock, Flame } from 'lucide-react';

interface ExitSummaryData {
  totalActions: number;
  completedTasks: number;
  streak: number;
  workMinutes: number;
}

function getMotivation(actions: number) {
  if (actions >= 10) return '오늘 정말 열심히 하셨네요!';
  if (actions >= 5) return '꾸준한 활동이 성장을 만들어요.';
  return '오늘도 첫 걸음을 내디뎠어요.';
}

function formatWorkTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

export default function ExitSummaryModal() {
  const [data, setData] = useState<ExitSummaryData | null>(null);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onShowExitSummary) return;

    api.onShowExitSummary((payload: ExitSummaryData) => {
      setData(payload);
    });
  }, []);

  if (!data) return null;

  const handleClose = () => {
    const api = (window as any).electronAPI;
    api?.confirmExitSummary();
    setData(null);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="exit-modal-enter glass-float rounded-2xl p-6 w-[380px] shadow-2xl border border-border">
        {/* Header */}
        <div className="text-center mb-5">
          <p className="text-lg font-semibold text-foreground">오늘도 수고했어요</p>
          <p className="text-sm text-muted-foreground mt-1">오늘의 성과를 확인해보세요</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <Zap className="size-4 text-accent mx-auto mb-1.5" />
            <p className="text-lg font-semibold text-foreground">{data.totalActions}</p>
            <p className="text-[10px] text-muted-foreground">총 활동</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <CheckCircle2 className="size-4 text-green-500 mx-auto mb-1.5" />
            <p className="text-lg font-semibold text-foreground">{data.completedTasks}</p>
            <p className="text-[10px] text-muted-foreground">완료 태스크</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-muted/30">
            <Clock className="size-4 text-blue-500 mx-auto mb-1.5" />
            <p className="text-lg font-semibold text-foreground">{formatWorkTime(data.workMinutes)}</p>
            <p className="text-[10px] text-muted-foreground">작업 시간</p>
          </div>
        </div>

        {/* Streak */}
        {data.streak >= 2 && (
          <div className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-accent/10 mb-4">
            <Flame className="size-4 text-accent" />
            <span className="text-sm font-medium text-accent">
              {data.streak}일 연속 활동 중! 내일도 함께해요
            </span>
          </div>
        )}

        {/* Motivation */}
        <p className="text-center text-sm text-muted-foreground mb-5">
          {getMotivation(data.totalActions)}
        </p>

        {/* CTA */}
        <button
          onClick={handleClose}
          className="w-full py-3 rounded-xl bg-accent text-accent-foreground font-medium text-sm hover:bg-accent/90 transition-colors cursor-pointer"
        >
          수고했어요!
        </button>
      </div>
    </div>
  );
}
