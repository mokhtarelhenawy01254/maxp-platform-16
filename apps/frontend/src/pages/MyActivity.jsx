import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import { Eye, Download, CheckCircle, XCircle, Info, AlertTriangle, UserCheck, RefreshCw, Search } from "lucide-react";
import { cn } from "../lib/utils";

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

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const cleanedFilters = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v && v !== "ALL")
      );
      const params = { page: page + 1, limit: rowsPerPage, ...cleanedFilters };
      const r = await apiClient.get("/activity/my-activities", { params });
      if (r.data.success) {
        setActivities(r.data.data.activities || []);
        setTotalActivities(r.data.data.pagination?.total || 0);
      }
    } catch (err) {
      setError(err.response?.data?.message || t("employee.activity.fetchError"));
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const r = await apiClient.get("/activity/my-stats");
      if (r.data.success) setStats(r.data.data);
    } catch {}
  };

  useEffect(() => {
    fetchActivities();
    fetchStats();
  }, [page, rowsPerPage, filters]);

  const getSeverityColor = (s) => ({ LOW: "success", MEDIUM: "info", HIGH: "warning", CRITICAL: "destructive" }[s] || "secondary");
  const getCategoryKey = (c) => ({
    AUTH: "employee.activity.categoryAuth",
    ADS: "employee.activity.categoryAds",
    CONVERSATIONS: "employee.activity.categoryConversations",
    BILLING: "employee.activity.categoryBilling",
    SETTINGS: "employee.activity.categorySettings",
    SUPPORT: "employee.activity.categorySupport",
    FILES: "employee.activity.categoryFiles",
    USERS: "employee.activity.categoryUsers",
    COMPANY: "employee.activity.categoryCompany",
    REPORTS: "employee.activity.categoryReports"
  }[c] || c);

  const getActionKey = (a) => ({
    CREATE: "employee.activity.actionCreate",
    UPDATE: "employee.activity.actionUpdate",
    DELETE: "employee.activity.actionDelete",
    LOGIN: "employee.activity.actionLogin",
    LOGOUT: "employee.activity.actionLogout",
    UPLOAD: "employee.activity.actionUpload",
    DOWNLOAD: "employee.activity.actionDownload",
    VIEW: "employee.activity.actionView",
    SEND: "employee.activity.actionSend",
    RECEIVE: "employee.activity.actionReceive",
    ACTIVATE: "employee.activity.actionActivate",
    DEACTIVATE: "employee.activity.actionDeactivate",
    APPROVE: "employee.activity.actionApprove",
    REJECT: "employee.activity.actionReject",
    EXPORT: "employee.activity.actionExport",
    IMPORT: "employee.activity.actionImport"
  }[a] || a);

  return (
    <div className="w-full space-y-4" dir="rtl">
      {/* Linear Taste Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <UserCheck className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                {t("employee.activity.title") || "سجل نشاطي الشخصي"}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border border-border/80 bg-muted/30">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                سجل الموظف
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              عرض تفاصيل الإجراءات والعمليات المسجلة لحسابك في المنصة
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
        <Alert variant="destructive" className="mb-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Telemetry Ribbon */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">{t("employee.activity.totalActivities") || "إجمالي العمليات"}</span>
              <span className="size-1.5 rounded-full bg-indigo-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {stats.totalActivities || 0}
            </div>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">{t("employee.activity.lastActivity") || "آخر نشاط مسجل"}</span>
              <span className="size-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-xs font-semibold text-foreground font-mono tabular-nums">
              {stats.lastActivity ? format(new Date(stats.lastActivity.createdAt), "PPp", { locale: ar }) : (t("employee.activity.noActivity") || "لا يوجد نشاط مسجل")}
            </div>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">{t("employee.activity.topCategories") || "أعلى الفئات"}</span>
              <span className="size-1.5 rounded-full bg-amber-500" />
            </div>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {(stats.categoryStats || []).slice(0, 4).map((c, i) => (
                <span key={c._id || i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border border-border/70 bg-muted/40">
                  {t(getCategoryKey(c._id))}: {c.count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Unified Table Chassis with Integrated Filter Bar */}
      <div className="rounded-xl border border-border/80 bg-card/40 shadow-xs overflow-hidden">
        <div className="p-3 border-b border-border/60 flex flex-wrap items-center gap-2 bg-muted/20">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder={String(t("employee.activity.searchPlaceholder") || "البحث في نشاطاتي...")}
              value={filters.search}
              onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
              className="h-8 pr-8 text-xs bg-background"
            />
          </div>

          <Select value={filters.category || "ALL"} onValueChange={v => setFilters(p => ({ ...p, category: v }))}>
            <SelectTrigger className="h-8 text-xs w-32 bg-background">
              <SelectValue placeholder={t("employee.activity.filterCategory") || "الفئة"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("employee.activity.all") || "كل الفئات"}</SelectItem>
              <SelectItem value="AUTH">{t("employee.activity.categoryAuth")}</SelectItem>
              <SelectItem value="CONVERSATIONS">{t("employee.activity.categoryConversations")}</SelectItem>
              <SelectItem value="BILLING">{t("employee.activity.categoryBilling")}</SelectItem>
              <SelectItem value="SETTINGS">{t("employee.activity.categorySettings")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.severity || "ALL"} onValueChange={v => setFilters(p => ({ ...p, severity: v }))}>
            <SelectTrigger className="h-8 text-xs w-28 bg-background">
              <SelectValue placeholder={t("employee.activity.filterSeverity") || "المستوى"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("employee.activity.all") || "كل المستويات"}</SelectItem>
              <SelectItem value="LOW">{t("employee.activity.severityLow")}</SelectItem>
              <SelectItem value="MEDIUM">{t("employee.activity.severityMedium")}</SelectItem>
              <SelectItem value="HIGH">{t("employee.activity.severityHigh")}</SelectItem>
              <SelectItem value="CRITICAL">{t("employee.activity.severityCritical")}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.isSuccess || "ALL"} onValueChange={v => setFilters(p => ({ ...p, isSuccess: v }))}>
            <SelectTrigger className="h-8 text-xs w-28 bg-background">
              <SelectValue placeholder={t("employee.activity.filterStatus") || "الحالة"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("employee.activity.all") || "كل الحالات"}</SelectItem>
              <SelectItem value="true">{t("employee.activity.statusSuccess") || "ناجح"}</SelectItem>
              <SelectItem value="false">{t("employee.activity.statusFailed") || "فشل"}</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={() => {}} className="h-8 text-xs font-mono active:scale-[0.98] transition-transform">
            <Download className="ml-1.5 size-3.5" />
            {t("employee.activity.exportCsv") || "تصدير CSV"}
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-[11px] font-mono">{t("employee.activity.colDateTime") || "التاريخ والوقت"}</TableHead>
              <TableHead className="text-[11px] font-mono">{t("employee.activity.colCategory") || "الفئة"}</TableHead>
              <TableHead className="text-[11px] font-mono">{t("employee.activity.colAction") || "نوع الإجراء"}</TableHead>
              <TableHead className="text-[11px] font-mono">{t("employee.activity.colDescription") || "الوصف"}</TableHead>
              <TableHead className="text-[11px] font-mono text-center">{t("employee.activity.colSeverity") || "الأهمية"}</TableHead>
              <TableHead className="text-[11px] font-mono text-center">{t("employee.activity.colStatus") || "الحالة"}</TableHead>
              <TableHead className="text-[11px] font-mono text-center w-16">{t("employee.activity.colDetails") || "عرض"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <LoadingSpinner />
                </TableCell>
              </TableRow>
            ) : activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                  {t("employee.activity.noActivities") || "لا توجد أنشطة مسجلة"}
                </TableCell>
              </TableRow>
            ) : (
              activities.map((a, idx) => (
                <TableRow key={a._id || `my-act-${idx}`} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="text-xs font-mono text-muted-foreground tabular-nums">
                    {format(new Date(a.createdAt), "PPp", { locale: ar })}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border border-border/70 bg-muted/30">
                      {t(getCategoryKey(a.category))}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-mono font-medium">{t(getActionKey(a.action))}</TableCell>
                  <TableCell className="text-xs text-foreground max-w-sm truncate">{a.description}</TableCell>
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
                      {a.severity}
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
          <span>{t("employee.activity.total") || "إجمالي العمليات"}: {totalActivities}</span>
          <span>صفحة {page + 1}</span>
        </div>
      </div>

      {/* Details Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">{t("employee.activity.detailsTitle") || "تفاصيل العملية"}</DialogTitle>
          </DialogHeader>
          {selectedActivity && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground">{t("employee.activity.colCategory") || "الفئة"}</p>
                <p className="font-medium text-foreground mt-1">{t(getCategoryKey(selectedActivity.category))}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{t("employee.activity.colAction") || "نوع الإجراء"}</p>
                <p className="font-mono text-foreground mt-1">{t(getActionKey(selectedActivity.action))}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] text-muted-foreground">{t("employee.activity.colDescription") || "الوصف"}</p>
                <p className="text-foreground mt-1 p-2 rounded-lg border border-border/60 bg-muted/20 font-mono text-xs">{selectedActivity.description}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{t("employee.activity.colDateTime") || "التاريخ والوقت"}</p>
                <p className="font-mono text-foreground mt-1">{format(new Date(selectedActivity.createdAt), "PPpp", { locale: ar })}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{t("employee.activity.colStatus") || "الحالة"}</p>
                <p className={cn("font-medium mt-1 font-mono", selectedActivity.isSuccess ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                  {selectedActivity.isSuccess ? (t("employee.activity.statusSuccess") || "تم بنجاح") : (t("employee.activity.statusFailed") || "فشل")}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="h-8 text-xs font-mono">
              {t("employee.common.close") || "إغلاق"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyActivity;