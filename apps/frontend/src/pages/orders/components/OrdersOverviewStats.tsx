import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ShoppingCartIcon,
  BanknotesIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { Sparkline } from "../../../components/common/Sparkline";
import analyticsService from "../../../services/analyticsService";
import { useCurrency } from "../../../hooks/useCurrency";

interface DailyAnalytic {
  date: string;
  totalPurchases: number;
  totalRevenue: number;
  totalVisits?: number;
  conversionRate?: number;
  averageOrderValue?: number;
}

interface OrdersOverviewStatsProps {
  /** Optional callback so the parent can scroll-to or focus the section. */
  onLoaded?: (loaded: boolean) => void;
}

/**
 * Slim overview strip that shows the last 14 days of order volume & revenue
 * with inline sparklines. Lives at the top of `/orders` to give the operator
 * an at-a-glance trend before they dive into the table.
 *
 * Renders nothing on error or while loading the first paint — the orders table
 * below stays the source of truth.
 */
export const OrdersOverviewStats: React.FC<OrdersOverviewStatsProps> = ({
  onLoaded,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [daily, setDaily] = useState<DailyAnalytic[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        const response = await analyticsService.getDailyAnalytics(
          "14",
          undefined,
          undefined,
          controller.signal,
        );
        if (cancelled) return;
        if (response?.success && Array.isArray(response.data)) {
          setDaily(response.data as DailyAnalytic[]);
          onLoaded?.(true);
        } else {
          setError("no-data");
        }
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        if (!cancelled) {
          setError(err?.message || "unknown");
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [onLoaded]);

  const summary = useMemo(() => {
    if (!daily || daily.length === 0) return null;
    const totalOrders = daily.reduce(
      (sum, entry) => sum + Number(entry.totalPurchases || 0),
      0,
    );
    const totalRevenue = daily.reduce(
      (sum, entry) => sum + Number(entry.totalRevenue || 0),
      0,
    );
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const ordersTrend = daily.map((entry) => Number(entry.totalPurchases || 0));
    const revenueTrend = daily.map((entry) => Number(entry.totalRevenue || 0));
    const lastEntry = daily[daily.length - 1];
    const todayOrders = lastEntry ? Number(lastEntry.totalPurchases || 0) : 0;
    const todayRevenue = lastEntry ? Number(lastEntry.totalRevenue || 0) : 0;
    return {
      totalOrders,
      totalRevenue,
      avgOrderValue,
      todayOrders,
      todayRevenue,
      ordersTrend,
      revenueTrend,
    };
  }, [daily]);

  if (error && !summary) return null;
  if (!summary) {
    return (
      <section
        aria-hidden="true"
        className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
      >
        {[0, 1, 2].map((idx) => (
          <div
            key={idx}
            className="skeleton-shimmer h-[88px] rounded-2xl border border-slate-200/60 bg-white/60 dark:border-slate-700/60 dark:bg-slate-900/60"
          />
        ))}
      </section>
    );
  }

  const lastOrders = summary.ordersTrend[summary.ordersTrend.length - 1] || 0;
  const prevOrders =
    summary.ordersTrend[summary.ordersTrend.length - 2] || lastOrders;
  const ordersDelta =
    prevOrders > 0
      ? Math.round(((lastOrders - prevOrders) / prevOrders) * 100)
      : 0;

  const lastRevenue =
    summary.revenueTrend[summary.revenueTrend.length - 1] || 0;
  const prevRevenue =
    summary.revenueTrend[summary.revenueTrend.length - 2] || lastRevenue;
  const revenueDelta =
    prevRevenue > 0
      ? Math.round(((lastRevenue - prevRevenue) / prevRevenue) * 100)
      : 0;

  return (
    <section
      aria-label={t("orders.overviewAriaLabel")}
      className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div className="rounded-2xl border border-slate-200/70 bg-white/85 p-3 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t("orders.overviewTotalOrders")}
          </p>
          <ShoppingCartIcon className="h-4 w-4 text-slate-400" />
        </div>
        <div className="mt-1 flex items-end justify-between gap-2">
          <div>
            <p className="text-lg font-black text-slate-950 dark:text-white">
              {summary.totalOrders.toLocaleString("ar-EG")}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t("orders.overviewTodayCount", {
                count: summary.todayOrders,
              })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <Sparkline
              data={summary.ordersTrend}
              width={84}
              height={28}
              tone="info"
              filled
              ariaLabel={t("orders.overviewOrdersTrendAria")}
            />
            {ordersDelta !== 0 ? (
              <span
                className={`text-[10px] font-bold ${
                  ordersDelta > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {ordersDelta > 0 ? "▲" : "▼"} {Math.abs(ordersDelta)}%
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white/85 p-3 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t("orders.overviewTotalRevenue")}
          </p>
          <BanknotesIcon className="h-4 w-4 text-slate-400" />
        </div>
        <div className="mt-1 flex items-end justify-between gap-2">
          <div>
            <p className="text-lg font-black text-slate-950 dark:text-white">
              {formatPrice(summary.totalRevenue)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t("orders.overviewTodayRevenue", {
                amount: formatPrice(summary.todayRevenue),
              })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <Sparkline
              data={summary.revenueTrend}
              width={84}
              height={28}
              tone="success"
              filled
              ariaLabel={t("orders.overviewRevenueTrendAria")}
            />
            {revenueDelta !== 0 ? (
              <span
                className={`text-[10px] font-bold ${
                  revenueDelta > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {revenueDelta > 0 ? "▲" : "▼"} {Math.abs(revenueDelta)}%
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white/85 p-3 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t("orders.overviewAvgOrderValue")}
          </p>
          <ChartBarIcon className="h-4 w-4 text-slate-400" />
        </div>
        <div className="mt-1 flex items-end justify-between gap-2">
          <div>
            <p className="text-lg font-black text-slate-950 dark:text-white">
              {formatPrice(summary.avgOrderValue)}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t("orders.overviewPeriodLabel", { count: 14 })}
            </p>
          </div>
          <Sparkline
            data={summary.ordersTrend.map((orders, idx) => {
              const revenue = summary.revenueTrend[idx] || 0;
              return orders > 0 ? revenue / orders : 0;
            })}
            width={84}
            height={28}
            tone="muted"
            filled
            ariaLabel={t("orders.overviewAovTrendAria")}
          />
        </div>
      </div>
    </section>
  );
};

export default OrdersOverviewStats;
