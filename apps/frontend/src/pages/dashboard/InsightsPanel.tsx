import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";
import type { DashboardData } from "./types";

type Insight = {
  id: string;
  tone: "positive" | "negative" | "warning" | "neutral";
  icon: typeof LightBulbIcon;
  text: string;
  action?: { label: string; href: string };
};

type Props = {
  dashboard: DashboardData;
  onNavigate?: (href: string) => void;
};

export function InsightsPanel({ dashboard, onNavigate }: Props) {
  const { t } = useTranslation();

  const insights = useMemo(() => generateInsights(dashboard, t), [dashboard, t]);

  if (insights.length === 0) return null;

  return (
    <div
      className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm"
      style={{ boxShadow: "0 28px 72px -48px rgba(7, 17, 32, 0.42)" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <LightBulbIcon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          {t("companyDashboard.sections.insights")}
        </h3>
      </div>
      <div className="space-y-2.5">
        {insights.map((ins) => (
          <div
            key={ins.id}
            className="flex items-start gap-3 p-3 rounded-xl transition-colors hover:bg-muted/30"
            style={{ background: "color-mix(in srgb, var(--color-border) 18%, transparent)" }}
          >
            <div
              className="p-1.5 rounded-lg shrink-0 mt-0.5"
              style={{ background: toneBg(ins.tone) }}
            >
              <ins.icon className="w-4 h-4" style={{ color: toneFg(ins.tone) }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground leading-relaxed">{ins.text}</p>
              {ins.action && onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate(ins.action!.href)}
                  className="mt-1.5 text-xs font-medium text-primary hover:underline"
                >
                  {ins.action.label} →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ponytail: deterministic heuristic engine. No LLM call — instant, free, offline.
// Upgrade path: replace with ai-service call for natural-language polish when ready.
function generateInsights(
  d: DashboardData,
  t: (k: string, opts?: Record<string, unknown>) => string,
): Insight[] {
  const out: Insight[] = [];
  const { financials, metrics, orderHealth, inventory, previousPeriod: prev, topProducts, recentActivity } = d;

  const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
  const fmtMoney = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  // 1. Revenue trend vs previous period
  if (prev && financials?.grossProfit != null && prev.revenue > 0) {
    const delta = ((financials.grossProfit - prev.revenue) / prev.revenue) * 100;
    if (Math.abs(delta) >= 5) {
      out.push({
        id: "revenue-trend",
        tone: delta > 0 ? "positive" : "negative",
        icon: delta > 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon,
        text: t("companyDashboard.insights.revenueTrend", {
          delta: fmtPct(delta),
          current: fmtMoney(financials.grossProfit),
        }),
        action: { label: t("companyDashboard.financials.profit"), href: "/analytics/orders/revenue" },
      });
    }
  }

  // 2. Conversion rate
  if (metrics?.conversionRate != null && metrics.visits != null && metrics.visits > 0) {
    if (metrics.conversionRate < 2) {
      out.push({
        id: "low-conversion",
        tone: "warning",
        icon: ExclamationTriangleIcon,
        text: t("companyDashboard.insights.lowConversion", { rate: metrics.conversionRate.toFixed(1) }),
        action: { label: t("companyDashboard.rangeStats.conversionRate"), href: "/analytics/orders" },
      });
    } else if (metrics.conversionRate >= 8) {
      out.push({
        id: "high-conversion",
        tone: "positive",
        icon: CheckCircleIcon,
        text: t("companyDashboard.insights.highConversion", { rate: metrics.conversionRate.toFixed(1) }),
      });
    }
  }

  // 3. Cancellation rate
  const cancelRate = metrics?.cancellationRate ?? orderHealth?.cancellationRate;
  if (cancelRate != null && cancelRate > 15 && (orderHealth?.trackedOrders ?? 0) > 5) {
    out.push({
      id: "high-cancellation",
      tone: "negative",
      icon: ArrowTrendingDownIcon,
      text: t("companyDashboard.insights.highCancellation", { rate: cancelRate.toFixed(1) }),
      action: { label: t("companyDashboard.metrics.cancelledOrders"), href: "/orders?filter=cancelled" },
    });
  }

  // 4. Inventory alerts
  const outOfStock = inventory?.outOfStockCount ?? 0;
  const lowStock = inventory?.lowStockCount ?? 0;
  if (outOfStock > 0) {
    out.push({
      id: "out-of-stock",
      tone: "negative",
      icon: ExclamationTriangleIcon,
      text: t("companyDashboard.insights.outOfStock", { count: outOfStock }),
      action: { label: t("companyDashboard.inventory.outOfStock"), href: "/products?filter=out-of-stock" },
    });
  } else if (lowStock > 0) {
    out.push({
      id: "low-stock",
      tone: "warning",
      icon: ExclamationTriangleIcon,
      text: t("companyDashboard.insights.lowStock", { count: lowStock }),
      action: { label: t("companyDashboard.inventory.lowStock"), href: "/products?filter=low-stock" },
    });
  }

  // 5. Open orders needing attention
  const openOrders = orderHealth?.openOrders ?? 0;
  if (openOrders > 0) {
    out.push({
      id: "open-orders",
      tone: "neutral",
      icon: LightBulbIcon,
      text: t("companyDashboard.insights.openOrders", { count: openOrders }),
      action: { label: t("companyDashboard.operations.openOrdersAction"), href: "/orders?filter=open" },
    });
  }

  // 6. Top product concentration
  if (topProducts && topProducts.length > 0 && (metrics?.items ?? 0) > 0) {
    const top = topProducts[0];
    const topQty = top.quantity ?? 0;
    const totalItems = metrics.items ?? 0;
    if (totalItems > 0 && topQty / totalItems >= 0.3 && topProducts.length >= 3) {
      out.push({
        id: "product-concentration",
        tone: "neutral",
        icon: LightBulbIcon,
        text: t("companyDashboard.insights.productConcentration", {
          product: top.name,
          pct: Math.round((topQty / totalItems) * 100),
        }),
      });
    }
  }

  // 7. New customers growth
  const newCustomers = recentActivity?.newCustomers ?? 0;
  if (prev && newCustomers > 0 && prev.newCustomers >= 0) {
    if (prev.newCustomers === 0 && newCustomers > 0) {
      out.push({
        id: "new-customers",
        tone: "positive",
        icon: ArrowTrendingUpIcon,
        text: t("companyDashboard.insights.newCustomers", { count: newCustomers }),
      });
    } else if (prev.newCustomers > 0) {
      const delta = ((newCustomers - prev.newCustomers) / prev.newCustomers) * 100;
      if (delta >= 20) {
        out.push({
          id: "new-customers",
          tone: "positive",
          icon: ArrowTrendingUpIcon,
          text: t("companyDashboard.insights.newCustomersGrowth", { delta: fmtPct(delta), count: newCustomers }),
        });
      }
    }
  }

  // Cap at 5, prioritize by tone severity
  const priority: Record<Insight["tone"], number> = { negative: 0, warning: 1, positive: 2, neutral: 3 };
  return out.sort((a, b) => priority[a.tone] - priority[b.tone]).slice(0, 5);
}

function toneBg(tone: Insight["tone"]): string {
  switch (tone) {
    case "positive": return "color-mix(in srgb, var(--color-success) 14%, transparent)";
    case "negative": return "color-mix(in srgb, var(--color-destructive) 14%, transparent)";
    case "warning": return "color-mix(in srgb, var(--color-warning) 14%, transparent)";
    default: return "color-mix(in srgb, var(--color-primary) 14%, transparent)";
  }
}

function toneFg(tone: Insight["tone"]): string {
  switch (tone) {
    case "positive": return "var(--color-success)";
    case "negative": return "var(--color-destructive)";
    case "warning": return "var(--color-warning)";
    default: return "var(--color-primary)";
  }
}

export default InsightsPanel;