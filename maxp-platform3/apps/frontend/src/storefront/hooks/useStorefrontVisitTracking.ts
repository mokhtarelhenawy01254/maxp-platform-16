import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import storefrontAnalytics from "../services/storefrontAnalytics";
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
    void storefrontAnalytics.trackStoreVisit(location.pathname);
  }, [companyId, isPreviewMode, isProductPreview, location.pathname]);
};

export default useStorefrontVisitTracking;
