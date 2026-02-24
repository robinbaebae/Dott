'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, CheckCircle2, ExternalLink, Image, Loader2, Plus, X, Copy, Check, History, MessageSquarePlus, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import YesterdayWork from './YesterdayWork';
import TodayOverview from './TodayOverview';
import TodayTasks from './TodayTasks';
import QuickActions from './QuickActions';
import ActionPanel from './ActionPanel';
import ContentCalendar from '@/components/content/ContentCalendar';
import { useKnowbarStore } from '@/store/knowbar-store';
import type { QuickActionType, KnowbarMessage } from '@/types';

const TAB_ID = 'dashboard';

/* ------------------------------------------------------------------ */
/* Assistant message with copy + HTML preview                          */
/* ------------------------------------------------------------------ */

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
      <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
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
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-muted cursor-pointer"
            title="복사"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5 text-muted-foreground" />}
          </button>
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

        {/* Banner HTML inline preview */}
        {msg.bannerHtml && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">배너 미리보기</span>
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

function ChatHistoryPanel({ onClose }: { onClose: () => void }) {
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
            onClick={() => { startNewSession(TAB_ID); onClose(); }}
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
              onClick={() => { loadSession(TAB_ID, session.id); onClose(); }}
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

export default function DottPrompt() {
  const [query, setQuery] = useState('');
  const [activeAction, setActiveAction] = useState<QuickActionType | null>(null);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messages = useKnowbarStore((s) => s.getTab(TAB_ID).messages);
  const isLoading = useKnowbarStore((s) => s.getTab(TAB_ID).isLoading);
  const sendMessage = useKnowbarStore((s) => s.sendMessage);
  const injectResult = useKnowbarStore((s) => s.injectResult);
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

  const handleSubmit = () => {
    if (!query.trim() || isLoading) return;
    sendMessage(TAB_ID, query.trim());
    setQuery('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.shiftKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const handleActionResult = (userLabel: string, content: string) => {
    injectResult(TAB_ID, userLabel, content);
    setActiveAction(null);
  };

  const handleActionSelect = (action: QuickActionType) => {
    setActiveAction(action);
    setShowQuickMenu(false);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="relative flex flex-col" style={{ minHeight: 'calc(100vh - 6rem)' }}>
      {/* Chat History Panel */}
      {showHistory && <ChatHistoryPanel onClose={() => setShowHistory(false)} />}

      {/* Empty state — greeting + search centered */}
      {!hasMessages && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <img src="/logo-dott.png" alt="Dott" className="size-12 rounded-2xl mb-4" />
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
              <textarea
                ref={inputRef}
                autoFocus
                rows={1}
                value={query}
                onChange={(e) => { setQuery(e.target.value); autoResize(e.target); }}
                onKeyDown={handleKeyDown}
                placeholder="Dott에게 무엇이든 물어보세요..."
                className="w-full rounded-2xl border border-border bg-card px-6 py-4 text-base placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-300 shadow-sm resize-none overflow-hidden"
              />
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
                <QuickActions onSelect={handleActionSelect} />
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
          <div className="flex-1 overflow-auto space-y-4 pb-4">
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
                <div className="p-4 rounded-2xl bg-card border border-border shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <img src="/logo-dott.png" alt="Dott" className="size-5 rounded-lg" />
                    <span className="text-xs text-muted-foreground">Dott이 생각하는 중...</span>
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
          <div className="pt-4 border-t border-border">
            <div className="relative flex items-center gap-2">
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
                  <div className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-border bg-card shadow-lg p-3 animate-in slide-in-from-bottom-2 fade-in duration-200 z-50">
                    <p className="text-xs text-muted-foreground mb-2">Quick Actions</p>
                    <QuickActions onSelect={handleActionSelect} compact />
                  </div>
                )}
              </div>

              <div className="relative flex-1">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); autoResize(e.target); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Dott에게 무엇이든 물어보세요..."
                  className="w-full rounded-2xl border border-border bg-card px-6 py-4 text-base placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-300 shadow-sm resize-none overflow-hidden"
                />
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
