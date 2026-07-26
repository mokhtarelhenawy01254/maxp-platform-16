import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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

  const fetchActivities = async () => { try { setLoading(true); const params = { page: page + 1, limit: rowsPerPage, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) }; const r = await apiClient.get("/activity/my-activities", { params }); if (r.data.success) { setActivities(r.data.data.activities); setTotalActivities(r.data.data.pagination.total); } } catch (err) { setError(err.response?.data?.message || t("employee.activity.fetchError")); } finally { setLoading(false); } };
  const fetchStats = async () => { try { const r = await apiClient.get("/activity/my-stats"); if (r.data.success) setStats(r.data.data); } catch {} };

  useEffect(() => { fetchActivities(); fetchStats(); }, [page, rowsPerPage, filters]);

  const getSeverityColor = (s) => ({ LOW: "success", MEDIUM: "info", HIGH: "warning", CRITICAL: "destructive" }[s] || "secondary");
  const getCategoryKey = (c) => ({ AUTH: "employee.activity.categoryAuth", ADS: "employee.activity.categoryAds", CONVERSATIONS: "employee.activity.categoryConversations", BILLING: "employee.activity.categoryBilling", SETTINGS: "employee.activity.categorySettings", SUPPORT: "employee.activity.categorySupport", FILES: "employee.activity.categoryFiles", USERS: "employee.activity.categoryUsers", COMPANY: "employee.activity.categoryCompany", REPORTS: "employee.activity.categoryReports" }[c] || c);
  const getActionKey = (a) => ({ CREATE: "employee.activity.actionCreate", UPDATE: "employee.activity.actionUpdate", DELETE: "employee.activity.actionDelete", LOGIN: "employee.activity.actionLogin", LOGOUT: "employee.activity.actionLogout", UPLOAD: "employee.activity.actionUpload", DOWNLOAD: "employee.activity.actionDownload", VIEW: "employee.activity.actionView", SEND: "employee.activity.actionSend", RECEIVE: "employee.activity.actionReceive", ACTIVATE: "employee.activity.actionActivate", DEACTIVATE: "employee.activity.actionDeactivate", APPROVE: "employee.activity.actionApprove", REJECT: "employee.activity.actionReject", EXPORT: "employee.activity.actionExport", IMPORT: "employee.activity.actionImport" }[a] || a);
  const getSeverityIcon = (s) => { if (s === "CRITICAL") return <AlertTriangle className="size-4" />; if (s === "HIGH") return <AlertTriangle className="size-4" />; return <Info className="size-4" />; };

  return (
    <div className="max-w-6xl 2xl:max-w-7xl mx-auto mt-4 mb-4 px-4">
      <h1 className="text-2xl font-bold mb-3">{t("employee.activity.title")}</h1>

      {stats && <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <Card><CardContent><p className="text-sm text-muted-foreground">{t("employee.activity.totalActivities")}</p><p className="text-2xl font-bold">{stats.totalActivities}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-muted-foreground">{t("employee.activity.lastActivity")}</p><p className="text-sm">{stats.lastActivity ? format(new Date(stats.lastActivity.createdAt), "PPp", { locale: ar }) : t("employee.activity.noActivity")}</p></CardContent></Card>
        <Card><CardContent><p className="text-sm text-muted-foreground">{t("employee.activity.topCategories")}</p><div className="flex flex-wrap gap-1 mt-1">{(stats.categoryStats || []).slice(0, 5).map(c => <Badge key={c._id} variant="outline">{t(getCategoryKey(c._id))}: {c.count}</Badge>)}</div></CardContent></Card>
      </div>}

      <Card className="mb-3"><CardContent><div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Select value={filters.category} onValueChange={v => setFilters(p => ({ ...p, category: v }))}><SelectTrigger><SelectValue placeholder={t("employee.activity.filterCategory")} /></SelectTrigger><SelectContent><SelectItem value="">{t("employee.activity.all")}</SelectItem><SelectItem value="AUTH">{t("employee.activity.categoryAuth")}</SelectItem><SelectItem value="CONVERSATIONS">{t("employee.activity.categoryConversations")}</SelectItem><SelectItem value="BILLING">{t("employee.activity.categoryBilling")}</SelectItem><SelectItem value="SETTINGS">{t("employee.activity.categorySettings")}</SelectItem></SelectContent></Select>
        <Select value={filters.severity} onValueChange={v => setFilters(p => ({ ...p, severity: v }))}><SelectTrigger><SelectValue placeholder={t("employee.activity.filterSeverity")} /></SelectTrigger><SelectContent><SelectItem value="">{t("employee.activity.all")}</SelectItem><SelectItem value="LOW">{t("employee.activity.severityLow")}</SelectItem><SelectItem value="MEDIUM">{t("employee.activity.severityMedium")}</SelectItem><SelectItem value="HIGH">{t("employee.activity.severityHigh")}</SelectItem><SelectItem value="CRITICAL">{t("employee.activity.severityCritical")}</SelectItem></SelectContent></Select>
        <Select value={filters.isSuccess} onValueChange={v => setFilters(p => ({ ...p, isSuccess: v }))}><SelectTrigger><SelectValue placeholder={t("employee.activity.filterStatus")} /></SelectTrigger><SelectContent><SelectItem value="">{t("employee.activity.all")}</SelectItem><SelectItem value="true">{t("employee.activity.statusSuccess")}</SelectItem><SelectItem value="false">{t("employee.activity.statusFailed")}</SelectItem></SelectContent></Select>
        <Input placeholder={String(t("employee.activity.searchPlaceholder"))} value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} />
        <Button variant="outline" onClick={() => {}}><Download className="size-4" /> {t("employee.activity.exportCsv")}</Button>
      </div></CardContent></Card>

      {error && <Alert variant="destructive" className="mb-2"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="rounded-xl border bg-card">
        <Table><TableHeader><TableRow><TableHead>{t("employee.activity.colDateTime")}</TableHead><TableHead>{t("employee.activity.colCategory")}</TableHead><TableHead>{t("employee.activity.colAction")}</TableHead><TableHead>{t("employee.activity.colDescription")}</TableHead><TableHead>{t("employee.activity.colSeverity")}</TableHead><TableHead>{t("employee.activity.colStatus")}</TableHead><TableHead>{t("employee.activity.colDetails")}</TableHead></TableRow></TableHeader>
          <TableBody>{loading ? <TableRow><TableCell colSpan={7} className="text-center py-6"><LoadingSpinner /></TableCell></TableRow> : activities.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center">{t("employee.activity.noActivities")}</TableCell></TableRow> : activities.map(a => <TableRow key={a._id}><TableCell>{format(new Date(a.createdAt), "PPp", { locale: ar })}</TableCell><TableCell><Badge variant="outline">{t(getCategoryKey(a.category))}</Badge></TableCell><TableCell>{t(getActionKey(a.action))}</TableCell><TableCell>{a.description}</TableCell><TableCell><Badge variant={getSeverityColor(a.severity)}>{getSeverityIcon(a.severity)} {a.severity}</Badge></TableCell><TableCell>{a.isSuccess ? <CheckCircle className="size-5 text-green-600" /> : <XCircle className="size-5 text-red-600" />}</TableCell><TableCell><Button variant="ghost" size="icon" onClick={() => { setSelectedActivity(a); setDialogOpen(true); }}><Eye className="size-4" /></Button></TableCell></TableRow>)}</TableBody>
        </Table>
        <div className="flex justify-between items-center p-2 text-sm text-muted-foreground">{t("employee.activity.total")}: {totalActivities}</div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>{t("employee.activity.detailsTitle")}</DialogTitle></DialogHeader>
        {selectedActivity && <div className="grid grid-cols-2 gap-2"><div><p className="text-sm text-muted-foreground">{t("employee.activity.colCategory")}</p><p>{t(getCategoryKey(selectedActivity.category))}</p></div><div><p className="text-sm text-muted-foreground">{t("employee.activity.colAction")}</p><p>{t(getActionKey(selectedActivity.action))}</p></div><div className="col-span-2"><p className="text-sm text-muted-foreground">{t("employee.activity.colDescription")}</p><p>{selectedActivity.description}</p></div><div><p className="text-sm text-muted-foreground">{t("employee.activity.colDateTime")}</p><p>{format(new Date(selectedActivity.createdAt), "PPpp", { locale: ar })}</p></div><div><p className="text-sm text-muted-foreground">{t("employee.activity.colStatus")}</p><p>{selectedActivity.isSuccess ? t("employee.activity.statusSuccess") : t("employee.activity.statusFailed")}</p></div></div>}
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>{t("employee.common.close")}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
};

export default MyActivity;