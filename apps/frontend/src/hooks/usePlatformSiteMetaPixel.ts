import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  DEFAULT_PLATFORM_SITE_META_PIXEL_PUBLIC_SETTINGS,
  platformSiteMetaPixelService,
  type PlatformSiteMetaPixelPublicSettings,
} from "../services/platformSiteMetaPixelService";
import { loadFacebookPixel, trackPageView } from "../utils/facebookPixel";
import {
  resetPlatformSiteMetaPixelSettings,
  setPlatformSiteMetaPixelSettings,
} from "../utils/platformSiteMetaPixel";

const scheduleIdleTask = (callback: () => void): (() => void) => {
  const idleWindow = window as Window & {
    requestIdleCallback?: (
      cb: () => void,
      options?: { timeout: number },
    ) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (typeof idleWindow.requestIdleCallback === "function") {
    const idleId = idleWindow.requestIdleCallback(callback, { timeout: 1800 });
    return () => idleWindow.cancelIdleCallback?.(idleId);
  }

  const timeoutId = window.setTimeout(callback, 800);
  return () => window.clearTimeout(timeoutId);
};

export const isPlatformSitePixelPath = (pathname: string): boolean =>
  pathname === "/" ||
  pathname.startsWith("/lp/") ||
  pathname.startsWith("/auth/") ||
  pathname.startsWith("/register/") ||
  pathname.startsWith("/affiliate-register") ||
  pathname.startsWith("/apply/") ||
  pathname.startsWith("/for-merchants");

export const usePlatformSiteMetaPixel = () => {
  const location = useLocation();
  const shouldTrackPath = useMemo(
    () => isPlatformSitePixelPath(location.pathname),
    [location.pathname],
  );
  const [settings, setSettings] = useState<PlatformSiteMetaPixelPublicSettings>(
    DEFAULT_PLATFORM_SITE_META_PIXEL_PUBLIC_SETTINGS,
  );
  const [isReady, setIsReady] = useState(false);
  const hasFetchedSettingsRef = useRef(false);
  const lastTrackedPathRef = useRef("");

  useEffect(() => {
    if (!shouldTrackPath) {
      lastTrackedPathRef.current = "";
      setIsReady(false);
      return;
    }

    if (hasFetchedSettingsRef.current) {
      return;
    }

    let isCancelled = false;
    let cleanupIdleTask: (() => void) | null = null;

    void (async () => {
      try {
        const nextSettings = await platformSiteMetaPixelService.getPublicSettings();
        if (isCancelled) {
          return;
        }

        hasFetchedSettingsRef.current = true;
        setSettings(nextSettings);
        setPlatformSiteMetaPixelSettings(nextSettings);

        if (nextSettings.enabled && nextSettings.pixelId) {
          cleanupIdleTask = scheduleIdleTask(() => {
            loadFacebookPixel(nextSettings.pixelId);
            setIsReady(true);
          });
        } else {
          setIsReady(false);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        console.error(
          "Failed to load platform site Meta pixel settings",
          error,
        );
        setSettings(DEFAULT_PLATFORM_SITE_META_PIXEL_PUBLIC_SETTINGS);
        resetPlatformSiteMetaPixelSettings();
        setIsReady(false);
      }
    })();

    return () => {
      isCancelled = true;
      cleanupIdleTask?.();
    };
  }, [shouldTrackPath]);

  useEffect(() => {
    if (
      !shouldTrackPath ||
      !settings.enabled ||
      !settings.trackPageView ||
      !settings.pixelId
    ) {
      return;
    }

    const currentPath = `${location.pathname}${location.search}`;
    if (lastTrackedPathRef.current === currentPath) {
      return;
    }

    let isCancelled = false;
    const timeoutIds: number[] = [];

    const trackPageViewWithRetry = (attempt = 1) => {
      if (isCancelled) {
        return;
      }

      const eventId = trackPageView();
      if (eventId) {
        lastTrackedPathRef.current = currentPath;
        return;
      }

      if (attempt < 4) {
        const timeoutId = window.setTimeout(
          () => trackPageViewWithRetry(attempt + 1),
          700,
        );
        timeoutIds.push(timeoutId);
      }
    };

    trackPageViewWithRetry();

    return () => {
      isCancelled = true;
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [
    location.pathname,
    location.search,
    settings.enabled,
    settings.pixelId,
    settings.trackPageView,
    shouldTrackPath,
  ]);

  return { isReady, settings };
};
