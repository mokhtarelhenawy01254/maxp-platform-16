import React, { useMemo, useState } from "react";
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Download,
  Search,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import DeferredResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import { useCurrency } from "../../../hooks/useCurrency";
import { useQuery } from "@tanstack/react-query";
import PeriodSelector, { PeriodRange } from "../../../components/common/PeriodSelector";
import {
  FulfillmentApiResponse,
  FulfillmentProduct,
  SortKey,
  SortDir,
} from "./fulfillmentAnalyticsTypes";
import ProductFulfillmentTable from "./ProductFulfillmentTable";

const DELIVERED_COLOR = "#10B981";
const CANCELLED_COLOR = "#EF4444";
const RETURNED_COLOR = "#F59E0B";
const PENDING_COLOR = "#94A3B8";

export default function ProductFulfillmentAnalytics() {
  const { formatPrice } = useCurrency();
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("totalItems");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [minVolume, setMinVolume] = useState<number>(0);
  const [highRiskOnly, setHighRiskOnly] = useState(false);

  const { data: apiResponse, isLoading } = useQuery<FulfillmentApiResponse>({
    queryKey: ["product-fulfillment-analytics", range?.startDate, range?.endDate],
    queryFn: () =>
      analyticsService.getProductFulfillmentAnalytics({
        startDate: range?.startDate,
        endDate: range?.endDate,
        period: range?.period,
      }) as Promise<FulfillmentApiResponse>,
    enabled: Boolean(range?.startDate && range?.endDate),
  });

  const rawData = apiResponse?.data;
  const summary = rawData?.summary;
  const products = rawData?.products || [];

  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      if (minVolume > 0 && p.totalItems < minVolume) return false;
      if (highRiskOnly && p.returnRate + p.cancellationRate < 30) return false;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const nameMatch = p.productName.toLowerCase().includes(query);
        const skuMatch = p.productSku ? p.productSku.toLowerCase().includes(query) : false;
        return nameMatch || skuMatch;
      }
      return true;
    });

    result.sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      if (typeof aVal === "string") {
        return sortDir === "asc"
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      }
      return sortDir === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return result;
  }, [products, searchTerm, minVolume, highRiskOnly, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const handleExportCsv = () => {
    if (filteredProducts.length === 0) return;
    const rows = filteredProducts.map((p) => [
      p.productName,
      p.productSku || "",
      p.totalItems,
      p.deliveredItems,
      p.cancelledItems,
      p.returnedItems,
      p.deliveryRate.toFixed(1) + "%",
      p.totalRevenue.toFixed(2),
      p.lostRevenue.toFixed(2),
    ]);
    const csvContent =
      "\uFEFFاسم المنتج,SKU,إجمالي القطع,المسلم,الملغي,المرتجع,نسبة التسليم,إجمالي الإيراد,الإيراد المفقود\n" +
      rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `fulfillment-analytics-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const pieData = summary
    ? [
        { name: "مسلّم", value: summary.deliveredItems, color: DELIVERED_COLOR },
        { name: "ملغي", value: summary.cancelledItems, color: CANCELLED_COLOR },
        { name: "مرتجع", value: summary.returnedItems, color: RETURNED_COLOR },
        { name: "معلق / أخرى", value: summary.pendingItems, color: PENDING_COLOR },
      ].filter((x) => x.value > 0)
    : [];

  return (
    <div className="space-y-4" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            تحليل أداء وتجهيز المنتجات
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            تتبع دقيق لمعدلات التسليم ونسب الإلغاء والمرتجع لكل منتج لتقليل الهدر
          </p>
        </div>
        <PeriodSelector onRangeChange={setRange} />
      </div>

      {/* Telemetry KPI Ribbon */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <div className="rounded-lg border border-border/70 bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">المنتجات النشطة</span>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-foreground">
            {(summary?.totalProducts || 0).toLocaleString()}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
            {(summary?.totalItems || 0).toLocaleString()} قطعة إجمالية
          </p>
        </div>

        <div className="rounded-lg border border-border/70 bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">تم التسليم</span>
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {summary?.deliveryRate ? summary.deliveryRate.toFixed(1) : 0}%
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
            {(summary?.deliveredItems || 0).toLocaleString()} قطعة ناجحة
          </p>
        </div>

        <div className="rounded-lg border border-border/70 bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">الإلغاءات</span>
            <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
            {summary?.cancellationRate ? summary.cancellationRate.toFixed(1) : 0}%
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
            {(summary?.cancelledItems || 0).toLocaleString()} قطعة ملغاة
          </p>
        </div>

        <div className="rounded-lg border border-border/70 bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">المرتجعات</span>
            <RotateCcw className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {summary?.returnRate ? summary.returnRate.toFixed(1) : 0}%
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
            {(summary?.returnedItems || 0).toLocaleString()} قطعة مسترجعة
          </p>
        </div>

        <div className="rounded-lg border border-border/70 bg-card p-3 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">الإيراد المفقود</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="mt-1 font-mono text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
            {formatPrice(summary?.lostRevenue || 0)}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
            من إجمالي {formatPrice(summary?.totalRevenue || 0)}
          </p>
        </div>
      </div>

      {/* Donut chart + Filters bar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border/70 bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">توزيع نتائج الطلبات</h3>
          <div className="h-[180px]">
            <DeferredResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value.toLocaleString()} قطعة`} />
              </PieChart>
            </DeferredResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono tabular-nums mt-1">
            {pieData.map((p) => (
              <div key={p.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <span className="font-sans text-muted-foreground truncate">{p.name}:</span>
                <span className="font-semibold text-foreground mr-auto">{p.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filter Bar Controls */}
        <div className="lg:col-span-2 rounded-lg border border-border/70 bg-card p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">فلاتر تحليل المنتجات</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="بحث باسم المنتج أو SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-md border border-border/70 bg-background pr-8 pl-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <select
                  value={minVolume}
                  onChange={(e) => setMinVolume(Number(e.target.value))}
                  className="w-full rounded-md border border-border/70 bg-background px-2.5 py-1.5 text-xs text-foreground"
                >
                  <option value={0}>كل أحجام الطلبات</option>
                  <option value={5}>أكثر من 5 قطع</option>
                  <option value={20}>أكثر من 20 قطعة</option>
                  <option value={50}>أكثر من 50 قطعة</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={highRiskOnly}
                    onChange={(e) => setHighRiskOnly(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <span>مرتفعة الفقد فقط (إلغاء + رجوع &gt; 30%)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border/70 mt-3">
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              عرض {filteredProducts.length} من أصل {products.length} منتج
            </span>
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/30 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> تصدير تقرير CSV
            </button>
          </div>
        </div>
      </div>

      {/* Main Products Table */}
      <ProductFulfillmentTable
        products={filteredProducts}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
      />
    </div>
  );
}
