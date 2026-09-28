import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../services/apiClient';
import type { CopilotMessage, CopilotSession } from './types';

export interface LoadHistoryResult {
  success: boolean;
  messages: CopilotMessage[];
  session?: CopilotSession;
  error?: string;
  errorCode?: 'SESSION_NOT_FOUND' | 'FORBIDDEN_SESSION' | 'LOAD_ERROR';
}

export function useCopilotCloudSessions(
  companyId?: string | null,
  targetInitialSessionId?: string | null,
) {
  const [sessions, setSessions] = useState<CopilotSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>(targetInitialSessionId || '');
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Synchronize when targetInitialSessionId changes externally (e.g. from deep link)
  useEffect(() => {
    if (targetInitialSessionId) {
      setActiveSessionId(targetInitialSessionId);
    }
  }, [targetInitialSessionId]);

  const fetchSessions = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoadingSessions(true);
      const res = await apiClient.get<{ success?: boolean; sessions?: any[] }>('/ai/chat/sessions');
      const list = res.data?.sessions || [];
      if (Array.isArray(list) && list.length > 0) {
        const mappedList: CopilotSession[] = list.map((s) => ({
          id: String(s.id),
          title: s.title || 'محادثة سابقة',
          updatedAt: s.updatedAt || new Date().toISOString(),
        }));

        setSessions((prev) => {
          // Preserve any deep-linked session currently in state if not yet in fetched list
          const combined = [...mappedList];
          for (const p of prev) {
            if (!combined.some((c) => c.id === p.id)) {
              combined.push(p);
            }
          }
          return combined;
        });

        // Only default to first session if no active session is selected and no target was specified
        if (!activeSessionId && !targetInitialSessionId) {
          setActiveSessionId(String(list[0].id));
        }
      }
    } catch (e) {
      console.warn('[CopilotCloudSessions] Failed fetching sessions:', e);
    } finally {
      setLoadingSessions(false);
    }
  }, [companyId, activeSessionId, targetInitialSessionId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const createNewCloudSession = useCallback(async (title?: string) => {
    try {
      const res = await apiClient.post<{ success?: boolean; session?: any }>('/ai/chat/sessions', {
        title: title || 'جلسة جديدة',
      });
      const newSess = res.data?.session;
      if (newSess?.id) {
        const item: CopilotSession = {
          id: String(newSess.id),
          title: newSess.title || 'جلسة جديدة',
          updatedAt: newSess.updatedAt || new Date().toISOString(),
        };
        setSessions((prev) => [item, ...prev]);
        setActiveSessionId(item.id);
        return item.id;
      }
    } catch (e) {
      console.warn('[CopilotCloudSessions] Failed creating session:', e);
    }
    const fallbackId = `exec_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setActiveSessionId(fallbackId);
    return fallbackId;
  }, []);

  const deleteCloudSession = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/ai/chat/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        setSessions((prev) => {
          const next = prev.filter((s) => s.id !== id);
          if (next.length > 0 && next[0]?.id) {
            setActiveSessionId(next[0].id);
          } else {
            setActiveSessionId('');
          }
          return next;
        });
      }
    } catch (e) {
      console.warn('[CopilotCloudSessions] Failed deleting session:', e);
    }
  }, [activeSessionId]);

  const loadSessionHistory = useCallback(async (sessionId: string): Promise<LoadHistoryResult> => {
    if (!sessionId) return { success: true, messages: [] };
    try {
      const res = await apiClient.get<{
        success?: boolean;
        session?: any;
        messages?: any[];
        error?: string;
        code?: string;
      }>(`/ai/chat/history?sessionId=${encodeURIComponent(sessionId)}`);

      if (res.data?.success) {
        const rawMessages = res.data?.messages || [];
        const formatted: CopilotMessage[] = Array.isArray(rawMessages)
          ? rawMessages.map((m: any) => ({
              id: m.id || `msg-${Date.now()}-${Math.random()}`,
              sender: m.sender === 'user' || m.role === 'user' ? 'user' : 'assistant',
              text: m.content || m.text || '',
              timestamp: m.createdAt || m.timestamp || new Date().toISOString(),
              toolCalls: m.toolCalls || m.tool_calls || [],
            }))
          : [];

        // If returned session exists and isn't in sessions state yet, ensure it is added
        if (res.data?.session?.id) {
          const loadedSession: CopilotSession = {
            id: String(res.data.session.id),
            title: res.data.session.title || 'محادثة سابقة',
            updatedAt: res.data.session.updatedAt || new Date().toISOString(),
          };
          setSessions((prev) => {
            if (!prev.some((s) => s.id === loadedSession.id)) {
              return [loadedSession, ...prev];
            }
            return prev;
          });
        }

        return {
          success: true,
          messages: formatted,
          session: res.data?.session,
        };
      }

      return {
        success: false,
        messages: [],
        error: res.data?.error || 'الجلسة غير متاحة',
        errorCode: (res.data?.code as any) || 'SESSION_NOT_FOUND',
      };
    } catch (e: any) {
      console.warn('[CopilotCloudSessions] Failed loading history:', e);
      const status = e.response?.status;
      const respData = e.response?.data;
      const errorCode: 'FORBIDDEN_SESSION' | 'SESSION_NOT_FOUND' | 'LOAD_ERROR' =
        respData?.code === 'FORBIDDEN_SESSION' || status === 403
          ? 'FORBIDDEN_SESSION'
          : respData?.code === 'SESSION_NOT_FOUND' || status === 404
          ? 'SESSION_NOT_FOUND'
          : 'LOAD_ERROR';

      const errorMessage =
        respData?.error ||
        (errorCode === 'FORBIDDEN_SESSION'
          ? 'لا تملك صلاحية الوصول إلى هذه الجلسة'
          : errorCode === 'SESSION_NOT_FOUND'
          ? 'الجلسة غير متاحة أو تم حذفها'
          : 'تعذر تحميل سجل الجلسة');

      return {
        success: false,
        messages: [],
        error: errorMessage,
        errorCode,
      };
    }
  }, []);

  const rewindActiveSession = useCallback(async (): Promise<{ success: boolean; messages?: CopilotMessage[] }> => {
    if (!activeSessionId) return { success: false };
    try {
      const res = await apiClient.post<{ success?: boolean; messages?: any[]; message?: string }>(
        `/ai/chat/sessions/${encodeURIComponent(activeSessionId)}/rewind`
      );
      if (res.data?.success) {
        const rawMessages = res.data?.messages || [];
        const formatted: CopilotMessage[] = rawMessages.map((m: any) => ({
          id: m.id || `msg-${Date.now()}-${Math.random()}`,
          sender: m.sender === 'user' || m.role === 'user' ? 'user' : 'assistant',
          text: m.content || m.text || '',
          timestamp: m.createdAt || m.timestamp || new Date().toISOString(),
          toolCalls: m.toolCalls || m.tool_calls || [],
        }));
        return { success: true, messages: formatted };
      }
    } catch (e) {
      console.warn('[CopilotCloudSessions] Failed rewinding session:', e);
    }
    return { success: false };
  }, [activeSessionId]);

  return {
    sessions,
    activeSessionId,
    setActiveSessionId,
    loadingSessions,
    createNewCloudSession,
    deleteCloudSession,
    loadSessionHistory,
    rewindActiveSession,
    fetchSessions,
  };
}
