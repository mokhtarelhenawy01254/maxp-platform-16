import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../hooks/useCurrency";
import { config } from "../../config";
import { apiClient } from "../../services/apiClient";
import PeriodSelector, {
  PeriodRange,
} from "../../components/common/PeriodSelector";
import {
  ChartBarIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  TruckIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowLeftIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  statusCounts: {
    [key: string]: number;
  };
  recentOrders: Array<{
    orderNumber: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
}

const OrderStats: React.FC = () => {
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [allTime, setAllTime] = useState(true);
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  useEffect(() => {
    fetchStats();
  }, [range, allTime]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};

      if (!allTime && range) {
        params.dateFrom = range.startDate;
        params.dateTo = range.endDate;
      }

      const response = await apiClient.get("/orders-enhanced/stats", {
        params,
      });

      if (response.data.success) {
        setStats(response.data.data);
        setError(null);
      } else {
        throw new Error(response.data.message || t("orderStats.fetchFailed"));
      }
    } catch (error: any) {
      console.error("Error fetching order stats:", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        t("orderStats.loadingError");
      setError(message);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case "confirmed":
        return <CheckCircleIcon className="h-5 w-5 text-blue-500" />;
      case "processing":
        return <ClockIcon className="h-5 w-5 text-indigo-500" />;
      case "shipped":
        return <TruckIcon className="h-5 w-5 text-purple-500" />;
      case "delivered":
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusKey = `orders.status.${status.toLowerCase()}`;
    return t(statusKey, { defaultValue: status });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Γ£à ╪╣╪▒╪╢ ╪¡╪º┘ä╪⌐ ╪º┘ä╪«╪╖╪ú
  if (error && !loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
                {t("orderStats.errorLoading")}
              </h3>
              <p className="text-red-600 dark:text-red-300">{error}</p>
            </div>
            <button
              onClick={fetchStats}
              className="ml-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {t("orderStats.retry")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats && !loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          {t("orderStats.noData")}
        </p>
        <button
          onClick={fetchStats}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          {t("orderStats.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <ChartBarIcon className="h-8 w-8 text-indigo-600 mr-3" />
              {t("orderStats.title")}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              {t("orderStats.subtitle")}
            </p>
          </div>
          <Link
            to="/orders"
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            {t("orderStats.backToOrders")}
          </Link>
        </div>
      </div>

      {/* Date Filter Section */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("orderStats.filterByDate")}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* All-time toggle */}
            <button
              onClick={() => {
                setAllTime(true);
                setRange(null);
              }}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                allTime
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {t("orderStats.all")}
            </button>

            <PeriodSelector
              onRangeChange={(next) => {
                setRange(next);
                setAllTime(false);
              }}
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingBagIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {t("orderStats.totalOrders")}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {stats.totalOrders}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {t("orderStats.totalRevenue")}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {formatPrice(stats.totalRevenue)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {t("orderStats.averageOrderValue")}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900 dark:text-white">
                    {formatPrice(stats.averageOrderValue)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Status Distribution */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {t("orderStats.statusDistribution")}
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center">
                  {getStatusIcon(status)}
                  <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                    {getStatusText(status)}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2">{count}</span>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{
                        width: `${stats.totalOrders > 0 ? (count / stats.totalOrders) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {t("orderStats.recentOrders")}
          </h3>
          <div className="space-y-3">
            {stats.recentOrders.map((order) => {
              // Γ£à ╪¬┘å╪│┘è┘é ╪º┘ä╪¬╪º╪▒┘è╪«
              const formatDate = (dateString: string) => {
                try {
                  const date = new Date(dateString);
                  return date.toLocaleDateString("ar-EG", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                } catch {
                  return t("orderStats.notSpecifiedDate");
                }
              };

              return (
                <Link
                  key={order.orderNumber}
                  to={`/orders/${encodeURIComponent(order.orderNumber)}`}
                  className="block"
                >
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded px-2 transition-colors cursor-pointer">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {order.orderNumber}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {order.customerName}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatPrice(order.total)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {getStatusText(order.status)}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {stats.recentOrders.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("orderStats.noRecentOrders")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Refresh Button */}
      <div className="mt-8 text-center">
        <button
          onClick={fetchStats}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {t("orderStats.refreshStats")}
        </button>
      </div>
    </div>
  );
};

export default OrderStats;
