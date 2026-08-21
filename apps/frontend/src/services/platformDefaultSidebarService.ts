import { apiClient } from "./apiClient";

export interface DefaultSidebarSettings {
  layout: string;
  settings: Record<string, unknown>;
  updatedAt?: string | null;
}

export interface DefaultSidebarSettingsResponse {
  success: boolean;
  data: DefaultSidebarSettings;
}

const DEFAULT_SIDEBAR_SETTINGS: DefaultSidebarSettings = {
  layout: "three-tier",
  settings: {},
  updatedAt: null,
};

export const platformDefaultSidebarService = {
  async getSettings(): Promise<DefaultSidebarSettings> {
    try {
      const response = await apiClient.get<DefaultSidebarSettingsResponse>(
        "/super-admin/platform/default-sidebar",
      );
      if (response.data?.success && response.data?.data) {
        return {
          ...DEFAULT_SIDEBAR_SETTINGS,
          ...response.data.data,
        };
      }
    } catch (error) {
      console.warn("Failed to load default sidebar settings, using defaults:", error);
    }
    return DEFAULT_SIDEBAR_SETTINGS;
  },

  async updateSettings(
    payload: Partial<DefaultSidebarSettings>,
  ): Promise<DefaultSidebarSettings> {
    const response = await apiClient.put<DefaultSidebarSettingsResponse>(
      "/super-admin/platform/default-sidebar",
      payload,
    );

    if (response.data?.success && response.data?.data) {
      return {
        ...DEFAULT_SIDEBAR_SETTINGS,
        ...response.data.data,
      };
    }

    throw new Error("Failed to update default sidebar settings");
  },
};

export default platformDefaultSidebarService;