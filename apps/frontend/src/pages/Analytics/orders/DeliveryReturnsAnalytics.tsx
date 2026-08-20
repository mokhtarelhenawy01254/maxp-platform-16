import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CheckCircleIcon,
  ArrowUturnLeftIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  BanknotesIcon,
  ClockIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  FunnelIcon,
  TruckIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import DeferredResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import PeriodSelector, {
  PeriodKey,
  PeriodRange,
} from "../../../components/common/PeriodSelector";
import { useCurrency } from "../../../hooks/useCurrency";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

const DELIVERED_COLOR = "#10B981";
const RETURNED_COLOR = "#F59E0B";
const OTHER_COLOR = "#94A3B8";

type SortKey =
  | "productName"
  | "totalItems"
  | "deliveredItems"
  | "returnedItems"
  | "deliveryRate"
  | "returnRate"
  | "totalRevenue";

type SortDir = "asc" | "desc";

interface FulfillmentProduct {
  productId: string | null;
  productName: string;
  productSku: string | null;
  productImage: string | null;
  totalItems: number;
  totalQuantity: number;
  totalRevenue: number;
  deliveredItems: number;
  deliveredQuantity: number;
  deliveredRevenue: number;
  cancelledItems: number;
  cancelledQuantity: number;
  returnedItems: number;
  returnedQuantity: number;
  otherItems: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  deliveryRate: number;
  cancellationRate: number;
  returnRate: number;
  lostRevenue: number;
}

interface FulfillmentSummary {
  totalProducts: number;
  totalOrders: number;
  totalItems: number;
  totalQuantity: number;
  deliveredItems: number;
  cancelledItems: number;
  returnedItems: number;
  pendingItems: number;
  deliveryRate: number;
  cancellationRate: number;
  returnRate: number;
  totalRevenue: number;
  deliveredRevenue: number;
  lostRevenue: number;
}

interface FulfillmentApiResponse {
  success: boolean;
  data?: FulfillmentData;
}

interface FulfillmentData {
  summary: FulfillmentSummary;
  products: FulfillmentProduct[];
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className ?? ""}`}
    />
  );
}

function ProductsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-[320px] w-full" />
        <Skeleton className="h-[320px] w-full lg:col-span-2" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function exportToCsv(rows: Record<string, string | number>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0] as Record<string, string | number>);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => JSON.stringify(row[h] ?? "")).join(","),
    ),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function CompositionBar({
  delivered,
  returned,
  other,
  total,
}: {
  delivered: number;
  returned: number;
  other: number;
  total: number;
}) {
  if (total <= 0) {
    return (
      <div className="w-full h-2.5 rounded-full bg-gray-100 dark:bg-gray-700" />
    );
  }
  const seg = (v: number) => (total > 0 ? Math.max((v / total) * 100, v > 0 ? 1.5 : 0) : 0);
  return (
    <div className="group/comp w-full h-2.5 rounded-full bg-gray-100 dark:bg-gray-700 flex overflow-hidden cursor-default">
      {delivered > 0 && (
        <div
          className="h-full bg-emerald-500 transition-all duration-200 group-hover/comp:brightness-110"
          style={{ width: `${seg(delivered)}%` }}
          title={`${delivered}`}
        />
      )}
      {returned > 0 && (
        <div
          className="h-full bg-amber-500 transition-all duration-200 group-hover/comp:brightness-110"
          style={{ width: `${seg(returned)}%` }}
          title={`${returned}`}
        />
      )}
      {other > 0 && (
        <div
          className="h-full bg-slate-400 dark:bg-slate-500 transition-all duration-200 group-hover/comp:brightness-110"
          style={{ width: `${seg(other)}%` }}
          title={`${other}`}
        />
      )}
    </div>
  );
}

function KpiCard({
  icon,
  iconBg,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent: string;
}) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 border-t-2 ${accent} transition-shadow hover:shadow-md`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {value}
          </p>
          {hint && (
            <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
              {hint}
            </p>
          )}
        </div>
        <div
          className={`p-2.5 rounded-xl ${iconBg} shrink-0 shadow-sm`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

const DeliveryReturnsAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();

  const [range, setRange] = useState<PeriodRange | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("totalItems");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    if (!range) {
      return;
    }
    const params: Record<string, string> = {
      period: range.period,
      ...(range.startDate ? { startDate: range.startDate } : {}),
      ...(range.endDate ? { endDate: range.endDate } : {}),
    };
    setSearchParams(params, { replace: true });
  }, [range, setSearchParams]);

  const query = useQuery({
    queryKey: [
      "analytics",
      "product-fulfillment",
      range?.period,
      range?.startDate,
      range?.endDate,
    ],
    queryFn: (): Promise<FulfillmentApiResponse> =>
      analyticsService.getProductFulfillmentAnalytics(
        range?.period,
        range?.startDate,
        range?.endDate,
      ) as Promise<FulfillmentApiResponse>,
    select: (data): FulfillmentData | null =>
      data?.success && data?.data ? data.data : null,
    staleTime: 60_000,
    enabled: Boolean(range),
  });

  const data = query.data;
  const summary = data?.summary;
  const products = data?.products ?? [];

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
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal, "ar")
          : bVal.localeCompare(aVal, "ar");
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return sorted;
  }, [products, search, sortKey, sortDir]);

  const totalDelivered = summary?.deliveredItems ?? 0;
  const totalReturned = summary?.returnedItems ?? 0;
  const totalOther =
    (summary?.totalItems ?? 0) - totalDelivered - totalReturned;

  const compositionData = useMemo(() => {
    if (!summary || summary.totalItems <= 0) return [];
    return [
      { key: "delivered", name: t("deliveryReturnsReport.deliveredItems"), value: totalDelivered, color: DELIVERED_COLOR },
      { key: "returned", name: t("deliveryReturnsReport.returnedItems"), value: totalReturned, color: RETURNED_COLOR },
      { key: "other", name: t("deliveryReturnsReport.otherItems"), value: totalOther, color: OTHER_COLOR },
    ].filter((d) => d.value > 0);
  }, [summary, t, totalDelivered, totalReturned, totalOther]);

  const topDeliveredProduct = useMemo(() => {
    const top = [...products].sort((a, b) => b.deliveredItems - a.deliveredItems).find((p) => p.deliveredItems > 0);
    return top ? { name: top.productName, count: top.deliveredItems } : null;
  }, [products]);
  const topReturnedProduct = useMemo(() => {
    const top = [...products].sort((a, b) => b.returnedItems - a.returnedItems).find((p) => p.returnedItems > 0);
    return top ? { name: top.productName, count: top.returnedItems } : null;
  }, [products]);

  const handleExport = () => {
    exportToCsv(
      filteredProducts.map((p) => ({
        [t("deliveryReturnsReport.product")]: p.productName,
        [t("deliveryReturnsReport.sku")]: p.productSku || "",
        [t("deliveryReturnsReport.items")]: p.totalItems,
        [t("deliveryReturnsReport.quantity")]: p.totalQuantity,
        [t("deliveryReturnsReport.deliveredItems")]: p.deliveredItems,
        [t("deliveryReturnsReport.returnedItems")]: p.returnedItems,
        [t("deliveryReturnsReport.deliveryRate")]: p.deliveryRate,
        [t("deliveryReturnsReport.returnRate")]: p.returnRate,
        [t("deliveryReturnsReport.revenue")]: p.totalRevenue,
      })),
      "delivery-returns",
    );
  };

  if (query.isLoading) return <ProductsSkeleton />;

  if (query.isError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl text-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-12 w-12 text-red-500 mx-auto mb-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        <p className="text-red-600 dark:text-red-400">
          {t("deliveryReturnsReport.fetchError")}
        </p>
        <button
          onClick={() => query.refetch()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          {t("deliveryReturnsReport.retry")}
        </button>
      </div>
    );
  }

  function SortHeader({
    column,
    label,
  }: {
    column: SortKey;
    label: string;
  }) {
    return (
      <th
        className="py-3 px-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400 cursor-pointer select-none whitespace-nowrap hover:text-gray-700 dark:hover:text-gray-200"
        onClick={() => {
          if (sortKey === column) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
          } else {
            setSortKey(column);
            setSortDir("desc");
          }
        }}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {sortKey === column ? (
            sortDir === "asc" ? (
              <ChevronUpIcon className="h-3.5 w-3.5" />
            ) : (
              <ChevronDownIcon className="h-3.5 w-3.5" />
            )
          ) : (
            <ChevronUpIcon className="h-3.5 w-3.5 opacity-0 group-hover:opacity-40" />
          )}
        </span>
      </th>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("deliveryReturnsReport.title")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t("deliveryReturnsReport.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PeriodSelector
            initialPeriod={(searchParams.get("period") as PeriodKey) || "30"}
            initialStartDate={searchParams.get("startDate") || ""}
            initialEndDate={searchParams.get("endDate") || ""}
            onRangeChange={setRange}
          />
          <button
            onClick={handleExport}
            disabled={filteredProducts.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {t("deliveryReturnsReport.csvExport")}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          name="deliveryReturnsSearch"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("deliveryReturnsReport.searchPlaceholder") as string}
          aria-label={t("deliveryReturnsReport.searchPlaceholder") as string}
          className="w-full pr-10 pl-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-shadow"
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={<CheckCircleIcon className="h-5 w-5 text-white" />}
          iconBg="bg-gradient-to-br from-emerald-500 to-emerald-600"
          label={t("deliveryReturnsReport.deliveryRate")}
          value={`${summary?.deliveryRate ?? 0}%`}
          hint={`${summary?.deliveredItems ?? 0} ${t("deliveryReturnsReport.items")}`}
          accent="border-t-emerald-500"
        />
        <KpiCard
          icon={<ArrowUturnLeftIcon className="h-5 w-5 text-white" />}
          iconBg="bg-gradient-to-br from-amber-500 to-orange-600"
          label={t("deliveryReturnsReport.returnRate")}
          value={`${summary?.returnRate ?? 0}%`}
          hint={`${summary?.returnedItems ?? 0} ${t("deliveryReturnsReport.items")}`}
          accent="border-t-amber-500"
        />
        <KpiCard
          icon={<TruckIcon className="h-5 w-5 text-white" />}
          iconBg="bg-gradient-to-br from-blue-500 to-indigo-600"
          label={t("deliveryReturnsReport.totalOrders")}
          value={summary?.totalOrders?.toLocaleString() ?? "0"}
          hint={`${summary?.totalProducts ?? 0} ${t("deliveryReturnsReport.totalProducts")}`}
          accent="border-t-blue-500"
        />
        <KpiCard
          icon={<ArchiveBoxIcon className="h-5 w-5 text-white" />}
          iconBg="bg-gradient-to-br from-teal-500 to-emerald-600"
          label={t("deliveryReturnsReport.deliveredItems")}
          value={summary?.deliveredItems?.toLocaleString() ?? "0"}
          hint={`${t("deliveryReturnsReport.totalItems")}: ${summary?.totalItems?.toLocaleString() ?? "0"}`}
          accent="border-t-teal-500"
        />
        <KpiCard
          icon={<BanknotesIcon className="h-5 w-5 text-white" />}
          iconBg="bg-gradient-to-br from-rose-500 to-pink-600"
          label={t("deliveryReturnsReport.deliveredRevenue")}
          value={formatPrice(summary?.deliveredRevenue ?? 0)}
          hint={`${t("deliveryReturnsReport.totalRevenue")}: ${formatPrice(summary?.totalRevenue ?? 0)}`}
          accent="border-t-rose-500"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            {t("deliveryReturnsReport.composition")}
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
            {t("deliveryReturnsReport.compositionHint")}
          </p>
          {compositionData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[260px] text-center">
              <ClockIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {t("deliveryReturnsReport.noData")}
              </p>
            </div>
          ) : (
            <div className="min-w-0 h-[260px]">
              <DeferredResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={compositionData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {compositionData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [
                      typeof value === "number" ? value.toLocaleString() : String(value ?? ""),
                      "",
                    ]}
                    contentStyle={{ borderRadius: "10px", direction: "rtl" }}
                  />
                </PieChart>
              </DeferredResponsiveContainer>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {compositionData.map((entry) => (
                  <div key={entry.key} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-gray-600 dark:text-gray-300 truncate">
                      {entry.name}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500 mr-auto">
                      {entry.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top products summary */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            {t("deliveryReturnsReport.byProduct")}
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-5">
            {t("deliveryReturnsReport.subtitle")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 p-4">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-1.5">
                <CheckCircleIcon className="h-4 w-4" />
                {t("deliveryReturnsReport.deliveredItems")}
              </p>
              {topDeliveredProduct ? (
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate" title={topDeliveredProduct.name}>
                  {topDeliveredProduct.name}
                </p>
              ) : (
                <p className="text-sm text-gray-400">ΓÇö</p>
              )}
              {topDeliveredProduct && (
                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                  {topDeliveredProduct.count.toLocaleString()} {t("deliveryReturnsReport.items")}
                </p>
              )}
            </div>
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 p-4">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1.5">
                <ArrowUturnLeftIcon className="h-4 w-4" />
                {t("deliveryReturnsReport.returnedItems")}
              </p>
              {topReturnedProduct ? (
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate" title={topReturnedProduct.name}>
                  {topReturnedProduct.name}
                </p>
              ) : (
                <p className="text-sm text-gray-400">ΓÇö</p>
              )}
              {topReturnedProduct && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  {topReturnedProduct.count.toLocaleString()} {t("deliveryReturnsReport.items")}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
            <FunnelIcon className="h-4 w-4 text-gray-400" />
            <span>{t("deliveryReturnsReport.total")}:</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <b className="text-gray-800 dark:text-gray-100">{summary?.deliveredItems ?? 0}</b>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <b className="text-gray-800 dark:text-gray-100">{summary?.returnedItems ?? 0}</b>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              <b className="text-gray-800 dark:text-gray-100">{totalOther}</b>
            </span>
            <span className="mr-1 text-gray-400">
              {t("deliveryReturnsReport.of")} {summary?.totalItems ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {t("deliveryReturnsReport.byProduct")}
          </h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {filteredProducts.length} {t("deliveryReturnsReport.product")}
          </span>
        </div>
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <ArchiveBoxIcon className="h-14 w-14 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {search ? t("deliveryReturnsReport.searchNoResults") : t("deliveryReturnsReport.noData")}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              {t("deliveryReturnsReport.noDataDesc")}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-4 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                {t("deliveryReturnsReport.clearSearch")}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 group">
                  <SortHeader column="productName" label={t("deliveryReturnsReport.product")} />
                  <th className="py-3 px-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {t("deliveryReturnsReport.composition")}
                  </th>
                  <SortHeader column="totalItems" label={t("deliveryReturnsReport.items")} />
                  <SortHeader column="deliveredItems" label={t("deliveryReturnsReport.deliveredItems")} />
                  <SortHeader column="returnedItems" label={t("deliveryReturnsReport.returnedItems")} />
                  <SortHeader column="deliveryRate" label={t("deliveryReturnsReport.deliveryRate")} />
                  <SortHeader column="returnRate" label={t("deliveryReturnsReport.returnRate")} />
                  <SortHeader column="totalRevenue" label={t("deliveryReturnsReport.revenue")} />
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => (
                  <tr
                    key={p.productId || p.productName}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3 max-w-[240px]">
                        {p.productImage && (
                          <img
                            src={p.productImage}
                            alt={p.productName}
                            className="h-9 w-9 rounded-lg object-cover shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {p.productName}
                          </p>
                          {p.productSku && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                              {p.productSku}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 min-w-[140px]">
                      <div className="flex flex-col gap-1.5">
                        <CompositionBar
                          delivered={p.deliveredItems}
                          returned={p.returnedItems}
                          other={p.totalItems - p.deliveredItems - p.returnedItems}
                          total={p.totalItems}
                        />
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">
                          {p.totalQuantity} {t("deliveryReturnsReport.quantity")}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm font-semibold text-gray-900 dark:text-white">
                      {p.totalItems.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-sm text-emerald-600 dark:text-emerald-400">
                      {p.deliveredItems.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-sm text-amber-600 dark:text-amber-400">
                      {p.returnedItems.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-sm">
                      <span className={`font-medium ${rateColor(p.deliveryRate, "high")}`}>
                        {p.deliveryRate}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-sm">
                      <span className={`font-medium ${rateColor(p.returnRate, "low")}`}>
                        {p.returnRate}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">
                      {formatPrice(p.totalRevenue)}
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

function rateColor(rate: number, kind: "high" | "low") {
  if (kind === "high") {
    return rate >= 70
      ? "text-emerald-600 dark:text-emerald-400"
      : rate >= 40
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";
  }
  return rate > 25
    ? "text-red-600 dark:text-red-400"
    : rate > 10
      ? "text-amber-600 dark:text-amber-400"
      : "text-emerald-600 dark:text-emerald-400";
}

export default DeliveryReturnsAnalytics;
