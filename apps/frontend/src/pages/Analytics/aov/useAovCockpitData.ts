import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { apiClient } from "../../../services/apiClient";
import {
  buildQuantityOfferInsights,
  QuantityOfferInsightsSummary,
} from "../../marketplace/quantityOfferInsights";
import { AOV_TOOLS_CATALOG, AovMetricItem, AovToolDefinition } from "./aovToolsCatalog";
import { toast } from "sonner";
import {
  AovCockpitPeriod,
  buildConversionUsageMap,
  buildQuantityFeatureMap,
  getPeriodDateRange,
  isManagedAppActive,
  ManagedAppRecord,
  mapPostPurchaseAnalytics,
  PostPurchaseAnalyticsData,
  resolveToolActive,
} from "./aovCockpitHelpers";

export type { PostPurchaseAnalyticsData };

export interface ToolTelemetryState {
  isActive: boolean;
  isCollecting: boolean;
  isToggling: boolean;
  toggleSupported: boolean;
  metrics: AovMetricItem[];
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

const USAGE_CFG = { _skipErrorToast: true } as any;

export const useAovCockpitData = () => {
  const [period, setPeriod] = useState<AovCockpitPeriod>("today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // Raw states
  const [appStateMap, setAppStateMap] = useState<Record<string, any>>({});
  const [postPurchaseData, setPostPurchaseData] = useState<PostPurchaseAnalyticsData | null>(null);
  const [quantityInsights, setQuantityInsights] = useState<QuantityOfferInsightsSummary | null>(null);
  const [conversionUsageMap, setConversionUsageMap] = useState<Record<string, number>>({});
  const [togglingToolIds, setTogglingToolIds] = useState<string[]>([]);
  const [ordersSummary, setOrdersSummary] = useState<{ totalOrders: number; totalRevenue: number; aov: number }>({
    totalOrders: 0,
    totalRevenue: 0,
    aov: 0,
  });

  const periodReqRef = useRef(0);
  const appsReqRef = useRef(0);
  const usageReqRef = useRef(0);
  const appsRef = useRef(appStateMap);
  appsRef.current = appStateMap;

  const periodRange = useMemo(() => getPeriodDateRange(period), [period]);

  // A. Installed apps + settings — mount & manual refresh only (NOT per period)
  const loadApps = useCallback(async (): Promise<boolean> => {
    const reqId = ++appsReqRef.current;
    try {
      const res = await apiClient.get(`/my-apps?slim=1`, USAGE_CFG);
      if (reqId !== appsReqRef.current) return true; // superseded → not a failure
      const list: any[] = Array.isArray((res as any)?.data?.data) ? (res as any).data.data : [];
      const map: Record<string, Record<string, unknown>> = {};
      list.forEach((item) => {
        const slug = item?.app?.slug;
        if (!slug) return;
        map[slug] = {
          id: String(item.id),
          active: isManagedAppActive(item),
          settings: isRecord(item.settings) ? item.settings : undefined,
        };
      });
      setAppStateMap(map);
      appsRef.current = map; // immediate commit — loadUsage may run before the next render flush
      return true;
    } catch {
      return reqId !== appsReqRef.current; // superseded requests don't count as errors
    }
  }, []);

  // B. Period-scoped analytics: post-purchase real contract (data.kpis.*) + orders baseline
  const loadPeriodData = useCallback(async (p: AovCockpitPeriod): Promise<boolean> => {
    const reqId = ++periodReqRef.current;
    const [ppRes, ordersRes] = await Promise.allSettled([
      apiClient.get(`/post-purchase-offer/analytics?period=${p}`, USAGE_CFG),
      apiClient.get(`/reports/orders-detailed?period=${p}`, USAGE_CFG),
    ]);
    if (reqId !== periodReqRef.current) return true; // superseded

    let okAny = false;
    if (ppRes.status === "fulfilled") {
      const mapped = mapPostPurchaseAnalytics((ppRes.value as any)?.data?.data);
      if (mapped) {
        setPostPurchaseData(mapped);
        okAny = true;
      }
    }
    if (ordersRes.status === "fulfilled") {
      const d = (ordersRes.value as any)?.data?.data;
      if (isRecord(d)) {
        const totalOrd = Number(d.totalOrders || 0);
        const totalRev = Number(d.totalRevenue || 0);
        setOrdersSummary({
          totalOrders: totalOrd,
          totalRevenue: totalRev,
          aov: totalOrd > 0 ? Math.round(totalRev / totalOrd) : 0,
        });
        okAny = true;
      }
    }
    return okAny;
  }, []);

  // C. Usage telemetry, scoped to the selected period (cheap calls)
  const loadUsage = useCallback(async (): Promise<boolean> => {
    const reqId = ++usageReqRef.current;
    const quantityApp = appsRef.current["quantity-offers-pro"];
    const conversionApp = appsRef.current["conversion-suite"];
    const params = new URLSearchParams({
      startDate: periodRange.startDate,
      endDate: periodRange.endDate,
    });
    const targets: Array<{ id: string; type: "quantity" | "conversion" }> = [];
    if (quantityApp?.id) targets.push({ id: quantityApp.id, type: "quantity" });
    if (conversionApp?.id) targets.push({ id: conversionApp.id, type: "conversion" });
    if (targets.length === 0) {
      if (reqId === usageReqRef.current) {
        setQuantityInsights(null);
        setConversionUsageMap({});
      }
      return true;
    }
    try {
      const results = await Promise.allSettled(
        targets.map((t) => apiClient.get(`/my-apps/${t.id}/usage?${params.toString()}`, USAGE_CFG)),
      );
      if (reqId !== usageReqRef.current) return true;
      let okAny = false;
      results.forEach((res, idx) => {
        if (res.status !== "fulfilled") return;
        const data = (res.value as any)?.data?.data;
        if (!isRecord(data)) return;
        okAny = true;
        if (targets[idx].type === "quantity") {
          setQuantityInsights(buildQuantityOfferInsights(buildQuantityFeatureMap(data.byFeature)));
        } else {
          setConversionUsageMap(buildConversionUsageMap(data.byFeature));
        }
      });
      return okAny;
    } catch {
      return false;
    }
  }, [periodRange]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const okApps = await loadApps();
    const [okPeriod, okUsage] = await Promise.all([loadPeriodData(period), loadUsage()]);
    if (!okApps && !okPeriod && !okUsage) {
      setError("تعذر تحميل بيانات المركز — تحقق من الاتصال ثم اضغط تحديث");
    } else if (!okPeriod) {
      setError("تعذر تحميل تحليلات الفترة — اضغط تحديث لإعادة المحاولة");
    }
    setLastRefreshedAt(new Date());
    setLoading(false);
  }, [period, loadApps, loadPeriodData, loadUsage]);

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      void loadData();
      return;
    }
    // Period change → refresh period-scoped data only; /my-apps stays cached
    void (async () => {
      setLoading(true);
      await Promise.all([loadPeriodData(period), loadUsage()]);
      setLastRefreshedAt(new Date());
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // Telemetry mapping per tool
  const toolsTelemetry = useMemo<Record<string, ToolTelemetryState>>(() => {
    const result: Record<string, ToolTelemetryState> = {};

    AOV_TOOLS_CATALOG.forEach((tool) => {
      const app = tool.appSlug ? appStateMap[tool.appSlug] : undefined;
      const isActive = resolveToolActive(tool, app);
      const metrics: AovMetricItem[] = [];

      // 1. Post Purchase Offer (real data.kpis.* contract)
      if (tool.id === "post-purchase-offer" || tool.id === "post-purchase-analytics-dashboard") {
        if (postPurchaseData && postPurchaseData.offerAccepts > 0) {
          metrics.push(
            { label: "معدل القبول", value: `${postPurchaseData.acceptanceRate}%` },
            { label: "إيراد إضافي", value: postPurchaseData.offerRevenue, isCurrency: true },
            { label: "أثر الـ AOV", value: `+${postPurchaseData.aovImpact}`, isCurrency: true },
          );
        }
      } else if (tool.id === "quantity-offers-pro" || tool.id === "quantity-offer-insights-engine") {
        // 2. Quantity Offers (period-scoped usage)
        if (quantityInsights && (quantityInsights.panelViews > 0 || quantityInsights.offerSelections > 0)) {
          metrics.push(
            { label: "مرات المشاهدة", value: quantityInsights.panelViews.toLocaleString() },
            { label: "معدل الانتقاء", value: `${quantityInsights.selectionRate}%` },
            { label: "قيمة المبيعات", value: quantityInsights.trackedOrderValue, isCurrency: true },
          );
        }
      } else if (tool.telemetryFeatures?.length) {
        // 3. Generic recorded-feature metrics (exact appUsageLog feature names)
        tool.telemetryFeatures.forEach((spec) => {
          const count = conversionUsageMap[spec.feature] || 0;
          if (count > 0) metrics.push({ label: spec.label, value: count.toLocaleString() });
        });
      }

      result[tool.id] = {
        isActive,
        isCollecting: metrics.length === 0,
        isToggling: togglingToolIds.includes(tool.id),
        toggleSupported: Boolean(
          tool.canToggle && tool.moduleKey && app?.active && app?.id,
        ),
        metrics,
      };
    });

    return result;
  }, [appStateMap, postPurchaseData, quantityInsights, conversionUsageMap, togglingToolIds]);

  // Overall KPIs — every source is period-scoped now
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

  // Toggle = REAL settings write (module-level), optimistic-safe with rollback-free flow
  const toggleTool = useCallback(
    async (tool: AovToolDefinition) => {
      if (!tool.appSlug || !tool.moduleKey || !tool.canToggle) return;
      const app: ManagedAppRecord | undefined = appsRef.current[tool.appSlug];
      if (!app?.active || !app.id) {
        toast.error(`${tool.name}: التطبيق غير مفعّل حاليًا`);
        return;
      }
      if (togglingToolIds.includes(tool.id)) return;

      const currentVal = resolveToolActive(tool, app);
      const nextVal = !currentVal;
      const existingSettings = isRecord(app.settings) ? app.settings : {};
      const existingModules = isRecord(existingSettings.modules) ? existingSettings.modules : {};
      // PUT /my-apps/:id/settings replaces the whole settings object — always send it merged
      const nextSettings = {
        ...existingSettings,
        modules: { ...existingModules, [tool.moduleKey]: nextVal },
      };

      setTogglingToolIds((prev) => [...prev, tool.id]);
      try {
        const res: any = await apiClient.put(
          `/my-apps/${app.id}/settings`,
          { settings: nextSettings },
          USAGE_CFG,
        );
        const updatedApp: Record<string, unknown> = isRecord(res?.data?.data) ? res.data.data : {};
        const merged = isRecord(updatedApp.settings) ? updatedApp.settings : nextSettings;
        const nextMap = {
          ...appsRef.current,
          [tool.appSlug!]: {
            id: app.id,
            active: isManagedAppActive(updatedApp),
            settings: merged,
          },
        };
        appsRef.current = nextMap;
        setAppStateMap(nextMap);
        toast.success(`${currentVal ? "تم إيقاف" : "تم تشغيل"} ${tool.name}`);
      } catch (err: any) {
        toast.error(`تعذر حفظ حالة ${tool.name}${err?.message ? `: ${err.message}` : ""}`);
      } finally {
        setTogglingToolIds((prev) => prev.filter((id) => id !== tool.id));
      }
    },
    [togglingToolIds],
  );

  return {
    period,
    setPeriod,
    loading,
    error,
    lastRefreshedAt,
    loadData,
    overallKpis,
    toolsTelemetry,
    toggleTool,
  };
};
