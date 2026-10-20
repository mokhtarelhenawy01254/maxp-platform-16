import React from "react";
import { OrdersMetricsNorthStar } from "./OrdersMetricsNorthStar";
import { OrdersOperationalFunnelGrid } from "./OrdersOperationalFunnelGrid";

export interface OrdersMetricsStripProps {
  loading: boolean;
  totalOrders: number;
  totalRevenue: number;
  totalPieces: number;
  deliveredOrders: number;
  deliveredPct: number;
  deliveredPieces?: number;
  inTransitOrders: number;
  inTransitPct: number;
  inTransitPieces?: number;
  warehouseOrders: number;
  warehousePct: number;
  warehousePieces?: number;
  unprocessedOrders: number;
  unprocessedPct: number;
  unprocessedPieces?: number;
  cancelledOrders: number;
  cancelledPct: number;
  cancelledPieces?: number;
  returnedOrders: number;
  returnedPct: number;
  returnedPieces?: number;
  formatPrice: (amount: number) => string;
  onFilterStatus?: (status: string) => void;
}

export const OrdersMetricsStrip: React.FC<OrdersMetricsStripProps> = ({
  loading,
  totalOrders,
  totalRevenue,
  totalPieces,
  deliveredOrders,
  deliveredPct,
  deliveredPieces = 0,
  inTransitOrders,
  inTransitPct,
  inTransitPieces = 0,
  warehouseOrders,
  warehousePct,
  warehousePieces = 0,
  unprocessedOrders,
  unprocessedPct,
  unprocessedPieces = 0,
  cancelledOrders,
  cancelledPct,
  cancelledPieces = 0,
  returnedOrders,
  returnedPct,
  returnedPieces = 0,
  formatPrice,
  onFilterStatus,
}) => {
  return (
    <div className="border-b border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#070709]">
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-zinc-200/80 dark:divide-white/[0.08]">
        {/* 1. HERO NORTH STAR: TOTAL ORDERS (4 Columns) */}
        <OrdersMetricsNorthStar
          loading={loading}
          totalOrders={totalOrders}
          totalRevenue={totalRevenue}
          totalPieces={totalPieces}
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
        />

        {/* 2. THE 6 OPERATIONAL FUNNEL STAGES (8 Columns) */}
        <OrdersOperationalFunnelGrid
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
          onFilterStatus={onFilterStatus}
        />
      </div>
    </div>
  );
};

export default OrdersMetricsStrip;
