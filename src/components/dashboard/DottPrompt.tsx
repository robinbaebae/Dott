'use client';

import { useState, useRef, useEffect, useCallback, KeyboardEvent, CompositionEvent } from 'react';
import { Send, CheckCircle2, ExternalLink, Image, Loader2, Plus, X, Copy, Check, History, MessageSquarePlus, Trash2, ArrowLeft, CalendarPlus, Figma } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import YesterdayWork from './YesterdayWork';
import TodayOverview from './TodayOverview';
import TodayTasks from './TodayTasks';
import DailyBriefingPanel from './DailyBriefingPanel';
import QuickActions from './QuickActions';
import ActionPanel from './ActionPanel';

// AI 응답 대기 중 랜덤 안내 메시지 — 독립 컴포넌트로 자체 타이머 순환
const LOADING_MESSAGES = [
  'Dott이 생각하는 중...',
  '정보 모으는 중...',
  '분석하고 있어요...',
  '잠시만 기다려주세요...',
  '열심히 찾고 있어요...',
  '답변 준비 중...',
  '데이터 확인 중...',
  '거의 다 됐어요...',
];

function RotatingLoadingMsg() {
  const [idx, setIdx] = useState(
    () => Math.floor(Math.random() * LOADING_MESSAGES.length)
  );
  useEffect(() => {
    const timer = setInterval(() => {
      setIdx((prev) => {
        let next = Math.floor(Math.random() * LOADING_MESSAGES.length);
        while (next === prev) next = Math.floor(Math.random() * LOADING_MESSAGES.length);
        return next;
      });
    }, 2500);
    return () => clearInterval(timer);
  }, []);
  return (
    <span key={idx} className="text-xs text-muted-foreground animate-in fade-in duration-500">
      {LOADING_MESSAGES[idx]}
    </span>
  );
}
import ContentCalendar from '@/components/content/ContentCalendar';
import ActivityHeatmap from './ActivityHeatmap';
import ResumePanel from './ResumePanel';
import { useKnowbarStore } from '@/store/knowbar-store';
import type { QuickActionCategory, KnowbarMessage } from '@/types';

/* ------------------------------------------------------------------ */
/* Tab label sub-component — uses hook properly for reactivity         */
/* ------------------------------------------------------------------ */
function TabLabel({ tabId, fallback }: { tabId: string; fallback: string }) {
  const messages = useKnowbarStore((s) => s.getTab(tabId).messages);
  const preview = messages.length > 0
    ? messages[0].content.slice(0, 20) + (messages[0].content.length > 20 ? '…' : '')
    : fallback;
  return <>{preview}</>;
}

/* ------------------------------------------------------------------ */
/* Assistant message with copy + HTML preview                          */
/* ------------------------------------------------------------------ */

function SaveToCalendarButton({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [platform, setPlatform] = useState('instagram');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const titleMatch = content.match(/\*\*(.+?)\*\*/);
      const title = titleMatch ? titleMatch[1].slice(0, 80) : content.slice(0, 80);
      const res = await fetch('/api/content-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, platform, scheduled_date: date, content }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => { setSaved(false); setOpen(false); }, 1500);
      }
    } catch { /* silent */ }
    setSaving(false);
  };

  if (saved) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500">
        <Check className="size-3" /> 캘린더에 저장됨
      </span>
    );
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-muted cursor-pointer"
        title="캘린더에 저장"
      >
        <CalendarPlus className="size-3.5 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 glass-float rounded-xl z-50 p-3 space-y-2 animate-in fade-in duration-150">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] focus:outline-none"
          >
            <option value="instagram">Instagram</option>
            <option value="threads">Threads</option>
            <option value="blog">Blog</option>
            <option value="newsletter">Newsletter</option>
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] focus:outline-none"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-1.5 rounded-lg bg-accent text-accent-foreground text-[11px] font-medium hover:bg-accent/90 disabled:opacity-40 cursor-pointer"
          >
            {saving ? '저장 중...' : '캘린더에 저장'}
          </button>
        </div>
      )}
    </div>
  );
}

function FigmaDesignPreview({ msg }: { msg: KnowbarMessage }) {
  const [pushing, setPushing] = useState(false);
  const [pushed, setPushed] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState<string | null>(msg.figmaDesign?.figmaUrl || null);
  const [htmlCopied, setHtmlCopied] = useState(false);
  const design = msg.figmaDesign;
  if (!design) return null;

  const [w, h] = (design.size || '1080x1080').split('x').map(Number);
  const previewW = 480;
  const scale = previewW / (w || 1080);
  const previewH = (h || 1080) * scale;

  const designViewUrl = `/api/figma-design?id=${design.designId}`;

  const handleCopyHtml = async () => {
    await navigator.clipboard.writeText(design.html);
    setHtmlCopied(true);
    setTimeout(() => setHtmlCopied(false), 2000);
  };

  const handleOpenDesign = () => {
    window.open(designViewUrl, '_blank');
  };

  const handlePushToFigma = async () => {
    setPushing(true);
    try {
      // Render HTML to PNG via hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${w}px;height:${h}px;border:none;`;
      document.body.appendChild(iframe);
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Cannot access iframe');
      iframeDoc.open();
      iframeDoc.write(design.html);
      iframeDoc.close();

      await new Promise((r) => setTimeout(r, 500));

      const body = iframeDoc.body;
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(body, { width: w, height: h, pixelRatio: 2 });
      document.body.removeChild(iframe);

      // Convert to blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      // Upload to auto-push queue
      const formData = new FormData();
      formData.append('image', new File([blob], 'design.png', { type: 'image/png' }));
      formData.append('size', design.size || '1080x1080');
      formData.append('prompt', design.description || '');
      if (design.figmaFileKey) formData.append('figmaFileKey', design.figmaFileKey);

      const pushRes = await fetch('/api/figma/auto-push', {
        method: 'POST',
        body: formData,
      });

      if (pushRes.ok) {
        setPushed(true);
      } else {
        // Fallback: open in new tab
        handleOpenDesign();
      }
    } catch {
      handleOpenDesign();
    } finally {
      setPushing(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-md bg-[#5B4D6E]/10 flex items-center justify-center">
            <Figma className="size-3.5 text-[#5B4D6E]" />
          </div>
          <span className="text-xs font-semibold text-foreground">Figma 디자인</span>
          {design.size && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              {design.size}
            </span>
          )}
        </div>
        <button
          onClick={handleCopyHtml}
          className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border text-[11px] hover:bg-muted transition-colors cursor-pointer text-muted-foreground"
        >
          {htmlCopied ? <><Check className="size-3 text-emerald-500" /> 복사됨</> : <><Copy className="size-3" /> HTML 복사</>}
        </button>
      </div>

      {/* Preview */}
      <div
        className="rounded-xl border border-border overflow-hidden bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        style={{ width: previewW, height: previewH }}
        onClick={handleOpenDesign}
        title="클릭하면 새 탭에서 열립니다"
      >
        <iframe
          srcDoc={design.html}
          title="Figma design preview"
          style={{
            width: w || 1080,
            height: h || 1080,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            border: 'none',
            display: 'block',
          }}
          className="pointer-events-none"
          sandbox="allow-same-origin"
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-3">
        {figmaUrl ? (
          <a
            href={figmaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5B4D6E] text-white text-xs font-medium hover:bg-[#6B5B7B] transition-colors"
          >
            <Figma className="size-3.5" />
            Figma에서 열기
            <ExternalLink className="size-3" />
          </a>
        ) : pushed ? (
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 text-xs font-medium">
            <Check className="size-3.5" />
            Figma 플러그인으로 전송됨
          </span>
        ) : (
          <button
            onClick={handlePushToFigma}
            disabled={pushing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5B4D6E] text-white text-xs font-medium hover:bg-[#6B5B7B] disabled:opacity-50 transition-colors cursor-pointer"
          >
            {pushing ? (
              <><Loader2 className="size-3.5 animate-spin" /> Figma 전송 중...</>
            ) : (
              <><Figma className="size-3.5" /> Figma로 보내기</>
            )}
          </button>
        )}
        <button
          onClick={handleOpenDesign}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
        >
          <ExternalLink className="size-3.5" />
          새 탭에서 보기
        </button>
      </div>
    </div>
  );
}

function AssistantMessage({ msg }: { msg: KnowbarMessage }) {
  const [copied, setCopied] = useState(false);
  const [htmlCopied, setHtmlCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyHtml = async () => {
    if (!msg.bannerHtml) return;
    await navigator.clipboard.writeText(msg.bannerHtml);
    setHtmlCopied(true);
    setTimeout(() => setHtmlCopied(false), 2000);
  };

  return (
    <div className="max-w-[85%] animate-in slide-in-from-bottom-2 fade-in duration-300 group/msg">
      <div className="p-4 rounded-2xl glass-card">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {msg.agentIcon ? (
              <span className="text-lg">{msg.agentIcon}</span>
            ) : (
              <img src="/logo-dott.png" alt="Dott" className="size-5 rounded-lg" />
            )}
            <span className="text-xs font-medium text-foreground">
              {msg.agentName || 'Dott'}
            </span>
            {msg.skill && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">
                {msg.skill}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {/* Save to Calendar */}
            <SaveToCalendarButton content={msg.content} />
            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-muted cursor-pointer"
              title="복사"
            >
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5 text-muted-foreground" />}
            </button>
          </div>
        </div>

        {msg.taskCreated && (
          <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            <span className="text-xs">Task added: {msg.taskTitle}</span>
          </div>
        )}

        {msg.memoryCreated && (
          <div className="flex items-center gap-2 mb-2 text-accent">
            <CheckCircle2 className="size-3.5" />
            <span className="text-xs">Memory saved</span>
          </div>
        )}

        {/* Markdown content */}
        <div className="text-sm leading-relaxed text-foreground knowbar-response">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
        </div>

        {/* Banner / Header image preview */}
        {msg.bannerHtml && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                {msg.blogTitle ? '헤더이미지 미리보기' : '배너 미리보기'}
              </span>
              <button
                onClick={handleCopyHtml}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border text-[11px] hover:bg-muted transition-colors cursor-pointer"
              >
                {htmlCopied ? <><Check className="size-3" /> 복사됨</> : <><Copy className="size-3" /> HTML 복사</>}
              </button>
            </div>
            <div
              className="rounded-lg border border-border overflow-hidden bg-white"
              style={{ width: 480, height: 252 }}
            >
              <iframe
                srcDoc={msg.bannerHtml}
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

        {/* Blog content preview */}
        {msg.blogTitle && msg.blogContent && (
          <div className="mt-3 pt-3 border-t border-border">
            <span className="text-xs font-medium text-muted-foreground mb-2 block">블로그 초안</span>
            <div className="rounded-lg border border-border bg-white dark:bg-[#252326] p-5 max-h-80 overflow-auto">
              <h2 className="text-base font-semibold text-foreground mb-3">{msg.blogTitle}</h2>
              <div className="text-sm leading-relaxed text-foreground/85 knowbar-response">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.blogContent}</ReactMarkdown>
              </div>
              {msg.blogMetaDesc && (
                <div className="mt-4 pt-3 border-t border-border/50">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Meta Description</span>
                  <p className="text-xs text-muted-foreground mt-1">{msg.blogMetaDesc}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">수정이 필요하면 말씀하세요.</p>
          </div>
        )}

        {/* Figma Design preview */}
        {msg.figmaDesign && <FigmaDesignPreview msg={msg} />}

        {/* Figma / banner link (no inline HTML) */}
        {msg.bannerId && !msg.bannerHtml && (
          <div className="mt-3 pt-3 border-t border-border">
            {msg.figmaUrl ? (
              <a
                href={msg.figmaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-xs font-medium"
              >
                <Image className="size-3.5" />
                {msg.figmaUrl.startsWith('/banner/') ? '배너 미리보기' : 'Figma에서 열기'}
                <ExternalLink className="size-3" />
              </a>
            ) : (
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Figma에 제작 중...
              </div>
            )}
          </div>
        )}

        {/* Figma link when banner HTML is shown */}
        {msg.bannerHtml && msg.figmaUrl && !msg.figmaUrl.startsWith('/banner/') && (
          <a
            href={msg.figmaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 mt-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors text-xs font-medium"
          >
            <Image className="size-3.5" />
            Figma에서 열기
            <ExternalLink className="size-3" />
          </a>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chat History Panel                                                  */
/* ------------------------------------------------------------------ */

function ChatHistoryPanel({ activeTabId, onClose }: { activeTabId: string; onClose: () => void }) {
  const sessions = useKnowbarStore((s) => s.sessions);
  const sessionsLoaded = useKnowbarStore((s) => s.sessionsLoaded);
  const fetchSessions = useKnowbarStore((s) => s.fetchSessions);
  const loadSession = useKnowbarStore((s) => s.loadSession);
  const startNewSession = useKnowbarStore((s) => s.startNewSession);
  const deleteSession = useKnowbarStore((s) => s.deleteSession);
  const currentSessionId = useKnowbarStore((s) => s.sessionId);

  useEffect(() => {
    if (!sessionsLoaded) fetchSessions();
  }, [sessionsLoaded, fetchSessions]);

  return (
    <div className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border z-40 flex flex-col animate-in slide-in-from-left-4 fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-medium text-foreground">대화 기록</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { startNewSession(activeTabId); onClose(); }}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
            title="새 대화"
          >
            <MessageSquarePlus className="size-4 text-muted-foreground" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-auto py-2">
        {!sessionsLoaded && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {sessionsLoaded && sessions.length === 0 && (
          <div className="text-center py-8">
            <History className="size-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">아직 대화 기록이 없어요</p>
          </div>
        )}

        {sessions.map((session) => (
          <div
            key={session.id}
            className={`group flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors ${
              currentSessionId === session.id
                ? 'bg-primary/20 text-foreground'
                : 'hover:bg-muted text-foreground'
            }`}
          >
            <button
              className="flex-1 text-left min-w-0"
              onClick={() => { loadSession(activeTabId, session.id); onClose(); }}
            >
              <p className="text-sm truncate">{session.title}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(session.created_at), { addSuffix: true, locale: ko })}
              </p>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-all cursor-pointer"
              title="삭제"
            >
              <Trash2 className="size-3.5 text-destructive" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main DottPrompt                                                     */
/* ------------------------------------------------------------------ */

let nextTabNum = 1;

export default function DottPrompt() {
  const [tabs, setTabs] = useState<{ id: string; label: string }[]>([
    { id: 'tab-0', label: '대화 1' },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-0');

  const [query, setQuery] = useState('');
  const [activeAction, setActiveAction] = useState<QuickActionCategory | null>(null);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const composingRef = useRef(false);

  const messages = useKnowbarStore((s) => s.getTab(activeTabId).messages);
  const isLoading = useKnowbarStore((s) => s.getTab(activeTabId).isLoading);
  const sendMessage = useKnowbarStore((s) => s.sendMessage);
  const injectResult = useKnowbarStore((s) => s.injectResult);
  const startNewSession = useKnowbarStore((s) => s.startNewSession);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '좋은 아침이에요';
    if (hour < 18) return '좋은 오후에요';
    return '좋은 저녁이에요';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Close quick menu on outside click
  useEffect(() => {
    if (!showQuickMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowQuickMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showQuickMenu]);

  // Focus input when switching tabs
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [activeTabId]);

  const handleSubmit = useCallback(() => {
    if (!query.trim() || isLoading) return;
    sendMessage(activeTabId, query.trim());
    setQuery('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [query, isLoading, sendMessage, activeTabId]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (composingRef.current) return; // Korean IME composing — ignore
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCompositionStart = () => { composingRef.current = true; };
  const handleCompositionEnd = (e: CompositionEvent<HTMLTextAreaElement>) => {
    composingRef.current = false;
  };

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const handleActionResult = (userLabel: string, content: string) => {
    injectResult(activeTabId, userLabel, content);
    setActiveAction(null);
  };

  const handleActionSelect = (action: QuickActionCategory) => {
    setActiveAction(action);
    setShowQuickMenu(false);
  };

  // Tab management
  const addTab = () => {
    nextTabNum++;
    const newTab = { id: `tab-${nextTabNum}`, label: `대화 ${nextTabNum}` };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setQuery('');
    setActiveAction(null);
  };

  const closeTab = (tabId: string) => {
    if (tabs.length <= 1) return; // keep at least one
    const idx = tabs.findIndex((t) => t.id === tabId);
    const remaining = tabs.filter((t) => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId) {
      setActiveTabId(remaining[Math.max(0, idx - 1)].id);
    }
    // Clear messages for closed tab
    startNewSession(tabId);
  };

  const goHome = () => {
    startNewSession(activeTabId);
    setQuery('');
    setActiveAction(null);
  };

  const hasMessages = messages.length > 0;

  // Shared textarea props
  const textareaProps = {
    ref: inputRef,
    autoFocus: true,
    rows: 1,
    value: query,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => { setQuery(e.target.value); autoResize(e.target); },
    onKeyDown: handleKeyDown,
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    placeholder: 'Dott에게 무엇이든 물어보세요...',
    className: 'w-full rounded-2xl glass-card px-6 py-4 text-base placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-300 resize-none overflow-hidden',
  };

  return (
    <div className={`relative flex flex-col ${hasMessages ? 'h-[calc(100vh-5rem)]' : ''}`}>
      {/* Chat History Panel */}
      {showHistory && <ChatHistoryPanel activeTabId={activeTabId} onClose={() => setShowHistory(false)} />}

      {/* Tab bar — always visible when multiple tabs */}
      {tabs.length > 1 && (
        <div className="shrink-0 flex items-center gap-1 pb-3 overflow-x-auto">
          {tabs.map((tab) => {
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group/tab flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                  activeTabId === tab.id
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="max-w-[120px] truncate"><TabLabel tabId={tab.id} fallback={tab.label} /></span>
                {tabs.length > 1 && (
                  <span
                    onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                    className="opacity-0 group-hover/tab:opacity-100 hover:text-destructive transition-opacity cursor-pointer"
                  >
                    <X className="size-3" />
                  </span>
                )}
              </button>
            );
          })}
          <button
            onClick={addTab}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
            title="새 대화 탭"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      )}

      {/* Empty state — greeting + search centered */}
      {!hasMessages && (
        <div className="flex flex-col items-center pt-[6vh]">
          <h1 className="text-2xl tracking-tight text-foreground">{getGreeting()}</h1>
          <p className="text-sm text-muted-foreground mt-2 mb-8">무슨 일을 도와드릴까요?</p>
          <div className="w-full max-w-xl relative flex items-center gap-2">
            {/* History button */}
            <button
              onClick={() => setShowHistory((v) => !v)}
              className={`p-3 rounded-xl border border-border transition-colors cursor-pointer shrink-0 ${
                showHistory ? 'bg-accent text-accent-foreground' : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title="대화 기록"
            >
              <History className="size-4" />
            </button>
            <div className="relative flex-1">
              <textarea {...textareaProps} />
              <button
                onClick={handleSubmit}
                disabled={!query.trim() || isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-30 transition-colors cursor-pointer"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>

          {/* Quick Actions or ActionPanel */}
          <div className="mt-6 w-full max-w-3xl space-y-4">
            {activeAction ? (
              <ActionPanel
                action={activeAction}
                onResult={handleActionResult}
                onClose={() => setActiveAction(null)}
              />
            ) : (
              <>
                <ResumePanel />
                <QuickActions onSelect={handleActionSelect} />
                <DailyBriefingPanel />
                <ActivityHeatmap />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TodayOverview />
                  <TodayTasks />
                </div>
                <ContentCalendar />
                <YesterdayWork />
              </>
            )}
          </div>
        </div>
      )}

      {/* Conversation mode */}
      {hasMessages && (
        <>
          <div className="flex-1 min-h-0 overflow-auto space-y-4 pb-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <AssistantMessage msg={msg} />
                )}

                {msg.role === 'user' && (
                  <div className="max-w-[75%] animate-in slide-in-from-bottom-2 fade-in duration-200">
                    <div className="px-4 py-3 rounded-2xl bg-accent text-accent-foreground text-sm">
                      {msg.content}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start animate-in fade-in duration-200">
                <div className="p-4 rounded-2xl glass-card">
                  <div className="flex items-center gap-2 mb-2">
                    <img src="/logo-dott.png" alt="Dott" className="size-5 rounded-lg" />
                    <RotatingLoadingMsg />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full bg-accent/50 animate-bounce [animation-delay:0ms]" />
                    <div className="size-2 rounded-full bg-accent/50 animate-bounce [animation-delay:150ms]" />
                    <div className="size-2 rounded-full bg-accent/50 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            {/* Inline ActionPanel in conversation mode */}
            {activeAction && (
              <div className="max-w-[85%]">
                <ActionPanel
                  action={activeAction}
                  onResult={handleActionResult}
                  onClose={() => setActiveAction(null)}
                />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input — pinned to bottom */}
          <div className="shrink-0 pt-4 border-t border-border">
            <div className="relative flex items-center gap-2">
              {/* Back to home */}
              <button
                onClick={goHome}
                className="p-3 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="새 대화"
              >
                <ArrowLeft className="size-4" />
              </button>

              {/* History button */}
              <button
                onClick={() => setShowHistory((v) => !v)}
                className={`p-3 rounded-xl border border-border transition-colors cursor-pointer ${
                  showHistory ? 'bg-accent text-accent-foreground' : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                title="대화 기록"
              >
                <History className="size-4" />
              </button>

              {/* + Quick Action button */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowQuickMenu((v) => !v)}
                  className={`p-3 rounded-xl border border-border transition-colors cursor-pointer ${
                    showQuickMenu ? 'bg-accent text-accent-foreground' : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {showQuickMenu ? <X className="size-4" /> : <Plus className="size-4" />}
                </button>

                {/* Quick menu popover */}
                {showQuickMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-72 rounded-xl glass-float p-3 animate-in slide-in-from-bottom-2 fade-in duration-200 z-50">
                    <p className="text-xs text-muted-foreground mb-2">Quick Actions</p>
                    <QuickActions onSelect={handleActionSelect} compact />
                  </div>
                )}
              </div>

              <div className="relative flex-1">
                <textarea {...textareaProps} />
                <button
                  onClick={handleSubmit}
                  disabled={!query.trim() || isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-30 transition-colors cursor-pointer"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
