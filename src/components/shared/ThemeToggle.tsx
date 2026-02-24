'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('dott-theme');
    if (saved === 'dark') {
      setDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('dott-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('dott-theme', 'light');
    }
  };

  return (
    <button
      onClick={toggle}
      className="p-1.5 rounded-full hover:bg-muted transition-colors cursor-pointer"
      title={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      {dark ? <Sun className="size-4 text-muted-foreground" /> : <Moon className="size-4 text-muted-foreground" />}
    </button>
  );
}
