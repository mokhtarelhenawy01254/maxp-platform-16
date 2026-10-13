import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
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
import { Eye, Download, CheckCircle, XCircle, Info, Activity, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { cn } from "../lib/utils";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

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

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const cleanedFilters = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v && v !== "ALL")
      );
      const params = { page: page + 1, limit: rowsPerPage, ...cleanedFilters };
      const r = await apiClient.get("/activity/company/activities", { params });
      if (r.data.success) {
        setActivities(r.data.data.activities || []);
        setTotalActivities(r.data.data.pagination?.total || 0);
      }
    } catch (err) {
      setError(err.response?.data?.message || t("companyActivity.errors.fetchFailed"));
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const r = await apiClient.get("/activity/company/stats");
      if (r.data.success) setStats(r.data.data);
    } catch {}
  };

  useEffect(() => {
    fetchActivities();
    fetchStats();
  }, [page, rowsPerPage, filters]);

  const getSeverityColor = (s) => ({ LOW: "success", MEDIUM: "info", HIGH: "warning", CRITICAL: "destructive" }[s] || "secondary");
  const getSeverityLabel = (s) => t(`companyActivity.severity.${s}`) || s;
  const getCategoryLabel = (c) => t(`companyActivity.categories.${c}`) || c;
  const getActionLabel = (a) => t(`companyActivity.actions.${a}`) || a;
  const formatNumber = (num) => (num ?? 0).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US");

  const prepareCategoryChartData = () => stats?.categoryStats?.map(c => ({ name: getCategoryLabel(c._id), value: c.totalCount })) || [];
  const prepareDailyChartData = () => (stats?.dailyStats || []).reverse().map(d => ({
    date: format(new Date(d._id), "dd/MM", { locale: isRtl ? ar : enUS }),
    [t("companyActivity.charts.success")]: d.successCount,
    [t("companyActivity.charts.failure")]: d.failureCount,
    [t("companyActivity.charts.total")]: d.count
  }));

  const tabLabels = [
    t("companyActivity.tabs.dashboard") || "لوحة النشاط",
    t("companyActivity.tabs.allActivities") || "كل العمليات",
    t("companyActivity.tabs.mostActiveUsers") || "أنشط الموظفين",
    t("companyActivity.tabs.criticalActivities") || "العمليات الحرجة"
  ];

  return (
    <div className="w-full space-y-4" dir={isRtl ? "rtl" : "ltr"}>
      {/* Linear Taste Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <Activity className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                {t("companyActivity.title") || "سجل نشاط وتدقيق الشركة"}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border border-border/80 bg-muted/30">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                سجل تدقيق
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              تتبع العمليات وسجلات الأمان والإجراءات الحساسة للموظفين لحظياً
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => { fetchActivities(); fetchStats(); }}
          disabled={loading}
          className="h-8 rounded-lg text-xs font-mono active:scale-[0.98] transition-transform"
        >
          <RefreshCw className={cn("ml-1.5 size-3.5", loading && "animate-spin")} />
          تحديث
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-2" onClose={() => setError(null)}>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Segmented Control Tabs */}
      <div className="flex items-center gap-1 p-1 bg-muted/40 border border-border/60 rounded-lg w-fit">
        {tabLabels.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setTabValue(i)}
            className={`px-3 py-1 rounded-md text-xs font-mono transition-all active:scale-[0.98] ${
              tabValue === i
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB 0: Dashboard */}
      {tabValue === 0 && stats && (
        <>
          {/* Telemetry Ribbon */}
          <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
            <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-medium text-[11px]">{t("companyActivity.stats.totalActivities")}</span>
                <span className="size-1.5 rounded-full bg-indigo-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                {formatNumber(stats.totalActivities)}
              </div>
            </div>

            <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-medium text-[11px]">{t("companyActivity.stats.activeUsers")}</span>
                <span className="size-1.5 rounded-full bg-emerald-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                {formatNumber(stats.mostActiveUsers?.length || 0)}
              </div>
            </div>

            <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-medium text-[11px]">{t("companyActivity.stats.criticalActivities")}</span>
                <span className="size-1.5 rounded-full bg-rose-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                {formatNumber(stats.severityStats?.find(s => s._id === "CRITICAL")?.count || 0)}
              </div>
            </div>

            <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-medium text-[11px]">{t("companyActivity.stats.highSeverity")}</span>
                <span className="size-1.5 rounded-full bg-amber-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {formatNumber(stats.severityStats?.find(s => s._id === "HIGH")?.count || 0)}
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/80 bg-card/40 p-4 shadow-xs">
              <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2">
                <h3 className="text-xs font-semibold text-foreground">{t("companyActivity.charts.distributionByCategory")}</h3>
                <span className="text-[10px] font-mono text-muted-foreground">توزيع الفئات</span>
              </div>
              <div className="h-[260px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={prepareCategoryChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${formatNumber(Math.round(percent * 100))}%`}
                      outerRadius={75}
                      dataKey="value"
                    >
                      {prepareCategoryChartData().map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-card/40 p-4 shadow-xs">
              <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2">
                <h3 className="text-xs font-semibold text-foreground">{t("companyActivity.charts.dailyActivities")}</h3>
                <span className="text-[10px] font-mono text-muted-foreground">آخر 7 أيام</span>
              </div>
              <div className="h-[260px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={prepareDailyChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RechartsTooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey={t("companyActivity.charts.total")} stroke="#6366f1" strokeWidth={2} />
                    <Line type="monotone" dataKey={t("companyActivity.charts.success")} stroke="#10b981" strokeWidth={1.5} />
                    <Line type="monotone" dataKey={t("companyActivity.charts.failure")} stroke="#ef4444" strokeWidth={1.5} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TAB 1 & Other Tabs: Table with Integrated Filters */}
      {tabValue >= 1 && (
        <div className="rounded-xl border border-border/80 bg-card/40 shadow-xs overflow-hidden">
          <div className="p-3 border-b border-border/60 flex flex-wrap items-center gap-2 bg-muted/20">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder={t("companyActivity.filters.search") || "البحث في العمليات..."}
                value={filters.search}
                onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                className="h-8 pr-8 text-xs bg-background"
              />
            </div>

            <Select value={filters.category || "ALL"} onValueChange={v => setFilters(p => ({ ...p, category: v }))}>
              <SelectTrigger className="h-8 text-xs w-32 bg-background">
                <SelectValue placeholder={t("companyActivity.filters.category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("companyActivity.filters.all") || "كل الفئات"}</SelectItem>
                <SelectItem value="AUTH">{t("companyActivity.categories.AUTH")}</SelectItem>
                <SelectItem value="CONVERSATIONS">{t("companyActivity.categories.CONVERSATIONS")}</SelectItem>
                <SelectItem value="BILLING">{t("companyActivity.categories.BILLING")}</SelectItem>
                <SelectItem value="SETTINGS">{t("companyActivity.categories.SETTINGS")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.severity || "ALL"} onValueChange={v => setFilters(p => ({ ...p, severity: v }))}>
              <SelectTrigger className="h-8 text-xs w-28 bg-background">
                <SelectValue placeholder={t("companyActivity.filters.severity")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("companyActivity.filters.all") || "كل المستويات"}</SelectItem>
                <SelectItem value="LOW">{t("companyActivity.severity.LOW")}</SelectItem>
                <SelectItem value="MEDIUM">{t("companyActivity.severity.MEDIUM")}</SelectItem>
                <SelectItem value="HIGH">{t("companyActivity.severity.HIGH")}</SelectItem>
                <SelectItem value="CRITICAL">{t("companyActivity.severity.CRITICAL")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.isSuccess || "ALL"} onValueChange={v => setFilters(p => ({ ...p, isSuccess: v }))}>
              <SelectTrigger className="h-8 text-xs w-28 bg-background">
                <SelectValue placeholder={t("companyActivity.filters.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("companyActivity.filters.all") || "كل الحالات"}</SelectItem>
                <SelectItem value="true">{t("companyActivity.charts.success") || "ناجح"}</SelectItem>
                <SelectItem value="false">{t("companyActivity.charts.failure") || "فشل"}</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => {}} className="h-8 text-xs font-mono active:scale-[0.98] transition-transform">
              <Download className="ml-1.5 size-3.5" />
              {t("companyActivity.filters.exportCsv") || "تصدير CSV"}
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-[11px] font-mono">{t("companyActivity.table.user")}</TableHead>
                <TableHead className="text-[11px] font-mono">{t("companyActivity.table.dateTime")}</TableHead>
                <TableHead className="text-[11px] font-mono">{t("companyActivity.table.category")}</TableHead>
                <TableHead className="text-[11px] font-mono">{t("companyActivity.table.action")}</TableHead>
                <TableHead className="text-[11px] font-mono">{t("companyActivity.table.description")}</TableHead>
                <TableHead className="text-[11px] font-mono text-center">{t("companyActivity.table.severity")}</TableHead>
                <TableHead className="text-[11px] font-mono text-center">{t("companyActivity.table.status")}</TableHead>
                <TableHead className="text-[11px] font-mono text-center w-16">{t("companyActivity.table.details")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <LoadingSpinner />
                  </TableCell>
                </TableRow>
              ) : activities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                    {t("companyActivity.table.noActivities") || "لا توجد أنشطة مسجلة"}
                  </TableCell>
                </TableRow>
              ) : (
                activities.map((a, idx) => (
                  <TableRow key={a._id || `act-${idx}`} className="hover:bg-muted/20 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6 border border-border/80">
                          <AvatarFallback className="text-[10px] font-mono font-medium">
                            {a.userId?.name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-medium text-foreground">{a.userId?.name || t("companyActivity.activityDetails.unknownUser")}</p>
                          {a.userId?.email && <p className="text-[10px] font-mono text-muted-foreground">{a.userId.email}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground tabular-nums">
                      {format(new Date(a.createdAt), "PPp", { locale: isRtl ? ar : enUS })}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border border-border/70 bg-muted/30">
                        {getCategoryLabel(a.category)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{getActionLabel(a.action)}</TableCell>
                    <TableCell className="text-xs text-foreground max-w-xs truncate">{a.description}</TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium",
                        a.severity === "CRITICAL" ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20" :
                        a.severity === "HIGH" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20" :
                        a.severity === "MEDIUM" ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20" :
                        "bg-muted text-muted-foreground border border-border/70"
                      )}>
                        <span className={cn(
                          "size-1.5 rounded-full",
                          a.severity === "CRITICAL" ? "bg-rose-500" :
                          a.severity === "HIGH" ? "bg-amber-500" :
                          a.severity === "MEDIUM" ? "bg-sky-500" : "bg-muted-foreground"
                        )} />
                        {getSeverityLabel(a.severity)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {a.isSuccess ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          ناجح
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-rose-600 dark:text-rose-400">
                          <span className="size-1.5 rounded-full bg-rose-500" />
                          فشل
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSelectedActivity(a); setDialogOpen(true); }}
                        className="size-7 p-0 active:scale-[0.98] transition-transform"
                      >
                        <Eye className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex justify-between items-center px-4 py-2 text-xs font-mono text-muted-foreground border-t border-border/60 bg-muted/10">
            <span>{t("companyActivity.total") || "إجمالي العمليات"}: {totalActivities}</span>
            <span>صفحة {page + 1}</span>
          </div>
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">{t("companyActivity.activityDetails.title") || "تفاصيل العملية"}</DialogTitle>
          </DialogHeader>
          {selectedActivity && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground">{t("companyActivity.table.user")}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Avatar className="size-6">
                    <AvatarFallback className="text-[10px]">{selectedActivity.userId?.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{selectedActivity.userId?.name || t("companyActivity.activityDetails.unknownUser")}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{selectedActivity.userId?.email}</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{t("companyActivity.filters.category")}</p>
                <p className="font-medium text-foreground mt-1">{getCategoryLabel(selectedActivity.category)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{t("companyActivity.table.action")}</p>
                <p className="font-mono text-foreground mt-1">{getActionLabel(selectedActivity.action)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{t("companyActivity.table.dateTime")}</p>
                <p className="font-mono text-foreground mt-1">{format(new Date(selectedActivity.createdAt), "PPpp", { locale: isRtl ? ar : enUS })}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-muted-foreground">{t("companyActivity.table.description")}</p>
                <p className="text-foreground mt-1 p-2 rounded-lg border border-border/60 bg-muted/20 font-mono text-xs">{selectedActivity.description}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{t("companyActivity.table.status")}</p>
                <p className={cn("font-medium mt-1 font-mono", selectedActivity.isSuccess ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                  {selectedActivity.isSuccess ? "تم بنجاح" : "فشلت العملية"}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="h-8 text-xs font-mono">
              {t("companyActivity.activityDetails.close") || "إغلاق"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyActivity;