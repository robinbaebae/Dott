import { create } from 'zustand';
import { toast } from 'sonner';
import type { KnowbarMessage, KnowbarAgentResponse, ChatSession } from '@/types';

interface TabState {
  messages: KnowbarMessage[];
  isLoading: boolean;
}

interface KnowbarStore {
  // Tab state
  tabs: Record<string, TabState>;
  getTab: (tabId: string) => TabState;
  addMessage: (tabId: string, message: KnowbarMessage) => void;
  updateMessage: (tabId: string, messageId: string, updates: Partial<KnowbarMessage>) => void;
  setLoading: (tabId: string, loading: boolean) => void;
  clearMessages: (tabId: string) => void;
  sendMessage: (tabId: string, query: string) => void;
  injectResult: (tabId: string, userLabel: string, assistantContent: string) => void;

  // Session (chat history)
  sessionId: string | null;
  sessions: ChatSession[];
  sessionsLoaded: boolean;
  fetchSessions: () => Promise<void>;
  loadSession: (tabId: string, sessionId: string) => Promise<void>;
  startNewSession: (tabId: string) => void;
  deleteSession: (sessionId: string) => Promise<void>;
}

const defaultTab: TabState = { messages: [], isLoading: false };

export const useKnowbarStore = create<KnowbarStore>((set, get) => ({
  tabs: {},
  sessionId: null,
  sessions: [],
  sessionsLoaded: false,

  getTab: (tabId) => get().tabs[tabId] ?? defaultTab,

  addMessage: (tabId, message) =>
    set((state) => {
      const tab = state.tabs[tabId] ?? defaultTab;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, messages: [...tab.messages, message] },
        },
      };
    }),

  updateMessage: (tabId, messageId, updates) =>
    set((state) => {
      const tab = state.tabs[tabId] ?? defaultTab;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: {
            ...tab,
            messages: tab.messages.map((m) =>
              m.id === messageId ? { ...m, ...updates } : m
            ),
          },
        },
      };
    }),

  setLoading: (tabId, loading) =>
    set((state) => {
      const tab = state.tabs[tabId] ?? defaultTab;
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, isLoading: loading },
        },
      };
    }),

  clearMessages: (tabId) =>
    set((state) => ({
      tabs: {
        ...state.tabs,
        [tabId]: { messages: [], isLoading: false },
      },
    })),

  injectResult: (tabId, userLabel, assistantContent) => {
    const { addMessage } = get();
    const now = Date.now();
    addMessage(tabId, { id: now.toString(), role: 'user', content: userLabel });
    addMessage(tabId, { id: (now + 1).toString(), role: 'assistant', content: assistantContent });
  },

  // ──────── Sessions ────────

  fetchSessions: async () => {
    try {
      const res = await fetch('/api/chat');
      if (!res.ok) throw new Error();
      const data = await res.json();
      set({ sessions: data.sessions ?? [], sessionsLoaded: true });
    } catch {
      set({ sessionsLoaded: true });
    }
  },

  loadSession: async (tabId, sessionId) => {
    const { setLoading } = get();
    setLoading(tabId, true);

    try {
      const res = await fetch(`/api/chat?sessionId=${sessionId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();

      const messages: KnowbarMessage[] = (data.messages ?? []).map(
        (m: { id: string; role: string; content: string }) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })
      );

      set((state) => ({
        sessionId,
        tabs: {
          ...state.tabs,
          [tabId]: { messages, isLoading: false },
        },
      }));

      toast.success('이전 대화를 불러왔어요');
    } catch {
      setLoading(tabId, false);
      toast.error('대화를 불러오지 못했어요');
    }
  },

  startNewSession: (tabId) => {
    set((state) => ({
      sessionId: null,
      tabs: {
        ...state.tabs,
        [tabId]: { messages: [], isLoading: false },
      },
    }));
  },

  deleteSession: async (sessionId) => {
    try {
      const res = await fetch(`/api/chat?sessionId=${sessionId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== sessionId),
        sessionId: state.sessionId === sessionId ? null : state.sessionId,
      }));
      toast.success('대화가 삭제됐어요');
    } catch {
      toast.error('대화 삭제에 실패했어요');
    }
  },

  // ──────── Send Message ────────

  sendMessage: async (tabId, query) => {
    const { addMessage, updateMessage, setLoading } = get();

    const userMessage: KnowbarMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
    };

    addMessage(tabId, userMessage);
    setLoading(tabId, true);

    try {
      // Build history from current messages (last 10 for context)
      const currentMessages = get().getTab(tabId).messages;
      const history = currentMessages.slice(-11, -1).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Find most recent bannerId for banner edit context
      const lastBannerId = [...currentMessages].reverse().find((m) => m.bannerId)?.bannerId;
      // Find most recent figmaDesignId for design edit context
      const lastFigmaDesignId = [...currentMessages].reverse().find((m) => m.figmaDesign?.designId)?.figmaDesign?.designId;

      const res = await fetch('/api/knowbar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, history, lastBannerId, lastFigmaDesignId }),
      });

      if (res.ok) {
        const data: KnowbarAgentResponse = await res.json();
        const messageId = (Date.now() + 1).toString();

        // Use bannerHtml from API if available (blog/banner_edit), otherwise fetch
        let bannerHtml: string | undefined = data.bannerHtml;
        if (!bannerHtml && data.bannerId) {
          try {
            const bRes = await fetch(`/api/banner?id=${data.bannerId}`);
            if (bRes.ok) {
              const bData = await bRes.json();
              bannerHtml = bData.html;
            }
          } catch { /* skip */ }
        }

        addMessage(tabId, {
          id: messageId,
          role: 'assistant',
          content: data.response,
          agentName: data.agentName,
          agentIcon: data.agentIcon,
          skill: data.skill,
          taskCreated: data.taskCreated,
          taskTitle: data.taskTitle,
          memoryCreated: data.memoryCreated,
          bannerId: data.bannerId,
          bannerHtml,
          blogTitle: data.blogTitle,
          blogContent: data.blogContent,
          blogMetaDesc: data.blogMetaDesc,
          figmaDesign: data.figmaDesign,
        });

        // Toast for side-effects
        if (data.taskCreated) {
          toast.success(`태스크 추가됨: ${data.taskTitle}`);
        }
        if (data.memoryCreated) {
          toast.success('메모리에 저장됨');
        }

        // Save messages to DB (async, non-blocking)
        persistMessages(get, tabId, query, data);

        // Auto-trigger Figma push if banner was created
        if (data.bannerId && window.electronAPI?.figmaCapture) {
          try {
            const bannerUrl = `${window.location.origin}/banner/${data.bannerId}`;
            let fileKey = '';
            try {
              const fRes = await fetch('/api/figma/push');
              if (fRes.ok) {
                const fData = await fRes.json();
                if (fData.history?.[0]?.file_key) {
                  fileKey = fData.history[0].file_key;
                }
              }
            } catch { /* no fileKey */ }

            if (fileKey) {
              const result = await window.electronAPI.figmaCapture({
                bannerUrl,
                fileKey,
                outputMode: 'push',
              });

              if (result?.figmaUrl) {
                await fetch('/api/figma/push', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    bannerId: data.bannerId,
                    figmaUrl: result.figmaUrl,
                    status: 'done',
                  }),
                });
                updateMessage(tabId, messageId, { figmaUrl: result.figmaUrl });
              } else {
                updateMessage(tabId, messageId, { figmaUrl: `/banner/${data.bannerId}` });
              }
            } else {
              updateMessage(tabId, messageId, { figmaUrl: `/banner/${data.bannerId}` });
            }
          } catch {
            updateMessage(tabId, messageId, {
              figmaUrl: `/banner/${data.bannerId}`,
            });
          }
        }
      } else {
        let errDetail = '';
        try {
          const errBody = await res.json();
          errDetail = errBody.error || JSON.stringify(errBody);
        } catch { errDetail = res.statusText; }
        console.error(`[knowbar] API error: ${res.status} — ${errDetail}`);
        addMessage(tabId, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `문제가 발생했습니다 (${res.status}). 다시 시도해주세요.\n\n> ${errDetail}`,
        });
        toast.error(`응답 생성 실패 (${res.status})`);
      }
    } catch (err) {
      console.error('[knowbar] fetch error:', err);
      addMessage(tabId, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `오류가 발생했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
      });
      toast.error('서버 연결에 실패했어요');
    } finally {
      setLoading(tabId, false);
    }
  },
}));

// ──────── Persist to DB (non-blocking) ────────

async function persistMessages(
  get: () => KnowbarStore,
  tabId: string,
  userQuery: string,
  data: KnowbarAgentResponse,
) {
  try {
    const state = get();
    let sid = state.sessionId;

    // Save user message (creates session if needed)
    const userRes = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, role: 'user', content: userQuery }),
    });

    if (userRes.ok) {
      const userResData = await userRes.json();
      if (!sid && userResData.sessionId) {
        sid = userResData.sessionId;
        // Update sessionId in store
        useKnowbarStore.setState({ sessionId: sid });
      }
    }

    // Save assistant message
    if (sid) {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sid,
          role: 'assistant',
          content: data.response,
          metadata: {
            agentName: data.agentName,
            agentIcon: data.agentIcon,
            skill: data.skill,
          },
        }),
      });
    }
  } catch {
    // DB persistence failure — silent (not critical)
  }
}
