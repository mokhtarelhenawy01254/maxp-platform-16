import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  RefreshCw,
  AlertCircle,
  Download,
  Calendar,
  Filter,
  Activity,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Percent,
} from "lucide-react";
import analyticsService from "../../services/analyticsService";
import { StatusAnalysisCharts } from "./statusAnalysis/StatusAnalysisCharts";
import { StatusAnalysisTable } from "./statusAnalysis/StatusAnalysisTable";

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
  if (!dateString) return "-";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const StatusAnalysisReport: React.FC = () => {
  const [statuses, setStatuses] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [period, setPeriod] = useState<string>("30");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [data, setData] = useState<StatusAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStatuses = async () => {
      try {
        const response = await analyticsService.getAvailableStatuses().catch(() => ({
          data: [
            { id: "returned", name: "مرتجع" },
            { id: "exchanged", name: "استبدال" },
            { id: "partial", name: "مكتمل جزئياً" },
            { id: "delayed_15", name: "15D مؤجل" },
            { id: "delayed_with_courier", name: "متأخر مع المندوب" },
          ],
        }));

        const statusList = response?.data || response || [
          { id: "returned", name: "مرتجع" },
          { id: "exchanged", name: "استبدال" },
          { id: "partial", name: "مكتمل جزئياً" },
          { id: "delayed", name: "مؤجل" },
          { id: "delayed_with_courier", name: "متأخر مع المندوب" },
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

  const fetchData = async () => {
    if (!selectedStatus) return;
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

  useEffect(() => {
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
    if (!data?.orders?.length) return;
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      "رقم الطلب,العميل,التاريخ,المبلغ,طريقة الدفع,آخر تحديث\n" +
      data.orders
        .map(
          (o) =>
            `${o.id},"${o.customerName}",${formatDate(o.date)},${o.total},${o.paymentMethod},${formatDate(o.lastUpdated)}`
        )
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const currentStatusName = statuses.find((s) => s.id === selectedStatus)?.name || "status";
    link.setAttribute(
      "download",
      `تقرير_${currentStatusName}_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentStatusName = statuses.find((s) => s.id === selectedStatus)?.name || "الحالة المختارة";

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 space-y-6" dir="rtl">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                تحليل تقارير حالات الطلبات
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                متابعة دقيقة لمؤشرات وتدفقات الطلبات بحسب تصنيف الحالة التشغيلية
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="h-8 px-2.5 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>
          <Button
            size="sm"
            onClick={handleExport}
            disabled={!data || loading}
            className="h-8 px-2.5 text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>تصدير CSV</span>
          </Button>
        </div>
      </div>

      {/* Control Filter Bar */}
      <Card className="bg-card border-border/70 shadow-xs">
        <CardContent className="p-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-primary" />
                حالة الطلب التشغيلية
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-8 text-xs rounded-lg border border-border/70 bg-background px-2.5 text-foreground focus:outline-hidden"
              >
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                الفترة الزمنية
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full h-8 text-xs rounded-lg border border-border/70 bg-background px-2.5 text-foreground focus:outline-hidden"
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
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">من تاريخ</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-8 text-xs rounded-lg border border-border/70 bg-background px-2.5 text-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">إلى تاريخ</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-8 text-xs rounded-lg border border-border/70 bg-background px-2.5 text-foreground"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-3.5 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted/40 rounded-xl border border-border/50" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* KPI Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card border-border/70 shadow-xs">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">إجمالي الطلبات</span>
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
                  {data.summary.totalOrders.toLocaleString()}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">طلبات مسجلة في الحالة</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/70 shadow-xs">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">القيمة المالية الإجمالية</span>
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(data.summary.totalRevenue)}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">حجم التدفقات المرتبطة بالحالة</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/70 shadow-xs">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">متوسط قيمة الطلب</span>
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-foreground">
                  {formatCurrency(data.summary.averageOrderValue)}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">سلة الطلب المتوسطة</div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/70 shadow-xs">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">معدل التحويل والنجاح</span>
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center">
                    <Percent className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums text-purple-600 dark:text-purple-400">
                  {data.summary.successRate}%
                </div>
                <div className="mt-2 text-xs text-muted-foreground">كفاءة معالجة الحالة</div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <StatusAnalysisCharts chartData={chartData} />

          {/* Ledger Table Section */}
          <StatusAnalysisTable
            orders={data.orders || []}
            statusName={currentStatusName}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
          />
        </>
      ) : null}
    </div>
  );
};

export default StatusAnalysisReport;
