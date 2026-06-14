import React, { useState, useEffect } from "react";
import tokenManager from "../utils/tokenManager";
import { buildApiUrl } from "../utils/urlHelper";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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

const SuperAdminSubscriptions = () => {
  const navigate = useNavigate();
  const getAuthHeaders = (a = {}) => tokenManager.createAuthHeaders(a);
  const [subscriptions, setSubscriptions] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ search: "", status: "", planType: "", sortBy: "createdAt", sortOrder: "desc" });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [formData, setFormData] = useState({ companyId: "", planType: "BASIC", billingCycle: "monthly", price: "", currency: "EGP", startDate: "", trialDays: 0, autoRenew: true });
  const [cancelData, setCancelData] = useState({ reason: "", immediate: false });
  const [renewData, setRenewData] = useState({ planType: "", price: "", billingCycle: "", immediate: false });

  useEffect(() => { fetchSubscriptions(); }, [page, filters]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({ page: page.toString(), limit: "10", ...filters });
      const response = await fetch(buildApiUrl(`admin/subscriptions?${queryParams}`), { headers: getAuthHeaders({ "Content-Type": "application/json" }) });
      const data = await response.json();
      if (data.success) { setSubscriptions(data.data.subscriptions); setStats(data.data.stats); setTotalPages(data.data.pagination.pages); }
      else setError(data.message || "خطأ في جلب البيانات");
    } catch (error) { setError("خطأ في الاتصال بالخادم"); } finally { setLoading(false); }
  };

  const handleFilterChange = (field, value) => { setFilters(p => ({ ...p, [field]: value })); setPage(1); };
  const getStatusText = (s) => ({ ACTIVE: "نشط", TRIAL: "تجريبي", INACTIVE: "غير نشط", CANCELLED: "ملغي", EXPIRED: "منتهي", SUSPENDED: "معلق" })[s] || s;
  const getStatusVariant = (s) => s === "ACTIVE" ? "default" : s === "TRIAL" ? "secondary" : s === "CANCELLED" || s === "EXPIRED" ? "destructive" : "outline";
  const getPlanText = (p) => ({ BASIC: "أساسية", PRO: "احترافية", ENTERPRISE: "مؤسسية" })[p] || p;
  const formatPrice = (price, currency = "EGP") => new Intl.NumberFormat("ar-EG", { style: "currency", currency }).format(price);
  const formatDate = (ds) => new Date(ds).toLocaleDateString("ar-EG");

  if (loading && subscriptions.length === 0) return <div className="flex justify-center items-center min-h-[400px]"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-3"><h1 className="text-2xl font-bold">إدارة الاشتراكات</h1><Button onClick={() => setCreateDialogOpen(true)}>اشتراك جديد</Button></div>
      {error && <Alert variant="destructive" className="mb-3"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        {[
          { l: "إجمالي الاشتراكات", v: stats.total || 0 }, { l: "الاشتراكات النشطة", v: stats.byStatus?.ACTIVE || 0, c: "text-green-600" },
          { l: "الاشتراكات التجريبية", v: stats.byStatus?.TRIAL || 0, c: "text-blue-600" }, { l: "الإيرادات الشهرية", v: formatPrice(stats.monthlyRevenue || 0), c: "text-primary" }
        ].map((card, i) => <div key={i} className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">{card.l}</p><p className={`text-xl font-bold ${card.c || ""}`}>{card.v}</p></div>)}
      </div>
      <div className="rounded-xl border bg-card mb-3 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Input placeholder="البحث" value={filters.search} onChange={e => handleFilterChange("search", e.target.value)} />
          <Select value={filters.status} onValueChange={v => handleFilterChange("status", v)}><SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger><SelectContent><SelectItem value="">الكل</SelectItem><SelectItem value="ACTIVE">نشط</SelectItem><SelectItem value="TRIAL">تجريبي</SelectItem><SelectItem value="INACTIVE">غير نشط</SelectItem><SelectItem value="CANCELLED">ملغي</SelectItem><SelectItem value="EXPIRED">منتهي</SelectItem></SelectContent></Select>
          <Select value={filters.planType} onValueChange={v => handleFilterChange("planType", v)}><SelectTrigger><SelectValue placeholder="نوع الخطة" /></SelectTrigger><SelectContent><SelectItem value="">الكل</SelectItem><SelectItem value="BASIC">أساسية</SelectItem><SelectItem value="PRO">احترافية</SelectItem><SelectItem value="ENTERPRISE">مؤسسية</SelectItem></SelectContent></Select>
          <Button variant="outline" onClick={fetchSubscriptions}>تحديث</Button>
        </div>
      </div>
      <div className="rounded-xl border bg-card">
        <Table><TableHeader><TableRow><TableHead>الشركة</TableHead><TableHead>نوع الخطة</TableHead><TableHead>الحالة</TableHead><TableHead>السعر</TableHead><TableHead>تاريخ البداية</TableHead><TableHead>التجديد التالي</TableHead><TableHead>الإجراءات</TableHead></TableRow></TableHeader>
          <TableBody>{subscriptions.map(sub => <TableRow key={sub.id}>
            <TableCell><p className="font-medium">{sub.company.name}</p><p className="text-xs text-muted-foreground">{sub.company.email}</p></TableCell>
            <TableCell><Badge variant="outline">{getPlanText(sub.planType)}</Badge></TableCell>
            <TableCell><Badge variant={getStatusVariant(sub.status)}>{getStatusText(sub.status)}</Badge></TableCell>
            <TableCell>{formatPrice(sub.price, sub.currency)}<span className="text-xs block">{sub.billingCycle === "monthly" ? "شهري" : "سنوي"}</span></TableCell>
            <TableCell>{formatDate(sub.startDate)}</TableCell>
            <TableCell>{sub.nextBillingDate ? formatDate(sub.nextBillingDate) : "-"}</TableCell>
            <TableCell><div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => navigate(`/super-admin/invoices?subscription=${sub.id}`)}>فواتير</Button>
              <Button variant="ghost" size="icon" onClick={() => navigate(`/super-admin/payments?subscription=${sub.id}`)}>مدفوعات</Button>
              {(sub.status === "ACTIVE" || sub.status === "EXPIRED") && <Button variant="ghost" size="icon" onClick={() => { setSelectedSubscription(sub); setRenewData({ planType: sub.planType, price: sub.price.toString(), billingCycle: sub.billingCycle, immediate: false }); setRenewDialogOpen(true); }}>تجديد</Button>}
              {sub.status !== "CANCELLED" && <Button variant="ghost" size="icon" onClick={() => { setSelectedSubscription(sub); setCancelDialogOpen(true); }}>إلغاء</Button>}
            </div></TableCell>
          </TableRow>)}</TableBody>
        </Table>
        {totalPages > 1 && <div className="flex justify-center p-2">صفحة {page} من {totalPages}</div>}
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}><DialogContent><DialogHeader><DialogTitle>إنشاء اشتراك جديد</DialogTitle></DialogHeader>
        <div className="grid gap-2">
          <Input placeholder="معرف الشركة" value={formData.companyId} onChange={e => setFormData(p => ({ ...p, companyId: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={formData.planType} onValueChange={v => setFormData(p => ({ ...p, planType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BASIC">أساسية</SelectItem><SelectItem value="PRO">احترافية</SelectItem><SelectItem value="ENTERPRISE">مؤسسية</SelectItem></SelectContent></Select>
            <Select value={formData.billingCycle} onValueChange={v => setFormData(p => ({ ...p, billingCycle: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">شهري</SelectItem><SelectItem value="yearly">سنوي</SelectItem></SelectContent></Select>
          </div>
          <div className="grid grid-cols-2 gap-2"><Input type="number" placeholder="السعر" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: parseFloat(e.target.value) }))} /><Input type="date" value={formData.startDate} onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))} /></div>
          <Input type="number" placeholder="أيام التجربة" value={formData.trialDays} onChange={e => setFormData(p => ({ ...p, trialDays: parseInt(e.target.value) }))} />
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setCreateDialogOpen(false)}>إلغاء</Button><Button>إنشاء</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
};

export default SuperAdminSubscriptions;