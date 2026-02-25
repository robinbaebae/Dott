'use client';

import { useState } from 'react';
import { Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { SectionTitle, Chip } from './shared';

const TONES = ['professional', 'casual', 'friendly', 'urgent'];
const PURPOSES = [
  { key: 'collaboration', label: '협업 제안' },
  { key: 'inquiry', label: '거래처 문의' },
  { key: 'partnership', label: '파트너십' },
  { key: 'follow-up', label: '팔로업' },
  { key: 'introduction', label: '자기소개' },
  { key: 'other', label: '기타' },
];

export default function EmailComposeForm({ onResult }: { onResult: (l: string, c: string) => void }) {
  const [to, setTo] = useState('');
  const [topic, setTopic] = useState('');
  const [details, setDetails] = useState('');
  const [tone, setTone] = useState('professional');
  const [purpose, setPurpose] = useState('collaboration');
  const [includeHeader, setIncludeHeader] = useState(false);
  const [loading, setLoading] = useState(false);

  // Preview state
  const [preview, setPreview] = useState<{ id: string; subject: string; body_html: string } | null>(null);
  const [headerHtml, setHeaderHtml] = useState('');
  const [revision, setRevision] = useState('');
  const [revising, setRevising] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  const handleGenerate = async () => {
    if (!to.trim() || !topic.trim()) return;
    setLoading(true);
    setPreview(null);
    setHeaderHtml('');
    setDraftSaved(false);
    try {
      // Generate email
      const res = await fetch('/api/gmail/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', to, topic: `[${purpose}] ${topic}`, details, tone }),
      });

      if (!res.ok) {
        toast.error('이메일 생성에 실패했습니다');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setPreview(data);

      // Generate header image if toggled
      if (includeHeader) {
        try {
          const bannerRes = await fetch('/api/banner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ copy: topic, reference: '이메일 헤더이미지, 깔끔하고 전문적', size: '600x200' }),
          });
          if (bannerRes.ok) {
            const bannerData = await bannerRes.json();
            setHeaderHtml(bannerData.html || '');
          }
        } catch { /* header is optional */ }
      }

      toast.success('이메일이 생성되었습니다');
    } catch {
      toast.error('이메일 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleRevise = async () => {
    if (!revision.trim() || !preview) return;
    setRevising(true);
    try {
      const res = await fetch('/api/gmail/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          to,
          topic: `[${purpose}] ${topic}\n\n수정 요청: ${revision}\n\n기존 이메일:\nSubject: ${preview.subject}\n${preview.body_html}`,
          details,
          tone,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreview(data);
        setRevision('');
        setDraftSaved(false);
        toast.success('수정본이 생성되었습니다');
      } else {
        toast.error('수정에 실패했습니다');
      }
    } catch {
      toast.error('수정에 실패했습니다');
    } finally {
      setRevising(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!preview) return;
    setDraftSaving(true);
    try {
      // Combine header image with body if available
      const fullBodyHtml = headerHtml
        ? `<div style="max-width:600px;margin:0 auto;">${headerHtml}<br/>${preview.body_html}</div>`
        : preview.body_html;

      const res = await fetch('/api/gmail/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'draft', to, subject: preview.subject, bodyHtml: fullBodyHtml }),
      });
      if (res.ok) {
        setDraftSaved(true);
        onResult('📧 이메일 → Gmail 임시저장', `**To:** ${to}\n**Subject:** ${preview.subject}\n\nGmail 임시보관함에 저장되었습니다.`);
        toast.success('Gmail 임시보관함에 저장되었습니다');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Gmail 저장에 실패했습니다');
      }
    } catch {
      toast.error('Gmail 저장에 실패했습니다');
    } finally {
      setDraftSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {!preview ? (
        <>
          <div>
            <SectionTitle>To *</SectionTitle>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <SectionTitle>목적</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {PURPOSES.map((p) => (
                <Chip key={p.key} label={p.label} active={purpose === p.key} onClick={() => setPurpose(p.key)} />
              ))}
            </div>
          </div>
          <div>
            <SectionTitle>주제 *</SectionTitle>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="이메일 주제"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <SectionTitle>상세 내용</SectionTitle>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="추가 내용이나 요점"
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
          <div>
            <SectionTitle>헤더이미지</SectionTitle>
            <button
              type="button"
              onClick={() => setIncludeHeader(!includeHeader)}
              className={`px-3 py-2 rounded-lg border text-sm transition-colors cursor-pointer ${
                includeHeader
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'bg-background text-muted-foreground border-border hover:border-accent/40'
              }`}
            >
              {includeHeader ? '헤더이미지 생성 ON' : '헤더이미지 생성 OFF'}
            </button>
          </div>
          <button
            onClick={handleGenerate}
            disabled={!to.trim() || !topic.trim() || loading}
            className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="size-4 animate-spin" /> 생성 중...</> : 'Generate Email'}
          </button>
        </>
      ) : (
        <>
          {/* Preview */}
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground">To: {to}</p>
              <p className="text-sm font-medium text-foreground mt-1">Subject: {preview.subject}</p>
            </div>

            {/* Header image */}
            {headerHtml && (
              <div className="rounded-lg border border-border overflow-hidden bg-white" style={{ width: 480, height: 160 }}>
                <iframe
                  srcDoc={headerHtml}
                  title="Header preview"
                  style={{ width: 600, height: 200, transform: 'scale(0.8)', transformOrigin: 'top left', border: 'none', display: 'block' }}
                  className="pointer-events-none"
                  sandbox=""
                />
              </div>
            )}

            {/* Body preview */}
            <div className="rounded-lg border border-border overflow-hidden bg-white" style={{ maxHeight: 300 }}>
              <iframe
                srcDoc={preview.body_html}
                title="Email preview"
                style={{ width: '100%', height: 300, border: 'none', display: 'block' }}
                className="pointer-events-none"
                sandbox=""
              />
            </div>

            {/* Revision */}
            <div>
              <SectionTitle>수정 요청</SectionTitle>
              <div className="flex gap-2">
                <textarea
                  value={revision}
                  onChange={(e) => setRevision(e.target.value)}
                  rows={2}
                  placeholder="수정할 부분을 알려주세요..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  onClick={handleRevise}
                  disabled={!revision.trim() || revising}
                  className="px-4 rounded-xl bg-muted text-foreground text-sm font-medium disabled:opacity-40 hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
                >
                  {revising ? <Loader2 className="size-4 animate-spin" /> : '수정'}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => { setPreview(null); setHeaderHtml(''); setDraftSaved(false); }}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                처음부터 다시
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={draftSaving || draftSaved}
                className="flex-1 py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {draftSaved ? (
                  <><Check className="size-4" /> 저장 완료</>
                ) : draftSaving ? (
                  <><Loader2 className="size-4 animate-spin" /> 저장 중...</>
                ) : (
                  'Gmail 임시저장'
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
