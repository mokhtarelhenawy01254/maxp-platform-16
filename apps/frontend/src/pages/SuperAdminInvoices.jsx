import React, { useState, useEffect, useCallback } from "react";
import tokenManager from "../utils/tokenManager";
import { buildApiUrl } from "../utils/urlHelper";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "../components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "../components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "../components/ui/table";
import LoadingSpinner from "../components/ui/LoadingSpinner";

const SuperAdminInvoices = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const getAuthHeaders = (additionalHeaders = {}) => tokenManager.createAuthHeaders(additionalHeaders);
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState(0);

  const [filters, setFilters] = useState({
    search: "", status: "", type: "", dateFrom: "", dateTo: "", sortBy: "createdAt", sortOrder: "desc",
  });

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [formData, setFormData] = useState({
    companyId: "", subscriptionId: "", type: "SUBSCRIPTION", dueDate: "",
    items: [{ description: "", quantity: 1, unitPrice: 0 }], taxRate: 14, discountAmount: 0, notes: "", paymentTerms: "Net 30",
  });

  // ---- Order Invoices State (tab 2) ----
  const [orderInvoices, setOrderInvoices] = useState([]);
  const [orderStats, setOrderStats] = useState({});
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotalPages, setOrderTotalPages] = useState(1);
  const [orderViewOpen, setOrderViewOpen] = useState(false);
  const [selectedOrderInvoice, setSelectedOrderInvoice] = useState(null);
  const [companies, setCompanies] = useState([]);

  const [orderFilters, setOrderFilters] = useState({
    search: "", paymentStatus: "", companyId: "", dateFrom: "", dateTo: "",
  });

  useEffect(() => { fetchInvoices(); }, [page, filters]);

  useEffect(() => {
    if (activeTab === 2) {
      fetchOrderInvoices();
      if (companies.length === 0) fetchCompanies();
    }
  }, [activeTab, orderPage, orderFilters]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({ page: page.toString(), limit: "10", ...filters });
      const response = await fetch(buildApiUrl(`admin/invoices?${queryParams}`), { headers: getAuthHeaders({ "Content-Type": "application/json" }) });
      const data = await response.json();
      if (data.success) { setInvoices(data.data.invoices); setStats(data.data.stats); setTotalPages(data.data.pagination.pages); }
      else setError(data.message || "خطأ في جلب البيانات");
    } catch (error) { setError("خطأ في الاتصال بالخادم"); } finally { setLoading(false); }
  };

  const fetchOrderInvoices = async () => {
    try {
      setOrderLoading(true);
      setError("");
      const params = new URLSearchParams({
        page: orderPage.toString(), limit: "10",
        ...(orderFilters.search && { search: orderFilters.search }),
        ...(orderFilters.paymentStatus && { paymentStatus: orderFilters.paymentStatus }),
        ...(orderFilters.companyId && { companyId: orderFilters.companyId }),
        ...(orderFilters.dateFrom && { dateFrom: orderFilters.dateFrom }),
        ...(orderFilters.dateTo && { dateTo: orderFilters.dateTo }),
      });
      const response = await fetch(buildApiUrl(`admin/order-invoices?${params}`), {
        headers: getAuthHeaders({ "Content-Type": "application/json" })
      });
      const data = await response.json();
      if (data.success) {
        setOrderInvoices(data.data.invoices);
        setOrderStats(data.data.stats);
        setOrderTotalPages(data.data.pagination.pages);
      } else {
        setError(data.message || "خطأ في جلب فواتير الطلبات");
      }
    } catch (e) {
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setOrderLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch(buildApiUrl("admin/order-invoices/companies/list"), {
        headers: getAuthHeaders({ "Content-Type": "application/json" })
      });
      const data = await response.json();
      if (data.success) setCompanies(data.data);
    } catch (e) { /* silent */ }
  };

  const getStatusColor = (status) => {
    const colors = { DRAFT: "default", SENT: "info", PAID: "success", OVERDUE: "error", CANCELLED: "error", REFUNDED: "warning" };
    return colors[status] || "default";
  };

  const getStatusText = (status) => {
    const texts = { DRAFT: "مسودة", SENT: "مرسلة", PAID: "مدفوعة", OVERDUE: "متأخرة", CANCELLED: "ملغية", REFUNDED: "مستردة" };
    return texts[status] || status;
  };

  const getTypeText = (type) => {
    const texts = { SUBSCRIPTION: "اشتراك", ONE_TIME: "مرة واحدة", UPGRADE: "ترقية", DOWNGRADE: "تخفيض", REFUND: "استرداد" };
    return texts[type] || type;
  };

  const getOrderPaymentStatusText = (status) => {
    const texts = {
      PAID: "مدفوعة", COMPLETED: "مدفوعة", PENDING: "قيد الانتظار",
      CANCELLED: "ملغية", REFUNDED: "مستردة", PARTIALLY_PAID: "مدفوعة جزئياً",
      FAILED: "فشل الدفع",
    };
    return texts[String(status || "").toUpperCase()] || status || "غير محدد";
  };

  const getOrderPaymentStatusVariant = (status) => {
    const s = String(status || "").toUpperCase();
    if (s === "PAID" || s === "COMPLETED") return "default";
    if (s === "PENDING") return "secondary";
    if (s === "CANCELLED" || s === "FAILED") return "destructive";
    if (s === "REFUNDED" || s === "PARTIALLY_PAID") return "outline";
    return "secondary";
  };

  const formatPrice = (price, currency = "EGP") => {
    const num = Number(price || 0);
    return new Intl.NumberFormat("ar-EG", { style: "currency", currency }).format(num);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("ar-EG");
  };

  const handleFilterChange = (field, value) => { setFilters(prev => ({ ...prev, [field]: value })); setPage(1); };
  const handleOrderFilterChange = (field, value) => { setOrderFilters(prev => ({ ...prev, [field]: value })); setOrderPage(1); };

  const viewOrderInvoice = async (invoice) => {
    try {
      const response = await fetch(buildApiUrl(`admin/order-invoices/${invoice.id}`), {
        headers: getAuthHeaders({ "Content-Type": "application/json" })
      });
      const data = await response.json();
      if (data.success) {
        setSelectedOrderInvoice(data.data);
        setOrderViewOpen(true);
      }
    } catch (e) { /* silent */ }
  };

  if (activeTab !== 2 && loading && invoices.length === 0) {
    return <div className="flex justify-center items-center min-h-[400px]"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-4 w-full">
      {/* Header Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold tracking-tight text-foreground">النظام المركزي للفواتير</h1>
          <p className="text-xs text-muted-foreground">إدارة ومتابعة فواتير الاشتراكات والطلبات لشركات المنصة</p>
        </div>
        {activeTab === 0 && (
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="h-8.5 px-3 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-all active:scale-[0.98]"
          >
            فاتورة جديدة
          </Button>
        )}
      </div>

      {error && <Alert variant="destructive" className="mb-3"><AlertDescription>{error}</AlertDescription></Alert>}

      {/* Segmented Control Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/40 border border-border/60 rounded-lg w-fit">
        {["فواتير المنصة", "الإحصائيات", "فواتير الطلبات"].map((tab, i) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(i); setError(""); }}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === i
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ============ TAB 0: Platform Invoices ============ */}
      {activeTab === 0 && (
        <>
          {/* Linear Telemetry Strip */}
          <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60">
              <div className="p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="font-medium text-[11px]">إجمالي الفواتير</span>
                  <span className="size-1.5 rounded-full bg-indigo-500" />
                </div>
                <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                  {stats.total || 0}
                </div>
              </div>
              <div className="p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="font-medium text-[11px]">الفواتير المدفوعة</span>
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                </div>
                <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                  {stats.byStatus?.PAID?.count || 0}
                </div>
              </div>
              <div className="p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="font-medium text-[11px]">الفواتير المتأخرة</span>
                  <span className="size-1.5 rounded-full bg-rose-500" />
                </div>
                <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                  {stats.byStatus?.OVERDUE?.count || 0}
                </div>
              </div>
              <div className="p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="font-medium text-[11px]">إجمالي الإيرادات</span>
                  <span className="size-1.5 rounded-full bg-violet-500" />
                </div>
                <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                  {formatPrice(stats.totalRevenue || 0)}
                </div>
              </div>
            </div>
          </div>

          {/* Unified Table Chassis with Integrated Filter Bar */}
          <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
            <div className="p-3 border-b border-border/60 flex flex-wrap items-center gap-2 bg-muted/20">
              <Input
                placeholder="البحث برقم الفاتورة أو اسم الشركة..."
                value={filters.search}
                onChange={e => handleFilterChange("search", e.target.value)}
                className="h-8 text-xs max-w-xs bg-background"
              />
              <Select value={filters.status} onValueChange={v => handleFilterChange("status", v)}>
                <SelectTrigger className="h-8 text-xs w-28 bg-background"><SelectValue placeholder="الحالة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">الكل</SelectItem>
                  <SelectItem value="DRAFT">مسودة</SelectItem>
                  <SelectItem value="SENT">مرسلة</SelectItem>
                  <SelectItem value="PAID">مدفوعة</SelectItem>
                  <SelectItem value="OVERDUE">متأخرة</SelectItem>
                  <SelectItem value="CANCELLED">ملغية</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.type} onValueChange={v => handleFilterChange("type", v)}>
                <SelectTrigger className="h-8 text-xs w-28 bg-background"><SelectValue placeholder="النوع" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">الكل</SelectItem>
                  <SelectItem value="SUBSCRIPTION">اشتراك</SelectItem>
                  <SelectItem value="ONE_TIME">مرة واحدة</SelectItem>
                  <SelectItem value="UPGRADE">ترقية</SelectItem>
                  <SelectItem value="DOWNGRADE">تخفيض</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={e => handleFilterChange("dateFrom", e.target.value)}
                className="h-8 text-xs w-36 bg-background"
              />
              <Input
                type="date"
                value={filters.dateTo}
                onChange={e => handleFilterChange("dateTo", e.target.value)}
                className="h-8 text-xs w-36 bg-background"
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>الشركة</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>تاريخ الإصدار</TableHead>
                  <TableHead>تاريخ الاستحقاق</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map(invoice => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell><div><p className="font-medium">{invoice.company.name}</p><p className="text-xs text-muted-foreground">{invoice.company.email}</p></div></TableCell>
                    <TableCell><Badge variant="outline">{getTypeText(invoice.type)}</Badge></TableCell>
                    <TableCell><Badge variant={invoice.status === "PAID" ? "default" : invoice.status === "OVERDUE" ? "destructive" : "secondary"}>{getStatusText(invoice.status)}</Badge></TableCell>
                    <TableCell>{formatPrice(invoice.totalAmount, invoice.currency)}</TableCell>
                    <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                    <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => { setSelectedInvoice(invoice); setViewDialogOpen(true); }}>عرض</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && <div className="flex justify-center p-2 gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>السابق</Button>
              <span className="py-1 text-sm">صفحة {page} من {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>التالي</Button>
            </div>}
          </div>
        </>
      )}

      {/* ============ TAB 1: Statistics ============ */}
      {activeTab === 1 && (
        <div className="p-4 text-center text-muted-foreground">
          <p>الإحصائيات المتقدمة قيد التطوير</p>
        </div>
      )}

      {/* ============ TAB 2: Order Invoices ============ */}
      {activeTab === 2 && (
        <>
          {/* Order Invoices Telemetry Strip */}
          <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60">
              <div className="p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="font-medium text-[11px]">إجمالي فواتير الطلبات</span>
                  <span className="size-1.5 rounded-full bg-indigo-500" />
                </div>
                <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                  {orderStats.total || 0}
                </div>
              </div>
              <div className="p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="font-medium text-[11px]">مدفوعة</span>
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                </div>
                <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                  {(orderStats.byPaymentStatus?.PAID?.count || 0) + (orderStats.byPaymentStatus?.COMPLETED?.count || 0)}
                </div>
              </div>
              <div className="p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="font-medium text-[11px]">قيد الانتظار</span>
                  <span className="size-1.5 rounded-full bg-amber-500" />
                </div>
                <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                  {orderStats.byPaymentStatus?.PENDING?.count || 0}
                </div>
              </div>
              <div className="p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="font-medium text-[11px]">ملغية</span>
                  <span className="size-1.5 rounded-full bg-rose-500" />
                </div>
                <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                  {orderStats.byPaymentStatus?.CANCELLED?.count || 0}
                </div>
              </div>
              <div className="p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="font-medium text-[11px]">إجمالي الإيرادات</span>
                  <span className="size-1.5 rounded-full bg-violet-500" />
                </div>
                <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                  {formatPrice(orderStats.totalRevenue || 0)}
                </div>
              </div>
            </div>
          </div>

          {orderLoading ? (
            <div className="flex justify-center items-center min-h-[300px]"><LoadingSpinner size="lg" /></div>
          ) : (
            <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
              <div className="p-3 border-b border-border/60 flex flex-wrap items-center gap-2 bg-muted/20">
                <Input
                  placeholder="بحث (رقم فاتورة / عميل / شركة)..."
                  value={orderFilters.search}
                  onChange={e => handleOrderFilterChange("search", e.target.value)}
                  className="h-8 text-xs max-w-xs bg-background"
                />
                <Select value={orderFilters.companyId} onValueChange={v => handleOrderFilterChange("companyId", v)}>
                  <SelectTrigger className="h-8 text-xs w-36 bg-background"><SelectValue placeholder="الشركة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">كل الشركات</SelectItem>
                    {companies.map(c => (
                      <SelectItem key={c.companyId} value={c.companyId}>{c.companyName} ({c.invoiceCount})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={orderFilters.paymentStatus} onValueChange={v => handleOrderFilterChange("paymentStatus", v)}>
                  <SelectTrigger className="h-8 text-xs w-28 bg-background"><SelectValue placeholder="حالة الدفع" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">الكل</SelectItem>
                    <SelectItem value="PAID">مدفوعة</SelectItem>
                    <SelectItem value="COMPLETED">مدفوعة</SelectItem>
                    <SelectItem value="PENDING">قيد الانتظار</SelectItem>
                    <SelectItem value="CANCELLED">ملغية</SelectItem>
                    <SelectItem value="REFUNDED">مستردة</SelectItem>
                    <SelectItem value="PARTIALLY_PAID">مدفوعة جزئياً</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={orderFilters.dateFrom}
                  onChange={e => handleOrderFilterChange("dateFrom", e.target.value)}
                  className="h-8 text-xs w-36 bg-background"
                />
                <Input
                  type="date"
                  value={orderFilters.dateTo}
                  onChange={e => handleOrderFilterChange("dateTo", e.target.value)}
                  className="h-8 text-xs w-36 bg-background"
                />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الفاتورة</TableHead>
                    <TableHead>الشركة</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>حالة الدفع</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>تاريخ الإصدار</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">لا توجد فواتير طلبات</TableCell>
                    </TableRow>
                  ) : (
                    orderInvoices.map(inv => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium font-mono text-sm">{inv.invoiceNumber}</TableCell>
                        <TableCell><span className="font-medium">{inv.companyName}</span></TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{inv.customerName}</p>
                            {inv.customerPhone && <p className="text-xs text-muted-foreground">{inv.customerPhone}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getOrderPaymentStatusVariant(inv.paymentStatus)}>
                            {getOrderPaymentStatusText(inv.paymentStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">{formatPrice(inv.totalAmount, inv.currency)}</TableCell>
                        <TableCell>{formatDate(inv.issueDate)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => viewOrderInvoice(inv)}>عرض</Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {orderTotalPages > 1 && (
                <div className="flex justify-center p-2 gap-2">
                  <Button variant="outline" size="sm" disabled={orderPage <= 1} onClick={() => setOrderPage(p => p - 1)}>السابق</Button>
                  <span className="py-1 text-sm">صفحة {orderPage} من {orderTotalPages}</span>
                  <Button variant="outline" size="sm" disabled={orderPage >= orderTotalPages} onClick={() => setOrderPage(p => p + 1)}>التالي</Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ============ DIALOGS ============ */}

      {/* Create Invoice Dialog (Platform) */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>إنشاء فاتورة جديدة</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Input placeholder="معرف الشركة" value={formData.companyId} onChange={e => setFormData(p => ({ ...p, companyId: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="معرف الاشتراك (اختياري)" value={formData.subscriptionId} onChange={e => setFormData(p => ({ ...p, subscriptionId: e.target.value }))} />
              <Select value={formData.type} onValueChange={v => setFormData(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue placeholder="نوع الفاتورة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUBSCRIPTION">اشتراك</SelectItem>
                  <SelectItem value="ONE_TIME">مرة واحدة</SelectItem>
                  <SelectItem value="UPGRADE">ترقية</SelectItem>
                  <SelectItem value="DOWNGRADE">تخفيض</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input type="date" label="تاريخ الاستحقاق" value={formData.dueDate} onChange={e => setFormData(p => ({ ...p, dueDate: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>إلغاء</Button>
            <Button>إنشاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Platform Invoice Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>تفاصيل الفاتورة</DialogTitle></DialogHeader>
          {selectedInvoice && (
            <div className="grid grid-cols-2 gap-2">
              <div><p className="text-sm text-muted-foreground">رقم الفاتورة</p><p className="font-medium">{selectedInvoice.invoiceNumber}</p></div>
              <div><p className="text-sm text-muted-foreground">الشركة</p><p className="font-medium">{selectedInvoice.company.name}</p></div>
              <div><p className="text-sm text-muted-foreground">الحالة</p><Badge>{getStatusText(selectedInvoice.status)}</Badge></div>
              <div><p className="text-sm text-muted-foreground">المبلغ الإجمالي</p><p className="text-lg font-bold text-primary">{formatPrice(selectedInvoice.totalAmount, selectedInvoice.currency)}</p></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewDialogOpen(false)}>إغلاق</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Order Invoice Dialog */}
      <Dialog open={orderViewOpen} onOpenChange={setOrderViewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تفاصيل فاتورة الطلب</DialogTitle></DialogHeader>
          {selectedOrderInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div><p className="text-sm text-muted-foreground">رقم الفاتورة</p><p className="font-mono font-medium">{selectedOrderInvoice.invoiceNumber}</p></div>
                <div>
                  <p className="text-sm text-muted-foreground">الشركة</p>
                  <p className="font-medium">{selectedOrderInvoice.companyName}</p>
                  {selectedOrderInvoice.companyPhone && <p className="text-xs text-muted-foreground">{selectedOrderInvoice.companyPhone}</p>}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">العميل</p>
                  <p className="font-medium">{selectedOrderInvoice.customerName}</p>
                  {selectedOrderInvoice.customerPhone && <p className="text-xs text-muted-foreground">{selectedOrderInvoice.customerPhone}</p>}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">حالة الدفع</p>
                  <Badge variant={getOrderPaymentStatusVariant(selectedOrderInvoice.paymentStatus)}>
                    {getOrderPaymentStatusText(selectedOrderInvoice.paymentStatus)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">طريقة الدفع</p>
                  <p className="font-medium">{selectedOrderInvoice.paymentMethod || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">رقم الطلب</p>
                  <p className="font-medium font-mono">{selectedOrderInvoice.order?.orderNumber || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">تاريخ الإصدار</p>
                  <p className="font-medium">{formatDate(selectedOrderInvoice.issueDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المجموع الفرعي</p>
                  <p className="font-medium">{formatPrice(selectedOrderInvoice.subtotal, selectedOrderInvoice.currency)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الشحن</p>
                  <p className="font-medium">{formatPrice(selectedOrderInvoice.shipping, selectedOrderInvoice.currency)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الضريبة</p>
                  <p className="font-medium">{formatPrice(selectedOrderInvoice.tax, selectedOrderInvoice.currency)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الخصم</p>
                  <p className="font-medium">{formatPrice(selectedOrderInvoice.discount, selectedOrderInvoice.currency)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الإجمالي</p>
                  <p className="text-lg font-bold text-primary">{formatPrice(selectedOrderInvoice.totalAmount, selectedOrderInvoice.currency)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">مرات الطباعة</p>
                  <p className="font-medium">{selectedOrderInvoice.printCount || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">مرات الإرسال</p>
                  <p className="font-medium">{selectedOrderInvoice.emailCount || 0}</p>
                </div>
              </div>

              {selectedOrderInvoice.order?.orderItems?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">منتجات الطلب</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المنتج</TableHead>
                        <TableHead className="text-center">SKU</TableHead>
                        <TableHead className="text-center">الكمية</TableHead>
                        <TableHead className="text-left">السعر</TableHead>
                        <TableHead className="text-left">الإجمالي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrderInvoice.order.orderItems.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.productName}</TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">{item.productSku || "—"}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-left">{formatPrice(item.price)}</TableCell>
                          <TableCell className="text-left font-semibold">{formatPrice(item.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setOrderViewOpen(false)}>إغلاق</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminInvoices;
