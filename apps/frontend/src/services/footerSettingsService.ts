import { apiClient, ApiRequestConfig } from "./apiClient";

export interface FooterSettings {
  id?: string;
  companyId?: string;
  aboutStore?: string;
  showAboutStore: boolean;
  email?: string;
  showEmail: boolean;
  phone?: string;
  showPhone: boolean;
  address?: string;
  showAddress: boolean;
  showQuickLinks: boolean;
  copyrightText?: string;
  showCopyright: boolean;
  createdAt?: string;
  updatedAt?: string;
}

class FooterSettingsService {
  /**
   * Get footer settings
   */
  async getSettings(config?: ApiRequestConfig) {
    return apiClient.get<{ data: FooterSettings }>("/footer-settings", config);
  }

  /**
   * Update footer settings
   */
  async updateSettings(data: Partial<FooterSettings>) {
    return apiClient.put<{ data: FooterSettings }>("/footer-settings", data);
  }

  /**
   * Reset footer settings to defaults
   */
  async resetSettings() {
    return apiClient.post<{ data: FooterSettings }>("/footer-settings/reset");
  }

  /**
   * Get public footer settings (for storefront) with in-memory caching
   */
  async getPublicSettings(companyId: string) {
    const normalizedCompanyId = (companyId || "").trim();
    if (!normalizedCompanyId) {
      return { success: true, data: null };
    }

    if (publicFooterCache.has(normalizedCompanyId)) {
      return publicFooterCache.get(normalizedCompanyId)!;
    }

    const fetchPromise = (async () => {
      try {
        // Use storefrontFetch for public routes (no authentication required)
        // Note: storefrontFetch adds /api/v1/public automatically, so we only need the endpoint
        const { storefrontFetch } = await import("../utils/storefrontApi");
        return await storefrontFetch(`/footer-settings/${normalizedCompanyId}`);
      } catch (error: any) {
        // Silently handle errors - footer settings are optional
        // storefrontFetch throws Error with status property
        const status =
          error?.status ||
          (error?.message?.includes("401")
            ? 401
            : error?.message?.includes("404")
              ? 404
              : 0);
        if (status !== 401 && status !== 404) {
          // Only log non-401/404 errors
          console.error("Error fetching public footer settings:", error);
        }
        // Return null silently - footer settings are optional
        return { success: true, data: null };
      }
    })();

    publicFooterCache.set(normalizedCompanyId, fetchPromise);
    return fetchPromise;
  }
}

const publicFooterCache = new Map<string, Promise<{ success: boolean; data: any }>>();

export const footerSettingsService = new FooterSettingsService();
