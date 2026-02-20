'use client';

import { useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';

export default function LandingPage() {
  const [value, setValue] = useState('');
  const [triggered, setTriggered] = useState(false);
  const [animating, setAnimating] = useState(false);
  const circleRef = useRef<HTMLDivElement>(null);

  const isHi = value.trim().toLowerCase() === 'hi';

  useEffect(() => {
    if (isHi && !triggered) {
      setTriggered(true);
      setAnimating(true);
      // After animation, redirect to sign in
      setTimeout(() => {
        signIn('google', { callbackUrl: '/' });
      }, 1200);
    }
  }, [isHi, triggered]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background overflow-hidden">
      {/* Orange gradient circle animation */}
      {animating && (
        <div
          ref={circleRef}
          className="absolute rounded-full landing-circle-expand"
          style={{
            background: 'radial-gradient(circle, #FF8A00 0%, #FF4D00 50%, #FF4D00 100%)',
          }}
        />
      )}

      {/* Content */}
      <div className={`relative z-10 flex flex-col items-center transition-colors duration-500 ${animating ? 'text-white' : ''}`}>
        {/* Logo */}
        <img src="/logo.png" alt="Ditto" className="w-20 h-20 rounded-full mb-10" />

        {/* Title */}
        <h1 className={`text-6xl sm:text-8xl tracking-tight leading-[1.1] text-center transition-colors duration-500 ${animating ? 'text-white' : 'text-foreground'}`}>
          Me too,
          <br />
          Same here
        </h1>

        {/* Underline-only input */}
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={`mt-14 w-72 sm:w-96 bg-transparent border-b text-center text-lg outline-none placeholder-transparent transition-colors duration-500 ${
            animating
              ? 'border-white/40 text-white'
              : 'border-foreground/20 text-foreground focus:border-foreground/40'
          }`}
          autoFocus
        />

        {/* Hint */}
        <p className={`mt-8 text-xs uppercase tracking-[0.3em] transition-colors duration-500 ${animating ? 'text-white/50' : 'text-foreground/20'}`}>
          try typing <span className="font-normal italic">Hi</span>
        </p>
      </div>
    </div>
  );
}
