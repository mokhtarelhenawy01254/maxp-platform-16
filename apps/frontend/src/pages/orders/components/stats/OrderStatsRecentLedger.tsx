import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { OrderStatsData } from "./useOrderStatsData";

export interface OrderStatsRecentLedgerProps {
  recentOrders: OrderStatsData["recentOrders"];
  formatPrice: (amount: number) => string;
}

export const OrderStatsRecentLedger: React.FC<OrderStatsRecentLedgerProps> = ({
  recentOrders,
  formatPrice,
}) => {
  const { t } = useTranslation();

  const getStatusText = (status: string) => {
    const statusKey = `orders.status.${status.toLowerCase()}`;
    return t(statusKey, { defaultValue: status });
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return t("orderStats.notSpecifiedDate");
    }
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm lg:col-span-7">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-bold text-foreground">
          {t("orderStats.recentOrders")}
        </h3>
        <span className="font-mono text-xs text-muted-foreground">
          {recentOrders.length} طلبات
        </span>
      </div>

      <div className="divide-y divide-border/50">
        {recentOrders.map((order) => (
          <Link
            key={order.orderNumber}
            to={`/orders/${encodeURIComponent(order.orderNumber)}`}
            className="flex items-center justify-between py-3 transition-colors hover:bg-muted/10 rounded-lg px-2"
          >
            <div className="space-y-0.5 text-right">
              <div className="font-mono text-xs font-bold text-foreground">
                {order.orderNumber}
              </div>
              <div className="text-xs text-muted-foreground">
                {order.customerName}
              </div>
              <div className="font-mono text-[10px] text-muted-foreground">
                {formatDate(order.createdAt)}
              </div>
            </div>

            <div className="text-left">
              <div className="font-mono text-xs font-bold tabular-nums text-foreground">
                {formatPrice(order.total)}
              </div>
              <div className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">
                {getStatusText(order.status)}
              </div>
            </div>
          </Link>
        ))}

        {recentOrders.length === 0 && (
          <div className="py-8 text-center text-xs text-muted-foreground">
            {t("orderStats.noRecentOrders")}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderStatsRecentLedger;
