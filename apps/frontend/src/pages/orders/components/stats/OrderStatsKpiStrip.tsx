import React from "react";
import { useTranslation } from "react-i18next";
import { ShoppingBag, DollarSign, BarChart3 } from "lucide-react";
import type { OrderStatsData } from "./useOrderStatsData";

export interface OrderStatsKpiStripProps {
  stats: OrderStatsData;
  formatPrice: (amount: number) => string;
}

export const OrderStatsKpiStrip: React.FC<OrderStatsKpiStripProps> = ({
  stats,
  formatPrice,
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("orderStats.totalOrders")}</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <ShoppingBag className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
          {stats.totalOrders.toLocaleString("en-US")}
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("orderStats.totalRevenue")}</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
            <DollarSign className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
          {formatPrice(stats.totalRevenue)}
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t("orderStats.averageOrderValue")}</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-500">
            <BarChart3 className="h-3.5 w-3.5" />
          </div>
        </div>
        <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
          {formatPrice(stats.averageOrderValue)}
        </div>
      </div>
    </div>
  );
};

export default OrderStatsKpiStrip;
