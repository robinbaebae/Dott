'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Search, CheckCircle2 } from 'lucide-react';

export default function KnowBar() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [taskCreated, setTaskCreated] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async () => {
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setShowResponse(true);
    setResponse('');
    setTaskCreated(false);
    setTaskTitle('');

    try {
      const res = await fetch('/api/knowbar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setResponse(data.response);
        if (data.taskCreated) {
          setTaskCreated(true);
          setTaskTitle(data.taskTitle);
        }
      } else {
        setResponse('Something went wrong. Please try again.');
      }
    } catch {
      setResponse('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
      setQuery('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const dismissResponse = () => {
    setShowResponse(false);
    setResponse('');
    setTaskCreated(false);
    setTaskTitle('');
  };

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [response]);

  return (
    <div className="space-y-4">
      {/* KnowBar input */}
      <div
        className="relative cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-6 text-muted-foreground/60" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder=""
          className="w-full rounded-2xl border-2 border-accent/40 bg-background pl-14 pr-6 py-5 text-lg placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:shadow-[0_0_0_4px_rgba(204,223,255,0.15)] transition-all duration-300"
        />
        {/* Custom placeholder with blinking cursor */}
        {!query && !isFocused && (
          <div className="absolute left-14 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <span className="text-lg text-muted-foreground">I know what you want</span>
            <span className="knowbar-cursor ml-0.5 text-lg text-accent">|</span>
          </div>
        )}
        {!query && isFocused && (
          <div className="absolute left-14 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            <span className="knowbar-cursor text-lg text-accent">|</span>
          </div>
        )}
        {isLoading && (
          <div className="absolute right-5 top-1/2 -translate-y-1/2">
            <div className="size-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Dott response — chat bubble */}
      {showResponse && response && (
        <div className="flex items-start gap-3 animate-in slide-in-from-bottom-2 fade-in duration-300">
          {/* Avatar */}
          <div className="shrink-0 mt-1">
            <img src="/logo-dott.png" alt="Dott" className="size-8 rounded-full" />
          </div>

          {/* Bubble */}
          <div className="max-w-[85%]">
            <div
              className="bg-[#1a1a1a] text-white rounded-2xl px-5 py-4 shadow-lg cursor-pointer hover:bg-[#2a2a2a] transition-colors"
              onClick={dismissResponse}
            >
              {taskCreated && (
                <div className="flex items-center gap-2 mb-2 text-emerald-400">
                  <CheckCircle2 className="size-4" />
                  <span className="text-sm font-medium">Task added: {taskTitle}</span>
                </div>
              )}

              <div
                ref={responseRef}
                className="text-sm leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-auto knowbar-response"
              >
                {response}
              </div>

              <p className="text-[10px] text-white/30 mt-2 text-right">tap to dismiss</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading bubble */}
      {isLoading && !response && (
        <div className="flex items-start gap-3 animate-in fade-in duration-200">
          <div className="shrink-0 mt-1">
            <img src="/logo-dott.png" alt="Dott" className="size-8 rounded-full" />
          </div>
          <div>
            <div className="bg-[#1a1a1a] rounded-2xl px-5 py-4 shadow-lg">
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-white/50 animate-bounce [animation-delay:0ms]" />
                <div className="size-2 rounded-full bg-white/50 animate-bounce [animation-delay:150ms]" />
                <div className="size-2 rounded-full bg-white/50 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
