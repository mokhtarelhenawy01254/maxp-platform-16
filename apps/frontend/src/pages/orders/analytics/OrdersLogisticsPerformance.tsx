import React from "react";
import type { ShippingPerformance, BranchPerformance } from "./types";
import { OrderLifecycleColumn } from "./logistics/OrderLifecycleColumn";
import { LogisticsSlaColumn } from "./logistics/LogisticsSlaColumn";
import { PaymentBreakdownColumn } from "./logistics/PaymentBreakdownColumn";

export interface OrdersLogisticsPerformanceProps {
  loading: boolean;
  shippingList: ShippingPerformance[];
  branchList: BranchPerformance[];
  statusDist: Record<string, number>;
  statusPieces: Record<string, number>;
  totalOrders: number;
  paymentStats: Record<string, number>;
  codOrdersCount: number;
  codDeliveredRevenue: number;
  codCollectionRate: number;
  formatPrice: (amount: number) => string;
  onFilterStatus?: (status: string) => void;
  translate: any;
}

export const OrdersLogisticsPerformance: React.FC<OrdersLogisticsPerformanceProps> = ({
  loading,
  shippingList,
  branchList,
  statusDist,
  statusPieces,
  totalOrders,
  paymentStats,
  codOrdersCount,
  codDeliveredRevenue,
  codCollectionRate,
  formatPrice,
  onFilterStatus,
  translate,
}) => {
  return (
    <div className="border-b border-zinc-200/80 dark:border-white/[0.08] grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-zinc-200/80 dark:divide-white/[0.08] bg-white dark:bg-[#070709]">
      {/* Column 1: Order Lifecycle & Status Distribution */}
      <OrderLifecycleColumn
        loading={loading}
        statusDist={statusDist}
        statusPieces={statusPieces}
        totalOrders={totalOrders}
        onFilterStatus={onFilterStatus}
        translate={translate}
      />

      {/* Column 2: Accurate Logistics SLA (Carriers vs Branches) */}
      <LogisticsSlaColumn
        loading={loading}
        shippingList={shippingList}
        branchList={branchList}
        formatPrice={formatPrice}
      />

      {/* Column 3: Payment Breakdown & Settlement */}
      <PaymentBreakdownColumn
        paymentStats={paymentStats}
        codOrdersCount={codOrdersCount}
        codDeliveredRevenue={codDeliveredRevenue}
        codCollectionRate={codCollectionRate}
        totalOrders={totalOrders}
        formatPrice={formatPrice}
      />
    </div>
  );
};

export default OrdersLogisticsPerformance;
