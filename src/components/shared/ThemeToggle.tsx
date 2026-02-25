'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

// Notify Electron (pet window) about theme changes
function syncThemeToElectron(theme: string) {
  const w = window as any;
  if (w.electronAPI?.setTheme) {
    w.electronAPI.setTheme(theme);
  }
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('dott-theme');
    if (saved === 'dark') {
      setDark(true);
      document.documentElement.classList.add('dark');
    }
    // Sync initial theme to pet window
    syncThemeToElectron(saved === 'dark' ? 'dark' : 'light');
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('dott-theme', 'dark');
      syncThemeToElectron('dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('dott-theme', 'light');
      syncThemeToElectron('light');
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
