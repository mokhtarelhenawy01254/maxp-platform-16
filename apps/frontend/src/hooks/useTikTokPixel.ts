import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  loadTikTokPixel,
  trackTikTokPageView,
  configureTikTokPixel,
} from "../utils/tiktokPixel";
import { storefrontSettingsService } from "../services/storefrontSettingsService";

export const useTikTokPixel = (companyId: string | undefined) => {
  const location = useLocation();
  const [isLoaded, setIsLoaded] = useState(false);
  const [pixelId, setPixelId] = useState<string | null>(null);
  const [pageViewEnabled, setPageViewEnabled] = useState(false);
  const lastTrackedPathRef = useRef<string>("");

  useEffect(() => {
    if (!companyId) {
      return;
    }

    setIsLoaded(false);
    setPixelId(null);
    setPageViewEnabled(false);

    const loadPixelSettings = async () => {
      try {
        const response = await storefrontSettingsService.getPublicSettings(
          companyId,
          true,
        );

        if (response.success && response.data) {
          const settings = response.data;
          if (typeof window !== "undefined") {
            const win = window as any;
            win.__storefrontSettings = settings;
            try {
              const cacheKey = companyId
                ? `storefront_settings_cache_${companyId}`
                : null;
              if (cacheKey) {
                localStorage.setItem(cacheKey, JSON.stringify(settings));
              }
            } catch {
              // ignore storage failures
            }
          }
          if (settings.gtmEnabled && settings.gtmSuppressPixels) {
            return;
          }

          if (settings.tiktokPixelEnabled && settings.tiktokPixelId) {
            configureTikTokPixel({
              trackPageView: settings.tiktokTrackPageView !== false,
              trackViewContent: settings.tiktokTrackViewContent !== false,
              trackAddToCart: settings.tiktokTrackAddToCart !== false,
              trackInitiateCheckout:
                settings.tiktokTrackInitiateCheckout !== false,
              trackPurchase: settings.tiktokTrackPurchase !== false,
              trackSearch: settings.tiktokTrackSearch !== false,
              trackAddToWishlist: settings.tiktokTrackAddToWishlist === true,
            });

            loadTikTokPixel(settings.tiktokPixelId);
            setPixelId(settings.tiktokPixelId);
            setIsLoaded(true);
            setPageViewEnabled(settings.tiktokTrackPageView !== false);
          }
        }
      } catch (error) {
        console.error("[TikTok Pixel] Error loading settings:", error);
      }
    };

    loadPixelSettings();
  }, [companyId]);

  useEffect(() => {
    if (!isLoaded || !pageViewEnabled) {
      return;
    }

    const currentPath = `${location.pathname}${location.search}`;
    if (lastTrackedPathRef.current === currentPath) {
      return;
    }

    trackTikTokPageView();
    lastTrackedPathRef.current = currentPath;
  }, [isLoaded, pageViewEnabled, location.pathname, location.search]);

  return { isLoaded, pixelId };
};
