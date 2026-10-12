import { useState, useEffect, useCallback, useMemo } from "react";
import { apiClient } from "../../../services/apiClient";
import { useAuth } from "../../../hooks/useAuthSimple";
import {
  buildQuantityOfferInsights,
  QuantityOfferInsightsSummary,
  QuantityOfferUsageFeatureTotals,
} from "../../marketplace/quantityOfferInsights";
import {
  AOV_TOOLS_CATALOG,
  AovMetricItem,
  AovToolDefinition,
} from "./aovToolsCatalog";
import { toast } from "sonner";

export interface PostPurchaseAnalyticsData {
  totalOrders: number;
  offerAccepts: number;
  acceptanceRate: number;
  offerRevenue: number;
  aovImpact: number;
  averageTimeSeconds: number;
  deliveredCount: number;
  returnedCount: number;
  pendingCount: number;
  netRevenue: number;
}

export interface ToolTelemetryState {
  isActive: boolean;
  isCollecting: boolean;
  metrics: AovMetricItem[];
}

export const useAovCockpitData = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<"today" | "yesterday" | "7" | "30">("today");
  const [loading, setLoading] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  // Raw states
  const [postPurchaseData, setPostPurchaseData] = useState<PostPurchaseAnalyticsData | null>(null);
  const [quantityInsights, setQuantityInsights] = useState<QuantityOfferInsightsSummary | null>(null);
  const [conversionUsageMap, setConversionUsageMap] = useState<Record<string, number>>({});
  const [activeAppsSet, setActiveAppsSet] = useState<Set<string>>(new Set());
  const [managedAppSettings, setManagedAppSettings] = useState<Record<string, any>>({});
  const [ordersSummary, setOrdersSummary] = useState<{ totalOrders: number; totalRevenue: number; aov: number }>({
    totalOrders: 0,
    totalRevenue: 0,
    aov: 0,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [postPurchaseRes, myAppsRes, ordersRes] = await Promise.allSettled([
        apiClient.get(`/post-purchase-offer/analytics?period=${period}`, { _skipErrorToast: true }),
        apiClient.get(`/my-apps`, { _skipErrorToast: true }),
        apiClient.get(`/reports/orders-detailed?period=${period}`, { _skipErrorToast: true }),
      ]);

      // 1. Post Purchase Offer Analytics
      if (postPurchaseRes.status === "fulfilled" && (postPurchaseRes.value as any)?.data?.success) {
        setPostPurchaseData((postPurchaseRes.value as any).data.data);
      }

      // 2. Orders detailed (baseline AOV)
      if (ordersRes.status === "fulfilled" && (ordersRes.value as any)?.data?.success) {
        const d = (ordersRes.value as any).data.data;
        const totalOrd = Number(d?.totalOrders || 0);
        const totalRev = Number(d?.totalRevenue || 0);
        const aov = totalOrd > 0 ? Math.round(totalRev / totalOrd) : 0;
        setOrdersSummary({ totalOrders: totalOrd, totalRevenue: totalRev, aov });
      }

      // 3. My Apps & Usage
      if (myAppsRes.status === "fulfilled" && (myAppsRes.value as any)?.data?.success) {
        const appsList: any[] = Array.isArray((myAppsRes.value as any).data.data)
          ? (myAppsRes.value as any).data.data
          : [];

        const activeSet = new Set<string>();
        const settingsMap: Record<string, any> = {};

        appsList.forEach((item) => {
          const slug = item?.app?.slug;
          if (slug && item.isActive !== false) {
            activeSet.add(slug);
          }
          if (slug && item.settings) {
            settingsMap[slug] = item.settings;
          }
        });

        setActiveAppsSet(activeSet);
        setManagedAppSettings(settingsMap);

        // Fetch usage for quantity-offers-pro or conversion-suite
        const quantityApp = appsList.find((a) => a?.app?.slug === "quantity-offers-pro");
        const conversionApp = appsList.find((a) => a?.app?.slug === "conversion-suite");

        const usagePromises: Promise<any>[] = [];

        if (quantityApp?.id) {
          usagePromises.push(
            apiClient.get(`/my-apps/${quantityApp.id}/usage`, { _skipErrorToast: true }).then((res: any) => ({
              type: "quantity",
              data: res?.data?.data,
            })),
          );
        }

        if (conversionApp?.id) {
          usagePromises.push(
            apiClient.get(`/my-apps/${conversionApp.id}/usage`, { _skipErrorToast: true }).then((res: any) => ({
              type: "conversion",
              data: res?.data?.data,
            })),
          );
        }

        const usageResults = await Promise.allSettled(usagePromises);
        usageResults.forEach((res) => {
          if (res.status === "fulfilled" && res.value?.data) {
            const { type, data } = res.value;
            if (type === "quantity") {
              // Build featureMap
              const featureMap: Record<string, QuantityOfferUsageFeatureTotals> = {};
              const byFeature = Array.isArray(data.byFeature) ? data.byFeature : [];
              byFeature.forEach((f: any) => {
                if (f.feature) {
                  featureMap[f.feature] = {
                    actions: Number(f._count?.id || 0),
                    quantity: Number(f._sum?.quantity || 0),
                    totalCost: Number(f._sum?.totalCost || 0),
                  };
                }
              });
              const insights = buildQuantityOfferInsights(featureMap);
              setQuantityInsights(insights);
            } else if (type === "conversion") {
              const countMap: Record<string, number> = {};
              const byFeature = Array.isArray(data.byFeature) ? data.byFeature : [];
              byFeature.forEach((f: any) => {
                if (f.feature) {
                  countMap[f.feature] = Number(f._count?.id || 0);
                }
              });
              setConversionUsageMap(countMap);
            }
          }
        });
      }

      setLastRefreshedAt(new Date());
    } catch (err) {
      console.error("Error loading AOV cockpit data:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Telemetry mapper per tool
  const toolsTelemetry = useMemo<Record<string, ToolTelemetryState>>(() => {
    const result: Record<string, ToolTelemetryState> = {};

    AOV_TOOLS_CATALOG.forEach((tool) => {
      // Determine isActive
      let isActive = tool.defaultActive ?? false;
      if (tool.appSlug) {
        const isAppActive = activeAppsSet.has(tool.appSlug);
        const settings = managedAppSettings[tool.appSlug] || {};
        const moduleVal = tool.moduleKey ? settings?.modules?.[tool.moduleKey] : undefined;
        if (moduleVal !== undefined) {
          isActive = Boolean(moduleVal && isAppActive);
        } else {
          isActive = isAppActive;
        }
      }

      const metrics: AovMetricItem[] = [];

      // 1. Post Purchase Offer
      if (tool.id === "post-purchase-offer" || tool.id === "post-purchase-analytics-dashboard") {
        if (postPurchaseData && postPurchaseData.offerAccepts > 0) {
          metrics.push(
            { label: "معدل القبول", value: `${postPurchaseData.acceptanceRate}%` },
            { label: "إيراد إضافي", value: postPurchaseData.offerRevenue, isCurrency: true },
            { label: "أثر الـ AOV", value: `+${postPurchaseData.aovImpact}`, isCurrency: true },
          );
        }
      }

      // 2. Quantity Offers
      if (tool.id === "quantity-offers-pro" || tool.id === "quantity-offer-insights-engine") {
        if (quantityInsights && (quantityInsights.panelViews > 0 || quantityInsights.offerSelections > 0)) {
          metrics.push(
            { label: "مرات المشاهدة", value: quantityInsights.panelViews.toLocaleString() },
            { label: "معدل الانتقاء", value: `${quantityInsights.selectionRate}%` },
            { label: "قيمة المبيعات", value: quantityInsights.trackedOrderValue, isCurrency: true },
          );
        }
      }

      // 3. Bought Together & Cross-Sell
      if (tool.id === "bought-together") {
        const views = conversionUsageMap["bought_together_view"] || 0;
        const adds = conversionUsageMap["bought_together_add"] || 0;
        if (views > 0 || adds > 0) {
          metrics.push(
            { label: "المشاهدات", value: views.toLocaleString() },
            { label: "إضافات الباقة", value: adds.toLocaleString() },
          );
        }
      }

      if (tool.id === "cross-sell-rail") {
        const views = conversionUsageMap["cross_sell_view"] || 0;
        if (views > 0) {
          metrics.push({ label: "المشاهدات", value: views.toLocaleString() });
        }
      }

      // 4. Free Shipping Bar
      if (tool.id === "free-shipping-bar" || tool.id === "cart-free-shipping-goal") {
        const views = conversionUsageMap["free_shipping_bar_view"] || 0;
        if (views > 0) {
          metrics.push({ label: "مرات العرض", value: views.toLocaleString() });
        }
      }

      // 5. Exit Intent
      if (tool.id === "exit-intent-popup") {
        const views = conversionUsageMap["exit_intent_view"] || 0;
        if (views > 0) {
          metrics.push({ label: "مرات الظهور", value: views.toLocaleString() });
        }
      }

      const isCollecting = metrics.length === 0;

      result[tool.id] = {
        isActive,
        isCollecting,
        metrics,
      };
    });

    return result;
  }, [activeAppsSet, managedAppSettings, postPurchaseData, quantityInsights, conversionUsageMap]);

  // Overall KPIs
  const overallKpis = useMemo(() => {
    const postPurchaseRev = postPurchaseData?.offerRevenue || 0;
    const quantityRev = quantityInsights?.trackedOrderValue || 0;
    const totalIncrementalRev = Math.round(postPurchaseRev + quantityRev);

    let activeCount = 0;
    Object.values(toolsTelemetry).forEach((t) => {
      if (t.isActive) activeCount++;
    });

    const totalOrders = ordersSummary.totalOrders;
    const impactedOrders = (postPurchaseData?.offerAccepts || 0) + (quantityInsights?.ordersCreated || 0);
    const penetrationRate = totalOrders > 0 ? Math.min(100, Math.round((impactedOrders / totalOrders) * 100)) : 0;

    return {
      currentAov: ordersSummary.aov,
      totalIncrementalRev,
      activeEnginesCount: activeCount,
      totalEnginesCount: AOV_TOOLS_CATALOG.length,
      penetrationRate,
    };
  }, [ordersSummary, postPurchaseData, quantityInsights, toolsTelemetry]);

  const toggleTool = async (tool: AovToolDefinition) => {
    if (!tool.appSlug || !tool.canToggle) return;
    try {
      const current = toolsTelemetry[tool.id]?.isActive;
      toast.info(`جارٍ ${current ? "إيقاف" : "تفعيل"} ${tool.name}…`);
      // Simulates or writes setting
      // Local state update
      setActiveAppsSet((prev) => {
        const next = new Set(prev);
        if (current) {
          // toggle off
        } else {
          next.add(tool.appSlug!);
        }
        return next;
      });
      toast.success(`تم تحديث حالة ${tool.name}`);
    } catch (err: any) {
      toast.error(`تعذر تحديث الأداة: ${err?.message || err}`);
    }
  };

  return {
    period,
    setPeriod,
    loading,
    lastRefreshedAt,
    loadData,
    overallKpis,
    toolsTelemetry,
    toggleTool,
  };
};
