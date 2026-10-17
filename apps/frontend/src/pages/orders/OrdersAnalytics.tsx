import React from "react";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw,
  BarChart3,
  AlertTriangle,
  ExternalLink,
  Calendar,
  ChevronDown,
  Zap,
  ArrowLeftRight,
} from "lucide-react";

// Modular Analytics Components
import { useOrdersAnalyticsData } from "./analytics/useOrdersAnalyticsData";
import { OrdersMetricsStrip } from "./analytics/OrdersMetricsStrip";
import { OrdersDailyAveragesStrip } from "./analytics/OrdersDailyAveragesStrip";
import { OrdersVelocityChart } from "./analytics/OrdersVelocityChart";
import { OrdersLogisticsPerformance } from "./analytics/OrdersLogisticsPerformance";
import { OrdersGovernorateTable } from "./analytics/OrdersGovernorateTable";
import { OrdersTopProductsTable } from "./analytics/OrdersTopProductsTable";
import { OrdersDuplicateReport } from "./analytics/OrdersDuplicateReport";
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
    totalPieces,
    avgPiecesPerOrder,
    avgPiecesPerDay,
    avgDeliveredPiecesPerDay,
    avgCancelledPiecesPerDay,
    avgReturnedPiecesPerDay,
    deliveredPieces,
    inTransitPieces,
    warehousePieces,
    unprocessedPieces,
    cancelledPieces,
    returnedPieces,
    paymentStats,
    isDateRangeInvalid,
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
      <header className="h-auto min-h-11 sm:h-12 border-b border-border/70 px-3 sm:px-4 py-1 sm:py-0 bg-card/95 backdrop-blur-md flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3 shrink-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-xs sm:text-sm font-bold text-foreground truncate">
            تحليلات العمليات والطلبات
          </h1>
          <span className="hidden md:inline-block text-[10px] text-muted-foreground font-mono">
            SaaS Cockpit
          </span>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Period Filter Dropdown & Active Range Badge */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground absolute start-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={period}
                onChange={(e) => applyPeriod(e.target.value as PeriodKey)}
                aria-label="الفترة الزمنية"
                className="appearance-none ps-6 pe-6 py-1 text-xs font-semibold rounded-md border border-border/70 bg-card text-foreground focus:outline-hidden hover:bg-accent/40 cursor-pointer transition-colors"
              >
                <option value="today">اليوم</option>
                <option value="yesterday">أمس</option>
                <option value="thisWeek">هذا الأسبوع</option>
                <option value="lastWeek">الأسبوع الماضي</option>
                <option value="7">آخر 7 أيام</option>
                <option value="14">آخر 14 يوم (أسبوعين)</option>
                <option value="30">آخر 30 يوم</option>
                <option value="thisMonth">هذا الشهر</option>
                <option value="lastMonth">الشهر الماضي</option>
                <option value="60">آخر شهرين (60 يوم)</option>
                <option value="90">آخر 3 أشهر</option>
                <option value="180">آخر 6 أشهر</option>
                <option value="thisYear">هذه السنة (من يناير)</option>
                <option value="365">آخر سنة</option>
                <option value="all">كل الأوقات</option>
                <option value="custom">فترة مخصصة</option>
              </select>
              <ChevronDown className="h-3 w-3 text-muted-foreground absolute end-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Active Date Range Telemetry Pill */}
            {period !== "custom" ? (
              <div
                className="hidden xl:inline-flex items-center gap-1.5 px-2 py-1 rounded border border-border/60 bg-muted/20 text-[11px] font-mono text-muted-foreground tabular-nums"
                title={`الفترة المحددة: من ${dateRange.start} إلى ${dateRange.end} (${daysCount} يوم)`}
              >
                <span>{dateRange.start}</span>
                <ArrowLeftRight className="h-3 w-3 text-muted-foreground/60" />
                <span>{dateRange.end}</span>
                <span className="text-[10px] text-muted-foreground font-sans">
                  ({daysCount}&nbsp;{daysCount === 1 ? "يوم" : "أيام"})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => handleCustomDateChange("start", e.target.value)}
                  className={`px-1.5 sm:px-2 py-0.5 text-[11px] sm:text-xs font-mono border rounded-md bg-card text-foreground focus:outline-hidden ${
                    isDateRangeInvalid
                      ? "border-destructive text-destructive"
                      : "border-border/70"
                  }`}
                />
                <span className="text-[10px] text-muted-foreground">إلى</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => handleCustomDateChange("end", e.target.value)}
                  className={`px-1.5 sm:px-2 py-0.5 text-[11px] sm:text-xs font-mono border rounded-md bg-card text-foreground focus:outline-hidden ${
                    isDateRangeInvalid
                      ? "border-destructive text-destructive"
                      : "border-border/70"
                  }`}
                />
                {isDateRangeInvalid ? (
                  <span className="text-[10px] text-destructive font-medium whitespace-nowrap bg-destructive/10 px-1 py-0.5 rounded">
                    البداية تسبق النهاية
                  </span>
                ) : (
                  <span className="hidden sm:inline-block text-[10px] font-mono text-muted-foreground tabular-nums">
                    ({daysCount}&nbsp;{daysCount === 1 ? "يوم" : "أيام"})
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigate("/analytics/orders/fulfillment-velocity")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all active:scale-[0.97]"
              title="سرعة الإنجاز وشحن اليوم وتوزيع تواريخ ورود الطلبات"
            >
              <Zap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">شحن اليوم (سرعة الإنجاز)</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/analytics/orders")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/80 border border-border/70 transition-all active:scale-[0.97]"
              title="لوحة التقارير المتقدمة"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">تقارير متقدمة</span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </button>

            <button
              type="button"
              onClick={() => loadData(dateRange.start, dateRange.end, true)}
              disabled={loading}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all active:scale-[0.97] disabled:opacity-50"
              title={`آخر تحديث: ${lastRefreshedAt.toLocaleTimeString("ar-EG")}`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{String(translate("common.refresh") || "تحديث")}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Error Bar */}
      {error && (
        <div className="p-2.5 bg-destructive/10 border-b border-destructive/20 flex items-center justify-between gap-3 text-destructive text-xs font-medium">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadData(dateRange.start, dateRange.end)}
            className="px-2 py-0.5 rounded bg-card border border-border/80 text-foreground hover:bg-accent text-[11px] shrink-0"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* 2. SINGLE CONTINUOUS SURFACE: Clean Reporting Hierarchy */}
      <main className="flex-1 overflow-y-auto min-h-0 bg-background divide-y divide-border/60">
        
        {/* Strip 1: Total Orders & The 6 Operational Funnel Stages */}
        <OrdersMetricsStrip
          loading={loading}
          totalOrders={totalOrders}
          totalRevenue={totalRevenue}
          totalPieces={totalPieces}
          deliveredOrders={deliveredOrders}
          deliveredPct={deliveredPct}
          deliveredPieces={deliveredPieces}
          inTransitOrders={inTransitOrders}
          inTransitPct={inTransitPct}
          inTransitPieces={inTransitPieces}
          warehouseOrders={warehouseOrders}
          warehousePct={warehousePct}
          warehousePieces={warehousePieces}
          unprocessedOrders={unprocessedOrders}
          unprocessedPct={unprocessedPct}
          unprocessedPieces={unprocessedPieces}
          cancelledOrders={cancelledOrders}
          cancelledPct={cancelledPct}
          cancelledPieces={cancelledPieces}
          returnedOrders={returnedOrders}
          returnedPct={returnedPct}
          returnedPieces={returnedPieces}
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
          avgPiecesPerOrder={avgPiecesPerOrder}
          avgPiecesPerDay={avgPiecesPerDay}
          avgDeliveredPiecesPerDay={avgDeliveredPiecesPerDay}
          avgCancelledPiecesPerDay={avgCancelledPiecesPerDay}
          avgReturnedPiecesPerDay={avgReturnedPiecesPerDay}
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

        {/* Strip 3.5: Duplicate Orders & Avoided Revenue Report */}
        <OrdersDuplicateReport
          duplicateStats={stats?.duplicateStats}
          loading={loading}
          formatPrice={formatPrice}
        />

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
