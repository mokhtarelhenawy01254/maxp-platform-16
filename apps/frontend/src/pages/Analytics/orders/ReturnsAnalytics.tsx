import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUturnLeftIcon, XCircleIcon } from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import ResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import { useCurrency } from "../../../hooks/useCurrency";

interface ReturnSummary {
  totalOrders: number;
  totalReturns: number;
  returnRate: number;
  totalLostRevenue: number;
  avgReturnValue: number;
}

interface ProductReturn {
  name: string;
  returns: number;
  lostRevenue: number;
}

interface RegionReturn {
  name: string;
  returns: number;
  lostRevenue: number;
}

interface ReturnsData {
  summary: ReturnSummary;
  topReturnedProducts: ProductReturn[];
  returnsByRegion: RegionReturn[];
}

const ReturnsAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("30");
  const [data, setData] = useState<ReturnsData | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const now = new Date();
      const start = new Date(now.getTime() - parseInt(period) * 24 * 60 * 60 * 1000);
      const response = await analyticsService.getReturnsAnalytics(
        start.toISOString(),
        now.toISOString(),
      );
      if (response.success && response.data) {
        setData(response.data);
      } else {
        setData({
          summary: { totalOrders: 0, totalReturns: 0, returnRate: 0, totalLostRevenue: 0, avgReturnValue: 0 },
          topReturnedProducts: [],
          returnsByRegion: [],
        });
      }
    } catch (err: any) {
      console.error("ReturnsAnalytics error:", err);
      setError(err.message || t("returnsAnalytics.fetchError"));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl text-center">
        <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          {t("returnsAnalytics.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("returnsAnalytics.title")}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t("returnsAnalytics.subtitle")}
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
        >
          <option value="7">{t("returnsAnalytics.last7Days")}</option>
          <option value="30">{t("returnsAnalytics.last30Days")}</option>
          <option value="90">{t("returnsAnalytics.last90Days")}</option>
          <option value="365">{t("returnsAnalytics.lastYear")}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-500">
              <ArrowUturnLeftIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t("returnsAnalytics.totalReturns")}</p>
              <p className="text-2xl font-bold text-red-600">
                {data?.summary?.totalReturns?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-orange-500">
              <XCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t("returnsAnalytics.returnRateLabel")}</p>
              <p className="text-2xl font-bold text-orange-600">
                {data?.summary?.returnRate?.toFixed(1) || 0}%
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {t("returnsAnalytics.from")} {data?.summary?.totalOrders?.toLocaleString() || 0} {t("returnsAnalytics.order")}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-purple-500">
              <ArrowUturnLeftIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t("returnsAnalytics.lostRevenue")}</p>
              <p className="text-2xl font-bold text-purple-600">
                {formatPrice(data?.summary?.totalLostRevenue || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-500">
              <ArrowUturnLeftIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t("returnsAnalytics.avgReturnValue")}</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatPrice(data?.summary?.avgReturnValue || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t("returnsAnalytics.topProducts")}
          </h3>
          <div className="min-w-0 h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={data?.topReturnedProducts || []}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={120} />
                <Tooltip formatter={(value: any) => [value, t("returnsAnalytics.returnsCount")]} />
                <Bar dataKey="returns" fill="#EF4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t("returnsAnalytics.returnsByRegion")}
          </h3>
          <div className="min-w-0 h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={data?.returnsByRegion || []}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={120} />
                <Tooltip formatter={(value: any) => [value, t("returnsAnalytics.return")]} />
                <Bar dataKey="returns" fill="#F59E0B" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReturnsAnalytics;
