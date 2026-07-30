import { Circle as CubeIcon, RefreshCw as ArrowPathIcon, AlertTriangle as ExclamationTriangleIcon, DollarSign as CurrencyDollarIcon, Circle as ArrowTrendingUpIcon, Table as TableCellsIcon } from 'lucide-react';
import React, { useState, useEffect } from "react";
;
import { companyAwareApi } from "../../services/companyAwareApi";
import { useCurrency } from "../../hooks/useCurrency";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";

interface InventoryStats {
  totalProducts: number;
  totalStock: number;
  totalValue: number;
  potentialRevenue: number;
  potentialProfit: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockItems: any[];
  outOfStockItems: any[];
}

const InventoryAnalytics: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await companyAwareApi.get("/reports/inventory-detailed");
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching inventory stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const metricCards = [
    {
      title: "قيمة المخزون (بالتكلفة)",
      value: formatPrice(stats?.totalValue || 0),
      icon: CurrencyDollarIcon,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "إيرادات محتملة",
      value: formatPrice(stats?.potentialRevenue || 0),
      icon: ArrowTrendingUpIcon,
      color: "text-green-600 bg-green-50 dark:bg-green-900/20",
    },
    {
      title: "أرباح محتملة للمخزون",
      value: formatPrice(stats?.potentialProfit || 0),
      icon: CurrencyDollarIcon,
      color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
    },
    {
      title: "منتجات منخفضة المخزون",
      value: stats?.lowStockCount || 0,
      icon: ExclamationTriangleIcon,
      color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20",
    },
  ];

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CubeIcon className="h-8 w-8 text-blue-600" />
            تحليلات المخزون
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            تقييم شامل للمخزون وحالة التوفر
          </p>
        </div>

        <Button onClick={fetchStats} disabled={loading} className="gap-2">
          <ArrowPathIcon
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          تحديث البيانات
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                  <p className="text-xl font-bold dark:text-white">
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
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
              منتجات منخفضة المخزون
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y dark:divide-gray-700">
              {stats?.lowStockItems.length === 0 && (
                <p className="text-center py-4 text-gray-500">
                  لا يوجد منتجات منخفضة
                </p>
              )}
              {stats?.lowStockItems.map((item, i) => (
                <div key={i} className="py-3 flex justify-between items-center">
                  <span className="text-sm dark:text-gray-300">
                    {item.name}
                  </span>
                  <Badge variant="destructive">{item.stock} قطعة</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TableCellsIcon className="h-5 w-5 text-blue-500" />
              ملخص القيم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2 dark:border-gray-700">
                <span className="text-sm text-gray-500">إجمالي المنتجات:</span>
                <span className="font-bold dark:text-white">
                  {stats?.totalProducts}
                </span>
              </div>
              <div className="flex justify-between items-center border-b pb-2 dark:border-gray-700">
                <span className="text-sm text-gray-500">
                  إجمالي القطع في المخزن:
                </span>
                <span className="font-bold dark:text-white">
                  {stats?.totalStock}
                </span>
              </div>
              <div className="flex justify-between items-center border-b pb-2 dark:border-gray-700">
                <span className="text-sm text-gray-500">
                  متوسط تكلفة المنتج:
                </span>
                <span className="font-bold dark:text-white">
                  {stats?.totalProducts
                    ? formatPrice(stats.totalValue / stats.totalProducts)
                    : 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InventoryAnalytics;
