import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ChartBarIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  TruckIcon,
  UsersIcon,
  RectangleStackIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import {
  AreaChart,
  Area,
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
import { useAuth } from "../../../hooks/useAuthSimple";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  createStorageKey,
  getWithExpiry,
  setWithExpiry,
} from "../../../utils/storage";

interface DashboardStats {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  multiPieceOrders: number;
  multiPiecePercentage: number;
  dailyTrend: Array<{ date: string; orders: number; revenue: number }>;
}

const OverviewDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [exporting, setExporting] = useState(false);
  const CACHE_TTL_MS = 60_000;

  const handleExportOrders = async () => {
    try {
      setExporting(true);
      const params: Record<string, string> = {};
      if (range?.startDate) params.startDate = range.startDate;
      if (range?.endDate) params.endDate = range.endDate;

      const response = await apiClient.get("/orders/export", {
        params,
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const dateSuffix =
        range?.period ||
        (range?.startDate ? `${range.startDate}_to_${range.endDate}` : "all");
      link.download = `orders-analytics-${dateSuffix}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("تم تصدير ملف الطلبات بنجاح");
    } catch (err: any) {
      toast.error(err?.message || "فشل تصدير ملف الطلبات");
    } finally {
      setExporting(false);
    }
  };

  const cacheKey = useMemo(() => {
    let companyId = "unknown";

    const storefrontCompanyId = localStorage.getItem("storefront_companyId");
    if (storefrontCompanyId) {
      companyId = storefrontCompanyId;
    } else if (user?.companyId || user?.company?.id) {
      companyId = user?.companyId || user?.company?.id || companyId;
    } else {
      try {
        const storedCompany = localStorage.getItem("company");
        if (storedCompany) {
          const parsedCompany = JSON.parse(storedCompany);
          companyId = parsedCompany?.id || companyId;
        }
      } catch {
        companyId = companyId;
      }

      if (companyId === "unknown") {
        try {
          const rawUser = localStorage.getItem("user");
          const parsedUser = rawUser ? JSON.parse(rawUser) : null;
          companyId =
            parsedUser?.companyId || parsedUser?.company?.id || companyId;
        } catch {
          companyId = companyId;
        }
      }
    }

    return createStorageKey(
      "orders-overview-dashboard",
      `${companyId}:${range?.period || ""}:${range?.startDate || ""}:${range?.endDate || ""}`,
    );
  }, [range, user?.company?.id, user?.companyId]);

  const fetchDashboardData = useCallback(
    async ({ signal, background = false } = {}) => {
      try {
        if (!background) {
          setLoading(true);
          setError(null);
        }

        const [storeData, dailyData] = await Promise.all([
          analyticsService.getStoreAnalytics(
            range?.period,
            range?.startDate,
            range?.endDate,
            undefined,
            signal,
          ),
          analyticsService.getDailyAnalytics(
            range?.period,
            range?.startDate,
            range?.endDate,
            signal,
          ),
        ]);

        if (storeData.success && dailyData.success) {
          const storeStats = storeData.data;
          const aov = Number(storeStats.averageOrderValue ?? storeStats.avgOrderValue ?? 0);
          const nextStats: DashboardStats = {
            totalOrders: Number(storeStats.totalOrders || 0),
            completedOrders: Number(storeStats.completedOrders || 0),
            cancelledOrders: Number(storeStats.cancelledOrders || 0),
            returnedOrders: Number(storeStats.returnedOrders || 0),
            pendingOrders: Number(storeStats.pendingOrders || 0),
            totalRevenue: Number(storeStats.totalRevenue || 0),
            averageOrderValue: isNaN(aov) ? 0 : aov,
            conversionRate: Number(storeStats.conversionRate || 0),
            multiPieceOrders: Number(storeStats.multiPieceOrders || 0),
            multiPiecePercentage: Number(storeStats.multiPiecePercentage || 0),
            dailyTrend: dailyData.data || [],
          };
          setStats(nextStats);
          setWithExpiry(cacheKey, nextStats, CACHE_TTL_MS);
        }
      } catch (err: any) {
        if (!background) {
          setError(err.message || "حدث خطأ في جلب البيانات");
        }
      } finally {
        if (!background) {
          setLoading(false);
        }
      }
    },
    [cacheKey, range],
  );

  useEffect(() => {
    const controller = new AbortController();
    const cached = getWithExpiry<DashboardStats>(cacheKey);

    if (cached) {
      setStats(cached);
      setLoading(false);
      fetchDashboardData({ signal: controller.signal, background: true });
    } else {
      fetchDashboardData({ signal: controller.signal });
    }

    return () => controller.abort();
  }, [cacheKey, fetchDashboardData]);

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    subBadge?: string;
    description: string;
    icon: React.ElementType;
    color: string;
    trend?: number;
    link?: string;
  }> = ({ title, value, subBadge, description, icon: Icon, color, trend, link }) => {
    const content = (
      <div
        className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow flex flex-col justify-between h-full"
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <div className={`p-2.5 rounded-lg shrink-0 ${color}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-2 flex-wrap">
            <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
              {value}
            </p>
            {subBadge && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 tabular-nums">
                {subBadge}
              </span>
            )}
          </div>
          {trend !== undefined && (
            <div
              className={`flex items-center mt-2 text-xs font-medium ${trend >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {trend >= 0 ? (
                <ArrowTrendingUpIcon className="h-3.5 w-3.5 ml-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-3.5 w-3.5 ml-1" />
              )}
              <span>{Math.abs(trend)}% عن الفترة السابقة</span>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700/60 leading-relaxed">
          {description}
        </p>
      </div>
    );

    return link ? <Link to={link} className="block h-full">{content}</Link> : content;
  };

  const COLORS = ["#10B981", "#EF4444", "#F59E0B", "#6366F1"];

  const orderStatusData = stats
    ? [
        { name: "مكتمل", value: stats.completedOrders, color: "#10B981" },
        { name: "ملغي", value: stats.cancelledOrders, color: "#EF4444" },
        { name: "مرتجع", value: stats.returnedOrders, color: "#F59E0B" },
        { name: "قيد الانتظار", value: stats.pendingOrders, color: "#6366F1" },
      ]
    : [];

  if (loading && !stats) {
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
          onClick={fetchDashboardData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            نظرة عامة على الأداء
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            ملخص شامل لأداء المتجر وحركة الطلبات والمبيعات
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <button
            onClick={handleExportOrders}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors shadow-sm disabled:opacity-50"
            title="تصدير بيانات الطلبات وعدد القطع للفترة المحددة"
          >
            <ArrowDownTrayIcon className={`h-4 w-4 ${exporting ? "animate-bounce" : ""}`} />
            <span>{exporting ? "جاري التصدير..." : "تصدير الطلبات (Excel)"}</span>
          </button>
          <PeriodSelector onRangeChange={setRange} />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-5">
        <StatCard
          title="إجمالي الطلبات"
          value={`${stats?.totalOrders?.toLocaleString() || 0} طلب`}
          description="إجمالي كافة الطلبات المسجلة خلال الفترة (باستثناء المسودات والمكرر والمحذوف)"
          icon={ShoppingCartIcon}
          color="bg-blue-500"
          link="/analytics/orders/orders"
        />
        <StatCard
          title="الطلبات اللي فيها أكتر من قطعة"
          value={`${stats?.multiPieceOrders?.toLocaleString() || 0} طلب`}
          subBadge={`${stats?.multiPiecePercentage || 0}% من الطلبات`}
          description="الطلبات التي تحتوي على قطعتين أو أكثر ونسبتها من إجمالي الطلبات"
          icon={RectangleStackIcon}
          color="bg-indigo-600"
        />
        <StatCard
          title="الطلبات المكتملة"
          value={`${stats?.completedOrders?.toLocaleString() || 0} طلب`}
          subBadge={stats?.totalOrders ? `${((stats.completedOrders / stats.totalOrders) * 100).toFixed(1)}%` : undefined}
          description="الطلبات التي تم تسليمها بنجاح للعميل خلال الفترة"
          icon={CheckCircleIcon}
          color="bg-green-500"
        />
        <StatCard
          title="إجمالي الإيرادات"
          value={formatPrice(stats?.totalRevenue || 0)}
          description="مجموع قيمة المبيعات للطلبات المؤكدة والناجحة خلال الفترة"
          icon={CurrencyDollarIcon}
          color="bg-purple-500"
          link="/analytics/orders/revenue"
        />
        <StatCard
          title="متوسط قيمة الطلب"
          value={formatPrice(stats?.averageOrderValue || 0)}
          description="متوسط قيمة الشراء للطلب الواحد خلال هذه الفترة"
          icon={ArrowTrendingUpIcon}
          color="bg-orange-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Trend Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            اتجاه الطلبات اليومي
          </h3>
          <div className="min-w-0 h-[300px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={stats?.dailyTrend || []}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="stroke-gray-300 dark:stroke-gray-600"
                />
                <XAxis
                  dataKey="date"
                  stroke="currentColor"
                  className="stroke-gray-600 dark:stroke-gray-400"
                  fontSize={12}
                />
                <YAxis
                  stroke="currentColor"
                  className="stroke-gray-600 dark:stroke-gray-400"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                  }}
                  wrapperClassName="[&_.recharts-tooltip-wrapper]:!bg-white dark:[&_.recharts-tooltip-wrapper]:!bg-gray-800 [&_.recharts-tooltip-wrapper]:!border-gray-200 dark:[&_.recharts-tooltip-wrapper]:!border-gray-700 [&_.recharts-tooltip-wrapper]:!text-gray-900 dark:[&_.recharts-tooltip-wrapper]:!text-gray-100"
                />
                <Area
                  type="monotone"
                  dataKey="orders"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                  name="الطلبات"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            توزيع حالات الطلبات
          </h3>
          <div style={{ width: "100%", height: 250 }}>
            <ResponsiveContainer width="100%" height={250} minHeight={250}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {orderStatusData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {item.name}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          الوصول السريع للتحليلات
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            {
              to: "/analytics/orders/orders",
              icon: ShoppingCartIcon,
              label: "الطلبات",
              color:
                "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
            },
            {
              to: "/analytics/orders/revenue",
              icon: CurrencyDollarIcon,
              label: "الإيرادات",
              color:
                "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
            },
            {
              to: "/analytics/orders/products",
              icon: ChartBarIcon,
              label: "المنتجات",
              color:
                "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
            },
            {
              to: "/analytics/orders/categories",
              icon: ClockIcon,
              label: "الأقسام",
              color:
                "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
            },
            {
              to: "/analytics/orders/coupons",
              icon: TruckIcon,
              label: "الكوبونات",
              color:
                "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
            },
            {
              to: "/analytics/orders/stock",
              icon: UsersIcon,
              label: "المخزون",
              color:
                "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
            },
          ].map((item, index) => (
            <Link
              key={index}
              to={item.to}
              className={`flex flex-col items-center p-4 rounded-xl ${item.color} hover:opacity-80 transition-all duration-200`}
            >
              <item.icon className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OverviewDashboard;
