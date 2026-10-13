import React, { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  RefreshCw, Download, CheckCircle, AlertTriangle,
  Clock, Activity, Save, BarChart3, Settings2, ListChecks, MessagesSquare, Sparkles, Filter, ChevronRight, ChevronLeft
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { selfReviewService, type PaginatedResponse, type ReviewStats } from "../../services/selfReviewService";
import { apiClient } from "../../services/apiClient";
import { cn } from "@/lib/utils";

interface AgentOption {
  id: string;
  name: string;
  template_slug: string | null;
}

const PAGE_SIZE = 20;

const statusStyles: Record<string, { bg: string; dot: string; text: string; label: string }> = {
  approved: {
    bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    label: "معتمد"
  },
  corrected: {
    bg: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    label: "مصحح"
  },
  rejected: {
    bg: "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-300",
    label: "مرفوض"
  },
  skipped: {
    bg: "bg-muted text-muted-foreground border-border/60",
    dot: "bg-muted-foreground/40",
    text: "text-muted-foreground",
    label: "تم التخطي"
  },
  error: {
    bg: "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-300",
    label: "خطأ"
  },
};

function formatTime(iso: string, locale: string) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString(locale === "ar" ? "ar-EG" : locale, {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  } catch {
    return iso;
  }
}

export function SuperAdminSelfReviewLogs() {
  const { t, i18n } = useTranslation();
  const [days, setDays] = useState(7);
  const [agentFilter, setAgentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("logs");

  const [ctrlAgent, setCtrlAgent] = useState("");
  const [ctrlModel, setCtrlModel] = useState("");
  const [ctrlSaving, setCtrlSaving] = useState(false);
  const [ctrlSaved, setCtrlSaved] = useState(false);
  const [globalModel, setGlobalModel] = useState("");
  const [globalSaving, setGlobalSaving] = useState(false);
  const [selfReviewEnabled, setSelfReviewEnabled] = useState(true);
  const [toggleSaving, setToggleSaving] = useState(false);
  const [replyDialog, setReplyDialog] = useState<{ original: string; corrected: string; agent: string } | null>(null);

  const af = agentFilter !== "all" ? agentFilter : undefined;
  const sf = statusFilter !== "all" ? statusFilter : undefined;
  const filters = { days, agent_id: af, status: sf };

  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ["self-review", "stats", days, agentFilter, statusFilter],
    queryFn: () => selfReviewService.getStats(filters),
  });

  const { data: settingsData, refetch: refetchSettings } = useQuery({
    queryKey: ["self-review", "settings"],
    queryFn: () => selfReviewService.getSettings(),
  });

  const { data: pageData, isLoading: logsLoading, isError: logsError, refetch: refetchLogs } = useQuery({
    queryKey: ["self-review", "logs", filters, page],
    queryFn: () => selfReviewService.getLogs({ ...filters, page, limit: PAGE_SIZE }),
    placeholderData: (prev: any) => prev,
  });

  const { data: agentsList } = useQuery({
    queryKey: ["self-review", "agent-list"],
    queryFn: async (): Promise<AgentOption[]> => {
      const res = await apiClient.get("/admin/self-review/agents", { params: { limit: 500 } });
      return (res.data || []) as AgentOption[];
    },
  });

  const handleExport = useCallback(async () => {
    try {
      const blob = await selfReviewService.exportCsv(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "self-review-logs.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t("common.success") || "تم تصدير السجلات بنجاح");
    } catch {
      toast.error(t("common.error") || "حدث خطأ", { description: t("common.tryAgain") || "يرجى المحاولة مجدداً" });
    }
  }, [filters, t]);

  const handleSaveModel = useCallback(async () => {
    if (!ctrlAgent) return;
    setCtrlSaving(true);
    try {
      await selfReviewService.updateReviewModel(ctrlAgent, ctrlModel || "__default__");
      setCtrlSaved(true);
      setTimeout(() => setCtrlSaved(false), 2000);
      toast.success(t("superAdmin.selfReview.modelControl.saved") || "تم حفظ النموذج للوكيل بنجاح");
    } catch {
      toast.error(t("common.error") || "حدث خطأ", { description: t("common.tryAgain") || "يرجى المحاولة مجدداً" });
    } finally {
      setCtrlSaving(false);
    }
  }, [ctrlAgent, ctrlModel, t]);

  const handleSaveGlobal = useCallback(async () => {
    setGlobalSaving(true);
    try {
      await selfReviewService.updateGlobalReviewModel(globalModel);
      await refetchSettings();
      toast.success(t("superAdmin.selfReview.globalSettings.saved") || "تم حفظ الإعدادات العامة بنجاح");
    } catch {
      toast.error(t("common.error") || "حدث خطأ", { description: t("common.tryAgain") || "يرجى المحاولة مجدداً" });
    } finally {
      setGlobalSaving(false);
    }
  }, [globalModel, refetchSettings, t]);

  const handleToggleService = useCallback(async (enabled: boolean) => {
    setToggleSaving(true);
    try {
      await selfReviewService.updateSelfReviewEnabled(enabled);
      setSelfReviewEnabled(enabled);
      toast.success(enabled
        ? (t("superAdmin.selfReview.serviceEnabled") || "تم تفعيل خدمة المراجعة الذاتية")
        : (t("superAdmin.selfReview.serviceDisabled") || "تم تعطيل خدمة المراجعة الذاتية"));
    } catch {
      toast.error(t("common.error") || "حدث خطأ", { description: t("common.tryAgain") || "يرجى المحاولة مجدداً" });
    } finally {
      setToggleSaving(false);
    }
  }, [t]);

  const prevSettings = useRef<string>();
  if (settingsData && settingsData.global_review_model !== prevSettings.current) {
    prevSettings.current = settingsData.global_review_model;
    setGlobalModel(settingsData.global_review_model);
    if (settingsData.self_review_enabled !== undefined) {
      setSelfReviewEnabled(settingsData.self_review_enabled);
    }
  }

  const handleRefresh = useCallback(() => {
    refetchStats();
    refetchLogs();
    refetchSettings();
  }, [refetchStats, refetchLogs, refetchSettings]);

  const s = stats as ReviewStats | undefined;
  const pd = pageData as PaginatedResponse | undefined;
  const logs = pd?.logs;
  const totalPages = pd?.total_pages || 0;

  return (
    <div className="w-full max-w-[1440px] mx-auto p-4 sm:p-6 space-y-4" dir="auto">
      {/* Linear Single-Surface Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <Sparkles className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                {t("superAdmin.selfReview.title") || "سجلات المراجعة والتدقيق الذاتي للوكلاء"}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border border-border/80 bg-muted/30">
                <span className={cn("size-1.5 rounded-full", selfReviewEnabled ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                {selfReviewEnabled ? "نشط تلقائياً" : "معطل"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("superAdmin.selfReview.description") || "فحص ردود الذكاء الاصطناعي وتصحيح الانحرافات وقواعد الحوكمة"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform"
          >
            <Download className="size-3.5" />
            <span>{t("superAdmin.selfReview.export") || "تصدير CSV"}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform"
          >
            <RefreshCw className="size-3.5" />
            <span>{t("superAdmin.selfReview.refresh") || "تحديث"}</span>
          </Button>
        </div>
      </div>

      {/* Tabs Chassis */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/40 p-1 border border-border/60 rounded-lg">
          <TabsTrigger value="logs" className="text-xs gap-1.5 py-1.5 px-3">
            <ListChecks className="size-3.5" />
            <span>{t("superAdmin.selfReview.tabs.logs") || "سجل المراجعات"}</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs gap-1.5 py-1.5 px-3">
            <BarChart3 className="size-3.5" />
            <span>{t("superAdmin.selfReview.tabs.analytics") || "تحليل الانحرافات"}</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs gap-1.5 py-1.5 px-3">
            <Settings2 className="size-3.5" />
            <span>{t("superAdmin.selfReview.tabs.settings") || "إعدادات النماذج"}</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Logs */}
        <TabsContent value="logs" className="space-y-4 mt-0">
          {/* Telemetry Ribbon */}
          {s && (
            <div className="grid grid-cols-2 md:grid-cols-4 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
              <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="font-medium text-[11px]">{t("superAdmin.selfReview.stats.total") || "إجمالي المراجعات"}</span>
                  <span className="size-1.5 rounded-full bg-blue-500" />
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                  {s.total.toLocaleString()}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">عمليات الفحص المسجلة</p>
              </div>

              <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="font-medium text-[11px]">{t("superAdmin.selfReview.stats.approvalRate") || "نسبة الاعتماد"}</span>
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                </div>
                <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                  {s.approval_rate}%
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.approved} معتمد بدون تعديل</p>
              </div>

              <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="font-medium text-[11px]">{t("superAdmin.selfReview.stats.correctionRate") || "نسبة التصحيح"}</span>
                  <span className="size-1.5 rounded-full bg-amber-500" />
                </div>
                <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                  {s.total > 0 ? `${((s.corrected / s.total) * 100).toFixed(1)}%` : "0%"}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{s.corrected} رد تم تعديله</p>
              </div>

              <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span className="font-medium text-[11px]">{t("superAdmin.selfReview.stats.avgLatency") || "متوسط زمن الاستجابة"}</span>
                  <span className="size-1.5 rounded-full bg-purple-500" />
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                  {s.avg_latency_ms > 0 ? `${s.avg_latency_ms}ms` : "—"}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">زمن التدقيق الفعلي</p>
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl border border-border/80 bg-card/40">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-1">
                <Filter className="size-3.5" />
                <span>التصفية:</span>
              </div>
              <Select value={String(days)} onValueChange={(v) => { setDays(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-[110px] h-8 text-xs bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">آخر 24 ساعة</SelectItem>
                  <SelectItem value="7">آخر 7 أيام</SelectItem>
                  <SelectItem value="30">آخر 30 يوم</SelectItem>
                  <SelectItem value="90">آخر 90 يوم</SelectItem>
                </SelectContent>
              </Select>
              <Select value={agentFilter} onValueChange={(v) => { setAgentFilter(v || "all"); setPage(1); }}>
                <SelectTrigger className="w-[160px] h-8 text-xs bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("superAdmin.selfReview.filters.allAgents") || "جميع الوكلاء"}</SelectItem>
                  {(agentsList || []).map((a: AgentOption) => (
                    <SelectItem key={a.id} value={a.id}>{a.name || a.template_slug || a.id.slice(0, 12)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v || "all"); setPage(1); }}>
                <SelectTrigger className="w-[130px] h-8 text-xs bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("superAdmin.selfReview.filters.allStatuses") || "جميع الحالات"}</SelectItem>
                  {Object.keys(statusStyles).map((st) => (
                    <SelectItem key={st} value={st}>
                      {t(`superAdmin.selfReview.statusLabels.${st}`) || statusStyles[st].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs font-mono text-muted-foreground">
              {pd?.total_logs ? `${pd.total_logs} سجل مطابق` : ""}
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-xl border border-border/80 bg-card/40 shadow-xs overflow-hidden">
            {logsError ? (
              <div className="p-4"><Alert variant="destructive"><AlertDescription>{t("common.error") || "حدث خطأ أثناء تحميل السجلات"}</AlertDescription></Alert></div>
            ) : logsLoading ? (
              <div className="p-12 flex justify-center"><LoadingSpinner size="lg" /></div>
            ) : !logs || logs.length === 0 ? (
              <div className="p-12 text-center text-xs font-mono text-muted-foreground">{t("superAdmin.selfReview.empty") || "لا توجد سجلات مطابقة للشروط"}</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border/60 bg-muted/30">
                        <TableHead className="text-right text-[11px] font-mono">{t("superAdmin.selfReview.table.timestamp") || "الوقت"}</TableHead>
                        <TableHead className="text-right text-[11px] font-mono">{t("superAdmin.selfReview.table.agent") || "الوكيل"}</TableHead>
                        <TableHead className="text-right text-[11px] font-mono">{t("superAdmin.selfReview.table.status") || "الحالة"}</TableHead>
                        <TableHead className="text-right text-[11px] font-mono">{t("superAdmin.selfReview.table.violations") || "الملاحظات والانحرافات"}</TableHead>
                        <TableHead className="text-right text-[11px] font-mono">{t("superAdmin.selfReview.table.reason") || "السبب"}</TableHead>
                        <TableHead className="text-right text-[11px] font-mono">{t("superAdmin.selfReview.table.model") || "النموذج"}</TableHead>
                        <TableHead className="text-right text-[11px] font-mono">{t("superAdmin.selfReview.table.latency") || "الزمن"}</TableHead>
                        <TableHead className="text-left text-[11px] font-mono w-16">إجراء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => {
                        const agentName = log.metadata_?.agent_name || log.agent_slug || log.agent_id.slice(0, 12);
                        const originalReply = log.metadata_?.original_reply || "";
                        const correctedReply = (log.status === "corrected" || log.status === "polished") ? (log.reply_preview || "") : "";
                        const st = statusStyles[log.status] || statusStyles.skipped;
                        return (
                          <TableRow key={log.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                            <TableCell className="whitespace-nowrap text-xs font-mono text-muted-foreground">
                              {formatTime(log.created_at, i18n.language)}
                            </TableCell>
                            <TableCell className="font-semibold text-xs text-foreground max-w-[130px] truncate" title={agentName}>
                              {agentName}
                            </TableCell>
                            <TableCell>
                              <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border", st.bg)}>
                                <span className={cn("size-1.5 rounded-full", st.dot)} />
                                {t(`superAdmin.selfReview.statusLabels.${log.status}`) || st.label}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground font-mono" title={log.violations?.join(", ") || ""}>
                              {log.violations?.join(", ") || "—"}
                            </TableCell>
                            <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground" title={log.reason || ""}>
                              {log.reason || "—"}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">
                              {log.model_used || "—"}
                            </TableCell>
                            <TableCell className="text-xs font-mono tabular-nums text-muted-foreground">
                              {log.latency_ms ? `${log.latency_ms}ms` : "—"}
                            </TableCell>
                            <TableCell className="text-left">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs font-mono text-muted-foreground hover:text-foreground active:scale-[0.98]"
                                onClick={() => setReplyDialog({
                                  original: originalReply || log.reply_preview || "",
                                  corrected: correctedReply,
                                  agent: agentName,
                                })}
                                title="عرض الرد"
                              >
                                <MessagesSquare className="size-3.5 ml-1" />
                                <span>عرض</span>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between p-3 border-t border-border/60 bg-muted/10">
                  <p className="text-xs font-mono text-muted-foreground">
                    {t("common.page") || "صفحة"} {page} / {totalPages || 1}
                  </p>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                      className="h-7 px-2.5 text-xs font-mono"
                    >
                      <ChevronRight className="size-3.5 ml-1" />
                      {t("common.previous") || "السابق"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={totalPages === 0 || page >= totalPages}
                      onClick={() => setPage(page + 1)}
                      className="h-7 px-2.5 text-xs font-mono"
                    >
                      {t("common.next") || "التالي"}
                      <ChevronLeft className="size-3.5 mr-1" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Analytics */}
        <TabsContent value="analytics" className="space-y-4 mt-0">
          {statsLoading ? (
            <div className="p-12 flex justify-center"><LoadingSpinner size="lg" /></div>
          ) : statsError ? (
            <Alert variant="destructive"><AlertDescription>{t("common.error") || "خطأ في تحميل الإحصائيات"}</AlertDescription></Alert>
          ) : s ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Violations */}
                <div className="rounded-xl border border-border/80 bg-card/40 p-4 shadow-xs">
                  <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2.5">
                    <h3 className="text-xs font-semibold text-foreground">
                      {t("superAdmin.selfReview.stats.topViolations") || "أبرز مخالفات وتنبيهات التدقيق"}
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {s.violations.length} نوع
                    </Badge>
                  </div>

                  {s.violations.length > 0 ? (
                    <div className="space-y-2">
                      {s.violations.slice(0, 10).map((v, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-border/40 last:border-0">
                          <span className="text-muted-foreground truncate max-w-[240px]">{v.violation}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                              {v.count}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {v.agent_slug || v.agent_id?.slice(0, 8)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-mono text-muted-foreground py-6 text-center">
                      {t("superAdmin.selfReview.empty") || "لا توجد مخالفات مسجلة"}
                    </p>
                  )}
                </div>

                {/* Agents Summary Table */}
                <div className="rounded-xl border border-border/80 bg-card/40 p-4 shadow-xs">
                  <div className="mb-3 flex items-center justify-between border-b border-border/60 pb-2.5">
                    <h3 className="text-xs font-semibold text-foreground">
                      {t("superAdmin.selfReview.stats.agentSummary") || "أداء الوكلاء ومعدلات التصحيح"}
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {s.agents.length} وكيل
                    </Badge>
                  </div>

                  {s.agents.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-border/60">
                            <TableHead className="text-[10px] font-mono">الوكيل</TableHead>
                            <TableHead className="text-center text-[10px] font-mono">الكل</TableHead>
                            <TableHead className="text-center text-[10px] font-mono text-emerald-600">معتمد</TableHead>
                            <TableHead className="text-center text-[10px] font-mono text-amber-600">مصحح</TableHead>
                            <TableHead className="text-center text-[10px] font-mono text-rose-600">مرفوض</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {s.agents.map((a) => (
                            <TableRow key={a.agent_id} className="border-b border-border/40">
                              <TableCell className="font-semibold text-xs font-mono">{a.agent_slug || a.agent_id.slice(0, 10)}</TableCell>
                              <TableCell className="text-center text-xs font-mono tabular-nums">{a.total}</TableCell>
                              <TableCell className="text-center text-xs font-mono tabular-nums text-emerald-600 font-bold">{a.approved}</TableCell>
                              <TableCell className="text-center text-xs font-mono tabular-nums text-amber-600 font-bold">{a.corrected}</TableCell>
                              <TableCell className="text-center text-xs font-mono tabular-nums text-rose-600 font-bold">{a.rejected}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-xs font-mono text-muted-foreground py-6 text-center">
                      {t("superAdmin.selfReview.empty") || "لا توجد بيانات متاحة"}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* Tab 3: Settings */}
        <TabsContent value="settings" className="space-y-4 mt-0">
          <div className="rounded-xl border border-border/80 bg-card/40 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div>
                <h3 className="text-xs font-semibold text-foreground">
                  {t("superAdmin.selfReview.serviceToggle.title") || "تفعيل / تعطيل خدمة المراجعة الذاتية"}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t("superAdmin.selfReview.serviceToggle.description") || "عند التعطيل، ستمر جميع ردود الوكلاء مباشرة دون تدقيق"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="self-review-toggle"
                  checked={selfReviewEnabled}
                  onCheckedChange={handleToggleService}
                  disabled={toggleSaving}
                />
                <Label htmlFor="self-review-toggle" className="text-xs font-mono cursor-pointer">
                  {selfReviewEnabled ? "مفعل" : "معطل"}
                </Label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Agent Specific Model */}
            <div className="rounded-xl border border-border/80 bg-card/40 p-4 shadow-xs space-y-3">
              <div className="border-b border-border/60 pb-2">
                <h3 className="text-xs font-semibold text-foreground">
                  {t("superAdmin.selfReview.modelControl.title") || "تخصيص نموذج تدقيق لوكيل محدد"}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">اختر وكيلاً وحدد النموذج المطلوب لمراجعته</p>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground mb-1 block">الوكيل المستهدف</label>
                  <Select value={ctrlAgent} onValueChange={(v) => { setCtrlAgent(v || ""); setCtrlModel(""); setCtrlSaved(false); }}>
                    <SelectTrigger className="h-8 text-xs bg-background/50"><SelectValue placeholder="اختر وكيلاً..." /></SelectTrigger>
                    <SelectContent>
                      {(agentsList || []).map((a: AgentOption) => (
                        <SelectItem key={a.id} value={a.id}>{a.name || a.template_slug || a.id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-muted-foreground mb-1 block">نموذج التدقيق</label>
                  <Select value={ctrlModel} onValueChange={(v) => setCtrlModel(v || "")} disabled={!ctrlAgent}>
                    <SelectTrigger className="h-8 text-xs bg-background/50"><SelectValue placeholder="الافتراضي" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">الافتراضي العام</SelectItem>
                      {(settingsData?.available_models || []).map((m: string) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleSaveModel}
                  disabled={!ctrlAgent || ctrlSaving}
                  className="w-full h-8 text-xs font-mono mt-1 active:scale-[0.98]"
                >
                  <Save className="size-3.5 ml-1.5" />
                  {ctrlSaved ? "تم الحفظ" : "حفظ إعدادات الوكيل"}
                </Button>
              </div>
            </div>

            {/* Global Review Model */}
            <div className="rounded-xl border border-border/80 bg-card/40 p-4 shadow-xs space-y-3">
              <div className="border-b border-border/60 pb-2">
                <h3 className="text-xs font-semibold text-foreground">
                  {t("superAdmin.selfReview.globalSettings.title") || "نموذج التدقيق الافتراضي العام"}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t("superAdmin.selfReview.globalSettings.description") || "النموذج الذي يعتمد عليه النظام في مراجعة كافة الوكلاء"}
                </p>
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground mb-1 block">النموذج العام</label>
                  <Select value={globalModel} onValueChange={(v) => setGlobalModel(v || "")}>
                    <SelectTrigger className="h-8 text-xs bg-background/50"><SelectValue placeholder="اختر النموذج..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">الافتراضي السحابي</SelectItem>
                      {(settingsData?.available_models || []).map((m: string) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-7">
                  <Button
                    onClick={handleSaveGlobal}
                    disabled={globalSaving}
                    className="w-full h-8 text-xs font-mono active:scale-[0.98]"
                  >
                    <Save className="size-3.5 ml-1.5" />
                    {t("superAdmin.selfReview.globalSettings.save") || "حفظ النموذج العام"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={!!replyDialog} onOpenChange={(o) => !o && setReplyDialog(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">{replyDialog?.agent || "تفاصيل الرد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <p className="font-semibold text-muted-foreground mb-1">الرد الأصلي للوكيل:</p>
              <div className="bg-muted/40 border border-border/60 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed" dir="auto">
                {replyDialog?.original || "—"}
              </div>
            </div>
            {replyDialog?.corrected ? (
              <div>
                <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">الرد المصحح بعد التدقيق:</p>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 whitespace-pre-wrap font-mono text-amber-900 dark:text-amber-200 leading-relaxed" dir="auto">
                  {replyDialog.corrected}
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SuperAdminSelfReviewLogs;
