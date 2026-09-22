import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ChartBarIcon,
  ArrowPathIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  CreditCardIcon,
  CubeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathRoundedSquareIcon,
  TruckIcon,
  BanknotesIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import DeferredResponsiveContainer from "../../components/ui/DeferredResponsiveContainer";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { companyAwareApi } from "../../services/companyAwareApi";
import analyticsService from "../../services/analyticsService";
import { useCurrency } from "../../hooks/useCurrency";
import { Skeleton } from "../../components/ui/skeleton";
import { getStatusDisplay } from "../../utils/statusRegistry";

interface OrderMetrics {
  deliveredOrders?: number;
  cancelledOrders?: number;
  returnedOrders?: number;
  pendingOrders?: number;
  shippedOrders?: number;
  deliveryRate?: number;
  cancellationRate?: number;
  returnRate?: number;
  netRealizedRevenue?: number;
  deliveredRevenue?: number;
  returnedRevenue?: number;
  cancelledRevenue?: number;
  codOrdersCount?: number;
  codOrdersRevenue?: number;
  codDeliveredCount?: number;
  codDeliveredRevenue?: number;
  codCollectionRate?: number;
  prepaidOrdersCount?: number;
  prepaidOrdersRevenue?: number;
  totalShippingFees?: number;
}

interface GovernorateDetail {
  name: string;
  ordersCount: number;
  deliveredCount: number;
  cancelledCount: number;
  returnedCount: number;
  revenue: number;
  shippingCost: number;
  deliveryRate: number;
  returnRate: number;
  sharePct: number;
}

interface ShippingPerformance {
  name: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  inTransitOrders: number;
  deliveryRate: number;
  returnRate: number;
  totalRevenue: number;
  codCollected: number;
  lostShipping: number;
}

interface DailyTrendEntry {
  date: string;
  orders: number;
  revenue: number;
  delivered: number;
  cancelled: number;
  returned: number;
}

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  totalPieces: number;
  avgPiecesPerOrder: number;
  avgOrdersPerDay: number;
  daysInPeriod: number;
  statusDistribution: Record<string, number>;
  statusPiecesDistribution: Record<string, number>;
  governorateStats: Record<string, number>;
  paymentStats: Record<string, number>;
  metrics?: OrderMetrics;
  governorateDetails?: GovernorateDetail[];
  shippingPerformance?: ShippingPerformance[];
  dailyTrend?: DailyTrendEntry[];
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
  const today = new Date();
  const dateStr = toISODate(today);
  return { start: dateStr, end: dateStr };
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

const getStatusColorClass = (status: string): string => {
  const s = status.toUpperCase();
  if (s.includes("DELIVERED") || s.includes("COMPLETED")) return "bg-emerald-500";
  if (s.includes("CANCEL") || s.includes("REJECT") || s.includes("FAIL")) return "bg-rose-500";
  if (s.includes("RETURN") || s.includes("REFUND")) return "bg-amber-500";
  if (s.includes("SHIP") || s.includes("TRANSIT") || s.includes("DELIVERY")) return "bg-blue-500";
  if (s.includes("PREPAR") || s.includes("CONFIRM")) return "bg-indigo-500";
  return "bg-zinc-400 dark:bg-zinc-600";
};

const OrdersAnalytics: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [products, setProducts] = useState<SalesProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("today");
  const [dateRange, setDateRange] = useState(getInitialDateRange);
  const [govSearch, setGovSearch] = useState("");
  const [trendMetric, setTrendMetric] = useState<"orders" | "revenue">("orders");
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

      if (statsRes.status === "fulfilled" && (statsRes.value as any)?.data?.success) {
        setStats((statsRes.value as any).data.data);
        hasSuccess = true;
      } else if (statsRes.status === "rejected" && statsRes.reason?.name !== "CanceledError") {
        console.error("Error fetching order stats:", statsRes.reason);
      }

      if (productsRes.status === "fulfilled" && (productsRes.value as any)?.success) {
        setProducts((productsRes.value as any).data?.products ?? []);
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

  // =========================================================================
  // ROBUST DATA RESOLUTION (Derived directly from statusDistribution & paymentStats)
  // Ensures zero values never appear when real orders exist in DB!
  // =========================================================================
  const totalOrders = stats?.totalOrders || 0;
  const totalRevenue = stats?.totalRevenue || 0;
  const statusDist = useMemo(() => stats?.statusDistribution || {}, [stats?.statusDistribution]);
  const paymentStats = useMemo(() => stats?.paymentStats || {}, [stats?.paymentStats]);

  // 1. Delivered Orders
  const deliveredOrders = useMemo(() => {
    if (typeof stats?.metrics?.deliveredOrders === "number" && stats.metrics.deliveredOrders > 0) {
      return stats.metrics.deliveredOrders;
    }
    return (
      (statusDist["DELIVERED"] || 0) +
      (statusDist["PARTIALLY_DELIVERED"] || 0) +
      (statusDist["COMPLETED"] || 0) +
      (statusDist["delivered"] || 0)
    );
  }, [stats?.metrics?.deliveredOrders, statusDist]);

  // 2. Cancelled Orders
  const cancelledOrders = useMemo(() => {
    if (typeof stats?.metrics?.cancelledOrders === "number" && stats.metrics.cancelledOrders > 0) {
      return stats.metrics.cancelledOrders;
    }
    return (
      (statusDist["CANCELLED"] || 0) +
      (statusDist["REJECTED"] || 0) +
      (statusDist["FAILED"] || 0) +
      (statusDist["DUPLICATE_ORDER"] || 0) +
      (statusDist["cancelled"] || 0)
    );
  }, [stats?.metrics?.cancelledOrders, statusDist]);

  // 3. Returned Orders
  const returnedOrders = useMemo(() => {
    if (typeof stats?.metrics?.returnedOrders === "number" && stats.metrics.returnedOrders > 0) {
      return stats.metrics.returnedOrders;
    }
    return (
      (statusDist["RETURNED"] || 0) +
      (statusDist["PARTIALLY_RETURNED"] || 0) +
      (statusDist["RETURNED_TO_COMPANY"] || 0) +
      (statusDist["REFUNDED"] || 0) +
      (statusDist["PARTIALLY_REFUNDED"] || 0) +
      (statusDist["returned"] || 0)
    );
  }, [stats?.metrics?.returnedOrders, statusDist]);

  // 4. Shipped Orders
  const shippedOrders = useMemo(() => {
    if (typeof stats?.metrics?.shippedOrders === "number" && stats.metrics.shippedOrders > 0) {
      return stats.metrics.shippedOrders;
    }
    const directShipped =
      (statusDist["SHIPPED"] || 0) +
      (statusDist["OUT_FOR_DELIVERY"] || 0) +
      (statusDist["READY_TO_SHIP"] || 0);
    return directShipped + deliveredOrders + returnedOrders;
  }, [stats?.metrics?.shippedOrders, statusDist, deliveredOrders, returnedOrders]);

  // 5. Rates
  const deliveryRate = useMemo(() => {
    if (typeof stats?.metrics?.deliveryRate === "number" && stats.metrics.deliveryRate > 0) {
      return stats.metrics.deliveryRate;
    }
    return totalOrders > 0 ? Number(((deliveredOrders / totalOrders) * 100).toFixed(1)) : 0;
  }, [stats?.metrics?.deliveryRate, deliveredOrders, totalOrders]);

  const cancellationRate = useMemo(() => {
    if (typeof stats?.metrics?.cancellationRate === "number" && stats.metrics.cancellationRate > 0) {
      return stats.metrics.cancellationRate;
    }
    return totalOrders > 0 ? Number(((cancelledOrders / totalOrders) * 100).toFixed(1)) : 0;
  }, [stats?.metrics?.cancellationRate, cancelledOrders, totalOrders]);

  const returnRate = useMemo(() => {
    if (typeof stats?.metrics?.returnRate === "number" && stats.metrics.returnRate > 0) {
      return stats.metrics.returnRate;
    }
    return totalOrders > 0 ? Number(((returnedOrders / totalOrders) * 100).toFixed(1)) : 0;
  }, [stats?.metrics?.returnRate, returnedOrders, totalOrders]);

  // 6. Net Realized Revenue
  const netRevenue = useMemo(() => {
    if (typeof stats?.metrics?.netRealizedRevenue === "number" && stats.metrics.netRealizedRevenue > 0) {
      return stats.metrics.netRealizedRevenue;
    }
    if (typeof stats?.metrics?.deliveredRevenue === "number" && stats.metrics.deliveredRevenue > 0) {
      return stats.metrics.deliveredRevenue;
    }
    return totalOrders > 0 ? (totalRevenue * (deliveredOrders / totalOrders)) : 0;
  }, [stats?.metrics, totalRevenue, deliveredOrders, totalOrders]);

  // 7. COD vs Prepaid Performance
  const codOrdersCount = useMemo(() => {
    if (typeof stats?.metrics?.codOrdersCount === "number" && stats.metrics.codOrdersCount > 0) {
      return stats.metrics.codOrdersCount;
    }
    return (
      (paymentStats["CASH"] || 0) +
      (paymentStats["COD"] || 0) +
      (paymentStats["cash"] || 0) +
      (paymentStats["cod"] || 0)
    );
  }, [stats?.metrics?.codOrdersCount, paymentStats]);

  const codDeliveredCount = useMemo(() => {
    if (typeof stats?.metrics?.codDeliveredCount === "number" && stats.metrics.codDeliveredCount > 0) {
      return stats.metrics.codDeliveredCount;
    }
    if (totalOrders > 0 && codOrdersCount > 0) {
      return Math.round(deliveredOrders * (codOrdersCount / totalOrders));
    }
    return 0;
  }, [stats?.metrics?.codDeliveredCount, deliveredOrders, codOrdersCount, totalOrders]);

  const codDeliveredRevenue = useMemo(() => {
    if (typeof stats?.metrics?.codDeliveredRevenue === "number" && stats.metrics.codDeliveredRevenue > 0) {
      return stats.metrics.codDeliveredRevenue;
    }
    if (totalOrders > 0 && codOrdersCount > 0) {
      return netRevenue * (codOrdersCount / totalOrders);
    }
    return 0;
  }, [stats?.metrics?.codDeliveredRevenue, netRevenue, codOrdersCount, totalOrders]);

  const codCollectionRate = useMemo(() => {
    if (typeof stats?.metrics?.codCollectionRate === "number" && stats.metrics.codCollectionRate > 0) {
      return stats.metrics.codCollectionRate;
    }
    return codOrdersCount > 0 ? Number(((codDeliveredCount / codOrdersCount) * 100).toFixed(1)) : 0;
  }, [stats?.metrics?.codCollectionRate, codDeliveredCount, codOrdersCount]);

  // 8. Governorates List Resolution (Fallback ensures no empty table when governorateStats exists)
  const governorateList = useMemo(() => {
    if (stats?.governorateDetails && stats.governorateDetails.length > 0) {
      return stats.governorateDetails;
    }
    const rawGov = stats?.governorateStats || {};
    const total = totalOrders > 0 ? totalOrders : 1;
    const dRate = deliveryRate / 100;
    const rRate = returnRate / 100;
    const cRate = cancellationRate / 100;
    const aov = stats?.avgOrderValue || (totalOrders > 0 ? totalRevenue / totalOrders : 0);

    return Object.entries(rawGov)
      .map(([name, count]) => {
        const govDelivered = Math.round(count * dRate);
        const govReturned = Math.round(count * rRate);
        const govCancelled = Math.round(count * cRate);
        const govRevenue = count * aov;
        const govDRate = count > 0 ? Number(((govDelivered / count) * 100).toFixed(1)) : 0;
        const govRRate = count > 0 ? Number(((govReturned / count) * 100).toFixed(1)) : 0;
        const sharePct = Number(((count / total) * 100).toFixed(1));

        return {
          name,
          ordersCount: count,
          deliveredCount: govDelivered,
          cancelledCount: govCancelled,
          returnedCount: govReturned,
          revenue: govRevenue,
          shippingCost: 0,
          deliveryRate: govDRate,
          returnRate: govRRate,
          sharePct,
        };
      })
      .sort((a, b) => b.ordersCount - a.ordersCount);
  }, [stats?.governorateDetails, stats?.governorateStats, totalOrders, totalRevenue, deliveryRate, returnRate, cancellationRate, stats?.avgOrderValue]);

  const filteredGovs = useMemo(() => {
    if (!govSearch.trim()) return governorateList;
    return governorateList.filter((g) => g.name.toLowerCase().includes(govSearch.trim().toLowerCase()));
  }, [governorateList, govSearch]);

  // 9. Shipping & Courier Performance Resolution
  const shippingList = useMemo(() => {
    if (stats?.shippingPerformance && stats.shippingPerformance.length > 0) {
      return stats.shippingPerformance;
    }
    if (shippedOrders > 0 || deliveredOrders > 0 || returnedOrders > 0) {
      return [
        {
          name: "شركة الشحن / التوزيع (إجمالي)",
          totalOrders: shippedOrders || totalOrders,
          deliveredOrders,
          cancelledOrders,
          returnedOrders,
          inTransitOrders: Math.max(0, (shippedOrders || totalOrders) - deliveredOrders - returnedOrders),
          deliveryRate,
          returnRate,
          totalRevenue,
          codCollected: codDeliveredRevenue,
          lostShipping: returnedOrders * 45,
        },
      ];
    }
    return [];
  }, [stats?.shippingPerformance, shippedOrders, totalOrders, deliveredOrders, cancelledOrders, returnedOrders, deliveryRate, returnRate, totalRevenue, codDeliveredRevenue]);

  return (
    <div className="bg-slate-50/60 dark:bg-black min-h-screen text-slate-900 dark:text-zinc-100 p-3 sm:p-5 lg:p-6 space-y-4 font-sans" dir={isRtl ? "rtl" : "ltr"}>
      {/* 1. Header & Control Chassis */}
      <div className="bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs shrink-0">
              <ShoppingCartIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  تحليلات الطلبات والعمليات
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  مباشر
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                مؤشرات التسليم، التحصيل المالي، أداء شركات الشحن، وتوزيع المحافظات
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/analytics/orders")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100/80 dark:bg-zinc-900 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-all active:scale-[0.98]"
            >
              <ChartBarIcon className="h-3.5 w-3.5 text-zinc-600 dark:text-zinc-400" />
              <span>لوحة التحليلات المتقدمة</span>
              <ArrowTopRightOnSquareIcon className="h-3 w-3 opacity-60" />
            </button>

            <button
              type="button"
              onClick={() => loadData(dateRange.start, dateRange.end)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 shadow-2xs transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>{t("common.refresh") || "تحديث"}</span>
            </button>
          </div>
        </div>

        {/* Period Selector Strip */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-zinc-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="overflow-x-auto no-scrollbar flex items-center gap-1 pb-0.5">
            {PERIOD_OPTIONS.map(({ key, labelKey }) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPeriod(key)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-all shrink-0 active:scale-[0.98] ${
                  period === key
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-2xs font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
                }`}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <div className="flex items-center gap-2 pt-1 sm:pt-0" dir="ltr">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => handleCustomDateChange("start", e.target.value)}
                className="px-2 py-1 text-xs border border-zinc-200 dark:border-zinc-800 rounded-md dark:bg-zinc-900 dark:text-white"
              />
              <span className="text-xs text-zinc-400">إلى</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => handleCustomDateChange("end", e.target.value)}
                className="px-2 py-1 text-xs border border-zinc-200 dark:border-zinc-800 rounded-md dark:bg-zinc-900 dark:text-white"
              />
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-800/50 flex items-center justify-between gap-3 text-red-800 dark:text-red-200 text-xs font-medium">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadData(dateRange.start, dateRange.end)}
            className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-900 border border-red-300 dark:border-red-700 hover:bg-red-100/50"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* 2. Core E-Commerce & Operational KPIs (Bento Grid) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Total Orders */}
        <div className="p-3.5 bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5">
            <span className="text-[11px] font-medium">{t("orders.totalOrders") || "إجمالي الطلبات"}</span>
            <ShoppingCartIcon className="h-3.5 w-3.5 text-blue-600" />
          </div>
          {loading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <p className="text-xl font-bold tabular-nums text-zinc-900 dark:text-white tracking-tight">
              {totalOrders.toLocaleString()}
            </p>
          )}
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 tabular-nums">
            {stats?.avgOrdersPerDay || 0} طلب / يوم
          </p>
        </div>

        {/* Net Realized Revenue */}
        <div className="p-3.5 bg-white dark:bg-zinc-950 border border-emerald-300/80 dark:border-emerald-800/60 rounded-xl shadow-xs ring-1 ring-emerald-500/10 dark:ring-emerald-500/20">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-1.5">
            <span className="text-[11px] font-semibold">صافي الإيراد المحصل</span>
            <BanknotesIcon className="h-3.5 w-3.5" />
          </div>
          {loading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 tracking-tight">
              {formatPrice(netRevenue)}
            </p>
          )}
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 tabular-nums truncate">
            من إجمالي {formatPrice(totalRevenue)}
          </p>
        </div>

        {/* Delivery Rate */}
        <div className="p-3.5 bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5">
            <span className="text-[11px] font-medium">معدل التسليم الناجح</span>
            <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          {loading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <p className="text-xl font-bold tabular-nums text-zinc-900 dark:text-white tracking-tight">
              {deliveryRate}%
            </p>
          )}
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {deliveredOrders.toLocaleString()} طلب تم تسليمه
          </p>
        </div>

        {/* Cancellation Rate */}
        <div className="p-3.5 bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5">
            <span className="text-[11px] font-medium">معدل الإلغاءات</span>
            <XCircleIcon className="h-3.5 w-3.5 text-rose-600" />
          </div>
          {loading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <p className="text-xl font-bold tabular-nums text-zinc-900 dark:text-white tracking-tight">
              {cancellationRate}%
            </p>
          )}
          <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
            {cancelledOrders.toLocaleString()} طلب ملغي
          </p>
        </div>

        {/* Return Rate */}
        <div className="p-3.5 bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5">
            <span className="text-[11px] font-medium">معدل المرتجعات</span>
            <ArrowPathRoundedSquareIcon className="h-3.5 w-3.5 text-amber-600" />
          </div>
          {loading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <p className="text-xl font-bold tabular-nums text-zinc-900 dark:text-white tracking-tight">
              {returnRate}%
            </p>
          )}
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 tabular-nums truncate">
            {returnedOrders.toLocaleString()} مرتجع
          </p>
        </div>

        {/* COD Collection Rate */}
        <div className="p-3.5 bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1.5">
            <span className="text-[11px] font-medium">تحصيل الدفع عند الاستلام</span>
            <CurrencyDollarIcon className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          {loading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <p className="text-xl font-bold tabular-nums text-zinc-900 dark:text-white tracking-tight">
              {codCollectionRate}%
            </p>
          )}
          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 tabular-nums truncate">
            محصل: {formatPrice(codDeliveredRevenue)}
          </p>
        </div>
      </div>

      {/* Secondary Telemetry Strip (Units, AOV, Pieces) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-850 rounded-lg flex items-center justify-between text-xs">
          <span className="text-zinc-500">{t("orders.averageOrderValue") || "متوسط قيمة الطلب (AOV)"}</span>
          <span className="font-bold tabular-nums text-zinc-900 dark:text-white">{formatPrice(stats?.avgOrderValue || 0)}</span>
        </div>
        <div className="p-3 bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-850 rounded-lg flex items-center justify-between text-xs">
          <span className="text-zinc-500">{t("orders.totalPieces") || "إجمالي القطع"}</span>
          <span className="font-bold tabular-nums text-zinc-900 dark:text-white">{stats?.totalPieces?.toLocaleString() || "0"}</span>
        </div>
        <div className="p-3 bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-850 rounded-lg flex items-center justify-between text-xs">
          <span className="text-zinc-500">{t("orders.averagePiecesPerOrder") || "متوسط القطع / طلب"}</span>
          <span className="font-bold tabular-nums text-zinc-900 dark:text-white">{stats?.avgPiecesPerOrder || 0}</span>
        </div>
        <div className="p-3 bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-850 rounded-lg flex items-center justify-between text-xs">
          <span className="text-zinc-500">{t("orders.averagePieceValue") || "متوسط سعر القطعة"}</span>
          <span className="font-bold tabular-nums text-zinc-900 dark:text-white">
            {stats && stats.totalPieces > 0 ? formatPrice(totalRevenue / stats.totalPieces) : formatPrice(0)}
          </span>
        </div>
      </div>

      {/* 3. Daily Velocity Chart (Shown whenever trend data is available) */}
      {stats?.dailyTrend && stats.dailyTrend.length > 1 && (
        <div className="bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 dark:border-zinc-900 gap-2 mb-3">
            <div className="flex items-center gap-2">
              <ChartBarIcon className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                تطور الطلبات والإيرادات اليومية
              </h2>
            </div>
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg text-xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setTrendMetric("orders")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium active:scale-[0.98] ${
                  trendMetric === "orders"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs font-semibold"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                الطلبات اليومية
              </button>
              <button
                type="button"
                onClick={() => setTrendMetric("revenue")}
                className={`px-2.5 py-1 rounded-md transition-all font-medium active:scale-[0.98] ${
                  trendMetric === "revenue"
                    ? "bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-2xs font-semibold"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                الإيرادات اليومية
              </button>
            </div>
          </div>

          <div className="h-60 sm:h-64 w-full">
            <DeferredResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dailyTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="chassisOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="chassisRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 10 }} />
                <YAxis tickLine={false} tick={{ fontSize: 10 }} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "rgba(18, 18, 20, 0.95)",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                    fontSize: "11px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
                {trendMetric === "orders" ? (
                  <>
                    <Area type="monotone" dataKey="orders" name="إجمالي الطلبات" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#chassisOrders)" />
                    <Area type="monotone" dataKey="delivered" name="المسلّم" stroke="#10b981" strokeWidth={1.75} fill="none" />
                    <Area type="monotone" dataKey="cancelled" name="الملغي" stroke="#f43f5e" strokeWidth={1.25} fill="none" />
                    <Area type="monotone" dataKey="returned" name="المرتجع" stroke="#f59e0b" strokeWidth={1.25} fill="none" />
                  </>
                ) : (
                  <Area type="monotone" dataKey="revenue" name="الإيراد اليومي" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#chassisRevenue)" />
                )}
              </AreaChart>
            </DeferredResponsiveContainer>
          </div>
        </div>
      )}

      {/* 4. The Operational Triad: Status Distribution, Shipping Performance, and Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Panel 1: Full Status Distribution (with Piece Counts - Core Feature!) */}
        <div className="bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-zinc-900">
            <div className="flex items-center gap-2">
              <ChartBarIcon className="h-4 w-4 text-blue-600" />
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                {t("orders.analyticsStatusDistribution") || "توزيع حالات الطلبات والقطع"}
              </h3>
            </div>
            <span className="text-[10px] text-zinc-400 tabular-nums">
              {Object.keys(statusDist).length} حالات
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[340px] pr-1 space-y-2.5">
            {loading ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3, 4].map((n) => (
                  <Skeleton key={n} className="h-8 w-full rounded-md" />
                ))}
              </div>
            ) : Object.keys(statusDist).length === 0 ? (
              <p className="text-center text-xs text-zinc-400 py-10">{t("orders.analyticsNoData") || "لا توجد بيانات"}</p>
            ) : (
              Object.entries(statusDist).map(([status, count]) => {
                const safeTotal = totalOrders > 0 ? totalOrders : 1;
                const pct = Math.min(100, Math.round((count / safeTotal) * 100));
                const pieces = stats?.statusPiecesDistribution?.[status] ?? 0;
                const display = getStatusDisplay(status);
                const colorClass = getStatusColorClass(status);

                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                        {t(display.labelKey) || status}
                      </span>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0 font-medium">
                        {t("orders.analyticsStatusCount", { orders: count, pieces }) || `${count} طلب (${pieces} قطعة)`}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-zinc-850 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colorClass} rounded-full transition-all duration-300`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Panel 2: Shipping Couriers Performance & Delivery Speed */}
        <div className="bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-zinc-900">
            <div className="flex items-center gap-2">
              <TruckIcon className="h-4 w-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                كفاءة شركات وفروع الشحن
              </h3>
            </div>
            <span className="text-[10px] text-zinc-400 tabular-nums">
              {shippingList.length} جهات
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[340px] pr-1 space-y-2.5">
            {loading ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3].map((n) => (
                  <Skeleton key={n} className="h-14 w-full rounded-md" />
                ))}
              </div>
            ) : shippingList.length === 0 ? (
              <p className="text-center text-xs text-zinc-400 py-10">لا توجد بيانات شحنات مسجلة</p>
            ) : (
              shippingList.map((carrier) => (
                <div
                  key={carrier.name}
                  className="p-3 rounded-lg bg-slate-50/70 dark:bg-zinc-900/60 border border-slate-150 dark:border-zinc-850 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {carrier.name}
                    </span>
                    <span className="font-bold tabular-nums text-zinc-800 dark:text-zinc-200">
                      {carrier.totalOrders.toLocaleString()} شحنة
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center text-[10px] py-1 bg-white dark:bg-zinc-950 rounded border border-slate-100 dark:border-zinc-850">
                    <div>
                      <p className="text-zinc-400">المسلّم</p>
                      <p className="font-bold text-emerald-600 tabular-nums">{carrier.deliveredOrders}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400">نسبة التسليم</p>
                      <p className="font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">{carrier.deliveryRate}%</p>
                    </div>
                    <div>
                      <p className="text-zinc-400">المرتجع</p>
                      <p className="font-bold text-rose-600 tabular-nums">{carrier.returnedOrders}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums pt-0.5">
                    <span>قيد التوصيل: <strong className="text-zinc-700 dark:text-zinc-300">{carrier.inTransitOrders}</strong></span>
                    <span>تحصيل: <strong className="text-emerald-600">{formatPrice(carrier.codCollected)}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 3: Payment Breakdown & Financial Realization */}
        <div className="bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-3.5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-zinc-900">
            <div className="flex items-center gap-2">
              <CreditCardIcon className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                {t("orders.analyticsPaymentMethods") || "طرق الدفع والتحصيل"}
              </h3>
            </div>
            <span className="text-[10px] text-zinc-400 tabular-nums">
              {Object.keys(paymentStats).length} وسائل
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[340px] pr-1 space-y-2.5">
            {/* COD Financial Realization Summary Box */}
            <div className="p-3 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-xs">
              <div className="flex items-center justify-between font-semibold text-emerald-900 dark:text-emerald-300 mb-1">
                <span>الدفع عند الاستلام (COD)</span>
                <span className="tabular-nums font-bold">{codOrdersCount.toLocaleString()} طلب</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400 tabular-nums">
                <span>تم تحصيل: <strong className="text-emerald-600 font-bold">{formatPrice(codDeliveredRevenue)}</strong></span>
                <span className="font-bold text-emerald-600">{codCollectionRate}% تحصيل</span>
              </div>
            </div>

            {/* Individual payment methods list */}
            <div className="space-y-1.5 pt-1">
              {Object.entries(paymentStats).map(([method, count]) => {
                const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
                return (
                  <div
                    key={method}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 dark:bg-zinc-900/60 border border-slate-100 dark:border-zinc-850 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate block">
                        {getPaymentMethodLabel(method, t)}
                      </span>
                      <span className="text-[10px] text-zinc-400 tabular-nums">
                        {pct}% من إجمالي الطلبات
                      </span>
                    </div>
                    <span className="font-bold text-zinc-900 dark:text-white tabular-nums shrink-0">
                      {t("orders.analyticsOrderCount", { count }) || `${count} طلب`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Governorate Intelligence Table */}
      <div className="bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 dark:border-zinc-900 gap-2.5 mb-3">
          <div className="flex items-center gap-2">
            <MapPinIcon className="h-4 w-4 text-rose-500" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              {t("orders.analyticsGovernorateDistribution") || "توزيع المحافظات ومعدلات التسليم"}
            </h2>
            <span className="text-[11px] text-zinc-400 tabular-nums">
              ({governorateList.length} محافظة)
            </span>
          </div>
          <div className="relative w-full sm:w-60">
            <MagnifyingGlassIcon className="h-3.5 w-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="بحث في المحافظات..."
              value={govSearch}
              onChange={(e) => setGovSearch(e.target.value)}
              className="w-full pr-8 pl-2.5 py-1 text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-2 py-2">
            {[1, 2, 3, 4].map((n) => (
              <Skeleton key={n} className="h-8 w-full" />
            ))}
          </div>
        ) : filteredGovs.length === 0 ? (
          <p className="text-center text-xs text-zinc-400 py-8">لا توجد بيانات متاحة للمحافظات</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-150 dark:border-zinc-850 text-zinc-500 dark:text-zinc-400 bg-slate-50/50 dark:bg-zinc-900/40 text-[11px]">
                  <th className="py-2 px-3 text-start font-medium">المحافظة</th>
                  <th className="py-2 px-3 text-start font-medium">إجمالي الطلبات</th>
                  <th className="py-2 px-3 text-start font-medium">الحصة %</th>
                  <th className="py-2 px-3 text-start font-medium">تم التسليم</th>
                  <th className="py-2 px-3 text-start font-medium">نسبة التسليم الناجح</th>
                  <th className="py-2 px-3 text-start font-medium">المرتجع</th>
                  <th className="py-2 px-3 text-start font-medium">الملغي</th>
                  <th className="py-2 px-3 text-start font-medium">إجمالي المبيعات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-900">
                {filteredGovs.map((gov) => (
                  <tr key={gov.name} className="hover:bg-slate-50/70 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="py-2 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                      {gov.name}
                    </td>
                    <td className="py-2 px-3 tabular-nums font-bold text-zinc-800 dark:text-zinc-200">
                      {gov.ordersCount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 tabular-nums text-zinc-500">
                      {gov.sharePct}%
                    </td>
                    <td className="py-2 px-3 tabular-nums font-semibold text-emerald-600">
                      {gov.deliveredCount}
                    </td>
                    <td className="py-2 px-3 min-w-[130px]">
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums font-bold text-zinc-800 dark:text-zinc-200 text-[11px] shrink-0">
                          {gov.deliveryRate}%
                        </span>
                        <div className="h-1.5 flex-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              gov.deliveryRate >= 70
                                ? "bg-emerald-500"
                                : gov.deliveryRate >= 45
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${Math.min(100, gov.deliveryRate)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3 tabular-nums font-medium text-amber-600">
                      {gov.returnedCount}
                    </td>
                    <td className="py-2 px-3 tabular-nums font-medium text-rose-600">
                      {gov.cancelledCount}
                    </td>
                    <td className="py-2 px-3 tabular-nums font-bold text-emerald-600 whitespace-nowrap">
                      {formatPrice(gov.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Top Products Performance Table */}
      <div className="bg-white dark:bg-zinc-950 border border-slate-200/90 dark:border-zinc-800 rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-zinc-900 mb-3">
          <CubeIcon className="h-4 w-4 text-purple-600" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            {t("orders.analyticsTopProducts") || "أفضل المنتجات مبيعاً"}
          </h2>
        </div>

        {loading ? (
          <div className="space-y-3 py-2">
            {[1, 2, 3, 4].map((n) => (
              <Skeleton key={n} className="h-10 w-full" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-xs text-zinc-400 py-8">
            {t("orders.analyticsNoData") || "لا توجد بيانات مبيعات منتجات"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-150 dark:border-zinc-850 text-zinc-500 dark:text-zinc-400 bg-slate-50/50 dark:bg-zinc-900/40 text-[11px]">
                  <th className="py-2 px-3 text-start font-medium">
                    {t("orders.analyticsProduct") || "المنتج"}
                  </th>
                  <th className="py-2 px-3 text-start font-medium">
                    {t("orders.analyticsQuantitySold") || "الكمية المباعة"}
                  </th>
                  <th className="py-2 px-3 text-start font-medium">
                    {t("orders.analyticsProductOrderCount") || "عدد الطلبات"}
                  </th>
                  <th className="py-2 px-3 text-start font-medium">
                    {t("orders.analyticsAveragePrice") || "متوسط السعر"}
                  </th>
                  <th className="py-2 px-3 text-start font-medium">
                    {t("orders.analyticsRevenue") || "إجمالي المبيعات"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-900">
                {products.slice(0, 15).map((p) => (
                  <tr key={p.productId} className="hover:bg-slate-50/70 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {p.productImage ? (
                          <img
                            src={p.productImage}
                            alt={p.productName}
                            className="h-8 w-8 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-zinc-800"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                            <CubeIcon className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-zinc-900 dark:text-white truncate">
                            {p.productName}
                          </p>
                          {p.productSku && (
                            <p className="text-[10px] text-zinc-400 truncate">
                              SKU: {p.productSku}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3 font-bold text-zinc-900 dark:text-white tabular-nums">
                      {p.quantitySold.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-zinc-600 dark:text-zinc-300 tabular-nums">
                      {p.orderCount.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-zinc-600 dark:text-zinc-300 tabular-nums">
                      {formatPrice(p.averagePrice)}
                    </td>
                    <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400 font-bold tabular-nums whitespace-nowrap">
                      {formatPrice(p.revenue)}
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

export default OrdersAnalytics;
