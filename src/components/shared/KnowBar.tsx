'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Search, X, CheckCircle2 } from 'lucide-react';

export default function KnowBar() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [taskCreated, setTaskCreated] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
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
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="I know what you want"
          className="w-full rounded-xl border-2 border-[#FF4D00]/40 bg-background pl-12 pr-4 py-4 text-base placeholder:text-muted-foreground focus:outline-none focus:border-[#FF4D00] transition-colors"
        />
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showResponse && response && (
        <div className="relative rounded-lg border border-border bg-muted/30 p-4">
          <button
            onClick={dismissResponse}
            className="absolute top-2 right-2 p-1 rounded hover:bg-muted"
          >
            <X className="size-3" />
          </button>

          {taskCreated && (
            <div className="flex items-center gap-2 mb-2 text-green-600">
              <CheckCircle2 className="size-4" />
              <span className="text-sm font-medium">Task added: {taskTitle}</span>
            </div>
          )}

          <div
            ref={responseRef}
            className="text-sm whitespace-pre-wrap max-h-[200px] overflow-auto pr-6"
          >
            {response}
          </div>
        </div>
      )}
    </div>
  );
}
