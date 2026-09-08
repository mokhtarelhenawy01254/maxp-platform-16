import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ChartBarIcon,
  XCircleIcon,
  InformationCircleIcon,
  ArrowTrendingUpIcon,
  ShoppingCartIcon,
  CreditCardIcon,
  CheckCircleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import PeriodSelector, {
  PeriodRange,
} from "../../../components/common/PeriodSelector";
import StoreAnalyticsTabs from "../StoreAnalyticsTabs";

interface ConversionStats {
  visits?: number;
  purchases?: number;
  addToCarts?: number;
  checkouts?: number;
  directOrders?: number;
  overallRate: number;
  visitorToCart: number;
  cartToCheckout: number;
  checkoutToOrder: number;
  dailyTrends: Array<{ date: string; rate: number }>;
}

const ConversionRateAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [stats, setStats] = useState<ConversionStats | null>(null);

  useEffect(() => {
    if (range) {
      void fetchData();
    }
  }, [range]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsService.getConversionRateAnalytics(
        range?.startDate,
        range?.endDate,
      );
      if (response?.success && response?.data) {
        setStats(response.data);
      } else {
        setStats({
          overallRate: 0,
          visitorToCart: 0,
          cartToCheckout: 0,
          checkoutToOrder: 0,
          dailyTrends: [],
        });
      }
    } catch (err: unknown) {
      console.error("ConversionRateAnalytics error:", err);
      const message =
        err instanceof Error ? err.message : t("conversionAnalytics.fetchError");
      setError(message || t("conversionAnalytics.fetchError"));
    } finally {
      setLoading(false);
    }
  };

  const isDirectOrderStore =
    (stats?.overallRate ?? 0) > 0 &&
    (stats?.visitorToCart ?? 0) === 0 &&
    (stats?.purchases ?? 0) > 0;

  const header = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {t("conversionAnalytics.title")}
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t("conversionAnalytics.subtitle")}
        </p>
      </div>
      <PeriodSelector onRangeChange={setRange} />
    </div>
  );

  return (
    <div className="mx-auto max-w-[1480px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6" dir="rtl">
      <StoreAnalyticsTabs />

      {header}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-xs sm:text-sm text-primary dark:border-primary/30 dark:bg-primary/10">
        <div className="flex items-center gap-2">
          <SparklesIcon className="size-4.5 shrink-0" />
          <span>
            تتوفر تجربة الاستخبارات الموحدة لعام 2026 مع النبض الحي ومسار الـ COD الكامل في مركز أداء المتجر.
          </span>
        </div>
        <Link
          to="/analytics/store"
          className="shrink-0 font-bold underline hover:opacity-80"
        >
          الانتقال للمركز الموحد ⬅️
        </Link>
      </div>

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
            {t("conversionAnalytics.retry")}
          </button>
        </div>
      ) : (
        <>
          {/* Direct checkout callout if store bypasses cart */}
          {isDirectOrderStore && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 text-xs sm:text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
              <InformationCircleIcon className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <span className="font-bold">ملاحظة مسار الطلب المباشر:</span>{" "}
                المتجر يسجل طلبات شراء مباشرة عبر صفحة المنتج (Quick Order / Buy Now) دون المرور بسلة المشتريات، لذا يعتمد القياس الفعلي على معدل التحويل الإجمالي.
              </div>
            </div>
          )}

          {/* Key KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <ChartBarIcon className="size-5 sm:size-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {t("conversionAnalytics.overallRate")}
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-0.5">
                    {stats?.overallRate?.toFixed(1)}%
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
                إجمالي الطلبات المكتملة مقارنة بالزيارات
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShoppingCartIcon className="size-5 sm:size-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {t("conversionAnalytics.visitorToCart")}
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {stats?.visitorToCart?.toFixed(1)}%
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
                نسبة الزوار الذين أضافوا منتجاً إلى السلة
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <CreditCardIcon className="size-5 sm:size-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {t("conversionAnalytics.cartToCheckout")}
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                    {stats?.cartToCheckout?.toFixed(1)}%
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
                نسبة الانتقال من السلة إلى شاشة الدفع
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <CheckCircleIcon className="size-5 sm:size-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {t("conversionAnalytics.checkoutToOrder")}
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                    {stats?.checkoutToOrder?.toFixed(1)}%
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
                نسبة إتمام الطلب بعد فتح شاشة الدفع
              </p>
            </div>
          </div>

          {/* Daily Trend Chart */}
          <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/80">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ArrowTrendingUpIcon className="size-5 text-primary" />
                  {t("conversionAnalytics.trend")}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  تغير معدل التحويل يوماً بيوم خلال الفترة المحددة
                </p>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {(stats?.dailyTrends?.length || 0)} نقطة بيانية
              </span>
            </div>

            <div className="min-w-0 h-[300px] sm:h-[360px]">
              {stats?.dailyTrends && stats.dailyTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <LineChart data={stats.dailyTrends}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#9CA3AF"
                      opacity={0.15}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
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
                      unit="%"
                    />
                    <Tooltip
                      formatter={(value: any) => [`${value}%`, t("conversionAnalytics.rate")]}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid rgba(156, 163, 175, 0.2)",
                        backgroundColor: "rgba(17, 24, 39, 0.95)",
                        color: "#fff",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#2563EB" }}
                      activeDot={{ r: 5 }}
                      name={t("conversionAnalytics.rate")}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs sm:text-sm text-gray-400">
                  لا توجد بيانات حركة كافية لرسم المنحنى اليومي خلال الفترة المحددة.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ConversionRateAnalytics;
