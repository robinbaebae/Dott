'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Palette } from 'lucide-react';

const BASE_COLOR = { r: 242, g: 239, b: 233 }; // #F2EFE9
const STORAGE_KEY = 'butter-bg-brightness';

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

function toHex(r: number, g: number, b: number) {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function getColor(t: number) {
  // t: 0 = base (#F2EFE9), 1 = black (#000000)
  const r = lerp(BASE_COLOR.r, 0, t);
  const g = lerp(BASE_COLOR.g, 0, t);
  const b = lerp(BASE_COLOR.b, 0, t);
  return toHex(r, g, b);
}

export default function ColorBar() {
  const [open, setOpen] = useState(false);
  const [brightness, setBrightness] = useState(0); // 0 = light, 1 = dark
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const val = parseFloat(saved);
      setBrightness(val);
      document.documentElement.style.setProperty('--background', getColor(val));
    }
  }, []);

  const apply = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setBrightness(clamped);
    document.documentElement.style.setProperty('--background', getColor(clamped));
    localStorage.setItem(STORAGE_KEY, clamped.toFixed(3));
  }, []);

  const getValueFromY = useCallback((clientY: number) => {
    if (!trackRef.current) return brightness;
    const rect = trackRef.current.getBoundingClientRect();
    // top = light (0), bottom = dark (1)
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
    background: `linear-gradient(to bottom, ${toHex(BASE_COLOR.r, BASE_COLOR.g, BASE_COLOR.b)}, #000000)`,
  };

  // thumb position: top = dark (brightness=1), bottom = light (brightness=0)
  const thumbPercent = brightness * 100;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-2">
      {open && (
        <div className="flex flex-col items-center gap-2 p-2.5 rounded-2xl bg-white/80 backdrop-blur-md shadow-lg border border-border animate-in slide-in-from-bottom-2 fade-in duration-200">
          {/* Gradient track */}
          <div
            ref={trackRef}
            className="relative w-5 h-48 rounded-full overflow-hidden cursor-pointer"
            style={gradientStyle}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Thumb */}
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
