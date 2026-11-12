import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock, PackageX, ShoppingCart } from "lucide-react";
import type { DashboardData } from "../../pages/dashboard/types";
import { apiClient } from "../../services/api";

export type EscalationAttentionData = {
  count: number;
  top5?: Array<{ id: string; title: string; dueDate?: string | null; escalationLevel?: number }>;
};

type Props = {
  dashboard: DashboardData | undefined;
  escalationAttention?: EscalationAttentionData;
};

export function DashboardAlertsHub({ dashboard, escalationAttention }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inventory = dashboard?.inventory;
  const orderHealth = dashboard?.orderHealth;
  const [fetchedAttention, setFetchedAttention] = useState<EscalationAttentionData | null>(null);

  useEffect(() => {
    if (escalationAttention !== undefined) return;
    let active = true;
    apiClient
      .get("/tasks/escalation/attention")
      .then((res) => {
        if (!active) return;
        const payload = res.data?.data ?? res.data ?? {};
        const count = Number(payload.count ?? 0);
        const top5 = Array.isArray(payload.top5) ? payload.top5 : [];
        setFetchedAttention({ count: Number.isFinite(count) ? count : 0, top5 });
      })
      .catch(() => {
        // Silent fallback when unavailable
      });
    return () => {
      active = false;
    };
  }, [escalationAttention]);

  const effectiveAttention = escalationAttention ?? fetchedAttention;
  const escalationCount = Number(effectiveAttention?.count ?? 0);

  const alerts: Array<{
    id: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
    text: string;
    onClick?: () => void;
    testId?: string;
  }> = [];

  if (escalationCount > 0) {
    alerts.push({
      id: "tasks-escalation-attention",
      testId: "escalation-attention-banner",
      icon: Clock,
      className: "bg-destructive/10 text-destructive border border-destructive/25 hover:bg-destructive/20",
      text: `مهام تحتاج تدخلك (${escalationCount})`,
      onClick: () => navigate("/tasks?filter=overdue"),
    });
  }

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
            data-testid={alert.testId}
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
