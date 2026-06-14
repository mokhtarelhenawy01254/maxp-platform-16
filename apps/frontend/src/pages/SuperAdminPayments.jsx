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
      if (data.success) { setPayments(data.data.payments); setStats(data.data.stats); setTotalPages(data.data.pagination.pages); }
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
    <div className="p-3">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-2xl font-bold">إدارة المدفوعات</h1>
        <Button onClick={() => setCreateDialogOpen(true)}>تسجيل مدفوعة</Button>
      </div>

      {error && <Alert variant="destructive" className="mb-3"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        {[
          { label: "إجمالي المدفوعات", value: stats.total || 0 },
          { label: "المدفوعات المكتملة", value: stats.byStatus?.COMPLETED?.count || 0, color: "text-green-600" },
          { label: "المدفوعات المعلقة", value: stats.byStatus?.PENDING?.count || 0, color: "text-yellow-600" },
          { label: "إجمالي المبالغ", value: formatPrice(stats.byStatus?.COMPLETED?.amount || 0), color: "text-primary" },
        ].map((card, i) => (
          <div key={i} className="rounded-xl border bg-card text-card-foreground p-4">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className={`text-xl font-bold ${card.color || ""}`}>{card.value}</p>
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
              <SelectItem value="PENDING">معلق</SelectItem>
              <SelectItem value="COMPLETED">مكتمل</SelectItem>
              <SelectItem value="FAILED">فاشل</SelectItem>
              <SelectItem value="CANCELLED">ملغي</SelectItem>
              <SelectItem value="REFUNDED">مسترد</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.method} onValueChange={v => handleFilterChange("method", v)}>
            <SelectTrigger><SelectValue placeholder="طريقة الدفع" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">الكل</SelectItem>
              <SelectItem value="BANK_TRANSFER">تحويل بنكي</SelectItem>
              <SelectItem value="CREDIT_CARD">بطاقة ائتمان</SelectItem>
              <SelectItem value="PAYPAL">باي بال</SelectItem>
              <SelectItem value="CASH">نقدي</SelectItem>
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
              <TableHead>رقم المدفوعة</TableHead>
              <TableHead>الشركة</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>طريقة الدفع</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>تاريخ الدفع</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map(payment => (
              <TableRow key={payment.id}>
                <TableCell><p className="font-medium">{payment.paymentNumber}</p></TableCell>
                <TableCell><p className="font-medium">{payment.company.name}</p><p className="text-xs text-muted-foreground">{payment.company.email}</p></TableCell>
                <TableCell className="text-primary font-bold">{formatPrice(payment.amount, payment.currency)}</TableCell>
                <TableCell><div className="flex items-center gap-1"><span>{getMethodText(payment.method)}</span></div></TableCell>
                <TableCell><Badge variant={payment.status === "COMPLETED" ? "default" : payment.status === "PENDING" ? "secondary" : "destructive"}>{getStatusText(payment.status)}</Badge></TableCell>
                <TableCell>{payment.paidAt ? formatDateTime(payment.paidAt) : formatDateTime(payment.createdAt)}</TableCell>
                <TableCell><Button variant="ghost" size="icon" onClick={() => { setSelectedPayment(payment); setViewDialogOpen(true); }}>عرض</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {totalPages > 1 && <div className="flex justify-center p-2">صفحة {page} من {totalPages}</div>}
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