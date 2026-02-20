'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useChat } from '@/hooks/useChat';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';

export default function ChatWindow() {
  const {
    sessions,
    currentSessionId,
    messages,
    isLoading,
    loadMessages,
    sendMessage,
    startNewSession,
    deleteSession,
  } = useChat();

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex h-full">
      {/* 세션 목록 */}
      <div className="w-64 border-r border-border bg-muted/30 flex flex-col shrink-0">
        <div className="p-3 border-b border-border">
          <Button onClick={startNewSession} className="w-full" size="sm">
            + New chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  'group flex items-center gap-1 rounded-lg text-sm cursor-pointer transition-colors',
                  currentSessionId === session.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                )}
              >
                <button
                  onClick={() => loadMessages(session.id)}
                  className="flex-1 text-left px-3 py-2 truncate"
                >
                  {session.title}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 px-2 py-1 text-muted-foreground hover:text-destructive transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No conversations yet
              </p>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* 채팅 영역 */}
      <div className="flex-1 flex flex-col">
        {messages.length === 0 && !currentSessionId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3">
              <img src="/logo.png" alt="Ditto" className="w-12 h-12 rounded-lg mx-auto" />
              <h2 className="text-lg">Ask Ditto anything</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Marketing content, ad copy, brand strategy, and more.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {[
                  'Suggest blog post ideas',
                  'Write an Instagram caption',
                  'Plan this month\'s marketing',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                    className="px-3 py-1.5 text-xs border border-border rounded-full hover:bg-accent transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="p-4 max-w-3xl mx-auto">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          </ScrollArea>
        )}

        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}
