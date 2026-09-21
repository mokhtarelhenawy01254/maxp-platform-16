import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import storefrontAnalytics from "../services/storefrontAnalytics";
import { recordPageVisit } from "../utils/storefrontSessionTracker";
import type { StorefrontSettings } from "./useStorefrontSettings";

const persistStorefrontCompanyId = (companyId: string) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem("storefront_companyId", companyId);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
};

export const useStorefrontVisitTracking = (
  settings: StorefrontSettings | null,
) => {
  const location = useLocation();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const companyId = settings?.company?.id?.trim() || "";
  const isPreviewMode = Boolean(settings?.storefront?.isPreview);
  const isProductPreview =
    searchParams.get("productPreview") === "1" ||
    searchParams.get("preview") === "1";

  useEffect(() => {
    if (!companyId || isPreviewMode || isProductPreview) {
      return;
    }

    persistStorefrontCompanyId(companyId);

    if (typeof window === "undefined") {
      return;
    }

    // Record the current page path into the visitor journey
    recordPageVisit(location.pathname);

    const track = () => {
      void storefrontAnalytics.trackStoreVisit(location.pathname);
    };

    let idleId: number | null = null;
    let timerId: number | null = null;

    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(track, { timeout: 4000 });
    } else {
      timerId = window.setTimeout(track, 2000);
    }

    return () => {
      if (idleId !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [companyId, isPreviewMode, isProductPreview, location.pathname]);
};

export default useStorefrontVisitTracking;
