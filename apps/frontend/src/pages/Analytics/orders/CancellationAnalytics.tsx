import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowPathIcon,
  BanknotesIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import { useCurrency } from "../../../hooks/useCurrency";
import analyticsService from "../../../services/analyticsService";
import cancellationReasonService from "../../../services/cancellationReasonService";
import { normalizeCancellationReasonOptions } from "../../../services/cancellationReasonUtils";
import toast from "react-hot-toast";

type HeroIcon = React.ForwardRefExoticComponent<
  React.PropsWithoutRef<React.SVGProps<SVGSVGElement>> &
    { title?: string; titleId?: string } &
    React.RefAttributes<SVGSVGElement>
>;

interface CancellationSummary {
  totalCancelledOrders: number;
  regularOrders: number;
  guestOrders: number;
  totalLostRevenue: number;
  averageCancelledOrderValue: number;
  withReason: number;
  withoutReason: number;
  autoCancelled: number;
  reviewedByAgent: number;
}

interface CancellationReasonRow {
  reason: string;
  count: number;
  percentage: number;
  lostRevenue: number;
  latestAt?: string | null;
}

interface CancellationCategoryRow {
  category: string;
  count: number;
  percentage: number;
  lostRevenue: number;
}

interface CancellationTrendRow {
  date: string;
  cancellations: number;
  lostRevenue: number;
}

interface CancellationOrderRow {
  id: string;
  type: "REGULAR" | "GUEST";
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  city?: string;
  governorate?: string;
  region: string;
  total: number;
  paymentMethod?: string;
  reason: string;
  reasonCategory: string;
  hasRecordedReason: boolean;
  cancelledBy: string;
  oldStatus?: string;
  cancelledAt?: string | null;
  createdAt?: string | null;
  source: string;
  reviewUrl: string;
}

interface CancellationAnalyticsData {
  summary: CancellationSummary;
  reasonBreakdown: CancellationReasonRow[];
  categoryBreakdown: CancellationCategoryRow[];
  dailyTrend: CancellationTrendRow[];
  orders: CancellationOrderRow[];
}

const emptyData: CancellationAnalyticsData = {
  summary: {
    totalCancelledOrders: 0,
    regularOrders: 0,
    guestOrders: 0,
    totalLostRevenue: 0,
    averageCancelledOrderValue: 0,
    withReason: 0,
    withoutReason: 0,
    autoCancelled: 0,
    reviewedByAgent: 0,
  },
  reasonBreakdown: [],
  categoryBreakdown: [],
  dailyTrend: [],
  orders: [],
};

const periodOptions = [
  { value: "7", label: "آخر 7 أيام" },
  { value: "30", label: "آخر 30 يوم" },
  { value: "90", label: "آخر 90 يوم" },
  { value: "365", label: "آخر سنة" },
];

const reasonSettingsSectionId = "cancellation-reason-settings";

const categoryColors: Record<string, string> = {
  "تعذر التواصل":
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-700",
  "طلب العميل":
    "bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-200 dark:ring-red-700",
  "طلب مكرر":
    "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/20 dark:text-sky-200 dark:ring-sky-700",
  "مشكلة مخزون":
    "bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-900/20 dark:text-purple-200 dark:ring-purple-700",
  "مشكلة شحن":
    "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:ring-blue-700",
  "مشكلة دفع أو سعر":
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-700",
  "بدون سبب":
    "bg-gray-50 text-gray-700 ring-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700",
};

const numberFormatter = new Intl.NumberFormat("ar-EG");
const dateFormatter = new Intl.DateTimeFormat("ar-EG", {
  dateStyle: "medium",
  timeStyle: "short",
});

const formatNumber = (value?: number) => numberFormatter.format(value || 0);

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return dateFormatter.format(date);
};

const truncateChartLabel = (value: string) =>
  value.length > 32 ? `${value.slice(0, 29)}...` : value;

const getCategoryClass = (category: string) =>
  categoryColors[category] ||
  "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700";

const SummaryCard: React.FC<{
  title: string;
  value: string;
  detail?: string;
  icon: HeroIcon;
  tone: string;
}> = ({ title, value, detail, icon: Icon, tone }) => (
  <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-center gap-4">
      <div className={`rounded-full p-3 ${tone}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="mt-1 truncate text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </p>
        {detail ? (
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {detail}
          </p>
        ) : null}
      </div>
    </div>
  </div>
);

const CancellationAnalytics: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [period, setPeriod] = useState("30");
  const [data, setData] = useState<CancellationAnalyticsData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedReasonOptions, setSavedReasonOptions] = useState<string[]>([]);
  const [reasonOptionsDraft, setReasonOptionsDraft] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const reasonOptionsTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const reasonChartData = useMemo(
    () =>
      data.reasonBreakdown.slice(0, 8).map((row) => ({
        ...row,
        chartLabel: truncateChartLabel(row.reason),
      })),
    [data.reasonBreakdown],
  );

  const normalizedDraftReasonOptions = useMemo(
    () => normalizeCancellationReasonOptions(reasonOptionsDraft),
    [reasonOptionsDraft],
  );

  const hasReasonSettingsChanges = useMemo(
    () =>
      JSON.stringify(normalizedDraftReasonOptions) !==
      JSON.stringify(savedReasonOptions),
    [normalizedDraftReasonOptions, savedReasonOptions],
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await analyticsService.getCancellationAnalytics(period);
      setData(response?.success && response?.data ? response.data : emptyData);
    } catch (err) {
      console.error("CancellationAnalytics error:", err);
      setError("تعذر تحميل تحليل الإلغاءات");
      setData(emptyData);
    } finally {
      setLoading(false);
    }
  }, [period]);

  const fetchReasonSettings = useCallback(
    async (forceRefresh = false) => {
      try {
        setSettingsLoading(true);
        setSettingsError(null);

        const reasonOptions =
          await cancellationReasonService.getReasonOptions(forceRefresh);

        setSavedReasonOptions(reasonOptions);
        setReasonOptionsDraft(reasonOptions.join("\n"));
      } catch (err) {
        console.error("Cancellation reason settings error:", err);
        setSettingsError("تعذر تحميل الأسباب الجاهزة");
      } finally {
        setSettingsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    void fetchReasonSettings();
  }, [fetchReasonSettings]);

  const handleSaveReasonSettings = async () => {
    try {
      setSettingsSaving(true);
      setSettingsError(null);

      const savedOptions = await cancellationReasonService.saveReasonOptions(
        normalizedDraftReasonOptions,
      );

      setSavedReasonOptions(savedOptions);
      setReasonOptionsDraft(savedOptions.join("\n"));
      toast.success("تم حفظ أسباب الإلغاء الجاهزة");
    } catch (err) {
      console.error("Failed to save cancellation reason settings:", err);
      setSettingsError("فشل في حفظ أسباب الإلغاء");
      toast.error("فشل في حفظ أسباب الإلغاء");
    } finally {
      setSettingsSaving(false);
    }
  };

  const focusReasonSettings = () => {
    const settingsSection = document.getElementById(reasonSettingsSectionId);
    settingsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => reasonOptionsTextareaRef.current?.focus(), 300);
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-red-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 text-center dark:bg-red-900/20">
        <XCircleIcon className="mx-auto mb-4 h-12 w-12 text-red-500" />
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          type="button"
          onClick={fetchData}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          <ArrowPathIcon className="h-5 w-5" />
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            تحليل الإلغاءات
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            أسباب الإلغاء وأحدث الطلبات الملغاة للمراجعة من مساحة الطلبات
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto md:items-center">
          <button
            type="button"
            onClick={focusReasonSettings}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/30"
          >
            <ClipboardDocumentCheckIcon className="h-5 w-5" />
            إضافة أسباب الإلغاء
          </button>
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 dark:border-gray-600 dark:bg-gray-800 sm:w-48"
          >
            {periodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        id={reasonSettingsSectionId}
        className="scroll-mt-6 rounded-xl border border-red-100 bg-white p-6 shadow-sm ring-1 ring-red-50 dark:border-red-900/40 dark:bg-gray-800 dark:ring-red-900/20"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              إضافة أسباب الإلغاء
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              كل سطر يمثل سببًا واحدًا، وهذه الأسباب ستظهر داخل نافذة إلغاء
              الطلب في صفحات الطلبات.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchReasonSettings(true)}
            disabled={settingsLoading || settingsSaving}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <ArrowPathIcon
              className={`h-4 w-4 ${settingsLoading ? "animate-spin" : ""}`}
            />
            إعادة تحميل
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,1fr)]">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              قائمة الأسباب
            </label>
            <textarea
              ref={reasonOptionsTextareaRef}
              value={reasonOptionsDraft}
              onChange={(event) => setReasonOptionsDraft(event.target.value)}
              rows={8}
              disabled={settingsLoading || settingsSaving}
              placeholder={
                "العميل طلب الإلغاء\nالرقم غير صحيح\nنفاد المخزون\nالشحن غير متاح"
              }
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-red-400 focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:disabled:bg-gray-800"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              يتم حذف التكرار والمسافات الزائدة تلقائيًا عند الحفظ.
            </p>
          </div>

          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                المعاينة
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatNumber(normalizedDraftReasonOptions.length)} سبب
              </span>
            </div>
            {normalizedDraftReasonOptions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {normalizedDraftReasonOptions.map((reason) => (
                  <span
                    key={reason}
                    className="inline-flex max-w-full items-center rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 ring-1 ring-red-200 dark:bg-red-900/20 dark:text-red-200 dark:ring-red-800"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-white px-4 py-5 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                لا توجد أسباب محفوظة حاليًا.
              </div>
            )}
          </div>
        </div>

        {settingsError ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-300">
            {settingsError}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            يتم السماح دائمًا بكتابة سبب يدوي إضافي حتى مع وجود أسباب جاهزة.
          </p>
          <button
            type="button"
            onClick={() => void handleSaveReasonSettings()}
            disabled={
              settingsLoading || settingsSaving || !hasReasonSettingsChanges
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {settingsSaving ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <ClipboardDocumentCheckIcon className="h-4 w-4" />
                حفظ أسباب الإلغاء
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="إجمالي الإلغاءات"
          value={formatNumber(summary.totalCancelledOrders)}
          detail={`${formatNumber(summary.regularOrders)} طلب عادي / ${formatNumber(
            summary.guestOrders,
          )} ضيف`}
          icon={XCircleIcon}
          tone="bg-red-500"
        />
        <SummaryCard
          title="قيمة مفقودة"
          value={formatPrice(summary.totalLostRevenue)}
          detail={`متوسط الطلب ${formatPrice(summary.averageCancelledOrderValue)}`}
          icon={BanknotesIcon}
          tone="bg-orange-500"
        />
        <SummaryCard
          title="بسبب مسجل"
          value={formatNumber(summary.withReason)}
          detail={`${formatNumber(summary.withoutReason)} بدون سبب واضح`}
          icon={ClipboardDocumentCheckIcon}
          tone="bg-emerald-500"
        />
        <SummaryCard
          title="تعذر التواصل"
          value={formatNumber(summary.autoCancelled)}
          detail={`${formatNumber(summary.reviewedByAgent)} إلغاء بواسطة مستخدم`}
          icon={ExclamationTriangleIcon}
          tone="bg-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              أكثر أسباب الإلغاء
            </h2>
            <span className="text-sm text-gray-400">
              أعلى {formatNumber(reasonChartData.length)}
            </span>
          </div>
          <div className="h-[340px] min-w-0">
            {reasonChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={reasonChartData} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    opacity={0.12}
                  />
                  <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                  <YAxis
                    dataKey="chartLabel"
                    type="category"
                    stroke="#9CA3AF"
                    fontSize={12}
                    width={170}
                  />
                  <Tooltip />
                  <Bar dataKey="count" name="عدد الإلغاءات" fill="#DC2626" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                لا توجد إلغاءات في الفترة المختارة
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            تصنيف الأسباب
          </h2>
          <div className="space-y-4">
            {data.categoryBreakdown.length > 0 ? (
              data.categoryBreakdown.map((row) => (
                <div key={row.category} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`inline-flex max-w-[70%] truncate rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getCategoryClass(
                        row.category,
                      )}`}
                    >
                      {row.category}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatNumber(row.count)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      className="h-2 rounded-full bg-red-500"
                      style={{ width: `${Math.min(row.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{row.percentage.toFixed(1)}%</span>
                    <span>{formatPrice(row.lostRevenue)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500 dark:bg-gray-700/40 dark:text-gray-300">
                لا توجد أسباب مصنفة بعد
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          اتجاه الإلغاءات اليومي
        </h2>
        <div className="h-[280px] min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={data.dailyTrend}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.12}
              />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="cancellations"
                name="إلغاءات"
                stroke="#DC2626"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            طلبات ملغاة للمراجعة
          </h2>
          <span className="text-sm text-gray-400">
            {formatNumber(data.orders.length)} طلب
          </span>
        </div>

        {data.orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr className="text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  <th className="whitespace-nowrap px-4 py-3">الطلب</th>
                  <th className="whitespace-nowrap px-4 py-3">العميل</th>
                  <th className="min-w-[260px] px-4 py-3">سبب الإلغاء</th>
                  <th className="whitespace-nowrap px-4 py-3">بواسطة</th>
                  <th className="whitespace-nowrap px-4 py-3">التاريخ</th>
                  <th className="whitespace-nowrap px-4 py-3">القيمة</th>
                  <th className="whitespace-nowrap px-4 py-3">مراجعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.orders.map((order) => (
                  <tr key={`${order.type}-${order.id}`}>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {order.orderNumber}
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        {order.type === "GUEST" ? "ضيف" : "طلب عادي"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="max-w-[190px] truncate font-medium text-gray-900 dark:text-white">
                        {order.customerName}
                      </div>
                      <div className="mt-1 max-w-[190px] truncate text-xs text-gray-400">
                        {order.customerPhone || order.region || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <span className="line-clamp-2 text-sm text-gray-700 dark:text-gray-200">
                          {order.reason}
                        </span>
                        <span
                          className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${getCategoryClass(
                            order.reasonCategory,
                          )}`}
                        >
                          {order.reasonCategory}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {order.cancelledBy}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {formatDateTime(order.cancelledAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-gray-900 dark:text-white">
                      {formatPrice(order.total)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <Link
                        to={order.reviewUrl}
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-900/20"
                      >
                        <EyeIcon className="h-4 w-4" />
                        مراجعة
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500 dark:bg-gray-700/40 dark:text-gray-300">
            لا توجد طلبات ملغاة في الفترة المختارة
          </div>
        )}
      </div>
    </div>
  );
};

export default CancellationAnalytics;
