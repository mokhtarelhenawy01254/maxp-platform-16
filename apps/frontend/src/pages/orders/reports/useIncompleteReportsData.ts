import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../../../services/apiClient";
import type { ReportData, SummaryData } from "./IncompleteReportsTypes";

export const PERIODS = [
  "today",
  "yesterday",
  "3",
  "7",
  "14",
  "30",
  "90",
  "365",
  "custom",
];

export const toDateInput = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const getCalendarRange = (
  period: string
): { from: string; to: string } | null => {
  const now = new Date();
  if (period === "today") {
    const today = toDateInput(now);
    return { from: today, to: today };
  }
  if (period === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const day = toDateInput(yesterday);
    return { from: day, to: day };
  }
  return null;
};

export function useIncompleteReportsData() {
  const { t } = useTranslation();

  const [period, setPeriod] = useState("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const abortRef = useRef<AbortController | null>(null);

  const fetchReports = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      setLoading(true);
      setError(null);
      setHint(null);
      const params: Record<string, string> = {};
      if (period === "custom") {
        if (!customFrom || !customTo) {
          setHint(
            t(
              "orders.incompleteSelectCustomDates",
              "يرجى اختيار تاريخ البداية والنهاية"
            )
          );
          return;
        }
        params["from"] = customFrom;
        params["to"] = customTo;
      } else {
        const range = getCalendarRange(period);
        if (range) {
          params["from"] = range.from;
          params["to"] = range.to;
        } else {
          params["days"] = period;
        }
      }
      const response = await apiClient.get<{
        success: boolean;
        data?: ReportData;
      }>("/orders-new/incomplete/reports", {
        params,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (response.data?.success && response.data?.data) {
        setData(response.data.data);
      } else {
        setError(
          t("orders.incompleteReportsError", "حدث خطأ في تحميل التقارير")
        );
      }
    } catch (err) {
      const canceled =
        controller.signal.aborted ||
        (err as { code?: string })?.code === "ERR_CANCELED" ||
        (err as { name?: string })?.name === "CanceledError";
      if (canceled) return;
      const apiError = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        apiError.response?.data?.message ||
          apiError.message ||
          t("orders.incompleteReportsError", "حدث خطأ في تحميل التقارير")
      );
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [period, customFrom, customTo, t]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports, refreshKey]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleRetry = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const summary: SummaryData = data?.summary ?? {
    entered: (data?.pipeline?.total || 0) + (data?.recovery?.converted || 0),
    enteredValue:
      (data?.pipeline?.totalValue || 0) +
      (data?.recovery?.convertedValue || 0),
    converted: data?.recovery?.converted || 0,
    convertedValue: data?.recovery?.convertedValue || 0,
    byTeam: data?.recovery?.byTeam || 0,
    byTeamValue:
      data?.recovery?.byTeamValue ?? data?.recovery?.convertedValue ?? 0,
    natural: data?.recovery?.natural || 0,
    naturalValue: data?.recovery?.naturalValue ?? 0,
    cancelled: 0,
    cancelledValue: 0,
    lost: data?.pipeline?.lost || 0,
    lostValue: data?.pipeline?.lostValue || 0,
    active: data?.pipeline?.active || 0,
    activeValue: data?.pipeline?.activeValue || 0,
    uncompleted: data?.pipeline?.total || 0,
    uncompletedValue: data?.pipeline?.totalValue || 0,
    conversionRate: data?.recovery?.recoveryRate || 0,
    lostAfterHours: 24,
  };

  const totalUncompletedCount =
    summary.uncompleted ??
    summary.cancelled + summary.lost + summary.active;
  const totalUncompletedValue =
    summary.uncompletedValue ??
    summary.cancelledValue + summary.lostValue + summary.activeValue;

  return {
    period,
    setPeriod,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    data,
    loading,
    error,
    hint,
    summary,
    totalUncompletedCount,
    totalUncompletedValue,
    cohorts: data?.cohorts ?? [],
    dismissalReasons: data?.dismissalReasons ?? [],
    team: data?.team ?? [],
    orderSources: data?.orderSources ?? [],
    handleRetry,
  };
}

export default useIncompleteReportsData;
