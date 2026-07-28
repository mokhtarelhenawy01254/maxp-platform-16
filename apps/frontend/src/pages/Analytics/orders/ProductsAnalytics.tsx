import React from "react";
import {
  ShoppingBagIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  XCircleIcon,
  StarIcon,
  ChartBarSquareIcon,
} from "@heroicons/react/24/outline";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import DeferredResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import { useCurrency } from "../../../hooks/useCurrency";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

interface ProductStats {
  topProducts: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
    image?: string;
  }>;
  lowPerformingProducts: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  totalProducts: number;
}

const PIE_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16"];

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className ?? ""}`} />;
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

function ProductsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-[400px] w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function getDateRange(period: string): { startDate: string; endDate: string; prevStartDate: string; prevEndDate: string } {
  const now = new Date();
  const days = parseInt(period, 10);
  const endDate = now.toISOString().split("T")[0];

  const start = new Date(now);
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

function calcPercentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

const ProductsAnalytics: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { t, i18n } = useTranslation();
  const [period, setPeriod] = React.useState("30");
  const isRtl = i18n.language === "ar";

  const dates = React.useMemo(() => getDateRange(period), [period]);

  const topProductsQuery = useQuery({
    queryKey: ["analytics", "products", "top", period],
    queryFn: () => analyticsService.getTopProducts(period, 10),
    select: (data) => data.success ? data.data : [],
  });

  const prevTopProductsQuery = useQuery({
    queryKey: ["analytics", "products", "top", "prev", period],
    queryFn: () => analyticsService.getTopProducts(period, 10, dates.prevStartDate, dates.prevEndDate),
    select: (data) => data.success ? data.data : [],
    enabled: true,
  });

  const productAnalyticsQuery = useQuery({
    queryKey: ["analytics", "products", "analytics", period],
    queryFn: () => analyticsService.getProductAnalytics(period),
    select: (data) => ({
      lowPerforming: data.success ? data.data?.lowPerforming || [] : [],
      totalProducts: data.success ? data.data?.totalProducts || 0 : 0,
    }),
  });

  const isLoading = topProductsQuery.isLoading || productAnalyticsQuery.isLoading;
  const isError = topProductsQuery.isError || productAnalyticsQuery.isError;
  const errorMessage = topProductsQuery.error || productAnalyticsQuery.error;

  const topProducts = topProductsQuery.data ?? [];
  const prevTopProducts = prevTopProductsQuery.data ?? [];
  const lowPerformingProducts = productAnalyticsQuery.data?.lowPerforming ?? [];
  const totalProducts = productAnalyticsQuery.data?.totalProducts ?? 0;

  const totalRevenue = topProducts.reduce((sum, p) => sum + (p.revenue || 0), 0);
  const totalSales = topProducts.reduce((sum, p) => sum + (p.sales || 0), 0);
  const prevTotalRevenue = prevTopProducts.reduce((sum, p) => sum + (p.revenue || 0), 0);
  const prevTotalSales = prevTopProducts.reduce((sum, p) => sum + (p.sales || 0), 0);

  const revenueChange = calcPercentChange(totalRevenue, prevTotalRevenue);
  const salesChange = calcPercentChange(totalSales, prevTotalSales);

  if (isLoading) return <ProductsSkeleton />;

  if (isError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl text-center">
        <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 dark:text-red-400">
          {errorMessage instanceof Error ? errorMessage.message : t("productAnalytics.fetchError")}
        </p>
        <button
          onClick={() => { topProductsQuery.refetch(); productAnalyticsQuery.refetch(); }}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          {t("productAnalytics.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("productAnalytics.title")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t("productAnalytics.subtitle")}
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="7">{t("productAnalytics.last7Days")}</option>
          <option value="30">{t("productAnalytics.last30Days")}</option>
          <option value="90">{t("productAnalytics.last90Days")}</option>
          <option value="365">{t("productAnalytics.lastYear")}</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-500">
              <ShoppingBagIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("productAnalytics.totalProducts")}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalProducts.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-500">
              <ChartBarSquareIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("productAnalytics.sales")}</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalSales.toLocaleString()}</p>
                <ChangeBadge value={salesChange} />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-500">
              <ArrowTrendingUpIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("productAnalytics.revenue")}</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(totalRevenue)}</p>
                <ChangeBadge value={revenueChange} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Products Chart & Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
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
                  <YAxis dataKey="name" type="category" stroke="currentColor" className="stroke-gray-600 dark:stroke-gray-400" fontSize={12} width={150} reversed={isRtl} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px" }}
                    wrapperClassName="[&_.recharts-tooltip-wrapper]:!bg-white dark:[&_.recharts-tooltip-wrapper]:!bg-gray-800 [&_.recharts-tooltip-wrapper]:!border-gray-200 dark:[&_.recharts-tooltip-wrapper]:!border-gray-700 [&_.recharts-tooltip-wrapper]:!text-gray-900 dark:[&_.recharts-tooltip-wrapper]:!text-gray-100"
                    formatter={(value, name) => {
                      if (!value) return ["0", name as string];
                      if (name === "revenue") return [formatPrice(value as number), t("productAnalytics.revenue")];
                      return [value, t("productAnalytics.sales")];
                    }}
                  />
                  <Bar dataKey="sales" fill="#3B82F6" name="sales" radius={[0, 4, 4, 0]} />
                </BarChart>
              </DeferredResponsiveContainer>
            </div>
          )}
        </div>

        {/* Revenue Distribution Pie */}
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
                  <Pie
                    data={topProducts.slice(0, 10)}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={130}
                    innerRadius={60}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {topProducts.slice(0, 10).map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatPrice(value as number)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <StarIcon className="h-5 w-5 text-yellow-500" />
          {t("productAnalytics.topProductsDetails")}
        </h3>
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
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">#</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t("productAnalytics.product")}</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t("productAnalytics.sales")}</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t("productAnalytics.revenue")}</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => (
                  <tr
                    key={product.id}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{index + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {product.image && (
                          <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                        )}
                        <span className="text-sm text-gray-900 dark:text-white">{product.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{product.sales}</td>
                    <td className="py-3 px-4 text-sm text-green-600 font-medium">{formatPrice(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Low Performing Products */}
      {lowPerformingProducts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />
            {t("productAnalytics.lowPerforming")}
          </h3>
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
