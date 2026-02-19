'use client';

import { useState, useCallback, useEffect } from 'react';
import { ChatSession, ChatMessage } from '@/types';
import { supabase } from '@/lib/supabase';

export function useChat() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 세션 목록 로드
  const loadSessions = useCallback(async () => {
    const { data } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setSessions(data);
  }, []);

  // 세션 메시지 로드
  const loadMessages = useCallback(async (sessionId: string) => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
    setCurrentSessionId(sessionId);
  }, []);

  // 새 세션 시작
  const startNewSession = useCallback(() => {
    setCurrentSessionId(null);
    setMessages([]);
  }, []);

  // 세션 삭제
  const deleteSession = useCallback(async (sessionId: string) => {
    await supabase.from('chat_sessions').delete().eq('id', sessionId);
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
    }
    await loadSessions();
  }, [currentSessionId, loadSessions]);

  // 메시지 전송
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setIsLoading(true);

    // 낙관적 UI 업데이트
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      session_id: currentSessionId || '',
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      session_id: currentSessionId || '',
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          message: content,
          history,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n\n').filter(Boolean);

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));

          if (data.type === 'session_id') {
            setCurrentSessionId(data.sessionId);
            // 세션 목록 갱신
            await loadSessions();
          } else if (data.type === 'text') {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last.role === 'assistant') {
                updated[updated.length - 1] = { ...last, content: last.content + data.content };
              }
              return updated;
            });
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === 'assistant') {
          updated[updated.length - 1] = { ...last, content: '오류가 발생했습니다. 다시 시도해주세요.' };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionId, isLoading, messages, loadSessions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    currentSessionId,
    messages,
    isLoading,
    loadMessages,
    sendMessage,
    startNewSession,
    deleteSession,
  };
}
