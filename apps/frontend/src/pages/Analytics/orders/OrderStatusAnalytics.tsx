import { useCallback, useEffect, useState } from "react";
import {
  BarChart as BarChartIcon,
  TrendingUp,
  XCircle,
  RefreshCw,
  Download,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import PeriodSelector from "../../../components/common/PeriodSelector";
import {
  AnalyticsData,
  ShortageFailedOrder,
} from "./orderStatusTypes";
import OrderStatusOverviewTab from "./OrderStatusOverviewTab";
import OrderStatusShortageTab from "./OrderStatusShortageTab";
import OrderStatusTrendsTab from "./OrderStatusTrendsTab";

export default function OrderStatusAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [activeTab, setActiveTab] = useState<"overview" | "shortage" | "trends">("overview");
  const [reopeningOrderId, setReopeningOrderId] = useState<string | null>(null);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const res = await apiClient.get<{ success: boolean; data: AnalyticsData }>(
        `/reports/order-status-analytics?${params.toString()}`,
      );
      setData(res.data.data);
    } catch {
      setError("فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReopenOrder = useCallback(async (order: ShortageFailedOrder) => {
    if (!window.confirm(`هل تريد إعادة فتح الطلب ${order.orderNumber} للتشغيل؟`)) return;
    setReopeningOrderId(order.id);
    try {
      const res = await apiClient.post<{ success: boolean }>(
        `/orders-new/simple/${encodeURIComponent(order.orderNumber)}/status`,
        { status: "PENDING_PREPARATION", notes: "إعادة فتح من تبويب العجز النهائي" },
      );
      if (res.data.success) {
        await fetchData();
      } else {
        window.alert("تعذر إعادة فتح الطلب");
      }
    } catch {
      window.alert("تعذر إعادة فتح الطلب");
    } finally {
      setReopeningOrderId(null);
    }
  }, [fetchData]);

  const summary = data?.summary;
  const statusDist = data?.statusDistribution || [];
  const trendData = data?.trendData || [];
  const hourlyData = data?.hourlyData || [];
  const topGovs = data?.topGovernorates || [];
  const recentFailed = data?.recentShortageFailed || [];
  const shortageByProduct = data?.shortageByProduct || [];
  const deliveredCount = statusDist.find((s) => s.status === "DELIVERED")?.count || 0;
  const deliveryRate =
    summary?.totalOrders ? ((deliveredCount / summary.totalOrders) * 100).toFixed(1) : "0";

  const handleExport = () => {
    const rows = recentFailed.map((o) => [
      o.orderNumber,
      o.customerName || "",
      o.customerPhone || "",
      o.governorate || "",
      o.total.toFixed(2),
      o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : "",
    ]);
    const csvContent =
      "\uFEFFرقم الطلب,العميل,الهاتف,المحافظة,المبلغ,التاريخ\n" +
      rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `shortage-failed-orders-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <p className="text-xs text-muted-foreground">جارٍ تحميل التحليل...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center max-w-md">
          <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-xs font-semibold text-destructive">{error}</p>
          <button
            onClick={() => fetchData(true)}
            className="mt-3 px-4 py-1.5 bg-destructive text-destructive-foreground rounded-md text-xs font-medium hover:bg-destructive/90 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            تحليل حالات الطلبات
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            رؤية شاملة لحالات الطلبات مع تركيز على دورة التسليم والعجز النهائي
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border/70 rounded-md text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> تحديث
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> تصدير
          </button>
        </div>
      </div>

      {/* Date Filters */}
      <div className="rounded-lg border border-border/70 bg-card p-3 shadow-none flex flex-wrap items-center justify-between gap-3">
        <PeriodSelector
          initialPeriod="90"
          onRangeChange={(range) => {
            setStartDate(range.startDate);
            setEndDate(range.endDate);
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">من:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 text-xs border border-border/70 rounded bg-background text-foreground"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">إلى:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 text-xs border border-border/70 rounded bg-background text-foreground"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-0.5 rounded-lg w-fit">
        {([
          { key: "overview", label: "نظرة عامة", icon: BarChartIcon },
          { key: "shortage", label: "العجز النهائي", icon: AlertTriangle },
          { key: "trends", label: "الاتجاهات", icon: TrendingUp },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === key
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* TAB: Overview */}
      {activeTab === "overview" && (
        <OrderStatusOverviewTab
          summary={summary}
          deliveryRate={deliveryRate}
          statusDist={statusDist}
          trendData={trendData}
          hourlyData={hourlyData}
          topGovs={topGovs}
        />
      )}

      {/* TAB: Shortage */}
      {activeTab === "shortage" && (
        <OrderStatusShortageTab
          summary={summary}
          deliveryRate={deliveryRate}
          shortageByProduct={shortageByProduct}
          recentFailed={recentFailed}
          reopeningOrderId={reopeningOrderId}
          onReopenOrder={handleReopenOrder}
          onExport={handleExport}
        />
      )}

      {/* TAB: Trends */}
      {activeTab === "trends" && (
        <OrderStatusTrendsTab
          trendData={trendData}
          paymentStats={data?.paymentStats || []}
          sourceStats={data?.sourceStats || []}
        />
      )}
    </div>
  );
}
