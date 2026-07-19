import React, { useState, useEffect } from "react";
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

  useEffect(() => { fetchInvoices(); }, [page, filters]);

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

  const formatPrice = (price, currency = "EGP") => new Intl.NumberFormat("ar-EG", { style: "currency", currency }).format(price);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString("ar-EG");

  const handleFilterChange = (field, value) => { setFilters(prev => ({ ...prev, [field]: value })); setPage(1); };

  if (loading && invoices.length === 0) return <div className="flex justify-center items-center min-h-[400px]"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-2xl font-bold">إدارة الفواتير</h1>
        <Button onClick={() => setCreateDialogOpen(true)}>فاتورة جديدة</Button>
      </div>

      {error && <Alert variant="destructive" className="mb-3"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="border-b mb-3">
        <div className="flex gap-0">
          {["الفواتير", "الإحصائيات"].map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === i ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{tab}</button>
          ))}
        </div>
      </div>

      {activeTab === 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {[
              { label: "إجمالي الفواتير", value: stats.total || 0, color: "" },
              { label: "الفواتير المدفوعة", value: stats.byStatus?.PAID?.count || 0, color: "text-green-600" },
              { label: "الفواتير المتأخرة", value: stats.byStatus?.OVERDUE?.count || 0, color: "text-red-600" },
              { label: "إجمالي الإيرادات", value: formatPrice(stats.totalRevenue || 0), color: "text-primary" },
            ].map((card, i) => (
              <div key={i} className="rounded-xl border bg-card text-card-foreground p-4">
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border bg-card mb-3 p-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Input placeholder="البحث" value={filters.search} onChange={e => handleFilterChange("search", e.target.value)} />
              <Select value={filters.status} onValueChange={v => handleFilterChange("status", v)}>
                <SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger>
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
                <SelectTrigger><SelectValue placeholder="النوع" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">الكل</SelectItem>
                  <SelectItem value="SUBSCRIPTION">اشتراك</SelectItem>
                  <SelectItem value="ONE_TIME">مرة واحدة</SelectItem>
                  <SelectItem value="UPGRADE">ترقية</SelectItem>
                  <SelectItem value="DOWNGRADE">تخفيض</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={filters.dateFrom} onChange={e => handleFilterChange("dateFrom", e.target.value)} />
              <Input type="date" value={filters.dateTo} onChange={e => handleFilterChange("dateTo", e.target.value)} />
            </div>
          </div>

          <div className="rounded-xl border bg-card">
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
                    <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => { setSelectedInvoice(invoice); setViewDialogOpen(true); }}>عرض</Button></div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && <div className="flex justify-center p-2">صفحة {page} من {totalPages}</div>}
          </div>
        </>
      )}

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
    </div>
  );
};

export default SuperAdminInvoices;