import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ShoppingCart, Banknote, BarChart3, CheckCircle2 } from "lucide-react";
import { useCurrency } from "../../../hooks/useCurrency";
import { useOrdersOverviewAnalytics } from "./overview/useOrdersOverviewAnalytics";
import { OverviewKpiCard, type OverviewKpiItem } from "./overview/OverviewKpiCard";
import { OverviewPeriodSelector } from "./overview/OverviewPeriodSelector";

export interface OrdersOverviewStatsProps {
  onLoaded?: (loaded: boolean) => void;
}

export const OrdersOverviewStats: React.FC<OrdersOverviewStatsProps> = ({ onLoaded }) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const {
    summary,
    failed,
    period,
    customStart,
    customEnd,
    changePeriod,
    setCustomStart,
    setCustomEnd,
  } = useOrdersOverviewAnalytics(onLoaded);

  const periodLabel = useMemo(
    () =>
      period === "custom"
        ? t("orders.overviewCustom")
        : t("orders.overviewPeriodLabel", { count: period }),
    [period, t]
  );

  const vsPrevTitle = t("orders.overviewVsPrevPeriod");

  const kpis = useMemo((): OverviewKpiItem[] => {
    if (!summary) return [];

    const items: OverviewKpiItem[] = [
      {
        key: "orders",
        label: t("orders.overviewTotalOrders"),
        value: summary.curOrders.toLocaleString("ar-EG"),
        delta: summary.ordersDelta,
        icon: <ShoppingCart className="h-4 w-4" />,
        spark: summary.ordersTrend,
        tone: "info",
        aria: t("orders.overviewOrdersTrendAria"),
      },
      {
        key: "revenue",
        label: t("orders.overviewTotalRevenue"),
        value: formatPrice(summary.curRevenue),
        delta: summary.revenueDelta,
        icon: <Banknote className="h-4 w-4" />,
        spark: summary.revenueTrend,
        tone: "success",
        aria: t("orders.overviewRevenueTrendAria"),
      },
      {
        key: "aov",
        label: t("orders.overviewAvgOrderValue"),
        value: formatPrice(summary.curAov),
        delta: summary.aovDelta,
        icon: <BarChart3 className="h-4 w-4" />,
        spark: summary.aovTrend,
        tone: "muted",
        aria: t("orders.overviewAovTrendAria"),
      },
    ];

    if (summary.hasValidSplit) {
      items.push({
        key: "valid",
        label: t("orders.overviewValidRate"),
        value: `${summary.validRate}%`,
        delta: summary.validRateDelta,
        deltaIsPoints: true,
        icon: <CheckCircle2 className="h-4 w-4" />,
        tone: "primary",
        aria: t("orders.overviewValidTrendAria"),
      });
    }

    return items;
  }, [summary, t, formatPrice]);

  if (failed && !summary) return null;

  if (!summary) {
    return (
      <section
        aria-hidden="true"
        className="mb-3 rounded-2xl border border-border/60 bg-card/60 p-3 shadow-xs"
      >
        <div className="skeleton-shimmer h-[56px] rounded-xl" />
      </section>
    );
  }

  return (
    <section aria-label={t("orders.overviewAriaLabel")} className="mb-3">
      <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* KPI Cards Grid */}
          <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2.5 sm:gap-x-4 sm:gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <OverviewKpiCard
                key={kpi.key}
                kpi={kpi}
                vsPrevTitle={vsPrevTitle}
                periodLabel={periodLabel}
              />
            ))}
          </div>

          {/* Period Selector Controls */}
          <OverviewPeriodSelector
            period={period}
            periodLabel={periodLabel}
            customStart={customStart}
            customEnd={customEnd}
            onPeriodChange={changePeriod}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
          />
        </div>
      </div>
    </section>
  );
};

export default OrdersOverviewStats;
