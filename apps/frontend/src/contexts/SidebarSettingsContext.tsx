import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "../services/apiClient";
import type { SidebarLayoutType, SidebarManagementData, UserSidebarSettings } from "../types/layout";

const USER_SIDEBAR_KEY = "user-sidebar-settings";

interface UserAppSettings {
  sidebarLayout: SidebarLayoutType | null;
  updatedAt?: string;
}

interface SidebarSettingsContextType {
  settings: SidebarManagementData | null;
  isLoading: boolean;
  error: string | null;
  updateSettings: (settings: Partial<SidebarManagementData>) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
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

export const SidebarSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SidebarManagementData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userSettings, setUserSettings] = useState<UserSidebarSettings>(defaultUserSettings);

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

  const refreshSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<{ success: boolean; data: { settings: Record<string, unknown> } }>(
        "/settings/sidebar",
        { _skipErrorToast: true } as Record<string, unknown>,
      );
      if (res.data?.success && res.data?.data?.settings) {
        setSettings(res.data.data.settings as unknown as SidebarManagementData);
      }
    } catch (err: unknown) {
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
      setIsLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (partial: Partial<SidebarManagementData>): Promise<boolean> => {
    try {
      const res = await apiClient.put<{ success: boolean; data: SidebarManagementData }>(
        "/settings/sidebar",
        { settings: partial },
      );
      if (res.data?.success) {
        setSettings(res.data.data);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

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
  }), [settings, isLoading, error, updateSettings, refreshSettings, userSettings, setUserEnabled, toggleUserItem, toggleUserSection, resetUserSettings, setUserLayout]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  return (
    <SidebarSettingsContext.Provider value={contextValue}>
      {children}
    </SidebarSettingsContext.Provider>
  );
};
