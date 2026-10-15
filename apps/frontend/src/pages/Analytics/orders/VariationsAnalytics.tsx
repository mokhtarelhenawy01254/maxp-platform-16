import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import {
  Layers,
  Box,
  FileText,
  DollarSign,
  Download,
  ChevronUp,
  ChevronDown,
  Search,
  Filter,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import analyticsService from "../../../services/analyticsService";
import { useCurrency } from "../../../hooks/useCurrency";
import PeriodSelector, {
  PeriodRange,
  PeriodKey,
} from "../../../components/common/PeriodSelector";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { VariationsCharts, VariationDimension } from "./VariationsCharts";

interface VariationCombo {
  name: string;
  product: string;
  productId?: string;
  color?: string;
  size?: string;
  sales: number;
  revenue: number;
  orders?: number;
}

interface VariationStats {
  sizes: VariationDimension[];
  colors: VariationDimension[];
  topVariations: VariationCombo[];
  totalVariations: number;
  totalSales: number;
  totalRevenue: number;
  totalOrders: number;
  filteredProduct?: { id: string; name: string } | null;
}

type SortKey = "name" | "product" | "color" | "size" | "sales" | "revenue" | "orders";
type SortDir = "asc" | "desc";

const VariationsAnalytics: React.FC = () => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlPeriod = (searchParams.get("period") as PeriodKey) || "30";
  const urlProductId = searchParams.get("productId") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<PeriodRange | null>(null);
  const [stats, setStats] = useState<VariationStats | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("sales");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visibleCount, setVisibleCount] = useState(25);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await analyticsService.getVariationsAnalytics(
        range?.startDate,
        range?.endDate,
        urlProductId || undefined,
      );
      if (res?.success) {
        const d = res.data || {};
        const rawVariations: VariationCombo[] = (d.topVariations || d.variations || []).map((v: any) => ({
          name: v.name || "",
          product: v.product || "",
          productId: v.productId || "",
          color: v.color || "",
          size: v.size || "",
          sales: Number(v.sales ?? v.quantity ?? 0),
          revenue: Number(v.revenue ?? 0),
          orders: Number(v.orders ?? 0),
        }));
        setStats({
          sizes: (d.sizes || []).map((s: any) => ({ name: s.name || "", sales: Number(s.sales ?? s.quantity ?? 0), revenue: Number(s.revenue ?? 0) })),
          colors: (d.colors || []).map((c: any) => ({ name: c.name || "", sales: Number(c.sales ?? c.quantity ?? 0), revenue: Number(c.revenue ?? 0) })),
          topVariations: rawVariations,
          totalVariations: Number(d.totalVariations ?? rawVariations.length),
          totalSales: Number(d.totalSales ?? d.totalQuantity ?? 0),
          totalRevenue: Number(d.totalRevenue ?? 0),
          totalOrders: Number(d.totalOrders ?? 0),
          filteredProduct: d.filteredProduct || null,
        });
      }
    } catch (err: any) {
      console.error("VariationsAnalytics error:", err);
      setError("فشل تحميل إحصائيات المتغيرات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (range) fetchData();
  }, [range, urlProductId]);

  const handleClearProductFilter = () => {
    const params: Record<string, string> = {};
    if (range?.period) params.period = range.period;
    setSearchParams(params, { replace: true });
  };

  const filteredVariations = useMemo(() => {
    const list = stats?.topVariations || [];
    const q = search.trim().toLowerCase();
    const filtered = q
      ? list.filter((v) =>
          v.name.toLowerCase().includes(q) ||
          v.product.toLowerCase().includes(q) ||
          (v.color || "").toLowerCase().includes(q) ||
          (v.size || "").toLowerCase().includes(q),
        )
      : list;

    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey] ?? "";
      const bVal = b[sortKey] ?? "";
      if (typeof aVal === "string") {
        return sortDir === "asc" ? aVal.localeCompare(bVal as string, "ar") : (bVal as string).localeCompare(aVal as string, "ar");
      }
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [stats?.topVariations, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const handleExport = () => {
    if (filteredVariations.length === 0) return;
    const rows = filteredVariations.map((v) => ({
      النوع: v.name,
      المنتج: v.product,
      اللون: v.color || "-",
      المقاس: v.size || "-",
      المبيعات: v.sales,
      الإيراد: v.revenue,
    }));
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map((r: any) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `variations-analytics.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-card border border-border/70 rounded-xl px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-500" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              تحليل المتغيرات والألوان والمقاسات
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            رصد تفضيلات العملاء للألوان، توزيع المقاسات، والخلطات الأكثر مبيعاً
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <PeriodSelector
            initialPeriod={urlPeriod}
            onRangeChange={(newRange) => {
              setRange(newRange);
              const params: Record<string, string> = {};
              if (urlProductId) params.productId = urlProductId;
              if (newRange.period) params.period = newRange.period;
              setSearchParams(params, { replace: true });
            }}
          />
          <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredVariations.length === 0} className="h-9 px-3 gap-1.5 text-xs border-border/70 text-muted-foreground hover:text-foreground">
            <Download className="h-3.5 w-3.5" />
            تصدير CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="h-9 px-3 gap-1.5 text-xs border-border/70 text-muted-foreground hover:text-foreground">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Product Filter Banner */}
      {urlProductId && (
        <div className="flex items-center justify-between p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-foreground">
            <Filter className="h-4 w-4 text-indigo-500 shrink-0" />
            <span>
              تصفية خاصة بمنتج: <strong className="font-semibold">{stats?.filteredProduct?.name || stats?.topVariations?.[0]?.product || urlProductId}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleClearProductFilter} className="h-7 text-xs border-border/70">
              إلغاء التصفية
            </Button>
            <Link to={`/analytics/orders/products?period=${range?.period || urlPeriod}`} className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-muted text-muted-foreground hover:text-foreground border border-border/70">
              الرجوع للمنتجات <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm"><AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span></div>
          <Button variant="outline" size="sm" onClick={fetchData} className="h-7 text-xs">إعادة المحاولة</Button>
        </div>
      )}

      {/* Telemetry Metrics Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>إجمالي المتغيرات</span>
              <Layers className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{(stats?.totalVariations || 0).toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground mt-1">توليفة نشطة</div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>إجمالي المبيعات</span>
              <Box className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">{(stats?.totalSales || 0).toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground mt-1">قطعة منفذة</div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>إجمالي الطلبات</span>
              <FileText className="h-4 w-4 text-cyan-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground">{(stats?.totalOrders || 0).toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground mt-1">طلب شراء</div>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>إجمالي الإيرادات</span>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{formatPrice(stats?.totalRevenue || 0)}</div>
            <div className="text-[11px] text-muted-foreground mt-1">قيمة المبيعات المحققة</div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Charts Component */}
      <VariationsCharts sizes={stats?.sizes || []} colors={stats?.colors || []} />

      {/* Table Section */}
      <Card className="border-border/70 bg-card overflow-hidden">
        <div className="p-4 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-sm w-full">
            <Search className="h-3.5 w-3.5 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في المتغيرات أو اللون أو المقاس…"
              className="w-full pr-8 pl-3 py-1.5 text-xs bg-background border border-border/70 rounded-md outline-none focus:ring-1 focus:ring-indigo-500 text-foreground"
            />
          </div>
          <span className="text-xs text-muted-foreground font-mono">{filteredVariations.length} نوع</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border/70">
              <tr>
                <th className="py-2.5 px-3 text-right font-medium cursor-pointer" onClick={() => toggleSort("name")}>
                  <span className="inline-flex items-center gap-1">المتغير {sortKey === "name" && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</span>
                </th>
                <th className="py-2.5 px-3 text-right font-medium">المنتج</th>
                <th className="py-2.5 px-3 text-center font-medium">اللون</th>
                <th className="py-2.5 px-3 text-center font-medium">المقاس</th>
                <th className="py-2.5 px-3 text-center font-medium cursor-pointer" onClick={() => toggleSort("sales")}>
                  <span className="inline-flex items-center gap-1">المبيعات {sortKey === "sales" && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</span>
                </th>
                <th className="py-2.5 px-3 text-left font-medium cursor-pointer" onClick={() => toggleSort("revenue")}>
                  <span className="inline-flex items-center gap-1">الإيراد {sortKey === "revenue" && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredVariations.slice(0, visibleCount).map((v, idx) => (
                <tr key={idx} className="hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-foreground">{v.name || "-"}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{v.product}</td>
                  <td className="py-2.5 px-3 text-center">
                    {v.color ? <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-muted border border-border/70">{v.color}</span> : "-"}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    {v.size ? <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-muted border border-border/70">{v.size}</span> : "-"}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-foreground">{v.sales.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-left font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">{formatPrice(v.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredVariations.length > visibleCount && (
          <div className="p-3 border-t border-border/50 text-center">
            <Button variant="ghost" size="sm" onClick={() => setVisibleCount((c) => c + 25)} className="text-xs text-indigo-600">
              عرض المزيد ({filteredVariations.length - visibleCount} متبقٍ)
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default VariationsAnalytics;
