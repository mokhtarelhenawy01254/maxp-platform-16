import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ExclamationTriangleIcon, ArchiveBoxXMarkIcon, ShoppingCartIcon } from "@heroicons/react/24/outline";
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
    color: string;
    bgColor: string;
    text: string;
    onClick?: () => void;
  }> = [];

  if (inventory?.outOfStockCount && inventory.outOfStockCount > 0) {
    alerts.push({
      id: "out-of-stock",
      icon: ArchiveBoxXMarkIcon,
      color: "var(--color-destructive)",
      bgColor: "color-mix(in srgb, var(--color-destructive) 12%, transparent)",
      text: t("companyDashboard.inventory.outOfStockCount", { count: inventory.outOfStockCount }),
      onClick: () => navigate("/products?filter=out-of-stock"),
    });
  }

  if (inventory?.lowStockCount && inventory.lowStockCount > 0) {
    alerts.push({
      id: "low-stock",
      icon: ExclamationTriangleIcon,
      color: "var(--color-warning)",
      bgColor: "color-mix(in srgb, var(--color-warning) 12%, transparent)",
      text: t("companyDashboard.inventory.lowStockCount", { count: inventory.lowStockCount }),
      onClick: () => navigate("/products?filter=low-stock"),
    });
  }

  if (orderHealth?.openOrders && orderHealth.openOrders > 0) {
    alerts.push({
      id: "open-orders",
      icon: ShoppingCartIcon,
      color: "var(--color-primary)",
      bgColor: "color-mix(in srgb, var(--color-primary) 12%, transparent)",
      text: t("companyDashboard.alerts.openOrders", { count: orderHealth.openOrders }),
      onClick: () => navigate("/orders?filter=open"),
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-4">
        {t("companyDashboard.sections.alerts")}
      </h3>
      <div className="flex flex-wrap gap-2">
        {alerts.map((alert) => (
          <button
            key={alert.id}
            type="button"
            onClick={alert.onClick}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:-translate-y-0.5"
            style={{ background: alert.bgColor, color: alert.color }}
          >
            <alert.icon className="w-3.5 h-3.5" />
            {alert.text}
          </button>
        ))}
      </div>
    </div>
  );
}
