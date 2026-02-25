'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SectionTitle, Chip } from './shared';

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'threads', label: 'Threads' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'twitter', label: 'Twitter' },
];

const TONES = ['casual', 'professional', 'playful', 'witty', 'emotional'];

export default function CaptionForm({ onResult }: { onResult: (l: string, c: string) => void }) {
  const [platform, setPlatform] = useState('instagram');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('casual');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, topic, tone }),
      });
      if (res.ok) {
        const data = await res.json();
        onResult(`✏️ ${platform} 캡션`, data.result);
        toast.success('캡션이 생성되었습니다');
      } else {
        toast.error('캡션 생성에 실패했습니다');
      }
    } catch {
      toast.error('캡션 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <SectionTitle>플랫폼</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <Chip key={p.key} label={p.label} active={platform === p.key} onClick={() => setPlatform(p.key)} />
          ))}
        </div>
      </div>
      <div>
        <SectionTitle>주제 / 토픽</SectionTitle>
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          rows={3}
          placeholder="캡션의 주제를 입력하세요..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div>
        <SectionTitle>톤</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <Chip key={t} label={t} active={tone === t} onClick={() => setTone(t)} />
          ))}
        </div>
      </div>
      <button
        onClick={handleGenerate}
        disabled={!topic.trim() || loading}
        className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors cursor-pointer flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 className="size-4 animate-spin" /> 생성 중...</> : 'Generate Caption'}
      </button>
    </div>
  );
}
