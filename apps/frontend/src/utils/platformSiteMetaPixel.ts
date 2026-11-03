import {
  trackCompleteRegistration as trackMetaCompleteRegistration,
  trackCustom,
  trackLead as trackMetaLead,
  trackStandardEvent,
} from "./facebookPixel";
import {
  DEFAULT_PLATFORM_SITE_META_PIXEL_PUBLIC_SETTINGS,
  PlatformSiteMetaPixelPublicSettings,
} from "../services/platformSiteMetaPixelTypes";

export type { PlatformSiteMetaPixelPublicSettings };
export { DEFAULT_PLATFORM_SITE_META_PIXEL_PUBLIC_SETTINGS };

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

  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent("platform-pixel-ready", {
          detail: { enabled: currentPlatformSiteMetaPixelSettings.enabled },
        }),
      );
    } catch {
      window.dispatchEvent(new Event("platform-pixel-ready"));
    }
  }
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
  eventSourceOrData: string | Record<string, unknown>,
  data: Record<string, unknown> = {},
) => {
  if (
    !currentPlatformSiteMetaPixelSettings.enabled ||
    !currentPlatformSiteMetaPixelSettings.trackLead
  ) {
    return;
  }

  const resolvedSource =
    typeof eventSourceOrData === "string"
      ? eventSourceOrData
      : typeof eventSourceOrData?.event_source === "string"
        ? (eventSourceOrData.event_source as string)
        : typeof eventSourceOrData?.cta_type === "string"
          ? (eventSourceOrData.cta_type as string)
          : "platform_lead";

  const resolvedData =
    typeof eventSourceOrData === "object" && eventSourceOrData !== null
      ? { ...eventSourceOrData, ...data }
      : data;

  return trackMetaLead(buildContextPayload(resolvedSource, resolvedData));
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


export const isPlatformSiteMetaPixelReady = (): boolean =>
  Boolean(currentPlatformSiteMetaPixelSettings.enabled);

export const trackPlatformSiteCustomEvent = (
  eventName: string,
  data: Record<string, unknown> = {},
  eventSource = "platform_custom",
) => {
  if (!currentPlatformSiteMetaPixelSettings.enabled) {
    return;
  }

  return trackCustom(eventName, buildContextPayload(eventSource, data));
};

export const trackPlatformSiteCustomEventWhenReady = (
  eventName: string,
  data: Record<string, unknown> = {},
  eventSource = "platform_custom",
  maxAttempts = 5,
  intervalMs = 500,
): (() => void) => {
  if (currentPlatformSiteMetaPixelSettings.enabled) {
    trackPlatformSiteCustomEvent(eventName, data, eventSource);
    return () => {};
  }

  if (typeof window === "undefined") {
    return () => {};
  }

  let attempts = 0;
  let timerId: number | null = null;
  let isDone = false;

  const tryTrack = (): boolean => {
    if (isDone) return true;
    if (currentPlatformSiteMetaPixelSettings.enabled) {
      isDone = true;
      trackPlatformSiteCustomEvent(eventName, data, eventSource);
      cleanup();
      return true;
    }
    return false;
  };

  const onReady = () => {
    tryTrack();
  };

  const cleanup = () => {
    isDone = true;
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
    window.removeEventListener("platform-pixel-ready", onReady);
  };

  window.addEventListener("platform-pixel-ready", onReady);

  timerId = window.setInterval(() => {
    attempts += 1;
    if (tryTrack() || attempts >= maxAttempts) {
      cleanup();
    }
  }, intervalMs);

  return cleanup;
};

export const trackPlatformSiteInitiateCheckout = (
  eventSource: string,
  data: Record<string, unknown> = {},
) => {
  if (
    !currentPlatformSiteMetaPixelSettings.enabled ||
    currentPlatformSiteMetaPixelSettings.trackInitiateCheckout === false
  ) {
    return;
  }

  const eventId =
    typeof data.eventID === "string"
      ? data.eventID
      : typeof data.eventId === "string"
        ? data.eventId
        : undefined;

  const { eventID, eventId: _unused, ...restData } = data;

  const payload = buildContextPayload(eventSource, {
    currency: "EGP",
    ...restData,
  });

  return trackStandardEvent(
    "InitiateCheckout",
    payload,
    eventId ? { eventID: eventId } : undefined,
  );
};

export const trackPlatformSitePurchase = (
  eventSource: string,
  data: Record<string, unknown> = {},
) => {
  if (
    !currentPlatformSiteMetaPixelSettings.enabled ||
    currentPlatformSiteMetaPixelSettings.trackPurchase === false
  ) {
    return;
  }

  const eventId =
    typeof data.eventID === "string"
      ? data.eventID
      : typeof data.eventId === "string"
        ? data.eventId
        : undefined;

  const { eventID, eventId: _unused, ...restData } = data;

  const payload = buildContextPayload(eventSource, {
    currency: "EGP",
    ...restData,
  });

  return trackStandardEvent(
    "Purchase",
    payload,
    eventId ? { eventID: eventId } : undefined,
  );
};
