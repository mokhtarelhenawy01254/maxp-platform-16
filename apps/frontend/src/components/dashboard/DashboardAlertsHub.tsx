import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, PackageX, ShoppingCart } from "lucide-react";
import type { DashboardData } from "../../pages/dashboard/types";

type Props = {
  dashboard: DashboardData | undefined;
};

export function DashboardAlertsHub({ dashboard }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inventory = dashboard?.inventory;
  const orderHealth = dashboard?.orderHealth;

  const alerts: Array<{
    id: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
    text: string;
    onClick?: () => void;
  }> = [];

  if (inventory?.outOfStockCount && inventory.outOfStockCount > 0) {
    alerts.push({
      id: "out-of-stock",
      icon: PackageX,
      className: "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20",
      text: t("companyDashboard.inventory.outOfStockCount", { count: inventory.outOfStockCount }),
      onClick: () => navigate("/products?filter=out-of-stock"),
    });
  }

  if (inventory?.lowStockCount && inventory.lowStockCount > 0) {
    alerts.push({
      id: "low-stock",
      icon: AlertTriangle,
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20",
      text: t("companyDashboard.inventory.lowStockCount", { count: inventory.lowStockCount }),
      onClick: () => navigate("/products?filter=low-stock"),
    });
  }

  if (orderHealth?.openOrders && orderHealth.openOrders > 0) {
    alerts.push({
      id: "open-orders",
      icon: ShoppingCart,
      className: "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20",
      text: t("companyDashboard.alerts.openOrders", { count: orderHealth.openOrders }),
      onClick: () => navigate("/orders?filter=open"),
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-card border border-border/70 shadow-xs">
      <h3 className="text-xs font-bold text-foreground mb-3 sm:mb-4">
        {t("companyDashboard.sections.alerts")}
      </h3>
      <div className="flex flex-wrap gap-2">
        {alerts.map((alert) => (
          <button
            key={alert.id}
            type="button"
            onClick={alert.onClick}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${alert.className}`}
          >
            <alert.icon className="w-3.5 h-3.5" />
            <span className="font-mono tabular-nums">{alert.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
