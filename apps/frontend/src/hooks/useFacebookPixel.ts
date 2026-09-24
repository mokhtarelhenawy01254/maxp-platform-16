/**
 * React Hook to load Facebook Pixel in storefront pages.
 */

import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  loadFacebookPixel,
  resetFacebookPixel,
  trackPageView,
} from "../utils/facebookPixel";
import type { StorefrontSettings as PublicStorefrontSettings } from "../services/storefrontSettingsService";

const scheduleIdleTask = (callback: () => void): (() => void) => {
  const idleWindow = window as Window & {
    requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (typeof idleWindow.requestIdleCallback === "function") {
    const idleId = idleWindow.requestIdleCallback(callback, { timeout: 2500 });
    return () => idleWindow.cancelIdleCallback?.(idleId);
  }

  const timeoutId = window.setTimeout(callback, 1200);
  return () => window.clearTimeout(timeoutId);
};

export const useFacebookPixel = (
  storefrontSettings?: PublicStorefrontSettings | null,
) => {
  const location = useLocation();
  const [isLoaded, setIsLoaded] = useState(false);
  const [pixelId, setPixelId] = useState<string | null>(null);
  const [pageViewEnabled, setPageViewEnabled] = useState(false);
  const lastTrackedPathRef = useRef<string>("");

  useEffect(() => {
    setIsLoaded(false);
    setPixelId(null);
    setPageViewEnabled(false);

    if (!storefrontSettings) {
      resetFacebookPixel();
      return;
    }

    // 2026 Architectural Guard: Zero tracking in Preview and Staff test sessions
    const isPreview = Boolean(
      (storefrontSettings as any)?.isPreview ||
      (typeof window !== "undefined" &&
        (new URLSearchParams(window.location.search).get("preview") === "1" ||
         new URLSearchParams(window.location.search).get("productPreview") === "1" ||
         new URLSearchParams(window.location.search).get("previewTheme") !== null))
    );

    if (isPreview) {
      resetFacebookPixel();
      return;
    }

    if (
      storefrontSettings.gtmEnabled &&
      storefrontSettings.gtmSuppressPixels
    ) {
      resetFacebookPixel();
      return;
    }

    if (
      !storefrontSettings.facebookPixelEnabled ||
      !storefrontSettings.facebookPixelId
    ) {
      resetFacebookPixel();
      return;
    }

    const additionalPixelConfigs = (storefrontSettings.facebookPixelConfigs || [])
      .filter((p) => Boolean(p.pixelId) && p.pixelId !== storefrontSettings.facebookPixelId);

    const cleanupIdleTask = scheduleIdleTask(() => {
      loadFacebookPixel(
        storefrontSettings.facebookPixelId!,
        additionalPixelConfigs,
        { isPreview: false },
      );
      setPixelId(storefrontSettings.facebookPixelId!);
      setIsLoaded(true);
      setPageViewEnabled(storefrontSettings.pixelTrackPageView !== false);
    });

    return () => {
      cleanupIdleTask?.();
    };
  }, [
    storefrontSettings?.facebookPixelEnabled,
    storefrontSettings?.facebookPixelId,
    storefrontSettings?.facebookPixelConfigs,
    storefrontSettings?.gtmEnabled,
    storefrontSettings?.gtmSuppressPixels,
    storefrontSettings?.pixelTrackPageView,
  ]);

  useEffect(() => {
    if (!isLoaded || !pageViewEnabled) {
      return;
    }

    let isCancelled = false;
    const timeoutIds: number[] = [];

    const currentPath = `${location.pathname}${location.search}`;
    if (lastTrackedPathRef.current === currentPath) {
      return;
    }

    const trackPageViewWithRetry = (attempt = 1) => {
      try {
        if (isCancelled) return;

        const eventId = trackPageView();
        if (eventId) {
          lastTrackedPathRef.current = currentPath;
        } else if (attempt < 3) {
          const timeoutId = window.setTimeout(
            () => trackPageViewWithRetry(attempt + 1),
            1000,
          );
          timeoutIds.push(timeoutId);
        }
      } catch (error) {
        console.error("❌ [Facebook Pixel] Error tracking PageView:", error);
      }
    };

    trackPageViewWithRetry();

    return () => {
      isCancelled = true;
      timeoutIds.forEach((id) => window.clearTimeout(id));
    };
  }, [isLoaded, pageViewEnabled, location.pathname, location.search]);

  return { isLoaded, pixelId };
};
