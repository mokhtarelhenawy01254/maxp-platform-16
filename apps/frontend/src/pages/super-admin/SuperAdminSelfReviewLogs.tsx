import { useTranslation } from 'react-i18next';
import React, { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Download, Check, AlertTriangle, Clock, Activity, Save, BarChart, Settings2, ListChecks, Power, MessagesSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface AgentOption {
  id: string;
  name: string;
  template_slug: string | null;
}

const PAGE_SIZE = 20;

const statusColors: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  corrected: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  skipped: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  error: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
};

function formatTime(iso: string, locale: string) {
  const d = new Date(iso);
  return d.toLocaleString(locale, {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function StatsCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`rounded-lg p-2 shrink-0 ${color}`}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-bold leading-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function SuperAdminSelfReviewLogs() {
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
      const a = document.createElement("a"); a.href = url; a.download = "self-review-logs.csv";
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(t("common.error"), { description: t("common.tryAgain") });
    }
  }, [filters, t]);

  const handleSaveModel = useCallback(async () => {
    if (!ctrlAgent) return;
    setCtrlSaving(true);
    try {
      await selfReviewService.updateReviewModel(ctrlAgent, ctrlModel || "__default__");
      setCtrlSaved(true);
      setTimeout(() => setCtrlSaved(false), 2000);
      toast.success(t("superAdmin.selfReview.modelControl.saved"));
    } catch (e) {
      toast.error(t("common.error"), { description: t("common.tryAgain") });
    } finally { setCtrlSaving(false); }
  }, [ctrlAgent, ctrlModel, t]);

  const handleSaveGlobal = useCallback(async () => {
    setGlobalSaving(true);
    try {
      await selfReviewService.updateGlobalReviewModel(globalModel);
      await refetchSettings();
      toast.success(t("superAdmin.selfReview.globalSettings.saved"));
    } catch (e) {
      toast.error(t("common.error"), { description: t("common.tryAgain") });
    } finally { setGlobalSaving(false); }
  }, [globalModel, refetchSettings, t]);

  const handleToggleService = useCallback(async (enabled: boolean) => {
    setToggleSaving(true);
    try {
      await selfReviewService.updateSelfReviewEnabled(enabled);
      setSelfReviewEnabled(enabled);
      toast.success(enabled ? t("superAdmin.selfReview.serviceEnabled") : t("superAdmin.selfReview.serviceDisabled"));
    } catch (e) {
      toast.error(t("common.error"), { description: t("common.tryAgain") });
    } finally { setToggleSaving(false); }
  }, [t]);

  const prevSettings = useRef<string>();
  if (settingsData && settingsData.global_review_model !== prevSettings.current) {
    prevSettings.current = settingsData.global_review_model;
    setGlobalModel(settingsData.global_review_model);
    if (settingsData.self_review_enabled !== undefined) {
      setSelfReviewEnabled(settingsData.self_review_enabled);
    }
  }

  const handleRefresh = useCallback(() => { refetchStats(); refetchLogs(); refetchSettings(); }, [refetchStats, refetchLogs, refetchSettings]);

  const s = stats as ReviewStats | undefined;
  const pd = pageData as PaginatedResponse | undefined;
  const logs = pd?.logs;
  const totalPages = pd?.total_pages || 0;

  return (
    <div className="p-4 max-w-[1440px] mx-auto space-y-4" dir="auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">{t("superAdmin.selfReview.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("superAdmin.selfReview.description")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}><RefreshCw className="size-4 ml-1" />{t("superAdmin.selfReview.refresh")}</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="size-4 ml-1" />{t("superAdmin.selfReview.export")}</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs"><ListChecks className="size-4 ml-1" />{t("superAdmin.selfReview.tabs.logs")}</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="size-4 ml-1" />{t("superAdmin.selfReview.tabs.analytics")}</TabsTrigger>
          <TabsTrigger value="settings"><Settings2 className="size-4 ml-1" />{t("superAdmin.selfReview.tabs.settings")}</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4 mt-0">
          {statsLoading ? <LoadingSpinner /> : statsError ? (
            <Alert variant="destructive"><AlertDescription>{t("common.error")}</AlertDescription></Alert>
          ) : s ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <StatsCard label={t("superAdmin.selfReview.stats.total")} value={s.total.toLocaleString()} icon={Activity} color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" />
              <StatsCard label={t("superAdmin.selfReview.stats.approvalRate")} value={`${s.approval_rate}%`} sub={`${s.approved} ${t("superAdmin.selfReview.statusLabels.approved")}`} icon={CheckCircle} color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" />
              <StatsCard label={t("superAdmin.selfReview.stats.correctionRate")} value={s.total > 0 ? `${((s.corrected / s.total) * 100).toFixed(1)}%` : "0%"} sub={`${s.corrected} ${t("superAdmin.selfReview.statusLabels.corrected")}`} icon={AlertTriangle} color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" />
              <StatsCard label={t("superAdmin.selfReview.stats.avgLatency")} value={s.avg_latency_ms > 0 ? `${s.avg_latency_ms}ms` : "—"} icon={Clock} color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" />
            </div>
          ) : null}

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base">{t("superAdmin.selfReview.title")}</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={String(days)} onValueChange={(v) => { setDays(Number(v)); setPage(1); }}>
                    <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t("superAdmin.selfReview.filters.days", { n: 1 })}</SelectItem>
                      <SelectItem value="7">{t("superAdmin.selfReview.filters.days", { n: 7 })}</SelectItem>
                      <SelectItem value="30">{t("superAdmin.selfReview.filters.days", { n: 30 })}</SelectItem>
                      <SelectItem value="90">{t("superAdmin.selfReview.filters.days", { n: 90 })}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={agentFilter} onValueChange={(v) => { setAgentFilter(v || "all"); setPage(1); }}>
                    <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("superAdmin.selfReview.filters.allAgents")}</SelectItem>
                      {(agentsList || []).map((a: AgentOption) => (
                        <SelectItem key={a.id} value={a.id}>{a.name || a.template_slug || a.id.slice(0, 12)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v || "all"); setPage(1); }}>
                    <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("superAdmin.selfReview.filters.allStatuses")}</SelectItem>
                      {Object.keys(statusColors).map((st) => (
                        <SelectItem key={st} value={st}>{t(`superAdmin.selfReview.statusLabels.${st}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {logsError ? (
                <Alert variant="destructive"><AlertDescription>{t("common.error")}</AlertDescription></Alert>
              ) : logsLoading ? <LoadingSpinner /> : !logs || logs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">{t("superAdmin.selfReview.empty")}</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">{t("superAdmin.selfReview.table.timestamp")}</TableHead>
                          <TableHead className="text-xs">{t("superAdmin.selfReview.table.agent")}</TableHead>
                          <TableHead className="text-xs">{t("superAdmin.selfReview.table.status")}</TableHead>
                          <TableHead className="text-xs">{t("superAdmin.selfReview.table.violations")}</TableHead>
                          <TableHead className="text-xs">{t("superAdmin.selfReview.table.reason")}</TableHead>
                          <TableHead className="text-xs">{t("superAdmin.selfReview.table.model")}</TableHead>
                          <TableHead className="text-xs">{t("superAdmin.selfReview.table.latency")}</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log) => {
                          const agentName = log.metadata_?.agent_name || log.agent_slug || log.agent_id.slice(0, 12);
                          const originalReply = log.metadata_?.original_reply || "";
                          const correctedReply = (log.status === "corrected" || log.status === "polished") ? (log.reply_preview || "") : "";
                          return (
                          <TableRow key={log.id}>
                            <TableCell className="whitespace-nowrap text-xs">{formatTime(log.created_at, i18n.language)}</TableCell>
                            <TableCell className="font-medium text-xs max-w-[120px] truncate" title={agentName}>{agentName}</TableCell>
                            <TableCell><Badge className={`text-xs ${statusColors[log.status] || ""}`}>{t(`superAdmin.selfReview.statusLabels.${log.status}`)}</Badge></TableCell>
                            <TableCell className="max-w-[180px] truncate text-xs" title={log.violations?.join(", ") || ""}>{log.violations?.join(", ") || "—"}</TableCell>
                            <TableCell className="max-w-[180px] truncate text-xs" title={log.reason || ""}>{log.reason || "—"}</TableCell>
                            <TableCell className="text-xs">{log.model_used || "—"}</TableCell>
                            <TableCell className="text-xs">{log.latency_ms ? `${log.latency_ms}ms` : "—"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="size-6" onClick={() => setReplyDialog({
                                original: originalReply || log.reply_preview || "",
                                corrected: correctedReply,
                                agent: agentName,
                              })} title="عرض الرد">
                                <MessagesSquare className="size-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex items-center justify-between pt-3">
                    <p className="text-xs text-muted-foreground">{t("common.page")} {page} / {totalPages || 1}</p>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{i18n.dir() === "rtl" ? "→" : "←"}</Button>
                      <Button variant="outline" size="sm" disabled={totalPages === 0 || page >= totalPages} onClick={() => setPage(page + 1)}>{i18n.dir() === "rtl" ? "←" : "→"}</Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 mt-0">
          {statsLoading ? <LoadingSpinner /> : statsError ? (
            <Alert variant="destructive"><AlertDescription>{t("common.error")}</AlertDescription></Alert>
          ) : s ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <StatsCard label={t("superAdmin.selfReview.stats.total")} value={s.total.toLocaleString()} icon={Activity} color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" />
                <StatsCard label={t("superAdmin.selfReview.stats.approvalRate")} value={`${s.approval_rate}%`} sub={`${s.approved} ${t("superAdmin.selfReview.statusLabels.approved")}`} icon={CheckCircle} color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" />
                <StatsCard label={t("superAdmin.selfReview.stats.correctionRate")} value={s.total > 0 ? `${((s.corrected / s.total) * 100).toFixed(1)}%` : "0%"} sub={`${s.corrected} ${t("superAdmin.selfReview.statusLabels.corrected")}`} icon={AlertTriangle} color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" />
                <StatsCard label={t("superAdmin.selfReview.stats.avgLatency")} value={s.avg_latency_ms > 0 ? `${s.avg_latency_ms}ms` : "—"} icon={Clock} color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" />
              </div>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">{t("superAdmin.selfReview.stats.topViolations")}</CardTitle></CardHeader>
                <CardContent>
                  {s.violations.length > 0 ? (
                    <div className="space-y-1.5">
                      {s.violations.slice(0, 15).map((v, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border/40 last:border-0">
                          <span className="text-muted-foreground truncate">{v.violation}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="secondary" className="text-xs">{v.count}</Badge>
                            <Badge variant="outline" className="text-xs font-mono">{v.agent_slug || v.agent_id?.slice(0, 8)}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("superAdmin.selfReview.empty")}</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">{t("superAdmin.selfReview.stats.agentSummary")}</CardTitle></CardHeader>
                <CardContent>
                  {s.agents.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">{t("superAdmin.selfReview.table.agent")}</TableHead>
                            <TableHead className="text-center text-xs">{t("superAdmin.selfReview.stats.total")}</TableHead>
                            <TableHead className="text-center text-xs">{t("superAdmin.selfReview.statusLabels.approved")}</TableHead>
                            <TableHead className="text-center text-xs">{t("superAdmin.selfReview.statusLabels.corrected")}</TableHead>
                            <TableHead className="text-center text-xs">{t("superAdmin.selfReview.statusLabels.rejected")}</TableHead>
                            <TableHead className="text-center text-xs">{t("superAdmin.selfReview.statusLabels.skipped")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {s.agents.map((a) => (
                            <TableRow key={a.agent_id}>
                              <TableCell className="font-medium text-xs">{a.agent_slug || a.agent_id.slice(0, 12)}</TableCell>
                              <TableCell className="text-center text-xs">{a.total}</TableCell>
                              <TableCell className="text-center text-xs text-emerald-600">{a.approved}</TableCell>
                              <TableCell className="text-center text-xs text-amber-600">{a.corrected}</TableCell>
                              <TableCell className="text-center text-xs text-red-600">{a.rejected}</TableCell>
                              <TableCell className="text-center text-xs text-muted-foreground">{a.skipped}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("superAdmin.selfReview.empty")}</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-0">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{t("superAdmin.selfReview.serviceToggle.title")}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">{t("superAdmin.selfReview.serviceToggle.description")}</p>
              <div className="flex items-center gap-3">
                <Switch
                  id="self-review-toggle"
                  checked={selfReviewEnabled}
                  onCheckedChange={handleToggleService}
                  disabled={toggleSaving}
                />
                <Label htmlFor="self-review-toggle" className="text-sm cursor-pointer">
                  {selfReviewEnabled
                    ? t("superAdmin.selfReview.serviceToggle.enabled")
                    : t("superAdmin.selfReview.serviceToggle.disabled")}
                </Label>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{t("superAdmin.selfReview.modelControl.title")}</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-muted-foreground mb-1 block">{t("superAdmin.selfReview.modelControl.agent")}</label>
                <Select value={ctrlAgent} onValueChange={(v) => { setCtrlAgent(v || ""); setCtrlModel(""); setCtrlSaved(false); }}>
                  <SelectTrigger><SelectValue placeholder={t("superAdmin.selfReview.modelControl.placeholder")} /></SelectTrigger>
                  <SelectContent>
                    {(agentsList || []).map((a: AgentOption) => (
                      <SelectItem key={a.id} value={a.id}>{a.name || a.template_slug || a.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-muted-foreground mb-1 block">{t("superAdmin.selfReview.modelControl.model")}</label>
                <Select value={ctrlModel} onValueChange={(v) => setCtrlModel(v || "")} disabled={!ctrlAgent}>
                  <SelectTrigger><SelectValue placeholder={t("superAdmin.selfReview.modelControl.default")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__default__">{t("superAdmin.selfReview.modelControl.default")}</SelectItem>
                    {(settingsData?.available_models || []).map((m: string) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveModel} disabled={!ctrlAgent || ctrlSaving}>
                <Save className="size-4 ml-1" />{ctrlSaved ? t("superAdmin.selfReview.modelControl.saved") : t("superAdmin.selfReview.modelControl.save")}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">{t("superAdmin.selfReview.globalSettings.title")}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">{t("superAdmin.selfReview.globalSettings.description")}</p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-muted-foreground mb-1 block">{t("superAdmin.selfReview.globalSettings.model")}</label>
                  <Select value={globalModel} onValueChange={(v) => setGlobalModel(v || "")}>
                    <SelectTrigger><SelectValue placeholder={t("superAdmin.selfReview.globalSettings.placeholder")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t("superAdmin.selfReview.globalSettings.default")}</SelectItem>
                      {(settingsData?.available_models || []).map((m: string) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSaveGlobal} disabled={globalSaving}>
                  <Save className="size-4 ml-1" />{t("superAdmin.selfReview.globalSettings.save")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!replyDialog} onOpenChange={(o) => !o && setReplyDialog(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{replyDialog?.agent || ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium text-xs text-muted-foreground mb-1">{t("superAdmin.selfReview.originalReply")}</p>
              <div className="bg-muted rounded-md p-3 whitespace-pre-wrap text-xs leading-relaxed" dir="auto">{replyDialog?.original || "—"}</div>
            </div>
            {replyDialog?.corrected ? (
              <div>
                <p className="font-medium text-xs text-muted-foreground mb-1">{t("superAdmin.selfReview.correctedReply")}</p>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 whitespace-pre-wrap text-xs leading-relaxed" dir="auto">{replyDialog.corrected}</div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SuperAdminSelfReviewLogs;
