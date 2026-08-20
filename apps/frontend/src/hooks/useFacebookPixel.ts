/**
 * React Hook to load Facebook Pixel in storefront pages.
 */

import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  loadFacebookPixel,
  trackPageView,
} from "../utils/facebookPixel";
import type { StorefrontSettings as PublicStorefrontSettings } from "../services/storefrontSettingsService";

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
      return;
    }

    if (
      storefrontSettings.gtmEnabled &&
      storefrontSettings.gtmSuppressPixels
    ) {
      return;
    }

    if (
      !storefrontSettings.facebookPixelEnabled ||
      !storefrontSettings.facebookPixelId
    ) {
      return;
    }

    // Load the Facebook Pixel immediately (Meta's recommended async-in-head
    // behavior) so conversion events never miss a fast or non-interacting
    // visitor. The script is small and async, so this has negligible impact
    // on Core Web Vitals.
    loadFacebookPixel(storefrontSettings.facebookPixelId!);
    setPixelId(storefrontSettings.facebookPixelId!);
    setIsLoaded(true);
    setPageViewEnabled(storefrontSettings.pixelTrackPageView !== false);
  }, [
    storefrontSettings?.facebookPixelEnabled,
    storefrontSettings?.facebookPixelId,
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
