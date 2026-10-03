import React, { useEffect, useMemo, useState } from "react";
import {
  ShoppingBagIcon,
  CubeIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  XCircleIcon,
  StarIcon,
  ChartBarSquareIcon,
  ArrowDownTrayIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer,
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
  { value: "this_month", labelKey: "thisMonth" },
  { value: "last_month", labelKey: "lastMonth" },
  { value: "30", labelKey: "last30Days" },
  { value: "60", labelKey: "periodTwoMonths" },
  { value: "90", labelKey: "last90Days" },
  { value: "180", labelKey: "periodSixMonths" },
  { value: "365", labelKey: "lastYear" },
  { value: "730", labelKey: "periodTwoYears" },
  { value: "custom", labelKey: "custom" },
];

const MONTH_PERIODS = new Set(["this_month", "last_month"]);

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthPeriodRange(period: string): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (period === "this_month") {
    return { start: formatDateInput(new Date(year, month, 1)), end: formatDateInput(now) };
  }
  return {
    start: formatDateInput(new Date(year, month - 1, 1)),
    end: formatDateInput(new Date(year, month, 0)),
  };
}

type SortKey = "quantitySold" | "orderCount" | "averagePrice" | "unitsPerOrder" | "revenue" | "productName" | "topVariation";
type SortDir = "asc" | "desc";

interface SalesProduct {
  productId: string;
  productName: string;
  productSku: string | null;
  productImage: string | null;
  quantitySold: number;
  orderCount: number;
  revenue: number;
  averagePrice: number;
  unitsPerOrder: number;
  topVariation?: string | null;
  topColor?: string | null;
  topSize?: string | null;
}

interface SalesSummary {
  totalProducts: number;
  totalQuantity: number;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
}

interface SalesApiResponse {
  success: boolean;
  data?: {
    products: SalesProduct[];
    summary: SalesSummary | null;
  };
}

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
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

const ProductsAnalytics: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const [searchParams, setSearchParams] = useSearchParams();

  const [period, setPeriod] = React.useState(searchParams.get("period") || "30");
  const [startDate, setStartDate] = React.useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = React.useState(searchParams.get("endDate") || "");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("quantitySold");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

  const isCustom = period === "custom";
  const monthRange = MONTH_PERIODS.has(period) ? getMonthPeriodRange(period) : null;

  const effectiveStartDate = isCustom ? (startDate || undefined) : (monthRange?.start || undefined);
  const effectiveEndDate = isCustom ? (endDate || undefined) : (monthRange?.end || undefined);
  const effectivePeriod = isCustom || monthRange ? undefined : period;

  React.useEffect(() => {
    const params: Record<string, string> = { period };
    if (isCustom && startDate) params.startDate = startDate;
    if (isCustom && endDate) params.endDate = endDate;
    setSearchParams(params, { replace: true });
  }, [period, startDate, endDate, isCustom, setSearchParams]);

  const query = useQuery({
    queryKey: ["analytics", "products", "sales-performance", period, effectiveStartDate, effectiveEndDate],
    queryFn: (): Promise<SalesApiResponse> =>
      analyticsService.getProductSalesPerformance(
        effectivePeriod,
        effectiveStartDate,
        effectiveEndDate,
      ),
    select: (data) => (data?.success ? data.data : null),
    staleTime: 60_000,
  });

  const data = query.data;
  const products = data?.products ?? [];
  const summary = data?.summary;

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? products.filter(
          (p) =>
            p.productName.toLowerCase().includes(q) ||
            (p.productSku || "").toLowerCase().includes(q),
        )
      : products;
    const sorted = [...list].sort((a, b) => {
      const aVal =
        sortKey === "productName"
          ? a.productName
          : sortKey === "topVariation"
          ? (a.topVariation || "")
          : a[sortKey];
      const bVal =
        sortKey === "productName"
          ? b.productName
          : sortKey === "topVariation"
          ? (b.topVariation || "")
          : b[sortKey];
      if (typeof aVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal as string, "ar")
          : (bVal as string).localeCompare(aVal as string, "ar");
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return sorted;
  }, [products, search, sortKey, sortDir]);

  const isLoading = query.isLoading;
  const isError = query.isError;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortHeader({ column, label }: { column: SortKey; label: string }) {
    return (
      <th
        className="py-3 px-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400 cursor-pointer select-none whitespace-nowrap hover:text-gray-700 dark:hover:text-gray-200"
        onClick={() => toggleSort(column)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {sortKey === column ? (
            sortDir === "asc" ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />
          ) : null}
        </span>
      </th>
    );
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
          {t("productAnalytics.fetchError")}
        </p>
        <button onClick={() => query.refetch()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
          {t("productAnalytics.retry")}
        </button>
      </div>
    );
  }

  const handleExport = () => {
    exportToCsv(
      filteredProducts.map((p) => ({
        [t("productAnalytics.product")]: p.productName,
        [t("productAnalytics.sku")]: p.productSku || "",
        [t("productAnalytics.topVariation")]: p.topVariation || "-",
        [t("productAnalytics.quantitySold")]: p.quantitySold,
        [t("productAnalytics.orderCount")]: p.orderCount,
        [t("productAnalytics.averagePrice")]: p.averagePrice,
        [t("productAnalytics.unitsPerOrder")]: p.unitsPerOrder,
        [t("productAnalytics.revenue")]: p.revenue,
      })),
      "product-sales-report",
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("productAnalytics.title")}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t("productAnalytics.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            aria-label={t("productAnalytics.title") as string}
            value={period}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{t(`productAnalytics.${opt.labelKey}`)}</option>
            ))}
          </select>
          {isCustom && (
            <div className="flex items-center gap-2">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
              <span className="text-gray-400 text-sm">{t("productAnalytics.custom")}</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
            </div>
          )}
          <button
            onClick={handleExport}
            disabled={filteredProducts.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4" /> {t("productAnalytics.csvExport")}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("productAnalytics.searchPlaceholder") as string}
          aria-label={t("productAnalytics.searchPlaceholder") as string}
          className="w-full pr-10 pl-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-shadow"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 border-t-2 border-t-purple-500 transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-purple-500"><ShoppingBagIcon className="h-5 w-5 text-white" /></div>
            <div><p className="text-xs text-gray-500 dark:text-gray-400">{t("productAnalytics.totalProducts")}</p><p className="text-xl font-bold text-gray-900 dark:text-white">{summary?.totalProducts?.toLocaleString() ?? "0"}</p></div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 border-t-2 border-t-blue-500 transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-blue-500"><CubeIcon className="h-5 w-5 text-white" /></div>
            <div><p className="text-xs text-gray-500 dark:text-gray-400">{t("productAnalytics.totalQuantity")}</p><p className="text-xl font-bold text-gray-900 dark:text-white">{summary?.totalQuantity?.toLocaleString() ?? "0"}</p></div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 border-t-2 border-t-cyan-500 transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-cyan-500"><DocumentTextIcon className="h-5 w-5 text-white" /></div>
            <div><p className="text-xs text-gray-500 dark:text-gray-400">{t("productAnalytics.totalOrders")}</p><p className="text-xl font-bold text-gray-900 dark:text-white">{summary?.totalOrders?.toLocaleString() ?? "0"}</p></div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 border-t-2 border-t-emerald-500 transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-green-500"><CurrencyDollarIcon className="h-5 w-5 text-white" /></div>
            <div><p className="text-xs text-gray-500 dark:text-gray-400">{t("productAnalytics.revenue")}</p><p className="text-xl font-bold text-gray-900 dark:text-white">{formatPrice(summary?.totalRevenue ?? 0)}</p></div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <StarIcon className="h-5 w-5 text-yellow-500" />
            {t("productAnalytics.topProducts")}
          </h3>
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <ShoppingBagIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">{t("productAnalytics.noData")}</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t("productAnalytics.noDataDesc")}</p>
            </div>
          ) : (
            <div className="min-w-0 h-[400px]">
              <DeferredResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={products.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-gray-300 dark:stroke-gray-600" />
                  <XAxis type="number" stroke="currentColor" className="stroke-gray-600 dark:stroke-gray-400" fontSize={12} />
                  <YAxis dataKey="productName" type="category" stroke="currentColor" className="stroke-gray-600 dark:stroke-gray-400" fontSize={12} width={130} reversed={isRtl} />
                  <Tooltip contentStyle={{ borderRadius: "8px" }} wrapperClassName="[&_.recharts-tooltip-wrapper]:!bg-white dark:[&_.recharts-tooltip-wrapper]:!bg-gray-800" />
                  <Bar dataKey="quantitySold" fill="#3B82F6" name={t("productAnalytics.quantitySold")} radius={[0, 4, 4, 0]} />
                </BarChart>
              </DeferredResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ChartBarSquareIcon className="h-5 w-5 text-blue-500" />
            {t("productAnalytics.revenueDistribution")}
          </h3>
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <ShoppingBagIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">{t("productAnalytics.noData")}</p>
            </div>
          ) : (
            <div className="min-w-0 h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={products.slice(0, 10)} dataKey="revenue" nameKey="productName" cx="50%" cy="50%" outerRadius={130} innerRadius={60}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {products.slice(0, 10).map((_, index) => (<Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(value) => formatPrice(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingBagIcon className="h-5 w-5 text-gray-400" />
            {t("productAnalytics.title")}
          </h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {filteredProducts.length} {t("productAnalytics.product")}
          </span>
        </div>
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <ShoppingBagIcon className="h-14 w-14 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {search ? t("productAnalytics.searchNoResults") : t("productAnalytics.noData")}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              {t("productAnalytics.noDataDesc")}
            </p>
            {search && (
              <button onClick={() => setSearch("")} className="mt-4 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30">
                {t("productAnalytics.clearSearch")}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <SortHeader column="productName" label={t("productAnalytics.product")} />
                  <SortHeader column="topVariation" label={t("productAnalytics.topVariation")} />
                  <SortHeader column="quantitySold" label={t("productAnalytics.quantitySold")} />
                  <SortHeader column="orderCount" label={t("productAnalytics.orderCount")} />
                  <SortHeader column="averagePrice" label={t("productAnalytics.averagePrice")} />
                  <SortHeader column="unitsPerOrder" label={t("productAnalytics.unitsPerOrder")} />
                  <SortHeader column="revenue" label={t("productAnalytics.revenue")} />
                  <th className="py-3 px-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {t("productAnalytics.variationDetails")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr key={p.productId} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="py-3 px-3">
                      <Link to={`/products/${p.productId}`} className="flex items-center gap-3 max-w-[260px] group">
                        {p.productImage && (
                          <img src={p.productImage} alt={p.productName} className="h-9 w-9 rounded-lg object-cover shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">{p.productName}</p>
                          {p.productSku && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{p.productSku}</p>}
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">
                      {p.topVariation ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {p.topVariation}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-sm font-semibold text-gray-900 dark:text-white">{p.quantitySold.toLocaleString()}</td>
                    <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">{p.orderCount.toLocaleString()}</td>
                    <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">{formatPrice(p.averagePrice)}</td>
                    <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">{p.unitsPerOrder.toFixed(1)}</td>
                    <td className="py-3 px-3 text-sm text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">{formatPrice(p.revenue)}</td>
                    <td className="py-3 px-3 text-sm text-center">
                      <Link
                        to={`/analytics/orders/variations?productId=${p.productId}&period=${period}${isCustom && startDate ? `&startDate=${startDate}` : ""}${isCustom && endDate ? `&endDate=${endDate}` : ""}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline whitespace-nowrap"
                        title={t("productAnalytics.variationDetails")}
                      >
                        {t("productAnalytics.variationDetails")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsAnalytics;
