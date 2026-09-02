import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ChartBarIcon,
  ArrowPathIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  CreditCardIcon,
  CubeIcon,
  Squares2X2Icon,
  CalendarDaysIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { companyAwareApi } from "../../services/companyAwareApi";
import analyticsService from "../../services/analyticsService";
import { useCurrency } from "../../hooks/useCurrency";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import { getStatusDisplay } from "../../utils/statusRegistry";

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  totalPieces: number;
  avgPiecesPerOrder: number;
  avgOrdersPerDay: number;
  daysInPeriod: number;
  orderPieceShare: { orderNumber: string; pieces: number; sharePct: number }[];
  statusDistribution: Record<string, number>;
  statusPiecesDistribution: Record<string, number>;
  governorateStats: Record<string, number>;
  paymentStats: Record<string, number>;
}

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
}

type PeriodKey =
  | "today"
  | "yesterday"
  | "thisMonth"
  | "lastMonth"
  | "7"
  | "30"
  | "90"
  | "180"
  | "365"
  | "custom";

const PERIOD_OPTIONS: { key: PeriodKey; labelKey: string }[] = [
  { key: "today", labelKey: "orders.today" },
  { key: "yesterday", labelKey: "orders.yesterday" },
  { key: "thisMonth", labelKey: "orders.thisMonth" },
  { key: "lastMonth", labelKey: "orders.lastMonth" },
  { key: "7", labelKey: "orders.last7Days" },
  { key: "30", labelKey: "orders.last30Days" },
  { key: "90", labelKey: "orders.last90Days" },
  { key: "180", labelKey: "orders.last6Months" },
  { key: "365", labelKey: "orders.lastYear" },
  { key: "custom", labelKey: "orders.customPeriod" },
];

const toISODate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const getInitialDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return { start: toISODate(start), end: toISODate(end) };
};

const getPaymentMethodLabel = (method: string, t: (k: string) => string): string => {
  if (!method) return t("orders.paymentMethodUnknown") || "غير محدد";
  const normalized = method.trim().toUpperCase();
  switch (normalized) {
    case "CASH":
    case "COD":
      return "الدفع عند الاستلام (COD)";
    case "CREDIT_CARD":
    case "CARD":
    case "ONLINE":
      return "بطاقة بنكية / فيزا";
    case "FAWRY":
      return "فوري (Fawry)";
    case "WALLET":
    case "VODAFONE_CASH":
    case "INSTAPAY":
      return "محفظة إلكترونية / إنستاباي";
    case "BANK_TRANSFER":
      return "تحويل بنكي";
    case "PREPAID":
      return "دفع مسبق";
    default:
      return method;
  }
};

const OrdersAnalytics: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [products, setProducts] = useState<SalesProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("30");
  const [dateRange, setDateRange] = useState(getInitialDateRange);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isRtl = i18n.dir ? i18n.dir() === "rtl" : true;

  const loadData = useCallback(async (start: string, end: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const [statsRes, productsRes] = await Promise.allSettled([
        companyAwareApi.get(
          `/reports/orders-detailed?startDate=${start}&endDate=${end}`,
          { signal: controller.signal }
        ),
        analyticsService.getProductSalesPerformance(undefined, start, end),
      ]);

      if (controller.signal.aborted) return;

      let hasSuccess = false;

      if (statsRes.status === "fulfilled" && statsRes.value?.data?.success) {
        setStats(statsRes.value.data.data);
        hasSuccess = true;
      } else if (statsRes.status === "rejected" && statsRes.reason?.name !== "CanceledError") {
        console.error("Error fetching order stats:", statsRes.reason);
      }

      if (productsRes.status === "fulfilled" && productsRes.value?.success) {
        setProducts(productsRes.value.data?.products ?? []);
        hasSuccess = true;
      } else if (productsRes.status === "rejected") {
        console.error("Error fetching product stats:", productsRes.reason);
      }

      if (!hasSuccess && statsRes.status === "rejected" && productsRes.status === "rejected") {
        setError(t("common.errorLoadingData") || "تعذر تحميل البيانات، يرجى المحاولة مرة أخرى");
      }
    } catch (err: any) {
      if (err?.name !== "CanceledError") {
        console.error("Unexpected error loading analytics:", err);
        setError(t("common.errorLoadingData") || "حدث خطأ غير متوقع أثناء تحميل البيانات");
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    loadData(dateRange.start, dateRange.end);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [dateRange, loadData]);

  const applyPeriod = (key: PeriodKey) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (key === "custom") {
      setPeriod("custom");
      return;
    }

    let start: Date;
    let end: Date = new Date();

    switch (key) {
      case "today":
        start = today;
        break;
      case "yesterday": {
        start = new Date(today);
        start.setDate(start.getDate() - 1);
        end = new Date(start);
        break;
      }
      case "thisMonth":
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date();
        break;
      case "lastMonth":
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case "7":
        start = new Date(today);
        start.setDate(start.getDate() - 6);
        break;
      case "30":
        start = new Date(today);
        start.setDate(start.getDate() - 29);
        break;
      case "90":
        start = new Date(today);
        start.setDate(start.getDate() - 89);
        break;
      case "180":
        start = new Date(today);
        start.setMonth(start.getMonth() - 6);
        break;
      case "365":
        start = new Date(today);
        start.setDate(start.getDate() - 364);
        break;
      default:
        return;
    }

    setPeriod(key);
    setDateRange({ start: toISODate(start), end: toISODate(end) });
  };

  const handleCustomDateChange = (type: "start" | "end", value: string) => {
    setPeriod("custom");
    setDateRange((prev) => {
      const next = { ...prev, [type]: value };
      if (next.start && next.end && next.start > next.end) {
        if (type === "start") next.end = value;
        else next.start = value;
      }
      return next;
    });
  };

  const metricCards = [
    {
      title: t("orders.totalOrders"),
      value: stats?.totalOrders?.toLocaleString() || "0",
      icon: ShoppingCartIcon,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30",
    },
    {
      title: t("orders.totalRevenue"),
      value: formatPrice(stats?.totalRevenue || 0),
      icon: CurrencyDollarIcon,
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30",
    },
    {
      title: t("orders.averageOrderValue"),
      value: formatPrice(stats?.avgOrderValue || 0),
      icon: ChartBarIcon,
      color: "text-purple-600 bg-purple-50 dark:bg-purple-900/30",
    },
    {
      title: t("orders.totalPieces"),
      value: stats?.totalPieces?.toLocaleString() || "0",
      icon: Squares2X2Icon,
      color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30",
    },
    {
      title: t("orders.averagePiecesPerOrder"),
      value: stats?.avgPiecesPerOrder || 0,
      icon: CubeIcon,
      color: "text-amber-600 bg-amber-50 dark:bg-amber-900/30",
    },
    {
      title: t("orders.averageOrdersPerDay"),
      value: stats?.avgOrdersPerDay || 0,
      icon: CalendarDaysIcon,
      color: "text-teal-600 bg-teal-50 dark:bg-teal-900/30",
    },
    {
      title: t("orders.averagePieceValue"),
      value:
        stats && stats.totalPieces > 0
          ? formatPrice(stats.totalRevenue / stats.totalPieces)
          : formatPrice(0),
      icon: CurrencyDollarIcon,
      color: "text-rose-600 bg-rose-50 dark:bg-rose-900/30",
    },
  ];

  return (
    <div className="p-3 sm:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingCartIcon className="h-7 w-7 text-blue-600 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {t("orders.analyticsTitle")}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("orders.analyticsSubtitle")}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Quick link to advanced visual analytics */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/analytics/orders")}
            className="flex items-center justify-center gap-2 border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
          >
            <ChartBarIcon className="h-4 w-4" />
            <span className="text-xs sm:text-sm">الرسوم البيانية والمقارنات المتقدمة</span>
            <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(dateRange.start, dateRange.end)}
            disabled={loading}
            className="shrink-0 flex items-center justify-center gap-2"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span className="text-xs sm:text-sm">{t("common.refresh") || "تحديث"}</span>
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 flex items-center justify-between gap-3 text-red-800 dark:text-red-200">
          <div className="flex items-center gap-2 min-w-0">
            <ExclamationTriangleIcon className="h-5 w-5 shrink-0 text-red-500" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(dateRange.start, dateRange.end)}
            className="border-red-300 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/50 shrink-0"
          >
            {t("common.retry") || "إعادة المحاولة"}
          </Button>
        </div>
      )}

      {/* Period Selection Filters */}
      <div className="bg-white dark:bg-gray-800/80 p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-800 mb-6 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto no-scrollbar flex items-center gap-1.5 pb-1">
            {PERIOD_OPTIONS.map(({ key, labelKey }) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPeriod(key)}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all shrink-0 ${
                  period === key
                    ? "bg-blue-600 text-white shadow-sm font-semibold"
                    : "bg-gray-50 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => handleCustomDateChange("start", e.target.value)}
                  className="p-1.5 text-sm border rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white flex-1 sm:flex-initial"
                />
                <span className="text-xs text-gray-500 font-medium">{t("orders.to")}</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => handleCustomDateChange("end", e.target.value)}
                  className="p-1.5 text-sm border rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white flex-1 sm:flex-initial"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 sm:gap-4 mb-6">
        {metricCards.map((card, i) => (
          <Card key={i} size="sm" className="min-w-0 border-gray-200 dark:border-gray-800 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2.5">
                <div className={`shrink-0 p-2 rounded-lg ${card.color}`}>
                  <card.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                    {card.title}
                  </p>
                  {loading ? (
                    <Skeleton className="h-5 w-16 mt-1" />
                  ) : (
                    <p className="text-sm sm:text-base font-bold tabular-nums leading-tight dark:text-white truncate mt-0.5">
                      {card.value}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Distributions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Status Distribution */}
        <Card size="sm" className="border-gray-200 dark:border-gray-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-indigo-500" />
              {t("orders.analyticsStatusDistribution")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="space-y-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : stats && Object.keys(stats.statusDistribution || {}).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.statusDistribution).map(([status, count]) => {
                  const safeTotal = stats.totalOrders > 0 ? stats.totalOrders : 1;
                  const pct = Math.min(100, Math.round((count / safeTotal) * 100));
                  return (
                    <div key={status} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                          {t(getStatusDisplay(status).labelKey) || status}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
                          {t("orders.analyticsStatusCount", {
                            orders: count,
                            pieces: stats.statusPiecesDistribution[status] || 0,
                          })}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 transition-all duration-300 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-xs text-gray-500 py-6">
                {t("orders.analyticsNoData")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Governorate Distribution */}
        <Card size="sm" className="border-gray-200 dark:border-gray-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPinIcon className="h-5 w-5 text-red-500" />
              {t("orders.analyticsGovernorateDistribution")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : stats && Object.keys(stats.governorateStats || {}).length > 0 ? (
              <div className="space-y-2.5">
                {Object.entries(stats.governorateStats)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([gov, count]) => (
                    <div
                      key={gov}
                      className="flex items-center justify-between p-2 rounded-lg bg-gray-50/70 dark:bg-gray-800/50 text-xs"
                    >
                      <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                        {gov || "غير محدد"}
                      </span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                        {t("orders.analyticsOrderCount", { count })}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-center text-xs text-gray-500 py-6">
                {t("orders.analyticsNoData")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card size="sm" className="border-gray-200 dark:border-gray-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5 text-emerald-500" />
              {t("orders.analyticsPaymentMethods")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex justify-between items-center">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                ))}
              </div>
            ) : stats && Object.keys(stats.paymentStats || {}).length > 0 ? (
              <div className="space-y-2.5">
                {Object.entries(stats.paymentStats).map(([method, count]) => (
                  <div
                    key={method}
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50/70 dark:bg-gray-800/50 text-xs"
                  >
                    <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                      {getPaymentMethodLabel(method, t)}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white tabular-nums">
                      {t("orders.analyticsOrderCount", { count })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-xs text-gray-500 py-6">
                {t("orders.analyticsNoData")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products Table */}
      <Card size="sm" className="border-gray-200 dark:border-gray-800 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CubeIcon className="h-5 w-5 text-purple-500" />
            {t("orders.analyticsTopProducts")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-8">
              {t("orders.analyticsNoData")}
            </p>
          ) : (
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <table className="w-full min-w-[620px] text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                    <th className="py-2.5 px-3 text-start font-semibold">
                      {t("orders.analyticsProduct")}
                    </th>
                    <th className="py-2.5 px-3 text-start font-semibold">
                      {t("orders.analyticsQuantitySold")}
                    </th>
                    <th className="py-2.5 px-3 text-start font-semibold">
                      {t("orders.analyticsProductOrderCount")}
                    </th>
                    <th className="py-2.5 px-3 text-start font-semibold">
                      {t("orders.analyticsAveragePrice")}
                    </th>
                    <th className="py-2.5 px-3 text-start font-semibold">
                      {t("orders.analyticsRevenue")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {products.slice(0, 15).map((p) => (
                    <tr
                      key={p.productId}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {p.productImage ? (
                            <img
                              src={p.productImage}
                              alt={p.productName}
                              className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-cover shrink-0 border border-gray-100 dark:border-gray-800"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                              <CubeIcon className="h-4 w-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 dark:text-white truncate">
                              {p.productName}
                            </p>
                            {p.productSku && (
                              <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                                SKU: {p.productSku}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-white tabular-nums">
                        {p.quantitySold.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300 tabular-nums">
                        {p.orderCount.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300 tabular-nums">
                        {formatPrice(p.averagePrice)}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-bold tabular-nums whitespace-nowrap">
                        {formatPrice(p.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrdersAnalytics;
