import React, { useState, useEffect, useMemo } from "react";
import {
  ClipboardCheck,
  RefreshCw,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Warehouse,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { companyAwareApi } from "../../services/companyAwareApi";
import { useDateFormat } from "../../hooks/useDateFormat";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";

interface AuditLog {
  id: string;
  type: string;
  quantity: number;
  userName: string;
  createdAt: string;
  notes?: string;
  isApproved: boolean;
  batchNumber?: string | null;
  products?: { name: string; sku: string };
  product?: { name: string; sku: string };
  warehouses?: { name: string };
}

const InventoryAudits: React.FC = () => {
  const { formatDateTime } = useDateFormat();
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved">("all");
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchAudits = async () => {
    try {
      setLoading(true);
      const res = await companyAwareApi.get("/inventory/movements");
      if (res.data?.success) setAudits(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      console.error("Error fetching inventory audits:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAudits(); }, []);

  const approveMovement = async (movementId: string) => {
    try {
      setApprovingId(movementId);
      const res = await companyAwareApi.post("/inventory/approve-movement", { movementId });
      if (res.data?.success) {
        toast.success("تم اعتماد حركة المخزون بنجاح");
        fetchAudits();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل في اعتماد الحركة");
    } finally {
      setApprovingId(null);
    }
  };

  const filteredAudits = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return audits.filter((a) => {
      const name = a.products?.name || a.product?.name || "";
      const sku = a.products?.sku || a.product?.sku || "";
      const matches = name.toLowerCase().includes(q) || sku.toLowerCase().includes(q) || (a.userName || "").toLowerCase().includes(q);
      if (!matches) return false;
      if (statusFilter === "pending") return !a.isApproved;
      if (statusFilter === "approved") return a.isApproved;
      return true;
    });
  }, [audits, searchTerm, statusFilter]);

  const pendingCount = useMemo(() => audits.filter((a) => !a.isApproved).length, [audits]);
  const approvedCount = useMemo(() => audits.filter((a) => a.isApproved).length, [audits]);
  const inCount = useMemo(() => audits.filter((a) => a.type.includes("IN") || a.type === "PURCHASE").length, [audits]);
  const outCount = useMemo(() => audits.filter((a) => a.type.includes("OUT") || a.type === "SALE").length, [audits]);

  const cards = [
    { title: "إجمالي الحركات", val: audits.length, icon: ClipboardCheck, color: "text-blue-500", sub: "كل قيود الجرد والترحيل" },
    { title: "بانتظار الاعتماد", val: pendingCount, icon: Clock, color: "text-amber-500", sub: "تحتاج موافقة المشرف", alert: true },
    { title: "حركات وارد", val: inCount, icon: ArrowDownLeft, color: "text-emerald-500", sub: "شحنات وتوريدات مستلمة" },
    { title: "حركات صادر", val: outCount, icon: ArrowUpRight, color: "text-rose-500", sub: "طلبيات شحن وتوزيع" },
  ];

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">تدقيق واعتماد حركات المخزون</h1>
            <p className="text-xs text-muted-foreground mt-0.5">مراقبة قيود الوارد والمنصرف والتحقق الرقابي للمستودعات</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAudits} disabled={loading} className="h-8 gap-1.5 text-xs font-mono">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
          تحديث السجل
        </Button>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <Card key={i} className="border-border/70 shadow-sm bg-card">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{c.title}</span>
                <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
              </div>
              <div className={`text-lg font-bold font-mono tabular-nums ${c.alert ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                {loading ? "..." : c.val}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{c.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table Chassis */}
      <div className="border border-border/70 rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="p-3 bg-muted/20 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border/60">
            <button onClick={() => setStatusFilter("all")} className={`px-2.5 py-1 text-xs rounded-md ${statusFilter === "all" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground"}`}>
              الكل ({audits.length})
            </button>
            <button onClick={() => setStatusFilter("pending")} className={`px-2.5 py-1 text-xs rounded-md ${statusFilter === "pending" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium" : "text-muted-foreground"}`}>
              بانتظار الاعتماد ({pendingCount})
            </button>
            <button onClick={() => setStatusFilter("approved")} className={`px-2.5 py-1 text-xs rounded-md ${statusFilter === "approved" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium" : "text-muted-foreground"}`}>
              المعتمدة ({approvedCount})
            </button>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="h-3.5 w-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input type="text" placeholder="بحث بالمنتج أو المسؤول..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-8 pr-9 pl-3 text-xs bg-background border-border/70" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/30 border-b border-border/70 text-muted-foreground text-[11px] font-medium">
              <tr>
                <th className="py-2.5 px-3.5">التاريخ والوقت</th>
                <th className="py-2.5 px-3.5">المنتج والتفاصيل</th>
                <th className="py-2.5 px-3.5">المستودع</th>
                <th className="py-2.5 px-3.5 text-center">الكمية والنوع</th>
                <th className="py-2.5 px-3.5 text-center">الحالة</th>
                <th className="py-2.5 px-3.5">المسؤول</th>
                <th className="py-2.5 px-3.5 text-left">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse"><td colSpan={7} className="py-4 px-3.5"><div className="h-4 bg-muted rounded w-3/4"></div></td></tr>
                ))
              ) : filteredAudits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <ClipboardCheck className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-medium">لا توجد حركات مطابقة للبحث</p>
                  </td>
                </tr>
              ) : (
                filteredAudits.map((a) => {
                  const p = a.products || a.product;
                  const isInc = a.type.includes("IN") || a.type === "PURCHASE";
                  return (
                    <tr key={a.id} className={`hover:bg-muted/20 transition-colors ${!a.isApproved ? "bg-amber-500/[0.03]" : ""}`}>
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                        <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3 text-muted-foreground/60" />{formatDateTime(a.createdAt)}</div>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="font-semibold text-foreground text-sm">{p?.name || "صنف بدون اسم"}</div>
                        {p?.sku && <div className="text-[11px] font-mono text-muted-foreground">SKU: {p.sku}</div>}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-1 text-foreground"><Warehouse className="h-3 w-3 text-muted-foreground" /><span>{a.warehouses?.name || "المستودع الرئيسي"}</span></div>
                        {a.batchNumber && <div className="text-[10px] font-mono text-muted-foreground">دفعة: {a.batchNumber}</div>}
                      </td>
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <span className={`inline-block font-mono font-bold text-xs px-2 py-0.5 rounded ${isInc ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border border-rose-500/20"}`}>
                          {isInc ? `+${a.quantity}` : `-${a.quantity}`}
                        </span>
                        <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{a.type}</div>
                      </td>
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        {a.isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> معتمد
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            <Clock className="h-3 w-3" /> بانتظار الموافقة
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-1 text-foreground"><User className="h-3 w-3 text-muted-foreground" /><span>{a.userName || "النظام"}</span></div>
                      </td>
                      <td className="py-2.5 px-3.5 text-left whitespace-nowrap">
                        {!a.isApproved ? (
                          <Button size="sm" onClick={() => approveMovement(a.id)} disabled={approvingId === a.id} className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-mono">
                            {approvingId === a.id ? "جاري..." : "اعتماد"}
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic truncate max-w-[120px] inline-block" title={a.notes}>{a.notes || "—"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-2.5 bg-muted/10 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
          <span>عدد السجلات: <strong className="text-foreground font-mono">{filteredAudits.length}</strong></span>
          <span className="text-[11px]">حركات الجرد المعتمدة تؤثر فورياً على تكلفة البضاعة المباعة وميزان الأرصدة</span>
        </div>
      </div>
    </div>
  );
};

export default InventoryAudits;
