import React, { useState, useEffect } from "react";
import {
  ChartBarIcon,
  ArrowPathIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";
import { companyAwareApi } from "../../services/companyAwareApi";
import { useCurrency } from "../../hooks/useCurrency";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  statusDistribution: Record<string, number>;
  governorateStats: Record<string, number>;
  paymentStats: Record<string, number>;
}

const OrdersAnalytics: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

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

  const metricCards = [
    {
      title: "إجمالي الطلبات",
      value: stats?.totalOrders || 0,
      icon: ShoppingCartIcon,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "إجمالي المبيعات",
      value: formatPrice(stats?.totalRevenue || 0),
      icon: CurrencyDollarIcon,
      color: "text-green-600 bg-green-50 dark:bg-green-900/20",
    },
    {
      title: "متوسط قيمة الطلب",
      value: formatPrice(stats?.avgOrderValue || 0),
      icon: ChartBarIcon,
      color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
    },
  ];

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShoppingCartIcon className="h-8 w-8 text-blue-600" />
            تحليلات الطلبات
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            نظرة عامة مفصلة على أداء الطلبات والمبيعات
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, start: e.target.value }))
            }
            className="p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
          <span className="text-gray-500">إلى</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, end: e.target.value }))
            }
            className="p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          />
          <Button variant="outline" onClick={fetchStats} disabled={loading}>
            <ArrowPathIcon
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {metricCards.map((card, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <card.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold dark:text-white">
                    {loading ? "..." : card.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-indigo-500" />
              توزيع الحالات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats &&
                Object.entries(stats.statusDistribution).map(
                  ([status, count]) => (
                    <div
                      key={status}
                      className="flex justify-between items-center"
                    >
                      <span className="text-sm font-medium dark:text-gray-300">
                        {status}
                      </span>
                      <div className="flex items-center gap-3 flex-1 px-4">
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full flex-1 overflow-hidden">
                          <div
                            className="h-full bg-indigo-500"
                            style={{
                              width: `${(count / stats.totalOrders) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 font-bold w-8 text-left">
                          {count}
                        </span>
                      </div>
                    </div>
                  ),
                )}
              {!stats && (
                <p className="text-center text-gray-500">لا توجد بيانات</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPinIcon className="h-5 w-5 text-red-500" />
              توزيع المحافظات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats &&
                Object.entries(stats.governorateStats)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([gov, count]) => (
                    <div
                      key={gov}
                      className="flex justify-between items-center"
                    >
                      <span className="text-sm font-medium dark:text-gray-300">
                        {gov}
                      </span>
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                        {count} طلب
                      </span>
                    </div>
                  ))}
              {!stats && (
                <p className="text-center text-gray-500">لا توجد بيانات</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5 text-green-500" />
              طرق الدفع
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats &&
                Object.entries(stats.paymentStats).map(([method, count]) => (
                  <div
                    key={method}
                    className="flex justify-between items-center"
                  >
                    <span className="text-sm font-medium dark:text-gray-300">
                      {method}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrdersAnalytics;
