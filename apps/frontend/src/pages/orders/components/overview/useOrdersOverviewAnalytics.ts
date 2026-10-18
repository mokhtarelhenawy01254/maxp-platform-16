import { useEffect, useMemo, useState } from "react";
import analyticsService from "../../../../services/analyticsService";
import {
  DailyAnalytic,
  PRESET_PERIODS,
  PERIOD_STORAGE_KEY,
  todayStr,
  daysAgo,
  addDays,
  sumBy,
  pctDelta,
} from "../../utils/overviewStatsHelpers";

export function useOrdersOverviewAnalytics(onLoaded?: (loaded: boolean) => void) {
  const [daily, setDaily] = useState<DailyAnalytic[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [period, setPeriod] = useState(() => {
    try {
      const saved = localStorage.getItem(PERIOD_STORAGE_KEY);
      return saved && PRESET_PERIODS.some((p) => p.value === saved) ? saved : "14";
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
            Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1
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
          controller.signal
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
            Math.round((new Date(customEnd).getTime() - new Date(customStart).getTime()) / 86400000) +
              1
          )
        : parseInt(period, 10);

    const currentRows = daily.slice(-windowDays);
    const previousRows = daily.slice(0, Math.max(0, daily.length - windowDays));

    const curOrders = sumBy(currentRows, (r) => Number(r.totalPurchases || 0));
    const prevOrders = sumBy(previousRows, (r) => Number(r.totalPurchases || 0));
    const curRevenue = sumBy(currentRows, (r) => Number(r.totalRevenue || 0));
    const prevRevenue = sumBy(previousRows, (r) => Number(r.totalRevenue || 0));
    const curValid = sumBy(currentRows, (r) => Number(r.validPurchases ?? 0));
    const hasValidSplit = currentRows.some(
      (r) => typeof r.validPurchases === "number" || typeof r.invalidPurchases === "number"
    );
    const validRate = curOrders > 0 ? Math.round((curValid / curOrders) * 100) : 0;
    const prevValidRate =
      prevOrders > 0
        ? Math.round(
            (sumBy(previousRows, (r) => Number(r.validPurchases ?? 0)) / prevOrders) * 100
          )
        : null;

    const curAov = curOrders > 0 ? curRevenue / curOrders : 0;
    const prevAov = prevOrders > 0 ? prevRevenue / prevOrders : 0;

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
      validRateDelta: prevValidRate !== null ? validRate - prevValidRate : null,
    };
  }, [daily, period, customStart, customEnd]);

  const changePeriod = (value: string) => {
    setPeriod(value);
    if (value === "custom") {
      setCustomStart((s) => s ?? daysAgo(13));
      setCustomEnd((e) => e ?? todayStr());
    }
  };

  return {
    summary,
    failed,
    period,
    customStart,
    customEnd,
    changePeriod,
    setCustomStart,
    setCustomEnd,
  };
}

export default useOrdersOverviewAnalytics;
