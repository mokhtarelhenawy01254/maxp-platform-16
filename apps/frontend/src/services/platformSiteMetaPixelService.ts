import { apiClient } from "./apiClient";

export interface PlatformSiteMetaPixelSettings {
  siteKey: string;
  isEnabled: boolean;
  pixelId: string;
  trackPageView: boolean;
  trackLead: boolean;
  trackCompleteRegistration: boolean;
  trackLogin: boolean;
  loginEventName: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PlatformSiteMetaPixelPublicSettings {
  enabled: boolean;
  pixelId: string;
  trackPageView: boolean;
  trackLead: boolean;
  trackCompleteRegistration: boolean;
  trackLogin: boolean;
  loginEventName: string;
  updatedAt?: string | null;
}

export const DEFAULT_PLATFORM_SITE_META_PIXEL_SETTINGS: PlatformSiteMetaPixelSettings =
  {
    siteKey: "maxp.online",
    isEnabled: false,
    pixelId: "",
    trackPageView: true,
    trackLead: true,
    trackCompleteRegistration: true,
    trackLogin: false,
    loginEventName: "PlatformLogin",
    createdAt: null,
    updatedAt: null,
  };

export const DEFAULT_PLATFORM_SITE_META_PIXEL_PUBLIC_SETTINGS: PlatformSiteMetaPixelPublicSettings =
  {
    enabled: false,
    pixelId: "",
    trackPageView: false,
    trackLead: false,
    trackCompleteRegistration: false,
    trackLogin: false,
    loginEventName: "PlatformLogin",
    updatedAt: null,
  };

const unwrapData = <T>(payload: any, fallback: T): T => {
  if (payload?.data !== undefined) {
    return payload.data as T;
  }

  return (payload ?? fallback) as T;
};

const normalizeText = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value.trim() : fallback;

const normalizeAdminSettings = (
  value?: Partial<PlatformSiteMetaPixelSettings> | null,
): PlatformSiteMetaPixelSettings => ({
  ...DEFAULT_PLATFORM_SITE_META_PIXEL_SETTINGS,
  siteKey:
    normalizeText(value?.siteKey) ||
    DEFAULT_PLATFORM_SITE_META_PIXEL_SETTINGS.siteKey,
  isEnabled: Boolean(value?.isEnabled),
  pixelId: normalizeText(value?.pixelId),
  trackPageView: value?.trackPageView !== false,
  trackLead: value?.trackLead !== false,
  trackCompleteRegistration: value?.trackCompleteRegistration !== false,
  trackLogin: Boolean(value?.trackLogin),
  loginEventName:
    normalizeText(value?.loginEventName) ||
    DEFAULT_PLATFORM_SITE_META_PIXEL_SETTINGS.loginEventName,
  createdAt: value?.createdAt ?? null,
  updatedAt: value?.updatedAt ?? null,
});

const normalizePublicSettings = (
  value?: Partial<PlatformSiteMetaPixelPublicSettings> | null,
): PlatformSiteMetaPixelPublicSettings => ({
  ...DEFAULT_PLATFORM_SITE_META_PIXEL_PUBLIC_SETTINGS,
  enabled: Boolean(value?.enabled),
  pixelId: normalizeText(value?.pixelId),
  trackPageView: Boolean(value?.trackPageView),
  trackLead: Boolean(value?.trackLead),
  trackCompleteRegistration: Boolean(value?.trackCompleteRegistration),
  trackLogin: Boolean(value?.trackLogin),
  loginEventName:
    normalizeText(value?.loginEventName) ||
    DEFAULT_PLATFORM_SITE_META_PIXEL_PUBLIC_SETTINGS.loginEventName,
  updatedAt: value?.updatedAt ?? null,
});

export const platformSiteMetaPixelService = {
  async getSettings(): Promise<PlatformSiteMetaPixelSettings> {
    const response = await apiClient.get("/super-admin/platform/site-meta-pixel");
    return normalizeAdminSettings(
      unwrapData<PlatformSiteMetaPixelSettings>(
        response.data,
        DEFAULT_PLATFORM_SITE_META_PIXEL_SETTINGS,
      ),
    );
  },

  async updateSettings(
    payload: Partial<PlatformSiteMetaPixelSettings>,
  ): Promise<PlatformSiteMetaPixelSettings> {
    const response = await apiClient.put(
      "/super-admin/platform/site-meta-pixel",
      payload,
    );

    return normalizeAdminSettings(
      unwrapData<PlatformSiteMetaPixelSettings>(
        response.data,
        DEFAULT_PLATFORM_SITE_META_PIXEL_SETTINGS,
      ),
    );
  },

  async getPublicSettings(): Promise<PlatformSiteMetaPixelPublicSettings> {
    const response = await apiClient.get("/public/platform/meta-pixel", {
      _skipErrorToast: true,
    });

    return normalizePublicSettings(
      unwrapData<PlatformSiteMetaPixelPublicSettings>(
        response.data,
        DEFAULT_PLATFORM_SITE_META_PIXEL_PUBLIC_SETTINGS,
      ),
    );
  },
};

export default platformSiteMetaPixelService;
