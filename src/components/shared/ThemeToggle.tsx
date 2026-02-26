'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

function syncThemeToElectron(theme: string) {
  const w = window as any;
  if (w.electronAPI?.setTheme) {
    w.electronAPI.setTheme(theme);
  }
}

function applyTheme(isDark: boolean) {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  syncThemeToElectron(isDark ? 'dark' : 'light');
}

function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // Init: follow system theme
    const systemDark = getSystemDark();
    setDark(systemDark);
    applyTheme(systemDark);

    // Listen for system theme changes (browser/web)
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const mqHandler = (e: MediaQueryListEvent) => {
      setDark(e.matches);
      applyTheme(e.matches);
    };
    mq.addEventListener('change', mqHandler);

    // Listen for Electron native theme changes (OS-level)
    const w = window as any;
    if (w.electronAPI?.onThemeChange) {
      w.electronAPI.onThemeChange((theme: string) => {
        const isDark = theme === 'dark';
        setDark(isDark);
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      });
    }

    return () => mq.removeEventListener('change', mqHandler);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    applyTheme(next);
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
