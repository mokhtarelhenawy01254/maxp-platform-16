import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  CurrencyDollarIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import {
  LineChart,
  Line,
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
import PeriodSelector, {
  PeriodRange,
} from "../../../components/common/PeriodSelector";
import { useCurrency } from "../../../hooks/useCurrency";

interface ProfitStats {
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  cogs: number;
  operatingExpenses: number;
  adsCost: number;
  dailyProfit: Array<{
    date: string;
    profit: number;
    revenue: number;
    costs: number;
  }>;
  profitByCategory: Array<{ name: string; profit: number; margin: number }>;
}

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"];

const ProfitAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [stats, setStats] = useState<ProfitStats | null>(null);

  useEffect(() => {
    if (range) {
      fetchData();
    }
  }, [range]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await analyticsService.getProfitAnalytics(
        range?.period,
        range?.startDate,
        range?.endDate,
      );

      if (response.success && response.data) {
        // توحيد العقد: الـAPI يرجّع {summary, dailyData, categoryBreakdown} —
        // والواجهة متوقعة {cogs, dailyProfit, profitByCategory…}
        const d = response.data;
        setStats({
          grossProfit: d.summary?.grossProfit ?? 0,
          netProfit: d.summary?.netProfit ?? 0,
          profitMargin: d.summary?.profitMargin ?? 0,
          cogs: d.summary?.totalCOGS ?? 0,
          // operatingExpenses و adsCost غير متاحين في هذا الـendpoint — يظهران صفرًا
          operatingExpenses: 0,
          adsCost: 0,
          dailyProfit: (d.dailyData || []).map((x: { date: string; profit: number; revenue: number; cogs: number }) => ({
            date: x.date,
            profit: x.profit,
            revenue: x.revenue,
            costs: x.cogs,
          })),
          profitByCategory: (d.categoryBreakdown || []).map((c: { name: string; profit: number; margin: number }) => ({
            name: c.name,
            profit: c.profit,
            margin: c.margin,
          })),
        });
      } else {
        setStats({
          grossProfit: 0,
          netProfit: 0,
          profitMargin: 0,
          cogs: 0,
          operatingExpenses: 0,
          adsCost: 0,
          dailyProfit: [],
          profitByCategory: [],
        });
      }
    } catch (err: any) {
      console.error("ProfitAnalytics error:", err);
      setError(err.message || t("profitAnalytics.fetchError"));
    } finally {
      setLoading(false);
    }
  };

  const header = (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("profitAnalytics.title")}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {t("profitAnalytics.subtitle")}
        </p>
      </div>
      <PeriodSelector onRangeChange={setRange} />
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        {header}
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
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
            {t("profitAnalytics.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {header}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-500">
              <CurrencyDollarIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {t("profitAnalytics.grossProfit")}
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatPrice(stats?.grossProfit || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-500">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {t("profitAnalytics.netProfit")}
              </p>
              <p className="text-2xl font-bold text-blue-600">
                {formatPrice(stats?.netProfit || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-yellow-500">
              <ArrowTrendingUpIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {t("profitAnalytics.margin")}
              </p>
              <p className="text-2xl font-bold text-yellow-600">
                {(stats?.profitMargin || 0).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-500">
              <ArrowTrendingDownIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {t("profitAnalytics.totalCosts")}
              </p>
              <p className="text-2xl font-bold text-red-600">
                {formatPrice(
                  (stats?.cogs || 0) +
                    (stats?.operatingExpenses || 0) +
                    (stats?.adsCost || 0),
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 mb-2">
            {t("profitAnalytics.cogs")}
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {formatPrice(stats?.cogs || 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 mb-2">
            {t("profitAnalytics.adsCost")}
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {formatPrice(stats?.adsCost || 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 mb-2">
            {t("profitAnalytics.operatingExpenses")}
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {formatPrice(stats?.operatingExpenses || 0)}
          </p>
        </div>
      </div>

      {/* Profit Over Time */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t("profitAnalytics.profitOverTime")}
        </h3>
        <div className="min-w-0 h-[350px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={stats?.dailyProfit || []}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.1}
              />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip
                formatter={(value) =>
                  value ? formatPrice(value as number) : "0"
                }
              />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="#10B981"
                strokeWidth={2}
                name={t("profitAnalytics.profit")}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3B82F6"
                strokeWidth={2}
                name={t("profitAnalytics.revenue")}
              />
              <Line
                type="monotone"
                dataKey="costs"
                stroke="#EF4444"
                strokeWidth={2}
                name={t("profitAnalytics.costs")}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profit by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t("profitAnalytics.profitByCategory")}
          </h3>
          <div className="min-w-0 h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={stats?.profitByCategory || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="profit"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name} (${percent ? (percent * 100).toFixed(1) : 0}%)`
                  }
                >
                  {(stats?.profitByCategory || []).map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    value ? formatPrice(value as number) : "0"
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t("profitAnalytics.profitMarginByCategory")}
          </h3>
          <div className="min-w-0 h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={stats?.profitByCategory || []} layout="vertical">
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
                  width={100}
                />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar
                  dataKey="margin"
                  fill="#10B981"
                  name={t("profitAnalytics.profitMarginPercentage")}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitAnalytics;
