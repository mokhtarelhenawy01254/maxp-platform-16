import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { CopilotSession, Message } from "./types";
import {
  getMarketingCopilotSessions,
  saveMarketingCopilotSession,
  deleteMarketingCopilotSession,
} from "../../../services/facebookAdsService";

const INITIAL_WELCOME_TEXT = 
  "أهلاً بك يا فندم! أنا إيجنت الميديا باير الخاص بمتجرك 🎯.\n\n" +
  "أستطيع مساعدتك في فحص اقتصاديات أي منتج، تحديد سقف تكلفة الشراء (Target CPA)، " +
  "صياغة 3 نسخ إعلانية بزوايا سيكولوجية مختلفة (Pain-Point، Direct Offer، Social Proof)، " +
  "وتجهيز ونشر حملات إعلانية احترافية بنقرة واحدة.\n\n" +
  "عايز نعلن عن أي منتج النهاردة؟";

function generateSessionId(): string {
  return `mb_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

function createDefaultSession(title?: unknown): CopilotSession {
  const safeTitle = typeof title === "string" && title.trim() ? title.trim() : "جلسة جديدة";
  const now = new Date().toISOString();
  return {
    id: generateSessionId(),
    title: safeTitle,
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: `welcome-${Date.now()}`,
        sender: "agent",
        text: INITIAL_WELCOME_TEXT,
        timestamp: now,
      },
    ],
  };
}

export function useCopilotSessions(companyId?: string | null) {
  const storageSuffix = companyId || "default";
  const SESSIONS_KEY = `maxp_mb_copilot_sessions_${storageSuffix}`;
  const ACTIVE_ID_KEY = `maxp_mb_copilot_active_id_${storageSuffix}`;
  const hasSyncedWithCloud = useRef(false);

  // 1. Initial State from localStorage (instant rendering without layout shift)
  const [sessions, setSessions] = useState<CopilotSession[]>(() => {
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
      console.warn("[MediaBuyerCopilot] Failed to read sessions from local cache", e);
    }
    return [createDefaultSession()];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    try {
      const savedActive = localStorage.getItem(ACTIVE_ID_KEY);
      if (savedActive && sessions.some((s) => s.id === savedActive)) {
        return savedActive;
      }
    } catch (e) {
      console.warn("[MediaBuyerCopilot] Failed to read active session id", e);
    }
    return sessions[0]?.id || "";
  });

  const [isLoadingCloud, setIsLoadingCloud] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(() => sessions.length);

  // 2. Fetch from Cloud Database (PostgreSQL) and seamlessly auto-migrate local sessions
  useEffect(() => {
    if (!companyId) return;

    let isMounted = true;
    setIsLoadingCloud(true);

    async function syncCloudSessions() {
      try {
        const res = await getMarketingCopilotSessions(100);
        if (!isMounted) return;

        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          if (typeof res.totalCount === "number") {
            setTotalCount(res.totalCount);
          } else {
            setTotalCount(res.data.length);
          }

          const cloudSessions: CopilotSession[] = res.data.map((s: any) => ({
            id: s.id,
            title: typeof s?.title === "string" && s.title.trim() ? s.title : "جلسة جديدة",
            createdAt: s.createdAt || new Date().toISOString(),
            updatedAt: s.updatedAt || new Date().toISOString(),
            messages: Array.isArray(s?.messages) ? s.messages : [],
          }));

          // Migration check: If user had local-only sessions not yet on the cloud, sync them up
          const cloudIds = new Set(cloudSessions.map((s) => s.id));
          const localOnlySessions = sessions.filter(
            (localS) =>
              !cloudIds.has(localS.id) &&
              localS.messages.some((m) => m.sender === "user")
          );

          if (localOnlySessions.length > 0) {
            console.log(`[MediaBuyerCopilot] Migrating ${localOnlySessions.length} local session(s) to cloud database...`);
            for (const localS of localOnlySessions) {
              saveMarketingCopilotSession(localS).catch((err) =>
                console.warn("[MediaBuyerCopilot] Background migration failed for session:", localS.id, err)
              );
            }
          }

          setSessions(cloudSessions);
          if (!cloudSessions.some((s) => s.id === activeSessionId)) {
            setActiveSessionId(cloudSessions[0].id);
          }
        } else if (res.success && Array.isArray(res.data) && res.data.length === 0) {
          // If cloud is empty but local has real sessions, sync local to cloud
          const realLocalSessions = sessions.filter((s) =>
            s.messages.some((m) => m.sender === "user")
          );

          if (realLocalSessions.length > 0) {
            console.log(`[MediaBuyerCopilot] Initial cloud seed: uploading ${realLocalSessions.length} session(s)...`);
            for (const s of realLocalSessions) {
              saveMarketingCopilotSession(s).catch(console.warn);
            }
          } else {
            // Seed a fresh default session into cloud DB
            const fresh = createDefaultSession();
            setSessions([fresh]);
            setActiveSessionId(fresh.id);
            saveMarketingCopilotSession(fresh).catch(console.warn);
          }
        }
      } catch (err) {
        console.warn("[MediaBuyerCopilot] Could not sync with cloud database, using cache:", err);
      } finally {
        if (isMounted) {
          setIsLoadingCloud(false);
          hasSyncedWithCloud.current = true;
        }
      }
    }

    syncCloudSessions();

    return () => {
      isMounted = false;
    };
  }, [companyId]);

  // Keep activeSessionId valid if sessions change
  useEffect(() => {
    if (!sessions.some((s) => s.id === activeSessionId)) {
      if (sessions.length > 0) {
        setActiveSessionId(sessions[0].id);
      } else {
        const fresh = createDefaultSession();
        setSessions([fresh]);
        setActiveSessionId(fresh.id);
      }
    }
  }, [sessions, activeSessionId]);

  // Persist sessions to localStorage (Fast local cache)
  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error("[MediaBuyerCopilot] Failed to cache sessions locally", e);
    }
  }, [sessions, SESSIONS_KEY]);

  // Persist activeSessionId to localStorage
  useEffect(() => {
    try {
      if (activeSessionId) {
        localStorage.setItem(ACTIVE_ID_KEY, activeSessionId);
      }
    } catch (e) {
      console.error("[MediaBuyerCopilot] Failed to cache active session id", e);
    }
  }, [activeSessionId, ACTIVE_ID_KEY]);

  // Active Session Object
  const activeSession = useMemo(() => {
    const found = sessions.find((s) => s.id === activeSessionId);
    return found || sessions[0] || createDefaultSession();
  }, [sessions, activeSessionId]);

  // Create a new session and switch to it (synced to cloud DB)
  const createNewSession = useCallback((customTitle?: unknown) => {
    const validTitle = typeof customTitle === "string" && customTitle.trim() ? customTitle.trim() : "جلسة جديدة";
    const newSession = createDefaultSession(validTitle);
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setTotalCount((prev) => prev + 1);

    // Sync to Cloud DB in background
    saveMarketingCopilotSession(newSession).catch((err) =>
      console.warn("[MediaBuyerCopilot] Failed to persist new session to cloud:", err)
    );

    return newSession;
  }, []);

  // Switch to another session
  const switchSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  // Delete a session (synced to cloud DB)
  const deleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      if (filtered.length === 0) {
        const fresh = createDefaultSession();
        saveMarketingCopilotSession(fresh).catch(console.warn);
        return [fresh];
      }
      return filtered;
    });
    setTotalCount((prev) => Math.max(1, prev - 1));

    // Delete from Cloud DB in background
    deleteMarketingCopilotSession(sessionId).catch((err) =>
      console.warn("[MediaBuyerCopilot] Failed to delete session from cloud:", err)
    );
  }, []);

  // Clear all sessions and start fresh
  const clearAllSessions = useCallback(() => {
    const fresh = createDefaultSession();
    setSessions([fresh]);
    setActiveSessionId(fresh.id);
    setTotalCount(1);
    saveMarketingCopilotSession(fresh).catch(console.warn);
  }, []);

  // Append a message to the currently active session
  const addMessageToActiveSession = useCallback((msg: Message) => {
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== activeSessionId) return session;

        const updatedMessages = [...session.messages, msg];
        let newTitle = session.title;

        // If title is generic and this is a user message, auto-title from user query
        if (
          msg.sender === "user" &&
          (session.title === "جلسة جديدة" || session.title === "محادثة جديدة")
        ) {
          const cleanText = msg.text.replace(/\n+/g, " ").trim();
          newTitle = cleanText.length > 32 ? `${cleanText.slice(0, 32)}...` : cleanText;
        }

        const updatedSession = {
          ...session,
          title: newTitle,
          updatedAt: new Date().toISOString(),
          messages: updatedMessages,
        };

        return updatedSession;
      })
    );
  }, [activeSessionId]);

  return {
    sessions,
    totalCount: totalCount || sessions.length,
    activeSession,
    activeSessionId,
    isLoadingCloud,
    createNewSession,
    switchSession,
    deleteSession,
    clearAllSessions,
    addMessageToActiveSession,
  };
}

