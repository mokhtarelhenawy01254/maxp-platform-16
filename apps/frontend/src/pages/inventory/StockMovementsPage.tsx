import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  RotateCcw,
  SlidersHorizontal,
  Search,
  Calendar,
  RefreshCw,
  Package,
  Layers,
  FileText,
} from "lucide-react";
import { useDateFormat } from "../../hooks/useDateFormat";
import stockMovementsService, { StockMovementRecord } from "../../services/stockMovementsService";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: any; className: string }
> = {
  IN: {
    label: "وارد",
    icon: ArrowDownLeft,
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  },
  OUT: {
    label: "صادر",
    icon: ArrowUpRight,
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  },
  ADJUSTMENT: {
    label: "تعديل وجرد",
    icon: SlidersHorizontal,
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  },
  TRANSFER: {
    label: "مناقلة فروع",
    icon: ArrowLeftRight,
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  },
  RETURN: {
    label: "مرتجع",
    icon: RotateCcw,
    className: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  },
};

const StockMovementsPage: React.FC = () => {
  const { formatDate } = useDateFormat();
  const [movements, setMovements] = useState<StockMovementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const loadMovements = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {};
      if (typeFilter) params["type"] = typeFilter;
      if (search) params["search"] = search;
      if (dateFrom) params["startDate"] = dateFrom;
      if (dateTo) params["endDate"] = dateTo;
      const res = await stockMovementsService.getMovements(params);
      setMovements(Array.isArray(res.data) ? res.data : []);
    } catch (error: any) {
      toast.error(error?.message || "تعذر تحميل حركات المخزون");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
  }, [typeFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadMovements();
    }, 400);
    return () => clearTimeout(timeout);
  }, [search, dateFrom, dateTo]);

  const inCount = useMemo(() => movements.filter((m) => m.type === "IN").length, [movements]);
  const outCount = useMemo(() => movements.filter((m) => m.type === "OUT").length, [movements]);
  const adjustCount = useMemo(() => movements.filter((m) => m.type === "ADJUSTMENT").length, [movements]);
  const transferCount = useMemo(() => movements.filter((m) => m.type === "TRANSFER" || m.type === "RETURN").length, [movements]);

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                سجل حركات المخزون التفصيلية
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                تتبع الوارد والمنصرف، التسويات الجردية، وحركات النقل بين المستودعات
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMovements}
            disabled={loading}
            className="h-8 gap-1.5 text-xs font-mono"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            تحديث الحركات
          </Button>
        </div>
      </div>

      {/* Telemetry Strip - 4 Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/70 shadow-sm bg-card">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>إجمالي الحركات</span>
              <Layers className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-foreground">
              {loading ? "..." : movements.length}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              كل القيود المسجلة
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm bg-card">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>حركات وارد (IN)</span>
              <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {loading ? "..." : inCount}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              شحنات توريد واستلام
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm bg-card">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>حركات صادر (OUT)</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-rose-500" />
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
              {loading ? "..." : outCount}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              صرف طلبيات وشحن
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm bg-card">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>تسويات ومناقلات</span>
              <ArrowLeftRight className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-foreground">
              {loading ? "..." : adjustCount + transferCount}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              تعديل جرد ({adjustCount}) / تحويل ({transferCount})
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Single-Surface Workspace */}
      <div className="border border-border/70 rounded-xl bg-card overflow-hidden shadow-sm">
        {/* Controls Bar */}
        <div className="p-3 bg-muted/20 border-b border-border/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم المنتج، SKU، أو رقم المرجع..."
              className="h-8 pr-9 pl-3 text-xs bg-background border-border/70"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-md border border-border/70 bg-background text-foreground outline-none"
            >
              <option value="">كل أنواع الحركات</option>
              <option value="IN">وارد (IN)</option>
              <option value="OUT">صادر (OUT)</option>
              <option value="ADJUSTMENT">تعديل جرد (ADJUSTMENT)</option>
              <option value="TRANSFER">مناقلة بين الفروع (TRANSFER)</option>
              <option value="RETURN">مرتجع (RETURN)</option>
            </select>

            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 px-2 text-xs rounded-md border border-border/70 bg-background text-foreground outline-none font-mono"
              />
              <span className="text-muted-foreground text-xs">إلى</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 px-2 text-xs rounded-md border border-border/70 bg-background text-foreground outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground text-[11px] font-medium">
              <tr>
                <th className="py-2.5 px-3.5">التاريخ والوقت</th>
                <th className="py-2.5 px-3.5">المنتج والتفاصيل</th>
                <th className="py-2.5 px-3.5 text-center">نوع الحركة</th>
                <th className="py-2.5 px-3.5 text-center">الكمية</th>
                <th className="py-2.5 px-3.5">السبب / المبرر</th>
                <th className="py-2.5 px-3.5">المرجع</th>
                <th className="py-2.5 px-3.5 text-left">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="py-4 px-3.5">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                    </td>
                  </tr>
                ))
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-medium">لا توجد حركات مخزون مسجلة</p>
                    <p className="text-[11px] mt-0.5">جرّب تعديل الفلاتر أو تحديد نطاق زمني أوسع</p>
                  </td>
                </tr>
              ) : (
                movements.map((movement) => {
                  const cfg = TYPE_CONFIG[movement.type] || {
                    label: movement.type,
                    icon: Layers,
                    className: "bg-muted text-muted-foreground border-border/70",
                  };
                  const Icon = cfg.icon;
                  const qty = movement.type === "OUT" ? -Math.abs(movement.quantity) : Math.abs(movement.quantity);
                  return (
                    <tr key={movement.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-muted-foreground/60" />
                          {formatDate(movement.createdAt)}
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5">
                        <div className="font-semibold text-foreground text-sm">
                          {movement.product?.name || "صنف بدون اسم"}
                        </div>
                        {movement.product?.sku && (
                          <div className="text-[11px] font-mono text-muted-foreground">
                            SKU: {movement.product.sku}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${cfg.className}`}>
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </td>

                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                            qty < 0
                              ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                          }`}
                        >
                          {qty > 0 ? `+${qty}` : qty}
                        </span>
                      </td>

                      <td className="py-2.5 px-3.5 text-muted-foreground">
                        {movement.reason || "—"}
                      </td>

                      <td className="py-2.5 px-3.5 font-mono text-foreground text-xs">
                        {movement.reference ? (
                          <span className="bg-muted px-1.5 py-0.5 rounded text-[11px]">
                            {movement.reference}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3.5 text-left text-muted-foreground text-[11px] truncate max-w-[140px]" title={movement.notes}>
                        {movement.notes || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-muted/10 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
          <span>إجمالي السجلات المعروضة: <strong className="text-foreground font-mono">{movements.length}</strong></span>
          <span className="text-[11px]">تسجيل الحركات فوري ومرتبط بمزامنة الفواتير وأوامر الشراء</span>
        </div>
      </div>
    </div>
  );
};

export default StockMovementsPage;
