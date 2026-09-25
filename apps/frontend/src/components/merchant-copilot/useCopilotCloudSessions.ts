import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../services/apiClient';
import type { CopilotMessage, CopilotSession } from './types';

export function useCopilotCloudSessions(companyId?: string | null) {
  const [sessions, setSessions] = useState<CopilotSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [loadingSessions, setLoadingSessions] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoadingSessions(true);
      const res = await apiClient.get<{ success?: boolean; sessions?: any[] }>('/ai/chat/sessions');
      const list = res.data?.sessions || [];
      if (Array.isArray(list) && list.length > 0) {
        setSessions(
          list.map((s) => ({
            id: String(s.id),
            title: s.title || 'محادثة سابقة',
            updatedAt: s.updatedAt || new Date().toISOString(),
          }))
        );
        if (!activeSessionId) {
          setActiveSessionId(String(list[0].id));
        }
      }
    } catch (e) {
      console.warn('[CopilotCloudSessions] Failed fetching sessions:', e);
    } finally {
      setLoadingSessions(false);
    }
  }, [companyId, activeSessionId]);

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
        const item = {
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

  const loadSessionHistory = useCallback(async (sessionId: string): Promise<CopilotMessage[]> => {
    if (!sessionId) return [];
    try {
      const res = await apiClient.get<{ success?: boolean; messages?: any[] }>(
        `/ai/chat/history?sessionId=${encodeURIComponent(sessionId)}`
      );
      const rawMessages = res.data?.messages || [];
      if (Array.isArray(rawMessages)) {
        return rawMessages.map((m: any) => ({
          id: m.id || `msg-${Date.now()}-${Math.random()}`,
          sender: m.sender === 'user' || m.role === 'user' ? 'user' : 'assistant',
          text: m.content || m.text || '',
          timestamp: m.createdAt || m.timestamp || new Date().toISOString(),
          toolCalls: m.toolCalls || m.tool_calls || [],
        }));
      }
    } catch (e) {
      console.warn('[CopilotCloudSessions] Failed loading history:', e);
    }
    return [];
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
