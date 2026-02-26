'use client';

import { useState } from 'react';
import { X, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  influencerId: string;
  onClose: () => void;
}

interface OutreachResult {
  influencer: { id: string; name: string; handle: string; email: string | null };
  emails: {
    subject: string;
    body: string;
    followup_subject: string;
    followup_body: string;
  };
}

export default function OutreachPanel({ influencerId, onClose }: Props) {
  const [goal, setGoal] = useState('');
  const [campaignType, setCampaignType] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<OutreachResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const generate = async () => {
    if (!goal.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/influencers/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          influencer_id: influencerId,
          campaign_goal: goal.trim(),
          campaign_type: campaignType || undefined,
          budget_range: budgetRange || undefined,
        }),
      });
      if (res.ok) {
        setResult(await res.json());
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || '아웃리치 생성 실패');
      }
    } catch {
      toast.error('아웃리치 생성 실패');
    } finally {
      setGenerating(false);
    }
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success('클립보드에 복사됨');
    setTimeout(() => setCopied(null), 2000);
  };

  const inputClass = 'w-full px-3 py-2 text-[12px] rounded-lg border border-border bg-card focus:outline-none focus:ring-1 focus:ring-accent/30';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background border rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-background z-10">
          <h2 className="text-sm font-semibold">아웃리치 이메일 생성</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition-colors">
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {!result ? (
            <>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">캠페인 목표 *</label>
                <input
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="예: 신제품 리뷰 콘텐츠 제작"
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">캠페인 유형</label>
                  <select value={campaignType} onChange={(e) => setCampaignType(e.target.value)} className={inputClass}>
                    <option value="">선택 안함</option>
                    <option value="review">리뷰</option>
                    <option value="sponsored">스폰서드 콘텐츠</option>
                    <option value="giveaway">기브어웨이</option>
                    <option value="ambassador">앰배서더</option>
                    <option value="collab">콜라보레이션</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">예산 범위</label>
                  <input
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(e.target.value)}
                    placeholder="예: 50-100만원"
                    className={inputClass}
                  />
                </div>
              </div>
              <button
                onClick={generate}
                disabled={generating || !goal.trim()}
                className="w-full text-[12px] py-2.5 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {generating ? <><Loader2 className="size-3.5 animate-spin" /> AI 이메일 생성 중...</> : '아웃리치 이메일 생성'}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-[12px] text-muted-foreground">
                <span className="font-semibold text-foreground">{result.influencer.name}</span>
                {result.influencer.email && <> · {result.influencer.email}</>}
              </p>

              {/* Initial email */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">초기 이메일</p>
                  <button
                    onClick={() => copyText(`Subject: ${result.emails.subject}\n\n${result.emails.body}`, 'initial')}
                    className="p-1 rounded-md hover:bg-muted transition-colors"
                    title="복사"
                  >
                    {copied === 'initial' ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5 text-muted-foreground" />}
                  </button>
                </div>
                <p className="text-[12px] font-medium mb-1.5">제목: {result.emails.subject}</p>
                <div className="text-[12px] text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {result.emails.body}
                </div>
              </div>

              {/* Follow-up email */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">팔로업 이메일</p>
                  <button
                    onClick={() => copyText(`Subject: ${result.emails.followup_subject}\n\n${result.emails.followup_body}`, 'followup')}
                    className="p-1 rounded-md hover:bg-muted transition-colors"
                    title="복사"
                  >
                    {copied === 'followup' ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5 text-muted-foreground" />}
                  </button>
                </div>
                <p className="text-[12px] font-medium mb-1.5">제목: {result.emails.followup_subject}</p>
                <div className="text-[12px] text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {result.emails.followup_body}
                </div>
              </div>

              <button
                onClick={() => setResult(null)}
                className="text-[12px] text-muted-foreground hover:text-foreground underline cursor-pointer"
              >
                다시 생성
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
