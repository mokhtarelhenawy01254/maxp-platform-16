import React, { useState, useEffect, useMemo } from "react";
import {
  FileSpreadsheet,
  RefreshCw,
  Search,
  DollarSign,
  Package,
  AlertTriangle,
  MinusCircle,
  CheckCircle2,
  BarChart2,
} from "lucide-react";
import { companyAwareApi } from "../../services/companyAwareApi";
import { useCurrency } from "../../hooks/useCurrency";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";

interface AggregatedProduct {
  productId: string;
  name: string;
  sku: string;
  price: number;
  totalStock: number;
  totalValue: number;
  status: "healthy" | "low" | "out";
}

const InventoryReports: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [products, setProducts] = useState<AggregatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "healthy" | "low" | "out">("all");

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await companyAwareApi.get("/inventory");
      if (res.data?.success) {
        const raw = Array.isArray(res.data.data) ? res.data.data : [];
        const agg: Record<string, AggregatedProduct> = {};
        raw.forEach((item: any) => {
          const pid = item.productId || item.id || `p-${Math.random()}`;
          const name = item.products?.name || item.name || "منتج عام";
          const sku = item.products?.sku || item.sku || "—";
          const price = Number(item.products?.price || item.price || 0);
          const qty = Number(item.quantity || 0);

          if (!agg[pid]) {
            agg[pid] = { productId: pid, name, sku, price, totalStock: 0, totalValue: 0, status: "healthy" };
          }
          agg[pid].totalStock += qty;
        });

        const list = Object.values(agg).map((p) => {
          let status: "healthy" | "low" | "out" = "healthy";
          if (p.totalStock === 0) status = "out";
          else if (p.totalStock <= 5) status = "low";
          return { ...p, totalValue: p.price * p.totalStock, status };
        });
        setProducts(list);
      }
    } catch (err) {
      console.error("Error fetching inventory reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const totalItems = products.length;
  const totalStock = products.reduce((acc, p) => acc + p.totalStock, 0);
  const totalValue = products.reduce((acc, p) => acc + p.totalValue, 0);
  const lowCount = products.filter((p) => p.status === "low").length;
  const outCount = products.filter((p) => p.status === "out").length;
  const healthyCount = products.filter((p) => p.status === "healthy").length;

  const hPct = totalItems > 0 ? Math.round((healthyCount / totalItems) * 100) : 0;
  const lPct = totalItems > 0 ? Math.round((lowCount / totalItems) * 100) : 0;
  const oPct = totalItems > 0 ? Math.round((outCount / totalItems) * 100) : 0;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => {
      const match = p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      if (!match) return false;
      if (statusFilter === "healthy") return p.status === "healthy";
      if (statusFilter === "low") return p.status === "low";
      if (statusFilter === "out") return p.status === "out";
      return true;
    });
  }, [products, search, statusFilter]);

  const cards = [
    { title: "إجمالي قيمة المخزون", val: formatPrice(totalValue), icon: DollarSign, color: "text-emerald-500", sub: `إجمالي ${totalStock.toLocaleString("en-US")} قطعة` },
    { title: "عدد الأصناف المسجلة", val: totalItems, icon: Package, color: "text-blue-500", sub: `متوسط الصنف: ${totalItems > 0 ? formatPrice(totalValue / totalItems) : formatPrice(0)}` },
    { title: "أصناف منخفضة (1-5)", val: lowCount, icon: AlertTriangle, color: "text-amber-500", sub: `تشكل ${lPct}% من المخزون` },
    { title: "أصناف نفذت (صفر)", val: outCount, icon: MinusCircle, color: "text-rose-500", sub: `تشكل ${oPct}% من المخزون` },
  ];

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">تقارير الأرصدة وتقييم المخزون</h1>
            <p className="text-xs text-muted-foreground mt-0.5">توزيع مستويات السيولة، القيمة التراكمية، وصحة الأرصدة في المستودعات</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading} className="h-8 gap-1.5 text-xs font-mono">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} /> تحديث التقارير
        </Button>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <Card key={i} className="border-border/70 shadow-sm bg-card">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{c.title}</span><c.icon className={`h-3.5 w-3.5 ${c.color}`} />
              </div>
              <div className="text-lg font-bold font-mono tabular-nums text-foreground">{loading ? "..." : c.val}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{c.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Health Bar Banner */}
      <div className="border border-border/70 rounded-xl bg-card p-3.5 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-foreground flex items-center gap-1.5"><BarChart2 className="h-3.5 w-3.5 text-primary" /> توزيع صحة المخزون العام</span>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> رصيد آمن ({hPct}%)</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500"></span> منخفض ({lPct}%)</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500"></span> نافذ ({oPct}%)</span>
          </div>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
          <div style={{ width: `${hPct}%` }} className="bg-emerald-500"></div>
          <div style={{ width: `${lPct}%` }} className="bg-amber-500"></div>
          <div style={{ width: `${oPct}%` }} className="bg-rose-500"></div>
        </div>
      </div>

      {/* Chassis */}
      <div className="border border-border/70 rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="p-3 bg-muted/20 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/60">
            <button onClick={() => setStatusFilter("all")} className={`px-2.5 py-1 text-xs rounded-md ${statusFilter === "all" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground"}`}>
              كل الأصناف ({products.length})
            </button>
            <button onClick={() => setStatusFilter("healthy")} className={`px-2.5 py-1 text-xs rounded-md ${statusFilter === "healthy" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium" : "text-muted-foreground"}`}>
              الرصيد الآمن ({healthyCount})
            </button>
            <button onClick={() => setStatusFilter("low")} className={`px-2.5 py-1 text-xs rounded-md ${statusFilter === "low" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium" : "text-muted-foreground"}`}>
              المنخفض ({lowCount})
            </button>
            <button onClick={() => setStatusFilter("out")} className={`px-2.5 py-1 text-xs rounded-md ${statusFilter === "out" ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 font-medium" : "text-muted-foreground"}`}>
              النافذ ({outCount})
            </button>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="h-3.5 w-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input type="text" placeholder="بحث باسم الصنف أو SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pr-9 pl-3 text-xs bg-background border-border/70" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground text-[11px] font-medium">
              <tr>
                <th className="py-2.5 px-3.5">المنتج والرمز</th>
                <th className="py-2.5 px-3.5 text-center">سعر الوحدة</th>
                <th className="py-2.5 px-3.5 text-center">الرصيد الإجمالي</th>
                <th className="py-2.5 px-3.5 text-center">القيمة التراكمية</th>
                <th className="py-2.5 px-3.5 text-center">حالة الصنف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (<tr key={i} className="animate-pulse"><td colSpan={5} className="py-4 px-3.5"><div className="h-4 bg-muted rounded w-3/4"></div></td></tr>))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" /><p className="font-medium">لا توجد أصناف مطابقة للبحث</p>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.productId} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-3.5">
                      <div className="font-semibold text-foreground text-sm">{p.name}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">SKU: {p.sku}</div>
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-mono font-medium text-foreground">{formatPrice(p.price)}</td>
                    <td className="py-2.5 px-3.5 text-center font-mono font-bold text-foreground">{p.totalStock} قطعة</td>
                    <td className="py-2.5 px-3.5 text-center font-mono font-bold text-primary">{formatPrice(p.totalValue)}</td>
                    <td className="py-2.5 px-3.5 text-center">
                      {p.status === "healthy" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" /> رصيد متوفر
                        </span>
                      ) : p.status === "low" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          <AlertTriangle className="h-3 w-3" /> دون الحد الأدنى
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                          <MinusCircle className="h-3 w-3" /> نافذ من المخزن
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-2.5 bg-muted/10 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
          <span>عدد الأصناف المعروضة: <strong className="text-foreground font-mono">{filtered.length}</strong></span>
          <span className="text-[11px]">يتم احتساب القيمة الإجمالية بضرب سعر الوحدة في مجموع الأرصدة بالمستودعات</span>
        </div>
      </div>
    </div>
  );
};

export default InventoryReports;
