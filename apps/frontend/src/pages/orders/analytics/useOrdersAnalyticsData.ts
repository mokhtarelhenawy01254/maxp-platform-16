import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { companyAwareApi } from "../../../services/companyAwareApi";
import analyticsService from "../../../services/analyticsService";
import { useTranslation } from "react-i18next";
import {
  OrderStats,
  SalesProduct,
  PeriodKey,
  ShippingPerformance,
  BranchPerformance,
  GovernorateDetail,
} from "./types";
import {
  getPresetRange,
  calculateCustomDaysCount,
  isValidPeriodKey,
} from "./dateUtils";
import {
  deriveOrderCountsAndPieces,
  deriveFinancialsAndPayments,
  deriveShippingList,
  deriveBranchList,
  deriveGovernorateList,
} from "./analyticsCalculations";

export const useOrdersAnalyticsData = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [period, setPeriod] = useState<PeriodKey>(() => {
    const p = searchParams.get("period");
    if (isValidPeriodKey(p)) return p;
    return "today";
  });

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
    const p = searchParams.get("period");
    if (p === "custom") {
      const s = searchParams.get("start");
      const e = searchParams.get("end");
      if (s && e) return { start: s, end: e };
    } else if (isValidPeriodKey(p)) {
      const preset = getPresetRange(p);
      return { start: preset.start, end: preset.end };
    }
    const init = getPresetRange("today");
    return { start: init.start, end: init.end };
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [products, setProducts] = useState<SalesProduct[]>([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [trendMetric, setTrendMetric] = useState<"orders" | "revenue">("orders");

  const abortControllerRef = useRef<AbortController | null>(null);

  const loadData = useCallback(
    async (start: string, end: string, forceRefresh = false) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setLoading(true);
        setError(null);

        const cacheBuster = forceRefresh ? `&_t=${Date.now()}` : "";

        const [statsRes, productsRes] = await Promise.allSettled([
          companyAwareApi.get(
            `/reports/orders-detailed?startDate=${start}&endDate=${end}${cacheBuster}`,
            { signal: controller.signal },
          ),
          analyticsService.getProductSalesPerformance(undefined, start, end),
        ]);

        if (controller.signal.aborted) return;

        let hasSuccess = false;

        if (statsRes.status === "fulfilled" && (statsRes.value as any)?.data?.success) {
          setStats((statsRes.value as any).data.data);
          hasSuccess = true;
        } else if (statsRes.status === "rejected" && statsRes.reason?.name !== "CanceledError") {
          console.error("Error fetching order stats:", statsRes.reason);
          setError(String(t("common.errorLoadingData") || "تعذر تحميل بيانات الطلبات"));
        } else if (statsRes.status === "fulfilled" && !(statsRes.value as any)?.data?.success) {
          console.error("Order stats returned failure:", (statsRes.value as any)?.data?.message);
          setError(
            (statsRes.value as any)?.data?.message ||
              String(t("common.errorLoadingData") || "تعذر تحميل بيانات الطلبات"),
          );
        }

        if (productsRes.status === "fulfilled" && (productsRes.value as any)?.success) {
          const raw = (productsRes.value as any).data;
          setProducts(Array.isArray(raw) ? raw : raw?.products || []);
          hasSuccess = true;
        } else if (productsRes.status === "rejected") {
          console.error("Error fetching product stats:", productsRes.reason);
        }

        if (!hasSuccess && !error) {
          setError(
            String(t("common.errorLoadingData") || "تعذر تحميل البيانات، يرجى المحاولة مرة أخرى"),
          );
        } else {
          setLastRefreshedAt(new Date());
        }
      } catch (err: any) {
        if (
          controller.signal.aborted ||
          err?.name === "CanceledError" ||
          err?.code === "ERR_CANCELED"
        ) {
          return;
        }
        console.error("Unexpected error loading analytics:", err);
        setError(
          String(t("common.errorLoadingData") || "حدث خطأ غير متوقع أثناء تحميل البيانات"),
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [t, error],
  );

  // Synchronize period & dateRange when URL searchParams change externally or via back/forward
  useEffect(() => {
    const p = searchParams.get("period");
    if (p === "custom") {
      const s = searchParams.get("start");
      const e = searchParams.get("end");
      if (s && e && (s !== dateRange.start || e !== dateRange.end || period !== "custom")) {
        setPeriod("custom");
        setDateRange({ start: s, end: e });
      }
    } else if (isValidPeriodKey(p)) {
      if (p !== period) {
        const preset = getPresetRange(p);
        setPeriod(p);
        setDateRange({ start: preset.start, end: preset.end });
      }
    } else if (!p && period !== "today") {
      const preset = getPresetRange("today");
      setPeriod("today");
      setDateRange({ start: preset.start, end: preset.end });
    }
  }, [searchParams, period, dateRange.start, dateRange.end]);

  useEffect(() => {
    if (dateRange.start && dateRange.end && dateRange.start <= dateRange.end) {
      loadData(dateRange.start, dateRange.end);
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [dateRange.start, dateRange.end, loadData]);

  const applyPeriod = (key: PeriodKey) => {
    if (key === "custom") {
      setPeriod("custom");
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("period", "custom");
          if (dateRange.start && dateRange.end) {
            next.set("start", dateRange.start);
            next.set("end", dateRange.end);
          }
          return next;
        },
        { replace: true },
      );
      return;
    }
    const preset = getPresetRange(key);
    setPeriod(key);
    setDateRange({
      start: preset.start,
      end: preset.end,
    });
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("period", key);
        next.delete("start");
        next.delete("end");
        return next;
      },
      { replace: true },
    );
  };

  const handleCustomDateChange = (field: "start" | "end", val: string) => {
    setDateRange((prev) => {
      const next = { ...prev, [field]: val };
      if (next.start && next.end && next.start <= next.end) {
        setSearchParams(
          (p) => {
            const params = new URLSearchParams(p);
            params.set("period", "custom");
            params.set("start", next.start);
            params.set("end", next.end);
            return params;
          },
          { replace: true },
        );
      }
      return next;
    });
  };

  const isDateRangeInvalid = Boolean(
    dateRange.start && dateRange.end && dateRange.start > dateRange.end,
  );

  // Days in period
  const daysCount = useMemo(() => {
    if (period === "custom") {
      return calculateCustomDaysCount(dateRange.start, dateRange.end);
    }
    return getPresetRange(period).daysCount;
  }, [period, dateRange]);

  // Derived counts and pieces
  const counts = useMemo(
    () => deriveOrderCountsAndPieces(stats, daysCount),
    [stats, daysCount],
  );

  // Derived financials and payment stats
  const financials = useMemo(
    () => deriveFinancialsAndPayments(stats, counts),
    [stats, counts],
  );

  // Logistics & Carriers
  const shippingList: ShippingPerformance[] = useMemo(
    () => deriveShippingList(stats, counts, financials),
    [stats, counts, financials],
  );

  // Branches
  const branchList: BranchPerformance[] = useMemo(
    () => deriveBranchList(stats, counts, financials),
    [stats, counts, financials],
  );

  // Governorates
  const governorateList: GovernorateDetail[] = useMemo(
    () => deriveGovernorateList(stats, counts, financials),
    [stats, counts, financials],
  );

  return {
    period,
    dateRange,
    loading,
    error,
    stats,
    products,
    lastRefreshedAt,
    trendMetric,
    setTrendMetric,
    applyPeriod,
    handleCustomDateChange,
    loadData,
    totalOrders: counts.totalOrders,
    totalRevenue: counts.totalRevenue,
    deliveredOrders: counts.deliveredOrders,
    deliveredPct: counts.deliveredPct,
    inTransitOrders: counts.inTransitOrders,
    inTransitPct: counts.inTransitPct,
    warehouseOrders: counts.warehouseOrders,
    warehousePct: counts.warehousePct,
    unprocessedOrders: counts.unprocessedOrders,
    unprocessedPct: counts.unprocessedPct,
    cancelledOrders: counts.cancelledOrders,
    cancelledPct: counts.cancelledPct,
    returnedOrders: counts.returnedOrders,
    returnedPct: counts.returnedPct,
    daysCount,
    avgOrdersPerDay: counts.avgOrdersPerDay,
    avgDeliveredPerDay: counts.avgDeliveredPerDay,
    avgCancelledPerDay: counts.avgCancelledPerDay,
    avgReturnedPerDay: counts.avgReturnedPerDay,
    deliveryRate: financials.deliveryRate,
    cancellationRate: financials.cancellationRate,
    returnRate: financials.returnRate,
    netRevenue: financials.netRevenue,
    pendingRevenue: financials.pendingRevenue,
    lostRevenue: financials.lostRevenue,
    netRealizationPct: financials.netRealizationPct,
    codOrdersCount: financials.codOrdersCount,
    prepaidOrdersCount: financials.prepaidOrdersCount,
    codDeliveredRevenue: financials.codDeliveredRevenue,
    codCollectionRate: financials.codCollectionRate,
    prepaidDeliveryRate: financials.prepaidDeliveryRate,
    shippingList,
    branchList,
    governorateList,
    statusDist: counts.statusDist,
    statusPieces: counts.statusPieces,
    totalPieces: counts.totalPieces,
    avgPiecesPerOrder: counts.avgPiecesPerOrder,
    avgPiecesPerDay: counts.avgPiecesPerDay,
    avgDeliveredPiecesPerDay: counts.avgDeliveredPiecesPerDay,
    avgCancelledPiecesPerDay: counts.avgCancelledPiecesPerDay,
    avgReturnedPiecesPerDay: counts.avgReturnedPiecesPerDay,
    deliveredPieces: counts.deliveredPieces,
    inTransitPieces: counts.inTransitPieces,
    warehousePieces: counts.warehousePieces,
    unprocessedPieces: counts.unprocessedPieces,
    cancelledPieces: counts.cancelledPieces,
    returnedPieces: counts.returnedPieces,
    paymentStats: counts.paymentStats,
    isDateRangeInvalid,
    translate: t,
  };
};

export default useOrdersAnalyticsData;
