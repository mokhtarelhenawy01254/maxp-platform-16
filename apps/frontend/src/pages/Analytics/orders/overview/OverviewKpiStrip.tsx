import React from "react";
import { Link } from "react-router-dom";
import {
  ShoppingCartIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  RectangleStackIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { DashboardStats } from "./types";

interface OverviewKpiStripProps {
  stats: DashboardStats;
  formatPrice: (val: number) => string;
}

export const OverviewKpiStrip: React.FC<OverviewKpiStripProps> = ({
  stats,
  formatPrice,
}) => {
  const calcDelta = (current: number, prev?: number | null) => {
    if (prev === undefined || prev === null || prev === 0) return null;
    const delta = ((current - prev) / prev) * 100;
    return delta;
  };

  const ordersDelta = calcDelta(stats.totalOrders, stats.prevPeriod?.totalOrders);
  const revenueDelta = calcDelta(stats.totalRevenue, stats.prevPeriod?.revenue);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
      {/* 1. إجمالي الطلبات */}
      <Link
        to="/analytics/orders/orders"
        className="group relative flex flex-col justify-between rounded-xl border border-gray-200/80 bg-white p-3.5 sm:p-4 shadow-sm hover:border-blue-400/60 dark:border-white/10 dark:bg-[#121214] dark:hover:border-blue-500/40 transition-all hover:shadow-md"
      >
        <div>
          <div className="flex items-center justify-between gap-1 text-gray-500 dark:text-gray-400">
            <span className="text-xs font-medium">إجمالي الطلبات</span>
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 p-1.5 text-blue-600 dark:text-blue-400">
              <ShoppingCartIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white tabular-nums">
              {stats.totalOrders.toLocaleString()}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">طلب</span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs">
          {ordersDelta !== null ? (
            <span
              className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${
                ordersDelta >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {ordersDelta >= 0 ? (
                <ArrowTrendingUpIcon className="h-3 w-3" />
              ) : (
                <ArrowTrendingDownIcon className="h-3 w-3" />
              )}
              {ordersDelta >= 0 ? "+" : ""}
              {ordersDelta.toFixed(1)}%
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">الفترة الحالية</span>
          )}
          <span className="text-[11px] text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            تفاصيل ↗
          </span>
        </div>
      </Link>

      {/* 2. معدل التسليم الصافي */}
      <Link
        to="/analytics/orders/delivery-rate"
        className="group relative flex flex-col justify-between rounded-xl border border-gray-200/80 bg-white p-3.5 sm:p-4 shadow-sm hover:border-emerald-400/60 dark:border-white/10 dark:bg-[#121214] dark:hover:border-emerald-500/40 transition-all hover:shadow-md"
      >
        <div>
          <div className="flex items-center justify-between gap-1 text-gray-500 dark:text-gray-400">
            <span className="text-xs font-medium">معدل التسليم الصافي</span>
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircleIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              {stats.deliveryRate > 0
                ? `${stats.deliveryRate.toFixed(1)}%`
                : stats.totalOrders > 0
                ? `${((stats.completedOrders / stats.totalOrders) * 100).toFixed(1)}%`
                : "0.0%"}
            </span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400 tabular-nums text-[11px]">
            {stats.completedOrders.toLocaleString()} مسلّم بنجاح
          </span>
          <span className="text-[11px] text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            نسب الشحن ↗
          </span>
        </div>
      </Link>

      {/* 3. إجمالي الإيرادات */}
      <Link
        to="/analytics/orders/revenue"
        className="group relative flex flex-col justify-between rounded-xl border border-gray-200/80 bg-white p-3.5 sm:p-4 shadow-sm hover:border-purple-400/60 dark:border-white/10 dark:bg-[#121214] dark:hover:border-purple-500/40 transition-all hover:shadow-md"
      >
        <div>
          <div className="flex items-center justify-between gap-1 text-gray-500 dark:text-gray-400">
            <span className="text-xs font-medium">إجمالي الإيرادات</span>
            <div className="rounded-lg bg-purple-50 dark:bg-purple-950/40 p-1.5 text-purple-600 dark:text-purple-400">
              <CurrencyDollarIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white tabular-nums truncate">
              {formatPrice(stats.totalRevenue)}
            </span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs">
          {revenueDelta !== null ? (
            <span
              className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${
                revenueDelta >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {revenueDelta >= 0 ? "+" : ""}
              {revenueDelta.toFixed(1)}%
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">المبيعات المؤكدة</span>
          )}
          <span className="text-[11px] text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            الإيراد ↗
          </span>
        </div>
      </Link>

      {/* 4. متوسط قيمة الطلب (AOV) */}
      <div className="relative flex flex-col justify-between rounded-xl border border-gray-200/80 bg-white p-3.5 sm:p-4 shadow-sm dark:border-white/10 dark:bg-[#121214]">
        <div>
          <div className="flex items-center justify-between gap-1 text-gray-500 dark:text-gray-400">
            <span className="text-xs font-medium">متوسط قيمة الطلب</span>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 p-1.5 text-amber-600 dark:text-amber-400">
              <ArrowTrendingUpIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white tabular-nums truncate">
              {formatPrice(stats.averageOrderValue)}
            </span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
          <span className="text-[11px]">معدل سلة الشراء (AOV)</span>
        </div>
      </div>

      {/* 5. الطلبات متعددة القطع */}
      <div className="relative flex flex-col justify-between rounded-xl border border-gray-200/80 bg-white p-3.5 sm:p-4 shadow-sm dark:border-white/10 dark:bg-[#121214]">
        <div>
          <div className="flex items-center justify-between gap-1 text-gray-500 dark:text-gray-400">
            <span className="text-xs font-medium">الطلبات متعددة القطع</span>
            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/40 p-1.5 text-indigo-600 dark:text-indigo-400">
              <RectangleStackIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white tabular-nums">
              {stats.multiPieceOrders.toLocaleString()}
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 tabular-nums">
              {stats.multiPiecePercentage || 0}%
            </span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
          <span className="text-[11px] tabular-nums">
            {stats.totalPieces > 0 ? `${stats.totalPieces} قطعة مباعة` : "قطعتين أو أكثر"}
          </span>
        </div>
      </div>

      {/* 6. فاقد الإلغاء والمرتجع */}
      <Link
        to="/analytics/orders/cancellations"
        className="group relative flex flex-col justify-between rounded-xl border border-gray-200/80 bg-white p-3.5 sm:p-4 shadow-sm hover:border-rose-400/60 dark:border-white/10 dark:bg-[#121214] dark:hover:border-rose-500/40 transition-all hover:shadow-md"
      >
        <div>
          <div className="flex items-center justify-between gap-1 text-gray-500 dark:text-gray-400">
            <span className="text-xs font-medium">الإلغاء والمرتجع</span>
            <div className="rounded-lg bg-rose-50 dark:bg-rose-950/40 p-1.5 text-rose-600 dark:text-rose-400">
              <ExclamationCircleIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
              {(stats.cancelledOrders + stats.returnedOrders).toLocaleString()}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              ({stats.totalOrders > 0
                ? `${(((stats.cancelledOrders + stats.returnedOrders) / stats.totalOrders) * 100).toFixed(1)}%`
                : "0%"})
            </span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs">
          <span className="text-gray-400 dark:text-gray-500 text-[11px] tabular-nums truncate">
            {stats.lostRevenue > 0
              ? `فاقد ${formatPrice(stats.lostRevenue)}`
              : `${stats.cancelledOrders} ملغي / ${stats.returnedOrders} مرتجع`}
          </span>
          <span className="text-[11px] text-gray-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
            تحليل ↗
          </span>
        </div>
      </Link>
    </div>
  );
};

export default OverviewKpiStrip;
