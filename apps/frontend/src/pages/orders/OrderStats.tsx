import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../hooks/useCurrency";
import { apiClient } from "../../services/apiClient";
import PeriodSelector, {
  PeriodRange,
} from "../../components/common/PeriodSelector";
import {
  BarChart3,
  ShoppingBag,
  DollarSign,
  Truck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Calendar,
  RotateCw,
  AlertCircle
} from "lucide-react";

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  statusCounts: {
    [key: string]: number;
  };
  recentOrders: Array<{
    orderNumber: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
}

const OrderStats: React.FC = () => {
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [allTime, setAllTime] = useState(true);
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (!allTime && range) {
        params.dateFrom = range.startDate;
        params.dateTo = range.endDate;
      }

      const response = await apiClient.get("/orders-enhanced/stats", {
        params,
      });

      if (response.data.success) {
        setStats(response.data.data);
        setError(null);
      } else {
        throw new Error(response.data.message || t("orderStats.fetchFailed"));
      }
    } catch (error: any) {
      console.error("Error fetching order stats:", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        t("orderStats.loadingError");
      setError(message);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStats();
  }, [range, allTime]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "confirmed":
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      case "processing":
        return <Clock className="h-4 w-4 text-primary" />;
      case "shipped":
        return <Truck className="h-4 w-4 text-violet-500" />;
      case "delivered":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusKey = `orders.status.${status.toLowerCase()}`;
    return t(statusKey, { defaultValue: status });
  };

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
            className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-xs font-medium text-destructive-foreground transition-all hover:bg-destructive/90 active:scale-[0.98]"
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
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
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
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
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

      {/* 4. Bento Section: Status Distribution & Recent Orders */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Status Distribution */}
        <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm lg:col-span-5">
          <h3 className="mb-4 text-xs font-bold text-foreground">
            {t("orderStats.statusDistribution")}
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.statusCounts).map(([status, count]) => {
              const pct = stats.totalOrders > 0 ? (count / stats.totalOrders) * 100 : 0;

              return (
                <div key={status} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status)}
                      <span className="font-medium text-foreground">
                        {getStatusText(status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums text-muted-foreground">
                      <span>{count}</span>
                      <span>({pct.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Orders Ledger */}
        <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground">
              {t("orderStats.recentOrders")}
            </h3>
            <span className="font-mono text-xs text-muted-foreground">
              {stats.recentOrders.length} طلبات
            </span>
          </div>

          <div className="divide-y divide-border/50">
            {stats.recentOrders.map((order) => {
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
              );
            })}

            {stats.recentOrders.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                {t("orderStats.noRecentOrders")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderStats;
