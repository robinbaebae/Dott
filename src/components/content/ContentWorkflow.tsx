'use client';

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, Copy, Check, RefreshCw, ArrowLeft } from 'lucide-react';
import type { ContentProject, ContentMaterial, HeaderImageConcept } from '@/types';
import { TONE_OPTIONS } from '@/types';

const PLATFORM_LIMITS: Record<string, number> = {
  instagram: 2200,
  threads: 500,
  blog: 0, // unlimited
  brand_message: 300,
  newsletter: 5000,
};

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', color: '#E1306C' },
  { value: 'threads', label: 'Threads', color: '#8E8290' },
  { value: 'blog', label: 'Blog', color: '#34C759' },
  { value: 'brand_message', label: '브랜드메세지', color: '#F59E0B' },
  { value: 'newsletter', label: '뉴스레터', color: '#8B5CF6' },
];

interface Props {
  onResult?: (userLabel: string, content: string) => void;
  initialTopic?: string;
}

export default function ContentWorkflow({ onResult, initialTopic }: Props) {
  const [topic, setTopic] = useState(initialTopic || '');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram', 'threads', 'blog', 'brand_message', 'newsletter']);
  const [project, setProject] = useState<ContentProject | null>(null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<'compose' | 'materials' | 'image_select' | 'generating'>('compose');
  const [selectedMaterialIndex, setSelectedMaterialIndex] = useState<number | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [activePreview, setActivePreview] = useState('instagram');
  const [tone, setTone] = useState('professional');
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scheduleTime, setScheduleTime] = useState(() => new Date().toTimeString().slice(0, 5));

  const togglePlatform = (p: string) =>
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  const getContent = (platform: string) => {
    if (editedContent[platform] !== undefined) return editedContent[platform];
    return project?.drafts?.[platform]?.content || '';
  };

  const getHashtags = () => project?.drafts?.instagram?.hashtags || [];

  /* ---- AI: Generate materials ---- */
  const generateMaterials = async () => {
    if (!topic.trim() || selectedPlatforms.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/content-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), platforms: selectedPlatforms, tone }),
      });
      if (!res.ok) throw new Error('Failed');
      const data: ContentProject = await res.json();
      setProject(data);
      setSelectedMaterialIndex(null);
      setPhase('materials');
    } catch {
      toast.error('소재 추천에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  /* ---- Select material → show image concepts ---- */
  const selectMaterial = async (index: number) => {
    if (!project) return;
    setSelectedMaterialIndex(index);
    // Save selected_idea_index to server
    await fetch('/api/content-project', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: project.id, selected_idea_index: index, status: 'topic_selected' }),
    });
    setPhase('image_select');
  };

  /* ---- Select image concept → generate drafts ---- */
  const selectImageConcept = async (imageIndex: number) => {
    if (!project || selectedMaterialIndex === null) return;
    setLoading(true);
    setPhase('generating');
    try {
      // Save selected_image_index
      await fetch('/api/content-project', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: project.id, selected_image_index: imageIndex }),
      });
      // Generate drafts via dedicated route
      const res = await fetch(`/api/content-project/${project.id}/generate`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed');
      const updated: ContentProject = await res.json();
      setProject(updated);
      setPhase('compose');
      setEditedContent({});
      toast.success('콘텐츠가 생성되었습니다');
    } catch {
      toast.error('초안 생성에 실패했습니다');
      setPhase('image_select');
    } finally {
      setLoading(false);
    }
  };

  /* ---- Regenerate ---- */
  const regenerate = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/content-project/${project.id}/generate`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed');
      const updated: ContentProject = await res.json();
      setProject(updated);
      setEditedContent({});
      toast.success('초안이 재생성되었습니다');
    } catch {
      toast.error('재생성 실패');
    } finally {
      setLoading(false);
    }
  };

  /* ---- Auto-save edited drafts (debounced) ---- */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');

  const autoSaveDrafts = useCallback((updated: Record<string, string>) => {
    if (!project) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      const mergedDrafts = { ...project.drafts };
      for (const [platform, content] of Object.entries(updated)) {
        if (mergedDrafts[platform]) {
          mergedDrafts[platform] = { ...mergedDrafts[platform], content };
        } else {
          mergedDrafts[platform] = { content };
        }
      }
      try {
        const res = await fetch('/api/content-project', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: project.id, drafts: mergedDrafts }),
        });
        if (res.ok) {
          setSaveStatus('saved');
        }
      } catch {
        // silent
      }
    }, 1500);
  }, [project]);

  const handleContentEdit = (platform: string, value: string) => {
    const updated = { ...editedContent, [platform]: value };
    setEditedContent(updated);
    autoSaveDrafts(updated);
  };

  /* ---- Schedule / Finalize ---- */
  const confirmProject = async () => {
    if (!project) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/content-project/${project.id}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleDate, scheduleTime }),
      });
      if (!res.ok) throw new Error('Failed');
      const updated: ContentProject = await res.json();
      setProject(updated);
      toast.success(scheduleDate ? '캘린더에 예약되었습니다' : '콘텐츠가 확정되었습니다');
      if (onResult) {
        onResult(
          scheduleDate ? '콘텐츠 예약' : '콘텐츠 확정',
          `**${updated.topic}** ${scheduleDate ? `${scheduleDate} ${scheduleTime}에 예약` : '확정'} (${selectedPlatforms.join(', ')})`
        );
      }
    } catch {
      toast.error('처리에 실패했습니다');
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
    setTopic('');
    setProject(null);
    setPhase('compose');
    setEditedContent({});
    setCopiedHtml(false);
    setSelectedMaterialIndex(null);
  };

  const hasDrafts = project?.drafts && Object.keys(project.drafts).length > 0;

  return (
    <div className="flex gap-5" style={{ minHeight: 'calc(100vh - 220px)' }}>

      {/* ===== LEFT: Platform + AI Assist ===== */}
      <div className="w-[200px] shrink-0 space-y-5">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Platforms</p>
          <div className="space-y-1">
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                onClick={() => togglePlatform(p.value)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all cursor-pointer ${
                  selectedPlatforms.includes(p.value)
                    ? 'bg-accent/8 border border-accent/20'
                    : 'hover:bg-muted border border-transparent'
                }`}
              >
                <span
                  className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center text-[10px] ${
                    selectedPlatforms.includes(p.value)
                      ? 'bg-accent border-accent text-white'
                      : 'border-border'
                  }`}
                >
                  {selectedPlatforms.includes(p.value) && '✓'}
                </span>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: p.color }}
                />
                <span className={selectedPlatforms.includes(p.value) ? 'text-foreground' : 'text-muted-foreground'}>
                  {p.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* AI Assist */}
        <div className="rounded-xl p-4 border border-accent/20 bg-gradient-to-b from-accent/5 to-transparent">
          <p className="text-[12px] font-semibold text-accent mb-1.5">AI Assist</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
            주제를 입력하면 AI가 플랫폼별 맞춤 콘텐츠를 제안합니다.
          </p>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generateMaterials()}
            placeholder="주제 입력..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-accent/40 mb-2"
          />
          <button
            onClick={generateMaterials}
            disabled={loading || !topic.trim()}
            className="w-full py-2 rounded-lg bg-accent text-accent-foreground text-[12px] font-medium disabled:opacity-40 hover:bg-accent/90 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            {loading && phase !== 'generating' ? <Loader2 className="size-3.5 animate-spin" /> : null}
            AI 소재 추천
          </button>

          {/* Material selection */}
          {phase === 'materials' && project?.materials && (
            <div className="mt-3 space-y-2">
              <p className="text-[10px] text-muted-foreground">소재를 선택하세요:</p>
              {project.materials.map((mat: ContentMaterial, i: number) => (
                <button
                  key={i}
                  onClick={() => selectMaterial(i)}
                  disabled={loading}
                  className="w-full text-left p-2.5 rounded-lg border border-border hover:border-accent/40 hover:bg-accent/5 transition-all cursor-pointer"
                >
                  <p className="text-[11px] font-medium leading-snug">{mat.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{mat.approach}</p>
                  {mat.key_points?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {mat.key_points.slice(0, 3).map((kp: string, j: number) => (
                        <span key={j} className="px-1.5 py-0.5 rounded bg-accent/8 text-accent text-[9px]">{kp}</span>
                      ))}
                    </div>
                  )}
                  <p className="text-[9px] text-muted-foreground/70 mt-1 line-clamp-1">{mat.engagement_reason}</p>
                </button>
              ))}
            </div>
          )}

          {/* Image concept selection */}
          {phase === 'image_select' && selectedMaterialIndex !== null && project?.materials?.[selectedMaterialIndex] && (
            <div className="mt-3 space-y-2">
              <button
                onClick={() => setPhase('materials')}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ArrowLeft className="size-3" /> 소재 다시 선택
              </button>
              <p className="text-[10px] text-muted-foreground">이미지 컨셉을 선택하세요:</p>
              {project.materials[selectedMaterialIndex].header_images.map((img: HeaderImageConcept, i: number) => (
                <button
                  key={i}
                  onClick={() => selectImageConcept(i)}
                  disabled={loading}
                  className="w-full text-left p-2.5 rounded-lg border border-border hover:border-accent/40 hover:bg-accent/5 transition-all cursor-pointer"
                >
                  <p className="text-[11px] font-medium leading-snug">{img.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{img.description}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {img.style_keywords.map((kw: string, j: number) => (
                      <span key={j} className="px-1.5 py-0.5 rounded bg-muted text-[9px] text-muted-foreground">{kw}</span>
                    ))}
                  </div>
                  <p className="text-[9px] text-muted-foreground/60 mt-1">{img.mood}</p>
                </button>
              ))}
            </div>
          )}

          {phase === 'generating' && (
            <div className="mt-3 text-center py-4">
              <Loader2 className="size-5 animate-spin mx-auto text-accent mb-2" />
              <p className="text-[10px] text-muted-foreground">초안 + 배너 생성 중...</p>
            </div>
          )}
        </div>

        {/* AI Explanation */}
        {project?.ai_explanation && (
          <div className="rounded-xl p-3 border border-border bg-muted/30">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1">AI 의도 설명</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{project.ai_explanation}</p>
          </div>
        )}
      </div>

      {/* ===== CENTER: Editor ===== */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Toolbar */}
        <div className="px-4 py-2.5 bg-card border border-border rounded-t-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {selectedPlatforms.map((p) => (
                <button
                  key={p}
                  onClick={() => setActivePreview(p)}
                  className={`px-3 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                    activePreview === p
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {PLATFORMS.find((pl) => pl.value === p)?.label || p}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {hasDrafts && (
                <button
                  onClick={regenerate}
                  disabled={loading}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <RefreshCw className="size-3" /> Regenerate
                </button>
              )}
              {saveStatus === 'saving' && (
                <span className="text-[10px] text-muted-foreground/60">저장 중...</span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-[10px] text-green-500/70">저장됨</span>
              )}
              {(() => {
                const len = getContent(activePreview).length;
                const limit = PLATFORM_LIMITS[activePreview] || 0;
                const overLimit = limit > 0 && len > limit;
                const nearLimit = limit > 0 && len >= limit * 0.9;
                return (
                  <span className={`text-[10px] ${overLimit ? 'text-red-500 font-medium' : nearLimit ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                    {len.toLocaleString()}{limit > 0 ? ` / ${limit.toLocaleString()}` : ' chars'}
                  </span>
                );
              })()}
            </div>
          </div>
          {/* Tone chips */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground/60 mr-1">톤</span>
            {TONE_OPTIONS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTone(t.value)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors cursor-pointer border ${
                  tone === t.value
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'bg-card text-muted-foreground border-border hover:border-accent/40'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Textarea */}
        <textarea
          value={getContent(activePreview)}
          onChange={(e) => handleContentEdit(activePreview, e.target.value)}
          placeholder={hasDrafts ? '' : '무엇에 대해 이야기할까요?\n\nAI Assist를 사용하면 주제만 입력해도 플랫폼에 맞는 콘텐츠를 자동으로 생성합니다.'}
          className="flex-1 bg-card border-x border-border px-4 py-3 text-[13px] leading-[1.8] resize-none focus:outline-none text-foreground placeholder:text-muted-foreground/50 min-h-[300px]"
        />

        {/* Footer: media + hashtags */}
        <div className="px-4 py-3 bg-card border border-border rounded-b-xl space-y-3">
          {/* Media buttons */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {['Image', 'Banner', 'GIF'].map((m) => (
                <button key={m} className="px-3 py-1.5 rounded-lg border border-border text-[11px] text-muted-foreground hover:bg-muted transition-colors cursor-pointer">
                  + {m}
                </button>
              ))}
            </div>
            {project?.banner_html && (
              <button
                onClick={copyBannerHtml}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-[11px] text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                {copiedHtml ? <><Check className="size-3" /> Copied</> : <><Copy className="size-3" /> HTML</>}
              </button>
            )}
          </div>

          {/* Hashtags */}
          {activePreview === 'instagram' && getHashtags().length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {getHashtags().map((tag: string, i: number) => (
                <span key={i} className="px-2.5 py-0.5 rounded-full bg-accent/8 border border-accent/15 text-accent text-[11px]">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Schedule + Publish */}
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] w-24 focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
            {scheduleTime === '10:00' && (
              <span className="text-[11px] text-green-600">Best time</span>
            )}
            <div className="ml-auto flex gap-2">
              {hasDrafts && (
                <button
                  onClick={reset}
                  className="px-4 py-2 rounded-lg border border-border text-[12px] text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}
              <button
                onClick={confirmProject}
                disabled={loading || !hasDrafts}
                className="px-6 py-2 rounded-lg bg-accent text-accent-foreground text-[12px] font-semibold disabled:opacity-40 hover:bg-accent/90 transition-colors cursor-pointer"
              >
                {loading ? 'Processing...' : scheduleDate ? 'Schedule Post' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== RIGHT: Live Preview ===== */}
      <div className="w-[280px] shrink-0 space-y-4 overflow-y-auto">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Live Preview</p>

        {/* Instagram Preview */}
        {selectedPlatforms.includes('instagram') && (
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'rgba(225,48,108,0.12)', color: '#E1306C' }}>IG</div>
              <div>
                <p className="text-[11px] font-semibold">codenbutter</p>
                <p className="text-[9px] text-muted-foreground">Instagram</p>
              </div>
            </div>
            {project?.banner_html ? (
              <div className="w-full h-[140px] overflow-hidden bg-muted/30">
                <iframe
                  srcDoc={project.banner_html}
                  className="pointer-events-none"
                  sandbox=""
                  style={{ width: '400%', height: '400%', transform: 'scale(0.25)', transformOrigin: 'top left', border: 'none' }}
                />
              </div>
            ) : (
              <div className="w-full h-[140px] bg-muted/30 flex items-center justify-center text-[10px] text-muted-foreground">
                Banner Preview
              </div>
            )}
            <div className="px-3 py-2.5">
              <p className="text-[11px] text-foreground line-clamp-3 leading-relaxed">
                {getContent('instagram') || 'Instagram 콘텐츠가 여기에 표시됩니다...'}
              </p>
              {getHashtags().length > 0 && (
                <p className="text-[10px] text-accent mt-1.5">
                  {getHashtags().slice(0, 4).map((t: string) => `#${t}`).join(' ')}
                </p>
              )}
            </div>
            <div className="flex gap-4 px-3 py-2 border-t border-border text-muted-foreground text-[11px]">
              <span>♡</span><span>💬</span><span>↗</span><span className="ml-auto">☆</span>
            </div>
          </div>
        )}

        {/* Threads Preview */}
        {selectedPlatforms.includes('threads') && (
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'rgba(142,130,144,0.12)', color: '#8E8290' }}>T</div>
              <div>
                <p className="text-[11px] font-semibold">codenbutter</p>
                <p className="text-[9px] text-muted-foreground">Threads</p>
              </div>
            </div>
            <div className="px-3 py-2.5">
              <p className="text-[11px] text-foreground line-clamp-4 leading-relaxed">
                {getContent('threads') || 'Threads 콘텐츠가 여기에 표시됩니다...'}
              </p>
            </div>
            <div className="flex gap-4 px-3 py-2 border-t border-border text-muted-foreground text-[11px]">
              <span>♡</span><span>💬</span><span>⟲</span><span>↗</span>
            </div>
          </div>
        )}

        {/* Blog Preview */}
        {selectedPlatforms.includes('blog') && (
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'rgba(52,199,89,0.12)', color: '#34C759' }}>B</div>
              <div>
                <p className="text-[11px] font-semibold">Blog Post</p>
                <p className="text-[9px] text-muted-foreground">codenbutter.com</p>
              </div>
            </div>
            <div className="px-3 py-2.5">
              {project?.drafts?.blog?.title && (
                <p className="text-[12px] font-semibold mb-1.5">{project.drafts.blog.title}</p>
              )}
              <p className="text-[11px] text-muted-foreground line-clamp-4 leading-relaxed">
                {getContent('blog') || 'Blog 콘텐츠가 여기에 표시됩니다...'}
              </p>
              {project?.drafts?.blog?.meta_description && (
                <p className="text-[10px] text-muted-foreground/60 mt-2">
                  Meta: {project.drafts.blog.meta_description}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Brand Message Preview */}
        {selectedPlatforms.includes('brand_message') && (
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>BM</div>
              <div>
                <p className="text-[11px] font-semibold">브랜드메세지</p>
                <p className="text-[9px] text-muted-foreground">1200×630 Card</p>
              </div>
            </div>
            {project?.banner_html ? (
              <div className="w-full overflow-hidden bg-muted/30" style={{ aspectRatio: '1200/630' }}>
                <iframe
                  srcDoc={project.banner_html}
                  className="pointer-events-none"
                  sandbox=""
                  style={{ width: '400%', height: '400%', transform: 'scale(0.25)', transformOrigin: 'top left', border: 'none' }}
                />
              </div>
            ) : (
              <div className="w-full bg-muted/30 flex items-center justify-center text-[10px] text-muted-foreground" style={{ aspectRatio: '1200/630' }}>
                1200×630 Banner
              </div>
            )}
            <div className="px-3 py-2.5">
              <p className="text-[11px] text-foreground line-clamp-3 leading-relaxed">
                {getContent('brand_message') || '브랜드 메세지가 여기에 표시됩니다...'}
              </p>
              {project?.drafts?.brand_message?.cta_text && (
                <p className="text-[10px] text-amber-500 font-medium mt-1.5">{project.drafts.brand_message.cta_text}</p>
              )}
            </div>
          </div>
        )}

        {/* Newsletter Preview */}
        {selectedPlatforms.includes('newsletter') && (
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}>NL</div>
              <div>
                <p className="text-[11px] font-semibold">뉴스레터</p>
                <p className="text-[9px] text-muted-foreground">Email Newsletter</p>
              </div>
            </div>
            {project?.banner_html ? (
              <div className="w-full overflow-hidden bg-muted/30" style={{ aspectRatio: '600/200' }}>
                <iframe
                  srcDoc={project.banner_html}
                  className="pointer-events-none"
                  sandbox=""
                  style={{ width: '400%', height: '400%', transform: 'scale(0.25)', transformOrigin: 'top left', border: 'none' }}
                />
              </div>
            ) : (
              <div className="w-full bg-muted/30 flex items-center justify-center text-[10px] text-muted-foreground" style={{ aspectRatio: '600/200' }}>
                600×200 Header
              </div>
            )}
            <div className="px-3 py-2.5">
              {project?.drafts?.newsletter?.subject && (
                <p className="text-[12px] font-semibold mb-1">{project.drafts.newsletter.subject}</p>
              )}
              <p className="text-[11px] text-muted-foreground line-clamp-4 leading-relaxed">
                {getContent('newsletter') || '뉴스레터 본문이 여기에 표시됩니다...'}
              </p>
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-[9px] text-muted-foreground/50 text-center">구독 해지 | Unsubscribe</p>
              </div>
            </div>
          </div>
        )}

        {/* Status */}
        {project?.status === 'confirmed' && (
          <div className="rounded-xl border border-green-500/20 bg-green-500/5 px-3 py-2.5 text-center">
            <p className="text-[11px] font-medium text-green-600">콘텐츠가 확정되었습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}
