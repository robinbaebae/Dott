'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, CheckCircle2, ChevronDown, X } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  taskCreated?: boolean;
  taskTitle?: string;
  memoryCreated?: boolean;
}

export default function DittoChat() {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    if (!expanded) setExpanded(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/knowbar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          taskCreated: data.taskCreated,
          taskTitle: data.taskTitle,
          memoryCreated: data.memoryCreated,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Something went wrong. Please try again.' },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: 'An error occurred. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end" style={{ maxWidth: '400px' }}>
      {/* Chat messages panel — slides up when expanded */}
      {expanded && (
        <div className="w-[400px] mb-2 bg-[#1a1a1a] rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Ditto" className="size-6 rounded-full" />
              <span className="text-sm text-white font-medium">Ditto</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setExpanded(false)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
              >
                <ChevronDown className="size-4 text-white/50" />
              </button>
              <button
                onClick={() => { setExpanded(false); setMessages([]); }}
                className="p-1 rounded hover:bg-white/10 transition-colors"
              >
                <X className="size-4 text-white/50" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="max-h-[400px] overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#FF4D00] text-white'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  {msg.taskCreated && (
                    <div className="flex items-center gap-2 mb-2 text-emerald-400">
                      <CheckCircle2 className="size-3.5" />
                      <span className="text-xs font-medium">Task added: {msg.taskTitle}</span>
                    </div>
                  )}
                  {msg.memoryCreated && (
                    <div className="flex items-center gap-2 mb-2 text-blue-400">
                      <CheckCircle2 className="size-3.5" />
                      <span className="text-xs font-medium">Memory saved</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap knowbar-response">{msg.content}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full bg-white/50 animate-bounce [animation-delay:0ms]" />
                    <div className="size-2 rounded-full bg-white/50 animate-bounce [animation-delay:150ms]" />
                    <div className="size-2 rounded-full bg-white/50 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Always-visible input bar */}
      <div className="w-[400px] bg-[#1a1a1a] rounded-2xl shadow-2xl border border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Ditto" className="size-6 rounded-full shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => messages.length > 0 && setExpanded(true)}
            placeholder="Ask Ditto anything..."
            className="flex-1 bg-white/10 text-white rounded-xl px-3 py-2 text-sm placeholder:text-white/30 outline-none focus:bg-white/15 transition-colors"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-xl bg-[#FF4D00] text-white hover:bg-[#FF4D00]/80 disabled:opacity-30 transition-colors shrink-0"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
