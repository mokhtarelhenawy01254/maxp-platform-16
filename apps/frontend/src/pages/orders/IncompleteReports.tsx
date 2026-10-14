import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDirection } from "../../i18n";
import { Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  ShoppingCartIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  XCircleIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../services/apiClient";
import { useCurrency } from "../../hooks/useCurrency";

export interface CohortDay {
  date: string;
  entered: number;
  enteredValue: number;
  converted: number;
  convertedValue: number;
  byTeamConverted: number;
  byTeamConvertedValue: number;
  naturalConverted: number;
  naturalConvertedValue: number;
  cancelled: number;
  cancelledValue: number;
  lost: number;
  lostValue: number;
  active: number;
  activeValue: number;
  uncompleted?: number;
  uncompletedValue?: number;
  conversionRate: number;
}

export interface SummaryData {
  entered: number;
  enteredValue: number;
  converted: number;
  convertedValue: number;
  byTeam: number;
  byTeamValue: number;
  natural: number;
  naturalValue: number;
  cancelled: number;
  cancelledValue: number;
  lost: number;
  lostValue: number;
  active: number;
  activeValue: number;
  uncompleted?: number;
  uncompletedValue?: number;
  conversionRate: number;
  lostAfterHours?: number;
}

export interface DismissalReason {
  reason: string;
  count: number;
}

interface ReportData {
  periodDays: number | null;
  summary?: SummaryData;
  cohorts?: CohortDay[];
  dismissalReasons?: DismissalReason[];
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
    byTeamValue?: number;
    natural: number;
    naturalValue?: number;
    allConverted?: number;
    allConvertedValue?: number;
  };
  team: Array<{
    employeeId: string | null;
    employeeName: string;
    displayName?: string;
    email?: string;
    avatar?: string | null;
    conversions: number;
    value: number;
    avgValue: number;
    contacts: number;
    dismissed?: number;
    handledTotal?: number;
    conversionRate?: number;
    responses: number;
    responseRate: number;
  }>;
  orderSources: Array<{ source: string; count: number; value: number }>;
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

const formatCohortDayLabel = (dateStr: string, isRTL: boolean) => {
  const now = new Date();
  const todayKey = toDateInput(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toDateInput(yesterday);

  if (dateStr === todayKey) {
    return {
      main: isRTL ? "اليوم" : "Today",
      isToday: true,
      isYesterday: false,
    };
  }
  if (dateStr === yesterdayKey) {
    return {
      main: isRTL ? "أمس" : "Yesterday",
      isToday: false,
      isYesterday: true,
    };
  }
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const main = dateObj.toLocaleDateString(isRTL ? "ar-EG" : "en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    return { main, isToday: false, isYesterday: false };
  } catch {
    return { main: dateStr, isToday: false, isYesterday: false };
  }
};

const IncompleteReports: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const isRTL = getDirection() === "rtl";

  // الوضع الافتراضي لتقرير السلات هو "اليوم"
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
          setHint(t("orders.incompleteSelectCustomDates", "يرجى اختيار تاريخ البداية والنهاية"));
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
        setError(t("orders.incompleteReportsError", "حدث خطأ في تحميل التقارير"));
      }
    } catch (err) {
      const canceled =
        controller.signal.aborted ||
        (err as { code?: string })?.code === "ERR_CANCELED" ||
        (err as { name?: string })?.name === "CanceledError";
      if (canceled) return;
      const apiError = err as { response?: { data?: { message?: string } }; message?: string };
      setError(
        apiError.response?.data?.message ||
          apiError.message ||
          t("orders.incompleteReportsError", "حدث خطأ في تحميل التقارير"),
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

  const BackIcon = isRTL ? ArrowRightIcon : ArrowLeftIcon;

  // حل بيانات الملخص الموحدة لكروت الفاقد والمعلق
  const summary: SummaryData = data?.summary ?? {
    entered: (data?.pipeline?.total || 0) + (data?.recovery?.converted || 0),
    enteredValue: (data?.pipeline?.totalValue || 0) + (data?.recovery?.convertedValue || 0),
    converted: data?.recovery?.converted || 0,
    convertedValue: data?.recovery?.convertedValue || 0,
    byTeam: data?.recovery?.byTeam || 0,
    byTeamValue: data?.recovery?.byTeamValue ?? data?.recovery?.convertedValue ?? 0,
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

  // إجمالي السلات التي لم تتحول لأوردر (الملغاة + المفقودة + النشطة)
  const totalUncompletedCount =
    summary.uncompleted ?? summary.cancelled + summary.lost + summary.active;
  const totalUncompletedValue =
    summary.uncompletedValue ?? summary.cancelledValue + summary.lostValue + summary.activeValue;

  const cohorts = data?.cohorts ?? [];
  const dismissalReasons = data?.dismissalReasons ?? [];

  const sourceMeta: Record<string, { label: string; color: string }> = {
    facebook: { label: t("orders.sourceFacebook", "فيسبوك (Facebook)"), color: "bg-blue-600" },
    instagram: {
      label: t("orders.sourceInstagram", "إنستغرام (Instagram)"),
      color: "bg-gradient-to-r from-purple-500 to-pink-500",
    },
    tiktok: { label: t("orders.sourceTikTok", "تيك توك (TikTok)"), color: "bg-neutral-900 dark:bg-neutral-100" },
    snapchat: { label: t("orders.sourceSnapchat", "سناب شات (Snapchat)"), color: "bg-amber-400" },
    google: { label: t("orders.sourceGoogle", "إعلانات جوجل (Google)"), color: "bg-red-500" },
    direct: { label: t("orders.sourceDirect", "مباشر / بدون إعلان"), color: "bg-slate-400" },
    storefront: { label: t("orders.sourceStorefront", "المتجر"), color: "bg-blue-500" },
    ai_conversation: { label: t("orders.sourceAutoConversation", "محادثة ذكية"), color: "bg-purple-500" },
    internal_push: { label: t("orders.sourceInternalPush", "إدخال داخلي"), color: "bg-amber-500" },
    manual: { label: t("orders.sourceManual", "يدوي"), color: "bg-emerald-500" },
    woocommerce: { label: t("orders.sourceWooCommerce", "ووكومرس"), color: "bg-teal-500" },
    api: { label: t("orders.sourceAPI", "API"), color: "bg-pink-500" },
    import: { label: t("orders.sourceImport", "استيراد"), color: "bg-indigo-500" },
  };
  const unknownSourceMeta = { label: t("orders.sourceUnknown", "غير محدد"), color: "bg-gray-400" };
  const totalOrderSources = data?.orderSources ? data.orderSources.reduce((sum, s) => sum + s.count, 0) : 0;

  return (
    <div className="space-y-6" dir={getDirection()}>
      {/* الشريط العلوي وفلتر الفترة الزمنية */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("orders.incompleteReports", "تقارير السلات غير المكتملة")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            رصد السلات المتروكة التي لم تتحول لطلبات: الملغاة بالتأكيد، المفقودة بالتقادم، والفرص المعلقة في الطابور
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={period}
            onChange={(e) => {
              const next = e.target.value;
              if (next === "custom") {
                setCustomFrom((prev) => prev || toDateInput(new Date(Date.now() - 29 * 86400000)));
                setCustomTo((prev) => prev || toDateInput(new Date()));
              }
              setPeriod(next);
            }}
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm font-medium focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition-all shadow-sm"
            aria-label={t("orders.incompletePeriodLabel", "الفترة الزمنية") as string}
          >
            {PERIODS.map((p) => (
              <option key={p} value={p}>
                {p === "today"
                  ? t("orders.incompleteToday", "اليوم")
                  : p === "yesterday"
                    ? t("orders.incompleteYesterday", "أمس")
                    : p === "custom"
                      ? t("orders.incompleteCustomPeriod", "فترة مخصصة")
                      : t("orders.incompleteDays", { count: Number(p), defaultValue: `آخر ${p} يوم` })}
              </option>
            ))}
          </select>
          {period === "custom" && (
            <>
              <label htmlFor="incomplete-report-from" className="sr-only">
                {t("orders.incompleteFrom", "من")}
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
                {t("orders.incompleteTo", "إلى")}
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
            className="inline-flex items-center justify-center p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            title={t("orders.incompleteRetry", "إعادة التحميل") as string}
            aria-label={t("orders.incompleteRetry", "إعادة التحميل") as string}
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            to="/orders/incomplete"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            <BackIcon className="h-4 w-4" />
            {t("orders.incompleteBack", "رجوع للسلات")}
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
            {t("orders.incompleteRetry", "إعادة المحاولة")}
          </button>
        </div>
      ) : data ? (
        <>
          {error && !loading && (
            <div className="flex items-center justify-between flex-wrap gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
              <span>{t("orders.incompleteReportsStaleError", "تعذر تحديث البيانات، يتم عرض آخر بيانات محملة")}</span>
              <button
                type="button"
                onClick={() => setRefreshKey((prev) => prev + 1)}
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 dark:border-amber-600/60 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                {t("orders.incompleteRetry", "إعادة المحاولة")}
              </button>
            </div>
          )}

          {/* 🎯 كروت الفاقد والمعلق: تركيز 100% على السلات التي لم تتحول لأوردر */}
          <section>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                {period === "today"
                  ? "كشف السلات غير المكتملة لليوم (الفاقد والمعلق)"
                  : period === "yesterday"
                    ? "كشف السلات غير المكتملة لأمس"
                    : `كشف السلات غير المكتملة (${period === "custom" ? "فترة مخصصة" : `آخر ${period} يوم`})`}
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                إجمالي غير المكتمل ({totalUncompletedCount}) = ألغاها الفريق ({summary.cancelled}) + مفقودة بالتقادم (
                {summary.lost}) + معلقة في الطابور ({summary.active})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. إجمالي غير المكتمل (الفاقد والمعلق) */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      إجمالي غير المكتمل (المهدر والمعلق)
                    </span>
                    <div className="p-1.5 rounded-lg text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-700">
                      <ShoppingCartIcon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                    {totalUncompletedCount.toLocaleString()}
                  </div>
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5 tabular-nums">
                    {formatPrice(totalUncompletedValue)}
                  </div>
                </div>
                <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-3 pt-2 border-t border-gray-100 dark:border-gray-700/60">
                  سلات بدأت الشراء ولم تكتمل كأوردرات
                </div>
              </div>

              {/* 2. ألغاها الفريق بالتأكيد */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-rose-200 dark:border-rose-800/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                      ألغاها الفريق بالتأكيد
                    </span>
                    <div className="p-1.5 rounded-lg text-rose-600 bg-rose-50 dark:text-rose-300 dark:bg-rose-900/30">
                      <XCircleIcon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-rose-700 dark:text-rose-400 tabular-nums">
                    {summary.cancelled.toLocaleString()}
                  </div>
                  <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-0.5 tabular-nums">
                    {formatPrice(summary.cancelledValue)}
                  </div>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-3 pt-2 border-t border-rose-50 dark:border-rose-800/30">
                  تم التواصل مع العميل وتأكيد الإلغاء
                </div>
              </div>

              {/* 3. مفقودة بالتقادم */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-amber-200 dark:border-amber-800/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      مفقودة بالتقادم
                    </span>
                    <div className="p-1.5 rounded-lg text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/30">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                    {summary.lost.toLocaleString()}
                  </div>
                  <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-0.5 tabular-nums">
                    {formatPrice(summary.lostValue)}
                  </div>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-3 pt-2 border-t border-amber-50 dark:border-amber-800/30">
                  انتهت مهلة الصلاحية ({summary.lostAfterHours || 24} ساعة) دون استرداد
                </div>
              </div>

              {/* 4. معلقة في الطابور حالياً */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-blue-200 dark:border-blue-800/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      معلقة في الطابور (فرص قائمة)
                    </span>
                    <div className="p-1.5 rounded-lg text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/30">
                      <ClockIcon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 tabular-nums">
                    {summary.active.toLocaleString()}
                  </div>
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5 tabular-nums">
                    {formatPrice(summary.activeValue)}
                  </div>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-3 pt-2 border-t border-blue-50 dark:border-blue-800/30">
                  في طابور العمل لم تنتهِ ومتاحة للإنقاذ الآن
                </div>
              </div>
            </div>

            {/* سطر مرجعي شفاف لتوضيح أن ما تحول خرج للطلبات */}
            <div className="flex items-center justify-between gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400 bg-gray-50/70 dark:bg-gray-800/40 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700/60 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  التقرير يركز حصرياً على السلات التي لم تتحول لأوردرات (الملغاة + المفقودة + المعلقة)
                </span>
              </div>
              {summary.converted > 0 && (
                <span className="text-[11px] text-gray-400">
                  * السلات التي تحولت بنجاح ({summary.converted.toLocaleString()} طلب بقيمة {formatPrice(summary.convertedValue)}) خرجت من هذا القسم وأصبحت أوردرات فعلية في إدارة الطلبات
                </span>
              )}
            </div>
          </section>

          {/* 📅 جدول كشف حركة السلات غير المكتملة والفاقد اليومي (Daily Uncompleted Flow Table) */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  جدول كشف السلات غير المكتملة والفاقد اليومي (Daily Uncompleted Flow)
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  تتبع يومي للسلات التي لم تكتمل ومصيرها: كم ألغاه الفريق بعد التواصل، كم فُقد بمرور الوقت، وكم لا يزال معلقاً في الطابور
                </p>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-600">
                إجمالي الأيام: <strong className="text-gray-900 dark:text-white tabular-nums">{cohorts.length}</strong>
              </div>
            </div>

            {cohorts.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700/60">
                <table className="w-full text-start min-w-[800px] divide-y divide-gray-100 dark:divide-gray-700/60">
                  <thead className="bg-gray-50/70 dark:bg-gray-700/30">
                    <tr>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        اليوم / التاريخ
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        إجمالي غير المكتمل
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                        ألغاها الفريق بالتأكيد
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                        مفقودة بالتقادم
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        معلقة في الطابور (فرص)
                      </th>
                      <th className="px-4 py-3 text-end text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                        حالة الحسم
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40 bg-white dark:bg-gray-800">
                    {cohorts.map((row) => {
                      const dayLabel = formatCohortDayLabel(row.date, isRTL);
                      const rowUncompleted = row.uncompleted ?? (row.cancelled + row.lost + row.active);
                      const rowUncompletedValue = row.uncompletedValue ?? (row.cancelledValue + row.lostValue + row.activeValue);
                      const resolvedCount = row.cancelled + row.lost;
                      const resolvedRate = rowUncompleted > 0 ? (resolvedCount / rowUncompleted) * 100 : 0;

                      return (
                        <tr
                          key={row.date}
                          className={`hover:bg-gray-50/60 dark:hover:bg-gray-700/20 transition-colors ${
                            dayLabel.isToday ? "bg-blue-50/20 dark:bg-blue-900/10 font-medium" : ""
                          }`}
                        >
                          {/* اليوم والتاريخ */}
                          <td className="px-4 py-3 text-start">
                            <div className="flex items-center gap-2">
                              {dayLabel.isToday && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                  اليوم
                                </span>
                              )}
                              {dayLabel.isYesterday && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                  أمس
                                </span>
                              )}
                              <div>
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {dayLabel.main}
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{row.date}</div>
                              </div>
                            </div>
                          </td>

                          {/* إجمالي غير المكتمل */}
                          <td className="px-4 py-3 text-center">
                            <div className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                              {rowUncompleted.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                              {formatPrice(rowUncompletedValue)}
                            </div>
                          </td>

                          {/* ألغاها الفريق بالتأكيد */}
                          <td className="px-4 py-3 text-center">
                            <div className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                              {row.cancelled.toLocaleString()}
                            </div>
                            {row.cancelledValue > 0 && (
                              <div className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                                {formatPrice(row.cancelledValue)}
                              </div>
                            )}
                          </td>

                          {/* مفقودة بالتقادم */}
                          <td className="px-4 py-3 text-center">
                            <div className="text-sm font-semibold text-amber-700 dark:text-amber-400 tabular-nums">
                              {row.lost.toLocaleString()}
                            </div>
                            {row.lostValue > 0 && (
                              <div className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                                {formatPrice(row.lostValue)}
                              </div>
                            )}
                          </td>

                          {/* معلقة في الطابور */}
                          <td className="px-4 py-3 text-center">
                            <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                              {row.active.toLocaleString()}
                            </div>
                            {row.activeValue > 0 && (
                              <div className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                                {formatPrice(row.activeValue)}
                              </div>
                            )}
                          </td>

                          {/* حالة الحسم */}
                          <td className="px-4 py-3 text-end">
                            <div className="inline-flex flex-col items-end gap-1">
                              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                                {row.active > 0 ? (
                                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                                    {row.active} معلقة
                                  </span>
                                ) : (
                                  <span className="text-gray-400">حُسمت بالكامل</span>
                                )}
                              </span>
                              <div className="w-16 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-gray-500 dark:bg-gray-400 h-1.5 rounded-full transition-all"
                                  style={{ width: `${Math.min(100, Math.max(0, resolvedRate))}%` }}
                                  title={`تم حسم ${resolvedRate.toFixed(0)}% من السلات غير المكتملة`}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* صف الإجمالي النهائي لكامل الفترة */}
                  <tfoot className="bg-gray-50/80 dark:bg-gray-700/40 font-semibold border-t-2 border-gray-200 dark:border-gray-700 text-xs">
                    <tr>
                      <td className="px-4 py-3 text-start text-gray-900 dark:text-white font-bold">
                        إجمالي الفترة المحددة
                      </td>
                      <td className="px-4 py-3 text-center text-gray-900 dark:text-white tabular-nums">
                        <div className="font-bold">{totalUncompletedCount.toLocaleString()}</div>
                        <div className="text-gray-500 dark:text-gray-400 text-[11px]">
                          {formatPrice(totalUncompletedValue)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-rose-600 dark:text-rose-400 tabular-nums font-bold">
                        <div>{summary.cancelled.toLocaleString()}</div>
                        {summary.cancelledValue > 0 && (
                          <div className="text-gray-400 text-[11px]">{formatPrice(summary.cancelledValue)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-amber-700 dark:text-amber-400 tabular-nums font-bold">
                        <div>{summary.lost.toLocaleString()}</div>
                        {summary.lostValue > 0 && (
                          <div className="text-gray-400 text-[11px]">{formatPrice(summary.lostValue)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-blue-600 dark:text-blue-400 tabular-nums font-bold">
                        <div>{summary.active.toLocaleString()}</div>
                        {summary.activeValue > 0 && (
                          <div className="text-gray-400 text-[11px]">{formatPrice(summary.activeValue)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-end text-gray-700 dark:text-gray-300 tabular-nums font-bold text-xs">
                        {summary.active > 0 ? `${summary.active} فرصة معلقة` : "لا توجد سلات معلقة"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                لا توجد سلات مسجلة في هذه الفترة
              </p>
            )}
          </section>

          {/* 🔍 أسباب الإلغاء والاستبعاد المسجلة من الفريق */}
          {dismissalReasons.length > 0 && (
            <section className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <ShieldExclamationIcon className="h-5 w-5 text-rose-500" />
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                    أسباب الإلغاء والاستبعاد الموثقة
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    الأسباب التي سجلها الفريق عند التواصل مع العملاء وتأكيد إلغاء السلة
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {dismissalReasons.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-gray-50/70 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/50"
                  >
                    <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                      {item.reason}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40 tabular-nums shrink-0">
                      {item.count.toLocaleString()} سلة
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 👥 جدول تعامل الموظفين مع السلات غير المكتملة */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  تعامل الفريق مع السلات المتروكة
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  تفصيل إنجاز كل موظف: السلات المتداولة، السلات المستبعدة بعد التأكيد، ومحاولات التواصل
                </p>
              </div>
              {data.team.length > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  عدد أعضاء الفريق:{" "}
                  <strong className="text-gray-900 dark:text-white tabular-nums">{data.team.length}</strong>
                </div>
              )}
            </div>

            {data.team.length ? (
              <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700/60">
                <table className="w-full text-start min-w-[700px] divide-y divide-gray-100 dark:divide-gray-700/60">
                  <thead className="bg-gray-50/70 dark:bg-gray-700/30">
                    <tr>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t("orders.incompleteTeamEmployee", "الموظف")}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                        سلات ألغاها بالتأكيد
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        محاولات التواصل
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        إجمالي التعامل
                      </th>
                      <th className="px-4 py-3 text-end text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        معدل الاستجابة
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40 bg-white dark:bg-gray-800">
                    {data.team.map((member, idx) => {
                      const name =
                        member.displayName || member.employeeName || t("orders.incompleteTeamUnknown", "غير معروف");
                      const initials =
                        name
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")
                          .toUpperCase() || "U";
                      const handled = Number(member.handledTotal ?? member.conversions + (member.dismissed || 0));

                      return (
                        <tr
                          key={`${member.employeeId || member.employeeName}-${idx}`}
                          className="hover:bg-gray-50/60 dark:hover:bg-gray-700/20 transition-colors"
                        >
                          <td className="px-4 py-3 text-start">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-4 text-center tabular-nums">
                                #{idx + 1}
                              </span>
                              {member.avatar ? (
                                <img
                                  src={member.avatar}
                                  alt={name}
                                  className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-800/40">
                                  {initials}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                  {name}
                                </div>
                                {member.email && member.email !== name && (
                                  <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                                    {member.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40 tabular-nums">
                              {Number(member.dismissed || 0).toLocaleString()}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300 tabular-nums">
                            {member.contacts.toLocaleString()}
                          </td>

                          <td className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-white tabular-nums">
                            {handled.toLocaleString()}
                          </td>

                          <td className="px-4 py-3 text-end text-sm text-gray-700 dark:text-gray-300 tabular-nums">
                            {member.responseRate.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {data.team.length > 1 && (
                    <tfoot className="bg-gray-50/80 dark:bg-gray-700/40 font-semibold border-t-2 border-gray-200 dark:border-gray-700 text-xs">
                      <tr>
                        <td className="px-4 py-3 text-start text-gray-900 dark:text-white font-bold">
                          إجمالي تعامل الفريق
                        </td>
                        <td className="px-4 py-3 text-center text-rose-700 dark:text-rose-300 tabular-nums font-bold">
                          {data.team.reduce((s, m) => s + Number(m.dismissed || 0), 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300 tabular-nums font-bold">
                          {data.team.reduce((s, m) => s + m.contacts, 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-900 dark:text-white tabular-nums font-bold">
                          {data.team
                            .reduce((s, m) => s + Number(m.handledTotal ?? m.conversions + (m.dismissed || 0)), 0)
                            .toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-end text-gray-700 dark:text-gray-300 tabular-nums font-bold">
                          {(() => {
                            const totalContacts = data.team.reduce((s, m) => s + m.contacts, 0);
                            const totalResponses = data.team.reduce((s, m) => s + m.responses, 0);
                            return `${totalContacts > 0 ? ((totalResponses / totalContacts) * 100).toFixed(1) : "0.0"}%`;
                          })()}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                لا توجد تعاملات مسجلة للفريق في هذه الفترة
              </p>
            )}
          </section>

          {/* 📡 مصادر السلات غير المكتملة */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              {t("orders.incompleteOrderSources", "مصادر السلات غير المكتملة")}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {t(
                "orders.incompleteOrderSourcesHint",
                "القنوات الإعلانية والمنصات التي دخل منها العملاء الذين تركوا سلاتهم دون إتمام",
              )}
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
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {data.orderSources.map((s) => {
                    const meta = sourceMeta[s.source] || unknownSourceMeta;
                    return (
                      <div
                        key={s.source}
                        className="flex items-center justify-between gap-3 text-sm p-2 rounded-lg bg-gray-50/60 dark:bg-gray-700/20 border border-gray-100 dark:border-gray-700/40"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${meta.color}`} />
                          <span className="text-gray-700 dark:text-gray-200 truncate text-xs font-medium">
                            {meta.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-gray-900 dark:text-white text-xs tabular-nums">
                            {s.count.toLocaleString()}
                          </span>
                          <span className="text-gray-400 dark:text-gray-500 text-xs tabular-nums">
                            {formatPrice(s.value)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
                لا توجد مصادر مسجلة للسلات في هذه الفترة
              </p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
};

export default IncompleteReports;
