'use client';

import { useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SectionTitle } from './shared';

interface BlogDraftFormProps {
  title: string;
  onResult: (l: string, c: string) => void;
  onBack: () => void;
}

export default function BlogDraftForm({ title, onResult, onBack }: BlogDraftFormProps) {
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<{ title: string; content: string; meta_description: string } | null>(null);
  const [headerHtml, setHeaderHtml] = useState('');
  const [bannerId, setBannerId] = useState('');
  const [revision, setRevision] = useState('');
  const [revising, setRevising] = useState(false);
  const [pushingFigma, setPushingFigma] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/blog-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        const data = await res.json();
        setDraft(data.draft);
        setHeaderHtml(data.headerHtml || '');
        setBannerId(data.bannerId || '');
        toast.success('블로그 초안이 생성되었습니다');
      } else {
        toast.error('초안 생성에 실패했습니다');
      }
    } catch {
      toast.error('초안 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleRevise = async () => {
    if (!revision.trim() || !draft) return;
    setRevising(true);
    try {
      const res = await fetch('/api/blog-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, existingDraft: draft.content, revision }),
      });
      if (res.ok) {
        const data = await res.json();
        setDraft(data.draft);
        if (data.headerHtml) setHeaderHtml(data.headerHtml);
        if (data.bannerId) setBannerId(data.bannerId);
        setRevision('');
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

  const handleFinalize = () => {
    if (!draft) return;
    const result = `# ${draft.title}\n\n${draft.content}\n\n---\n*Meta: ${draft.meta_description}*`;
    onResult('📝 블로그 최종화', result);
    toast.success('블로그가 최종화되었습니다');
  };

  const handleFigmaPush = async () => {
    if (!bannerId) return;
    setPushingFigma(true);
    try {
      const res = await fetch('/api/figma/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannerId, html: headerHtml, size: '1200x628' }),
      });
      if (res.ok) {
        toast.success('헤더이미지가 Figma로 전송되었습니다');
      } else {
        toast.error('Figma 전송에 실패했습니다');
      }
    } catch {
      toast.error('Figma 전송에 실패했습니다');
    } finally {
      setPushingFigma(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <span className="text-xs text-muted-foreground">선택된 소재</span>
        <p className="text-sm font-medium text-foreground mt-1">{title}</p>
      </div>

      {!draft && (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? <><Loader2 className="size-4 animate-spin" /> 초안 생성 중...</> : '블로그 초안 생성'}
        </button>
      )}

      {/* Draft preview */}
      {draft && (
        <>
          {/* Header image preview */}
          {headerHtml && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">헤더이미지</span>
                {bannerId && (
                  <button
                    onClick={handleFigmaPush}
                    disabled={pushingFigma}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-[11px] font-medium cursor-pointer disabled:opacity-40"
                  >
                    {pushingFigma ? <Loader2 className="size-3 animate-spin" /> : <ExternalLink className="size-3" />}
                    피그마로 전송
                  </button>
                )}
              </div>
              <div className="rounded-lg border border-border overflow-hidden bg-white" style={{ width: 480, height: 252 }}>
                <iframe
                  srcDoc={headerHtml}
                  title="Header preview"
                  style={{ width: 1200, height: 630, transform: 'scale(0.4)', transformOrigin: 'top left', border: 'none', display: 'block' }}
                  className="pointer-events-none"
                  sandbox=""
                />
              </div>
            </div>
          )}

          {/* Blog content */}
          <div className="rounded-lg border border-border bg-white dark:bg-[#252326] p-5 max-h-80 overflow-auto">
            <h2 className="text-base font-semibold text-foreground mb-3">{draft.title}</h2>
            <div className="text-sm leading-relaxed text-foreground/85 knowbar-response">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft.content}</ReactMarkdown>
            </div>
            {draft.meta_description && (
              <div className="mt-4 pt-3 border-t border-border/50">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Meta Description</span>
                <p className="text-xs text-muted-foreground mt-1">{draft.meta_description}</p>
              </div>
            )}
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

          {/* Finalize */}
          <button
            onClick={handleFinalize}
            className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors cursor-pointer"
          >
            최종 생성
          </button>
        </>
      )}

      <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">
        ← 소재 선택으로 돌아가기
      </button>
    </div>
  );
}
