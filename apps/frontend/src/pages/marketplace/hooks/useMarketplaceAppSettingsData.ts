import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiClient } from "../../../services/apiClient";
import courierService from "../../../services/courierService";
import { tToast } from "../../../utils/i18n-toast";
import {
  applyMarketplaceAppPreset,
  getDefaultMarketplaceAppSettings,
  normalizeMarketplaceAppSettings,
} from "../../../config/marketplaceAppSettings";
import {
  type JsonRecord,
  type ApiDataEnvelope,
  type InstalledCompanyApp,
  type AppUsageResponseData,
  type ReviewModerationInsights,
  type ReviewModerationItem,
  type ReviewListResponseData,
  type UpsellCenterSectionId,
  APP_TITLES,
  setDeepValue,
} from "../types/appSettingsTypes";
import { useConversionJourneyMetrics } from "./useConversionJourneyMetrics";

export function useMarketplaceAppSettingsData() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [companyApp, setCompanyApp] = useState<InstalledCompanyApp | null>(null);
  const [draftSettings, setDraftSettings] = useState<JsonRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usageInsights, setUsageInsights] = useState<AppUsageResponseData | null>(null);
  const [reviewInsights, setReviewInsights] = useState<ReviewModerationInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [billingSummary, setBillingSummary] = useState<{
    costs?: { subscriptions: number; usage: number; total: number };
    wallet?: { balance: number; currency: string };
    heldOrders?: { count: number; amount: number };
  } | null>(null);
  const [billingSummaryLoading, setBillingSummaryLoading] = useState(false);
  const [treasuryAccounts, setTreasuryAccounts] = useState<Array<{ id: string; name: string; type: string; balance: number }>>([]);

  useEffect(() => {
    if (slug === "internal-courier-fleet") {
      courierService
        .getTreasuryAccounts()
        .then((res) => {
          if (res?.success && Array.isArray(res.data)) {
            setTreasuryAccounts(res.data);
          }
        })
        .catch(() => {});
    }
  }, [slug]);

  const normalizedSettings = useMemo(
    () => normalizeMarketplaceAppSettings(slug, draftSettings),
    [slug, draftSettings],
  );
  const generalSettings =
    (normalizedSettings["general"] as JsonRecord | undefined) || {};
  const modulesSettings =
    (normalizedSettings["modules"] as JsonRecord | undefined) || {};
  const uiSettings = (normalizedSettings["ui"] as JsonRecord | undefined) || {};
  const thresholdsSettings =
    (normalizedSettings["thresholds"] as JsonRecord | undefined) || {};
  const countdownSettings =
    (normalizedSettings["countdown"] as JsonRecord | undefined) || {};
  const copySettings = (normalizedSettings["copy"] as JsonRecord | undefined) || {};
  const focusMode = String(searchParams.get("focus") || "").trim().toLowerCase();
  const isUpsellCenter = slug === "conversion-suite" && focusMode === "upsell";
  const upsellSectionParam = String(searchParams.get("section") || "")
    .trim()
    .toLowerCase();
  const activeUpsellSection: UpsellCenterSectionId = (
    [
      "overview",
      "manual-links",
      "product-page",
      "cart-drawer",
      "post-purchase",
      "general",
    ] as string[]
  ).includes(upsellSectionParam)
    ? (upsellSectionParam as UpsellCenterSectionId)
    : "manual-links";

  const supported = Boolean(APP_TITLES[slug]);
  const pageTitle = isUpsellCenter
    ? "Upsell Center"
    : APP_TITLES[slug] || companyApp?.app?.name || "";
  const pageDescription = isUpsellCenter
    ? "مركز موحّد لإدارة الـ cross-sell و bought together و post-purchase upsell من نفس إعدادات الـ conversion suite."
    : companyApp?.app?.description ||
      "هذه الشاشة تتحكم في الإعدادات التي ستنعكس على الـ marketplace والـ storefront والقوالب.";
  const backDestination = isUpsellCenter
    ? "/settings/storefront/editor"
    : "/my-apps";
  const backLabel = isUpsellCenter
    ? "العودة إلى المحرر البصري"
    : "العودة إلى أدواتي";

  const topFeature = useMemo(() => {
    const byFeatureEntries = usageInsights?.byFeature || [];
    const features = [...byFeatureEntries];

    features.sort(
      (left, right) =>
        Number(right?._count?.id || 0) - Number(left?._count?.id || 0),
    );

    return features[0] || null;
  }, [usageInsights]);

  const {
    usageFeatureMap,
    conversionJourney,
    upsellCenterMetrics,
    activeUpsellPlacements,
    cartPlacementEnabled,
    upsellFallbackSummary,
  } = useConversionJourneyMetrics({
    usageInsights,
    modulesSettings,
    thresholdsSettings,
  });

  const setUpsellSection = (section: UpsellCenterSectionId) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("focus", "upsell");
    nextSearchParams.set("section", section);
    setSearchParams(nextSearchParams, { replace: true });

    if (typeof document !== "undefined") {
      const anchorMap: Record<UpsellCenterSectionId, string> = {
        overview: "upsell-overview",
        "manual-links": "upsell-manual-links",
        "product-page": "upsell-product-page",
        "cart-drawer": "upsell-cart-drawer",
        "post-purchase": "upsell-post-purchase",
        general: "upsell-general-settings",
      };

      window.requestAnimationFrame(() => {
        document
          .getElementById(anchorMap[section])
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const fetchInstalledApp = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiDataEnvelope<InstalledCompanyApp[]>>(
        "/my-apps",
      );
      const installedApps = Array.isArray(response?.data?.data) ? response.data.data : [];
      const matchedApp = installedApps.find(
        (entry: InstalledCompanyApp) => entry?.app?.slug === slug,
      );

      if (!matchedApp) {
        setCompanyApp(null);
        setDraftSettings(getDefaultMarketplaceAppSettings(slug));
        return;
      }

      setCompanyApp(matchedApp);
      setDraftSettings(
        normalizeMarketplaceAppSettings(slug, matchedApp.settings || {}),
      );
    } catch (error: unknown) {
      console.error("Error loading app settings:", error);
      tToast.error("AppSettings.unable_load_9624");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const fetchInsights = useCallback(async (installedApp: InstalledCompanyApp) => {
    try {
      setInsightsLoading(true);
      setBillingSummaryLoading(true);

      const requests: Promise<unknown>[] = [
        apiClient.get(`/my-apps/${installedApp.id}/usage`),
      ];

      const isPayPerUse = installedApp?.app?.pricingModel === "PAY_PER_USE";
      if (isPayPerUse) {
        requests.push(apiClient.get("/wallet/billing/summary"));
      }

      if (slug === "ugc-reviews-pro") {
        requests.push(
          apiClient.get("/reviews", { params: { page: 1, limit: 5 } }),
          apiClient.get("/reviews", { params: { page: 1, limit: 5, isApproved: false } }),
        );
      }

      const [usageResponse, billingResponse, allReviewsResponse, pendingReviewsResponse] =
        (await Promise.all(requests)) as [
          { data?: ApiDataEnvelope<AppUsageResponseData> },
          { data?: ApiDataEnvelope<{ costs?: object; wallet?: object; heldOrders?: object }> }?,
          { data?: ApiDataEnvelope<ReviewListResponseData> }?,
          { data?: ApiDataEnvelope<ReviewListResponseData> }?,
        ];

      setUsageInsights(
        (usageResponse?.data?.data as AppUsageResponseData | undefined) || {
          logs: [],
          byFeature: [],
          summary: {
            totalActions: 0,
            totalCost: 0,
            totalQuantity: 0,
          },
        },
      );

      if (isPayPerUse && billingResponse?.data?.data) {
        const billingData = billingResponse.data.data as {
          costs?: { subscriptions: number; usage: number; total: number };
          wallet?: { balance: number; currency: string };
          heldOrders?: { count: number; amount: number };
        };
        setBillingSummary({
          costs: billingData.costs,
          wallet: billingData.wallet,
          heldOrders: billingData.heldOrders,
        });
      } else {
        setBillingSummary(null);
      }

      if (slug === "ugc-reviews-pro") {
        const total =
          Number(allReviewsResponse?.data?.data?.pagination?.total) || 0;
        const pending =
          Number(pendingReviewsResponse?.data?.data?.pagination?.total) || 0;
        const latestPending = Array.isArray(pendingReviewsResponse?.data?.data?.reviews)
          ? (pendingReviewsResponse?.data?.data?.reviews as ReviewModerationItem[])
          : [];

        setReviewInsights({
          total,
          pending,
          approved: Math.max(total - pending, 0),
          latestPending,
        });
      } else {
        setReviewInsights(null);
      }
    } catch (error) {
      console.error("Error loading app insights:", error);
      setUsageInsights(null);
      setBillingSummary(null);
      if (slug === "ugc-reviews-pro") {
        setReviewInsights(null);
      }
    } finally {
      setInsightsLoading(false);
      setBillingSummaryLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    void fetchInstalledApp();
  }, [fetchInstalledApp, slug]);

  useEffect(() => {
    if (!companyApp?.id) {
      setUsageInsights(null);
      setReviewInsights(null);
      return;
    }

    void fetchInsights(companyApp);
  }, [companyApp, fetchInsights]);

  const updateAtPath = (path: string, value: unknown) => {
    setDraftSettings((current) =>
      setDeepValue(current || getDefaultMarketplaceAppSettings(slug), path.split("."), value),
    );
  };

  const applyPreset = (preset: string) => {
    setDraftSettings((current) => applyMarketplaceAppPreset(slug, current, preset));
  };

  const handleSave = async () => {
    if (!companyApp) {
      tToast.error("AppSettings.msg_565c");
      return;
    }

    try {
      setSaving(true);
      await apiClient.put(`/my-apps/${companyApp.id}/settings`, {
        settings: normalizedSettings,
      });
      tToast.success("AppSettings.success_save_0151");
      setCompanyApp((current) =>
        current ? { ...current, settings: normalizedSettings } : current,
      );
    } catch (error) {
      console.error("Error saving app settings:", error);
      tToast.error("AppSettings.error_error_8032");
    } finally {
      setSaving(false);
    }
  };

  return {
    slug,
    navigate,
    companyApp,
    loading,
    saving,
    normalizedSettings,
    generalSettings,
    modulesSettings,
    uiSettings,
    thresholdsSettings,
    countdownSettings,
    copySettings,
    isUpsellCenter,
    activeUpsellSection,
    supported,
    pageTitle,
    pageDescription,
    backDestination,
    backLabel,
    topFeature,
    usageInsights,
    usageFeatureMap,
    conversionJourney,
    upsellCenterMetrics,
    activeUpsellPlacements,
    cartPlacementEnabled,
    upsellFallbackSummary,
    reviewInsights,
    insightsLoading,
    billingSummary,
    billingSummaryLoading,
    treasuryAccounts,
    updateAtPath,
    applyPreset,
    handleSave,
    setUpsellSection,
  };
}
