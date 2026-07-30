import { DollarSign as BanknotesIcon, Activity as ChartBarIcon, Globe as GlobeAltIcon, Link as LinkIcon, Circle as MegaphoneIcon, ShoppingBag as ShoppingCartIcon, X as XCircleIcon } from 'lucide-react';
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
;
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import { useCurrency } from "../../../hooks/useCurrency";

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

const formatAttributionValue = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  return value;
};

const StatCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  accent: string;
}> = ({ title, value, subtitle, icon: Icon, accent }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </p>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {subtitle}
        </p>
      </div>
      <div className={`rounded-2xl p-3 ${accent}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
    </div>
  </div>
);

const CampaignAttributionAnalytics: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("30");
  const [source, setSource] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [trackingType, setTrackingType] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const deferredSearch = useDeferredValue(searchInput.trim());
  const [data, setData] = useState<CampaignAttributionAnalyticsData | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await analyticsService.getCampaignAttributionAnalytics({
          period,
          source,
          platform,
          trackingType,
          search: deferredSearch || undefined,
          signal: controller.signal,
        });

        if (!response?.success || !response?.data) {
          throw new Error(response?.message || "تعذر تحميل تحليل الحملات");
        }

        setData(response.data);
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
  }, [deferredSearch, period, platform, source, trackingType]);

  const summaryCards = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      {
        title: "إجمالي الطلبات",
        value: data.summary.totalOrders.toLocaleString(),
        subtitle: `${data.summary.deliveryRate.toFixed(1)}% نسبة التسليم`,
        icon: ShoppingCartIcon,
        accent: "bg-blue-600",
      },
      {
        title: "طلبات متتبعة",
        value: data.summary.trackedOrders.toLocaleString(),
        subtitle: `${data.summary.trackingCoverage.toFixed(1)}% من إجمالي الطلبات`,
        icon: LinkIcon,
        accent: "bg-emerald-600",
      },
      {
        title: "طلبات بحملة",
        value: data.summary.campaignTaggedOrders.toLocaleString(),
        subtitle: `${data.summary.directOrders.toLocaleString()} طلب مباشر`,
        icon: MegaphoneIcon,
        accent: "bg-violet-600",
      },
      {
        title: "غير منسوبة",
        value: data.summary.unattributedOrders.toLocaleString(),
        subtitle: `${data.summary.cancelledOrders.toLocaleString()} ملغي و${data.summary.returnedOrders.toLocaleString()} مرتجع`,
        icon: GlobeAltIcon,
        accent: "bg-slate-700",
      },
      {
        title: "إجمالي الإيراد",
        value: formatPrice(data.summary.totalRevenue),
        subtitle: `${formatPrice(data.summary.deliveredRevenue)} إيراد الطلبات المسلمة`,
        icon: BanknotesIcon,
        accent: "bg-amber-500",
      },
      {
        title: "متوسط قيمة الطلب",
        value: formatPrice(data.summary.averageOrderValue),
        subtitle: `${data.summary.deliveredOrders.toLocaleString()} طلب تم تسليمه`,
        icon: ChartBarIcon,
        accent: "bg-cyan-600",
      },
    ];
  }, [data, formatPrice]);

  const sourceChartData = useMemo(
    () => (data?.sourceBreakdown || []).slice(0, 8),
    [data],
  );

  const platformCards = useMemo(
    () => (data?.platformBreakdown || []).slice(0, 6),
    [data],
  );

  const rows = data?.rows || [];

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl text-center">
        <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            تحليل الحملات ومصدر الطلبات
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            ربط الطلبات بالمصدر والمنصة ورقم الحملة من بيانات
            {" "}
            <code className="text-xs">metadata.attribution</code>
            {" "}
            داخل الأوردر.
          </p>
        </div>

        <select
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          className="lg:w-52 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="7">آخر 7 أيام</option>
          <option value="30">آخر 30 يوم</option>
          <option value="90">آخر 90 يوم</option>
          <option value="365">آخر سنة</option>
          <option value="yesterday">أمس فقط</option>
        </select>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          الطلبات القديمة التي تم إنشاؤها قبل تفعيل تتبع الحملات ستظهر غالبًا
          كـ "غير منسوبة"، بينما الطلبات الجديدة ستتجمع حسب
          {" "}
          <span className="font-semibold">source / medium / campaign ID / ad ID</span>
          .
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-1">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            المصدر
          </label>
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">كل المصادر</option>
            {data?.availableFilters.sources.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="xl:col-span-1">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            المنصة
          </label>
          <select
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">كل المنصات</option>
            {data?.availableFilters.platforms.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="xl:col-span-1">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            نوع التتبع
          </label>
          <select
            value={trackingType}
            onChange={(event) => setTrackingType(event.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">الكل</option>
            {data?.availableFilters.trackingTypes.map((item) => (
              <option key={item} value={item}>
                {trackingTypeLabels[item] || item}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 xl:col-span-2">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            بحث باسم الحملة أو رقمها أو Ad Set / Ad ID
          </label>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="مثال: summer_sale أو 1202..."
            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {summaryCards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            icon={card.icon}
            accent={card.accent}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              تطور الطلبات والحملات عبر الوقت
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              مقارنة بين إجمالي الطلبات والطلبات المرتبطة بحملات خلال الفترة.
            </p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.trend || []}>
                <defs>
                  <linearGradient id="campaignTrendFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
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
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              أفضل المصادر
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ترتيب المصادر حسب عدد الطلبات خلال نفس الفترة.
            </p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="source" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="orders" name="الطلبات" fill="#7C3AED" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                جدول الحملات والمصادر
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                كل صف يمثل تجميعًا حسب المصدر والمنصة والحملة ومعرفات الإعلان.
              </p>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {rows.length.toLocaleString()} صف
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead>
                <tr className="text-right text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-3 font-medium">المصدر والمنصة</th>
                  <th className="pb-3 font-medium">الحملة</th>
                  <th className="pb-3 font-medium">المعرفات</th>
                  <th className="pb-3 font-medium">الطلبات</th>
                  <th className="pb-3 font-medium">تم التسليم</th>
                  <th className="pb-3 font-medium">ملغي</th>
                  <th className="pb-3 font-medium">مرتجع</th>
                  <th className="pb-3 font-medium">الإيراد</th>
                  <th className="pb-3 font-medium">متوسط الطلب</th>
                  <th className="pb-3 font-medium">نسبة التسليم</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.key}
                    className="border-b border-gray-100 dark:border-gray-700/70 align-top"
                  >
                    <td className="py-4 pr-0 pl-4">
                      <div className="space-y-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${trackingTypeBadgeClasses[row.trackingType] || trackingTypeBadgeClasses.unattributed}`}
                        >
                          {trackingTypeLabels[row.trackingType] || row.trackingType}
                        </span>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {formatAttributionValue(row.source)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          منصة: {formatAttributionValue(row.platform)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Medium: {formatAttributionValue(row.medium)}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-2">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {row.campaignName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Content: {formatAttributionValue(row.content)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Term: {formatAttributionValue(row.term)}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                        <div>Campaign ID: {formatAttributionValue(row.campaignId)}</div>
                        <div>Ad Set ID: {formatAttributionValue(row.adSetId)}</div>
                        <div>Ad ID: {formatAttributionValue(row.adId)}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-semibold text-gray-900 dark:text-white">
                      {row.totalOrders.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-emerald-600 dark:text-emerald-400">
                      {row.deliveredOrders.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-rose-600 dark:text-rose-400">
                      {row.cancelledOrders.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-amber-600 dark:text-amber-400">
                      {row.returnedOrders.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 font-medium text-gray-900 dark:text-white">
                      {formatPrice(row.totalRevenue)}
                    </td>
                    <td className="py-4 px-4 text-gray-700 dark:text-gray-200">
                      {formatPrice(row.averageOrderValue)}
                    </td>
                    <td className="py-4 px-4 text-gray-700 dark:text-gray-200">
                      {row.deliveredRate.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length === 0 && (
            <div className="py-10 text-center text-gray-500 dark:text-gray-400">
              لا توجد نتائج مطابقة للفلاتر الحالية.
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              المنصات الأعلى مساهمة
            </h2>
            <div className="mt-4 space-y-3">
              {platformCards.map((row, index) => (
                <div
                  key={row.platform || `platform-${index}`}
                  className="rounded-xl border border-gray-100 dark:border-gray-700 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {formatAttributionValue(row.platform)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {row.orders.toLocaleString()} طلب
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {row.share.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatPrice(row.revenue)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {platformCards.length === 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  لا توجد بيانات منصات في الفترة الحالية.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              ماذا تقرأ من الصفحة؟
            </h2>
            <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <p>
                إذا كان
                {" "}
                <span className="font-semibold">Campaign ID</span>
                {" "}
                فارغًا لكن المصدر موجود، فهذا يعني أن الطلب متتبع لكن الرابط لم
                يحمل رقم الحملة نفسه.
              </p>
              <p>
                ارتفاع
                {" "}
                <span className="font-semibold">غير منسوبة</span>
                {" "}
                يشير غالبًا إلى طلبات قديمة أو روابط بدون UTM / campaign params.
              </p>
              <p>
                قارن بين
                {" "}
                <span className="font-semibold">الإيراد</span>
                {" "}
                و
                {" "}
                <span className="font-semibold">نسبة التسليم</span>
                {" "}
                لمعرفة الحملة التي تجلب مبيعات فعلية لا مجرد طلبات.
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && data && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          آخر محاولة تحديث أعادت خطأ: {error}
        </div>
      )}
    </div>
  );
};

export default CampaignAttributionAnalytics;
