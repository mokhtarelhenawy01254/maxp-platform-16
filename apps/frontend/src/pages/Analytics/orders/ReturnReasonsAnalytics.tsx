import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  ChevronDownIcon,
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
import PeriodSelector, {
  PeriodRange,
} from "../../../components/common/PeriodSelector";
import { useCurrency } from "../../../hooks/useCurrency";

const toISODate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const DEFAULT_RANGE: PeriodRange = (() => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return { period: "30", startDate: toISODate(start), endDate: toISODate(end) };
})();

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

const STATUS_META: Record<
  string,
  { label: string; color: string; pill: string }
> = {
  PENDING: {
    label: "معلق",
    color: "#F59E0B",
    pill: "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-600 dark:text-amber-300 dark:bg-amber-900/30",
  },
  APPROVED: {
    label: "معتمد",
    color: "#0EA5E9",
    pill: "border-sky-300 text-sky-700 bg-sky-50 dark:border-sky-600 dark:text-sky-300 dark:bg-sky-900/30",
  },
  REJECTED: {
    label: "مرفوض",
    color: "#F43F5E",
    pill: "border-rose-300 text-rose-700 bg-rose-50 dark:border-rose-600 dark:text-rose-300 dark:bg-rose-900/30",
  },
  COMPLETED: {
    label: "مكتمل",
    color: "#10B981",
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
    pill: "border-slate-300 text-slate-700 bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:bg-slate-800",
  };

const truncateLabel = (value: string, max = 26) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

const ChartTooltip: React.FC<any> = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) {
    return null;
  }
  return (
    <div
      dir="rtl"
      className="rounded-lg border border-gray-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur dark:border-gray-600 dark:bg-gray-900/95"
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
            className="h-2 w-2 rounded-full"
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
  <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 text-center">
    <Icon className="h-7 w-7 text-gray-300 dark:text-gray-600" />
    <p className="text-xs text-gray-400 dark:text-gray-500">{message}</p>
  </div>
);

const SectionCard: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({
  title,
  subtitle,
  action,
  className = "",
  collapsible = false,
  defaultOpen = true,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={`rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {action}
          {collapsible ? (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
              aria-expanded={open}
              aria-label={open ? `إخفاء ${title}` : `إظهار ${title}`}
            >
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform duration-200 ${
                  open ? "" : "-rotate-90"
                }`}
              />
            </button>
          ) : null}
        </div>
      </div>
      {open ? <div>{children}</div> : null}
    </div>
  );
};

const StatsBar: React.FC<{ summary: ReturnReasonAnalyticsSummary }> = ({
  summary,
}) => {
  const { formatPrice } = useCurrency();
  const { topReason, topCategory } = summary;

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-gray-100 bg-gray-100 shadow-sm dark:border-gray-700 dark:bg-gray-700 md:grid-cols-4 xl:grid-cols-6">
      <div className="col-span-2 bg-gradient-to-l from-rose-600 to-rose-500 p-4 text-white md:col-span-4 xl:col-span-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-rose-100">
          <SparklesIcon className="h-3.5 w-3.5" />
          أهم ما يحدث
        </div>
        {topReason ? (
          <p className="mt-1.5 text-sm font-bold leading-snug">
            «{topReason.reason}» الأكثر بنسبة {topReason.percentage}% ·{" "}
            {formatNumber(topReason.count)} حالة
          </p>
        ) : (
          <p className="mt-1.5 text-sm font-bold">
            لا توجد مرتجعات في هذه الفترة
          </p>
        )}
        <p className="mt-1 text-[11px] text-rose-100">
          {topCategory
            ? `أعلى تصنيف: ${topCategory.category} (${topCategory.percentage}%)`
            : ""}
        </p>
      </div>

      <div className="bg-white p-4 dark:bg-gray-800">
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          إجمالي المرتجعات
        </p>
        <p className="mt-0.5 truncate text-lg font-extrabold text-gray-900 dark:text-white">
          {formatNumber(summary.totalReturns)}
        </p>
        <p className="text-[11px] text-gray-400">
          {summary.returnRate}% من {formatNumber(summary.totalOrders)} طلب
        </p>
      </div>

      <div className="bg-white p-4 dark:bg-gray-800">
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          قيمة الاسترداد
        </p>
        <p className="mt-0.5 truncate text-lg font-extrabold text-amber-600 dark:text-amber-400">
          {formatPrice(summary.totalRefundValue)}
        </p>
        <p className="text-[11px] text-gray-400">
          متوسط {formatPrice(summary.avgReturnValue)}
        </p>
      </div>

      <div className="bg-white p-4 dark:bg-gray-800">
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          تمت المعالجة
        </p>
        <p className="mt-0.5 truncate text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
          {summary.resolutionRate}%
        </p>
        <p className="text-[11px] text-gray-400">
          {formatNumber(summary.resolvedCount)} اكتمل/اعتُمد
        </p>
      </div>

      <div className="bg-white p-4 dark:bg-gray-800">
        <p className="text-[11px] text-gray-400 dark:text-gray-500">
          بدون سبب
        </p>
        <p className="mt-0.5 truncate text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
          {formatNumber(summary.withoutReasonCount)}
        </p>
        <p className="text-[11px] text-gray-400">
          {summary.withReasonCount} بسبب مسجل
        </p>
      </div>
    </div>
  );
};

const ReturnReasonsAnalytics: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [range, setRange] = useState<PeriodRange>(DEFAULT_RANGE);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [tab, setTab] = useState<"status" | "trend" | "products">("status");
  const [data, setData] = useState<ReturnReasonsAnalyticsData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsService.getReturnReasonsAnalytics(
        range?.period,
        range?.startDate,
        range?.endDate,
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
  }, [range, category, status]);

  useEffect(() => {
    if (!range) {
      return;
    }
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, category, status]);

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

  if (loading && data === emptyData) {
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

  const tabButtonClass = (active: boolean) =>
    `rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
      active
        ? "bg-rose-600 text-white shadow-sm"
        : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
    }`;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
            أسباب المرتجعات
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            لماذا تُرجع الطلبات؟ توزيع الأسباب والتصنيفات والحالات لحلّها من
            جذرها
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PeriodSelector onRangeChange={setRange} />

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm focus:ring-2 focus:ring-rose-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
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
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm focus:ring-2 focus:ring-rose-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
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

      {/* Merged insight + KPIs */}
      <StatsBar summary={summary} />

      {/* Reasons + Categories */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard
          title="أكثر الأسباب تكراراً"
          subtitle="أعلى 8 أسباب"
          className="xl:col-span-2"
          collapsible
        >
          <div className="h-[300px] min-w-0">
            {reasonChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={reasonChartData}
                  layout="vertical"
                  margin={{ left: 4, right: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    opacity={0.08}
                  />
                  <XAxis
                    type="number"
                    stroke="#9CA3AF"
                    fontSize={11}
                    allowDecimals={false}
                  />
                  <YAxis
                    dataKey="chartLabel"
                    type="category"
                    stroke="#9CA3AF"
                    fontSize={11}
                    width={140}
                    tickFormatter={(value) => truncateLabel(value, 16)}
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
                    radius={[0, 5, 5, 0]}
                    barSize={18}
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

        <SectionCard title="التصنيفات" subtitle="تجميع الأسباب" collapsible>
          {data.categoryBreakdown.length > 0 ? (
            <div className="space-y-3">
              {data.categoryBreakdown.slice(0, 8).map((row, index) => (
                <div key={row.category}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-gray-700 dark:text-gray-200">
                      {row.category}
                    </span>
                    <span className="shrink-0 text-xs font-bold text-gray-900 dark:text-white">
                      {formatNumber(row.count)}
                      <span className="mr-1.5 text-[10px] font-normal text-gray-400">
                        {row.percentage}%
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(row.percentage, 100)}%`,
                          backgroundColor: PALETTE[index % PALETTE.length],
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={TagIcon} message="لا توجد تصنيفات في هذه الفترة" />
          )}
        </SectionCard>
      </div>

      {/* Tabs: status / trend / products */}
      <SectionCard
        title="تفاصيل المرتجعات"
        action={
          <div className="inline-flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700">
            <button type="button" className={tabButtonClass(tab === "status")} onClick={() => setTab("status")}>
              الحالة
            </button>
            <button type="button" className={tabButtonClass(tab === "trend")} onClick={() => setTab("trend")}>
              الاتجاه
            </button>
            <button type="button" className={tabButtonClass(tab === "products")} onClick={() => setTab("products")}>
              المنتجات
            </button>
          </div>
        }
        collapsible
      >
        {tab === "status" ? (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <div className="relative h-36 w-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={46}
                    outerRadius={66}
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
                <span className="text-lg font-extrabold text-gray-900 dark:text-white">
                  {formatNumber(summary.totalReturns)}
                </span>
                <span className="text-[10px] text-gray-400">مرتجع</span>
              </div>
            </div>
            <div className="w-full space-y-1.5">
              {statusChartData.length > 0 ? (
                statusChartData.map((row) => {
                  const meta = getStatusMeta(row.status);
                  return (
                    <div
                      key={row.status}
                      className="flex items-center justify-between rounded-lg px-2.5 py-1.5 ring-1 ring-gray-100 dark:ring-gray-700"
                    >
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: meta.color }}
                        />
                        {meta.label}
                      </span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {formatNumber(row.count)}
                        <span className="mr-1.5 text-[10px] font-normal text-gray-400">
                          {row.percentage}%
                        </span>
                      </span>
                    </div>
                  );
                })
              ) : (
                <EmptyState icon={NoSymbolIcon} message="لا توجد حالات" />
              )}
            </div>
          </div>
        ) : null}

        {tab === "trend" ? (
          <div className="h-[240px] min-w-0">
            {data.dailyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart
                  data={data.dailyTrend}
                  margin={{ top: 6, right: 8, left: -16, bottom: 0 }}
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
                    fontSize={10}
                    tickFormatter={(value) =>
                      dayFormatter.format(new Date(value))
                    }
                    tick={{ dy: 3 }}
                  />
                  <YAxis stroke="#9CA3AF" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    content={
                      <ChartTooltip
                        formatter={(value: number, entry: any) =>
                          entry.dataKey === "count"
                            ? `${formatNumber(value)} مرتجع`
                            : `${formatNumber(value)} ج.م`
                        }
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="مرتجعات"
                    stroke="#E11D48"
                    strokeWidth={2}
                    fill="url(#retGradient)"
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={NoSymbolIcon} message="لا توجد بيانات يومية" />
            )}
          </div>
        ) : null}

        {tab === "products" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {data.byProduct.length > 0 ? (
              data.byProduct.slice(0, 5).map((row, index) => {
                const max = data.byProduct[0]?.count || 1;
                return (
                  <div
                    key={row.product}
                    className="rounded-lg p-3 ring-1 ring-gray-100 dark:ring-gray-700"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
                        style={{
                          backgroundColor: PALETTE[index % PALETTE.length],
                        }}
                      >
                        {index + 1}
                      </span>
                      <span className="truncate text-xs font-bold text-gray-900 dark:text-white">
                        {formatNumber(row.count)}
                      </span>
                    </div>
                    <p
                      className="mt-2 line-clamp-2 text-xs font-semibold text-gray-700 dark:text-gray-200"
                      title={row.product}
                    >
                      {row.product}
                    </p>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(row.count / max) * 100}%`,
                          backgroundColor: PALETTE[index % PALETTE.length],
                        }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-gray-400">
                      {formatPrice(row.refundAmount)} استرداد
                    </p>
                  </div>
                );
              })
            ) : (
              <EmptyState
                icon={FolderIcon}
                message="لا توجد منتجات في هذه الفترة"
              />
            )}
          </div>
        ) : null}
      </SectionCard>

      {/* Recent returns */}
      <SectionCard
        title="أحدث المرتجعات للمراجعة"
        subtitle={`آخر ${formatNumber(data.recentReturns.length)} مرتجع في الفترة المختارة`}
        action={
          <Link
            to="/returns"
            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/20"
          >
            كل المرتجعات
            <ArrowRightIcon className="h-3 w-3" />
          </Link>
        }
        collapsible
      >
        {data.recentReturns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
              <thead>
                <tr className="text-right text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  <th className="whitespace-nowrap px-2 py-2">الطلب</th>
                  <th className="whitespace-nowrap px-2 py-2">العميل</th>
                  <th className="whitespace-nowrap px-2 py-2">المنطقة</th>
                  <th className="min-w-[200px] px-2 py-2">السبب</th>
                  <th className="whitespace-nowrap px-2 py-2">الحالة</th>
                  <th className="whitespace-nowrap px-2 py-2">القيمة</th>
                  <th className="whitespace-nowrap px-2 py-2">التاريخ</th>
                  <th className="whitespace-nowrap px-2 py-2">مراجعة</th>
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
                      <td className="whitespace-nowrap px-2 py-2 text-xs font-semibold text-gray-900 dark:text-white">
                        {row.orderNumber}
                      </td>
                      <td className="px-2 py-2">
                        <div className="max-w-[150px] truncate text-xs font-medium text-gray-700 dark:text-gray-200">
                          {row.customerName}
                        </div>
                        <div
                          className="max-w-[150px] truncate text-[10px] text-gray-400"
                          dir="ltr"
                        >
                          {row.customerPhone || "-"}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-gray-600 dark:text-gray-300">
                        {row.region}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex flex-col gap-1">
                          <span className="line-clamp-1 text-xs text-gray-700 dark:text-gray-200">
                            {row.reason}
                          </span>
                          <span className="inline-flex w-fit items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-semibold text-gray-500 ring-1 ring-gray-200 dark:text-gray-300 dark:ring-gray-600">
                            <FolderIcon className="h-2.5 w-2.5" />
                            {truncateLabel(row.category, 14)}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.pill}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">
                        <div className="text-xs font-semibold text-gray-900 dark:text-white">
                          {formatPrice(row.refundAmount)}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {formatPrice(row.total)} للطلب
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-gray-600 dark:text-gray-300">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">
                        <Link
                          to={row.reviewUrl}
                          className="inline-flex items-center gap-1 rounded-md border border-sky-200 px-2 py-1 text-[10px] font-semibold text-sky-700 transition-colors hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-900/20"
                        >
                          <EyeIcon className="h-3 w-3" />
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
          <div className="rounded-lg bg-gray-50 p-6 text-center dark:bg-gray-700/30">
            <ShoppingBagIcon className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="mt-2 text-xs font-semibold text-gray-500 dark:text-gray-300">
              لا توجد مرتجعات في الفترة المختارة
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
              جرّب تغيير الفترة أو إزالة عوامل التصفية
            </p>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default ReturnReasonsAnalytics;
