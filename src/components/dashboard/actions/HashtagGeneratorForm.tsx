'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SectionTitle } from './shared';

export default function HashtagGeneratorForm({ onResult }: { onResult: (l: string, c: string) => void }) {
  const [topic, setTopic] = useState('');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: 'hashtag-generator', variables: { topic, industry } }),
      });
      if (res.ok) {
        const data = await res.json();
        onResult('#️⃣ 해시태그 생성', data.result);
        toast.success('해시태그가 생성되었습니다');
      } else {
        toast.error('해시태그 생성에 실패했습니다');
      }
    } catch {
      toast.error('해시태그 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <SectionTitle>주제 / 토픽 *</SectionTitle>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="해시태그를 생성할 주제를 입력하세요"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div>
        <SectionTitle>업종 / 산업</SectionTitle>
        <input
          type="text"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="e.g. SaaS, 뷰티, F&B"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <button
        onClick={handleGenerate}
        disabled={!topic.trim() || loading}
        className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors cursor-pointer flex items-center justify-center gap-2"
      >
        {loading ? <><Loader2 className="size-4 animate-spin" /> 생성 중...</> : 'Generate Hashtags'}
      </button>
    </div>
  );
}
