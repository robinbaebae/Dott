'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function LandingPage() {
  const [value, setValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      signIn('google', { callbackUrl: '/' });
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background">
      {/* Logo */}
      <img src="/logo.png" alt="Ditto" className="w-20 h-20 rounded-full mb-10" />

      {/* Title */}
      <h1 className="text-6xl sm:text-8xl tracking-tight leading-[1.1] text-center text-foreground">
        Me too,
        <br />
        Same here
      </h1>

      {/* Underline-only input */}
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="mt-14 w-72 sm:w-96 bg-transparent border-b border-foreground/20 text-center text-lg text-foreground outline-none placeholder-transparent focus:border-foreground/40 transition-colors"
        autoFocus
      />

      {/* Hint */}
      <p className="mt-8 text-xs text-foreground/20 uppercase tracking-[0.3em]">
        try typing <span className="font-bold italic">Hi</span>
      </p>
    </div>
  );
}
