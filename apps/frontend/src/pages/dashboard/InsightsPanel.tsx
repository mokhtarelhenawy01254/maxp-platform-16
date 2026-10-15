import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import type { DashboardData } from "./types";

type Insight = {
  id: string;
  tone: "positive" | "negative" | "warning" | "neutral";
  icon: LucideIcon;
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
    <div className="rounded-xl bg-card border border-border/70 p-4 sm:p-5 shadow-sm transition-all">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Lightbulb className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            {t("companyDashboard.sections.insights")}
          </h3>
        </div>
        <span className="text-xs font-mono tabular-nums text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border/40">
          {insights.length}
        </span>
      </div>

      <div className="space-y-2.5">
        {insights.map((ins) => {
          const Icon = ins.icon;
          return (
            <div
              key={ins.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-background/50 hover:bg-muted/40 transition-colors"
            >
              <div
                className="p-1.5 rounded-md shrink-0 mt-0.5 border"
                style={{
                  background: toneBg(ins.tone),
                  borderColor: toneBorder(ins.tone),
                }}
              >
                <Icon className="w-4 h-4" style={{ color: toneFg(ins.tone) }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground leading-relaxed font-medium">
                  {ins.text}
                </p>
                {ins.action && onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate(ins.action!.href)}
                    className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <span>{ins.action.label}</span>
                    <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
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
        icon: delta > 0 ? TrendingUp : TrendingDown,
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
        icon: AlertTriangle,
        text: t("companyDashboard.insights.lowConversion", { rate: metrics.conversionRate.toFixed(1) }),
        action: { label: t("companyDashboard.rangeStats.conversionRate"), href: "/analytics/orders" },
      });
    } else if (metrics.conversionRate >= 8) {
      out.push({
        id: "high-conversion",
        tone: "positive",
        icon: CheckCircle2,
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
      icon: TrendingDown,
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
      icon: AlertTriangle,
      text: t("companyDashboard.insights.outOfStock", { count: outOfStock }),
      action: { label: t("companyDashboard.inventory.outOfStock"), href: "/products?filter=out-of-stock" },
    });
  } else if (lowStock > 0) {
    out.push({
      id: "low-stock",
      tone: "warning",
      icon: AlertTriangle,
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
      icon: Lightbulb,
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
        icon: Lightbulb,
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
        icon: TrendingUp,
        text: t("companyDashboard.insights.newCustomers", { count: newCustomers }),
      });
    } else if (prev.newCustomers > 0) {
      const delta = ((newCustomers - prev.newCustomers) / prev.newCustomers) * 100;
      if (delta >= 20) {
        out.push({
          id: "new-customers",
          tone: "positive",
          icon: TrendingUp,
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
    case "positive": return "color-mix(in srgb, var(--color-success, #10b981) 14%, transparent)";
    case "negative": return "color-mix(in srgb, var(--color-destructive, #ef4444) 14%, transparent)";
    case "warning": return "color-mix(in srgb, var(--color-warning, #f59e0b) 14%, transparent)";
    default: return "color-mix(in srgb, var(--color-primary, #6366f1) 14%, transparent)";
  }
}

function toneBorder(tone: Insight["tone"]): string {
  switch (tone) {
    case "positive": return "color-mix(in srgb, var(--color-success, #10b981) 30%, transparent)";
    case "negative": return "color-mix(in srgb, var(--color-destructive, #ef4444) 30%, transparent)";
    case "warning": return "color-mix(in srgb, var(--color-warning, #f59e0b) 30%, transparent)";
    default: return "color-mix(in srgb, var(--color-primary, #6366f1) 30%, transparent)";
  }
}

function toneFg(tone: Insight["tone"]): string {
  switch (tone) {
    case "positive": return "var(--color-success, #10b981)";
    case "negative": return "var(--color-destructive, #ef4444)";
    case "warning": return "var(--color-warning, #f59e0b)";
    default: return "var(--color-primary, #6366f1)";
  }
}

export default InsightsPanel;