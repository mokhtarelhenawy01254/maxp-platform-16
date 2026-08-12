import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  FolderIcon,
  NoSymbolIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TagIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import analyticsService from "../../../services/analyticsService";
import { useCurrency } from "../../../hooks/useCurrency";

type HeroIcon = React.ForwardRefExoticComponent<
  React.PropsWithoutRef<React.SVGProps<SVGSVGElement>> &
    { title?: string; titleId?: string } &
    React.RefAttributes<SVGSVGElement>
>;

interface ReturnReasonAnalyticsSummary {
  totalReturns: number;
  totalOrders: number;
  returnRate: number;
  totalRefundValue: number;
  avgReturnValue: number;
  withReasonCount: number;
  withoutReasonCount: number;
  resolvedCount: number;
  resolutionRate: number;
  topReason: { reason: string; count: number; percentage: number } | null;
  topCategory: { category: string; count: number; percentage: number } | null;
}

interface ReasonRow {
  id: string;
  reason: string;
  category: string;
  count: number;
  percentage: number;
  refundAmount: number;
  latestAt?: string | null;
}

interface CategoryRow {
  category: string;
  count: number;
  percentage: number;
  refundAmount: number;
}

interface StatusRow {
  status: string;
  count: number;
  percentage: number;
}

interface TrendRow {
  date: string;
  count: number;
  refundAmount: number;
}

interface ProductRow {
  product: string;
  count: number;
  refundAmount: number;
}

interface RecentReturn {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  region: string;
  total: number;
  refundAmount: number;
  reason: string;
  category: string;
  status: string;
  receivedStatus: string;
  createdAt?: string | null;
  reviewUrl: string;
}

interface ReturnReasonsAnalyticsData {
  summary: ReturnReasonAnalyticsSummary;
  reasonBreakdown: ReasonRow[];
  categoryBreakdown: CategoryRow[];
  statusBreakdown: StatusRow[];
  dailyTrend: TrendRow[];
  byProduct: ProductRow[];
  recentReturns: RecentReturn[];
}

const emptySummary: ReturnReasonAnalyticsSummary = {
  totalReturns: 0,
  totalOrders: 0,
  returnRate: 0,
  totalRefundValue: 0,
  avgReturnValue: 0,
  withReasonCount: 0,
  withoutReasonCount: 0,
  resolvedCount: 0,
  resolutionRate: 0,
  topReason: null,
  topCategory: null,
};

const emptyData: ReturnReasonsAnalyticsData = {
  summary: emptySummary,
  reasonBreakdown: [],
  categoryBreakdown: [],
  statusBreakdown: [],
  dailyTrend: [],
  byProduct: [],
  recentReturns: [],
};

const periodOptions = [
  { value: "7", label: "٧ أيام" },
  { value: "30", label: "٣٠ يوم" },
  { value: "90", label: "٩٠ يوم" },
  { value: "365", label: "سنة" },
];

const STATUS_META: Record<
  string,
  { label: string; color: string; soft: string; pill: string }
> = {
  PENDING: {
    label: "معلق",
    color: "#F59E0B",
    soft: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:ring-amber-700",
    pill: "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:bg-amber-900/30",
  },
  APPROVED: {
    label: "معتمد",
    color: "#0EA5E9",
    soft: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-900/20 dark:text-sky-200 dark:ring-sky-700",
    pill: "border-sky-300 text-sky-700 bg-sky-50 dark:border-sky-600 dark:text-sky-300 dark:bg-sky-900/30",
  },
  REJECTED: {
    label: "مرفوض",
    color: "#F43F5E",
    soft: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-200 dark:ring-rose-700",
    pill: "border-rose-300 text-rose-700 bg-rose-50 dark:border-rose-600 dark:text-rose-300 dark:bg-rose-900/30",
  },
  COMPLETED: {
    label: "مكتمل",
    color: "#10B981",
    soft: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-200 dark:ring-emerald-700",
    pill: "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-600 dark:text-emerald-300 dark:bg-emerald-900/30",
  },
};

const PALETTE = [
  "#E11D48",
  "#F59E0B",
  "#0EA5E9",
  "#10B981",
  "#8B5CF6",
  "#F97316",
  "#06B6D4",
  "#84CC16",
  "#6366F1",
  "#EC4899",
];

const numberFormatter = new Intl.NumberFormat("ar-EG");
const dateFormatter = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" });
const dayFormatter = new Intl.DateTimeFormat("ar-EG", {
  day: "numeric",
  month: "short",
});

const formatNumber = (value?: number) => numberFormatter.format(value || 0);

const formatDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return dateFormatter.format(date);
};

const getStatusMeta = (status: string) =>
  STATUS_META[status] || {
    label: status,
    color: "#94A3B8",
    soft: "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
    pill: "border-slate-300 text-slate-700 bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:bg-slate-800",
  };

const truncateLabel = (value: string, max = 26) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

const InsightBanner: React.FC<{
  summary: ReturnReasonAnalyticsSummary;
}> = ({ summary }) => {
  const { topReason, topCategory } = summary;
  const { formatPrice } = useCurrency();

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-rose-600 to-rose-500 p-6 text-white shadow-lg shadow-rose-600/20 sm:p-8">
      <div
        className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 right-10 h-56 w-56 rounded-full bg-rose-400/30 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative">
        <div className="flex items-center gap-2 text-rose-100">
          <SparklesIcon className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wide">
            أهم ما يحدث
          </span>
        </div>

        {topReason ? (
          <p className="mt-3 max-w-3xl text-xl font-bold leading-relaxed sm:text-2xl">
            أكثر سبب متكرر هو «{topReason.reason}» بنسبة {topReason.percentage}%
            من المرتجعات ({formatNumber(topReason.count)} حالة)
          </p>
        ) : (
          <p className="mt-3 text-xl font-bold sm:text-2xl">
            لا توجد مرتجعات في هذه الفترة
          </p>
        )}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-xs text-rose-100">
              <TagIcon className="h-4 w-4" />
              التصنيف الأعلى
            </div>
            <p className="mt-1.5 truncate text-base font-bold" dir="auto">
              {topCategory
                ? `${topCategory.category} (${topCategory.percentage}%)`
                : "لا يوجد"}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-xs text-rose-100">
              <CheckCircleIcon className="h-4 w-4" />
              نسبة المعالجة
            </div>
            <p className="mt-1.5 text-base font-bold">
              {summary.resolutionRate}%{" "}
              <span className="text-sm font-normal text-rose-100">
                ({formatNumber(summary.resolvedCount)} معالَج)
              </span>
            </p>
          </div>
          <div className="rounded-xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-xs text-rose-100">
              <BanknotesIcon className="h-4 w-4" />
              متوسط الاسترداد
            </div>
            <p className="mt-1.5 text-base font-bold">
              {formatPrice(summary.avgReturnValue)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  icon: HeroIcon;
  title: string;
  value: string;
  detail: string;
  iconBg: string;
  children?: React.ReactNode;
}> = ({ icon: Icon, title, value, detail, iconBg, children }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-colors hover:border-rose-200 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-rose-900">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="mt-1 truncate text-3xl font-extrabold text-gray-900 dark:text-white">
          {value}
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{detail}</p>
      </div>
      <div className={`shrink-0 rounded-xl p-2.5 ${iconBg}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
    </div>
    {children}
  </div>
);

const SectionCard: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, action, className = "", children }) => (
  <div
    className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}
  >
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-gray-400 dark:text-gray-500">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action}
    </div>
    {children}
  </div>
);

const ChartTooltip: React.FC<any> = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) {
    return null;
  }
  return (
    <div
      dir="rtl"
      className="rounded-xl border border-gray-200 bg-white/95 px-3.5 py-2.5 text-sm shadow-lg backdrop-blur dark:border-gray-600 dark:bg-gray-900/95"
    >
      {label ? (
        <p className="mb-1 font-semibold text-gray-700 dark:text-gray-200">
          {label}
        </p>
      ) : null}
      {payload.map((entry: any, index: number) => (
        <div
          key={index}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-300"
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color || entry.payload?.fill }}
          />
          <span>{entry.name}:</span>
          <span className="font-bold text-gray-900 dark:text-white">
            {formatter ? formatter(entry.value, entry) : formatNumber(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const EmptyState: React.FC<{ icon: HeroIcon; message: string }> = ({
  icon: Icon,
  message,
}) => (
  <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 text-center">
    <Icon className="h-8 w-8 text-gray-300 dark:text-gray-600" />
    <p className="text-sm text-gray-400 dark:text-gray-500">{message}</p>
  </div>
);

const ReturnReasonsAnalytics: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [period, setPeriod] = useState("30");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [data, setData] = useState<ReturnReasonsAnalyticsData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsService.getReturnReasonsAnalytics(
        period,
        undefined,
        undefined,
        category || undefined,
        status || undefined,
      );
      const result = response as
        | { success?: boolean; data?: ReturnReasonsAnalyticsData }
        | null
        | undefined;
      setData(result?.success && result.data ? result.data : emptyData);
    } catch (err) {
      console.error("ReturnReasonsAnalytics error:", err);
      setError("تعذر تحميل تحليل أسباب المرتجعات");
      setData(emptyData);
    } finally {
      setLoading(false);
    }
  }, [period, category, status]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const categoryOptions = useMemo(
    () => data.categoryBreakdown.map((row) => row.category),
    [data.categoryBreakdown],
  );

  const statusOptions = useMemo(
    () => data.statusBreakdown.map((row) => row.status),
    [data.statusBreakdown],
  );

  const reasonChartData = useMemo(
    () =>
      data.reasonBreakdown.slice(0, 8).map((row) => ({
        ...row,
        chartLabel: truncateLabel(row.reason),
        tooltipLabel: row.reason,
      })),
    [data.reasonBreakdown],
  );

  const statusChartData = useMemo(
    () =>
      data.statusBreakdown.map((row) => ({
        ...row,
        name: getStatusMeta(row.status).label,
        color: getStatusMeta(row.status).color,
      })),
    [data.statusBreakdown],
  );

  const busiestDay = useMemo(() => {
    if (data.dailyTrend.length === 0) {
      return null;
    }
    return [...data.dailyTrend].sort((a, b) => b.count - a.count)[0];
  }, [data.dailyTrend]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-rose-200 border-t-rose-600 dark:border-rose-900 dark:border-t-rose-400" />
          <p className="text-sm text-gray-400 dark:text-gray-500">
            جارٍ تحليل أسباب المرتجعات…
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-rose-50/60 p-8 text-center dark:border-rose-900 dark:bg-rose-900/10">
          <XCircleIcon className="mx-auto h-12 w-12 text-rose-500" />
          <p className="mt-4 font-semibold text-rose-700 dark:text-rose-300">
            {error}
          </p>
          <button
            type="button"
            onClick={fetchData}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
          >
            <ArrowPathIcon className="h-4 w-4" />
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="space-y-6" dir="rtl">
      <style>{`
        @keyframes retFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .ret-anim { animation: retFadeUp .55s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      {/* Header */}
      <div className="ret-anim flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
            أسباب المرتجعات
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            لماذا تُرجع الطلبات؟ توزيع الأسباب والتصنيفات والحالات لحلّها من جذرها
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            {periodOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriod(option.value)}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  period === option.value
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-sm focus:ring-2 focus:ring-rose-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            aria-label="تصفية حسب الحالة"
          >
            <option value="">كل الحالات</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {getStatusMeta(option).label}
              </option>
            ))}
          </select>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-sm focus:ring-2 focus:ring-rose-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            aria-label="تصفية حسب التصنيف"
          >
            <option value="">كل التصنيفات</option>
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Insight banner */}
      <div className="ret-anim">
        <InsightBanner summary={summary} />
      </div>

      {/* KPI cards */}
      <div
        className="ret-anim grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        style={{ animationDelay: "60ms" }}
      >
        <StatCard
          icon={ShoppingBagIcon}
          title="إجمالي المرتجعات"
          value={formatNumber(summary.totalReturns)}
          detail={`${summary.returnRate}% من إجمالي ${formatNumber(
            summary.totalOrders,
          )} طلب في الفترة`}
          iconBg="bg-rose-600"
        >
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
              <span>بسبب مسجل</span>
              <span>{formatNumber(summary.withReasonCount)}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-rose-500 transition-all"
                style={{
                  width: `${
                    summary.totalReturns > 0
                      ? (summary.withReasonCount / summary.totalReturns) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </StatCard>

        <StatCard
          icon={BanknotesIcon}
          title="قيمة الاسترداد"
          value={formatPrice(summary.totalRefundValue)}
          detail={`متوسط المرتجع ${formatPrice(summary.avgReturnValue)}`}
          iconBg="bg-amber-500"
        />

        <StatCard
          icon={CheckCircleIcon}
          title="تمت المعالجة"
          value={`${summary.resolutionRate}%`}
          detail={`${formatNumber(summary.resolvedCount)} مرتجع اكتمل أو اعتُمد`}
          iconBg="bg-emerald-500"
        />

        <StatCard
          icon={ExclamationTriangleIcon}
          title="بدون سبب محدد"
          value={formatNumber(summary.withoutReasonCount)}
          detail={
            busiestDay
              ? `أكثر يوم: ${dayFormatter.format(
                  new Date(busiestDay.date),
                )} (${formatNumber(busiestDay.count)})`
              : "لا يوجد نشاط في هذه الفترة"
          }
          iconBg="bg-indigo-500"
        />
      </div>

      {/* Reasons + Categories */}
      <div
        className="ret-anim grid grid-cols-1 gap-6 xl:grid-cols-3"
        style={{ animationDelay: "120ms" }}
      >
        <SectionCard
          title="أكثر الأسباب تكراراً"
          subtitle="أعلى 8 أسباب حسب عدد المرتجعات"
          className="xl:col-span-2"
        >
          <div className="h-[360px] min-w-0">
            {reasonChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={reasonChartData}
                  layout="vertical"
                  margin={{ left: 8, right: 16 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    opacity={0.08}
                  />
                  <XAxis
                    type="number"
                    stroke="#9CA3AF"
                    fontSize={12}
                    allowDecimals={false}
                  />
                  <YAxis
                    dataKey="chartLabel"
                    type="category"
                    stroke="#9CA3AF"
                    fontSize={12}
                    width={150}
                    tickFormatter={(value) => truncateLabel(value, 18)}
                  />
                  <Tooltip
                    cursor={{ fill: "#F43F5E", opacity: 0.06 }}
                    content={
                      <ChartTooltip
                        formatter={(value: number, entry: any) => {
                          const row = data.reasonBreakdown.find(
                            (r) => r.reason === entry.payload.tooltipLabel,
                          );
                          return `${formatNumber(value)} حالة · ${
                            row?.percentage ?? 0
                          }%`;
                        }}
                      />
                    }
                  />
                  <Bar
                    dataKey="count"
                    name="عدد المرتجعات"
                    fill="#E11D48"
                    radius={[0, 6, 6, 0]}
                    barSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={ShoppingBagIcon}
                message="لا توجد أسباب في الفترة المختارة"
              />
            )}
          </div>
        </SectionCard>

        <SectionCard title="التصنيفات" subtitle="تجميع الأسباب حسب التصنيف">
          {data.categoryBreakdown.length > 0 ? (
            <div className="space-y-4">
              {data.categoryBreakdown.slice(0, 8).map((row, index) => (
                <div key={row.category}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {row.category}
                    </span>
                    <span className="shrink-0 text-sm font-bold text-gray-900 dark:text-white">
                      {formatNumber(row.count)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(row.percentage, 100)}%`,
                          backgroundColor: PALETTE[index % PALETTE.length],
                        }}
                      />
                    </div>
                    <span className="w-11 shrink-0 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {row.percentage}%
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    قيمة الاسترداد {formatPrice(row.refundAmount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={TagIcon} message="لا توجد تصنيفات في هذه الفترة" />
          )}
        </SectionCard>
      </div>

      {/* Status + Trend + Products */}
      <div
        className="ret-anim grid grid-cols-1 gap-6 xl:grid-cols-3"
        style={{ animationDelay: "180ms" }}
      >
        <SectionCard title="حالة المرتجعات" subtitle="توزيع الطلبات حسب الحالة">
          {statusChartData.length > 0 ? (
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
              <div className="relative h-44 w-44 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="count"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={80}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={
                        <ChartTooltip
                          formatter={(value: number, entry: any) =>
                            `${formatNumber(value)} (${entry.payload.percentage}%)`
                          }
                        />
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
                    {formatNumber(summary.totalReturns)}
                  </span>
                  <span className="text-xs text-gray-400">مرتجع</span>
                </div>
              </div>
              <div className="w-full space-y-2.5">
                {statusChartData.map((row) => {
                  const meta = getStatusMeta(row.status);
                  return (
                    <div
                      key={row.status}
                      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 ring-1 ring-gray-100 dark:ring-gray-700"
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: meta.color }}
                        />
                        {meta.label}
                      </span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {formatNumber(row.count)}
                        <span className="mr-2 text-xs font-normal text-gray-400">
                          {row.percentage}%
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <EmptyState icon={NoSymbolIcon} message="لا توجد حالات في هذه الفترة" />
          )}
        </SectionCard>

        <SectionCard
          title="الاتجاه اليومي"
          subtitle="عدد المرتجعات يومياً خلال الفترة"
        >
          <div className="h-[280px] min-w-0">
            {data.dailyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart
                  data={data.dailyTrend}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="retGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#E11D48" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#E11D48" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    opacity={0.08}
                  />
                  <XAxis
                    dataKey="date"
                    stroke="#9CA3AF"
                    fontSize={11}
                    tickFormatter={(value) =>
                      dayFormatter.format(new Date(value))
                    }
                    tick={{ dy: 4 }}
                  />
                  <YAxis stroke="#9CA3AF" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        formatter={(value: number, entry: any) =>
                          entry.dataKey === "count"
                            ? `${formatNumber(value)} مرتجع`
                            : `${formatNumber(value)} ${""}`
                        }
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="مرتجعات"
                    stroke="#E11D48"
                    strokeWidth={2.5}
                    fill="url(#retGradient)"
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={ArrowUpRightIcon} message="لا توجد بيانات يومية" />
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="المنتجات الأكثر إرجاعاً"
          subtitle="أعلى 5 منتجات في المرتجعات"
        >
          {data.byProduct.length > 0 ? (
            <div className="space-y-4">
              {data.byProduct.slice(0, 5).map((row, index) => {
                const max = data.byProduct[0]?.count || 1;
                return (
                  <div key={row.product}>
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="truncate text-sm font-semibold text-gray-700 dark:text-gray-200"
                        title={row.product}
                      >
                        <span
                          className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-md text-xs font-bold text-white"
                          style={{
                            backgroundColor:
                              PALETTE[index % PALETTE.length],
                          }}
                        >
                          {index + 1}
                        </span>
                        {truncateLabel(row.product, 24)}
                      </span>
                      <span className="shrink-0 text-sm font-bold text-gray-900 dark:text-white">
                        {formatNumber(row.count)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(row.count / max) * 100}%`,
                          backgroundColor: PALETTE[index % PALETTE.length],
                        }}
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                      {formatPrice(row.refundAmount)} استرداد
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={FolderIcon} message="لا توجد منتجات في هذه الفترة" />
          )}
        </SectionCard>
      </div>

      {/* Recent returns */}
      <div
        className="ret-anim rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        style={{ animationDelay: "240ms" }}
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              أحدث المرتجعات للمراجعة
            </h2>
            <p className="mt-0.5 text-sm text-gray-400 dark:text-gray-500">
              آخر {formatNumber(data.recentReturns.length)} مرتجع في الفترة
              المختارة
            </p>
          </div>
          <Link
            to="/returns"
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3.5 py-2 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/20"
          >
            عرض كل المرتجعات
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        {data.recentReturns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
              <thead>
                <tr className="text-right text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  <th className="whitespace-nowrap px-3 py-3">الطلب</th>
                  <th className="whitespace-nowrap px-3 py-3">العميل</th>
                  <th className="whitespace-nowrap px-3 py-3">المنطقة</th>
                  <th className="min-w-[220px] px-3 py-3">السبب</th>
                  <th className="whitespace-nowrap px-3 py-3">الحالة</th>
                  <th className="whitespace-nowrap px-3 py-3">القيمة</th>
                  <th className="whitespace-nowrap px-3 py-3">التاريخ</th>
                  <th className="whitespace-nowrap px-3 py-3">مراجعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.recentReturns.map((row) => {
                  const meta = getStatusMeta(row.status);
                  return (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-rose-50/40 dark:hover:bg-rose-900/10"
                    >
                      <td className="whitespace-nowrap px-3 py-3.5 font-semibold text-gray-900 dark:text-white">
                        {row.orderNumber}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="max-w-[180px] truncate font-medium text-gray-700 dark:text-gray-200">
                          {row.customerName}
                        </div>
                        <div
                          className="mt-0.5 max-w-[180px] truncate text-xs text-gray-400"
                          dir="ltr"
                        >
                          {row.customerPhone || "-"}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-sm text-gray-600 dark:text-gray-300">
                        {row.region}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex flex-col gap-1.5">
                          <span className="line-clamp-2 text-sm text-gray-700 dark:text-gray-200">
                            {row.reason}
                          </span>
                          <span className="inline-flex w-fit max-w-full items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold text-gray-500 ring-1 ring-gray-200 dark:text-gray-300 dark:ring-gray-600">
                            <FolderIcon className="h-3 w-3" />
                            <span className="truncate">{row.category}</span>
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${meta.pill}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {formatPrice(row.refundAmount)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatPrice(row.total)} للطلب
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5 text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3.5">
                        <Link
                          to={row.reviewUrl}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 px-3 py-1.5 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-900/20"
                        >
                          <EyeIcon className="h-4 w-4" />
                          مراجعة
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl bg-gray-50 p-10 text-center dark:bg-gray-700/30">
            <ShoppingBagIcon className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-sm font-semibold text-gray-500 dark:text-gray-300">
              لا توجد مرتجعات في الفترة المختارة
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              جرّب تغيير الفترة أو إزالة عوامل التصفية
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReturnReasonsAnalytics;
