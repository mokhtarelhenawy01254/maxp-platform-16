import React, { useState, useEffect } from "react";
import tokenManager from "../utils/tokenManager";
import { buildApiUrl } from "../utils/urlHelper";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "../components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "../components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../components/ui/table";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { CreditCard, Plus, RefreshCw, Search } from "lucide-react";

const SuperAdminPayments = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const getAuthHeaders = (additionalHeaders = {}) => tokenManager.createAuthHeaders(additionalHeaders);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ search: "", status: "", method: "", dateFrom: "", dateTo: "", sortBy: "createdAt", sortOrder: "desc" });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => { fetchPayments(); }, [page, filters]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({ page: page.toString(), limit: "10", ...filters });
      const response = await fetch(buildApiUrl(`admin/payments?${queryParams}`), { headers: getAuthHeaders({ "Content-Type": "application/json" }) });
      const data = await response.json();
      if (data.success) { setPayments(data.data.payments || []); setStats(data.data.stats || {}); setTotalPages(data.data.pagination?.pages || 1); }
      else setError(data.message || "خطأ في جلب البيانات");
    } catch (error) { setError("خطأ في الاتصال بالخادم"); } finally { setLoading(false); }
  };

  const handleFilterChange = (field, value) => { setFilters(p => ({ ...p, [field]: value })); setPage(1); };
  const getStatusColor = (status) => { const c = { PENDING: "warning", COMPLETED: "success", FAILED: "error", CANCELLED: "error", REFUNDED: "info" }; return c[status] || "default"; };
  const getStatusText = (status) => { const t = { PENDING: "معلق", COMPLETED: "مكتمل", FAILED: "فاشل", CANCELLED: "ملغي", REFUNDED: "مسترد" }; return t[status] || status; };
  const getMethodText = (method) => { const t = { CREDIT_CARD: "بطاقة ائتمان", BANK_TRANSFER: "تحويل بنكي", PAYPAL: "باي بال", CASH: "نقدي" }; return t[method] || method; };
  const formatPrice = (price, currency = "EGP") => new Intl.NumberFormat("ar-EG", { style: "currency", currency }).format(price);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString("ar-EG");
  const formatDateTime = (dateString) => new Date(dateString).toLocaleString("ar-EG");

  if (loading && payments.length === 0) return <div className="flex justify-center items-center min-h-[400px]"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="w-full space-y-4" dir="rtl">
      {/* Linear Taste Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <CreditCard className="size-4 text-foreground/80" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                إدارة المدفوعات والمعاملات
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-mono tabular-nums text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {stats.total || payments.length} معاملة
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              سجل التحويلات والاشتراكات وشحن المحافظ لشركات المنصة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform shadow-xs"
          >
            <Plus className="size-3.5" />
            <span>تسجيل مدفوعة</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fetchPayments()}
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform"
          >
            <RefreshCw className="size-3.5" />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {error && <Alert variant="destructive" className="rounded-xl"><AlertDescription className="text-xs">{error}</AlertDescription></Alert>}

      {/* Unified Telemetry Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">إجمالي المعاملات</span>
            <span className="size-1.5 rounded-full bg-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
              {stats.total || payments.length}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">كل العمليات المسجلة</p>
        </div>

        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">المدفوعات المكتملة</span>
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.byStatus?.COMPLETED?.count || 0}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">معاملات معتمدة بنجاح</p>
        </div>

        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">المدفوعات المعلقة</span>
            <span className="size-1.5 rounded-full bg-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-amber-600 dark:text-amber-400">
              {stats.byStatus?.PENDING?.count || 0}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">بانتظار المراجعة والاعتماد</p>
        </div>

        <div className="p-3 sm:p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">إجمالي المبالغ المعتمدة</span>
            <span className="size-1.5 rounded-full bg-purple-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums tracking-tight text-foreground">
              {formatPrice(stats.byStatus?.COMPLETED?.amount || 0)}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">إجمالي الإيرادات المحصلة</p>
        </div>
      </div>

      {/* Streamlined Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-border/80 bg-card/40">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="size-3.5 absolute right-2.5 top-2.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="بحث بالرقم أو الشركة..."
            value={filters.search}
            onChange={e => handleFilterChange("search", e.target.value)}
            className="h-8 pr-8 text-xs font-mono bg-background/50"
          />
        </div>
        <Select value={filters.status} onValueChange={v => handleFilterChange("status", v)}>
          <SelectTrigger className="h-8 text-xs w-28 bg-background/50"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل الحالات</SelectItem>
            <SelectItem value="PENDING">معلق</SelectItem>
            <SelectItem value="COMPLETED">مكتمل</SelectItem>
            <SelectItem value="FAILED">فاشل</SelectItem>
            <SelectItem value="CANCELLED">ملغي</SelectItem>
            <SelectItem value="REFUNDED">مسترد</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.method} onValueChange={v => handleFilterChange("method", v)}>
          <SelectTrigger className="h-8 text-xs w-32 bg-background/50"><SelectValue placeholder="طريقة الدفع" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل الطرق</SelectItem>
            <SelectItem value="BANK_TRANSFER">تحويل بنكي</SelectItem>
            <SelectItem value="CREDIT_CARD">بطاقة ائتمان</SelectItem>
            <SelectItem value="PAYPAL">باي بال</SelectItem>
            <SelectItem value="CASH">نقدي</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={filters.dateFrom} onChange={e => handleFilterChange("dateFrom", e.target.value)} className="h-8 text-xs w-32 bg-background/50 font-mono" />
        <Input type="date" value={filters.dateTo} onChange={e => handleFilterChange("dateTo", e.target.value)} className="h-8 text-xs w-32 bg-background/50 font-mono" />
      </div>

      {/* Single Chassis Table */}
      <div className="rounded-xl border border-border/80 bg-card/40 shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/60 bg-muted/30">
              <TableHead className="text-right text-[11px] font-mono">رقم المعاملة</TableHead>
              <TableHead className="text-right text-[11px] font-mono">الشركة</TableHead>
              <TableHead className="text-right text-[11px] font-mono">المبلغ</TableHead>
              <TableHead className="text-right text-[11px] font-mono">طريقة الدفع</TableHead>
              <TableHead className="text-right text-[11px] font-mono">الحالة</TableHead>
              <TableHead className="text-right text-[11px] font-mono">التاريخ</TableHead>
              <TableHead className="text-left text-[11px] font-mono">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map(payment => (
              <TableRow key={payment.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                <TableCell className="font-mono text-xs font-semibold">{payment.paymentNumber || payment.id?.slice(0, 8)}</TableCell>
                <TableCell>
                  <p className="font-semibold text-xs text-foreground">{payment.company?.name || payment.companyName || "—"}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{payment.company?.email || ""}</p>
                </TableCell>
                <TableCell className="text-foreground font-mono font-bold text-xs">{formatPrice(payment.amount, payment.currency)}</TableCell>
                <TableCell><span className="text-xs font-medium text-muted-foreground">{getMethodText(payment.method)}</span></TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${
                    payment.status === "COMPLETED"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : payment.status === "PENDING"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                  }`}>
                    <span className={`size-1.5 rounded-full ${
                      payment.status === "COMPLETED" ? "bg-emerald-500" : payment.status === "PENDING" ? "bg-amber-500" : "bg-rose-500"
                    }`} />
                    {getStatusText(payment.status)}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{payment.paidAt ? formatDateTime(payment.paidAt) : formatDateTime(payment.createdAt)}</TableCell>
                <TableCell className="text-left">
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedPayment(payment); setViewDialogOpen(true); }} className="h-7 px-2 text-xs font-mono active:scale-[0.98]">
                    تفاصيل
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {totalPages > 1 && <div className="flex justify-center p-2 text-xs font-mono text-muted-foreground border-t border-border/60">صفحة {page} من {totalPages}</div>}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>تسجيل مدفوعة جديدة</DialogTitle></DialogHeader>
          <div className="grid gap-2">
            <Input placeholder="معرف الشركة" required />
            <div className="grid grid-cols-2 gap-2"><Input placeholder="معرف الفاتورة (اختياري)" /><Input placeholder="معرف الاشتراك (اختياري)" /></div>
            <div className="grid grid-cols-2 gap-2"><Input type="number" placeholder="المبلغ" required /><Input placeholder="بوابة الدفع (اختياري)" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateDialogOpen(false)}>إلغاء</Button><Button>تسجيل</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>تفاصيل المدفوعة</DialogTitle></DialogHeader>
          {selectedPayment && (
            <div className="grid grid-cols-2 gap-2">
              <div><p className="text-sm text-muted-foreground">رقم المدفوعة</p><p className="font-medium">{selectedPayment.paymentNumber}</p></div>
              <div><p className="text-sm text-muted-foreground">الشركة</p><p className="font-medium">{selectedPayment.company.name}</p></div>
              <div><p className="text-sm text-muted-foreground">المبلغ</p><p className="text-lg font-bold text-primary">{formatPrice(selectedPayment.amount, selectedPayment.currency)}</p></div>
              <div><p className="text-sm text-muted-foreground">طريقة الدفع</p><p>{getMethodText(selectedPayment.method)}</p></div>
              <div><p className="text-sm text-muted-foreground">الحالة</p><Badge>{getStatusText(selectedPayment.status)}</Badge></div>
              <div><p className="text-sm text-muted-foreground">تاريخ الدفع</p><p>{selectedPayment.paidAt ? formatDateTime(selectedPayment.paidAt) : "غير محدد"}</p></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewDialogOpen(false)}>إغلاق</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminPayments;