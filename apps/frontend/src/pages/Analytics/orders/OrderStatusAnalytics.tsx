import { useCallback, useEffect, useState } from "react";
import {
  BarChart as BarChartIcon,
  TrendingUp,
  XCircle,
  Package,
  RefreshCw,
  Download,
  Calendar,
  AlertTriangle,
  DollarSign,
  MapPin,
  Clock,
  ShoppingCart,
  Wallet,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { apiClient } from "../../../services/apiClient";
import PeriodSelector from "../../../components/common/PeriodSelector";

interface Summary {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  shortageFailedCount: number;
  shortageFailedRevenue: number;
  shortageFailedPercentage: string;
  dateRange: { start: string; end: string };
}

interface StatusRow {
  status: string;
  count: number;
  percentage: string;
}

interface TrendDay {
  date: string;
  [key: string]: string | number;
}

interface HourlyRow {
  hour: string;
  count: number;
}

interface GovernorateRow {
  name: string;
  count: number;
}

interface PaymentRow {
  method: string;
  count: number;
}

interface SourceRow {
  source: string;
  count: number;
}

interface ShortageFailedOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  governorate: string;
  createdAt: string;
}

interface ShortageByProduct {
  product: string;
  ordersCount: number;
  units: number;
  revenue: number;
}

interface AnalyticsData {
  summary: Summary;
  statusDistribution: StatusRow[];
  trendData: TrendDay[];
  hourlyData: HourlyRow[];
  topGovernorates: GovernorateRow[];
  paymentStats: PaymentRow[];
  sourceStats: SourceRow[];
  recentShortageFailed: ShortageFailedOrder[];
  shortageByProduct?: ShortageByProduct[];
}

const STATUS_COLORS: Record<string, string> = {
  SHORTAGE_FAILED: "#7C3AED",
  CANCELLED: "#EF4444",
  DELIVERED: "#10B981",
  SHIPPED: "#3B82F6",
  PROCESSING: "#6366F1",
  CONFIRMED: "#059669",
  PENDING: "#F59E0B",
  STOCK_SHORTAGE: "#F97316",
  RETURNED: "#EC4899",
  REFUNDED: "#8B5CF6",
  PARTIALLY_DELIVERED: "#14B8A6",
  DUPLICATE_ORDER: "#6B7280",
};

const PIE_COLORS = [
  "#7C3AED", "#EF4444", "#10B981", "#3B82F6", "#6366F1",
  "#F59E0B", "#F97316", "#EC4899", "#14B8A6", "#6B7280",
];

const STATUS_LABELS: Record<string, string> = {
  SHORTAGE_FAILED: "┘ü╪┤┘ä ╪º┘ä╪╣╪¼╪▓",
  CANCELLED: "┘à┘ä╪║┘è",
  DELIVERED: "╪¬┘à ╪º┘ä╪¬╪│┘ä┘è┘à",
  SHIPPED: "╪¬┘à ╪º┘ä╪┤╪¡┘å",
  PROCESSING: "┘é┘è╪» ╪º┘ä┘à╪╣╪º┘ä╪¼╪⌐",
  CONFIRMED: "┘à╪ñ┘â╪»",
  PENDING: "┘à╪╣┘ä┘é",
  STOCK_SHORTAGE: "╪╣╪¼╪▓ ┘à╪«╪▓┘ê┘å",
  RETURNED: "┘à╪│╪¬╪▒╪¼╪╣",
  REFUNDED: "┘à╪│╪¬╪▒╪»",
  PARTIALLY_DELIVERED: "╪¬╪│┘ä┘è┘à ╪¼╪▓╪ª┘è",
  DUPLICATE_ORDER: "┘à┘â╪▒╪▒",
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "┘â╪º╪┤ ╪╣┘å╪» ╪º┘ä╪º╪│╪¬┘ä╪º┘à",
  CREDIT_CARD: "╪¿╪╖╪º┘é╪⌐ ╪º╪ª╪¬┘à╪º┘å",
  BANK_TRANSFER: "╪¬╪¡┘ê┘è┘ä ╪¿┘å┘â┘è",
  PAYPAL: "╪¿╪º┘è ╪¿╪º┘ä",
  STRIPE: "╪│╪¬╪▒╪º┘è╪¿",
  WALLET: "┘à╪¡┘ü╪╕╪⌐ ╪▒┘é┘à┘è╪⌐",
  INSTAPAY: "╪Ñ┘å╪│╪¬╪º╪¿╪º┘è",
  VISA: "┘ü┘è╪▓╪º",
  MASTERCARD: "┘à╪º╪│╪¬╪▒┘â╪º╪▒╪»",
  VODAFONE_CASH: "┘ü┘ê╪»╪º┘ü┘ê┘å ┘â╪º╪┤",
};

const SOURCE_LABELS: Record<string, string> = {
  storefront: "╪º┘ä┘à╪¬╪¼╪▒",
  ai_conversation: "┘à╪¡╪º╪»╪½╪⌐ ╪░┘â┘è╪⌐",
  internal_push: "╪Ñ╪»╪«╪º┘ä ╪»╪º╪«┘ä┘è",
  woocommerce: "┘ê┘ê┘â┘ê┘à╪▒╪│",
  manual: "┘è╪»┘ê┘è",
  REGULAR: "╪╣╪º╪»┘è",
  AFFILIATE_REFERRAL: "╪¬╪│┘ê┘è┘é ╪¿╪º┘ä╪╣┘à┘ê┘ä╪⌐ (╪Ñ╪¡╪º┘ä╪⌐)",
  AFFILIATE_DIRECT: "╪¬╪│┘ê┘è┘é ╪¿╪º┘ä╪╣┘à┘ê┘ä╪⌐ (┘à╪¿╪º╪┤╪▒)",
  INTERNAL_IMPORT: "╪º╪│╪¬┘è╪▒╪º╪» ╪»╪º╪«┘ä┘è",
};

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
      setError("┘ü╪┤┘ä ╪¬╪¡┘à┘è┘ä ╪º┘ä╪¿┘è╪º┘å╪º╪¬");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleReopenOrder = useCallback(async (order: ShortageFailedOrder) => {
    if (!window.confirm(`┘ç┘ä ╪¬╪▒┘è╪» ╪Ñ╪╣╪º╪»╪⌐ ┘ü╪¬╪¡ ╪º┘ä╪╖┘ä╪¿ ${order.orderNumber} ┘ä┘ä╪¬╪┤╪║┘è┘ä╪ƒ`)) return;
    setReopeningOrderId(order.id);
    try {
      const res = await apiClient.post<{ success: boolean }>(
        `/orders-new/simple/${encodeURIComponent(order.orderNumber)}/status`,
        { status: "PENDING_PREPARATION", notes: "╪Ñ╪╣╪º╪»╪⌐ ┘ü╪¬╪¡ ┘à┘å ╪¬╪¿┘ê┘è╪¿ ╪º┘ä╪╣╪¼╪▓ ╪º┘ä┘å┘ç╪º╪ª┘è" },
      );
      if (res.data.success) {
        await fetchData();
      } else {
        window.alert("╪¬╪╣╪░╪▒ ╪Ñ╪╣╪º╪»╪⌐ ┘ü╪¬╪¡ ╪º┘ä╪╖┘ä╪¿");
      }
    } catch {
      window.alert("╪¬╪╣╪░╪▒ ╪Ñ╪╣╪º╪»╪⌐ ┘ü╪¬╪¡ ╪º┘ä╪╖┘ä╪¿");
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
      "\uFEFF╪▒┘é┘à ╪º┘ä╪╖┘ä╪¿,╪º┘ä╪╣┘à┘è┘ä,╪º┘ä┘ç╪º╪¬┘ü,╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐,╪º┘ä┘à╪¿┘ä╪║,╪º┘ä╪¬╪º╪▒┘è╪«\n" +
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
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
          <p className="text-sm text-gray-500">╪¼╪º╪▒┘ì ╪¬╪¡┘à┘è┘ä ╪º┘ä╪¬╪¡┘ä┘è┘ä...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-md">
          <XCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={() => fetchData(true)} className="mt-4 px-5 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition">
            ╪Ñ╪╣╪º╪»╪⌐ ╪º┘ä┘à╪¡╪º┘ê┘ä╪⌐
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-purple-950/20">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-l from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              ╪¬╪¡┘ä┘è┘ä ╪¡╪º┘ä╪º╪¬ ╪º┘ä╪╖┘ä╪¿╪º╪¬
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              ╪▒╪ñ┘è╪⌐ ╪┤╪º┘à┘ä╪⌐ ┘ä╪¡╪º┘ä╪º╪¬ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ┘à╪╣ ╪¬╪▒┘â┘è╪▓ ╪╣┘ä┘ë ╪º┘ä╪╣╪¼╪▓ ╪º┘ä┘å┘ç╪º╪ª┘è
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchData(true)} disabled={loading} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition shadow-sm disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> ╪¬╪¡╪»┘è╪½
            </button>
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition shadow-sm shadow-purple-200">
              <Download className="h-4 w-4" /> ╪¬╪╡╪»┘è╪▒
            </button>
          </div>
        </div>

        {/* Date Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <PeriodSelector
              initialPeriod="90"
              onRangeChange={(range) => {
                setStartDate(range.startDate);
                setEndDate(range.endDate);
              }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">┘à┘å:</span>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">╪Ñ┘ä┘ë:</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          {([
            { key: "overview", label: "┘å╪╕╪▒╪⌐ ╪╣╪º┘à╪⌐", icon: BarChartIcon },
            { key: "shortage", label: "╪º┘ä╪╣╪¼╪▓ ╪º┘ä┘å┘ç╪º╪ª┘è", icon: AlertTriangle },
            { key: "trends", label: "╪º┘ä╪º╪¬╪¼╪º┘ç╪º╪¬", icon: TrendingUp },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === key
                  ? "bg-white dark:bg-gray-700 shadow-sm text-purple-700 dark:text-purple-300"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */}
        {/* TAB: Overview */}
        {/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪╖┘ä╪¿╪º╪¬"
                value={summary?.totalOrders || 0}
                icon={ShoppingCart}
                color="blue"
                detail={`${summary?.dateRange ? new Date(summary.dateRange.start + "T00:00:00").toLocaleDateString("ar-EG") : ""} ΓÇö ${summary?.dateRange ? new Date(summary.dateRange.end + "T00:00:00").toLocaleDateString("ar-EG") : ""}`}
              />
              <KpiCard
                title="╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪Ñ┘è╪▒╪º╪»╪º╪¬"
                value={`${(summary?.totalRevenue || 0).toLocaleString("ar-EG")} ╪¼.┘à`}
                icon={DollarSign}
                color="green"
                detail={`┘à╪¬┘ê╪│╪╖: ${(summary?.avgOrderValue || 0).toLocaleString("ar-EG")} ╪¼.┘à`}
              />
              <KpiCard
                title="┘ü╪┤┘ä ╪¿╪│╪¿╪¿ ╪º┘ä╪╣╪¼╪▓"
                value={summary?.shortageFailedCount || 0}
                icon={AlertTriangle}
                color="purple"
                detail={`${summary?.shortageFailedPercentage || 0}% ┘à┘å ╪º┘ä╪Ñ╪¼┘à╪º┘ä┘è`}
                trend={Number(summary?.shortageFailedPercentage || 0) > 10 ? "down" : "up"}
              />
              <KpiCard
                title="┘é┘è┘à╪⌐ ╪º┘ä╪╣╪¼╪▓ ╪º┘ä┘ü╪º╪┤┘ä"
                value={`${(summary?.shortageFailedRevenue || 0).toLocaleString("ar-EG")} ╪¼.┘à`}
                icon={Wallet}
                color="orange"
                detail={`${summary?.shortageFailedCount || 0} ╪╖┘ä╪¿`}
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Status Distribution Pie */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">╪¬┘ê╪▓┘è╪╣ ╪º┘ä╪¡╪º┘ä╪º╪¬</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusDist} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={100} innerRadius={55} paddingAngle={2}>
                        {statusDist.map((entry, i) => (
                          <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${value} ╪╖┘ä╪¿`, STATUS_LABELS[String(name)] || String(name)]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {statusDist.slice(0, 6).map((s, i) => (
                    <div key={s.status} className="flex items-center gap-2 text-sm">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] || PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-gray-600 dark:text-gray-400 truncate">{STATUS_LABELS[s.status] || s.status}</span>
                      <span className="font-semibold text-gray-900 dark:text-white mr-auto">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Trend */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">╪º┘ä╪º╪¬╪¼╪º┘ç ╪º┘ä┘è┘ê┘à┘è</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="shortageGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip labelFormatter={(v) => new Date(v).toLocaleDateString("ar-EG")} />
                      <Area type="monotone" dataKey="SHORTAGE_FAILED" stroke="#7C3AED" fill="url(#shortageGrad)" strokeWidth={2} name={STATUS_LABELS["SHORTAGE_FAILED"]} />
                      <Area type="monotone" dataKey="DELIVERED" stroke="#10B981" fill="transparent" strokeWidth={1.5} name={STATUS_LABELS["DELIVERED"]} />
                      <Area type="monotone" dataKey="CANCELLED" stroke="#EF4444" fill="transparent" strokeWidth={1.5} name={STATUS_LABELS["CANCELLED"]} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Hourly Distribution + Governorates */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  <Clock className="h-5 w-5 inline ml-2 text-gray-400" /> ╪º┘ä╪¬┘ê╪▓┘è╪╣ ╪º┘ä╪│╪º╪╣┘è
                </h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  <MapPin className="h-5 w-5 inline ml-2 text-gray-400" /> ╪ú╪╣┘ä┘ë ╪º┘ä┘à╪¡╪º┘ü╪╕╪º╪¬
                </h3>
                <div className="space-y-3">
                  {topGovs.slice(0, 8).map((g, i) => (
                    <div key={g.name} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{g.name}</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{g.count}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all" style={{ width: `${(g.count / (topGovs[0]?.count || 1)) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */}
        {/* TAB: Shortage Failed */}
        {/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */}
        {activeTab === "shortage" && (
          <div className="space-y-6">
            {/* Shortage KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-purple-200 dark:shadow-purple-900/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">╪Ñ╪¼┘à╪º┘ä┘è ╪╖┘ä╪¿╪º╪¬ ╪º┘ä╪╣╪¼╪▓ ╪º┘ä┘ü╪º╪┤┘ä</p>
                    <p className="text-4xl font-bold mt-2">{summary?.shortageFailedCount || 0}</p>
                  </div>
                  <AlertTriangle className="h-10 w-10 text-purple-200" />
                </div>
                <p className="text-purple-200 text-sm mt-3">{summary?.shortageFailedPercentage || 0}% ┘à┘å ╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪╖┘ä╪¿╪º╪¬</p>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-lg shadow-orange-200 dark:shadow-orange-900/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm">╪º┘ä┘é┘è┘à╪⌐ ╪º┘ä┘à┘ü┘é┘ê╪»╪⌐</p>
                    <p className="text-3xl font-bold mt-2">{(summary?.shortageFailedRevenue || 0).toLocaleString("ar-EG")} <span className="text-lg">╪¼.┘à</span></p>
                  </div>
                  <DollarSign className="h-10 w-10 text-orange-200" />
                </div>
                <p className="text-orange-200 text-sm mt-3">┘à╪¬┘ê╪│╪╖: {summary?.shortageFailedCount ? ((summary?.shortageFailedRevenue || 0) / summary.shortageFailedCount).toLocaleString("ar-EG") : 0} ╪¼.┘à/╪╖┘ä╪¿</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-6 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm">┘å╪│╪¿╪⌐ ╪º┘ä╪¬╪│┘ä┘è┘à</p>
                    <p className="text-4xl font-bold mt-2">
                      {deliveryRate}%
                    </p>
                  </div>
                  <Target className="h-10 w-10 text-emerald-200" />
                </div>
                <p className="text-emerald-200 text-sm mt-3">┘à┘å ╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪╖┘ä╪¿╪º╪¬</p>
              </div>
            </div>

            {/* Top products causing shortage failure */}
            {shortageByProduct.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Package className="h-5 w-5 text-purple-500" /> ╪ú┘â╪½╪▒ ╪º┘ä┘à┘å╪¬╪¼╪º╪¬ ╪º┘ä┘à╪¬╪│╪¿╪¿╪⌐ ┘ü┘è ╪º┘ä╪╣╪¼╪▓ ╪º┘ä┘å┘ç╪º╪ª┘è
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                        <th className="text-right py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">╪º┘ä┘à┘å╪¬╪¼</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">╪╣╪»╪» ╪º┘ä╪╖┘ä╪¿╪º╪¬</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">╪º┘ä┘é╪╖╪╣</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">┘é┘è┘à╪⌐ ╪º┘ä╪«╪│╪º╪▒╪⌐</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shortageByProduct.map((p) => (
                        <tr key={p.product} className="border-b border-gray-50 dark:border-gray-750 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition">
                          <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{p.product}</td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{p.ordersCount}</td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{p.units}</td>
                          <td className="py-3 px-4 font-semibold text-purple-700 dark:text-purple-300">{p.revenue.toLocaleString("ar-EG")} ╪¼.┘à</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Shortage Failed Orders Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-purple-500" /> ╪ó╪«╪▒ ╪╖┘ä╪¿╪º╪¬ ╪º┘ä╪╣╪¼╪▓ ╪º┘ä┘ü╪º╪┤┘ä
                  <span className="text-sm font-normal text-gray-400 mr-auto">({recentFailed.length} ╪╖┘ä╪¿)</span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                      <th className="text-right py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">╪▒┘é┘à ╪º┘ä╪╖┘ä╪¿</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">╪º┘ä╪╣┘à┘è┘ä</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">╪º┘ä┘ç╪º╪¬┘ü</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">╪º┘ä┘à╪¿┘ä╪║</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">╪º┘ä┘à╪¡╪º┘ü╪╕╪⌐</th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-600 dark:text-gray-400">╪º┘ä╪¬╪º╪▒┘è╪«</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentFailed.length === 0 ? (
                      <tr><td colSpan={7} className="py-12 text-center text-gray-400">┘ä╪º ╪¬┘ê╪¼╪» ╪╖┘ä╪¿╪º╪¬ ╪╣╪¼╪▓ ┘ü╪º╪┤┘ä ┘ü┘è ┘ç╪░┘ç ╪º┘ä┘ü╪¬╪▒╪⌐</td></tr>
                    ) : (
                      recentFailed.map((o) => (
                        <tr key={o.id} className="border-b border-gray-50 dark:border-gray-750 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition">
                          <td className="py-3 px-4 font-medium text-purple-700 dark:text-purple-300">{o.orderNumber}</td>
                          <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{o.customerName || "-"}</td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400" dir="ltr">{o.customerPhone || "-"}</td>
                          <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">{o.total.toLocaleString("ar-EG")} ╪¼.┘à</td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{o.governorate || "-"}</td>
                          <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">
                            {o.createdAt ? new Date(o.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" }) : "-"}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => void handleReopenOrder(o)}
                              disabled={reopeningOrderId === o.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 transition hover:border-purple-300 disabled:opacity-50 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:border-purple-700"
                            >
                              <RefreshCw className={`h-3.5 w-3.5 ${reopeningOrderId === o.id ? "animate-spin" : ""}`} />
                              ╪Ñ╪╣╪º╪»╪⌐ ┘ü╪¬╪¡
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */}
        {/* TAB: Trends */}
        {/* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */}
        {activeTab === "trends" && (
          <div className="space-y-6">
            {/* Full Trend Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">╪º╪¬╪¼╪º┘ç ╪º┘ä╪¡╪º┘ä╪º╪¬ ╪╣┘ä┘ë ┘à╪»╪º╪▒ ╪º┘ä┘ê┘é╪¬</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={(v) => new Date(v).toLocaleDateString("ar-EG")} />
                    <Line type="monotone" dataKey="SHORTAGE_FAILED" stroke="#7C3AED" strokeWidth={3} dot={{ r: 4 }} name={STATUS_LABELS["SHORTAGE_FAILED"]} />
                    <Line type="monotone" dataKey="DELIVERED" stroke="#10B981" strokeWidth={2} dot={false} name={STATUS_LABELS["DELIVERED"]} />
                    <Line type="monotone" dataKey="CANCELLED" stroke="#EF4444" strokeWidth={2} dot={false} name={STATUS_LABELS["CANCELLED"]} />
                    <Line type="monotone" dataKey="PROCESSING" stroke="#6366F1" strokeWidth={1.5} dot={false} name={STATUS_LABELS["PROCESSING"]} />
                    <Line type="monotone" dataKey="SHIPPED" stroke="#3B82F6" strokeWidth={1.5} dot={false} name={STATUS_LABELS["SHIPPED"]} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment + Source Stats */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  <Wallet className="h-5 w-5 inline ml-2 text-gray-400" /> ╪╖╪▒┘é ╪º┘ä╪»┘ü╪╣
                </h3>
                <div className="space-y-3">
                  {(data?.paymentStats || []).map((p) => (
                    <div key={p.method} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-24 truncate">{PAYMENT_LABELS[p.method] || p.method || "╪║┘è╪▒ ┘à╪¡╪»╪»"}</span>
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style={{ width: `${(p.count / Math.max(...(data?.paymentStats || []).map(x => x.count), 1)) * 100}%` }} />
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white w-12 text-left">{p.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  <Package className="h-5 w-5 inline ml-2 text-gray-400" /> ┘à╪╡╪º╪»╪▒ ╪º┘ä╪╖┘ä╪¿╪º╪¬
                </h3>
                <div className="space-y-3">
                  {(data?.sourceStats || []).map((s) => (
                    <div key={s.source} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-24 truncate">{SOURCE_LABELS[s.source] || s.source || "╪║┘è╪▒ ┘à╪¡╪»╪»"}</span>
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full" style={{ width: `${(s.count / Math.max(...(data?.sourceStats || []).map(x => x.count), 1)) * 100}%` }} />
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white w-12 text-left">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ΓöÇΓöÇΓöÇ KPI Card Component ΓöÇΓöÇΓöÇ */
function KpiCard({ title, value, icon: Icon, color, detail, trend }: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "green" | "purple" | "orange" | "red";
  detail?: string;
  trend?: "up" | "down";
}) {
  const colorMap = {
    blue: "from-blue-500 to-indigo-500 shadow-blue-200 dark:shadow-blue-900/30",
    green: "from-emerald-500 to-teal-500 shadow-emerald-200 dark:shadow-emerald-900/30",
    purple: "from-purple-500 to-violet-600 shadow-purple-200 dark:shadow-purple-900/30",
    orange: "from-orange-500 to-amber-500 shadow-orange-200 dark:shadow-orange-900/30",
    red: "from-red-500 to-rose-500 shadow-red-200 dark:shadow-red-900/30",
  };

  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} rounded-2xl p-5 text-white shadow-lg transition hover:scale-[1.02]`}>
      <div className="flex items-center justify-between">
        <p className="text-white/80 text-sm font-medium">{title}</p>
        <Icon className="h-6 w-6 text-white/60" />
      </div>
      <p className="text-3xl font-bold mt-3">{value}</p>
      {detail && (
        <div className="flex items-center gap-1 mt-2">
          {trend === "up" && <ArrowUpRight className="h-3.5 w-3.5 text-emerald-200" />}
          {trend === "down" && <ArrowDownRight className="h-3.5 w-3.5 text-red-200" />}
          <p className="text-white/70 text-xs">{detail}</p>
        </div>
      )}
    </div>
  );
}
