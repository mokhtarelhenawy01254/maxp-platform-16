import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import type { StorefrontSettings } from "../services/storefrontSettingsService";
import { loadGtm, pushGtmEvent } from "../utils/gtm";

export const useGtm = (settings?: StorefrontSettings | null) => {
  const location = useLocation();
  const lastTrackedPathRef = useRef<string>("");

  useEffect(() => {
    if (!settings?.gtmEnabled || !settings.gtmContainerId) return;

    loadGtm(settings.gtmContainerId);

    if (settings.gtmDataLayerEnabled !== false) {
      pushGtmEvent("storefront_ready", {
        company_id: settings.companyId,
        template_slug:
          typeof window !== "undefined"
            ? localStorage.getItem("storefront_template_slug") || undefined
            : undefined,
      });
    }
  }, [settings?.gtmEnabled, settings?.gtmContainerId, settings?.gtmDataLayerEnabled, settings?.companyId]);

  useEffect(() => {
    if (
      !settings?.gtmEnabled ||
      !settings.gtmContainerId ||
      settings.gtmDataLayerEnabled === false ||
      settings.gtmTrackPageView === false
    ) {
      return;
    }

    const currentPath = `${location.pathname}${location.search}`;
    if (lastTrackedPathRef.current === currentPath) {
      return;
    }
    lastTrackedPathRef.current = currentPath;

    pushGtmEvent("page_view", {
      page_location:
        typeof window !== "undefined" ? window.location.href : undefined,
      page_path: currentPath,
      page_title:
        typeof document !== "undefined" ? document.title : undefined,
    });
  }, [
    settings?.gtmEnabled,
    settings?.gtmContainerId,
    settings?.gtmDataLayerEnabled,
    settings?.gtmTrackPageView,
    location.pathname,
    location.search,
  ]);
};
