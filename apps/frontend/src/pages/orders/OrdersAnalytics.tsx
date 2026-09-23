import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowPathIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";

// Modular Analytics Components
import { useOrdersAnalyticsData } from "./analytics/useOrdersAnalyticsData";
import { OrdersMetricsStrip } from "./analytics/OrdersMetricsStrip";
import { OrdersDailyAveragesStrip } from "./analytics/OrdersDailyAveragesStrip";
import { OrdersVelocityChart } from "./analytics/OrdersVelocityChart";
import { OrdersLogisticsPerformance } from "./analytics/OrdersLogisticsPerformance";
import { OrdersGovernorateTable } from "./analytics/OrdersGovernorateTable";
import { OrdersTopProductsTable } from "./analytics/OrdersTopProductsTable";
import { PeriodKey } from "./analytics/types";

export const OrdersAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const {
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
    totalOrders,
    totalRevenue,
    deliveredOrders,
    deliveredPct,
    inTransitOrders,
    inTransitPct,
    warehouseOrders,
    warehousePct,
    unprocessedOrders,
    unprocessedPct,
    cancelledOrders,
    cancelledPct,
    returnedOrders,
    returnedPct,
    daysCount,
    avgOrdersPerDay,
    avgDeliveredPerDay,
    avgCancelledPerDay,
    avgReturnedPerDay,
    netRevenue,
    pendingRevenue,
    lostRevenue,
    netRealizationPct,
    codOrdersCount,
    prepaidOrdersCount,
    codCollectionRate,
    prepaidDeliveryRate,
    shippingList,
    branchList,
    governorateList,
    statusDist,
    statusPieces,
    paymentStats,
    translate,
  } = useOrdersAnalyticsData();

  const formatPrice = (amount: number): string => {
    return `${Math.round(amount || 0).toLocaleString()} ج.م`;
  };

  const handleFilterStatus = (status: string) => {
    if (status) {
      navigate(`/orders?status=${status}`);
    } else {
      navigate("/orders");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden bg-background">
      {/* 1. TOP UNIFIED COMMAND BAR (<46px) */}
      <header className="h-11 sm:h-12 border-b border-zinc-200/80 dark:border-white/[0.08] px-3 sm:px-4 bg-white/95 dark:bg-[#070709]/95 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">
            تحليلات العمليات والطلبات
          </h1>
          <span className="hidden md:inline-block text-[10px] text-zinc-400 font-mono">
            SaaS Cockpit 2026
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Period Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <select
                value={period}
                onChange={(e) => applyPeriod(e.target.value as PeriodKey)}
                aria-label="الفترة الزمنية"
                className="appearance-none ps-6 pe-7 py-1 text-xs font-semibold rounded-md border border-zinc-200/80 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-hidden hover:bg-zinc-100 cursor-pointer"
              >
                <option value="today">اليوم</option>
                <option value="yesterday">أمس</option>
                <option value="7">آخر 7 أيام</option>
                <option value="30">آخر 30 يوم</option>
                <option value="thisMonth">هذا الشهر</option>
                <option value="lastMonth">الشهر الماضي</option>
                <option value="90">آخر 3 أشهر</option>
                <option value="180">آخر 6 أشهر</option>
                <option value="365">آخر سنة</option>
                <option value="custom">فترة مخصصة</option>
              </select>
              <CalendarIcon className="h-3.5 w-3.5 text-zinc-400 absolute start-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {period === "custom" && (
              <div className="hidden sm:flex items-center gap-1">
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
      </header>

      {/* Error Bar */}
      {error && (
        <div className="p-2.5 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between gap-3 text-red-700 dark:text-red-300 text-xs font-medium">
          <div className="flex items-center gap-2 min-w-0">
            <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-red-500" />
            <span className="truncate">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadData(dateRange.start, dateRange.end)}
            className="px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 text-[11px] shrink-0"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* 2. SINGLE CONTINUOUS SURFACE: Clean Reporting Hierarchy */}
      <main className="flex-1 overflow-y-auto min-h-0 bg-background divide-y divide-zinc-200/80 dark:divide-white/[0.08]">
        
        {/* Strip 1: Total Orders & The 6 Operational Funnel Stages */}
        <OrdersMetricsStrip
          loading={loading}
          totalOrders={totalOrders}
          totalRevenue={totalRevenue}
          totalPieces={stats?.totalPieces || 0}
          deliveredOrders={deliveredOrders}
          deliveredPct={deliveredPct}
          inTransitOrders={inTransitOrders}
          inTransitPct={inTransitPct}
          warehouseOrders={warehouseOrders}
          warehousePct={warehousePct}
          unprocessedOrders={unprocessedOrders}
          unprocessedPct={unprocessedPct}
          cancelledOrders={cancelledOrders}
          cancelledPct={cancelledPct}
          returnedOrders={returnedOrders}
          returnedPct={returnedPct}
          formatPrice={formatPrice}
          onFilterStatus={handleFilterStatus}
        />

        {/* Strip 2: Daily Run-Rate Averages & Financial Realization */}
        <OrdersDailyAveragesStrip
          loading={loading}
          daysCount={daysCount}
          avgOrdersPerDay={avgOrdersPerDay}
          avgDeliveredPerDay={avgDeliveredPerDay}
          avgCancelledPerDay={avgCancelledPerDay}
          avgReturnedPerDay={avgReturnedPerDay}
          netRevenue={netRevenue}
          pendingRevenue={pendingRevenue}
          lostRevenue={lostRevenue}
          netRealizationPct={netRealizationPct}
          totalRevenue={totalRevenue}
          totalOrders={totalOrders}
          codOrdersCount={codOrdersCount}
          prepaidOrdersCount={prepaidOrdersCount}
          codCollectionRate={codCollectionRate}
          prepaidDeliveryRate={prepaidDeliveryRate}
          formatPrice={formatPrice}
        />

        {/* Strip 3: Daily Flow Velocity */}
        {stats?.dailyTrend && (
          <OrdersVelocityChart
            data={stats.dailyTrend}
            trendMetric={trendMetric}
            setTrendMetric={setTrendMetric}
            formatPrice={formatPrice}
          />
        )}

        {/* Strip 4: Logistics Performance & Status Breakdown */}
        <OrdersLogisticsPerformance
          loading={loading}
          shippingList={shippingList}
          branchList={branchList}
          statusDist={statusDist}
          statusPieces={statusPieces}
          totalOrders={totalOrders}
          paymentStats={paymentStats}
          codOrdersCount={codOrdersCount}
          codDeliveredRevenue={netRevenue}
          codCollectionRate={codCollectionRate}
          formatPrice={formatPrice}
          onFilterStatus={handleFilterStatus}
          translate={translate}
        />

        {/* Strip 5: Interactive Governorate Performance Table */}
        <OrdersGovernorateTable
          loading={loading}
          governorates={governorateList}
          formatPrice={formatPrice}
        />

        {/* Strip 6: Top Products & Revenue Table */}
        <OrdersTopProductsTable
          loading={loading}
          products={products}
          formatPrice={formatPrice}
        />

      </main>
    </div>
  );
};

export default OrdersAnalytics;
