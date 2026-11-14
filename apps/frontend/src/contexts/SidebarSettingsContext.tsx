import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "../services/apiClient";
import type {
  EducationSettingsData,
  SidebarLayoutType,
  SidebarManagementData,
  UserSidebarSettings,
} from "../types/layout";

const USER_SIDEBAR_KEY = "user-sidebar-settings";
const SESSION_CACHE_PREFIX = "sidebar-session-cache:v2:";
const SESSION_CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedSidebarPayload {
  settings: SidebarManagementData | null;
  educationSettings: EducationSettingsData | null;
  ts: number;
}

const memorySessionCache = new Map<string, CachedSidebarPayload>();
const sessionInFlight = new Map<string, Promise<CachedSidebarPayload | null>>();

function getCacheKey(companyId?: string | null): string {
  return companyId ? String(companyId) : "default";
}

function readCachedState(companyId?: string | null): CachedSidebarPayload | null {
  const key = getCacheKey(companyId);
  const mem = memorySessionCache.get(key);
  if (mem && Date.now() - mem.ts < SESSION_CACHE_TTL_MS) {
    return mem;
  }
  try {
    if (typeof sessionStorage !== "undefined") {
      const raw = sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${key}`);
      if (raw) {
        const parsed = JSON.parse(raw) as CachedSidebarPayload;
        if (parsed && typeof parsed.ts === "number" && Date.now() - parsed.ts < SESSION_CACHE_TTL_MS) {
          memorySessionCache.set(key, parsed);
          return parsed;
        }
      }
    }
  } catch {
    // sessionStorage unavailable
  }
  return null;
}

function writeCachedState(companyId: string | null | undefined, payload: CachedSidebarPayload) {
  const key = getCacheKey(companyId);
  memorySessionCache.set(key, payload);
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(`${SESSION_CACHE_PREFIX}${key}`, JSON.stringify(payload));
    }
  } catch {
    // sessionStorage unavailable
  }
}

export function invalidateSidebarSettingsCache(companyId?: string | null) {
  if (companyId) {
    const key = getCacheKey(companyId);
    memorySessionCache.delete(key);
    sessionInFlight.delete(key);
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem(`${SESSION_CACHE_PREFIX}${key}`);
      }
    } catch {
      // Ignore
    }
    return;
  }
  memorySessionCache.clear();
  sessionInFlight.clear();
  try {
    if (typeof sessionStorage !== "undefined") {
      const toRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i += 1) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(SESSION_CACHE_PREFIX)) {
          toRemove.push(k);
        }
      }
      toRemove.forEach((k) => sessionStorage.removeItem(k));
    }
  } catch {
    // Ignore
  }
}

interface UserAppSettings {
  sidebarLayout: SidebarLayoutType | null;
  updatedAt?: string;
}

interface SidebarSettingsContextType {
  settings: SidebarManagementData | null;
  educationSettings: EducationSettingsData | null;
  isLoading: boolean;
  error: string | null;
  updateSettings: (settings: Partial<SidebarManagementData>) => Promise<boolean>;
  refreshSettings: (options?: { force?: boolean }) => Promise<void>;
  userSettings: UserSidebarSettings;
  setUserEnabled: (enabled: boolean) => void;
  toggleUserItem: (sectionId: string, itemId: string) => void;
  toggleUserSection: (sectionId: string) => void;
  resetUserSettings: () => void;
  userLayout: SidebarLayoutType | null;
  setUserLayout: (layout: SidebarLayoutType | null) => Promise<void>;
}

const defaultUserSettings: UserSidebarSettings = {
  enabled: false,
  sections: {},
  sidebarLayout: null,
};

function loadUserSettings(): UserSidebarSettings {
  try {
    const raw = localStorage.getItem(USER_SIDEBAR_KEY);
    return raw ? { ...defaultUserSettings, ...JSON.parse(raw) } : defaultUserSettings;
  } catch {
    return defaultUserSettings;
  }
}

function saveUserSettings(settings: UserSidebarSettings) {
  try {
    localStorage.setItem(USER_SIDEBAR_KEY, JSON.stringify(settings));
  } catch {
    // localStorage full or unavailable
  }
}

const SidebarSettingsContext = createContext<SidebarSettingsContextType>({
  settings: null,
  educationSettings: null,
  isLoading: false,
  error: null,
  updateSettings: async () => false,
  refreshSettings: async () => {},
  userSettings: defaultUserSettings,
  setUserEnabled: () => {},
  toggleUserItem: () => {},
  toggleUserSection: () => {},
  resetUserSettings: () => {},
  userLayout: null,
  setUserLayout: async () => {},
});

export const useSidebarSettings = () => useContext(SidebarSettingsContext);

export const SidebarSettingsProvider: React.FC<{
  children: React.ReactNode;
  companyId?: string | null;
}> = ({ children, companyId }) => {
  const initialCached = readCachedState(companyId);
  const [settings, setSettings] = useState<SidebarManagementData | null>(initialCached?.settings ?? null);
  const [educationSettings, setEducationSettings] = useState<EducationSettingsData | null>(
    initialCached?.educationSettings ?? null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userSettings, setUserSettings] = useState<UserSidebarSettings>(defaultUserSettings);
  const requestIdRef = useRef(0);
  const settingsRef = useRef<SidebarManagementData | null>(settings);
  const educationSettingsRef = useRef<EducationSettingsData | null>(educationSettings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    educationSettingsRef.current = educationSettings;
  }, [educationSettings]);

  // Load user settings from localStorage on mount
  useEffect(() => {
    setUserSettings(loadUserSettings());
  }, []);

  // Sync user layout preference from server on mount.
  // The server is the source of truth: if it returns sidebarLayout (even null),
  // we use that value. Only fall back to localStorage when the server is
  // unreachable or the property is missing from the response.
  useEffect(() => {
    const syncUserLayout = async () => {
      try {
        const res = await apiClient.get<{ success: boolean; data: UserAppSettings }>(
          "/user/settings",
          { _skipErrorToast: true } as Record<string, unknown>,
        );
        if (res.data?.success && res.data?.data) {
          const serverData = res.data.data;
          // Use `in` check so that explicit `null` from the server (meaning
          // "no override — use company default") is respected instead of being
          // silently replaced by a stale localStorage value.
          const resolvedLayout =
            "sidebarLayout" in serverData
              ? serverData.sidebarLayout
              : undefined;
          setUserSettings((prev) => {
            const next = {
              ...prev,
              sidebarLayout: resolvedLayout !== undefined ? resolvedLayout : prev.sidebarLayout,
            };
            saveUserSettings(next);
            return next;
          });
        }
      } catch {
        // Server may be unavailable — keep localStorage cache
      }
    };
    syncUserLayout();
  }, []);

  const refreshSettings = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!force) {
        const cached = readCachedState(companyId);
        if (cached) {
          setSettings(cached.settings);
          setEducationSettings(cached.educationSettings);
          return;
        }
      }

      const currentReqId = ++requestIdRef.current;
      const cacheKey = getCacheKey(companyId);
      setIsLoading(true);
      setError(null);

      try {
        let inFlight = !force ? sessionInFlight.get(cacheKey) : undefined;
        if (!inFlight) {
          const fetchPromise = (async (): Promise<CachedSidebarPayload | null> => {
            const res = await apiClient.get<{
              success: boolean;
              data: { settings?: unknown; educationSettings?: EducationSettingsData | null };
              educationSettings?: EducationSettingsData | null;
            }>(
              "/settings/sidebar",
              { _skipErrorToast: true } as Record<string, unknown>,
            );
            if (res.data?.success && res.data?.data) {
              const rawSettings =
                res.data.data.settings !== undefined ? res.data.data.settings : res.data.data;
              const resolvedEdu =
                res.data.data.educationSettings ?? res.data.educationSettings ?? null;
              const payload: CachedSidebarPayload = {
                settings: rawSettings as unknown as SidebarManagementData,
                educationSettings: resolvedEdu,
                ts: Date.now(),
              };
              writeCachedState(companyId, payload);
              return payload;
            }
            return null;
          })();
          inFlight = fetchPromise.finally(() => {
            if (sessionInFlight.get(cacheKey) === fetchPromise) {
              sessionInFlight.delete(cacheKey);
            }
          });
          sessionInFlight.set(cacheKey, inFlight);
        }

        const result = await inFlight;
        if (requestIdRef.current !== currentReqId) return;
        if (result) {
          setSettings(result.settings);
          setEducationSettings(result.educationSettings);
        }
      } catch (err: unknown) {
        if (requestIdRef.current !== currentReqId) return;
        const status =
          typeof err === "object" &&
          err !== null &&
          "response" in err &&
          typeof (err as { response?: { status?: number } }).response === "object"
            ? (err as { response?: { status?: number } }).response?.status
            : undefined;
        if (status !== 403 && status !== 401) {
          const msg = err instanceof Error ? err.message : "فشل تحميل إعدادات القائمة الجانبية";
          setError(msg);
        }
      } finally {
        if (requestIdRef.current === currentReqId) {
          setIsLoading(false);
        }
      }
    },
    [companyId],
  );

  const updateSettings = useCallback(
    async (partial: any): Promise<boolean> => {
      try {
        const payload = Array.isArray(partial) ? partial : (partial?.items || partial?.settings || partial);
        const res = await apiClient.put<{ success: boolean; data: SidebarManagementData }>(
          "/settings/sidebar",
          payload,
        );
        if (res.data?.success) {
          setSettings(res.data.data);
          writeCachedState(companyId, {
            settings: res.data.data,
            educationSettings: educationSettingsRef.current,
            ts: Date.now(),
          });
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [companyId],
  );

  const setUserEnabled = useCallback((enabled: boolean) => {
    setUserSettings((prev) => {
      const next = { ...prev, enabled, updatedAt: new Date().toISOString() };
      saveUserSettings(next);
      return next;
    });
  }, []);

  const toggleUserItem = useCallback((sectionId: string, itemId: string) => {
    setUserSettings((prev) => {
      const section = prev.sections[sectionId];
      const currentVisible = section?.items?.[itemId]?.visible ?? true;
      const next = {
        ...prev,
        sections: {
          ...prev.sections,
          [sectionId]: {
            visible: section?.visible ?? true,
            order: section?.order ?? 0,
            requiredRoles: section?.requiredRoles ?? [],
            requiredApps: section?.requiredApps ?? [],
            items: {
              ...(section?.items ?? {}),
              [itemId]: {
                visible: !currentVisible,
                enabled: true,
                order: 0,
                requiredRoles: [],
                requiredApps: [],
              },
            },
          },
        },
        updatedAt: new Date().toISOString(),
      };
      saveUserSettings(next);
      return next;
    });
  }, []);

  const toggleUserSection = useCallback((sectionId: string) => {
    setUserSettings((prev) => {
      const currentVisible = prev.sections[sectionId]?.visible ?? true;
      const section = prev.sections[sectionId];
      const next = {
        ...prev,
        sections: {
          ...prev.sections,
          [sectionId]: {
            visible: !currentVisible,
            order: section?.order ?? 0,
            requiredRoles: section?.requiredRoles ?? [],
            requiredApps: section?.requiredApps ?? [],
            items: section?.items ?? {},
          },
        },
        updatedAt: new Date().toISOString(),
      };
      saveUserSettings(next);
      return next;
    });
  }, []);

  const resetUserSettings = useCallback(() => {
    setUserSettings(defaultUserSettings);
    saveUserSettings(defaultUserSettings);
    // Also reset on server
    apiClient.put("/user/settings", { settings: { sidebarLayout: null } }).catch(() => {});
  }, []);

  const setUserLayout = useCallback(async (layout: SidebarLayoutType | null) => {
    setUserSettings((prev) => {
      const next = { ...prev, sidebarLayout: layout, updatedAt: new Date().toISOString() };
      saveUserSettings(next);
      return next;
    });
    // Sync to server
    try {
      await apiClient.put("/user/settings", { settings: { sidebarLayout: layout } });
    } catch {
      // Silent fail — localStorage has the latest value
    }
  }, []);

  const contextValue = useMemo(() => ({
    settings,
    educationSettings,
    isLoading,
    error,
    updateSettings,
    refreshSettings,
    userSettings,
    setUserEnabled,
    toggleUserItem,
    toggleUserSection,
    resetUserSettings,
    userLayout: userSettings.sidebarLayout ?? null,
    setUserLayout,
  }), [
    settings,
    educationSettings,
    isLoading,
    error,
    updateSettings,
    refreshSettings,
    userSettings,
    setUserEnabled,
    toggleUserItem,
    toggleUserSection,
    resetUserSettings,
    setUserLayout,
  ]);

  useEffect(() => {
    const cached = readCachedState(companyId);
    if (cached) {
      setSettings(cached.settings);
      setEducationSettings(cached.educationSettings);
      return;
    }
    setSettings(null);
    setEducationSettings(null);
    refreshSettings();
  }, [companyId, refreshSettings]);

  useEffect(() => {
    const handleEduUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<EducationSettingsData | undefined>;
      invalidateSidebarSettingsCache(companyId);
      if (customEvent?.detail && typeof customEvent.detail === "object") {
        setEducationSettings(customEvent.detail);
        writeCachedState(companyId, {
          settings: settingsRef.current,
          educationSettings: customEvent.detail,
          ts: Date.now(),
        });
      }
      refreshSettings({ force: true });
    };

    const handleCompanySwitched = () => {
      invalidateSidebarSettingsCache();
      refreshSettings({ force: true });
    };

    window.addEventListener("education-settings-updated", handleEduUpdated);
    window.addEventListener("company:switched", handleCompanySwitched);
    return () => {
      window.removeEventListener("education-settings-updated", handleEduUpdated);
      window.removeEventListener("company:switched", handleCompanySwitched);
    };
  }, [companyId, refreshSettings]);

  return (
    <SidebarSettingsContext.Provider value={contextValue}>
      {children}
    </SidebarSettingsContext.Provider>
  );
};
