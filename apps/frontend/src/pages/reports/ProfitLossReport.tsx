import React, { useState, useEffect } from "react";
import {
  PresentationChartLineIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ScaleIcon,
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

interface PLStats {
  revenue: number;
  cogs: number; // Cost of Goods Sold
  grossProfit: number;
  netMargin: string;
  orderCount: number;
}

const ProfitLossReport: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState<PLStats | null>(null);
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
        `/reports/profit-loss?startDate=${dateRange.start}&endDate=${dateRange.end}`,
      );
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching P&L stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ScaleIcon className="h-8 w-8 text-green-600" />
            تقرير الأرباح والخسائر
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            تحليل مالي مفصل للإيرادات والتكاليف والأرباح
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600">
                <BanknotesIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">إجمالي الإيرادات</p>
                <p className="text-xl font-bold dark:text-white">
                  {loading ? "..." : formatPrice(stats?.revenue || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600">
                <ScaleIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">كلفة البضاعة (COGS)</p>
                <p className="text-xl font-bold dark:text-white">
                  {loading ? "..." : formatPrice(stats?.cogs || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600">
                <ArrowTrendingUpIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">إجمالي الربح</p>
                <p className="text-xl font-bold dark:text-white">
                  {loading ? "..." : formatPrice(stats?.grossProfit || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600">
                <PresentationChartLineIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500">هامش الربح التشغيلي</p>
                <p className="text-xl font-bold dark:text-white">
                  {loading ? "..." : stats?.netMargin}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>تحليل المصاريف والتدفقات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-blue-500"
                style={{ width: stats?.revenue ? "100%" : "0%" }}
                title="Revenue"
              />
              <div
                className="h-full bg-red-500"
                style={{
                  width: stats?.revenue
                    ? `${(stats.cogs / stats.revenue) * 100}%`
                    : "0%",
                }}
                title="COGS"
              />
            </div>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="dark:text-gray-300">
                  الإيرادات (مبيعات محققة)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="dark:text-gray-300">
                  كلفة المبيعات الأساسية
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitLossReport;
