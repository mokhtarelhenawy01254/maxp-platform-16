import { useState, useEffect, useCallback, useMemo } from "react";
import type { CopilotSession, Message } from "./types";

const INITIAL_WELCOME_TEXT = 
  "أهلاً بك يا فندم! أنا إيجنت الميديا باير الخاص بمتجرك 🎯.\n\n" +
  "أستطيع مساعدتك في فحص اقتصاديات أي منتج، تحديد سقف تكلفة الشراء (Target CPA)، " +
  "صياغة 3 نسخ إعلانية بزوايا سيكولوجية مختلفة (Pain-Point، Direct Offer، Social Proof)، " +
  "وتجهيز ونشر حملات إعلانية احترافية بنقرة واحدة.\n\n" +
  "عايز نعلن عن أي منتج النهاردة؟";

function generateSessionId(): string {
  return `mb_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

function createDefaultSession(title = "جلسة جديدة"): CopilotSession {
  const now = new Date().toISOString();
  return {
    id: generateSessionId(),
    title,
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

  // 1. Initial State from localStorage
  const [sessions, setSessions] = useState<CopilotSession[]>(() => {
    try {
      const raw = localStorage.getItem(SESSIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("[MediaBuyerCopilot] Failed to read sessions from localStorage", e);
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

  // Persist sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error("[MediaBuyerCopilot] Failed to save sessions", e);
    }
  }, [sessions, SESSIONS_KEY]);

  // Persist activeSessionId to localStorage
  useEffect(() => {
    try {
      if (activeSessionId) {
        localStorage.setItem(ACTIVE_ID_KEY, activeSessionId);
      }
    } catch (e) {
      console.error("[MediaBuyerCopilot] Failed to save active session id", e);
    }
  }, [activeSessionId, ACTIVE_ID_KEY]);

  // Active Session Object
  const activeSession = useMemo(() => {
    const found = sessions.find((s) => s.id === activeSessionId);
    return found || sessions[0] || createDefaultSession();
  }, [sessions, activeSessionId]);

  // Create a new session and switch to it
  const createNewSession = useCallback((customTitle?: string) => {
    const newSession = createDefaultSession(customTitle || "جلسة جديدة");
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    return newSession;
  }, []);

  // Switch to another session
  const switchSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  // Delete a session
  const deleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      if (filtered.length === 0) {
        const fresh = createDefaultSession();
        return [fresh];
      }
      return filtered;
    });
  }, []);

  // Clear all sessions and start fresh
  const clearAllSessions = useCallback(() => {
    const fresh = createDefaultSession();
    setSessions([fresh]);
    setActiveSessionId(fresh.id);
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

        return {
          ...session,
          title: newTitle,
          updatedAt: new Date().toISOString(),
          messages: updatedMessages,
        };
      })
    );
  }, [activeSessionId]);

  return {
    sessions,
    activeSession,
    activeSessionId,
    createNewSession,
    switchSession,
    deleteSession,
    clearAllSessions,
    addMessageToActiveSession,
  };
}
