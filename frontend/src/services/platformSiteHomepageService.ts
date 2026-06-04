import { apiClient } from "./apiClient";
import {
  DEFAULT_PLATFORM_LANDING_VARIANT_ID,
  PLATFORM_LANDING_VARIANT_IDS,
  isPlatformLandingVariantId,
  type PlatformLandingVariantId,
} from "../pages/landing/platformLandingRegistry";

export interface PlatformSiteHomepageSettings {
  systemName: string;
  displayName: string;
  description: string;
  category: string;
  isEnabled: boolean;
  activeLandingId: PlatformLandingVariantId;
  availableLandingIds: PlatformLandingVariantId[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PlatformSiteHomepagePublicSettings {
  activeLandingId: PlatformLandingVariantId;
  updatedAt?: string | null;
}

export const DEFAULT_PLATFORM_SITE_HOMEPAGE_SETTINGS: PlatformSiteHomepageSettings =
  {
    systemName: "platform_public_landing",
    displayName: "Platform Public Landing",
    description:
      "Controls which public landing page variant appears on the root route.",
    category: "platform-site",
    isEnabled: true,
    activeLandingId: DEFAULT_PLATFORM_LANDING_VARIANT_ID,
    availableLandingIds: [...PLATFORM_LANDING_VARIANT_IDS],
    createdAt: null,
    updatedAt: null,
  };

export const DEFAULT_PLATFORM_SITE_HOMEPAGE_PUBLIC_SETTINGS: PlatformSiteHomepagePublicSettings =
  {
    activeLandingId: DEFAULT_PLATFORM_LANDING_VARIANT_ID,
    updatedAt: null,
  };

const unwrapData = <T>(
  payload: { data?: T } | T | null | undefined,
  fallback: T,
): T => {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    payload.data !== undefined
  ) {
    return payload.data as T;
  }

  return (payload ?? fallback) as T;
};

const normalizeText = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value.trim() : fallback;

const normalizeLandingId = (
  value: unknown,
): PlatformLandingVariantId =>
  isPlatformLandingVariantId(value)
    ? value
    : DEFAULT_PLATFORM_LANDING_VARIANT_ID;

const normalizeAdminSettings = (
  value?: Partial<PlatformSiteHomepageSettings> | null,
): PlatformSiteHomepageSettings => ({
  ...DEFAULT_PLATFORM_SITE_HOMEPAGE_SETTINGS,
  systemName:
    normalizeText(value?.systemName) ||
    DEFAULT_PLATFORM_SITE_HOMEPAGE_SETTINGS.systemName,
  displayName:
    normalizeText(value?.displayName) ||
    DEFAULT_PLATFORM_SITE_HOMEPAGE_SETTINGS.displayName,
  description:
    normalizeText(value?.description) ||
    DEFAULT_PLATFORM_SITE_HOMEPAGE_SETTINGS.description,
  category:
    normalizeText(value?.category) ||
    DEFAULT_PLATFORM_SITE_HOMEPAGE_SETTINGS.category,
  isEnabled: value?.isEnabled !== false,
  activeLandingId: normalizeLandingId(value?.activeLandingId),
  availableLandingIds:
    Array.isArray(value?.availableLandingIds) &&
    value.availableLandingIds.some(isPlatformLandingVariantId)
      ? value.availableLandingIds.filter(isPlatformLandingVariantId)
      : DEFAULT_PLATFORM_SITE_HOMEPAGE_SETTINGS.availableLandingIds,
  createdAt: value?.createdAt ?? null,
  updatedAt: value?.updatedAt ?? null,
});

const normalizePublicSettings = (
  value?: Partial<PlatformSiteHomepagePublicSettings> | null,
): PlatformSiteHomepagePublicSettings => ({
  ...DEFAULT_PLATFORM_SITE_HOMEPAGE_PUBLIC_SETTINGS,
  activeLandingId: normalizeLandingId(value?.activeLandingId),
  updatedAt: value?.updatedAt ?? null,
});

export const platformSiteHomepageService = {
  async getSettings(): Promise<PlatformSiteHomepageSettings> {
    const response = await apiClient.get(
      "/super-admin/platform/site-homepage",
    );

    return normalizeAdminSettings(
      unwrapData<PlatformSiteHomepageSettings>(
        response.data,
        DEFAULT_PLATFORM_SITE_HOMEPAGE_SETTINGS,
      ),
    );
  },

  async updateSettings(
    payload: Pick<PlatformSiteHomepageSettings, "activeLandingId">,
  ): Promise<PlatformSiteHomepageSettings> {
    const response = await apiClient.put(
      "/super-admin/platform/site-homepage",
      payload,
    );

    return normalizeAdminSettings(
      unwrapData<PlatformSiteHomepageSettings>(
        response.data,
        DEFAULT_PLATFORM_SITE_HOMEPAGE_SETTINGS,
      ),
    );
  },

  async getPublicSettings(): Promise<PlatformSiteHomepagePublicSettings> {
    const response = await apiClient.get("/public/platform/homepage", {
      _skipErrorToast: true,
    });

    return normalizePublicSettings(
      unwrapData<PlatformSiteHomepagePublicSettings>(
        response.data,
        DEFAULT_PLATFORM_SITE_HOMEPAGE_PUBLIC_SETTINGS,
      ),
    );
  },
};

export default platformSiteHomepageService;
