import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import type { StorefrontSettings } from "../services/storefrontSettingsService";
import { loadGoogleAnalytics, trackGooglePageView } from "../utils/googleAnalytics";

/**
 * Loads Google Analytics 4 + Google Ads conversion tracking for the storefront.
 * When GTM is enabled with "suppress pixels", direct Google tags are skipped to
 * avoid double-tracking (Google tags should then be fired from GTM itself).
 */
export const useGoogleAnalytics = (settings?: StorefrontSettings | null) => {
  const location = useLocation();
  const lastTrackedPathRef = useRef<string>("");

  const gaEnabled =
    Boolean(settings?.googleAnalyticsEnabled) &&
    Boolean(settings?.googleAnalyticsMeasurementId?.trim());
  const adsEnabled =
    Boolean(settings?.googleAdsEnabled) && Boolean(settings?.googleAdsConversionId?.trim());
  const gtmActive =
    Boolean(settings?.gtmEnabled) && Boolean(settings?.gtmSuppressPixels);

  useEffect(() => {
    if (!gaEnabled && !adsEnabled) return;
    if (gtmActive) return;

    const idleWindow = window as Window & {
      requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    let cancelled = false;
    let idleId: number | undefined;
    let timeoutId: number | undefined;

    const runLoad = () => {
      if (cancelled) return;
      loadGoogleAnalytics(
        settings?.googleAnalyticsMeasurementId,
        settings?.googleAdsConversionId,
      );
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      idleId = idleWindow.requestIdleCallback(runLoad, { timeout: 3000 });
    } else {
      timeoutId = window.setTimeout(runLoad, 1500);
    }

    return () => {
      cancelled = true;
      if (idleId !== undefined && typeof idleWindow.cancelIdleCallback === "function") {
        idleWindow.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [
    gaEnabled,
    adsEnabled,
    gtmActive,
    settings?.googleAnalyticsMeasurementId,
    settings?.googleAdsConversionId,
  ]);

  useEffect(() => {
    if (!gaEnabled || !settings?.googleAnalyticsTrackPageView) return;
    if (gtmActive) return;

    const currentPath = `${location.pathname}${location.search}`;
    if (lastTrackedPathRef.current === currentPath) return;
    lastTrackedPathRef.current = currentPath;

    trackGooglePageView(
      currentPath,
      typeof document !== "undefined" ? document.title : undefined,
    );
  }, [
    gaEnabled,
    gtmActive,
    settings?.googleAnalyticsTrackPageView,
    location.pathname,
    location.search,
  ]);
};
