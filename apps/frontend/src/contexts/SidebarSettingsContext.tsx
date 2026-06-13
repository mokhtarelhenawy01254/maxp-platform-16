import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "../services/apiClient";
import type { SidebarManagementData, UserSidebarSettings } from "../types/layout";

const USER_SIDEBAR_KEY = "user-sidebar-settings";

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
}

const defaultUserSettings: UserSidebarSettings = {
  enabled: false,
  sections: {},
};

function loadUserSettings(): UserSidebarSettings {
  try {
    const raw = localStorage.getItem(USER_SIDEBAR_KEY);
    return raw ? JSON.parse(raw) : defaultUserSettings;
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
      // 403 is expected for SUPER_ADMIN users who have no company context
      const status =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { status?: number } }).response === "object"
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      if (status !== 403) {
        const msg = err instanceof Error ? err.message : "فشل تحميل إعدادات القائمة الجانبية"; // no-arabic-check
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
  }), [settings, isLoading, error, updateSettings, refreshSettings, userSettings, setUserEnabled, toggleUserItem, toggleUserSection, resetUserSettings]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  return (
    <SidebarSettingsContext.Provider value={contextValue}>
      {children}
    </SidebarSettingsContext.Provider>
  );
};