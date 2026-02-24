'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';
import type { ContentProject, ContentIdea } from '@/types';

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'threads', label: 'Threads' },
  { value: 'blog', label: 'Blog' },
];

const STEP_LABELS = ['주제 입력', '아이디어 선택', '초안 검토', '완료'];

interface Props {
  onResult?: (userLabel: string, content: string) => void;
}

export default function ContentWorkflow({ onResult }: Props) {
  const [step, setStep] = useState(0);
  const [topic, setTopic] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram', 'threads', 'blog']);
  const [project, setProject] = useState<ContentProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('instagram');
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState<string | null>(null);
  const [figmaPushing, setFigmaPushing] = useState(false);

  const togglePlatform = (p: string) =>
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  /* ---- Step 0 → 1: Generate ideas ---- */
  const submitTopic = async () => {
    if (!topic.trim() || selectedPlatforms.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/content-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), platforms: selectedPlatforms }),
      });
      if (!res.ok) throw new Error('Failed to generate ideas');
      const data: ContentProject = await res.json();
      setProject(data);
      setStep(1);
    } catch {
      toast.error('아이디어 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  /* ---- Step 1 → 2: Select idea + generate drafts ---- */
  const selectIdea = async (index: number) => {
    if (!project) return;
    setLoading(true);
    try {
      // Save selected idea
      await fetch('/api/content-project', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, selected_idea_index: index, status: 'topic_selected' }),
      });

      // Generate drafts + banner
      const res = await fetch('/api/content-project', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, action: 'generate_drafts' }),
      });
      if (!res.ok) throw new Error('Failed to generate drafts');
      const updated: ContentProject = await res.json();
      setProject(updated);
      setActiveTab(selectedPlatforms[0] || 'instagram');
      setStep(2);
      toast.success('초안과 배너가 생성되었습니다');
    } catch {
      toast.error('초안 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  /* ---- Step 2 → 3: Confirm + Figma push ---- */
  const confirmProject = async () => {
    if (!project) return;
    setLoading(true);
    try {
      // Update status to confirmed
      const res = await fetch('/api/content-project', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, status: 'confirmed' }),
      });
      if (!res.ok) throw new Error('Failed to confirm');
      const updated: ContentProject = await res.json();
      setProject(updated);
      setStep(3);
      toast.success('콘텐츠가 확정되었습니다');

      // Try Figma push if banner exists and Electron is available
      if (updated.banner_id && window.electronAPI?.figmaCapture) {
        setFigmaPushing(true);
        try {
          const bannerUrl = `${window.location.origin}/banner/${updated.banner_id}`;
          let fileKey = '';
          try {
            const fRes = await fetch('/api/figma/push');
            if (fRes.ok) {
              const fData = await fRes.json();
              if (fData.history?.[0]?.file_key) fileKey = fData.history[0].file_key;
            }
          } catch { /* no fileKey */ }

          if (fileKey) {
            const result = await window.electronAPI.figmaCapture({
              bannerUrl,
              fileKey,
              outputMode: 'push',
            });
            if (result?.figmaUrl) {
              setFigmaUrl(result.figmaUrl);
              toast.success('Figma에 전송되었습니다');
              await fetch('/api/figma/push', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bannerId: updated.banner_id, figmaUrl: result.figmaUrl, status: 'done' }),
              });
            }
          }
        } catch {
          toast.error('Figma 전송에 실패했습니다');
        } finally {
          setFigmaPushing(false);
        }
      }

      // Inject result to chat
      if (onResult) {
        const platforms = selectedPlatforms.join(', ');
        const summary = [
          `**${updated.topic}** 콘텐츠가 확정되었습니다.`,
          `플랫폼: ${platforms}`,
          updated.banner_id ? `배너: /banner/${updated.banner_id}` : '',
        ].filter(Boolean).join('\n');
        onResult('콘텐츠 확정', summary);
      }
    } catch {
      toast.error('콘텐츠 확정에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  /* ---- Regenerate drafts ---- */
  const regenerateDrafts = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const res = await fetch('/api/content-project', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, action: 'generate_drafts' }),
      });
      if (!res.ok) throw new Error('Failed to regenerate');
      const updated: ContentProject = await res.json();
      setProject(updated);
      toast.success('초안이 재생성되었습니다');
    } catch {
      toast.error('초안 재생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const copyBannerHtml = async () => {
    if (!project?.banner_html) return;
    await navigator.clipboard.writeText(project.banner_html);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const reset = () => {
    setStep(0);
    setTopic('');
    setProject(null);
    setActiveTab('instagram');
    setCopiedHtml(false);
    setFigmaUrl(null);
  };

  const getDraftContent = (platform: string) => {
    const draft = project?.drafts?.[platform];
    if (!draft) return '';
    return draft.content || '';
  };

  return (
    <div className="space-y-4">
      {/* Step indicator */}
      <div className="flex gap-1">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="flex-1">
            <div className={`h-1 rounded-full transition-colors ${
              i < step ? 'bg-accent' : i === step ? 'bg-accent/60' : 'bg-muted'
            }`} />
            <p className={`text-[10px] mt-1 ${i === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* ===== Step 0: Topic Input ===== */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">무엇에 대해 콘텐츠를 만들까요?</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitTopic()}
              placeholder="예: 인플루언서 마케팅 활용법, AI 마케팅 트렌드..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">플랫폼</label>
            <div className="flex gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => togglePlatform(p.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border cursor-pointer ${
                    selectedPlatforms.includes(p.value)
                      ? 'bg-accent text-accent-foreground border-accent'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={submitTopic}
            disabled={loading || !topic.trim() || selectedPlatforms.length === 0}
            className="w-full py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="size-4 animate-spin" /> 아이디어 생성 중...</> : 'AI 아이디어 생성'}
          </button>
        </div>
      )}

      {/* ===== Step 1: Idea Selection ===== */}
      {step === 1 && !loading && project?.ideas && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{project.topic}</span>에 대한 아이디어입니다. 하나를 선택하면 초안이 생성됩니다.
          </p>
          {project.ideas.map((idea: ContentIdea, i: number) => (
            <button
              key={i}
              onClick={() => selectIdea(i)}
              className="w-full text-left p-4 rounded-xl border border-border hover:border-accent/60 hover:bg-accent/5 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{idea.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{idea.message}</p>
                  {idea.hook && (
                    <p className="text-xs text-orange-500 mt-1.5">
                      {idea.hook}
                    </p>
                  )}
                </div>
                {idea.platform_fit && (
                  <div className="flex gap-1 shrink-0">
                    {Object.entries(idea.platform_fit).map(([p, score]) => (
                      <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {p.slice(0, 2).toUpperCase()} {String(score)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </button>
          ))}
          <button
            onClick={() => { setStep(0); setProject(null); }}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            ← 주제 변경
          </button>
        </div>
      )}

      {/* Loading state (generating drafts) */}
      {loading && step === 1 && (
        <div className="text-center py-12">
          <Loader2 className="size-6 animate-spin mx-auto text-accent mb-3" />
          <p className="text-sm text-muted-foreground">콘텐츠 초안 + 배너를 생성하고 있어요...</p>
          <p className="text-xs text-muted-foreground/60 mt-1">보통 20~30초 소요됩니다</p>
        </div>
      )}

      {/* ===== Step 2: Draft Review + Banner Preview ===== */}
      {step === 2 && project && (
        <div className="space-y-4">
          {/* AI Explanation */}
          {project.ai_explanation && (
            <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
              <p className="text-xs font-medium text-accent mb-1">AI 의도 설명</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{project.ai_explanation}</p>
            </div>
          )}

          {/* Platform tabs */}
          <div className="flex gap-1.5 border-b border-border pb-2">
            {selectedPlatforms.map((p) => (
              <button
                key={p}
                onClick={() => setActiveTab(p)}
                className={`px-3 py-1.5 rounded-t-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeTab === p
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {/* Draft content */}
          <div className="rounded-lg border border-border p-3">
            {/* Blog title */}
            {activeTab === 'blog' && project.drafts?.blog?.title && (
              <p className="text-sm font-medium mb-2">{project.drafts.blog.title}</p>
            )}
            <p className="text-sm whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              {getDraftContent(activeTab)}
            </p>
            {/* Hashtags */}
            {activeTab === 'instagram' && project.drafts?.instagram?.hashtags && (
              <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-border">
                {project.drafts.instagram.hashtags.map((tag: string, i: number) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            {/* Blog meta */}
            {activeTab === 'blog' && project.drafts?.blog?.meta_description && (
              <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border">
                Meta: {project.drafts.blog.meta_description}
              </p>
            )}
          </div>

          {/* Banner preview */}
          {project.banner_html && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">배너 미리보기</p>
                <button
                  onClick={copyBannerHtml}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border text-xs hover:bg-muted transition-colors cursor-pointer"
                >
                  {copiedHtml ? <><Check className="size-3" /> 복사됨</> : <><Copy className="size-3" /> HTML 복사</>}
                </button>
              </div>
              <div
                className="rounded-lg border border-border overflow-hidden bg-white"
                style={{ width: 480, height: 252 }}
              >
                <iframe
                  srcDoc={project.banner_html}
                  title="Banner preview"
                  style={{
                    width: 1200,
                    height: 630,
                    transform: 'scale(0.4)',
                    transformOrigin: 'top left',
                    border: 'none',
                    display: 'block',
                  }}
                  className="pointer-events-none"
                  sandbox=""
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={regenerateDrafts}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              다시 생성
            </button>
            <button
              onClick={confirmProject}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-accent text-accent-foreground text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="size-4 animate-spin" /> 확정 중...</> : '확정'}
            </button>
          </div>

          <button
            onClick={() => setStep(1)}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            ← 아이디어 다시 선택
          </button>
        </div>
      )}

      {/* ===== Step 3: Done ===== */}
      {step === 3 && project && (
        <div className="space-y-4">
          <div className="text-center py-6">
            <div className="text-2xl mb-2">&#10003;</div>
            <p className="text-sm font-medium">콘텐츠가 확정되었습니다</p>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedPlatforms.length}개 플랫폼 초안 + 배너가 생성되었습니다.
            </p>
          </div>

          {/* Figma status */}
          {figmaPushing && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Figma에 배너를 전송하고 있어요...
            </div>
          )}
          {figmaUrl && (
            <a
              href={figmaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-accent/30 bg-accent/5 text-sm text-accent hover:bg-accent/10 transition-colors"
            >
              <ExternalLink className="size-4" />
              Figma에서 보기
            </a>
          )}
          {!figmaPushing && !figmaUrl && project.banner_html && (
            <a
              href={`/banner/${project.banner_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              <ExternalLink className="size-4" />
              배너 미리보기
            </a>
          )}

          <button
            onClick={reset}
            className="w-full py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            새 콘텐츠 만들기
          </button>
        </div>
      )}
    </div>
  );
}
