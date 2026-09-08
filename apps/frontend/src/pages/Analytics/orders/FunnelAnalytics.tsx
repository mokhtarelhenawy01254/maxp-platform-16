import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FunnelIcon,
  XCircleIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  TruckIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import PeriodSelector, {
  PeriodRange,
} from "../../../components/common/PeriodSelector";
import StoreAnalyticsTabs from "../StoreAnalyticsTabs";

interface FunnelStats {
  funnelSteps: Array<{
    key?: string;
    step: string;
    count: number;
    rate: number;
  }>;
  supportingSignals?: {
    addToCarts?: number;
  };
  overallConversionRate: number;
  deliveryRate?: number;
  deliveredOrders?: number;
  purchases?: number;
  biggestDropOff: {
    from: string;
    to: string;
    dropRate: number;
  };
}

const STEP_COLORS = [
  "#2563EB", // visits - blue
  "#0284C7", // views - sky
  "#F59E0B", // started_orders - amber
  "#10B981", // purchases - emerald
  "#8B5CF6", // delivered - purple
];

const FunnelAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [stats, setStats] = useState<FunnelStats | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsService.getFunnelAnalytics(
        range?.period,
        range?.startDate,
        range?.endDate,
      );
      if (response?.success && response?.data) {
        setStats(response.data);
      } else {
        setStats({
          funnelSteps: [],
          overallConversionRate: 0,
          biggestDropOff: { from: "", to: "", dropRate: 0 },
        });
      }
    } catch (err: unknown) {
      console.error("FunnelAnalytics error:", err);
      const message =
        err instanceof Error ? err.message : t("funnelAnalytics.fetchError");
      setError(message || t("funnelAnalytics.fetchError"));
    } finally {
      setLoading(false);
    }
  }, [range, t]);

  useEffect(() => {
    if (range) {
      void fetchData();
    }
  }, [range, fetchData]);

  const totalVisits = stats?.funnelSteps?.[0]?.count ?? 0;
  const purchasesCount =
    stats?.purchases ??
    stats?.funnelSteps?.find((s) => s.key === "purchases")?.count ??
    0;
  const deliveredCount =
    stats?.deliveredOrders ??
    stats?.funnelSteps?.find((s) => s.key === "delivered")?.count ??
    0;

  const header = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {t("funnelAnalytics.title")}
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t("funnelAnalytics.subtitle")}
        </p>
      </div>
      <PeriodSelector onRangeChange={setRange} />
    </div>
  );

  return (
    <div className="mx-auto max-w-[1480px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6" dir="rtl">
      <StoreAnalyticsTabs />

      {header}

      {loading ? (
        <div className="flex items-center justify-center min-h-[350px] rounded-2xl border border-gray-100 bg-white/50 dark:border-gray-800 dark:bg-gray-900/50">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl text-center border border-red-200 dark:border-red-800">
          <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <p className="text-sm sm:text-base text-red-600 dark:text-red-400 font-medium">
            {error}
          </p>
          <button
            onClick={() => void fetchData()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-medium transition"
          >
            {t("funnelAnalytics.retry")}
          </button>
        </div>
      ) : (
        <>
          {/* Executive Briefing Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <FunnelIcon className="size-5 sm:size-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {t("funnelAnalytics.overallConversionRate")}
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-0.5">
                    {typeof stats?.overallConversionRate === "number"
                      ? stats.overallConversionRate.toFixed(1)
                      : "0.0"}
                    %
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
                نسبة إتمام الطلبات مقارنة بزيارات المتجر
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <UserGroupIcon className="size-5 sm:size-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    إجمالي الزيارات
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-0.5">
                    {totalVisits.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
                المدخل الرئيسي لمسار الشراء
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShoppingBagIcon className="size-5 sm:size-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    الطلبات المكتملة
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {purchasesCount.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
                الطلبات المنشأة داخل المتجر
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <TruckIcon className="size-5 sm:size-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    نسبة التسليم للشحنات
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                    {typeof stats?.deliveryRate === "number"
                      ? `${stats.deliveryRate.toFixed(1)}%`
                      : `${deliveredCount} طلب`}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
                الطلبات المستلمة بنجاح من إجمالي المشحون
              </p>
            </div>
          </div>

          {/* Supporting Signals Note */}
          {typeof stats?.supportingSignals?.addToCarts === "number" && (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 text-xs sm:text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
              <div className="flex items-center justify-between font-semibold">
                <span>{t("funnelAnalytics.supportingSignalTitle")}</span>
                <span>
                  {t("funnelAnalytics.addToCartSignal")}:{" "}
                  {stats.supportingSignals.addToCarts.toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-[11px] sm:text-xs text-amber-700/90 dark:text-amber-400">
                {t("funnelAnalytics.directOrderNote")}
              </p>
            </div>
          )}

          {/* Funnel Bar Chart */}
          {stats?.funnelSteps && stats.funnelSteps.length > 0 && (
            <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4">
                {t("funnelAnalytics.funnelStages")}
              </h3>
              <div className="min-w-0 h-[280px] sm:h-[350px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={stats.funnelSteps}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#9CA3AF"
                      opacity={0.15}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="step"
                      stroke="#9CA3AF"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(value: any) => [Number(value).toLocaleString(), t("funnelAnalytics.count")]}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid rgba(156, 163, 175, 0.2)",
                        backgroundColor: "rgba(17, 24, 39, 0.95)",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {stats.funnelSteps.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={STEP_COLORS[index % STEP_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Stage Details Breakdown */}
          <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4">
              {t("funnelAnalytics.stagesDetails")}
            </h3>
            <div className="space-y-4">
              {stats?.funnelSteps?.map((step, index) => {
                const dropRate =
                  index > 0 && stats.funnelSteps[index - 1].count > 0
                    ? 100 - (step.count / stats.funnelSteps[index - 1].count) * 100
                    : 0;
                const visualRate = Math.max(0, Math.min(100, step.rate));
                const hint =
                  step.key === "views" && step.rate > 100
                    ? t("funnelAnalytics.productViewsHint")
                    : step.key === "started_orders"
                      ? t("funnelAnalytics.startedOrderHint")
                      : null;

                const color = STEP_COLORS[index % STEP_COLORS.length];

                return (
                  <div
                    key={`${step.key || index}`}
                    className="border-b border-gray-100 dark:border-gray-800 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                          {step.step}
                        </h4>
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                        {step.count?.toLocaleString()}{" "}
                        <span className="text-[11px] text-gray-400">عميل / تفاعل</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${visualRate}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                        {hint && (
                          <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                            {hint}
                          </p>
                        )}
                      </div>

                      <span className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 min-w-[48px] text-left">
                        {typeof step.rate === "number" ? step.rate.toFixed(1) : "0.0"}%
                      </span>

                      {dropRate > 0 && (
                        <span className="text-xs font-semibold text-rose-500 dark:text-rose-400 min-w-[56px] text-left">
                          -{dropRate.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Biggest Drop-Off Insight */}
            {stats?.biggestDropOff && stats.biggestDropOff.dropRate > 0 && (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-rose-200/80 bg-rose-50/70 p-4 text-xs sm:text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
                <ExclamationTriangleIcon className="size-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                <div>
                  <h4 className="font-bold">
                    {t("funnelAnalytics.biggestDropOff")}
                  </h4>
                  <p className="mt-1 text-xs text-rose-800/90 dark:text-rose-300">
                    {t("funnelAnalytics.from")}{" "}
                    <span className="font-bold">{stats.biggestDropOff.from}</span>{" "}
                    {t("funnelAnalytics.to")}{" "}
                    <span className="font-bold">{stats.biggestDropOff.to}</span> —{" "}
                    {t("funnelAnalytics.dropRate")}:{" "}
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      {stats.biggestDropOff.dropRate.toFixed(1)}%
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default FunnelAnalytics;
