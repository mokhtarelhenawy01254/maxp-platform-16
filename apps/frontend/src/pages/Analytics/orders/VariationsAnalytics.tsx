import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import {
  SwatchIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  CubeIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  FunnelIcon,
  ArrowUturnLeftIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import { useCurrency } from "../../../hooks/useCurrency";
import PeriodSelector, {
  PeriodRange,
  PeriodKey,
} from "../../../components/common/PeriodSelector";

interface VariationCombo {
  name: string;
  product: string;
  productId?: string;
  color?: string;
  size?: string;
  sales: number;
  revenue: number;
  orders?: number;
}

interface VariationDimension {
  name: string;
  sales: number;
  revenue: number;
}

interface FilteredProductInfo {
  id: string;
  name: string;
}

interface VariationStats {
  sizes: VariationDimension[];
  colors: VariationDimension[];
  topVariations: VariationCombo[];
  totalVariations: number;
  totalSales: number;
  totalRevenue: number;
  totalOrders: number;
  filteredProduct?: FilteredProductInfo | null;
}

type SortKey = "name" | "product" | "color" | "size" | "sales" | "revenue" | "orders";
type SortDir = "asc" | "desc";

const COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
  "#F97316",
  "#6366F1",
];

function exportToCsv(data: any[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const VariationsAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlPeriod = (searchParams.get("period") as PeriodKey) || "30";
  const urlStartDate = searchParams.get("startDate") || "";
  const urlEndDate = searchParams.get("endDate") || "";
  const urlProductId = searchParams.get("productId") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [stats, setStats] = useState<VariationStats | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("sales");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    if (range) {
      fetchData();
    }
  }, [range, urlProductId]);

  const handleRangeChange = (newRange: PeriodRange) => {
    setRange(newRange);
    const params: Record<string, string> = {};
    if (urlProductId) params.productId = urlProductId;
    if (newRange.period) params.period = newRange.period;
    if (newRange.period === "custom") {
      if (newRange.startDate) params.startDate = newRange.startDate;
      if (newRange.endDate) params.endDate = newRange.endDate;
    }
    setSearchParams(params, { replace: true });
  };

  const handleClearProductFilter = () => {
    const params: Record<string, string> = {};
    if (range?.period) params.period = range.period;
    if (range?.period === "custom") {
      if (range.startDate) params.startDate = range.startDate;
      if (range.endDate) params.endDate = range.endDate;
    }
    setSearchParams(params, { replace: true });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await analyticsService.getVariationsAnalytics(
        range?.startDate,
        range?.endDate,
        urlProductId || undefined
      );

      if (response?.success) {
        const data = response.data || {};
        const rawVariations: VariationCombo[] = (
          data.topVariations ||
          data.variations ||
          []
        ).map((v: any) => ({
          name: v.name || "",
          product: v.product || "",
          productId: v.productId || "",
          color: v.color || "",
          size: v.size || "",
          sales: Number(v.sales ?? v.quantity ?? 0),
          revenue: Number(v.revenue ?? 0),
          orders: Number(v.orders ?? 0),
        }));

        setStats({
          sizes: (data.sizes || []).map((s: any) => ({
            name: s.name || "",
            sales: Number(s.sales ?? s.quantity ?? 0),
            revenue: Number(s.revenue ?? 0),
          })),
          colors: (data.colors || []).map((c: any) => ({
            name: c.name || "",
            sales: Number(c.sales ?? c.quantity ?? 0),
            revenue: Number(c.revenue ?? 0),
          })),
          topVariations: rawVariations,
          totalVariations: Number(data.totalVariations ?? rawVariations.length),
          totalSales: Number(data.totalSales ?? data.totalQuantity ?? 0),
          totalRevenue: Number(data.totalRevenue ?? 0),
          totalOrders: Number(data.totalOrders ?? 0),
          filteredProduct: data.filteredProduct || null,
        });
      }
    } catch (err: any) {
      setError(err.message || t("variationsAnalytics.fetchError"));
    } finally {
      setLoading(false);
    }
  };

  const filteredVariations = useMemo(() => {
    const list = stats?.topVariations || [];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (v) =>
            v.name.toLowerCase().includes(q) ||
            v.product.toLowerCase().includes(q) ||
            (v.color || "").toLowerCase().includes(q) ||
            (v.size || "").toLowerCase().includes(q)
        )
      : list;

    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? "";
      const bVal = b[sortKey] ?? "";
      if (typeof aVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal as string, "ar")
          : (bVal as string).localeCompare(aVal as string, "ar");
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [stats?.topVariations, search, sortKey, sortDir]);

  const displayedVariations = filteredVariations.slice(0, visibleCount);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
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
            sortDir === "asc" ? (
              <ChevronUpIcon className="h-3.5 w-3.5" />
            ) : (
              <ChevronDownIcon className="h-3.5 w-3.5" />
            )
          ) : null}
        </span>
      </th>
    );
  }

  const handleExport = () => {
    exportToCsv(
      filteredVariations.map((v) => ({
        [t("variationsAnalytics.variation")]: v.name,
        [t("variationsAnalytics.product")]: v.product,
        [t("variationsAnalytics.color")]: v.color || "-",
        [t("variationsAnalytics.size")]: v.size || "-",
        [t("variationsAnalytics.sales")]: v.sales,
        [t("variationsAnalytics.revenue")]: v.revenue,
        [t("variationsAnalytics.orders")]: v.orders || 0,
      })),
      "variations-report"
    );
  };

  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 text-xs space-y-1">
          <p className="font-semibold text-gray-900 dark:text-white">
            {item.name}
          </p>
          <p className="text-blue-600 dark:text-blue-400">
            {t("variationsAnalytics.sales")}:{" "}
            <span className="font-bold tabular-nums">
              {item.sales?.toLocaleString()}
            </span>
          </p>
          <p className="text-emerald-600 dark:text-emerald-400">
            {t("variationsAnalytics.revenue")}:{" "}
            <span className="font-bold tabular-nums">
              {formatPrice(item.revenue || 0)}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  const header = (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("variationsAnalytics.title")}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t("variationsAnalytics.subtitle")}
        </p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <PeriodSelector
          initialPeriod={urlPeriod}
          initialStartDate={urlStartDate || undefined}
          initialEndDate={urlEndDate || undefined}
          onRangeChange={handleRangeChange}
        />
        <button
          onClick={handleExport}
          disabled={filteredVariations.length === 0}
          className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />{" "}
          {t("variationsAnalytics.csvExport")}
        </button>
      </div>
    </div>
  );

  if (loading && !stats) {
    return (
      <div className="space-y-6" dir="rtl">
        {header}
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="space-y-6" dir="rtl">
        {header}
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl text-center">
          <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            {t("variationsAnalytics.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {header}

      {/* Product Filter Banner if filtered by a single product */}
      {urlProductId && (
        <div className="flex items-center justify-between p-3.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm">
          <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
            <FunnelIcon className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              {t("variationsAnalytics.filterByProduct")}:{" "}
              <strong className="font-semibold">
                {stats?.filteredProduct?.name ||
                  stats?.topVariations?.[0]?.product ||
                  urlProductId}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearProductFilter}
              className="px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
              {t("variationsAnalytics.clearFilter")}
            </button>
            <Link
              to={`/analytics/orders/products?period=${range?.period || urlPeriod}${range?.startDate ? `&startDate=${range.startDate}` : ""}${range?.endDate ? `&endDate=${range.endDate}` : ""}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowUturnLeftIcon className="h-3.5 w-3.5" />
              {t("variationsAnalytics.backToProducts")}
            </Link>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 border-t-2 border-t-purple-500">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-purple-500 text-white">
              <SwatchIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("variationsAnalytics.totalVariations")}
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
                {stats?.totalVariations?.toLocaleString() ?? "0"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 border-t-2 border-t-blue-500">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-blue-500 text-white">
              <CubeIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("variationsAnalytics.totalSales")}
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
                {stats?.totalSales?.toLocaleString() ?? "0"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 border-t-2 border-t-cyan-500">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-cyan-500 text-white">
              <DocumentTextIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("variationsAnalytics.totalOrders")}
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
                {stats?.totalOrders?.toLocaleString() ?? "0"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 border-t-2 border-t-emerald-500">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-emerald-500 text-white">
              <CurrencyDollarIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("variationsAnalytics.totalRevenue")}
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
                {formatPrice(stats?.totalRevenue ?? 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sizes Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <SwatchIcon className="h-5 w-5 text-blue-500" />
            {t("variationsAnalytics.topSizes")}
          </h3>
          <div className="min-w-0 h-[300px]">
            {stats?.sizes && stats.sizes.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={stats.sizes}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="sales"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} (${percent ? (percent * 100).toFixed(0) : 0}%)`
                    }
                  >
                    {stats.sizes.map((_, index) => (
                      <Cell
                        key={`cell-size-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">
                {t("variationsAnalytics.noData")}
              </div>
            )}
          </div>
        </div>

        {/* Colors Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <SwatchIcon className="h-5 w-5 text-purple-500" />
            {t("variationsAnalytics.topColors")}
          </h3>
          <div className="min-w-0 h-[300px]">
            {stats?.colors && stats.colors.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={stats.colors} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    opacity={0.1}
                  />
                  <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#9CA3AF"
                    fontSize={12}
                    width={80}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Bar
                    dataKey="sales"
                    fill="#8B5CF6"
                    name={t("variationsAnalytics.sales")}
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">
                {t("variationsAnalytics.noData")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Variations Table Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex items-center justify-between flex-wrap gap-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <SwatchIcon className="h-5 w-5 text-gray-400" />
              {t("variationsAnalytics.topVariations")}
            </h3>
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
              {filteredVariations.length} {t("variationsAnalytics.variation")}
            </span>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("variationsAnalytics.searchPlaceholder") as string}
              aria-label={t("variationsAnalytics.searchPlaceholder") as string}
              className="w-full pr-9 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs placeholder-gray-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-shadow"
            />
          </div>
        </div>

        {filteredVariations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <SwatchIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {search
                ? t("variationsAnalytics.noVariationsFound")
                : t("variationsAnalytics.noData")}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-3 px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                {t("variationsAnalytics.clearFilter")}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="py-3 px-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400 w-12">
                    #
                  </th>
                  <SortHeader
                    column="name"
                    label={t("variationsAnalytics.variation")}
                  />
                  <SortHeader
                    column="product"
                    label={t("variationsAnalytics.product")}
                  />
                  <SortHeader
                    column="color"
                    label={t("variationsAnalytics.color")}
                  />
                  <SortHeader
                    column="size"
                    label={t("variationsAnalytics.size")}
                  />
                  <SortHeader
                    column="sales"
                    label={t("variationsAnalytics.sales")}
                  />
                  <SortHeader
                    column="revenue"
                    label={t("variationsAnalytics.revenue")}
                  />
                  <SortHeader
                    column="orders"
                    label={t("variationsAnalytics.orders")}
                  />
                </tr>
              </thead>
              <tbody>
                {displayedVariations.map((variation, index) => (
                  <tr
                    key={`${variation.productId || ""}-${variation.name}-${index}`}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                  >
                    <td className="py-3 px-3 text-sm text-gray-400 tabular-nums">
                      {index + 1}
                    </td>
                    <td className="py-3 px-3 text-sm font-medium text-gray-900 dark:text-white">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        {variation.name}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300">
                      {variation.productId ? (
                        <Link
                          to={`/products/${variation.productId}`}
                          className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
                        >
                          {variation.product}
                        </Link>
                      ) : (
                        variation.product
                      )}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-600 dark:text-gray-400">
                      {variation.color || "-"}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-600 dark:text-gray-400">
                      {variation.size || "-"}
                    </td>
                    <td className="py-3 px-3 text-sm font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                      {variation.sales.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-sm font-medium text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
                      {formatPrice(variation.revenue)}
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300 tabular-nums">
                      {(variation.orders || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Load More Pagination Bar */}
        {filteredVariations.length > displayedVariations.length && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t("variationsAnalytics.showingCount", {
                count: displayedVariations.length,
                total: filteredVariations.length,
              })}
            </span>
            <button
              onClick={() => setVisibleCount((prev) => prev + 20)}
              className="inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              {t("variationsAnalytics.showMore")} (
              {filteredVariations.length - displayedVariations.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VariationsAnalytics;
