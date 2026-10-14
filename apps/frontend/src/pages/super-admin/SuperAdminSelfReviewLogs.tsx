import React, { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  RefreshCw, Download, Filter,
  ListChecks, BarChart3, Settings2, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { selfReviewService, type PaginatedResponse, type ReviewStats } from "../../services/selfReviewService";
import { apiClient } from "../../services/apiClient";
import { cn } from "@/lib/utils";
import { SuperAdminSelfReviewAnalyticsTab } from "./SuperAdminSelfReviewAnalyticsTab";
import { SuperAdminSelfReviewSettingsTab } from "./SuperAdminSelfReviewSettingsTab";
import {
  SuperAdminSelfReviewLogsTable,
  statusStyles,
} from "./SuperAdminSelfReviewLogsTable";

interface AgentOption {
  id: string;
  name: string;
  template_slug: string | null;
}

const PAGE_SIZE = 20;

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
      toast.error(t("common.error") || "حدث خطأ");
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
      toast.error(t("common.error") || "حدث خطأ");
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
      toast.error(t("common.error") || "حدث خطأ");
    } finally {
      setGlobalSaving(false);
    }
  }, [globalModel, refetchSettings, t]);

  const handleToggleService = useCallback(async (enabled: boolean) => {
    setToggleSaving(true);
    try {
      await selfReviewService.updateSelfReviewEnabled(enabled);
      setSelfReviewEnabled(enabled);
      toast.success(enabled ? "تم تفعيل خدمة المراجعة الذاتية" : "تم تعطيل خدمة المراجعة الذاتية");
    } catch {
      toast.error(t("common.error") || "حدث خطأ");
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
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4" dir="auto">
      {/* Control bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              سجلات المراجعة والتدقيق الذاتي للوكلاء
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border border-border/80 bg-muted/30">
              <span className={cn("size-1.5 rounded-full", selfReviewEnabled ? "bg-emerald-500" : "bg-muted-foreground/40")} />
              {selfReviewEnabled ? "نشط" : "معطل"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            فحص ردود الذكاء الاصطناعي وتصحيح الانحرافات وقواعد الحوكمة اللحظية
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-8 px-2.5 text-xs font-mono gap-1.5 border-border/70 active:scale-[0.98]"
          >
            <Download className="size-3.5" />
            <span>تصدير CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-8 px-2.5 text-xs font-mono gap-1.5 border-border/70 active:scale-[0.98]"
          >
            <RefreshCw className="size-3.5" />
            <span>تحديث</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/40 p-1 border border-border/60 rounded-lg">
          <TabsTrigger value="logs" className="text-xs gap-1.5 py-1.5 px-3">
            <ListChecks className="size-3.5" />
            <span>سجل المراجعات</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs gap-1.5 py-1.5 px-3">
            <BarChart3 className="size-3.5" />
            <span>تحليل الانحرافات</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs gap-1.5 py-1.5 px-3">
            <Settings2 className="size-3.5" />
            <span>إعدادات النماذج</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Logs */}
        <TabsContent value="logs" className="space-y-4 mt-0">
          {s && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground">إجمالي المراجعات</p>
                  <p className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">{s.total.toLocaleString()}</p>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">نسبة الاعتماد</p>
                  <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-0.5">{s.approval_rate}%</p>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">نسبة التصحيح</p>
                  <p className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-0.5">
                    {s.total > 0 ? `${((s.corrected / s.total) * 100).toFixed(1)}%` : "0%"}
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-primary">متوسط زمن الاستجابة</p>
                  <p className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">
                    {s.avg_latency_ms > 0 ? `${s.avg_latency_ms}ms` : "—"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg border border-border/70 bg-card">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-1">
                <Filter className="size-3.5" />
                <span>التصفية:</span>
              </div>
              <Select value={String(days)} onValueChange={(v) => { setDays(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-[110px] h-8 text-xs bg-muted/20 border-border/70"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1" className="text-xs">آخر 24 ساعة</SelectItem>
                  <SelectItem value="7" className="text-xs">آخر 7 أيام</SelectItem>
                  <SelectItem value="30" className="text-xs">آخر 30 يوم</SelectItem>
                  <SelectItem value="90" className="text-xs">آخر 90 يوم</SelectItem>
                </SelectContent>
              </Select>
              <Select value={agentFilter} onValueChange={(v) => { setAgentFilter(v || "all"); setPage(1); }}>
                <SelectTrigger className="w-[160px] h-8 text-xs bg-muted/20 border-border/70"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">جميع الوكلاء</SelectItem>
                  {(agentsList || []).map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">{a.name || a.template_slug || a.id.slice(0, 12)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v || "all"); setPage(1); }}>
                <SelectTrigger className="w-[130px] h-8 text-xs bg-muted/20 border-border/70"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">جميع الحالات</SelectItem>
                  {Object.keys(statusStyles).map((st) => (
                    <SelectItem key={st} value={st} className="text-xs">
                      {statusStyles[st].label}
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
          <div className="rounded-lg border border-border/70 bg-card shadow-xs overflow-hidden">
            <SuperAdminSelfReviewLogsTable
              logs={logs}
              logsLoading={logsLoading}
              logsError={logsError}
              page={page}
              totalPages={totalPages}
              setPage={setPage}
              language={i18n.language}
              onOpenReply={(data) => setReplyDialog(data)}
            />
          </div>
        </TabsContent>

        {/* Tab 2: Analytics */}
        <TabsContent value="analytics" className="space-y-4 mt-0">
          <SuperAdminSelfReviewAnalyticsTab
            stats={s}
            statsLoading={statsLoading}
            statsError={statsError}
          />
        </TabsContent>

        {/* Tab 3: Settings */}
        <TabsContent value="settings" className="space-y-4 mt-0">
          <SuperAdminSelfReviewSettingsTab
            selfReviewEnabled={selfReviewEnabled}
            toggleSaving={toggleSaving}
            handleToggleService={handleToggleService}
            ctrlAgent={ctrlAgent}
            setCtrlAgent={setCtrlAgent}
            ctrlModel={ctrlModel}
            setCtrlModel={setCtrlModel}
            ctrlSaving={ctrlSaving}
            ctrlSaved={ctrlSaved}
            handleSaveModel={handleSaveModel}
            agentsList={agentsList}
            globalModel={globalModel}
            setGlobalModel={setGlobalModel}
            globalSaving={globalSaving}
            handleSaveGlobal={handleSaveGlobal}
            availableModels={settingsData?.available_models}
          />
        </TabsContent>
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={!!replyDialog} onOpenChange={(o) => !o && setReplyDialog(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">{replyDialog?.agent || "تفاصيل الرد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs pt-1">
            <div>
              <p className="font-semibold text-muted-foreground mb-1">الرد الأصلي للوكيل:</p>
              <div className="bg-muted/40 border border-border/60 rounded-md p-2.5 whitespace-pre-wrap font-mono leading-relaxed" dir="auto">
                {replyDialog?.original || "—"}
              </div>
            </div>
            {replyDialog?.corrected ? (
              <div>
                <p className="font-semibold text-amber-600 dark:text-amber-400 mb-1">الرد المصحح بعد التدقيق:</p>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-2.5 whitespace-pre-wrap font-mono text-amber-800 dark:text-amber-200 leading-relaxed" dir="auto">
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
