'use client';

import { useState, useRef } from 'react';
import { signIn } from 'next-auth/react';
import { Terminal, X } from 'lucide-react';

export default function ElectronLogin() {
  const [animating, setAnimating] = useState(false);
  const [showCliBanner, setShowCliBanner] = useState(false);
  const circleRef = useRef<HTMLDivElement>(null);

  const handleGoogleLogin = () => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      signIn('google', { callbackUrl: '/' });
    }, 1000);
  };

  const handleGuestStart = () => {
    setShowCliBanner(true);
  };

  const handleGuestConfirm = () => {
    sessionStorage.setItem('dott-guest', 'true');
    // Set cookie so API routes can detect guest mode
    document.cookie = 'dott-guest=true; path=/';
    window.location.reload();
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 80% 65% at 3% 10%, rgba(170, 110, 220, 0.75) 0%, transparent 55%),
          radial-gradient(ellipse 65% 55% at 95% 5%, rgba(100, 110, 235, 0.65) 0%, transparent 50%),
          radial-gradient(ellipse 55% 50% at 50% 40%, rgba(230, 130, 195, 0.45) 0%, transparent 48%),
          radial-gradient(ellipse 50% 45% at 65% 25%, rgba(190, 155, 245, 0.5) 0%, transparent 42%),
          radial-gradient(ellipse 60% 50% at 30% 75%, rgba(235, 160, 120, 0.4) 0%, transparent 50%),
          linear-gradient(180deg, #F5EFF3 0%, #EDE4EA 100%)
        `,
      }}
    >
      {/* Electron drag region */}
      <div className="fixed top-0 left-0 right-0 h-12 z-50" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />

      {/* Circle expand animation */}
      {animating && (
        <div
          ref={circleRef}
          className="absolute rounded-full landing-circle-expand"
          style={{
            background: 'radial-gradient(circle, #E0D5DE 0%, #8B82A0 40%, #5B4D6E 100%)',
          }}
        />
      )}

      {/* Content */}
      <div className={`relative z-10 flex flex-col items-center transition-colors duration-500 ${animating ? 'text-white' : ''}`}>
        {/* Logo */}
        <div className="mb-8">
          <img src="/logo-dott.png" alt="Dott" className="w-24 h-24 rounded-3xl shadow-lg" />
        </div>

        {/* App name */}
        <h1 className={`text-2xl font-semibold tracking-tight mb-3 transition-colors duration-500 ${animating ? 'text-white' : 'text-[#3a2a40]'}`}>
          Dott
        </h1>

        {/* Tagline */}
        <p className={`text-sm tracking-wide text-center max-w-xs mb-10 transition-colors duration-500 ${animating ? 'text-white/70' : 'text-[#8a7a90]'}`}>
          당신의 브랜드 어시스턴트,<br />비즈니스 DNA로 작동합니다.
        </p>

        {/* Google Sign-in Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={animating}
          className={`flex items-center gap-3 px-6 py-3 rounded-full text-sm font-medium tracking-wide transition-all duration-300 cursor-pointer ${
            animating
              ? 'bg-white/20 text-white border border-white/30'
              : 'bg-white text-[#3a2a40] shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google 계정으로 시작
        </button>

        {/* Guest mode */}
        <button
          onClick={handleGuestStart}
          disabled={animating}
          className={`mt-4 px-6 py-2.5 rounded-full text-sm tracking-wide transition-all duration-300 cursor-pointer ${
            animating
              ? 'text-white/40'
              : 'text-[#7a6a80] hover:text-[#5a4a60] hover:bg-white/30 active:scale-[0.98]'
          }`}
        >
          로그인 없이 시작
        </button>
        {/* CLI Banner anchor */}
        <div className="relative">
        {showCliBanner && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[440px] animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div
              className="flex flex-col gap-2.5 px-5 py-4 rounded-2xl border border-orange-400/30"
              style={{
                background: 'rgba(255, 160, 60, 0.12)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="size-4 text-orange-600" />
                  <span className="text-sm font-semibold text-orange-800">Claude Code CLI 필요</span>
                </div>
                <button
                  onClick={() => setShowCliBanner(false)}
                  className="p-0.5 text-orange-600/50 hover:text-orange-700 transition-colors cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <p className="text-xs text-orange-800/80 leading-relaxed">
                Dott의 AI 기능을 사용하려면 <span className="font-semibold">Claude Code CLI</span>가 설치되어 있어야 합니다.
                터미널에서 <code className="px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-900 font-mono text-[11px]">claude</code> 명령어가
                실행되는지 확인해 주세요.
              </p>
              <button
                onClick={handleGuestConfirm}
                className="w-full px-4 py-2 mt-1 rounded-xl text-xs font-medium bg-orange-500/20 text-orange-800 hover:bg-orange-500/30 transition-colors cursor-pointer"
              >
                확인했어요, 시작하기
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Footer — fixed bottom */}
      <p className={`absolute bottom-6 text-xs tracking-wide transition-colors duration-500 ${animating ? 'text-white/40' : 'text-[#a89ba0]'}`}>
        Built by Bae
      </p>
    </div>
  );
}
