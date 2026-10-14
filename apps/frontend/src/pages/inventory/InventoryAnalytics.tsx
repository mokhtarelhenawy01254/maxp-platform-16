import React, { useState, useEffect, useMemo } from "react";
import {
  Package,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ShieldAlert,
  BarChart3,
  Layers,
  Search,
  Warehouse,
  Boxes,
  MinusCircle,
} from "lucide-react";
import { companyAwareApi } from "../../services/companyAwareApi";
import { useCurrency } from "../../hooks/useCurrency";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

interface LowStockItem {
  id?: string;
  name: string;
  stock: number;
  sku?: string;
  category?: string;
}

interface InventoryStats {
  totalProducts: number;
  totalStock: number;
  totalValue: number;
  potentialRevenue: number;
  potentialProfit: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockItems: LowStockItem[];
  outOfStockItems: LowStockItem[];
}

const InventoryAnalytics: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "low" | "out">("all");

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await companyAwareApi.get("/reports/inventory-detailed");
      if (response.data?.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching inventory stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const totalProducts = stats?.totalProducts || 0;
  const totalStock = stats?.totalStock || 0;
  const totalValue = stats?.totalValue || 0;
  const potentialRevenue = stats?.potentialRevenue || 0;
  const potentialProfit = stats?.potentialProfit || 0;
  const lowCount = stats?.lowStockCount || 0;
  const outCount = stats?.outOfStockCount || 0;

  const profitMargin = potentialRevenue > 0
    ? Math.round((potentialProfit / potentialRevenue) * 100)
    : 0;

  const lowItems = useMemo(() => Array.isArray(stats?.lowStockItems) ? stats!.lowStockItems : [], [stats]);
  const outItems = useMemo(() => Array.isArray(stats?.outOfStockItems) ? stats!.outOfStockItems : [], [stats]);

  const combinedAlertItems = useMemo(() => {
    const list: (LowStockItem & { status: "low" | "out" })[] = [
      ...lowItems.map((item) => ({ ...item, status: "low" as const })),
      ...outItems.map((item) => ({ ...item, status: "out" as const })),
    ];
    return list.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(search.toLowerCase()));
      if (!matchesSearch) return false;
      if (activeTab === "low") return item.status === "low";
      if (activeTab === "out") return item.status === "out";
      return true;
    });
  }, [lowItems, outItems, search, activeTab]);

  return (
    <div className="space-y-5" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                تحليلات المخزون والتقييم المالي
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                مؤشرات السيولة، القيمة التقديرية للتكلفة والأرباح، ومراقبة نفاد المخزون
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={loading}
            className="h-8 gap-1.5 text-xs font-mono"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            تحديث المؤشرات
          </Button>
        </div>
      </div>

      {/* Telemetry Strip - 5 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-border/70 shadow-sm bg-card">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>قيمة المخزون (بالتكلفة)</span>
              <DollarSign className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-foreground">
              {loading ? "..." : formatPrice(totalValue)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>متوسط القطعة:</span>
              <span className="font-mono text-foreground font-semibold">
                {totalStock > 0 ? formatPrice(totalValue / totalStock) : formatPrice(0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm bg-card">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>إيرادات بيع متوقعة</span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {loading ? "..." : formatPrice(potentialRevenue)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>هامش الربح:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                {profitMargin}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm bg-card">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>أرباح تقديرية للمخزون</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-primary">
              {loading ? "..." : formatPrice(potentialProfit)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              صافي الربح عند تصفية الرصيد
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm bg-card">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>إجمالي الوحدات بالمخزن</span>
              <Boxes className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-foreground">
              {loading ? "..." : totalStock.toLocaleString("en-US")}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              موزعة على {totalProducts} منتج
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm bg-card">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>تنبيهات النواقص</span>
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                {lowCount}
              </span>
              <span className="text-xs text-muted-foreground">منخفض /</span>
              <span className="text-lg font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
                {outCount}
              </span>
              <span className="text-xs text-muted-foreground">نافذ</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              تحتاج إعادة طلب عاجلة
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Single-Surface Workspace */}
      <div className="border border-border/70 rounded-xl bg-card overflow-hidden shadow-sm">
        {/* Controls Bar */}
        <div className="p-3 bg-muted/20 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg border border-border/60">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                activeTab === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              كل النواقص ({lowItems.length + outItems.length})
            </button>
            <button
              onClick={() => setActiveTab("low")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                activeTab === "low"
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              منخفض المخزون ({lowItems.length})
            </button>
            <button
              onClick={() => setActiveTab("out")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                activeTab === "out"
                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              نافذ بالكامل ({outItems.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="h-3.5 w-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="بحث بالمنتج أو رمز SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pr-9 pl-3 text-xs bg-background border-border/70"
            />
          </div>
        </div>

        {/* High-Density Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground text-[11px] font-medium">
              <tr>
                <th className="py-2.5 px-3.5">المنتج والرمز</th>
                <th className="py-2.5 px-3.5 text-center">الرصيد المتاح</th>
                <th className="py-2.5 px-3.5 text-center">مستوى الخطر</th>
                <th className="py-2.5 px-3.5 text-left">الإجراء الموصى به</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="py-4 px-3.5">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                    </td>
                  </tr>
                ))
              ) : combinedAlertItems.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-medium">لا توجد منتجات مطابقة لفلتر البحث</p>
                    <p className="text-[11px] mt-0.5">مستويات المخزون ضمن النطاق الآمن</p>
                  </td>
                </tr>
              ) : (
                combinedAlertItems.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3.5">
                      <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                        {item.name}
                      </div>
                      {item.sku && (
                        <div className="text-[11px] font-mono text-muted-foreground">
                          SKU: {item.sku}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded ${
                        item.status === "out"
                          ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                          : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                      }`}>
                        {item.status === "out" ? <MinusCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                        {item.stock} قطعة
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                        item.status === "out"
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                      }`}>
                        {item.status === "out" ? "مخزون نافذ بالكامل" : "دون الحد الأدنى"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-left">
                      <span className="text-[11px] text-muted-foreground">
                        {item.status === "out" ? "إصدار أمر شراء فوري للمورد" : "مراجعة معدل الاستهلاك والتجديد"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Ribbon */}
        <div className="p-2.5 bg-muted/10 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
          <div className="flex items-center gap-4">
            <span>إجمالي الأصناف المعروضة: <strong className="text-foreground font-mono">{combinedAlertItems.length}</strong></span>
            <span>الأصناف الآمنة بالمخزن: <strong className="text-foreground font-mono">{Math.max(0, totalProducts - lowCount - outCount)}</strong></span>
          </div>
          <div className="text-[11px]">
            يتم تحديث تقييم التكلفة والإيرادات تلقائياً مع كل حركة صرف أو استلام
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryAnalytics;
