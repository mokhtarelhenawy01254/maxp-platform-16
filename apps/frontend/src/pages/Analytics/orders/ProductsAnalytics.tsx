import React from "react";
import {
  ShoppingBagIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  XCircleIcon,
  StarIcon,
  ChartBarSquareIcon,
  ArrowDownTrayIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EyeIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import DeferredResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import { useCurrency } from "../../../hooks/useCurrency";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

const PIE_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16"];

const PERIOD_OPTIONS = [
  { value: "1", labelKey: "periodToday" },
  { value: "2", labelKey: "periodYesterday" },
  { value: "7", labelKey: "last7Days" },
  { value: "14", labelKey: "periodTwoWeeks" },
  { value: "30", labelKey: "last30Days" },
  { value: "60", labelKey: "periodTwoMonths" },
  { value: "90", labelKey: "last90Days" },
  { value: "180", labelKey: "periodSixMonths" },
  { value: "365", labelKey: "lastYear" },
  { value: "730", labelKey: "periodTwoYears" },
  { value: "custom", labelKey: "custom" },
];

type SortKey = "sales" | "revenue" | "name" | "views" | "addToCarts" | "conversionRate";
type SortDir = "asc" | "desc";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className ?? ""}`} />;
}

function ProductsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
      <Skeleton className="h-[300px] w-full" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
      <Skeleton className="h-80 w-full" />
    </div>
  );
}

function ChangeBadge({ value }: { value: number | null }) {
  if (value === null || value === 0) return null;
  const isUp = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${
        isUp
          ? "text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30"
          : "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30"
      }`}
    >
      {isUp ? <ArrowTrendingUpIcon className="h-3 w-3" /> : <ArrowTrendingDownIcon className="h-3 w-3" />}
      {Math.abs(value)}%
    </span>
  );
}

function calcPercentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function getDateRange(period: string, referenceDate: Date = new Date()): { startDate: string; endDate: string; prevStartDate: string; prevEndDate: string } {
  const endDate = referenceDate.toISOString().split("T")[0];
  let days: number;
  if (period === "1") days = 1;
  else if (period === "2") { referenceDate.setDate(referenceDate.getDate() - 1); const y = referenceDate.toISOString().split("T")[0]; referenceDate.setDate(referenceDate.getDate() - 1); return { startDate: y, endDate: y, prevStartDate: referenceDate.toISOString().split("T")[0], prevEndDate: y }; }
  else days = parseInt(period, 10);

  const start = new Date(referenceDate);
  start.setDate(start.getDate() - days);
  const startDate = start.toISOString().split("T")[0];
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevEndDate = prevEnd.toISOString().split("T")[0];
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - days + 1);
  const prevStartDate = prevStart.toISOString().split("T")[0];
  return { startDate, endDate, prevStartDate, prevEndDate };
}

function exportToCsv(data: any[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function StockBadge({ level }: { level?: ProductHealth }) {
  if (!level) return null;
  if (level.urgency === "critical" || level.score < 30)
    return <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">نفذ</span>;
  if (level.urgency === "warning" || level.score < 60)
    return <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">محدود</span>;
  return <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">متوفر</span>;
}

interface ProductHealth {
  score: number;
  stock: number;
  salesVelocity: number;
  daysUntilStockout: number;
  urgency: string;
}

const ProductsAnalytics: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const [searchParams, setSearchParams] = useSearchParams();

  const [period, setPeriod] = React.useState(searchParams.get("period") || "30");
  const [startDate, setStartDate] = React.useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = React.useState(searchParams.get("endDate") || "");
  const [sortKey, setSortKey] = React.useState<SortKey>("sales");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

  const isCustom = period === "custom";

  React.useEffect(() => {
    const params: Record<string, string> = { period };
    if (isCustom && startDate) params.startDate = startDate;
    if (isCustom && endDate) params.endDate = endDate;
    setSearchParams(params, { replace: true });
  }, [period, startDate, endDate, isCustom, setSearchParams]);

  const dates = React.useMemo(() => getDateRange(period), [period]);
  const effectiveStart = isCustom && startDate ? startDate : undefined;
  const effectiveEnd = isCustom && endDate ? endDate : undefined;

  const topProductsQuery = useQuery({
    queryKey: ["analytics", "products", "top", period, effectiveStart, effectiveEnd],
    queryFn: () => analyticsService.getTopProducts(period, 10, effectiveStart, effectiveEnd),
    select: (data) => data.success ? data.data : [],
  });

  const prevTopProductsQuery = useQuery({
    queryKey: ["analytics", "products", "top", "prev", period],
    queryFn: () => analyticsService.getTopProducts(period, 10, dates.prevStartDate, dates.prevEndDate),
    select: (data) => data.success ? data.data : [],
    enabled: !isCustom,
  });

  const productAnalyticsQuery = useQuery({
    queryKey: ["analytics", "products", "analytics", period],
    queryFn: () => analyticsService.getProductAnalytics(period),
    select: (data) => ({
      lowPerforming: data.success ? data.data?.lowPerforming || [] : [],
      totalProducts: data.success ? data.data?.totalProducts || 0 : 0,
    }),
  });

  const dailyTrendQuery = useQuery({
    queryKey: ["analytics", "daily", period, effectiveStart, effectiveEnd],
    queryFn: () => analyticsService.getDailyAnalytics(period, effectiveStart, effectiveEnd),
    select: (data) => data.success ? (data.data || []) : [],
  });

  const healthQuery = useQuery({
    queryKey: ["analytics", "product-health", period],
    queryFn: () => analyticsService.getProductHealthScore(effectiveStart, effectiveEnd),
    select: (data) => {
      if (!data.success || !data.data?.products) return {};
      const map: Record<string, ProductHealth> = {};
      data.data.products.forEach((p: any) => {
        map[p.productId || p.id] = { score: p.score ?? 50, stock: p.stock ?? 0, salesVelocity: p.salesVelocity ?? 0, daysUntilStockout: p.daysUntilStockout ?? 999, urgency: p.urgency ?? "safe" };
      });
      return map;
    },
    staleTime: 120_000,
  });

  const isLoading = topProductsQuery.isLoading || productAnalyticsQuery.isLoading;
  const isError = topProductsQuery.isError || productAnalyticsQuery.isError;
  const errorMessage = topProductsQuery.error || productAnalyticsQuery.error;

  const topProducts = topProductsQuery.data ?? [];
  const prevTopProducts = prevTopProductsQuery.data ?? [];
  const lowPerformingProducts = productAnalyticsQuery.data?.lowPerforming ?? [];
  const totalProducts = productAnalyticsQuery.data?.totalProducts ?? 0;
  const dailyData = dailyTrendQuery.data ?? [];
  const healthMap = healthQuery.data ?? {};

  const totalRevenue = topProducts.reduce((sum, p) => sum + (p.revenue || 0), 0);
  const totalSales = topProducts.reduce((sum, p) => sum + (p.sales || 0), 0);
  const totalViews = topProducts.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalAddToCarts = topProducts.reduce((sum, p) => sum + (p.addToCarts || 0), 0);
  const prevTotalRevenue = prevTopProducts.reduce((sum, p) => sum + (p.revenue || 0), 0);
  const prevTotalSales = prevTopProducts.reduce((sum, p) => sum + (p.sales || 0), 0);
  const prevTotalViews = prevTopProducts.reduce((sum, p) => sum + (p.views || 0), 0);

  const revenueChange = calcPercentChange(totalRevenue, prevTotalRevenue);
  const salesChange = calcPercentChange(totalSales, prevTotalSales);
  const viewsChange = calcPercentChange(totalViews, prevTotalViews);

  const sortedProducts = React.useMemo(() => {
    const sorted = [...topProducts];
    sorted.sort((a, b) => {
      const aVal = sortKey === "name" ? a.name : a[sortKey];
      const bVal = sortKey === "name" ? b.name : b[sortKey];
      if (typeof aVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      }
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return sorted;
  }, [topProducts, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return null;
    return sortDir === "asc" ? <ChevronUpIcon className="h-3 w-3 inline" /> : <ChevronDownIcon className="h-3 w-3 inline" />;
  }

  function handlePeriodChange(value: string) {
    setPeriod(value);
    if (value !== "custom") { setStartDate(""); setEndDate(""); }
  }

  if (isLoading) return <ProductsSkeleton />;

  if (isError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl text-center">
        <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 dark:text-red-400">
          {errorMessage instanceof Error ? errorMessage.message : t("productAnalytics.fetchError")}
        </p>
        <button onClick={() => { topProductsQuery.refetch(); productAnalyticsQuery.refetch(); }} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
          {t("productAnalytics.retry")}
        </button>
      </div>
    );
  }

  const overallConversion = totalViews > 0 ? ((totalSales / totalViews) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("productAnalytics.title")}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t("productAnalytics.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={period} onChange={(e) => handlePeriodChange(e.target.value)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{t(`productAnalytics.${opt.labelKey}`)}</option>
            ))}
          </select>
          {isCustom && (
            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
              <span className="text-gray-500">-</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards — Funnel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-purple-500"><ShoppingBagIcon className="h-5 w-5 text-white" /></div>
            <div><p className="text-xs text-gray-500 dark:text-gray-400">{t("productAnalytics.totalProducts")}</p><p className="text-xl font-bold text-gray-900 dark:text-white">{totalProducts.toLocaleString()}</p></div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-blue-500"><EyeIcon className="h-5 w-5 text-white" /></div>
            <div><p className="text-xs text-gray-500 dark:text-gray-400">مشاهدات</p><div className="flex items-center gap-1.5"><p className="text-xl font-bold text-gray-900 dark:text-white">{totalViews.toLocaleString()}</p><ChangeBadge value={viewsChange} /></div></div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-cyan-500"><ShoppingCartIcon className="h-5 w-5 text-white" /></div>
            <div><p className="text-xs text-gray-500 dark:text-gray-400">إضافات للسلة</p><p className="text-xl font-bold text-gray-900 dark:text-white">{totalAddToCarts.toLocaleString()}</p></div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-green-500"><CurrencyDollarIcon className="h-5 w-5 text-white" /></div>
            <div><p className="text-xs text-gray-500 dark:text-gray-400">{t("productAnalytics.revenue")}</p><div className="flex items-center gap-1.5"><p className="text-xl font-bold text-gray-900 dark:text-white">{formatPrice(totalRevenue)}</p><ChangeBadge value={revenueChange} /></div></div>
          </div>
        </div>
      </div>

      {/* Funnel Rate Bar */}
      {totalViews > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span className="flex items-center gap-1"><EyeIcon className="h-4 w-4" /> {totalViews.toLocaleString()} مشاهدة</span>
            <span className="text-cyan-500 flex items-center gap-1"><ShoppingCartIcon className="h-4 w-4" /> {totalAddToCarts.toLocaleString()} سلة ({totalViews > 0 ? ((totalAddToCarts / totalViews) * 100).toFixed(1) : 0}%)</span>
            <span className="text-green-600 font-medium flex items-center gap-1"><CurrencyDollarIcon className="h-4 w-4" /> {totalSales} مبيعات ({overallConversion}%)</span>
          </div>
          <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.min(100, (totalViews / totalViews) * 100)}%` }} />
          </div>
          <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex mt-1">
            <div className="h-full bg-cyan-500 transition-all" style={{ width: `${Math.min(100, (totalAddToCarts / totalViews) * 100)}%` }} />
            <div className="h-full bg-green-500 transition-all" style={{ width: `${Math.min(100, (totalSales / totalViews) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* Daily Trend Chart */}
      {dailyData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ArrowTrendingUpIcon className="h-5 w-5 text-blue-500" />
            اتجاه المبيعات اليومي
          </h3>
          <div className="min-w-0 h-[300px]">
            <DeferredResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-gray-300 dark:stroke-gray-600" />
                <XAxis dataKey="date" stroke="currentColor" className="stroke-gray-600 dark:stroke-gray-400" fontSize={12} reversed={isRtl} />
                <YAxis stroke="currentColor" className="stroke-gray-600 dark:stroke-gray-400" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: "8px" }} wrapperClassName="[&_.recharts-tooltip-wrapper]:!bg-white dark:[&_.recharts-tooltip-wrapper]:!bg-gray-800" />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#10B981" fillOpacity={0.15} name={t("productAnalytics.revenue")} strokeWidth={2} />
                <Area type="monotone" dataKey="orders" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} name={t("productAnalytics.ordersCount")} strokeWidth={2} />
              </AreaChart>
            </DeferredResponsiveContainer>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
            {t("productAnalytics.topProducts")}
          </h3>
          {topProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <ShoppingBagIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">{t("productAnalytics.noTopProducts")}</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t("productAnalytics.noTopProductsDesc")}</p>
            </div>
          ) : (
            <div className="min-w-0 h-[400px]">
              <DeferredResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-gray-300 dark:stroke-gray-600" />
                  <XAxis type="number" stroke="currentColor" className="stroke-gray-600 dark:stroke-gray-400" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="currentColor" className="stroke-gray-600 dark:stroke-gray-400" fontSize={12} width={130} reversed={isRtl} />
                  <Tooltip contentStyle={{ borderRadius: "8px" }} wrapperClassName="[&_.recharts-tooltip-wrapper]:!bg-white dark:[&_.recharts-tooltip-wrapper]:!bg-gray-800" />
                  <Bar dataKey="sales" fill="#3B82F6" name={t("productAnalytics.sales")} radius={[0, 4, 4, 0]} />
                </BarChart>
              </DeferredResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ChartBarSquareIcon className="h-5 w-5 text-blue-500" />
            توزيع الإيرادات
          </h3>
          {topProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <ShoppingBagIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">{t("productAnalytics.noTopProducts")}</p>
            </div>
          ) : (
            <div className="min-w-0 h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topProducts.slice(0, 10)} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={130} innerRadius={60}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {topProducts.slice(0, 10).map((_, index) => (<Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(value) => formatPrice(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <StarIcon className="h-5 w-5 text-yellow-500" />
            {t("productAnalytics.topProductsDetails")}
          </h3>
          {topProducts.length > 0 && (
            <button onClick={() => exportToCsv(sortedProducts.map((p, i) => ({ "#": i + 1, [t("productAnalytics.product")]: p.name, "مشاهدات": p.views ?? 0, "إضافات للسلة": p.addToCarts ?? 0, [t("productAnalytics.sales")]: p.sales, [t("productAnalytics.revenue")]: p.revenue, "تحويل%": p.conversionRate ?? 0 })), "top-products")} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
              <ArrowDownTrayIcon className="h-4 w-4" /> CSV
            </button>
          )}
        </div>
        {topProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingBagIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">{t("productAnalytics.noTopProducts")}</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t("productAnalytics.noTopProductsDesc")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-right py-3 px-3 text-sm font-medium text-gray-500">#</th>
                  <th className="text-right py-3 px-3 text-sm font-medium text-gray-500 cursor-pointer select-none" onClick={() => toggleSort("name")}>{t("productAnalytics.product")} <SortIcon column="name" /></th>
                  <th className="text-right py-3 px-3 text-sm font-medium text-gray-500 cursor-pointer select-none" onClick={() => toggleSort("views")}><EyeIcon className="h-3.5 w-3.5 inline ml-1" />مشاهدات <SortIcon column="views" /></th>
                  <th className="text-right py-3 px-3 text-sm font-medium text-gray-500 cursor-pointer select-none" onClick={() => toggleSort("addToCarts")}><ShoppingCartIcon className="h-3.5 w-3.5 inline ml-1" />سلة <SortIcon column="addToCarts" /></th>
                  <th className="text-right py-3 px-3 text-sm font-medium text-gray-500 cursor-pointer select-none" onClick={() => toggleSort("sales")}>{t("productAnalytics.sales")} <SortIcon column="sales" /></th>
                  <th className="text-right py-3 px-3 text-sm font-medium text-gray-500 cursor-pointer select-none" onClick={() => toggleSort("conversionRate")}>تحويل% <SortIcon column="conversionRate" /></th>
                  <th className="text-right py-3 px-3 text-sm font-medium text-gray-500 cursor-pointer select-none" onClick={() => toggleSort("revenue")}>{t("productAnalytics.revenue")} <SortIcon column="revenue" /></th>
                  <th className="text-right py-3 px-3 text-sm font-medium text-gray-500">المخزون</th>
                </tr>
              </thead>
              <tbody>
                {sortedProducts.map((product, index) => {
                  const health = healthMap[product.id];
                  return (
                    <tr key={product.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-2.5 px-3 text-sm text-gray-900 dark:text-white">{index + 1}</td>
                      <td className="py-2.5 px-3">
                        <Link to={`/products/${product.id}`} className="flex items-center gap-3 hover:text-blue-600 dark:hover:text-blue-400 group">
                          {product.image && <img src={product.image} alt={product.name} className="w-9 h-9 rounded-lg object-cover" />}
                          <span className="text-sm text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">{product.name}</span>
                          <ChevronRightIcon className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-sm text-gray-600 dark:text-gray-400">{product.views?.toLocaleString() || "—"}</td>
                      <td className="py-2.5 px-3 text-sm text-gray-600 dark:text-gray-400">{product.addToCarts?.toLocaleString() || "—"}</td>
                      <td className="py-2.5 px-3 text-sm text-gray-900 dark:text-white font-medium">{product.sales}</td>
                      <td className="py-2.5 px-3 text-sm">{product.conversionRate != null ? <span className={`font-medium ${product.conversionRate > 5 ? "text-green-600" : product.conversionRate > 2 ? "text-amber-600" : "text-red-600"}`}>{product.conversionRate}%</span> : "—"}</td>
                      <td className="py-2.5 px-3 text-sm text-green-600 font-medium">{formatPrice(product.revenue)}</td>
                      <td className="py-2.5 px-3"><StockBadge level={health} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Low Performing Products */}
      {lowPerformingProducts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />
              {t("productAnalytics.lowPerforming")}
            </h3>
            <button onClick={() => exportToCsv(lowPerformingProducts.map((p) => ({ [t("productAnalytics.product")]: p.name, [t("productAnalytics.sales")]: p.sales, [t("productAnalytics.revenue")]: p.revenue })), "low-performing-products")} className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
              <ArrowDownTrayIcon className="h-4 w-4" /> CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t("productAnalytics.product")}</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t("productAnalytics.sales")}</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t("productAnalytics.revenue")}</th>
                </tr>
              </thead>
              <tbody>
                {lowPerformingProducts.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{product.name}</td>
                    <td className="py-3 px-4 text-sm text-red-600">{product.sales}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{formatPrice(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsAnalytics;
