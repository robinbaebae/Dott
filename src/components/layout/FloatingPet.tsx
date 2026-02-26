'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { sanitizeHtml } from '@/lib/sanitize';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  time: string;
  actions?: ActionData;
}

function getTimeStr() {
  return new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-muted/80 px-1 py-0.5 rounded text-[11px] font-mono">$1</code>')
    .replace(/\n/g, '<br>');
}

const CHAT_HISTORY_MAX = 50;

interface ActionData {
  taskCreated?: boolean;
  taskTitle?: string;
  calendarEventCreated?: boolean;
  emailDraft?: boolean;
  bannerId?: string;
  bannerHtml?: string;
  blogTitle?: string;
  memoryCreated?: boolean;
  taskUpdated?: boolean;
  taskUpdateTitle?: string;
  memoCreated?: boolean;
  memoTitle?: string;
  scheduleCreated?: boolean;
  scheduleTitle?: string;
}

function ActionCards({ actions }: { actions: ActionData }) {
  const cards: { icon: string; title: string; sub?: string }[] = [];
  if (actions.taskCreated && actions.taskTitle) cards.push({ icon: '✅', title: `${actions.taskTitle} 추가 완료`, sub: 'Tasks에서 보기' });
  if (actions.calendarEventCreated) cards.push({ icon: '📅', title: '일정 등록 완료', sub: 'Calendar에서 보기' });
  if (actions.emailDraft) cards.push({ icon: '📧', title: '이메일 초안 생성됨', sub: 'Gmail에서 보기' });
  if (actions.bannerId) cards.push({ icon: '🎨', title: '배너 생성됨', sub: 'Assets에서 보기' });
  if (actions.blogTitle) cards.push({ icon: '📝', title: actions.blogTitle, sub: '블로그 초안 보기' });
  if (actions.memoryCreated) cards.push({ icon: '💾', title: '메모 저장됨' });
  if (actions.taskUpdated && actions.taskUpdateTitle) cards.push({ icon: '✏️', title: `${actions.taskUpdateTitle} 상태 변경됨`, sub: 'Tasks에서 보기' });
  if (actions.memoCreated && actions.memoTitle) cards.push({ icon: '📋', title: `메모: ${actions.memoTitle}`, sub: '메모 저장됨' });
  if (actions.scheduleCreated && actions.scheduleTitle) cards.push({ icon: '📆', title: `${actions.scheduleTitle} 예약됨`, sub: '콘텐츠 캘린더에서 보기' });
  if (cards.length === 0) return null;
  return (
    <div className="ml-8 mt-1 space-y-1">
      {cards.map((c, i) => (
        <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors text-[11px]">
          <span className="text-sm shrink-0">{c.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{c.title}</div>
            {c.sub && <div className="text-[10px] text-muted-foreground">{c.sub}</div>}
          </div>
          <span className="text-muted-foreground text-xs shrink-0">›</span>
        </div>
      ))}
    </div>
  );
}

export default function FloatingPet() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('dott-pet-session-id');
    return null;
  });
  const [bubble, setBubble] = useState('');
  const [nextMeeting, setNextMeeting] = useState<string | null>(null);
  const [isElectron, setIsElectron] = useState(false);
  const [petOpacity, setPetOpacity] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dott-web-pet-opacity');
      return saved ? parseInt(saved, 10) : 100;
    }
    return 100;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bubbleTimer = useRef<NodeJS.Timeout | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Detect Electron — hide this component in desktop app (has its own floating pet window)
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      setIsElectron(true);
    }
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Persist sessionId
  useEffect(() => {
    if (sessionId) localStorage.setItem('dott-pet-session-id', sessionId);
  }, [sessionId]);

  // Load chat history + greeting on first open
  const historyLoaded = useRef(false);
  const greetingShown = useRef(false);

  // Auto-dismiss bubble
  useEffect(() => {
    if (bubble) {
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
      bubbleTimer.current = setTimeout(() => setBubble(''), 8000);
    }
    return () => { if (bubbleTimer.current) clearTimeout(bubbleTimer.current); };
  }, [bubble]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!open) return;
      const target = e.target as HTMLElement;
      if (target.closest('[data-pet-panel]') || target.closest('[data-pet-icon]')) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on ESC
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const fetchNextMeeting = useCallback(async function fetchNextMeeting() {
    try {
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      const res = await fetch(`/api/calendar?timeMin=${now.toISOString()}&timeMax=${endOfDay.toISOString()}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.connected || !Array.isArray(data.events) || data.events.length === 0) {
        setNextMeeting(null);
        return;
      }
      const upcoming = data.events
        .filter((evt: { start?: { dateTime?: string; date?: string } }) => {
          const start = new Date(evt.start?.dateTime || evt.start?.date || '');
          return start > now;
        })
        .sort((a: { start?: { dateTime?: string; date?: string } }, b: { start?: { dateTime?: string; date?: string } }) => {
          return new Date(a.start?.dateTime || a.start?.date || '').getTime() - new Date(b.start?.dateTime || b.start?.date || '').getTime();
        });
      if (upcoming.length > 0) {
        const next = upcoming[0];
        const start = new Date(next.start?.dateTime || next.start?.date);
        const hh = start.getHours().toString().padStart(2, '0');
        const mm = start.getMinutes().toString().padStart(2, '0');
        setNextMeeting(`${hh}:${mm} · ${next.summary || '미팅'}`);
      } else {
        setNextMeeting(null);
      }
    } catch { /* skip */ }
  }, []);

  const loadChatHistory = useCallback(async function loadChatHistory() {
    if (!sessionId) return;
    try {
      const res = await fetch(`/api/chat?sessionId=${sessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      const msgs = Array.isArray(data.messages) ? data.messages.slice(-20) : [];
      if (msgs.length > 0) {
        setMessages(msgs.map((m: { role: string; content: string; created_at?: string }) => ({
          role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.content,
          time: m.created_at ? new Date(m.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
        })));
      }
    } catch { /* skip */ }
  }, [sessionId]);

  const addAssistantMessage = useCallback((text: string, actions?: ActionData) => {
    setMessages((prev) => {
      const next = [...prev, { role: 'assistant' as const, content: text, time: getTimeStr(), actions }];
      return next.length > CHAT_HISTORY_MAX ? next.slice(next.length - CHAT_HISTORY_MAX) : next;
    });
  }, []);

  const showSmartGreeting = useCallback(async function showSmartGreeting() {
    try {
      const lines: string[] = [];
      // Tasks
      try {
        const res = await fetch('/api/tasks');
        if (res.ok) {
          const tasks = await res.json();
          const pending = tasks.filter((t: { status: string }) => t.status === 'todo' || t.status === 'in_progress');
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const tomorrow = new Date(todayStart); tomorrow.setDate(tomorrow.getDate() + 1);
          const todayDue = pending.filter((t: { due_date?: string }) => {
            if (!t.due_date) return false;
            const d = new Date(t.due_date);
            return d >= todayStart && d < tomorrow;
          });
          if (pending.length > 0) lines.push(`📝 할 일 ${pending.length}개${todayDue.length > 0 ? `, 오늘 마감 ${todayDue.length}개` : ''}`);
        }
      } catch { /* skip */ }
      // Next meeting
      if (nextMeeting) {
        lines.push(`📅 다음 미팅 ${nextMeeting}`);
      }
      // Emails
      try {
        const res = await fetch('/api/gmail');
        if (res.ok) {
          const data = await res.json();
          const emails = Array.isArray(data) ? data : (data.emails || []);
          const unread = emails.filter((e: { isUnread?: boolean }) => e.isUnread);
          if (unread.length > 0) lines.push(`📧 읽지 않은 메일 ${unread.length}건`);
        }
      } catch { /* skip */ }
      if (lines.length > 0) {
        addAssistantMessage(`좋은 ${new Date().getHours() < 12 ? '아침' : new Date().getHours() < 18 ? '오후' : '저녁'}이에요!\n\n${lines.join('\n')}\n\n무엇을 도와드릴까요?`);
      }
    } catch { /* skip */ }
  }, [nextMeeting, addAssistantMessage]);

  // Load chat history + greeting on first open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
      fetchNextMeeting();

      if (!historyLoaded.current) {
        historyLoaded.current = true;
        loadChatHistory();
        if (!greetingShown.current) {
          greetingShown.current = true;
          showSmartGreeting();
        }
      }
    }
  }, [open, fetchNextMeeting, loadChatHistory, showSmartGreeting]);

  async function sendChat() {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput('');
    setMessages((prev) => {
      const next = [...prev, { role: 'user' as const, content: msg, time: getTimeStr() }];
      return next.length > CHAT_HISTORY_MAX ? next.slice(next.length - CHAT_HISTORY_MAX) : next;
    });
    setSending(true);

    try {
      const history = [...messages.slice(-8), { role: 'user' as const, content: msg }];
      const res = await fetch('/api/knowbar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history }),
      });
      if (res.ok) {
        const data = await res.json();
        const actions: ActionData = {
          taskCreated: data.taskCreated,
          taskTitle: data.taskTitle,
          memoryCreated: data.memoryCreated,
          bannerId: data.bannerId,
          bannerHtml: data.bannerHtml,
          blogTitle: data.blogTitle,
          calendarEventCreated: data.calendarEventCreated,
          emailDraft: data.emailDraft,
          taskUpdated: data.taskUpdated,
          taskUpdateTitle: data.taskUpdateTitle,
          memoCreated: data.memoCreated,
          memoTitle: data.memoTitle,
          scheduleCreated: data.scheduleCreated,
          scheduleTitle: data.scheduleTitle,
        };
        addAssistantMessage(data.response || '응답을 받지 못했습니다.', actions);

        // Persist to DB (non-blocking)
        (async () => {
          try {
            let sid = sessionId;
            const userRes = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId: sid, role: 'user', content: msg }),
            });
            if (userRes.ok) {
              const userResData = await userRes.json();
              if (!sid && userResData.sessionId) {
                sid = userResData.sessionId;
                setSessionId(sid);
              }
            }
            if (sid) {
              await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: sid, role: 'assistant', content: data.response }),
              });
            }
          } catch { /* DB persistence failure — silent */ }
        })();
      } else {
        addAssistantMessage('응답을 받지 못했습니다.');
      }
    } catch {
      addAssistantMessage('연결에 실패했습니다.');
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  async function showCalendar() {
    setSending(true);
    try {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const res = await fetch(`/api/calendar?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}`);
      if (!res.ok) { addAssistantMessage('캘린더 정보를 불러올 수 없습니다.'); return; }
      const data = await res.json();
      if (!data.connected) { addAssistantMessage('구글 캘린더가 연결되지 않았어요.\nSettings에서 Google 계정을 연결해주세요.'); return; }
      const events = data.events || [];
      if (events.length === 0) { addAssistantMessage('📅 오늘 일정이 없어요.'); return; }
      let msg = `📅 오늘 ${events.length}건의 일정\n\n`;
      events.forEach((evt: { start?: { dateTime?: string; date?: string }; allDay?: boolean; title?: string; summary?: string }) => {
        const s = new Date(evt.start?.dateTime || evt.start?.date || '');
        const hh = s.getHours().toString().padStart(2, '0');
        const mm = s.getMinutes().toString().padStart(2, '0');
        msg += `• ${evt.allDay ? '종일' : `${hh}:${mm}`}  ${evt.title || evt.summary || ''}\n`;
      });
      addAssistantMessage(msg.trim());
    } catch { addAssistantMessage('캘린더 정보를 불러올 수 없습니다.'); }
    finally { setSending(false); }
  }

  async function showEmails() {
    setSending(true);
    try {
      const res = await fetch('/api/gmail');
      if (!res.ok) { addAssistantMessage('이메일 정보를 불러올 수 없습니다.'); return; }
      const data = await res.json();
      const emails = Array.isArray(data) ? data : (data.emails || []);
      const unread = emails.filter((e: { isUnread?: boolean }) => e.isUnread);
      if (unread.length === 0) { addAssistantMessage('📧 읽지 않은 메일이 없어요.'); return; }
      let msg = `📧 읽지 않은 메일 ${unread.length}건\n\n`;
      unread.slice(0, 5).forEach((email: { from: string; subject: string }) => {
        const from = email.from.split('<')[0].trim() || email.from;
        msg += `• ${from}\n  ${email.subject}\n`;
      });
      if (unread.length > 5) msg += `\n...외 ${unread.length - 5}건`;
      addAssistantMessage(msg.trim());
    } catch { addAssistantMessage('이메일 정보를 불러올 수 없습니다.'); }
    finally { setSending(false); }
  }

  async function showTasks() {
    setSending(true);
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) { addAssistantMessage('태스크를 불러올 수 없습니다.'); return; }
      const tasks = await res.json();
      const pending = tasks.filter((t: { status: string }) => t.status === 'todo' || t.status === 'in_progress');
      const overdue = tasks.filter((t: { status: string; due_date?: string }) => {
        if (t.status === 'done' || !t.due_date) return false;
        return new Date(t.due_date) < new Date();
      });
      let msg = `📝 할 일: ${pending.length}개`;
      if (overdue.length > 0) msg += ` | ⚠️ 지연: ${overdue.length}개`;
      if (pending.length > 0) {
        msg += '\n\n';
        pending.slice(0, 5).forEach((t: { title: string }) => { msg += `• ${t.title}\n`; });
        if (pending.length > 5) msg += `...외 ${pending.length - 5}개`;
      }
      addAssistantMessage(msg.trim());
    } catch { addAssistantMessage('태스크를 불러올 수 없습니다.'); }
    finally { setSending(false); }
  }

  // Electron desktop app has its own floating pet window
  if (isElectron) return null;

  return (
    <>
      {/* Speech Bubble */}
      {bubble && !open && (
        <div
          onClick={() => setBubble('')}
          className="fixed bottom-[76px] right-5 z-[9998] max-w-[240px] rounded-xl rounded-br-sm glass-float text-foreground px-3.5 py-2.5 text-[13px] font-medium leading-relaxed cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          {bubble}
        </div>
      )}

      {/* Chat Panel */}
      {open && (
        <div
          data-pet-panel
          ref={panelRef}
          className={`fixed bottom-[76px] right-5 z-[9999] w-[360px] h-[560px] rounded-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200 ${petOpacity < 100 ? 'glass-panel' : 'bg-card border border-border shadow-lg'}`}
          style={petOpacity < 100 ? { opacity: petOpacity / 100 } : undefined}
        >
          {/* Header */}
          <div className="px-3.5 pt-3.5 pb-2.5 border-b border-white/10 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-[30px] h-[30px] rounded-lg overflow-hidden shrink-0">
                <Image src="/logo-dott.png" alt="Dott" width={30} height={30} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-foreground">D*tt</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <span className="w-[5px] h-[5px] rounded-full bg-green-400 inline-block" />
                  {nextMeeting ? `다음 미팅 ${nextMeeting}` : '오늘 남은 일정 없음'}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-[26px] h-[26px] rounded-lg glass-subtle bg-white/10 text-muted-foreground hover:bg-white/20 hover:text-foreground transition-colors flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>
            {/* Quick Actions */}
            <div className="flex gap-1.5">
              {[
                { icon: '📅', label: 'Calendar', action: showCalendar },
                { icon: '📧', label: 'Email', action: showEmails },
                { icon: '✅', label: 'Tasks', action: showTasks },
              ].map((qa) => (
                <button
                  key={qa.label}
                  onClick={qa.action}
                  disabled={sending}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg glass-subtle bg-white/10 border border-white/15 text-[10px] text-muted-foreground hover:bg-white/20 hover:text-foreground transition-colors disabled:opacity-50"
                >
                  <span>{qa.icon}</span> {qa.label}
                </button>
              ))}
            </div>
            {/* Opacity Slider */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground min-w-[32px]">투명도</span>
              <input
                type="range"
                min={20}
                max={100}
                value={petOpacity}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setPetOpacity(v);
                  localStorage.setItem('dott-web-pet-opacity', String(v));
                }}
                className="flex-1 h-[3px] appearance-none rounded-sm bg-border outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-card [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
              />
              <span className="text-[10px] text-muted-foreground min-w-[28px] text-right tabular-nums">{petOpacity}%</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 scrollbar-thin">
            {messages.length === 0 && (
              <div className="text-center pt-4 pb-2">
                <div className="w-[38px] h-[38px] rounded-xl mx-auto mb-2.5 overflow-hidden">
                  <Image src="/logo-dott.png" alt="Dott" width={38} height={38} />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  D*tt Assistant<br />무엇을 도와드릴까요?
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i}>
                <div className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-lg overflow-hidden shrink-0 self-end">
                      <Image src="/logo-dott.png" alt="Dott" width={24} height={24} />
                    </div>
                  )}
                  <div className={`max-w-[78%] flex flex-col gap-0.5 ${msg.role === 'user' ? 'items-end' : ''}`}>
                    {msg.role === 'assistant' ? (
                      <div
                        className="text-xs leading-relaxed px-3 py-2 break-words glass-subtle bg-white/10 text-foreground border border-white/15 rounded-xl rounded-tl-sm"
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMarkdown(msg.content)) }}
                      />
                    ) : (
                      <div className="text-xs leading-relaxed px-3 py-2 whitespace-pre-wrap break-words bg-violet-600 text-white rounded-xl rounded-tr-sm">
                        {msg.content}
                      </div>
                    )}
                    <span className="text-[9px] text-muted-foreground px-1">{msg.time}</span>
                  </div>
                </div>
                {msg.actions && <ActionCards actions={msg.actions} />}
              </div>
            ))}
            {sending && (
              <div className="flex gap-2 items-end">
                <div className="w-6 h-6 rounded-lg overflow-hidden shrink-0">
                  <Image src="/logo-dott.png" alt="Dott" width={24} height={24} />
                </div>
                <div className="glass-subtle bg-white/10 border border-white/15 rounded-xl rounded-tl-sm px-4 py-2.5 flex gap-1 items-center">
                  <span className="w-[5px] h-[5px] rounded-full bg-violet-400 animate-pulse" />
                  <span className="w-[5px] h-[5px] rounded-full bg-violet-400 animate-pulse [animation-delay:0.2s]" />
                  <span className="w-[5px] h-[5px] rounded-full bg-violet-400 animate-pulse [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-white/10">
            <div className="flex items-center gap-1 glass-subtle bg-white/10 border border-white/15 rounded-full px-3.5 focus-within:border-violet-400/40 transition-colors">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    sendChat();
                  }
                }}
                placeholder="메시지를 입력하세요..."
                className="flex-1 bg-transparent border-none py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none"
              />
              <button
                onClick={sendChat}
                disabled={!input.trim() || sending}
                className="w-7 h-7 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0 hover:bg-violet-500 transition-colors disabled:bg-muted disabled:text-muted-foreground"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pet Icon */}
      <button
        data-pet-icon
        onClick={() => { setBubble(''); setOpen((v) => !v); }}
        className="fixed bottom-5 right-5 z-[9999] w-12 h-12 rounded-xl overflow-hidden shadow-lg hover:scale-105 transition-transform animate-bounce-slow"
        title="Dott 미니펫"
      >
        <Image src="/logo-dott.png" alt="Dott" width={48} height={48} />
      </button>

      <style jsx global>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        .animate-bounce-slow:hover {
          animation-play-state: paused;
        }
      `}</style>
    </>
  );
}
