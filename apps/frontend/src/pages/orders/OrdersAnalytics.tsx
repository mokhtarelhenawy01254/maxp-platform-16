import React from "react";
import { useNavigate } from "react-router-dom";

// Modular Analytics Components
import { useOrdersAnalyticsData } from "./analytics/useOrdersAnalyticsData";
import { OrdersAnalyticsCommandBar } from "./analytics/OrdersAnalyticsCommandBar";
import { OrdersAnalyticsErrorBar } from "./analytics/OrdersAnalyticsErrorBar";
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
      <OrdersAnalyticsCommandBar
        period={period}
        dateRange={dateRange}
        daysCount={daysCount}
        isDateRangeInvalid={isDateRangeInvalid}
        loading={loading}
        lastRefreshedAt={lastRefreshedAt}
        onPeriodChange={(newPeriod: PeriodKey) => applyPeriod(newPeriod)}
        onCustomDateChange={handleCustomDateChange}
        onRefresh={() => loadData(dateRange.start, dateRange.end, true)}
        translate={translate}
      />

      {/* Error Bar */}
      {error && (
        <OrdersAnalyticsErrorBar
          error={error}
          onRetry={() => loadData(dateRange.start, dateRange.end)}
        />
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
