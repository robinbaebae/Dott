'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Palette } from 'lucide-react';

const BASE_COLOR = { r: 242, g: 239, b: 233 }; // #F2EFE9
const DARK_COLOR = { r: 26, g: 26, b: 26 }; // #1a1a1a (nav black)
const STORAGE_KEY = 'butter-bg-brightness';

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function toHex(r: number, g: number, b: number) {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function getColor(t: number) {
  const r = lerp(BASE_COLOR.r, DARK_COLOR.r, t);
  const g = lerp(BASE_COLOR.g, DARK_COLOR.g, t);
  const b = lerp(BASE_COLOR.b, DARK_COLOR.b, t);
  return toHex(r, g, b);
}

function applyTheme(t: number) {
  const root = document.documentElement;
  const bg = getColor(t);
  root.style.setProperty('--background', bg);

  const isDark = t > 0.45;

  if (isDark) {
    root.style.setProperty('--foreground', 'oklch(0.985 0 0)');
    root.style.setProperty('--card', 'rgba(255,255,255,0.06)');
    root.style.setProperty('--card-foreground', 'oklch(0.985 0 0)');
    root.style.setProperty('--popover', '#2a2a2a');
    root.style.setProperty('--popover-foreground', 'oklch(0.985 0 0)');
    root.style.setProperty('--secondary', 'rgba(255,255,255,0.08)');
    root.style.setProperty('--secondary-foreground', 'oklch(0.985 0 0)');
    root.style.setProperty('--muted', 'rgba(255,255,255,0.08)');
    root.style.setProperty('--muted-foreground', 'oklch(0.708 0 0)');
    root.style.setProperty('--accent', 'rgba(255,255,255,0.08)');
    root.style.setProperty('--accent-foreground', 'oklch(0.985 0 0)');
    root.style.setProperty('--border', 'rgba(255,255,255,0.12)');
    root.style.setProperty('--input', 'rgba(255,255,255,0.15)');
    root.style.setProperty('--ring', 'oklch(0.556 0 0)');
  } else {
    root.style.setProperty('--foreground', 'oklch(0.145 0 0)');
    root.style.setProperty('--card', 'oklch(1 0 0)');
    root.style.setProperty('--card-foreground', 'oklch(0.145 0 0)');
    root.style.setProperty('--popover', 'oklch(1 0 0)');
    root.style.setProperty('--popover-foreground', 'oklch(0.145 0 0)');
    root.style.setProperty('--secondary', 'oklch(0.97 0 0)');
    root.style.setProperty('--secondary-foreground', 'oklch(0.205 0 0)');
    root.style.setProperty('--muted', 'oklch(0.97 0 0)');
    root.style.setProperty('--muted-foreground', 'oklch(0.556 0 0)');
    root.style.setProperty('--accent', 'oklch(0.97 0 0)');
    root.style.setProperty('--accent-foreground', 'oklch(0.205 0 0)');
    root.style.setProperty('--border', 'oklch(0.922 0 0)');
    root.style.setProperty('--input', 'oklch(0.922 0 0)');
    root.style.setProperty('--ring', 'oklch(0.708 0 0)');
  }
}

export default function ColorBar() {
  const [open, setOpen] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const val = parseFloat(saved);
      setBrightness(val);
      applyTheme(val);
    }
  }, []);

  const apply = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setBrightness(clamped);
    applyTheme(clamped);
    localStorage.setItem(STORAGE_KEY, clamped.toFixed(3));
  }, []);

  const getValueFromY = useCallback((clientY: number) => {
    if (!trackRef.current) return brightness;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = (clientY - rect.top) / rect.height;
    return Math.max(0, Math.min(1, ratio));
  }, [brightness]);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    apply(getValueFromY(e.clientY));
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    apply(getValueFromY(e.clientY));
  };

  const handlePointerUp = () => {
    dragging.current = false;
  };

  const gradientStyle = {
    background: `linear-gradient(to bottom, ${toHex(BASE_COLOR.r, BASE_COLOR.g, BASE_COLOR.b)}, #1a1a1a)`,
  };

  const thumbPercent = brightness * 100;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-2">
      {open && (
        <div className="flex flex-col items-center gap-2 p-2.5 rounded-2xl bg-white/80 backdrop-blur-md shadow-lg border border-border animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div
            ref={trackRef}
            className="relative w-5 h-48 rounded-full overflow-hidden cursor-pointer"
            style={gradientStyle}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 size-5 rounded-full border-2 border-white shadow-md pointer-events-none"
              style={{
                top: `${thumbPercent}%`,
                backgroundColor: getColor(brightness),
              }}
            />
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="size-10 rounded-full bg-white/80 backdrop-blur-md shadow-lg border border-border flex items-center justify-center hover:bg-white transition-colors"
      >
        <Palette className="size-4 text-muted-foreground" />
      </button>
    </div>
  );
}
