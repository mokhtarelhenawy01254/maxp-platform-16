import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { StudioSession, StudioMessage } from "./types";

export interface UseAgentStudioSessionsOptions {
  storagePrefix: string;
  companyId?: string | null;
  defaultWelcomeText: string;
  fetchCloudSessions?: () => Promise<{ success: boolean; data?: any[] }>;
  saveCloudSession?: (session: StudioSession) => Promise<any>;
  deleteCloudSession?: (id: string) => Promise<any>;
}

function generateSessionId(prefix: string): string {
  return `${prefix}_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

function createDefaultSession(prefix: string, welcomeText: string, title?: unknown): StudioSession {
  const safeTitle = typeof title === "string" && title.trim() ? title.trim() : "جلسة جديدة";
  const now = new Date().toISOString();
  return {
    id: generateSessionId(prefix),
    title: safeTitle,
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: `welcome-${Date.now()}`,
        sender: "agent",
        text: welcomeText,
        timestamp: now,
      },
    ],
  };
}

export function useAgentStudioSessions({
  storagePrefix,
  companyId,
  defaultWelcomeText,
  fetchCloudSessions,
  saveCloudSession,
  deleteCloudSession,
}: UseAgentStudioSessionsOptions) {
  const storageSuffix = companyId || "default";
  const SESSIONS_KEY = `${storagePrefix}_sessions_${storageSuffix}`;
  const ACTIVE_ID_KEY = `${storagePrefix}_active_id_${storageSuffix}`;
  const isMountedRef = useRef(true);

  // 1. Local Cache State for instantaneous paint
  const [sessions, setSessions] = useState<StudioSession[]>(() => {
    try {
      const raw = localStorage.getItem(SESSIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((s: any) => ({
            ...s,
            title: typeof s?.title === "string" && s.title.trim() ? s.title : "جلسة جديدة",
            messages: Array.isArray(s?.messages) ? s.messages : [],
          }));
        }
      }
    } catch (e) {
      console.warn(`[useAgentStudioSessions:${storagePrefix}] Failed reading local cache:`, e);
    }
    return [createDefaultSession(storagePrefix, defaultWelcomeText)];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    try {
      const savedActive = localStorage.getItem(ACTIVE_ID_KEY);
      if (savedActive && sessions.some((s) => s.id === savedActive)) {
        return savedActive;
      }
    } catch (e) {
      console.warn(`[useAgentStudioSessions:${storagePrefix}] Failed reading active id:`, e);
    }
    return sessions[0]?.id || "";
  });

  const [isLoadingCloud, setIsLoadingCloud] = useState<boolean>(false);

  // 2. Fetch from Cloud Database and Auto-Migrate
  useEffect(() => {
    isMountedRef.current = true;
    if (!companyId || !fetchCloudSessions) return;

    setIsLoadingCloud(true);
    (async () => {
      try {
        const res = await fetchCloudSessions();
        if (!isMountedRef.current) return;

        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          const cloudSessions: StudioSession[] = res.data.map((s: any) => ({
            id: s.id,
            title: typeof s?.title === "string" && s.title.trim() ? s.title : "جلسة جديدة",
            createdAt: s.createdAt || new Date().toISOString(),
            updatedAt: s.updatedAt || new Date().toISOString(),
            messages: Array.isArray(s?.messages) ? s.messages : [],
            context: s.context,
          }));

          // Background migrate any local-only sessions that have user messages
          if (saveCloudSession) {
            const cloudIds = new Set(cloudSessions.map((s) => s.id));
            const localOnly = sessions.filter(
              (ls) => !cloudIds.has(ls.id) && ls.messages.some((m) => m.sender === "user")
            );
            for (const ls of localOnly) {
              saveCloudSession(ls).catch((err) =>
                console.warn(`[useAgentStudioSessions:${storagePrefix}] Local migration error:`, ls.id, err)
              );
            }
          }

          setSessions(cloudSessions);
          if (!cloudSessions.some((s) => s.id === activeSessionId)) {
            setActiveSessionId(cloudSessions[0].id);
          }
        }
      } catch (err) {
        console.warn(`[useAgentStudioSessions:${storagePrefix}] Could not sync cloud sessions:`, err);
      } finally {
        if (isMountedRef.current) {
          setIsLoadingCloud(false);
        }
      }
    })();

    return () => {
      isMountedRef.current = false;
    };
  }, [companyId]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
      if (activeSessionId) {
        localStorage.setItem(ACTIVE_ID_KEY, activeSessionId);
      }
    } catch (e) {
      console.warn(`[useAgentStudioSessions:${storagePrefix}] Local storage write failed:`, e);
    }
  }, [sessions, activeSessionId, SESSIONS_KEY, ACTIVE_ID_KEY]);

  const activeSession = useMemo(() => {
    const found = sessions.find((s) => s.id === activeSessionId);
    return found || sessions[0] || createDefaultSession(storagePrefix, defaultWelcomeText);
  }, [sessions, activeSessionId, storagePrefix, defaultWelcomeText]);

  const switchSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  const createNewSession = useCallback(
    (title?: unknown) => {
      const newSession = createDefaultSession(storagePrefix, defaultWelcomeText, title);
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);

      if (companyId && saveCloudSession) {
        saveCloudSession(newSession).catch((err) =>
          console.warn(`[useAgentStudioSessions:${storagePrefix}] Save session failed:`, err)
        );
      }
      return newSession;
    },
    [storagePrefix, defaultWelcomeText, companyId, saveCloudSession]
  );

  const deleteSession = useCallback(
    (sessionId: string) => {
      setSessions((prev) => {
        const remaining = prev.filter((s) => s.id !== sessionId);
        if (remaining.length === 0) {
          const fresh = createDefaultSession(storagePrefix, defaultWelcomeText);
          setActiveSessionId(fresh.id);
          return [fresh];
        }
        if (activeSessionId === sessionId) {
          setActiveSessionId(remaining[0].id);
        }
        return remaining;
      });

      if (companyId && deleteCloudSession) {
        deleteCloudSession(sessionId).catch((err) =>
          console.warn(`[useAgentStudioSessions:${storagePrefix}] Delete session failed:`, err)
        );
      }
    },
    [activeSessionId, companyId, deleteCloudSession, storagePrefix, defaultWelcomeText]
  );

  const addMessageToActiveSession = useCallback(
    (msg: StudioMessage) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== activeSessionId) return s;

          const updatedMessages = [...s.messages, msg];
          let updatedTitle = s.title;

          // Auto-title from the first user prompt
          if (
            (!s.title || s.title === "جلسة جديدة") &&
            msg.sender === "user" &&
            msg.text.trim().length > 0
          ) {
            updatedTitle = msg.text.trim().slice(0, 32);
          }

          const updatedSession: StudioSession = {
            ...s,
            title: updatedTitle,
            updatedAt: new Date().toISOString(),
            messages: updatedMessages,
          };

          if (companyId && saveCloudSession) {
            saveCloudSession(updatedSession).catch((err) =>
              console.warn(`[useAgentStudioSessions:${storagePrefix}] Save message failed:`, err)
            );
          }

          return updatedSession;
        })
      );
    },
    [activeSessionId, companyId, saveCloudSession, storagePrefix]
  );

  return {
    sessions,
    activeSession,
    activeSessionId,
    isLoadingCloud,
    switchSession,
    createNewSession,
    deleteSession,
    addMessageToActiveSession,
  };
}
