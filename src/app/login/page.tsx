'use client';

import { useState, useRef } from 'react';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const [animating, setAnimating] = useState(false);
  const circleRef = useRef<HTMLDivElement>(null);

  const handleGetStarted = () => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      signIn('google', { callbackUrl: '/' });
    }, 1000);
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 80% 70% at 15% 50%, rgba(230, 190, 100, 0.4) 0%, transparent 60%),
          radial-gradient(ellipse 70% 60% at 50% 40%, rgba(220, 160, 180, 0.5) 0%, transparent 55%),
          radial-gradient(ellipse 80% 70% at 85% 50%, rgba(180, 160, 220, 0.5) 0%, transparent 60%),
          radial-gradient(ellipse 60% 50% at 60% 70%, rgba(200, 170, 200, 0.3) 0%, transparent 50%),
          linear-gradient(135deg, #f0e4d8 0%, #e8d0d8 30%, #dcc8e0 60%, #d4c4e8 100%)
        `,
      }}
    >
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
        <div className="mb-10">
          <img src="/logo-dott.png" alt="Dott" className="w-28 h-28 rounded-3xl" />
        </div>

        {/* Copy */}
        <p className={`text-base sm:text-lg tracking-wide text-center max-w-sm transition-colors duration-500 ${animating ? 'text-white/70' : 'text-[#5a4a60]'}`}>
          Your brand assistant,<br />powered by your business DNA.
        </p>

        {/* CTA Button */}
        <button
          onClick={handleGetStarted}
          className={`mt-10 px-8 py-3.5 rounded-full text-sm font-medium tracking-wide transition-all duration-300 cursor-pointer ${
            animating
              ? 'bg-white/20 text-white border border-white/30'
              : 'bg-[#2a2030] text-white hover:bg-[#3a3040] active:scale-[0.97]'
          }`}
        >
          Get started &rarr;
        </button>

        {/* Footer */}
        <p className={`mt-4 text-xs tracking-wide transition-colors duration-500 ${animating ? 'text-white/40' : 'text-[#8a7a90]'}`}>
          Built by Bae
        </p>
      </div>
    </div>
  );
}
