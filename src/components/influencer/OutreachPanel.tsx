'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { X, Copy, Check, Mail } from 'lucide-react';

interface OutreachPanelProps {
  influencerId: string;
  onClose: () => void;
}

const CAMPAIGN_TYPES = [
  { value: 'sponsored_post', label: '협찬 포스팅' },
  { value: 'review', label: '리뷰' },
  { value: 'giveaway', label: '기브어웨이' },
  { value: 'ambassador', label: '앰배서더' },
  { value: 'collab', label: '콜라보레이션' },
];

export default function OutreachPanel({ influencerId, onClose }: OutreachPanelProps) {
  const [campaignGoal, setCampaignGoal] = useState('');
  const [campaignType, setCampaignType] = useState('sponsored_post');
  const [budgetRange, setBudgetRange] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ subject: string; body: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleGenerate = async () => {
    if (!campaignGoal.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/influencers/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          influencer_id: influencerId,
          campaign_goal: campaignGoal.trim(),
          campaign_type: campaignType,
          budget_range: budgetRange.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult({ subject: data.subject, body: data.body });
      }
    } catch {
      /* skip */
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(`제목: ${result.subject}\n\n${result.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveDraft = async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      await fetch('/api/gmail/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'draft',
          subject: result.subject,
          body: result.body,
        }),
      });
    } catch {
      /* skip */
    }
    setSaving(false);
  };

  const inputClass =
    'w-full text-sm px-3 py-2 rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted-foreground/50';
  const labelClass = 'text-xs font-medium text-muted-foreground mb-1 block';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl p-6 max-w-lg w-full shadow-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold">아웃리치 이메일 생성</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted cursor-pointer">
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-3 mb-4">
          <div>
            <label className={labelClass}>캠페인 목표</label>
            <input
              className={inputClass}
              value={campaignGoal}
              onChange={(e) => setCampaignGoal(e.target.value)}
              placeholder="신제품 인지도 확보, 앱 다운로드 유도..."
            />
          </div>
          <div>
            <label className={labelClass}>캠페인 유형</label>
            <select
              className={inputClass}
              value={campaignType}
              onChange={(e) => setCampaignType(e.target.value)}
            >
              {CAMPAIGN_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>예산 범위</label>
            <input
              className={inputClass}
              value={budgetRange}
              onChange={(e) => setBudgetRange(e.target.value)}
              placeholder="50~100만원"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!campaignGoal.trim() || loading}
          className="w-full text-xs py-2.5 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 mb-4"
        >
          {loading ? '생성 중...' : '이메일 생성'}
        </button>

        {/* Result */}
        {result && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-1">제목</p>
              <p className="text-sm">{result.subject}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-1">본문</p>
              <p className="text-sm whitespace-pre-wrap">{result.body}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="size-3.5 text-green-500" />
                    복사됨
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5 text-muted-foreground" />
                    클립보드 복사
                  </>
                )}
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40"
              >
                <Mail className="size-3.5" />
                {saving ? '저장 중...' : 'Gmail에 저장'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
