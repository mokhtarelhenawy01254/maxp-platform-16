import {
  trackCompleteRegistration as trackMetaCompleteRegistration,
  trackCustom,
  trackLead as trackMetaLead,
} from "./facebookPixel";
import type { PlatformSiteMetaPixelPublicSettings } from "../services/platformSiteMetaPixelService";
import { DEFAULT_PLATFORM_SITE_META_PIXEL_PUBLIC_SETTINGS } from "../services/platformSiteMetaPixelService";

let currentPlatformSiteMetaPixelSettings: PlatformSiteMetaPixelPublicSettings = {
  ...DEFAULT_PLATFORM_SITE_META_PIXEL_PUBLIC_SETTINGS,
};

const buildContextPayload = (
  eventSource: string,
  data: Record<string, unknown> = {},
) => ({
  event_source: eventSource,
  page_path: typeof window !== "undefined" ? window.location.pathname : "",
  page_search: typeof window !== "undefined" ? window.location.search : "",
  ...data,
});

export const setPlatformSiteMetaPixelSettings = (
  settings?: Partial<PlatformSiteMetaPixelPublicSettings> | null,
) => {
  currentPlatformSiteMetaPixelSettings = {
    ...DEFAULT_PLATFORM_SITE_META_PIXEL_PUBLIC_SETTINGS,
    ...settings,
    enabled: Boolean(settings?.enabled),
    pixelId:
      typeof settings?.pixelId === "string" ? settings.pixelId.trim() : "",
  };
};

export const resetPlatformSiteMetaPixelSettings = () => {
  currentPlatformSiteMetaPixelSettings = {
    ...DEFAULT_PLATFORM_SITE_META_PIXEL_PUBLIC_SETTINGS,
  };
};

export const getPlatformSiteMetaPixelSettings =
  (): PlatformSiteMetaPixelPublicSettings =>
    currentPlatformSiteMetaPixelSettings;

export const trackPlatformSiteLead = (
  eventSource: string,
  data: Record<string, unknown> = {},
) => {
  if (
    !currentPlatformSiteMetaPixelSettings.enabled ||
    !currentPlatformSiteMetaPixelSettings.trackLead
  ) {
    return;
  }

  return trackMetaLead(buildContextPayload(eventSource, data));
};

export const trackPlatformSiteCompleteRegistration = (
  eventSource: string,
  data: Record<string, unknown> = {},
) => {
  if (
    !currentPlatformSiteMetaPixelSettings.enabled ||
    !currentPlatformSiteMetaPixelSettings.trackCompleteRegistration
  ) {
    return;
  }

  return trackMetaCompleteRegistration(buildContextPayload(eventSource, data));
};

export const trackPlatformSiteLogin = (
  data: Record<string, unknown> = {},
) => {
  if (
    !currentPlatformSiteMetaPixelSettings.enabled ||
    !currentPlatformSiteMetaPixelSettings.trackLogin
  ) {
    return;
  }

  return trackCustom(
    currentPlatformSiteMetaPixelSettings.loginEventName || "PlatformLogin",
    buildContextPayload("platform_login", data),
  );
};
