import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../hooks/useCurrency";
import PeriodSelector from "../../components/common/PeriodSelector";
import {
  BarChart3,
  ArrowRight,
  Calendar,
  RotateCw,
} from "lucide-react";
import {
  useOrderStatsData,
  type OrderStatsData,
} from "./components/stats/useOrderStatsData";
import { OrderStatsKpiStrip } from "./components/stats/OrderStatsKpiStrip";
import { OrderStatusDistributionSection } from "./components/stats/OrderStatusDistributionSection";
import { OrderStatsRecentLedger } from "./components/stats/OrderStatsRecentLedger";

export type { OrderStatsData };

export const OrderStats: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  const {
    stats,
    loading,
    error,
    allTime,
    setAllTime,
    setRange,
    fetchStats,
  } = useOrderStatsData();

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <RotateCw className="h-7 w-7 animate-spin text-primary" />
          <p className="text-xs font-mono">جاري تحميل إحصائيات الطلبيات...</p>
        </div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-6 shadow-sm">
          <div className="space-y-1 text-right">
            <h3 className="text-sm font-bold text-destructive">
              {t("orderStats.errorLoading")}
            </h3>
            <p className="text-xs text-destructive/90">{error}</p>
          </div>
          <button
            onClick={fetchStats}
            className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-xs font-medium text-destructive-foreground transition-all hover:bg-destructive/90 active:scale-[0.98] cursor-pointer"
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>{t("orderStats.retry")}</span>
          </button>
        </div>
      </div>
    );
  }

  if (!stats && !loading) {
    return (
      <div className="rounded-xl border border-border/70 bg-card p-12 text-center shadow-sm" dir="rtl">
        <p className="text-xs text-muted-foreground">{t("orderStats.noData")}</p>
        <button
          onClick={fetchStats}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] cursor-pointer"
        >
          <RotateCw className="h-3.5 w-3.5" />
          <span>{t("orderStats.retry")}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. Header Control Bar Chassis */}
      <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-right">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>لوحة المؤشرات التراكمية</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {t("orderStats.title")}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t("orderStats.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/orders"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-muted/40 active:scale-[0.98]"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            <span>{t("orderStats.backToOrders")}</span>
          </Link>
        </div>
      </div>

      {/* 2. Date Filter Bar Chassis */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{t("orderStats.filterByDate")}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setAllTime(true);
              setRange(null);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              allTime
                ? "border border-primary/20 bg-primary text-primary-foreground shadow-xs"
                : "border border-border/70 bg-background text-muted-foreground hover:bg-muted/30 hover:text-foreground"
            }`}
          >
            {t("orderStats.all")}
          </button>

          <PeriodSelector
            onRangeChange={(next) => {
              setRange(next);
              setAllTime(false);
            }}
          />
        </div>
      </div>

      {/* 3. KPI Telemetry Strip */}
      <OrderStatsKpiStrip stats={stats} formatPrice={formatPrice} />

      {/* 4. Bento Section: Status Distribution & Recent Orders */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <OrderStatusDistributionSection
          statusCounts={stats.statusCounts}
          totalOrders={stats.totalOrders}
        />

        <OrderStatsRecentLedger
          recentOrders={stats.recentOrders}
          formatPrice={formatPrice}
        />
      </div>
    </div>
  );
};

export default OrderStats;
