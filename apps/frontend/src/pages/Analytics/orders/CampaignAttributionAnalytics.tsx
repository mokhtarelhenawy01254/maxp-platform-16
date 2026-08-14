import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDownIcon, XCircleIcon } from "@heroicons/react/24/outline";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import { useCurrency } from "../../../hooks/useCurrency";
import PeriodSelector, {
  PeriodRange,
} from "../../../components/common/PeriodSelector";

interface CampaignAttributionSummary {
  totalOrders: number;
  trackedOrders: number;
  campaignTaggedOrders: number;
  directOrders: number;
  unattributedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  totalRevenue: number;
  deliveredRevenue: number;
  averageOrderValue: number;
  trackingCoverage: number;
  deliveryRate: number;
}

interface CampaignAttributionRow {
  key: string;
  trackingType: string;
  platform: string;
  source: string;
  medium: string;
  campaignId: string | null;
  campaignName: string;
  adSetId: string | null;
  adId: string | null;
  content: string | null;
  term: string | null;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  totalRevenue: number;
  deliveredRevenue: number;
  averageOrderValue: number;
  deliveredRate: number;
}

interface BreakdownRow {
  source?: string;
  platform?: string;
  orders: number;
  revenue: number;
  share: number;
}

interface TrendRow {
  date: string;
  totalOrders: number;
  trackedOrders: number;
  campaignOrders: number;
  revenue: number;
  deliveredRevenue: number;
}

interface CampaignAttributionAnalyticsData {
  summary: CampaignAttributionSummary;
  rows: CampaignAttributionRow[];
  sourceBreakdown: BreakdownRow[];
  platformBreakdown: BreakdownRow[];
  trend: TrendRow[];
  availableFilters: {
    sources: string[];
    platforms: string[];
    trackingTypes: string[];
  };
  appliedFilters: {
    source: string;
    platform: string;
    trackingType: string;
    search: string;
  };
}

const trackingTypeLabels: Record<string, string> = {
  campaign: "حملة",
  direct: "مباشر",
  tracked: "متتبع",
  unattributed: "غير منسوب",
};

const trackingTypeBadgeClasses: Record<string, string> = {
  campaign:
    "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800",
  direct:
    "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/30 dark:text-sky-200 dark:border-sky-800",
  tracked:
    "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800",
  unattributed:
    "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
};

const getTrackingBadgeClass = (type: string) =>
  trackingTypeBadgeClasses[type] || trackingTypeBadgeClasses["unattributed"];

const formatAttributionValue = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  return value;
};

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
            {formatter ? formatter(entry.value, entry) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

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

const StatsBar: React.FC<{ data: CampaignAttributionAnalyticsData }> = ({
  data,
}) => {
  const { formatPrice } = useCurrency();
  const s = data.summary;

  const cells = [
    {
      label: "إجمالي الطلبات",
      value: s.totalOrders.toLocaleString(),
      detail: `${s.deliveryRate.toFixed(1)}% نسبة التسليم`,
      accent: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "طلبات متتبعة",
      value: s.trackedOrders.toLocaleString(),
      detail: `${s.trackingCoverage.toFixed(1)}% تغطية التتبع`,
      accent: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "طلبات بحملة",
      value: s.campaignTaggedOrders.toLocaleString(),
      detail: `${s.directOrders.toLocaleString()} طلب مباشر`,
      accent: "text-violet-600 dark:text-violet-400",
    },
    {
      label: "غير منسوبة",
      value: s.unattributedOrders.toLocaleString(),
      detail: `${s.cancelledOrders.toLocaleString()} ملغي · ${s.returnedOrders.toLocaleString()} مرتجع`,
      accent: "text-slate-600 dark:text-slate-300",
    },
    {
      label: "إجمالي الإيراد",
      value: formatPrice(s.totalRevenue),
      detail: `${formatPrice(s.deliveredRevenue)} إيراد المسلّم`,
      accent: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "متوسط قيمة الطلب",
      value: formatPrice(s.averageOrderValue),
      detail: `${s.deliveredOrders.toLocaleString()} طلب مسلّم`,
      accent: "text-cyan-600 dark:text-cyan-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-gray-100 bg-gray-100 shadow-sm dark:border-gray-700 dark:bg-gray-700 md:grid-cols-3 xl:grid-cols-6">
      {cells.map((cell) => (
        <div key={cell.label} className="bg-white p-3.5 dark:bg-gray-800">
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            {cell.label}
          </p>
          <p
            className={`mt-0.5 truncate text-lg font-extrabold ${cell.accent}`}
          >
            {cell.value}
          </p>
          <p className="truncate text-[11px] text-gray-400">{cell.detail}</p>
        </div>
      ))}
    </div>
  );
};

const CampaignAttributionAnalytics: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [source, setSource] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [trackingType, setTrackingType] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const deferredSearch = useDeferredValue(searchInput.trim());
  const [data, setData] = useState<CampaignAttributionAnalyticsData | null>(
    null,
  );
  const [chartTab, setChartTab] = useState<"trend" | "sources">("trend");
  const [sideTab, setSideTab] = useState<"platforms" | "guide">("platforms");

  useEffect(() => {
    if (!range) {
      return;
    }

    const controller = new AbortController();

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await analyticsService.getCampaignAttributionAnalytics({
          period: range?.period,
          startDate: range?.startDate,
          endDate: range?.endDate,
          source,
          platform,
          trackingType,
          search: deferredSearch || undefined,
          signal: controller.signal,
        });

        const result = response as
          | {
              success?: boolean;
              data?: CampaignAttributionAnalyticsData;
              message?: string;
            }
          | null
          | undefined;

        if (!result?.success || !result.data) {
          throw new Error(result?.message || "تعذر تحميل تحليل الحملات");
        }

        setData(result.data);
      } catch (err: any) {
        if (err?.name === "AbortError" || err?.name === "CanceledError") {
          return;
        }

        setError(err?.message || "حدث خطأ أثناء تحميل تحليل الحملات");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchAnalytics();

    return () => controller.abort();
  }, [deferredSearch, range, platform, source, trackingType]);

  const sourceChartData = useMemo(
    () => (data?.sourceBreakdown || []).slice(0, 8),
    [data],
  );

  const platformCards = useMemo(
    () => (data?.platformBreakdown || []).slice(0, 6),
    [data],
  );

  const rows = data?.rows || [];

  const header = (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
          تحليل الحملات ومصدر الطلبات
        </h1>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          ربط الطلبات بالمصدر والمنصة ورقم الحملة من{" "}
          <code className="text-[10px]">metadata.attribution</code> داخل
          الأوردر
        </p>
      </div>
      <PeriodSelector onRangeChange={setRange} />
    </div>
  );

  if (loading && !data) {
    return (
      <div className="space-y-4" dir="rtl">
        {header}
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 dark:border-blue-900 dark:border-t-blue-400" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              جارٍ تحليل الحملات ومصادر الطلبات…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4" dir="rtl">
        {header}
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50/60 p-8 text-center dark:border-red-900 dark:bg-red-900/10">
            <XCircleIcon className="mx-auto h-12 w-12 text-red-500" />
            <p className="mt-4 font-semibold text-red-700 dark:text-red-300">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tabButtonClass = (active: boolean) =>
    `rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${
      active
        ? "bg-blue-600 text-white shadow-sm"
        : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
    }`;

  return (
    <div className="space-y-4" dir="rtl">
      {header}

      {/* Compact filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <select
          value={source}
          onChange={(event) => setSource(event.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          aria-label="المصدر"
        >
          <option value="all">كل المصادر</option>
          {data?.availableFilters.sources.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={platform}
          onChange={(event) => setPlatform(event.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          aria-label="المنصة"
        >
          <option value="all">كل المنصات</option>
          {data?.availableFilters.platforms.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={trackingType}
          onChange={(event) => setTrackingType(event.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm focus:ring-2 focus:ring-blue-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          aria-label="نوع التتبع"
        >
          <option value="all">كل أنواع التتبع</option>
          {data?.availableFilters.trackingTypes.map((item) => (
            <option key={item} value={item}>
              {trackingTypeLabels[item] || item}
            </option>
          ))}
        </select>

        <input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="بحث بالحملة أو Campaign / Ad Set / Ad ID…"
          className="min-w-[200px] flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
        />

        <span className="mr-auto text-[11px] text-gray-400 dark:text-gray-500">
          {rows.length.toLocaleString()} صف
        </span>
      </div>

      {/* Merged stats bar */}
      {data ? <StatsBar data={data} /> : null}

      {/* Footnote instead of tall banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] leading-relaxed text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
        الطلبات القديمة قبل تفعيل التتبع تظهر "غير منسوبة"، والجديدة تتجمع حسب{" "}
        <span className="font-semibold">
          source / medium / campaign ID / ad ID
        </span>
        .
      </div>

      {/* Charts + platforms side panel */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <SectionCard
        title="تطور الطلبات والحملات"
        subtitle="مقارنة إجمالي الطلبات بالمرتبطة بحملات خلال الفترة"
        className="xl:col-span-2"
        action={
          <div className="inline-flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700">
            <button
              type="button"
              className={tabButtonClass(chartTab === "trend")}
              onClick={() => setChartTab("trend")}
            >
              الاتجاه
            </button>
            <button
              type="button"
              className={tabButtonClass(chartTab === "sources")}
              onClick={() => setChartTab("sources")}
            >
              المصادر
            </button>
          </div>
        }
        collapsible
      >
        {chartTab === "trend" ? (
          <div className="h-[260px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={data?.trend || []}>
                <defs>
                  <linearGradient
                    id="campaignTrendFill"
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.08} />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={11} />
                <YAxis stroke="#9CA3AF" fontSize={11} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area
                  type="monotone"
                  dataKey="totalOrders"
                  name="إجمالي الطلبات"
                  stroke="#2563EB"
                  fill="url(#campaignTrendFill)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="campaignOrders"
                  name="طلبات مرتبطة بحملة"
                  stroke="#10B981"
                  fillOpacity={0}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[260px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={sourceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.08} />
                <XAxis dataKey="source" stroke="#9CA3AF" fontSize={11} />
                <YAxis stroke="#9CA3AF" fontSize={11} />
                <Tooltip
                  content={
                    <ChartTooltip
                      formatter={(value: number) =>
                        `${Number(value).toLocaleString()} طلب`
                      }
                    />
                  }
                />
                <Bar
                  dataKey="orders"
                  name="الطلبات"
                  fill="#7C3AED"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="المنصات والأدلة"
        action={
          <div className="inline-flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700">
            <button
              type="button"
              className={tabButtonClass(sideTab === "platforms")}
              onClick={() => setSideTab("platforms")}
            >
              المنصات
            </button>
            <button
              type="button"
              className={tabButtonClass(sideTab === "guide")}
              onClick={() => setSideTab("guide")}
            >
              كيف تقرأ؟
            </button>
          </div>
        }
        collapsible
      >
        {sideTab === "platforms" ? (
          <div className="space-y-2">
            {platformCards.map((row, index) => (
              <div
                key={row.platform || `platform-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 ring-1 ring-gray-100 dark:ring-gray-700"
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-gray-900 dark:text-white">
                    {formatAttributionValue(row.platform)}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {row.orders.toLocaleString()} طلب
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-gray-900 dark:text-white">
                    {row.share.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {formatPrice(row.revenue)}
                  </div>
                </div>
              </div>
            ))}
            {platformCards.length === 0 && (
              <p className="py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                لا توجد بيانات منصات في الفترة الحالية.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
            <p>
              إذا كان <span className="font-semibold">Campaign ID</span> فارغًا
              لكن المصدر موجود، فالطلب متتبع لكن الرابط لم يحمل رقم الحملة.
            </p>
            <p>
              ارتفاع <span className="font-semibold">غير منسوبة</span> يعني
              غالبًا طلبات قديمة أو روابط بدون UTM / campaign params.
            </p>
            <p>
              قارن <span className="font-semibold">الإيراد</span> بـ{" "}
              <span className="font-semibold">نسبة التسليم</span> لتعرف الحملة
              التي تجلب مبيعات فعلية لا مجرد طلبات.
            </p>
          </div>
        )}
      </SectionCard>
      </div>

      {/* Table full width */}
      <SectionCard
        title="جدول الحملات والمصادر"
        subtitle="كل صف تجميع حسب المصدر والمنصة والحملة ومعرفات الإعلان"
        collapsible
      >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-xs">
              <thead>
                <tr className="text-right text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  <th className="pb-2">المصدر والمنصة</th>
                  <th className="pb-2">الحملة</th>
                  <th className="pb-2">المعرفات</th>
                  <th className="pb-2">الطلبات</th>
                  <th className="pb-2">تم التسليم</th>
                  <th className="pb-2">ملغي</th>
                  <th className="pb-2">مرتجع</th>
                  <th className="pb-2">الإيراد</th>
                  <th className="pb-2">متوسط الطلب</th>
                  <th className="pb-2">نسبة التسليم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/70">
                {rows.map((row) => (
                  <tr
                    key={row.key}
                    className="align-top transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-900/10"
                  >
                    <td className="py-2 pr-0 pl-2">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getTrackingBadgeClass(row.trackingType)}`}
                        >
                          {trackingTypeLabels[row.trackingType] || row.trackingType}
                        </span>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {formatAttributionValue(row.source)}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          منصة: {formatAttributionValue(row.platform)}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Medium: {formatAttributionValue(row.medium)}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {row.campaignName}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Content: {formatAttributionValue(row.content)}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Term: {formatAttributionValue(row.term)}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="space-y-1 text-[10px] text-gray-600 dark:text-gray-300">
                        <div>
                          Campaign: {formatAttributionValue(row.campaignId)}
                        </div>
                        <div>Ad Set: {formatAttributionValue(row.adSetId)}</div>
                        <div>Ad ID: {formatAttributionValue(row.adId)}</div>
                      </div>
                    </td>
                    <td className="px-2 py-2 font-bold text-gray-900 dark:text-white">
                      {row.totalOrders.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 font-semibold text-emerald-600 dark:text-emerald-400">
                      {row.deliveredOrders.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 font-semibold text-rose-600 dark:text-rose-400">
                      {row.cancelledOrders.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 font-semibold text-amber-600 dark:text-amber-400">
                      {row.returnedOrders.toLocaleString()}
                    </td>
                    <td className="px-2 py-2 font-medium text-gray-900 dark:text-white">
                      {formatPrice(row.totalRevenue)}
                    </td>
                    <td className="px-2 py-2 text-gray-700 dark:text-gray-200">
                      {formatPrice(row.averageOrderValue)}
                    </td>
                    <td className="px-2 py-2 text-gray-700 dark:text-gray-200">
                      {row.deliveredRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length === 0 && (
            <div className="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
              لا توجد نتائج مطابقة للفلاتر الحالية.
            </div>
          )}
        </SectionCard>

      {error && data && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          آخر محاولة تحديث أعادت خطأ: {error}
        </div>
      )}
    </div>
  );
};

export default CampaignAttributionAnalytics;
