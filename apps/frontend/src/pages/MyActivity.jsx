import React, { useState, useEffect } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { apiClient } from "../services/apiClient";
import { Eye, Download, CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";

const MyActivity = () => {
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalActivities, setTotalActivities] = useState(0);
  const [filters, setFilters] = useState({ category: "", action: "", severity: "", isSuccess: "", startDate: "", endDate: "", search: "" });
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchActivities = async () => { try { setLoading(true); const params = { page: page + 1, limit: rowsPerPage, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) }; const r = await apiClient.get("/activity/my-activities", { params }); if (r.data.success) { setActivities(r.data.data.activities); setTotalActivities(r.data.data.pagination.total); } } catch (err) { setError(err.response?.data?.message || "حدث خطأ أثناء جلب النشاطات"); } finally { setLoading(false); } };
  const fetchStats = async () => { try { const r = await apiClient.get("/activity/my-stats"); if (r.data.success) setStats(r.data.data); } catch {} };

  useEffect(() => { fetchActivities(); fetchStats(); }, [page, rowsPerPage, filters]);

  const getSeverityColor = (s) => ({ LOW: "success", MEDIUM: "info", HIGH: "warning", CRITICAL: "destructive" }[s] || "secondary");
  const getCategoryLabel = (c) => ({ AUTH: "المصادقة", ADS: "الإعلانات", CONVERSATIONS: "المحادثات", BILLING: "الفواتير", SETTINGS: "الإعدادات", SUPPORT: "الدعم الفني", FILES: "الملفات", USERS: "المستخدمين", COMPANY: "الشركة", REPORTS: "التقارير" }[c] || c);
  const getActionLabel = (a) => ({ CREATE: "إنشاء", UPDATE: "تعديل", DELETE: "حذف", LOGIN: "تسجيل دخول", LOGOUT: "تسجيل خروج", UPLOAD: "رفع", DOWNLOAD: "تحميل", VIEW: "عرض", SEND: "إرسال", RECEIVE: "استقبال", ACTIVATE: "تفعيل", DEACTIVATE: "إيقاف", APPROVE: "موافقة", REJECT: "رفض", EXPORT: "تصدير", IMPORT: "استيراد" }[a] || a);
  const getSeverityIcon = (s) => { if (s === "CRITICAL") return <AlertTriangle className="size-4" />; if (s === "HIGH") return <AlertTriangle className="size-4" />; return <Info className="size-4" />; };

  return (
    <div className="max-w-7xl mx-auto mt-4 mb-4 px-4">
      <h1 className="text-2xl font-bold mb-3">📊 نشاطاتي</h1>

      {stats && <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <Card><CardContent><p className="text-sm text-muted-foreground">إجمالي النشاطات</p><p className="text-2xl font-bold">{stats.totalActivities}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-muted-foreground">آخر نشاط</p><p className="text-sm">{stats.lastActivity ? format(new Date(stats.lastActivity.createdAt), "PPp", { locale: ar }) : "لا يوجد"}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-muted-foreground">التصنيفات الأكثر نشاطاً</p><div className="flex flex-wrap gap-1 mt-1">{(stats.categoryStats || []).slice(0, 5).map(c => <Badge key={c._id} variant="outline">{getCategoryLabel(c._id)}: {c.count}</Badge>)}</div></CardContent></Card>
      </div>}

      <Card className="mb-3"><CardContent><div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Select value={filters.category} onValueChange={v => setFilters(p => ({ ...p, category: v }))}><SelectTrigger><SelectValue placeholder="التصنيف" /></SelectTrigger><SelectContent><SelectItem value="">الكل</SelectItem><SelectItem value="AUTH">المصادقة</SelectItem><SelectItem value="CONVERSATIONS">المحادثات</SelectItem><SelectItem value="BILLING">الفواتير</SelectItem><SelectItem value="SETTINGS">الإعدادات</SelectItem></SelectContent></Select>
        <Select value={filters.severity} onValueChange={v => setFilters(p => ({ ...p, severity: v }))}><SelectTrigger><SelectValue placeholder="الخطورة" /></SelectTrigger><SelectContent><SelectItem value="">الكل</SelectItem><SelectItem value="LOW">منخفض</SelectItem><SelectItem value="MEDIUM">متوسط</SelectItem><SelectItem value="HIGH">عالي</SelectItem><SelectItem value="CRITICAL">حرج</SelectItem></SelectContent></Select>
        <Select value={filters.isSuccess} onValueChange={v => setFilters(p => ({ ...p, isSuccess: v }))}><SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger><SelectContent><SelectItem value="">الكل</SelectItem><SelectItem value="true">نجح</SelectItem><SelectItem value="false">فشل</SelectItem></SelectContent></Select>
        <Input placeholder="بحث" value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} />
        <Button variant="outline" onClick={() => {}}><Download className="size-4" /> تصدير CSV</Button>
      </div></CardContent></Card>

      {error && <Alert variant="destructive" className="mb-2"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="rounded-xl border bg-card">
        <Table><TableHeader><TableRow><TableHead>التاريخ والوقت</TableHead><TableHead>التصنيف</TableHead><TableHead>الإجراء</TableHead><TableHead>الوصف</TableHead><TableHead>الخطورة</TableHead><TableHead>الحالة</TableHead><TableHead>تفاصيل</TableHead></TableRow></TableHeader>
          <TableBody>{loading ? <TableRow><TableCell colSpan={7} className="text-center py-6"><LoadingSpinner /></TableCell></TableRow> : activities.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center">لا توجد نشاطات</TableCell></TableRow> : activities.map(a => <TableRow key={a._id}><TableCell>{format(new Date(a.createdAt), "PPp", { locale: ar })}</TableCell><TableCell><Badge variant="outline">{getCategoryLabel(a.category)}</Badge></TableCell><TableCell>{getActionLabel(a.action)}</TableCell><TableCell>{a.description}</TableCell><TableCell><Badge variant={getSeverityColor(a.severity)}>{getSeverityIcon(a.severity)} {a.severity}</Badge></TableCell><TableCell>{a.isSuccess ? <CheckCircle className="size-5 text-green-600" /> : <XCircle className="size-5 text-red-600" />}</TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => { setSelectedActivity(a); setDialogOpen(true); }}><Eye className="size-4" /></Button></TableCell></TableRow>)}</TableBody>
        </Table>
        <div className="flex justify-between items-center p-2 text-sm text-muted-foreground">إجمالي: {totalActivities}</div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>تفاصيل النشاط</DialogTitle></DialogHeader>
        {selectedActivity && <div className="grid grid-cols-2 gap-2"><div><p className="text-sm text-muted-foreground">التصنيف</p><p>{getCategoryLabel(selectedActivity.category)}</p></div><div><p className="text-sm text-muted-foreground">الإجراء</p><p>{getActionLabel(selectedActivity.action)}</p></div><div className="col-span-2"><p className="text-sm text-muted-foreground">الوصف</p><p>{selectedActivity.description}</p></div><div><p className="text-sm text-muted-foreground">التاريخ والوقت</p><p>{format(new Date(selectedActivity.createdAt), "PPpp", { locale: ar })}</p></div><div><p className="text-sm text-muted-foreground">الحالة</p><p>{selectedActivity.isSuccess ? "نجح ✅" : "فشل ❌"}</p></div></div>}
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>إغلاق</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
};

export default MyActivity;