import React, { useState, useEffect } from "react";
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
} from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";
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

const OrdersAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [products, setProducts] = useState<SalesProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>("30");
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchStats();
    fetchProducts();
  }, [dateRange]);

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
        start = new Date(today);
        start.setDate(1);
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

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await companyAwareApi.get(
        `/reports/orders-detailed?startDate=${dateRange.start}&endDate=${dateRange.end}`,
      );
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching order stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const response = await analyticsService.getProductSalesPerformance(
        undefined,
        dateRange.start,
        dateRange.end,
      );
      if (response.success) {
        setProducts(response.data?.products ?? []);
      }
    } catch (error) {
      console.error("Error fetching product stats:", error);
    } finally {
      setProductsLoading(false);
    }
  };

  const metricCards = [
    {
      title: t("orders.totalOrders"),
      value: stats?.totalOrders || 0,
      icon: ShoppingCartIcon,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: t("orders.totalRevenue"),
      value: formatPrice(stats?.totalRevenue || 0),
      icon: CurrencyDollarIcon,
      color: "text-green-600 bg-green-50 dark:bg-green-900/20",
    },
    {
      title: t("orders.averageOrderValue"),
      value: formatPrice(stats?.avgOrderValue || 0),
      icon: ChartBarIcon,
      color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
    },
    {
      title: t("orders.totalPieces"),
      value: stats?.totalPieces || 0,
      icon: Squares2X2Icon,
      color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20",
    },
    {
      title: t("orders.averagePiecesPerOrder"),
      value: stats?.avgPiecesPerOrder || 0,
      icon: CubeIcon,
      color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
    },
    {
      title: t("orders.averageOrdersPerDay"),
      value: stats?.avgOrdersPerDay || 0,
      icon: CalendarDaysIcon,
      color: "text-teal-600 bg-teal-50 dark:bg-teal-900/20",
    },
    {
      title: t("orders.averagePieceValue"),
      value:
        stats && stats.totalPieces > 0
          ? formatPrice(stats.totalRevenue / stats.totalPieces)
          : formatPrice(0),
      icon: CurrencyDollarIcon,
      color: "text-rose-600 bg-rose-50 dark:bg-rose-900/20",
    },
  ];

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingCartIcon className="h-8 w-8 text-blue-600" />
            {t("orders.analyticsTitle")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {t("orders.analyticsSubtitle")}
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-3">
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map(({ key, labelKey }) => (
              <button
                key={key}
                onClick={() => applyPeriod(key)}
                className={`px-3 py-1.5 text-sm rounded-md border transition ${
                  period === key
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => {
                  setPeriod("custom");
                  setDateRange((prev) => ({ ...prev, start: e.target.value }));
                }}
                className="p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
              <span className="text-gray-500">{t("orders.to")}</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => {
                  setPeriod("custom");
                  setDateRange((prev) => ({ ...prev, end: e.target.value }));
                }}
                className="p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
              <Button variant="outline" onClick={fetchStats} disabled={loading}>
                <ArrowPathIcon
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4 mb-8">
        {metricCards.map((card, i) => (
          <Card key={i} size="sm" className="min-w-0">
            <CardContent className="pt-3">
              <div className="flex items-center gap-3">
                <div className={`shrink-0 p-2 rounded-lg ${card.color}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {card.title}
                  </p>
                  <p className="text-lg font-bold tabular-nums leading-tight dark:text-white truncate">
                    {loading ? "..." : card.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-indigo-500" />
              {t("orders.analyticsStatusDistribution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats &&
                Object.entries(stats.statusDistribution).map(
                  ([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center gap-3"
                    >
                      <span className="w-36 shrink-0 text-sm font-medium dark:text-gray-300 truncate">
                        {t(getStatusDisplay(status).labelKey) || status}
                      </span>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full flex-1 min-w-0 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500"
                          style={{
                            width: `${(count / stats.totalOrders) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400 font-medium tabular-nums whitespace-nowrap">
                        {t("orders.analyticsStatusCount", {
                          orders: count,
                          pieces: stats.statusPiecesDistribution[status] || 0,
                        })}
                      </span>
                    </div>
                  ),
                )}
              {!stats && (
                <p className="text-center text-gray-500">{t("orders.analyticsNoData")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPinIcon className="h-5 w-5 text-red-500" />
              {t("orders.analyticsGovernorateDistribution")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats &&
                Object.entries(stats.governorateStats)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([gov, count]) => (
                    <div
                      key={gov}
                      className="flex items-center gap-3"
                    >
                      <span className="flex-1 min-w-0 text-sm font-medium dark:text-gray-300 truncate">
                        {gov}
                      </span>
                      <span className="shrink-0 text-sm font-bold text-indigo-600 dark:text-indigo-400 tabular-nums whitespace-nowrap">
                        {t("orders.analyticsOrderCount", { count })}
                      </span>
                    </div>
                  ))}
              {!stats && (
                <p className="text-center text-gray-500">{t("orders.analyticsNoData")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5 text-green-500" />
              {t("orders.analyticsPaymentMethods")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats &&
                Object.entries(stats.paymentStats).map(([method, count]) => (
                  <div
                    key={method}
                    className="flex items-center gap-3"
                  >
                    <span className="flex-1 min-w-0 text-sm font-medium dark:text-gray-300 truncate">
                      {method}
                    </span>
                    <span className="shrink-0 text-sm font-bold text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card size="sm" className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CubeIcon className="h-5 w-5 text-purple-500" />
            {t("orders.analyticsTopProducts")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {productsLoading ? (
            <p className="text-center text-gray-500">{t("orders.analyticsLoading")}</p>
          ) : products.length === 0 ? (
            <p className="text-center text-gray-500">{t("orders.analyticsNoData")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="py-3 px-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                      {t("orders.analyticsProduct")}
                    </th>
                    <th className="py-3 px-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                      {t("orders.analyticsQuantitySold")}
                    </th>
                    <th className="py-3 px-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                      {t("orders.analyticsProductOrderCount")}
                    </th>
                    <th className="py-3 px-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                      {t("orders.analyticsAveragePrice")}
                    </th>
                    <th className="py-3 px-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                      {t("orders.analyticsRevenue")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.slice(0, 10).map((p) => (
                    <tr
                      key={p.productId}
                      className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3 min-w-0">
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
                      <td className="py-3 px-3 text-sm font-semibold text-gray-900 dark:text-white tabular-nums">
                        {p.quantitySold.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300 tabular-nums">
                        {p.orderCount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-sm text-gray-700 dark:text-gray-300 tabular-nums">
                        {formatPrice(p.averagePrice)}
                      </td>
                      <td className="py-3 px-3 text-sm text-emerald-600 dark:text-emerald-400 font-medium tabular-nums whitespace-nowrap">
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
