import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ShoppingCartIcon,
  BanknotesIcon,
  ChartBarIcon,
  CalendarDaysIcon,
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

const PRESET_PERIODS = [
  { value: "7", labelKey: "overviewP7" },
  { value: "14", labelKey: "overviewP14" },
  { value: "30", labelKey: "overviewP30" },
  { value: "90", labelKey: "overviewP90" },
  { value: "365", labelKey: "overviewP365" },
  { value: "custom", labelKey: "overviewCustom" },
];

const todayStr = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

/**
 * Slim overview strip that shows order volume & revenue for a selectable
 * period with inline sparklines. Lives at the top of `/orders` to give the
 * operator an at-a-glance trend before they dive into the table.
 *
 * Renders nothing on error — the orders table below stays the source of truth.
 */
export const OrdersOverviewStats: React.FC<OrdersOverviewStatsProps> = ({
  onLoaded,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [daily, setDaily] = useState<DailyAnalytic[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("14");
  const [customStart, setCustomStart] = useState(() => daysAgo(14));
  const [customEnd, setCustomEnd] = useState(() => todayStr());

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        setDaily(null);
        setError(null);
        const isCustom = period === "custom";
        const p = isCustom ? "365" : period;
        const sd = isCustom ? customStart : undefined;
        const ed = isCustom ? customEnd : undefined;

        const response = await analyticsService.getDailyAnalytics(
          p,
          sd,
          ed,
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
  }, [period, customStart, customEnd, onLoaded]);

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

  const periodLabel = useMemo(
    () =>
      period === "custom"
        ? t("orders.overviewCustom")
        : t("orders.overviewPeriodLabel", { count: period }),
    [period, t],
  );

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

  const segmentedBtn = (active: boolean) =>
    `min-h-[30px] rounded-lg px-3 text-xs font-bold transition-all ${
      active
        ? "bg-blue-600 text-white shadow-sm"
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    }`;

  const dateInputClass =
    "rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";

  return (
    <section aria-label={t("orders.overviewAriaLabel")} className="mb-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t("orders.overviewTitle")}
        </p>
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200/70 bg-white/85 p-1 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70">
          {PRESET_PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={segmentedBtn(period === p.value)}
            >
              {t(`orders.${p.labelKey}`)}
            </button>
          ))}
        </div>
      </div>

      {period === "custom" && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/70 bg-white/85 p-2 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/70">
          <CalendarDaysIcon className="h-4 w-4 text-slate-400" />
          <input
            type="date"
            value={customStart}
            max={customEnd}
            onChange={(e) => setCustomStart(e.target.value)}
            className={dateInputClass}
          />
          <span className="text-xs text-slate-400">{t("orders.overviewTo")}</span>
          <input
            type="date"
            value={customEnd}
            min={customStart}
            onChange={(e) => setCustomEnd(e.target.value)}
            className={dateInputClass}
          />
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
                {periodLabel}
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
      </div>
    </section>
  );
};

export default OrdersOverviewStats;
