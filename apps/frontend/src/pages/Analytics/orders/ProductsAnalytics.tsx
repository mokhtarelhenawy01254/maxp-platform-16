import React, { useMemo, useState } from "react";
import {
  ShoppingBag,
  Box,
  FileText,
  DollarSign,
  Star,
  BarChart3,
  Download,
  ChevronUp,
  ChevronDown,
  Search,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
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
import DeferredResponsiveContainer from "../../../components/ui/DeferredResponsiveContainer";
import analyticsService from "../../../services/analyticsService";
import { useCurrency } from "../../../hooks/useCurrency";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

const PIE_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16"];

const PERIOD_OPTIONS = [
  { value: "1", label: "اليوم" },
  { value: "2", label: "أمس" },
  { value: "7", label: "آخر 7 أيام" },
  { value: "14", label: "آخر 14 يوماً" },
  { value: "this_month", label: "هذا الشهر" },
  { value: "last_month", label: "الشهر السابق" },
  { value: "30", label: "آخر 30 يوماً" },
  { value: "60", label: "آخر شهرين" },
  { value: "90", label: "آخر 3 أشهر" },
  { value: "custom", label: "مخصص" },
];

const MONTH_PERIODS = new Set(["this_month", "last_month"]);

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthPeriodRange(period: string): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (period === "this_month") {
    return { start: formatDateInput(new Date(year, month, 1)), end: formatDateInput(now) };
  }
  return {
    start: formatDateInput(new Date(year, month - 1, 1)),
    end: formatDateInput(new Date(year, month, 0)),
  };
}

type SortKey = "quantitySold" | "orderCount" | "averagePrice" | "unitsPerOrder" | "revenue" | "productName" | "topVariation";
type SortDir = "asc" | "desc";

interface SalesProduct {
  productId: string;
  productName: string;
  productSku: string | null;
  productImage: string | null;
  quantitySold: number;
  orderCount: number;
  revenue: number;
  averagePrice: number;
  unitsPerOrder: number;
  topVariation?: string | null;
}

const ProductsAnalytics: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const [searchParams, setSearchParams] = useSearchParams();

  const [period, setPeriod] = useState(searchParams.get("period") || "30");
  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("quantitySold");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const isCustom = period === "custom";
  const monthRange = MONTH_PERIODS.has(period) ? getMonthPeriodRange(period) : null;
  const effectiveStartDate = isCustom ? (startDate || undefined) : (monthRange?.start || undefined);
  const effectiveEndDate = isCustom ? (endDate || undefined) : (monthRange?.end || undefined);
  const effectivePeriod = isCustom || monthRange ? undefined : period;

  React.useEffect(() => {
    const params: Record<string, string> = { period };
    if (isCustom && startDate) params.startDate = startDate;
    if (isCustom && endDate) params.endDate = endDate;
    setSearchParams(params, { replace: true });
  }, [period, startDate, endDate, isCustom, setSearchParams]);

  const query = useQuery({
    queryKey: ["analytics", "products", "sales-performance", period, effectiveStartDate, effectiveEndDate],
    queryFn: () => analyticsService.getProductSalesPerformance(effectivePeriod, effectiveStartDate, effectiveEndDate),
    select: (res) => (res?.success ? res.data : null),
    staleTime: 60_000,
  });

  const data = query.data;
  const products: SalesProduct[] = data?.products ?? [];
  const summary = data?.summary;

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? products.filter((p) => p.productName.toLowerCase().includes(q) || (p.productSku || "").toLowerCase().includes(q))
      : products;
    return [...list].sort((a, b) => {
      const aVal = sortKey === "productName" ? a.productName : sortKey === "topVariation" ? (a.topVariation || "") : a[sortKey];
      const bVal = sortKey === "productName" ? b.productName : sortKey === "topVariation" ? (b.topVariation || "") : b[sortKey];
      if (typeof aVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal as string, "ar") : (bVal as string).localeCompare(aVal as string, "ar");
      }
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [products, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const handleExport = () => {
    if (filteredProducts.length === 0) return;
    const rows = filteredProducts.map((p) => ({
      المنتج: p.productName,
      الباركود: p.productSku || "",
      النوع_الأعلى: p.topVariation || "-",
      الكمية_المباعة: p.quantitySold,
      عدد_الطلبات: p.orderCount,
      متوسط_السعر: p.averagePrice,
      الإيراد: p.revenue,
    }));
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((r: any) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products-sales-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Control Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-card border border-border/70 rounded-xl px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-indigo-500" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {t("productAnalytics.title", "تحليل مبيعات وأداء المنتجات")}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("productAnalytics.subtitle", "متابعة المنتجات الأكثر مبيعاً، إيرادات الأصناف، ومعدلات السحب")}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
              if (e.target.value !== "custom") { setStartDate(""); setEndDate(""); }
            }}
            className="rounded-md border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {isCustom && (
            <div className="flex items-center gap-1.5">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-2 py-1 text-xs bg-background border border-border/70 rounded-md font-mono" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-2 py-1 text-xs bg-background border border-border/70 rounded-md font-mono" />
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredProducts.length === 0} className="h-9 px-3 gap-1.5 text-xs border-border/70 text-muted-foreground hover:text-foreground">
            <Download className="h-3.5 w-3.5" />
            تصدير CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching} className="h-9 px-3 gap-1.5 text-xs border-border/70 text-muted-foreground hover:text-foreground">
            <RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      {query.isError && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm"><AlertCircle className="h-4 w-4 shrink-0" /><span>{t("productAnalytics.fetchError", "فشل تحميل إحصائيات المنتجات")}</span></div>
          <Button variant="outline" size="sm" onClick={() => query.refetch()} className="h-7 text-xs">إعادة المحاولة</Button>
        </div>
      )}

      {/* Telemetry Metrics Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>إجمالي المنتجات المباعة</span>
              <ShoppingBag className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{(summary?.totalProducts || 0).toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground mt-1">صنف نشط في المبيعات</div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>إجمالي القطع المسحوبة</span>
              <Box className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">{(summary?.totalQuantity || 0).toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground mt-1">قطعة منفذة</div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>إجمالي طلبات المنتجات</span>
              <FileText className="h-4 w-4 text-cyan-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{(summary?.totalOrders || 0).toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground mt-1">طلب شراء مكتمل</div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>إجمالي الإيراد</span>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{formatPrice(summary?.totalRevenue || 0)}</div>
            <div className="text-[11px] text-muted-foreground mt-1">قيمة المبيعات المحققة</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top 10 by Quantity */}
        <Card className="border-border/70 bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">الأكثر مبيعاً بالكمية (أعلى 10)</h3>
              </div>
              <span className="text-xs text-muted-foreground font-mono">حجم السحب</span>
            </div>
            <div className="h-[280px] w-full">
              <DeferredResponsiveContainer width="100%" height="100%">
                <BarChart data={products.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                  <XAxis type="number" stroke="currentColor" className="text-muted-foreground" fontSize={11} />
                  <YAxis dataKey="productName" type="category" stroke="currentColor" className="text-muted-foreground" fontSize={11} width={120} tickFormatter={(v) => v.length > 15 ? v.slice(0, 15) + "…" : v} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--foreground))" }} formatter={(val: any) => [Number(val).toLocaleString(), "قطعة"]} />
                  <Bar dataKey="quantitySold" fill="#4F46E5" radius={[0, 4, 4, 0]} />
                </BarChart>
              </DeferredResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Distribution Donut */}
        <Card className="border-border/70 bg-card">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-foreground">توزيع الإيراد على الأصناف الكبرى</h3>
              </div>
              <span className="text-xs text-muted-foreground font-mono">حصة الإيراد</span>
            </div>
            <div className="h-[280px] w-full">
              <DeferredResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={products.slice(0, 8)} dataKey="revenue" nameKey="productName" cx="50%" cy="50%" outerRadius={95} innerRadius={55} paddingAngle={3}>
                    {products.slice(0, 8).map((_, index) => (<Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--foreground))" }} formatter={(val: any) => [formatPrice(Number(val)), "الإيراد"]} />
                </PieChart>
              </DeferredResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <Card className="border-border/70 bg-card overflow-hidden">
        <div className="p-4 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث باسم المنتج أو الباركود…"
              className="w-full pr-8 pl-3 py-1.5 text-xs bg-background border border-border/70 rounded-md outline-none focus:ring-1 focus:ring-indigo-500 text-foreground"
            />
          </div>
          <span className="text-xs text-muted-foreground font-mono">{filteredProducts.length} صنف</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border/70">
              <tr>
                <th className="py-2.5 px-3 text-right font-medium cursor-pointer" onClick={() => toggleSort("productName")}>
                  <span className="inline-flex items-center gap-1">المنتج {sortKey === "productName" && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</span>
                </th>
                <th className="py-2.5 px-3 text-center font-medium">النوع الأكثر مبيعاً</th>
                <th className="py-2.5 px-3 text-center font-medium cursor-pointer" onClick={() => toggleSort("quantitySold")}>
                  <span className="inline-flex items-center gap-1">الكمية المباعة {sortKey === "quantitySold" && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</span>
                </th>
                <th className="py-2.5 px-3 text-center font-medium cursor-pointer" onClick={() => toggleSort("orderCount")}>
                  <span className="inline-flex items-center gap-1">الطلبات {sortKey === "orderCount" && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</span>
                </th>
                <th className="py-2.5 px-3 text-center font-medium">متوسط السعر</th>
                <th className="py-2.5 px-3 text-center font-medium cursor-pointer" onClick={() => toggleSort("revenue")}>
                  <span className="inline-flex items-center gap-1">إجمالي الإيراد {sortKey === "revenue" && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</span>
                </th>
                <th className="py-2.5 px-3 text-left font-medium">تفاصيل المتغيرات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredProducts.map((p) => (
                <tr key={p.productId} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-3">
                    <Link to={`/products/${p.productId}`} className="flex items-center gap-2 max-w-[260px] group">
                      {p.productImage && <img src={p.productImage} alt={p.productName} className="h-7 w-7 rounded-md object-cover shrink-0" />}
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{p.productName}</p>
                        {p.productSku && <p className="text-[10px] text-muted-foreground font-mono truncate">{p.productSku}</p>}
                      </div>
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {p.topVariation ? (
                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">{p.topVariation}</span>
                    ) : "-"}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-foreground">{p.quantitySold.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums text-muted-foreground">{p.orderCount.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums text-muted-foreground">{formatPrice(p.averagePrice)}</td>
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">{formatPrice(p.revenue)}</td>
                  <td className="py-2.5 px-3 text-left">
                    <Link
                      to={`/analytics/orders/variations?productId=${p.productId}&period=${period}`}
                      className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-500 font-medium"
                    >
                      المتغيرات <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ProductsAnalytics;
