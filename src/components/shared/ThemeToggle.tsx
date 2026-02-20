'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ditto-theme');
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
      localStorage.setItem('ditto-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ditto-theme', 'light');
    }
  };

  return (
    <button
      onClick={toggle}
      className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? <Sun className="size-4 text-gray-300" /> : <Moon className="size-4 text-gray-300" />}
    </button>
  );
}
