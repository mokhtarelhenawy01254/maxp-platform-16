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

function loadStoredSessions(sessionsKey: string, prefix: string, welcomeText: string): StudioSession[] {
  try {
    const raw = localStorage.getItem(sessionsKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((s: any) => {
          let messages = Array.isArray(s?.messages) ? s.messages : [];
          // Keep welcome greeting updated if session has no user interaction yet
          if (
            messages.length === 1 &&
            messages[0].sender === "agent" &&
            typeof messages[0].id === "string" &&
            messages[0].id.startsWith("welcome")
          ) {
            messages = [
              {
                ...messages[0],
                text: welcomeText,
              },
            ];
          }
          return {
            ...s,
            title: typeof s?.title === "string" && s.title.trim() ? s.title : "جلسة جديدة",
            messages,
          };
        });
      }
    }
  } catch (e) {
    console.warn(`[useAgentStudioSessions:${prefix}] Failed reading local cache:`, e);
  }
  return [createDefaultSession(prefix, welcomeText)];
}

function loadStoredActiveId(activeIdKey: string, sessions: StudioSession[]): string {
  try {
    const savedActive = localStorage.getItem(activeIdKey);
    if (savedActive && sessions.some((s) => s.id === savedActive)) {
      return savedActive;
    }
  } catch (e) {
    console.warn(`[useAgentStudioSessions] Failed reading active id:`, e);
  }
  return sessions[0]?.id || "";
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
  const [sessions, setSessions] = useState<StudioSession[]>(() =>
    loadStoredSessions(SESSIONS_KEY, storagePrefix, defaultWelcomeText)
  );

  const [activeSessionId, setActiveSessionId] = useState<string>(() =>
    loadStoredActiveId(ACTIVE_ID_KEY, sessions)
  );

  const [isLoadingCloud, setIsLoadingCloud] = useState<boolean>(false);

  // Handle prefix or company changes synchronously during render
  const [prevPrefix, setPrevPrefix] = useState(storagePrefix);
  const [prevSuffix, setPrevSuffix] = useState(storageSuffix);

  if (prevPrefix !== storagePrefix || prevSuffix !== storageSuffix) {
    setPrevPrefix(storagePrefix);
    setPrevSuffix(storageSuffix);
    const loaded = loadStoredSessions(SESSIONS_KEY, storagePrefix, defaultWelcomeText);
    setSessions(loaded);
    setActiveSessionId(loadStoredActiveId(ACTIVE_ID_KEY, loaded));
  }

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
  }, [companyId, storagePrefix]);

  // Sync to localStorage
  useEffect(() => {
    if (prevPrefix !== storagePrefix || prevSuffix !== storageSuffix) return;

    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
      if (activeSessionId) {
        localStorage.setItem(ACTIVE_ID_KEY, activeSessionId);
      }
    } catch (e) {
      console.warn(`[useAgentStudioSessions:${storagePrefix}] Local storage write failed:`, e);
    }
  }, [sessions, activeSessionId, SESSIONS_KEY, ACTIVE_ID_KEY, prevPrefix, prevSuffix, storagePrefix, storageSuffix]);

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

  const appendUserMessage = useCallback(
    (text: string, images?: string[]): StudioMessage => {
      const userMsg: StudioMessage = {
        id: `user-${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        sender: "user",
        text,
        images: images && images.length > 0 ? images : undefined,
        timestamp: new Date().toISOString(),
      };
      addMessageToActiveSession(userMsg);
      return userMsg;
    },
    [addMessageToActiveSession]
  );

  const appendAgentResponse = useCallback(
    (text: string, options?: { toolCalls?: any[]; metadata?: any }): StudioMessage => {
      const agentMsg: StudioMessage = {
        id: `agent-${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        sender: "agent",
        text,
        toolCalls: options?.toolCalls,
        timestamp: new Date().toISOString(),
      };
      addMessageToActiveSession(agentMsg);
      return agentMsg;
    },
    [addMessageToActiveSession]
  );

  const rewindActiveSession = useCallback(async (): Promise<boolean> => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSessionId) return s;
        const msgs = [...s.messages];
        if (msgs.length > 1 && msgs[msgs.length - 1].sender === "agent") {
          msgs.pop();
        }
        if (msgs.length > 0 && msgs[msgs.length - 1].sender === "user") {
          msgs.pop();
        }
        if (msgs.length === 0) {
          msgs.push({
            id: `welcome-${Date.now()}`,
            sender: "agent",
            text: defaultWelcomeText,
            timestamp: new Date().toISOString(),
          });
        }
        const updated: StudioSession = {
          ...s,
          messages: msgs,
          updatedAt: new Date().toISOString(),
        };
        if (companyId && saveCloudSession) {
          saveCloudSession(updated).catch((err) =>
            console.warn(`[useAgentStudioSessions:${storagePrefix}] Save rewind failed:`, err)
          );
        }
        return updated;
      })
    );
    return true;
  }, [activeSessionId, companyId, saveCloudSession, storagePrefix, defaultWelcomeText]);

  return {
    sessions,
    activeSession,
    activeSessionId,
    totalCount: sessions.length,
    isLoadingCloud,
    switchSession,
    createNewSession,
    deleteSession,
    addMessageToActiveSession,
    appendUserMessage,
    appendAgentResponse,
    rewindActiveSession,
  };
}
