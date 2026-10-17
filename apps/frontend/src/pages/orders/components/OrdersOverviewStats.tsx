import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ShoppingCart,
  Banknote,
  BarChart3,
  CheckCircle2,
  Calendar,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Sparkline } from "../../../components/common/Sparkline";
import analyticsService from "../../../services/analyticsService";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  DailyAnalytic,
  PRESET_PERIODS,
  PERIOD_STORAGE_KEY,
  todayStr,
  daysAgo,
  addDays,
  sumBy,
  pctDelta,
} from "../utils/overviewStatsHelpers";

const DeltaPill: React.FC<{ delta: number | null; title: string }> = ({
  delta,
  title,
}) => {
  if (delta === null || delta === 0) return null;
  const up = delta > 0;
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold font-mono tabular-nums leading-none ${
        up
          ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400"
      }`}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(delta)}%
    </span>
  );
};

interface OrdersOverviewStatsProps {
  onLoaded?: (loaded: boolean) => void;
}

export const OrdersOverviewStats: React.FC<OrdersOverviewStatsProps> = ({
  onLoaded,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [daily, setDaily] = useState<DailyAnalytic[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [period, setPeriod] = useState(() => {
    try {
      const saved = localStorage.getItem(PERIOD_STORAGE_KEY);
      return saved && PRESET_PERIODS.some((p) => p.value === saved)
        ? saved
        : "14";
    } catch {
      return "14";
    }
  });
  const [customStart, setCustomStart] = useState(() => daysAgo(13));
  const [customEnd, setCustomEnd] = useState(() => todayStr());

  useEffect(() => {
    try {
      localStorage.setItem(PERIOD_STORAGE_KEY, period);
    } catch {
      /* ignore */
    }
  }, [period]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      try {
        setDaily(null);
        setFailed(false);

        let fetchStart: string;
        let fetchEnd: string;
        let windowDays: number;

        if (period === "custom") {
          const start = customStart <= customEnd ? customStart : customEnd;
          const end = customStart <= customEnd ? customEnd : customStart;
          windowDays = Math.max(
            1,
            Math.round(
              (new Date(end).getTime() - new Date(start).getTime()) / 86400000,
            ) + 1,
          );
          fetchStart = addDays(start, -(windowDays - 1));
          fetchEnd = end;
        } else {
          windowDays = parseInt(period, 10);
          fetchStart = daysAgo(windowDays * 2 - 1);
          fetchEnd = todayStr();
        }

        const response = await analyticsService.getDailyAnalytics(
          "custom",
          fetchStart,
          fetchEnd,
          controller.signal,
        );
        if (cancelled) return;
        if (response?.success && Array.isArray(response.data)) {
          setDaily(response.data as DailyAnalytic[]);
          onLoaded?.(true);
        } else {
          setFailed(true);
        }
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [period, customStart, customEnd, onLoaded]);

  const summary = useMemo(() => {
    if (!daily || daily.length === 0) return null;

    const windowDays =
      period === "custom"
        ? Math.max(
            1,
            Math.round(
              (new Date(customEnd).getTime() -
                new Date(customStart).getTime()) /
                86400000,
            ) + 1,
          )
        : parseInt(period, 10);

    const currentRows = daily.slice(-windowDays);
    const previousRows = daily.slice(0, Math.max(0, daily.length - windowDays));

    const curOrders = sumBy(currentRows, (r) => Number(r.totalPurchases || 0));
    const prevOrders = sumBy(previousRows, (r) =>
      Number(r.totalPurchases || 0),
    );
    const curRevenue = sumBy(currentRows, (r) => Number(r.totalRevenue || 0));
    const prevRevenue = sumBy(previousRows, (r) =>
      Number(r.totalRevenue || 0),
    );
    const curValid = sumBy(currentRows, (r) => Number(r.validPurchases ?? 0));
    const hasValidSplit = currentRows.some(
      (r) =>
        typeof r.validPurchases === "number" ||
        typeof r.invalidPurchases === "number",
    );
    const validRate = curOrders > 0 ? Math.round((curValid / curOrders) * 100) : 0;
    const prevValidRate =
      prevOrders > 0
        ? Math.round(
            (sumBy(previousRows, (r) => Number(r.validPurchases ?? 0)) /
              prevOrders) *
              100,
          )
        : null;

    const curAov = curOrders > 0 ? curRevenue / curOrders : 0;
    const prevAov =
      prevOrders > 0 ? prevRevenue / prevOrders : 0;

    return {
      curOrders,
      curRevenue,
      curAov,
      validRate,
      hasValidSplit,
      ordersTrend: currentRows.map((r) => Number(r.totalPurchases || 0)),
      revenueTrend: currentRows.map((r) => Number(r.totalRevenue || 0)),
      aovTrend: currentRows.map((r) => {
        const o = Number(r.totalPurchases || 0);
        return o > 0 ? Number(r.totalRevenue || 0) / o : 0;
      }),
      ordersDelta: pctDelta(curOrders, prevOrders),
      revenueDelta: pctDelta(curRevenue, prevRevenue),
      aovDelta: pctDelta(curAov, prevAov),
      validRateDelta:
        prevValidRate !== null ? validRate - prevValidRate : null,
    };
  }, [daily, period, customStart, customEnd]);

  const periodLabel = useMemo(
    () =>
      period === "custom"
        ? t("orders.overviewCustom")
        : t("orders.overviewPeriodLabel", { count: period }),
    [period, t],
  );

  const changePeriod = (value: string) => {
    setPeriod(value);
    if (value === "custom") {
      setCustomStart((s) => s ?? daysAgo(13));
      setCustomEnd((e) => e ?? todayStr());
    }
  };

  if (failed && !summary) return null;

  if (!summary) {
    return (
      <section
        aria-hidden="true"
        className="mb-3 rounded-xl border border-border/60 bg-card/60 p-3 shadow-xs"
      >
        <div className="skeleton-shimmer h-[56px] rounded-lg" />
      </section>
    );
  }

  const segmentedBtn = (active: boolean) =>
    `min-h-[32px] flex-shrink-0 whitespace-nowrap rounded-md px-2.5 text-xs font-semibold transition-all ${
      active
        ? "bg-primary text-primary-foreground shadow-xs"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  const dateInputClass =
    "rounded-md border border-border/70 bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-hidden";

  const vsPrevTitle = t("orders.overviewVsPrevPeriod");

  const kpis: Array<{
    key: string;
    label: string;
    value: string;
    delta: number | null;
    deltaIsPoints?: boolean;
    icon: React.ReactNode;
    spark?: number[];
    tone: "primary" | "success" | "muted" | "info";
    aria: string;
  }> = [
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
    kpis.push({
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

  return (
    <section aria-label={t("orders.overviewAriaLabel")} className="mb-3">
      <div className="rounded-xl border border-border/70 bg-card p-3 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2.5 sm:gap-x-4 sm:gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
            {kpis.map((kpi) => (
              <div key={kpi.key} className="flex min-w-0 items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/30 text-muted-foreground">
                    {kpi.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {kpi.label}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-bold font-mono tabular-nums leading-tight text-foreground">
                        {kpi.value}
                      </p>
                      <DeltaPill
                        delta={kpi.delta}
                        title={
                          kpi.deltaIsPoints ? vsPrevTitle : `${vsPrevTitle} (${periodLabel})`
                        }
                      />
                    </div>
                  </div>
                </div>
                {kpi.spark && kpi.spark.length > 1 && (
                  <div className="hidden shrink-0 xl:block">
                    <Sparkline
                      data={kpi.spark}
                      width={48}
                      height={20}
                      tone={kpi.tone}
                      filled
                      ariaLabel={kpi.aria}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-2.5 lg:border-t-0 lg:border-r lg:pt-0 lg:pr-3">
            {period === "custom" && (
              <div className="flex w-full items-center justify-between gap-1.5 sm:w-auto">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="date"
                  value={customStart}
                  max={customEnd}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className={dateInputClass}
                  aria-label={t("orders.overviewFrom")}
                />
                <span className="text-xs text-muted-foreground">
                  {t("orders.overviewTo")}
                </span>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className={dateInputClass}
                  aria-label={t("orders.overviewTo")}
                />
              </div>
            )}
            <div
              className="no-scrollbar flex w-full items-center gap-1 overflow-x-auto rounded-lg border border-border/70 bg-muted/20 p-0.5 sm:w-auto"
              role="tablist"
              aria-label={periodLabel}
            >
              {PRESET_PERIODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  role="tab"
                  aria-selected={period === p.value}
                  onClick={() => changePeriod(p.value)}
                  className={segmentedBtn(period === p.value)}
                >
                  {t(`orders.${p.labelKey}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OrdersOverviewStats;
