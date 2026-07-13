import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
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
import { ar, enUS } from "date-fns/locale";
import { apiClient } from "../services/apiClient";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { Eye, Download, CheckCircle, XCircle, Info, TrendingUp, AlertTriangle } from "lucide-react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

const CompanyActivity = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalActivities, setTotalActivities] = useState(0);
  const [filters, setFilters] = useState({ userId: "", category: "", action: "", severity: "", isSuccess: "", startDate: "", endDate: "", search: "" });
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchActivities = async () => { try { setLoading(true); const params = { page: page + 1, limit: rowsPerPage, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) }; const r = await apiClient.get("/activity/company/activities", { params }); if (r.data.success) { setActivities(r.data.data.activities); setTotalActivities(r.data.data.pagination.total); } } catch (err) { setError(err.response?.data?.message || t("companyActivity.errors.fetchFailed")); } finally { setLoading(false); } };
  const fetchStats = async () => { try { const r = await apiClient.get("/activity/company/stats"); if (r.data.success) setStats(r.data.data); } catch {} };
  useEffect(() => { fetchActivities(); fetchStats(); }, [page, rowsPerPage, filters]);

  const getSeverityColor = (s) => ({ LOW: "success", MEDIUM: "info", HIGH: "warning", CRITICAL: "destructive" }[s] || "secondary");
  const getSeverityLabel = (s) => t(`companyActivity.severity.${s}`) || s;
  const getCategoryLabel = (c) => t(`companyActivity.categories.${c}`) || c;
  const getActionLabel = (a) => t(`companyActivity.actions.${a}`) || a;
  const formatNumber = (num) => (num ?? 0).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US");

  const prepareCategoryChartData = () => stats?.categoryStats?.map(c => ({ name: getCategoryLabel(c._id), value: c.totalCount })) || [];
  const prepareDailyChartData = () => (stats?.dailyStats || []).reverse().map(d => ({ date: format(new Date(d._id), "dd/MM", { locale: isRtl ? ar : enUS }), [t("companyActivity.charts.success")]: d.successCount, [t("companyActivity.charts.failure")]: d.failureCount, [t("companyActivity.charts.total")]: d.count }));

  return (
    <div className="max-w-6xl 2xl:max-w-7xl mx-auto mt-4 mb-4">
      <h1 className="text-2xl font-bold mb-3" style={{ textAlign: isRtl ? "right" : "left" }}>📊 {t("companyActivity.title")}</h1>

      <div className="flex gap-0 mb-3 border-b" dir={isRtl ? "rtl" : "ltr"}>
        {[t("companyActivity.tabs.dashboard"), t("companyActivity.tabs.allActivities"), t("companyActivity.tabs.mostActiveUsers"), t("companyActivity.tabs.criticalActivities")].map((tab, i) => <button key={tab} onClick={() => setTabValue(i)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tabValue === i ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{tab}</button>)}
      </div>

      {tabValue === 0 && stats && <><div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        {[{ l: t("companyActivity.stats.totalActivities"), v: formatNumber(stats.totalActivities) }, { l: t("companyActivity.stats.activeUsers"), v: formatNumber(stats.mostActiveUsers?.length || 0) }, { l: t("companyActivity.stats.criticalActivities"), v: formatNumber(stats.severityStats?.find(s => s._id === "CRITICAL")?.count || 0), c: "text-red-500" }, { l: t("companyActivity.stats.highSeverity"), v: formatNumber(stats.severityStats?.find(s => s._id === "HIGH")?.count || 0), c: "text-yellow-600" }].map((card, i) => <Card key={i}><CardContent><p className="text-sm text-muted-foreground">{card.l}</p><p className={`text-2xl font-bold ${card.c || ""}`}>{card.v}</p></CardContent></Card>)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <Card><CardContent><h3 className="text-sm font-bold mb-2">{t("companyActivity.charts.distributionByCategory")}</h3><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={prepareCategoryChartData()} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${formatNumber(Math.round(percent * 100))}%`} outerRadius={80} dataKey="value">{prepareCategoryChartData().map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><RechartsTooltip /></PieChart></ResponsiveContainer></CardContent></Card>
        <Card><CardContent><h3 className="text-sm font-bold mb-2">{t("companyActivity.charts.dailyActivities")}</h3><ResponsiveContainer width="100%" height={300}><LineChart data={prepareDailyChartData()}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><RechartsTooltip /><Legend /><Line type="monotone" dataKey={t("companyActivity.charts.total")} stroke="#8884d8" /><Line type="monotone" dataKey={t("companyActivity.charts.success")} stroke="#82ca9d" /><Line type="monotone" dataKey={t("companyActivity.charts.failure")} stroke="#ff8042" /></LineChart></ResponsiveContainer></CardContent></Card>
      </div></>}

      {tabValue === 1 && <><Card className="mb-3 p-3"><div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Select value={filters.category} onValueChange={v => setFilters(p => ({ ...p, category: v }))}><SelectTrigger><SelectValue placeholder={t("companyActivity.filters.category")} /></SelectTrigger><SelectContent><SelectItem value="">{t("companyActivity.filters.all")}</SelectItem><SelectItem value="AUTH">{t("companyActivity.categories.AUTH")}</SelectItem><SelectItem value="CONVERSATIONS">{t("companyActivity.categories.CONVERSATIONS")}</SelectItem><SelectItem value="BILLING">{t("companyActivity.categories.BILLING")}</SelectItem><SelectItem value="SETTINGS">{t("companyActivity.categories.SETTINGS")}</SelectItem></SelectContent></Select>
        <Select value={filters.severity} onValueChange={v => setFilters(p => ({ ...p, severity: v }))}><SelectTrigger><SelectValue placeholder={t("companyActivity.filters.severity")} /></SelectTrigger><SelectContent><SelectItem value="">{t("companyActivity.filters.all")}</SelectItem><SelectItem value="LOW">{t("companyActivity.severity.LOW")}</SelectItem><SelectItem value="MEDIUM">{t("companyActivity.severity.MEDIUM")}</SelectItem><SelectItem value="HIGH">{t("companyActivity.severity.HIGH")}</SelectItem><SelectItem value="CRITICAL">{t("companyActivity.severity.CRITICAL")}</SelectItem></SelectContent></Select>
        <Select value={filters.isSuccess} onValueChange={v => setFilters(p => ({ ...p, isSuccess: v }))}><SelectTrigger><SelectValue placeholder={t("companyActivity.filters.status")} /></SelectTrigger><SelectContent><SelectItem value="">{t("companyActivity.filters.all")}</SelectItem><SelectItem value="true">{t("companyActivity.charts.success")}</SelectItem><SelectItem value="false">{t("companyActivity.charts.failure")}</SelectItem></SelectContent></Select>
        <Input placeholder={t("companyActivity.filters.search")} value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} />
        <Button variant="outline" onClick={() => {}}><Download className="size-4" /> {t("companyActivity.filters.exportCsv")}</Button>
      </div></Card>

      {error && <Alert variant="destructive" className="mb-2" onClose={() => setError(null)}><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="rounded-xl border bg-card">
        <Table><TableHeader><TableRow><TableHead>{t("companyActivity.table.user")}</TableHead><TableHead>{t("companyActivity.table.dateTime")}</TableHead><TableHead>{t("companyActivity.table.category")}</TableHead><TableHead>{t("companyActivity.table.action")}</TableHead><TableHead>{t("companyActivity.table.description")}</TableHead><TableHead>{t("companyActivity.table.severity")}</TableHead><TableHead>{t("companyActivity.table.status")}</TableHead><TableHead>{t("companyActivity.table.details")}</TableHead></TableRow></TableHeader>
          <TableBody>{loading ? <TableRow><TableCell colSpan={8} className="text-center py-6"><LoadingSpinner /></TableCell></TableRow> : activities.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center">{t("companyActivity.table.noActivities")}</TableCell></TableRow> : activities.map(a => <TableRow key={a._id}>
            <TableCell><div className="flex items-center gap-1" style={{ flexDirection: isRtl ? "row-reverse" : "row" }}><Avatar className="size-8"><AvatarFallback>{a.userId?.name?.charAt(0) || "U"}</AvatarFallback></Avatar><div><p className="text-sm">{a.userId?.name || t("companyActivity.activityDetails.unknownUser")}</p><p className="text-xs text-muted-foreground">{a.userId?.email}</p></div></div></TableCell>
            <TableCell>{format(new Date(a.createdAt), "PPp", { locale: isRtl ? ar : enUS })}</TableCell>
            <TableCell><Badge variant="outline">{getCategoryLabel(a.category)}</Badge></TableCell>
            <TableCell>{getActionLabel(a.action)}</TableCell>
            <TableCell>{a.description}</TableCell>
            <TableCell><Badge variant={getSeverityColor(a.severity)}>{getSeverityLabel(a.severity)}</Badge></TableCell>
            <TableCell>{a.isSuccess ? <CheckCircle className="size-5 text-green-600" /> : <XCircle className="size-5 text-red-600" />}</TableCell>
            <TableCell><Button variant="ghost" size="icon" onClick={() => { setSelectedActivity(a); setDialogOpen(true); }}><Eye className="size-4" /></Button></TableCell>
          </TableRow>)}</TableBody></Table>
      </div></>}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent><DialogHeader><DialogTitle>{t("companyActivity.activityDetails.title")}</DialogTitle></DialogHeader>
        {selectedActivity && <div className="grid grid-cols-2 gap-2"><div><p className="text-sm text-muted-foreground">{t("companyActivity.table.user")}</p><div className="flex items-center gap-1 mt-1"><Avatar className="size-8"><AvatarFallback>{selectedActivity.userId?.name?.charAt(0) || "U"}</AvatarFallback></Avatar><div><p>{selectedActivity.userId?.name || t("companyActivity.activityDetails.unknownUser")}</p><p className="text-xs text-muted-foreground">{selectedActivity.userId?.email}</p></div></div></div><div><p className="text-sm text-muted-foreground">{t("companyActivity.filters.category")}</p><p>{getCategoryLabel(selectedActivity.category)}</p></div><div><p className="text-sm text-muted-foreground">{t("companyActivity.table.action")}</p><p>{getActionLabel(selectedActivity.action)}</p></div><div className="col-span-2"><p className="text-sm text-muted-foreground">{t("companyActivity.table.description")}</p><p>{selectedActivity.description}</p></div><div><p className="text-sm text-muted-foreground">{t("companyActivity.table.dateTime")}</p><p>{format(new Date(selectedActivity.createdAt), "PPpp", { locale: isRtl ? ar : enUS })}</p></div><div><p className="text-sm text-muted-foreground">{t("companyActivity.table.status")}</p><p>{selectedActivity.isSuccess ? `${t("companyActivity.charts.success")} ✅` : `${t("companyActivity.charts.failure")} ❌`}</p></div></div>}
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>{t("companyActivity.activityDetails.close")}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
};

export default CompanyActivity;