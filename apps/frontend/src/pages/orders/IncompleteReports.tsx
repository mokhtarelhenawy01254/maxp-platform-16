import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDirection } from "../../i18n";
import { Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";
import {
  ConvertedOrdersDestinyCard,
  ConvertedOrdersDestiny,
} from "./components/ConvertedOrdersDestinyCard";
import { getOrderStatusDisplay } from "../../utils/statusRegistry";

interface ReportData {
  periodDays: number | null;
  pipeline: {
    total: number;
    windowTotal?: number;
    active: number;
    lost: number;
    totalValue: number;
    activeValue: number;
    lostValue: number;
  };
  recovery: {
    converted: number;
    convertedValue: number;
    avgConvertedValue: number;
    recoveryRate: number;
    funnelBase?: number;
    byTeam: number;
    natural: number;
  };
  destiny?: ConvertedOrdersDestiny;
  team: Array<{
    employeeId: string | null;
    employeeName: string;
    conversions: number;
    value: number;
    avgValue: number;
    contacts: number;
    responses: number;
    responseRate: number;
  }>;
  trend: Array<{ date: string; conversions: number; value: number }>;
  orderSources: Array<{ source: string; count: number; value: number }>;
  recent: Array<{
    cartId: string;
    orderId?: string | null;
    orderNumber: string | null;
    orderStatus?: string | null;
    employeeName: string | null;
    value: number;
    governorate: string | null;
    convertedAt: string | null;
  }>;
}

const PERIODS = ["today", "yesterday", "3", "7", "14", "30", "90", "365", "custom"];

const toDateInput = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getCalendarRange = (period: string): { from: string; to: string } | null => {
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

interface StatCard {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const IncompleteReports: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { formatPrice } = useCurrency();
  const isRTL = getDirection() === "rtl";

  const [period, setPeriod] = useState("30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // إلغاء الطلب السابق عند تغيير الفترة — من غيره الرد الأبطأ كان يطغى على الأحدث
  // (اختيار «365 يوم» ثم «اليوم» كان ممكن يعرض أرقام الـ365)
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
          setHint(t("orders.incompleteSelectCustomDates"));
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
      const response = await apiClient.get<{ success: boolean; data?: ReportData }>(
        "/orders-new/incomplete/reports",
        { params, signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      if (response.data?.success && response.data?.data) {
        setData(response.data.data);
      } else {
        setError(t("orders.incompleteReportsError"));
      }
    } catch (err) {
      const canceled =
        controller.signal.aborted ||
        (err as { code?: string })?.code === "ERR_CANCELED" ||
        (err as { name?: string })?.name === "CanceledError";
      if (canceled) return;
      const apiError = err as { response?: { data?: { message?: string } }; message?: string };
      setError(apiError.response?.data?.message || apiError.message || t("orders.incompleteReportsError"));
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [period, customFrom, customTo, t]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports, refreshKey]);

  // إلغاء أي طلب جاري عند الخروج من الصفحة
  useEffect(() => () => abortRef.current?.abort(), []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString(i18n.language === "ar" ? "ar-EG" : "en-GB");
    } catch {
      return dateStr;
    }
  };

  const BackIcon = isRTL ? ArrowRightIcon : ArrowLeftIcon;

  const sourceMeta: Record<string, { label: string; color: string }> = {
    storefront: { label: t("orders.sourceStorefront"), color: "bg-blue-500" },
    ai_conversation: { label: t("orders.sourceAutoConversation"), color: "bg-purple-500" },
    internal_push: { label: t("orders.sourceInternalPush"), color: "bg-amber-500" },
    manual: { label: t("orders.sourceManual"), color: "bg-emerald-500" },
    woocommerce: { label: t("orders.sourceWooCommerce"), color: "bg-teal-500" },
    api: { label: t("orders.sourceAPI"), color: "bg-pink-500" },
    import: { label: t("orders.sourceImport"), color: "bg-indigo-500" },
  };
  const unknownSourceMeta = { label: t("orders.sourceUnknown"), color: "bg-gray-400" };
  const totalOrderSources = data
    ? data.orderSources.reduce((sum, s) => sum + s.count, 0)
    : 0;

  const recoveryCards: StatCard[] = data
    ? [
        {
          label: t("orders.incompleteRecovered"),
          value: data.recovery.converted.toLocaleString(),
          icon: CheckCircleIcon,
          color: "text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/30",
        },
        {
          label: t("orders.incompleteRecoveredValue"),
          value: formatPrice(data.recovery.convertedValue),
          icon: CurrencyDollarIcon,
          color: "text-green-600 bg-green-50 dark:text-green-300 dark:bg-green-900/30",
        },
        {
          label: t("orders.incompleteRecoveryRate"),
          value: `${data.recovery.recoveryRate.toFixed(1)}%`,
          sub:
            data.recovery.funnelBase != null
              ? t("orders.incompleteRecoveryRateBase", { count: data.recovery.funnelBase })
              : undefined,
          icon: ShoppingCartIcon,
          color: "text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/30",
        },
        {
          label: t("orders.incompleteAvgConvertedValue"),
          value: formatPrice(data.recovery.avgConvertedValue),
          icon: UserGroupIcon,
          color: "text-purple-600 bg-purple-50 dark:text-purple-300 dark:bg-purple-900/30",
        },
      ]
    : [];

  const pipelineCards: StatCard[] = data
    ? [
        {
          label: t("orders.incompleteActiveCarts"),
          value: data.pipeline.active.toLocaleString(),
          sub: formatPrice(data.pipeline.activeValue),
          icon: ClockIcon,
          color: "text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/30",
        },
        {
          label: t("orders.incompleteLostCarts"),
          value: data.pipeline.lost.toLocaleString(),
          sub: formatPrice(data.pipeline.lostValue),
          icon: ExclamationTriangleIcon,
          color: "text-red-600 bg-red-50 dark:text-red-300 dark:bg-red-900/30",
        },
        {
          label: t("orders.incompleteRecoverableValue"),
          value: formatPrice(data.pipeline.activeValue),
          icon: CurrencyDollarIcon,
          color: "text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/30",
        },
        {
          label: t("orders.totalValue"),
          value: formatPrice(data.pipeline.totalValue),
          icon: ShoppingCartIcon,
          color: "text-gray-600 bg-gray-50 dark:text-gray-300 dark:bg-gray-800",
        },
      ]
    : [];

  return (
    <div className="space-y-6" dir={getDirection()}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("orders.incompleteReports")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {t("orders.incompleteSubtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={period}
            onChange={(e) => {
              const next = e.target.value;
              if (next === "custom") {
                // تعبئة مبدئية (آخر 30 يوم) حتى لا تُجلب بيانات غير متوقعة بصمت
                setCustomFrom((prev) => prev || toDateInput(new Date(Date.now() - 29 * 86400000)));
                setCustomTo((prev) => prev || toDateInput(new Date()));
              }
              setPeriod(next);
            }}
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition-all"
            aria-label={t("orders.incompletePeriodLabel") as string}
          >
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {p === "today"
                  ? t("orders.incompleteToday")
                  : p === "yesterday"
                    ? t("orders.incompleteYesterday")
                    : p === "custom"
                      ? t("orders.incompleteCustomPeriod")
                      : t("orders.incompleteDays", { count: Number(p) })}
              </option>
            ))}
          </select>
          {period === "custom" && (
            <>
              <label htmlFor="incomplete-report-from" className="sr-only">
                {t("orders.incompleteFrom")}
              </label>
              <input
                id="incomplete-report-from"
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition-all"
              />
              <label htmlFor="incomplete-report-to" className="sr-only">
                {t("orders.incompleteTo")}
              </label>
              <input
                id="incomplete-report-to"
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition-all"
              />
            </>
          )}
          <button
            type="button"
            onClick={() => setRefreshKey((prev) => prev + 1)}
            className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title={t("orders.incompleteRetry") as string}
            aria-label={t("orders.incompleteRetry") as string}
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            to="/orders/incomplete"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <BackIcon className="h-4 w-4" />
            {t("orders.incompleteBack")}
          </Link>
        </div>
      </div>

      {hint && !error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
          {hint}
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : !data && error ? (
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-700/40 dark:bg-gray-800">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => setRefreshKey((prev) => prev + 1)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4" />
            {t("orders.incompleteRetry")}
          </button>
        </div>
      ) : data ? (
        <>
          {/* فشل تحديث بعد تحميل سابق: نحافظ على البيانات القديمة مع تنبيه بدل مسح التقرير */}
          {error && !loading && (
            <div className="flex items-center justify-between flex-wrap gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
              <span>{t("orders.incompleteReportsStaleError")}</span>
              <button
                type="button"
                onClick={() => setRefreshKey((prev) => prev + 1)}
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 dark:border-amber-600/60 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                {t("orders.incompleteRetry")}
              </button>
            </div>
          )}
          <section>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {t("orders.incompleteRecoveryOverview")}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {recoveryCards.map((card, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {card.label}
                    </span>
                    <div className={`p-1.5 rounded-lg ${card.color}`}>
                      <card.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</div>
                  {card.sub && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.sub}</div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                {t("orders.incompleteRecoveryByTeam")}: {data.recovery.byTeam.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                {t("orders.incompleteRecoveryNatural")}: {data.recovery.natural.toLocaleString()}
              </span>
            </div>
          </section>

          {/* مصير الطلبات المحولة وجودتها */}
          {data.destiny && (
            <ConvertedOrdersDestinyCard destiny={data.destiny} />
          )}

          <section>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {t("orders.incompleteRecoveryPipeline")}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {pipelineCards.map((card, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {card.label}
                    </span>
                    <div className={`p-1.5 rounded-lg ${card.color}`}>
                      <card.icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{card.value}</div>
                  {card.sub && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.sub}</div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              {t("orders.incompleteOrderSources")}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {t("orders.incompleteOrderSourcesHint")}
            </p>
            {data.orderSources.length ? (
              <div>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700" dir="ltr">
                  {data.orderSources.map((s) => {
                    if (s.count <= 0 || totalOrderSources <= 0) return null;
                    const meta = sourceMeta[s.source] || unknownSourceMeta;
                    return (
                      <div
                        key={s.source}
                        className={`h-full ${meta.color}`}
                        style={{ width: `${(s.count / totalOrderSources) * 100}%` }}
                      />
                    );
                  })}
                </div>
                <div className="mt-4 space-y-2">
                  {data.orderSources.map((s) => {
                    const meta = sourceMeta[s.source] || unknownSourceMeta;
                    return (
                      <div key={s.source} className="flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${meta.color}`} />
                          <span className="text-gray-700 dark:text-gray-200 truncate">{meta.label}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {s.count.toLocaleString()}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400 w-24 text-end">
                            {formatPrice(s.value)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                {t("orders.incompleteNoConversions")}
              </p>
            )}
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                {t("orders.incompleteConversionTrend")}
              </h2>
              {data.trend.length ? (
                <div className="h-64" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.trend} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#8884d8" opacity={0.15} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                      {/* محور منفصل للعدد ومحور للقيمة — بدون هذا تصبح أعمدة التحويلات غير مرئية بجانب القيم المالية */}
                      <YAxis yAxisId="count" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis
                        yAxisId="value"
                        orientation="right"
                        tick={{ fontSize: 11 }}
                        allowDecimals={false}
                        tickFormatter={(v: number) =>
                          v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(v)
                        }
                      />
                      <Tooltip
                        formatter={(value, name) =>
                          name === (t("orders.incompleteValue") as string)
                            ? formatPrice(Number(value))
                            : String(value)
                        }
                      />
                      <Bar
                        yAxisId="count"
                        dataKey="conversions"
                        name={t("orders.incompleteTeamConversions") as string}
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        yAxisId="value"
                        dataKey="value"
                        name={t("orders.incompleteValue") as string}
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                  {t("orders.incompleteNoConversions")}
                </p>
              )}
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                {t("orders.incompleteRecentConversions")}
              </h2>
              {data.recent.length ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {data.recent.map((c) => {
                    const statusInfo = c.orderStatus ? getOrderStatusDisplay({ status: c.orderStatus }) : null;
                    return (
                      <div
                        key={c.cartId}
                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 text-sm dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {c.orderNumber ? (
                              <Link
                                to={`/orders?search=${encodeURIComponent(c.orderNumber)}`}
                                className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate"
                                title={t("incompleteViewOrder", "عرض الطلب") as string}
                              >
                                {c.orderNumber}
                              </Link>
                            ) : (
                              <span className="font-medium text-gray-900 dark:text-white truncate">
                                {c.cartId.slice(0, 12)}
                              </span>
                            )}
                            {statusInfo && (
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${statusInfo.primary.colorClass}`}
                              >
                                {statusInfo.primary.label}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {c.employeeName || "-"} · {formatDate(c.convertedAt)}
                            {c.governorate ? ` · ${c.governorate}` : ""}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                          {formatPrice(c.value)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                  {t("orders.incompleteNoConversions")}
                </p>
              )}
            </section>
          </div>

          <section className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              {t("orders.incompleteTeamPerformance")}
            </h2>
            {data.team.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-start min-w-[700px]">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("orders.incompleteTeamEmployee")}
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("orders.incompleteTeamContacts")}
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("orders.incompleteTeamResponses")}
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("orders.incompleteTeamResponseRate")}
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("orders.incompleteTeamConversions")}
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("orders.incompleteTeamValue")}
                      </th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("orders.incompleteTeamAvg")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.team.map((member, idx) => (
                      <tr
                        key={`${member.employeeId || member.employeeName}-${idx}`}
                        className="border-b border-gray-50 dark:border-gray-700/50 last:border-0"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {member.employeeName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {member.contacts.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {member.responses.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {member.responseRate.toFixed(0)}%
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {member.conversions.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatPrice(member.value)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                          {formatPrice(member.avgValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                {t("orders.incompleteNoConversions")}
              </p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
};

export default IncompleteReports;
