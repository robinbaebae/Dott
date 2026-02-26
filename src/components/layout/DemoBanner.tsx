'use client';

import { Monitor, Download, X } from 'lucide-react';
import { useState } from 'react';

export default function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleExit = () => {
    sessionStorage.removeItem('dott-demo');
    localStorage.removeItem('dott_ad_analytics');
    localStorage.removeItem('dott-notif-read');
    window.location.href = '/';
  };

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl shrink-0">
      <div className="flex items-center gap-2.5 text-sm">
        <Monitor className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-amber-800 dark:text-amber-300 font-medium">
          데모 모드
        </span>
        <span className="text-amber-700/80 dark:text-amber-400/70 hidden sm:inline">
          AI 기능은 macOS 앱에서만 사용 가능합니다.
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          href="https://github.com/robinbaebae/Dott/releases/latest/download/Dott.dmg"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-[#5B4D6E] text-white hover:bg-[#6B5B7B] transition-colors"
        >
          <Download className="size-3" />
          앱 다운로드
        </a>
        <button
          onClick={handleExit}
          className="text-xs text-amber-700/60 dark:text-amber-400/50 hover:text-amber-700 dark:hover:text-amber-400 transition-colors cursor-pointer"
        >
          나가기
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-0.5 text-amber-700/40 dark:text-amber-400/30 hover:text-amber-700 dark:hover:text-amber-400 transition-colors cursor-pointer"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
