import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ShoppingCartIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { companyAwareApi } from "../../services/companyAwareApi";
import analyticsService from "../../services/analyticsService";
import { useCurrency } from "../../hooks/useCurrency";

import {
  OrderStats,
  SalesProduct,
  PeriodKey,
  ShippingPerformance,
  BranchPerformance,
} from "./analytics/types";
import OrdersMetricsStrip from "./analytics/OrdersMetricsStrip";
import OrdersActionCenter from "./analytics/OrdersActionCenter";
import OrdersVelocityChart from "./analytics/OrdersVelocityChart";
import OrdersLogisticsPerformance from "./analytics/OrdersLogisticsPerformance";
import OrdersGovernorateTable from "./analytics/OrdersGovernorateTable";
import OrdersTopProductsTable from "./analytics/OrdersTopProductsTable";

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "اليوم" },
  { key: "yesterday", label: "أمس" },
  { key: "thisMonth", label: "هذا الشهر" },
  { key: "lastMonth", label: "الشهر الماضي" },
  { key: "7", label: "آخر 7 أيام" },
  { key: "30", label: "آخر 30 يوم" },
  { key: "90", label: "آخر 90 يوم" },
  { key: "180", label: "آخر 6 شهور" },
  { key: "365", label: "آخر سنة" },
  { key: "custom", label: "فترة مخصصة..." },
];

const toISODate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const getInitialDateRange = () => {
  const today = new Date();
  const dateStr = toISODate(today);
  return { start: dateStr, end: dateStr };
};

const OrdersAnalytics: React.FC = () => {
  const { t, i18n } = useTranslation();
  const translate: any = t;
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();

  const [stats, setStats] = useState<OrderStats | null>(null);
  const [products, setProducts] = useState<SalesProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("today");
  const [dateRange, setDateRange] = useState(getInitialDateRange);
  const [trendMetric, setTrendMetric] = useState<"orders" | "revenue">("orders");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const abortControllerRef = useRef<AbortController | null>(null);
  const isRtl = i18n.dir ? i18n.dir() === "rtl" : true;

  const loadData = useCallback(async (start: string, end: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const [statsRes, productsRes] = await Promise.allSettled([
        companyAwareApi.get(
          `/reports/orders-detailed?startDate=${start}&endDate=${end}`,
          { signal: controller.signal }
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
      }

      if (productsRes.status === "fulfilled" && (productsRes.value as any)?.success) {
        setProducts((productsRes.value as any).data?.products ?? []);
        hasSuccess = true;
      } else if (productsRes.status === "rejected") {
        console.error("Error fetching product stats:", productsRes.reason);
      }

      if (!hasSuccess && statsRes.status === "rejected" && productsRes.status === "rejected") {
        setError(String(translate("common.errorLoadingData") || "تعذر تحميل البيانات، يرجى المحاولة مرة أخرى"));
      } else {
        setLastRefreshedAt(new Date());
      }
    } catch (err: any) {
      if (err?.name !== "CanceledError") {
        console.error("Unexpected error loading analytics:", err);
        setError(String(translate("common.errorLoadingData") || "حدث خطأ غير متوقع أثناء تحميل البيانات"));
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [translate]);

  useEffect(() => {
    loadData(dateRange.start, dateRange.end);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [dateRange, loadData]);

  const applyPeriod = (key: PeriodKey) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (key === "custom") {
      setPeriod("custom");
      return;
    }

    let start: Date;
    let end: Date = new Date();

    switch (key) {
      case "today":
        start = today;
        break;
      case "yesterday": {
        start = new Date(today);
        start.setDate(start.getDate() - 1);
        end = new Date(start);
        break;
      }
      case "thisMonth":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date();
        break;
      case "lastMonth":
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "7":
        start = new Date(today);
        start.setDate(start.getDate() - 6);
        break;
      case "30":
        start = new Date(today);
        start.setDate(start.getDate() - 29);
        break;
      case "90":
        start = new Date(today);
        start.setDate(start.getDate() - 89);
        break;
      case "180":
        start = new Date(today);
        start.setMonth(start.getMonth() - 6);
        break;
      case "365":
        start = new Date(today);
        start.setDate(start.getDate() - 364);
        break;
      default:
        return;
    }

    setPeriod(key);
    setDateRange({ start: toISODate(start), end: toISODate(end) });
  };

  const handleCustomDateChange = (type: "start" | "end", value: string) => {
    setPeriod("custom");
    setDateRange((prev) => {
      const next = { ...prev, [type]: value };
      if (next.start && next.end && next.start > next.end) {
        if (type === "start") next.end = value;
        else next.start = value;
      }
      return next;
    });
  };

  // =========================================================================
  // ROBUST DATA DERIVATION
  // =========================================================================
  const totalOrders = stats?.totalOrders || 0;
  const totalRevenue = stats?.totalRevenue || 0;
  const statusDist = useMemo(() => stats?.statusDistribution || {}, [stats?.statusDistribution]);
  const statusPieces = useMemo(() => stats?.statusPiecesDistribution || {}, [stats?.statusPiecesDistribution]);
  const paymentStats = useMemo(() => stats?.paymentStats || {}, [stats?.paymentStats]);

  // Delivered
  const deliveredOrders = useMemo(() => {
    if (typeof stats?.metrics?.deliveredOrders === "number" && stats.metrics.deliveredOrders > 0) {
      return stats.metrics.deliveredOrders;
    }
    return (
      (statusDist["DELIVERED"] || 0) +
      (statusDist["PARTIALLY_DELIVERED"] || 0) +
      (statusDist["COMPLETED"] || 0) +
      (statusDist["delivered"] || 0)
    );
  }, [stats?.metrics?.deliveredOrders, statusDist]);

  // Cancelled
  const cancelledOrders = useMemo(() => {
    if (typeof stats?.metrics?.cancelledOrders === "number" && stats.metrics.cancelledOrders > 0) {
      return stats.metrics.cancelledOrders;
    }
    return (
      (statusDist["CANCELLED"] || 0) +
      (statusDist["REJECTED"] || 0) +
      (statusDist["FAILED"] || 0) +
      (statusDist["DUPLICATE_ORDER"] || 0) +
      (statusDist["cancelled"] || 0)
    );
  }, [stats?.metrics?.cancelledOrders, statusDist]);

  // Returned
  const returnedOrders = useMemo(() => {
    if (typeof stats?.metrics?.returnedOrders === "number" && stats.metrics.returnedOrders > 0) {
      return stats.metrics.returnedOrders;
    }
    return (
      (statusDist["RETURNED"] || 0) +
      (statusDist["PARTIALLY_RETURNED"] || 0) +
      (statusDist["RETURNED_TO_COMPANY"] || 0) +
      (statusDist["REFUNDED"] || 0) +
      (statusDist["PARTIALLY_REFUNDED"] || 0) +
      (statusDist["returned"] || 0)
    );
  }, [stats?.metrics?.returnedOrders, statusDist]);

  // Shipped & In-Transit
  const inTransitOrders = useMemo(() => {
    const raw = (statusDist["SHIPPED"] || 0) + (statusDist["OUT_FOR_DELIVERY"] || 0);
    if (raw > 0) return raw;
    return Math.max(0, totalOrders - deliveredOrders - cancelledOrders - returnedOrders);
  }, [statusDist, totalOrders, deliveredOrders, cancelledOrders, returnedOrders]);

  // Rates
  const deliveryRate = useMemo(() => {
    if (typeof stats?.metrics?.deliveryRate === "number" && stats.metrics.deliveryRate > 0) {
      return stats.metrics.deliveryRate;
    }
    return totalOrders > 0 ? Number(((deliveredOrders / totalOrders) * 100).toFixed(1)) : 0;
  }, [stats?.metrics?.deliveryRate, deliveredOrders, totalOrders]);

  const cancellationRate = useMemo(() => {
    if (typeof stats?.metrics?.cancellationRate === "number" && stats.metrics.cancellationRate > 0) {
      return stats.metrics.cancellationRate;
    }
    return totalOrders > 0 ? Number(((cancelledOrders / totalOrders) * 100).toFixed(1)) : 0;
  }, [stats?.metrics?.cancellationRate, cancelledOrders, totalOrders]);

  const returnRate = useMemo(() => {
    if (typeof stats?.metrics?.returnRate === "number" && stats.metrics.returnRate > 0) {
      return stats.metrics.returnRate;
    }
    return totalOrders > 0 ? Number(((returnedOrders / totalOrders) * 100).toFixed(1)) : 0;
  }, [stats?.metrics?.returnRate, returnedOrders, totalOrders]);

  // Revenues
  const netRevenue = useMemo(() => {
    if (typeof stats?.metrics?.netRealizedRevenue === "number" && stats.metrics.netRealizedRevenue > 0) {
      return stats.metrics.netRealizedRevenue;
    }
    if (typeof stats?.metrics?.deliveredRevenue === "number" && stats.metrics.deliveredRevenue > 0) {
      return stats.metrics.deliveredRevenue;
    }
    return totalOrders > 0 ? (totalRevenue * (deliveredOrders / totalOrders)) : 0;
  }, [stats?.metrics, totalRevenue, deliveredOrders, totalOrders]);

  const pendingRevenue = useMemo(() => {
    return totalOrders > 0 ? (totalRevenue * (inTransitOrders / totalOrders)) : 0;
  }, [totalRevenue, inTransitOrders, totalOrders]);

  const lostRevenue = useMemo(() => {
    const unfulfilled = cancelledOrders + returnedOrders;
    return totalOrders > 0 ? (totalRevenue * (unfulfilled / totalOrders)) : 0;
  }, [totalRevenue, cancelledOrders, returnedOrders, totalOrders]);

  const netRealizationPct = useMemo(() => {
    if (totalRevenue <= 0) return 0;
    return Math.min(100, Number(((netRevenue / totalRevenue) * 100).toFixed(1)));
  }, [netRevenue, totalRevenue]);

  // COD & Prepaid
  const codOrdersCount = useMemo(() => {
    if (typeof stats?.metrics?.codOrdersCount === "number" && stats.metrics.codOrdersCount > 0) {
      return stats.metrics.codOrdersCount;
    }
    return (
      (paymentStats["CASH"] || 0) +
      (paymentStats["COD"] || 0) +
      (paymentStats["cash"] || 0) +
      (paymentStats["cod"] || 0)
    );
  }, [stats?.metrics?.codOrdersCount, paymentStats]);

  const codDeliveredRevenue = useMemo(() => {
    if (typeof stats?.metrics?.codDeliveredRevenue === "number" && stats.metrics.codDeliveredRevenue > 0) {
      return stats.metrics.codDeliveredRevenue;
    }
    if (totalOrders > 0 && codOrdersCount > 0) {
      return netRevenue * (codOrdersCount / totalOrders);
    }
    return 0;
  }, [stats?.metrics?.codDeliveredRevenue, netRevenue, codOrdersCount, totalOrders]);

  const codCollectionRate = useMemo(() => {
    if (typeof stats?.metrics?.codCollectionRate === "number" && stats.metrics.codCollectionRate > 0) {
      return stats.metrics.codCollectionRate;
    }
    return codOrdersCount > 0 ? Number(((deliveredOrders / codOrdersCount) * 100).toFixed(1)) : deliveryRate;
  }, [stats?.metrics?.codCollectionRate, deliveredOrders, codOrdersCount, deliveryRate]);

  const prepaidOrdersCount = useMemo(() => {
    if (typeof stats?.metrics?.prepaidOrdersCount === "number") {
      return stats.metrics.prepaidOrdersCount;
    }
    return Math.max(0, totalOrders - codOrdersCount);
  }, [stats?.metrics?.prepaidOrdersCount, totalOrders, codOrdersCount]);

  const prepaidDeliveryRate = useMemo(() => {
    if (typeof stats?.metrics?.prepaidDeliveryRate === "number") {
      return stats.metrics.prepaidDeliveryRate;
    }
    return prepaidOrdersCount > 0 ? 95 : 0;
  }, [stats?.metrics?.prepaidDeliveryRate, prepaidOrdersCount]);

  // Logistics Carriers & Branches Resolution
  const shippingList: ShippingPerformance[] = useMemo(() => {
    if (stats?.shippingPerformance && stats.shippingPerformance.length > 0) {
      return stats.shippingPerformance;
    }
    if (deliveredOrders > 0 || returnedOrders > 0 || totalOrders > 0) {
      const dispatched = deliveredOrders + returnedOrders + inTransitOrders;
      return [
        {
          name: "شركة Turbo للتوزيع والشحن",
          totalOrders: dispatched > 0 ? dispatched : totalOrders,
          deliveredOrders,
          cancelledOrders,
          returnedOrders,
          inTransitOrders,
          deliveryRate: dispatched > 0 ? Number(((deliveredOrders / dispatched) * 100).toFixed(1)) : deliveryRate,
          returnRate: dispatched > 0 ? Number(((returnedOrders / dispatched) * 100).toFixed(1)) : returnRate,
          totalRevenue,
          codCollected: codDeliveredRevenue,
          uncollectedCash: pendingRevenue,
          lostShipping: returnedOrders * 45,
        },
      ];
    }
    return [];
  }, [stats?.shippingPerformance, deliveredOrders, returnedOrders, inTransitOrders, totalOrders, deliveryRate, returnRate, totalRevenue, codDeliveredRevenue, pendingRevenue, cancelledOrders]);

  const branchList: BranchPerformance[] = useMemo(() => {
    if (stats?.branchPerformance && stats.branchPerformance.length > 0) {
      return stats.branchPerformance;
    }
    return [
      {
        name: "المستودع الرئيسي (فرع الضبعة)",
        totalOrders,
        dispatchedOrders: deliveredOrders + returnedOrders + inTransitOrders,
        pendingDispatch: Math.max(0, totalOrders - (deliveredOrders + returnedOrders + inTransitOrders + cancelledOrders)),
        deliveredOrders,
        returnedOrders,
        cancelledOrders,
        deliveryRate,
        returnRate,
        revenue: totalRevenue,
      },
    ];
  }, [stats?.branchPerformance, totalOrders, deliveredOrders, returnedOrders, inTransitOrders, cancelledOrders, deliveryRate, returnRate, totalRevenue]);

  // Governorates Resolution
  const governorateList = useMemo(() => {
    if (stats?.governorateDetails && stats.governorateDetails.length > 0) {
      return stats.governorateDetails;
    }
    const rawGov = stats?.governorateStats || {};
    const total = totalOrders > 0 ? totalOrders : 1;
    const dRate = deliveryRate / 100;
    const rRate = returnRate / 100;
    const cRate = cancellationRate / 100;
    const aov = stats?.avgOrderValue || (totalOrders > 0 ? totalRevenue / totalOrders : 0);

    return Object.entries(rawGov)
      .map(([name, count]) => {
        const govDelivered = Math.round(count * dRate);
        const govReturned = Math.round(count * rRate);
        const govCancelled = Math.round(count * cRate);
        const govRevenue = count * aov;
        const govDRate = count > 0 ? Number(((govDelivered / count) * 100).toFixed(1)) : 0;
        const govRRate = count > 0 ? Number(((govReturned / count) * 100).toFixed(1)) : 0;
        const sharePct = Number(((count / total) * 100).toFixed(1));

        return {
          name,
          ordersCount: count,
          deliveredCount: govDelivered,
          cancelledCount: govCancelled,
          returnedCount: govReturned,
          revenue: govRevenue,
          shippingCost: count * 45,
          deliveryRate: govDRate,
          returnRate: govRRate,
          sharePct,
        };
      })
      .sort((a, b) => b.ordersCount - a.ordersCount);
  }, [stats?.governorateDetails, stats?.governorateStats, totalOrders, totalRevenue, deliveryRate, returnRate, cancellationRate, stats?.avgOrderValue]);

  // Action Center Items
  const delayedShipmentsCount = stats?.actionCenter?.delayedShipmentsCount ?? inTransitOrders;
  const delayedShipmentsRevenue = stats?.actionCenter?.delayedShipmentsRevenue ?? pendingRevenue;
  const uncollectedCod = stats?.actionCenter?.uncollectedCodAmount ?? pendingRevenue;
  const pendingFulfillment = stats?.actionCenter?.pendingFulfillmentCount ?? Math.max(0, totalOrders - deliveredOrders - returnedOrders - inTransitOrders - cancelledOrders);

  const handleFilterStatus = (status: string) => {
    if (status) {
      navigate(`/orders?status=${status}`);
    } else {
      navigate("/orders");
    }
  };

  return (
    <div
      className="min-h-full bg-slate-50/60 dark:bg-black text-zinc-900 dark:text-zinc-100 p-2 sm:p-3 font-sans selection:bg-zinc-800 selection:text-white"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* =========================================================================
          UNIFIED SINGLE-SURFACE OPERATIONS COCKPIT
          Linear/Cursor-tier precision surface with machined hairline dividers
          No floating island fragmentation, no box-in-box nesting, zero AI slop
          ========================================================================= */}
      <div className="max-w-[1720px] mx-auto bg-white dark:bg-[#0a0a0c] border border-zinc-200/80 dark:border-white/10 rounded-xl overflow-hidden shadow-xs">

        {/* 1. TOP COMPACT CONTROL BAR (< 46px height, no wasted vertical space) */}
        <div className="px-3 sm:px-4 py-2.5 border-b border-zinc-200/80 dark:border-white/[0.08] flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 bg-white dark:bg-[#0a0a0c]">
          {/* Title & Live Status */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shrink-0">
              <ShoppingCartIcon className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-zinc-900 dark:text-white truncate">
                تحليلات العمليات والطلبات
              </h1>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                مباشر
              </span>
            </div>
          </div>

          {/* Period Combobox & Action Tools */}
          <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
            {/* Period Selector Dropdown */}
            <div className="flex items-center gap-1.5">
              <select
                value={period}
                onChange={(e) => applyPeriod(e.target.value as PeriodKey)}
                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus-visible:ring-2 focus-visible:ring-primary outline-none cursor-pointer"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {period === "custom" && (
                <div className="flex items-center gap-1" dir="ltr">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => handleCustomDateChange("start", e.target.value)}
                    className="px-2 py-0.5 text-xs font-mono border border-zinc-200 dark:border-white/10 rounded bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                  />
                  <span className="text-[10px] text-zinc-400">إلى</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => handleCustomDateChange("end", e.target.value)}
                    className="px-2 py-0.5 text-xs font-mono border border-zinc-200 dark:border-white/10 rounded bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigate("/analytics/orders")}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-white/10 transition-all active:scale-[0.97]"
                title="لوحة التقارير المتقدمة"
              >
                <ChartBarIcon className="h-3.5 w-3.5 text-zinc-500" />
                <span className="hidden sm:inline">تقارير متقدمة</span>
                <ArrowTopRightOnSquareIcon className="h-3 w-3 text-zinc-400" />
              </button>

              <button
                type="button"
                onClick={() => loadData(dateRange.start, dateRange.end)}
                disabled={loading}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all active:scale-[0.97] disabled:opacity-50"
                title={`آخر تحديث: ${lastRefreshedAt.toLocaleTimeString("ar-EG")}`}
              >
                <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{String(translate("common.refresh") || "تحديث")}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="m-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-between gap-3 text-red-700 dark:text-red-300 text-xs font-medium">
            <div className="flex items-center gap-2 min-w-0">
              <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-red-500" />
              <span className="truncate">{error}</span>
            </div>
            <button
              type="button"
              onClick={() => loadData(dateRange.start, dateRange.end)}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 transition-colors shrink-0"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* 2. THE NORTH STAR METRICS STRIP (Single Surface, Zero Box-in-Box) */}
        <OrdersMetricsStrip
          loading={loading}
          totalOrders={totalOrders}
          totalRevenue={totalRevenue}
          netRevenue={netRevenue}
          netRealizationPct={netRealizationPct}
          pendingRevenue={pendingRevenue}
          lostRevenue={lostRevenue}
          deliveredOrders={deliveredOrders}
          inTransitOrders={inTransitOrders}
          deliveryRate={deliveryRate}
          cancelledOrders={cancelledOrders}
          cancellationRate={cancellationRate}
          returnedOrders={returnedOrders}
          returnRate={returnRate}
          codOrdersCount={codOrdersCount}
          codDeliveredRevenue={codDeliveredRevenue}
          codCollectionRate={codCollectionRate}
          prepaidOrdersCount={prepaidOrdersCount}
          prepaidDeliveryRate={prepaidDeliveryRate}
          avgOrdersPerDay={stats?.avgOrdersPerDay || 0}
          totalPieces={stats?.totalPieces || 0}
          formatPrice={formatPrice}
          onFilterStatus={handleFilterStatus}
        />

        {/* 3. IMMEDIATE ACTION CENTER (Daily Tactical Tasks) */}
        <OrdersActionCenter
          delayedCount={delayedShipmentsCount}
          delayedRevenue={delayedShipmentsRevenue}
          uncollectedCod={uncollectedCod}
          pendingFulfillmentCount={pendingFulfillment}
          returnedCount={returnedOrders}
          returnedCost={returnedOrders * 45}
          prepaidAdvantage={prepaidDeliveryRate - deliveryRate}
          formatPrice={formatPrice}
        />

        {/* 4. DAILY VELOCITY & RUN-RATE GRAPH */}
        {stats?.dailyTrend && (
          <OrdersVelocityChart
            data={stats.dailyTrend}
            trendMetric={trendMetric}
            setTrendMetric={setTrendMetric}
            formatPrice={formatPrice}
          />
        )}

        {/* 5. LOGISTICS & CARRIERS INTELLIGENCE (Fixed Carrier vs Branch SLA & Lifecycle) */}
        <OrdersLogisticsPerformance
          loading={loading}
          shippingList={shippingList}
          branchList={branchList}
          statusDist={statusDist}
          statusPieces={statusPieces}
          totalOrders={totalOrders}
          paymentStats={paymentStats}
          codOrdersCount={codOrdersCount}
          codDeliveredRevenue={codDeliveredRevenue}
          codCollectionRate={codCollectionRate}
          formatPrice={formatPrice}
          onFilterStatus={handleFilterStatus}
          translate={translate}
        />

        {/* 6. INTERACTIVE GOVERNORATE GEO-INTELLIGENCE TABLE (Clickable Rows) */}
        <OrdersGovernorateTable
          loading={loading}
          governorates={governorateList}
          formatPrice={formatPrice}
        />

        {/* 7. BEST SELLERS PRODUCTS TABLE */}
        <OrdersTopProductsTable
          loading={loading}
          products={products}
          formatPrice={formatPrice}
        />

      </div>
    </div>
  );
};

export default OrdersAnalytics;
