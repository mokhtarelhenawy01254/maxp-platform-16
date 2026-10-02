import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowDownTrayIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import analyticsService from "../../../services/analyticsService";
import PeriodSelector, {
  PeriodRange,
} from "../../../components/common/PeriodSelector";
import { useAuth } from "../../../hooks/useAuthSimple";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  createStorageKey,
  getWithExpiry,
  setWithExpiry,
} from "../../../utils/storage";

import { DashboardStats } from "./overview/types";
import OverviewAlertBanner from "./overview/OverviewAlertBanner";
import OverviewKpiStrip from "./overview/OverviewKpiStrip";
import OverviewPipelineFlow from "./overview/OverviewPipelineFlow";
import OverviewDualTrendChart from "./overview/OverviewDualTrendChart";
import OverviewPulseMatrix from "./overview/OverviewPulseMatrix";

const OverviewDashboard: React.FC = () => {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [exporting, setExporting] = useState(false);
  const CACHE_TTL_MS = 60_000;

  const handleExportOrders = async () => {
    try {
      setExporting(true);
      const params: Record<string, string> = {};
      if (range?.startDate) params["startDate"] = range.startDate;
      if (range?.endDate) params["endDate"] = range.endDate;

      const response = await apiClient.get("/orders/export", {
        params,
        responseType: "blob",
      });

      const blob = new Blob([response.data as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const dateSuffix =
        range?.period ||
        (range?.startDate ? `${range.startDate}_to_${range.endDate}` : "all");
      link.download = `orders-analytics-${dateSuffix}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("تم تصدير ملف الطلبات بنجاح");
    } catch (err: any) {
      toast.error(err?.message || "فشل تصدير ملف الطلبات");
    } finally {
      setExporting(false);
    }
  };

  const cacheKey = useMemo(() => {
    let companyId = "unknown";
    const storefrontCompanyId = localStorage.getItem("storefront_companyId");
    if (storefrontCompanyId) {
      companyId = storefrontCompanyId;
    } else if (user?.companyId || user?.company?.id) {
      companyId = user?.companyId || user?.company?.id || companyId;
    } else {
      try {
        const storedCompany = localStorage.getItem("company");
        if (storedCompany) {
          const parsedCompany = JSON.parse(storedCompany) as { id?: string } | null;
          companyId = parsedCompany?.id || companyId;
        }
      } catch {
        // ignore fallback
      }
    }

    return createStorageKey(
      "orders-overview-dashboard-v2",
      `${companyId}:${range?.period || ""}:${range?.startDate || ""}:${range?.endDate || ""}`,
    );
  }, [range, user?.company?.id, user?.companyId]);

  const fetchDashboardData = useCallback(
    async ({
      signal,
      background = false,
    }: { signal?: AbortSignal; background?: boolean } = {}) => {
      try {
        if (!background) {
          setLoading(true);
          setError(null);
        }

        const [storeResult, dailyResult, codResult, todayOpsResult] =
          await Promise.allSettled([
            analyticsService.getStoreAnalytics(
              range?.period,
              range?.startDate,
              range?.endDate,
              undefined,
              signal,
            ),
            analyticsService.getDailyAnalytics(
              range?.period,
              range?.startDate,
              range?.endDate,
              signal,
            ),
            analyticsService.getCODPerformanceAnalytics(
              range?.period,
              range?.startDate,
              range?.endDate,
            ),
            analyticsService.getTodayOps(),
          ]);

        const storeVal = storeResult.status === "fulfilled" ? (storeResult.value as any) : null;
        const dailyVal = dailyResult.status === "fulfilled" ? (dailyResult.value as any) : null;
        const codVal = codResult.status === "fulfilled" ? (codResult.value as any) : null;
        const todayOpsVal = todayOpsResult.status === "fulfilled" ? (todayOpsResult.value as any) : null;

        if (storeVal?.success) {
          const storeStats = storeVal.data || {};
          const dailyTrend = dailyVal?.success ? dailyVal.data || [] : [];
          const codStats = codVal?.success ? codVal.data || {} : {};
          const todayOps = todayOpsVal?.success ? todayOpsVal.data || {} : {};

          const aov = Number(
            storeStats.averageOrderValue ?? storeStats.avgOrderValue ?? 0,
          );
          const ordersByStatus = storeStats.ordersByStatus || {};

          const nextStats: DashboardStats = {
            totalOrders: Number(storeStats.totalOrders || 0),
            completedOrders: Number(
              storeStats.completedOrders || ordersByStatus.delivered || 0,
            ),
            cancelledOrders: Number(
              storeStats.cancelledOrders || ordersByStatus.cancelled || 0,
            ),
            returnedOrders: Number(
              storeStats.returnedOrders || ordersByStatus.returned || 0,
            ),
            pendingOrders: Number(
              storeStats.pendingOrders || ordersByStatus.pending || 0,
            ),
            processingOrders: Number(
              ordersByStatus.processing || ordersByStatus.preparations || 0,
            ),
            shippedOrders: Number(ordersByStatus.shipped || 0),
            confirmedOrders: Number(ordersByStatus.confirmed || 0),
            totalRevenue: Number(storeStats.totalRevenue || 0),
            averageOrderValue: isNaN(aov) ? 0 : aov,
            deliveryRate: Number(
              storeStats.deliveryRate || codStats.successRate || 0,
            ),
            multiPieceOrders: Number(storeStats.multiPieceOrders || 0),
            multiPiecePercentage: Number(storeStats.multiPiecePercentage || 0),
            singlePieceOrders: Number(storeStats.singlePieceOrders || 0),
            totalPieces: Number(storeStats.totalPieces || 0),
            codOrders: Number(storeStats.codOrders || 0),
            prepaidOrders: Number(storeStats.prepaidOrders || 0),
            lostRevenue: Number(codStats.lostRevenue || 0),
            returnRate: Number(codStats.returnRate || 0),
            cancellationRate: Number(codStats.cancellationRate || 0),
            dailyTrend,
            prevPeriod: storeStats.prevPeriod || null,
            regionalPerformance: codStats.regionalPerformance || [],
            todayPendingCount:
              (todayOps?.daySnapshot?.pendingList?.length || 0) +
              (todayOps?.daySnapshot?.pendingListGuests?.length || 0),
            todayConfirmsCount: todayOps?.todayActions?.confirms || 0,
          };

          setStats(nextStats);
          setWithExpiry(cacheKey, nextStats, CACHE_TTL_MS);
        } else if (storeResult.status === "rejected") {
          throw storeResult.reason;
        }
      } catch (err: any) {
        if (!background) {
          setError(err.message || "حدث خطأ في جلب بيانات التحليلات");
        }
      } finally {
        if (!background) {
          setLoading(false);
        }
      }
    },
    [cacheKey, range],
  );

  useEffect(() => {
    const controller = new AbortController();
    const cached = getWithExpiry<DashboardStats>(cacheKey);

    if (cached) {
      setStats(cached);
      setLoading(false);
      fetchDashboardData({ signal: controller.signal, background: true });
    } else {
      fetchDashboardData({ signal: controller.signal });
    }

    return () => controller.abort();
  }, [cacheKey, fetchDashboardData]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[360px]">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/20 p-6 rounded-xl border border-rose-200 dark:border-rose-900/30 text-center">
        <XCircleIcon className="h-10 w-10 text-rose-500 mx-auto mb-3" />
        <p className="text-rose-700 dark:text-rose-300 text-sm font-medium">{error}</p>
        <button
          type="button"
          onClick={() => fetchDashboardData()}
          className="mt-3 px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 active:scale-[0.98] transition-all"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4 sm:space-y-5" dir="rtl">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-gray-100 dark:border-white/5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            نظرة عامة على أداء الطلبات
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            مركز القيادة التنفيذي: مؤشرات التسليم والسيولة وحركة دورة حياة الأوردر
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          <button
            type="button"
            onClick={handleExportOrders}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#121214] text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
            title="تصدير بيانات الطلبات للفترة المحددة بصيغة Excel"
          >
            <ArrowDownTrayIcon
              className={`h-3.5 w-3.5 ${exporting ? "animate-bounce" : ""}`}
            />
            <span>{exporting ? "جاري التصدير…" : "تصدير (Excel)"}</span>
          </button>
          <PeriodSelector onRangeChange={setRange} />
        </div>
      </div>

      {/* 2. Operational Alert Banner */}
      <OverviewAlertBanner
        pendingCount={stats.todayPendingCount}
        lostRevenue={stats.lostRevenue}
        formattedLostRevenue={formatPrice(stats.lostRevenue)}
        cancellationRate={stats.cancellationRate}
      />

      {/* 3. Executive KPI Strip */}
      <OverviewKpiStrip stats={stats} formatPrice={formatPrice} />

      {/* 4. Asymmetrical Bento: Trend Chart & Velocity Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <OverviewDualTrendChart
            data={stats.dailyTrend}
            formatPrice={formatPrice}
          />
        </div>
        <div className="lg:col-span-5">
          <OverviewPipelineFlow stats={stats} />
        </div>
      </div>

      {/* 5. Executive Live Pulse Matrix */}
      <OverviewPulseMatrix stats={stats} formatPrice={formatPrice} />
    </div>
  );
};

export default OverviewDashboard;
