import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  RefreshCw,
  AlertTriangle,
  Download,
  Calendar,
  Filter,
  Activity,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Package,
} from "lucide-react";
import analyticsService from "../../services/analyticsService";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import ThemeToggle from "../../components/ui/theme-toggle";



const PERIOD_OPTIONS = [
  { value: "7", label: "آخر 7 أيام" },
  { value: "30", label: "آخر 30 يوم" },
  { value: "90", label: "آخر 90 يوم" },
  { value: "custom", label: "فترة مخصصة" },
];

interface StatusAnalysisData {
  summary: {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    successRate: number;
  };
  trend: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
  orders: Array<{
    id: string;
    customerName: string;
    date: string;
    total: number;
    paymentMethod: string;
    lastUpdated: string;
  }>;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const StatusAnalysisReport: React.FC = () => {
  const [statuses, setStatuses] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [period, setPeriod] = useState<string>("30");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [data, setData] = useState<StatusAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available statuses on mount
  useEffect(() => {
    const loadStatuses = async () => {
      try {
        // We simulate loading statuses if API is not fully ready or fetch from API
        const response = await analyticsService.getAvailableStatuses().catch(() => ({
          data: [
            { id: "returned", name: "مرتجع" },
            { id: "exchanged", name: "استبدال" },
            { id: "partial", name: "مكتمل جزئياً" },
            { id: "delayed_15", name: "15D مؤجل" },
            { id: "delayed_with_courier", name: "متاخر مع المندوب" },
          ],
        }));
        
        // Fallback mock data if API doesn't exist yet
        const statusList = response?.data || response || [
            { id: "returned", name: "مرتجع" },
            { id: "exchanged", name: "استبدال" },
            { id: "partial", name: "مكتمل جزئياً" },
            { id: "delayed", name: "مؤجل" },
            { id: "delayed_with_courier", name: "متاخر مع المندوب" },
        ];
        
        setStatuses(statusList);
        if (statusList.length > 0) {
          setSelectedStatus(statusList[0].id);
        }
      } catch (err) {
        console.error("Failed to load statuses", err);
        setError("فشل في تحميل الحالات المتاحة");
      }
    };
    loadStatuses();
  }, []);

  // Fetch report data when filters change
  useEffect(() => {
    if (!selectedStatus) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const reportData: StatusAnalysisData = await analyticsService.getStatusAnalysisReport(
          selectedStatus,
          period,
          startDate,
          endDate,
        );
        if (!reportData || !reportData.summary) throw new Error("Invalid format");

        setData(reportData);
      } catch (err) {
        setError("حدث خطأ أثناء جلب تقرير الحالة");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedStatus, period, startDate, endDate]);

  const chartData = useMemo(() => {
    if (!data?.trend) return [];
    return data.trend.map((d) => ({
      date: formatDate(d.date),
      orders: d.orders,
      revenue: d.revenue,
    }));
  }, [data]);

  const handleExport = () => {
    // محاكاة التصدير
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + 
      "رقم الطلب,العميل,التاريخ,المبلغ,طريقة الدفع,آخر تحديث\n" +
      data?.orders.map(o => `${o.id},${o.customerName},${formatDate(o.date)},${o.total},${o.paymentMethod},${formatDate(o.lastUpdated)}`).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `تقرير_${statuses.find(s => s.id === selectedStatus)?.name}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300" dir="rtl">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header Area */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              تحليل تقارير الحالات
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              تحليل مفصل لأداء الطلبات بناءً على حالتها الحالية
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             <ThemeToggle />
             <Button
                onClick={() => {
                  /* trigger refresh */
                  setPeriod(period);
                }}
                variant="outline"
                className="bg-white dark:bg-gray-800"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
              <Button
                onClick={handleExport}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={!data || loading}
              >
                <Download className="w-4 h-4 ml-2" />
                تصدير البيانات
              </Button>
          </div>
        </div>

        {/* Filters Area */}
        <Card className="bg-white dark:bg-gray-800 shadow-sm border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  حالة الطلب
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  الفترة الزمنية
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PERIOD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {period === "custom" && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">من تاريخ</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">إلى تاريخ</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
            ))}
          </div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white dark:bg-gray-800 shadow-sm border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">إجمالي الطلبات</p>
                      <h3 className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">
                        {data.summary.totalOrders}
                      </h3>
                    </div>
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 shadow-sm border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">القيمة الإجمالية</p>
                      <h3 className="text-2xl font-bold mt-2 text-green-600 dark:text-green-400">
                        {formatCurrency(data.summary.totalRevenue)}
                      </h3>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                      <DollarSign className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 shadow-sm border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">متوسط قيمة الطلب</p>
                      <h3 className="text-2xl font-bold mt-2 text-blue-600 dark:text-blue-400">
                        {formatCurrency(data.summary.averageOrderValue)}
                      </h3>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 shadow-sm border-gray-200 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">معدل التغيير</p>
                      <h3 className="text-2xl font-bold mt-2 text-purple-600 dark:text-purple-400">
                        %{data.summary.successRate}
                      </h3>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                      <Activity className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="col-span-1 lg:col-span-2 bg-white dark:bg-gray-800 shadow-sm border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    التوجه الزمني (Trend Analysis)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80 w-full">
                    {chartData.length > 0 && (
                      <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.1)" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" stroke="rgba(156, 163, 175, 0.1)" />
                          <YAxis yAxisId="right" orientation="right" stroke="rgba(156, 163, 175, 0.1)" />
                          <Tooltip />
                          <Legend />
                          <Area yAxisId="left" type="monotone" dataKey="orders" name="الطلبات" stroke="rgb(99, 102, 241)" fill="rgba(99, 102, 241, 0.1)" />
                          <Area yAxisId="right" type="monotone" dataKey="revenue" name="القيمة (ج.م)" stroke="rgb(34, 197, 94)" fill="rgba(34, 197, 94, 0.1)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 shadow-sm border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="w-5 h-5 text-indigo-500" />
                    توزيع الإجراءات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="space-y-4">
                     {/* شريط التقدم الوهمي للتمثيل */}
                     <div>
                       <div className="flex justify-between text-sm mb-1">
                         <span className="text-gray-700 dark:text-gray-300">تمت المعالجة</span>
                         <span className="font-bold text-gray-900 dark:text-white">70%</span>
                       </div>
                       <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                         <div className="bg-green-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                       </div>
                     </div>
                     <div>
                       <div className="flex justify-between text-sm mb-1">
                         <span className="text-gray-700 dark:text-gray-300">قيد المراجعة</span>
                         <span className="font-bold text-gray-900 dark:text-white">20%</span>
                       </div>
                       <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                         <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '20%' }}></div>
                       </div>
                     </div>
                     <div>
                       <div className="flex justify-between text-sm mb-1">
                         <span className="text-gray-700 dark:text-gray-300">متأخر</span>
                         <span className="font-bold text-gray-900 dark:text-white">10%</span>
                       </div>
                       <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                         <div className="bg-red-500 h-2 rounded-full" style={{ width: '10%' }}></div>
                       </div>
                     </div>
                   </div>
                </CardContent>
              </Card>
            </div>

            {/* Data Table */}
            <Card className="bg-white dark:bg-gray-800 shadow-sm border-gray-200 dark:border-gray-700 overflow-hidden">
              <CardHeader className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <CardTitle className="text-lg">سجل الطلبات للحالة ({statuses.find(s => s.id === selectedStatus)?.name})</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-4 font-medium">رقم الطلب</th>
                      <th className="px-6 py-4 font-medium">العميل</th>
                      <th className="px-6 py-4 font-medium">تاريخ الطلب</th>
                      <th className="px-6 py-4 font-medium">المبلغ</th>
                      <th className="px-6 py-4 font-medium">طريقة الدفع</th>
                      <th className="px-6 py-4 font-medium">آخر تحديث</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {data.orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-medium text-indigo-600 dark:text-indigo-400">{order.id}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">{order.customerName}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{formatDate(order.date)}</td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{formatCurrency(order.total)}</td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="text-xs">
                            {order.paymentMethod}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{formatDate(order.lastUpdated)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default StatusAnalysisReport;
