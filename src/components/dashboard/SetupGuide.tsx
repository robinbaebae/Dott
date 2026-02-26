'use client';

import { useState, useEffect } from 'react';
import { Terminal, Download, X, CheckCircle2, ExternalLink, Monitor } from 'lucide-react';

export default function SetupGuide() {
  const [dismissed, setDismissed] = useState(true); // hidden until checked
  const [isWeb, setIsWeb] = useState(true);

  useEffect(() => {
    if (localStorage.getItem('dott-setup-dismissed')) {
      return;
    }
    setIsWeb(!(window as /* eslint-disable-line */ any).electronAPI);
    setDismissed(false);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('dott-setup-dismissed', 'true');
  };

  if (dismissed) return null;

  return (
    <div className="w-full max-w-3xl mx-auto mb-4 animate-in slide-in-from-top-2 fade-in duration-300">
      <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Terminal className="size-4 text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">시작하기 전에</h3>
              <p className="text-xs text-muted-foreground">Dott의 AI 기능을 사용하려면 아래 설정이 필요합니다</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Step 1: Desktop App */}
          {isWeb && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
              <div className="size-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <Monitor className="size-3.5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground">macOS 데스크톱 앱 설치</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  AI 기능은 데스크톱 앱에서만 사용할 수 있습니다. macOS 앱을 설치해주세요.
                </p>
                <a
                  href="https://github.com/robinbaebae/Dott/releases/latest/download/Dott.dmg"
                  className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:bg-accent/90 transition-colors"
                >
                  <Download className="size-3" />
                  Dott.dmg 다운로드
                </a>
              </div>
            </div>
          )}

          {/* Step 2: Claude CLI */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border">
            <div className="size-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
              <Terminal className="size-3.5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground">Claude CLI 설치</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                터미널에서 아래 명령어를 실행해주세요.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-muted text-xs font-mono text-foreground select-all">
                  npm install -g @anthropic-ai/claude-code
                </code>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                설치 후 <code className="px-1 py-0.5 rounded bg-muted text-[11px]">claude</code> 명령어로 로그인해주세요.
              </p>
              <a
                href="https://docs.anthropic.com/en/docs/claude-code"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1.5 text-xs text-accent hover:underline"
              >
                자세한 설치 가이드 <ExternalLink className="size-3" />
              </a>
            </div>
          </div>

          {/* Already done */}
          <button
            onClick={handleDismiss}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <CheckCircle2 className="size-3.5" />
            이미 설치했어요
          </button>
        </div>
      </div>
    </div>
  );
}
