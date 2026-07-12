import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  RefreshCw, Download, CheckCircle, AlertTriangle,
  Clock, Activity, ChevronLeft, ChevronRight, Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { selfReviewService, type PaginatedResponse, type ReviewStats, type ReviewLog } from "../../services/selfReviewService";
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
      <CardContent className="p-4 flex items-start gap-3">
        <div className={`rounded-lg p-2.5 ${color}`}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
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

  const [ctrlAgent, setCtrlAgent] = useState("");
  const [ctrlModel, setCtrlModel] = useState("");
  const [ctrlSaving, setCtrlSaving] = useState(false);
  const [ctrlSaved, setCtrlSaved] = useState(false);

  const filters = { days, agent_id: agentFilter !== "all" ? agentFilter : undefined, status: statusFilter !== "all" ? statusFilter : undefined };

  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ["self-review", "stats", days, agentFilter, statusFilter],
    queryFn: () => selfReviewService.getStats({ days, agent_id: agentFilter !== "all" ? agentFilter : undefined, status: statusFilter !== "all" ? statusFilter : undefined }),
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

  const handleRefresh = useCallback(() => { refetchStats(); refetchLogs(); }, [refetchStats, refetchLogs]);

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

      {statsLoading ? <LoadingSpinner /> : statsError ? (
        <Alert variant="destructive"><AlertDescription>{t("common.error")}</AlertDescription></Alert>
      ) : s ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatsCard label={t("superAdmin.selfReview.stats.total")} value={s.total.toLocaleString()} icon={Activity} color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" />
          <StatsCard label={t("superAdmin.selfReview.stats.approvalRate")} value={`${s.approval_rate}%`} sub={`${s.approved} ${t("superAdmin.selfReview.statusLabels.approved")}`} icon={CheckCircle} color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" />
          <StatsCard label={t("superAdmin.selfReview.stats.correctionRate")} value={s.total > 0 ? `${((s.corrected / s.total) * 100).toFixed(1)}%` : "0%"} sub={`${s.corrected} ${t("superAdmin.selfReview.statusLabels.corrected")}`} icon={AlertTriangle} color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" />
          <StatsCard label={t("superAdmin.selfReview.stats.avgLatency")} value={s.avg_latency_ms > 0 ? `${s.avg_latency_ms}ms` : "—"} icon={Clock} color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" />
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{t("superAdmin.selfReview.modelControl.title")}</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">{t("superAdmin.selfReview.modelControl.agent")}</label>
            <Select value={ctrlAgent} onValueChange={(v) => { setCtrlAgent(v); setCtrlModel(""); setCtrlSaved(false); }}>
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
            <Select value={ctrlModel} onValueChange={setCtrlModel} disabled={!ctrlAgent}>
              <SelectTrigger><SelectValue placeholder={t("superAdmin.selfReview.modelControl.default")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">{t("superAdmin.selfReview.modelControl.default")}</SelectItem>
                <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                <SelectItem value="deepseek-v4-flash">DeepSeek V4 Flash</SelectItem>
                <SelectItem value="gpt-5.4-nano">GPT 5.4 Nano</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSaveModel} disabled={!ctrlAgent || ctrlSaving}>
            <Save className="size-4 ml-1" />{ctrlSaved ? t("superAdmin.selfReview.modelControl.saved") : t("superAdmin.selfReview.modelControl.save")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">{t("superAdmin.selfReview.stats.topViolations")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {s?.violations && s.violations.length > 0 ? (
            <div className="space-y-2">
              {s.violations.slice(0, 10).map((v, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate">{v.violation}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary">{v.count}</Badge>
                    <Badge variant="outline" className="text-xs">{v.agent_slug || v.agent_id?.slice(0, 8)}</Badge>
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
          {s?.agents && s.agents.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("superAdmin.selfReview.table.agent")}</TableHead>
                    <TableHead className="text-center">{t("superAdmin.selfReview.stats.total")}</TableHead>
                    <TableHead className="text-center">{t("superAdmin.selfReview.statusLabels.approved")}</TableHead>
                    <TableHead className="text-center">{t("superAdmin.selfReview.statusLabels.corrected")}</TableHead>
                    <TableHead className="text-center">{t("superAdmin.selfReview.statusLabels.rejected")}</TableHead>
                    <TableHead className="text-center">{t("superAdmin.selfReview.statusLabels.skipped")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.agents.map((a) => (
                    <TableRow key={a.agent_id}>
                      <TableCell className="font-medium">{a.agent_slug || a.agent_id.slice(0, 12)}</TableCell>
                      <TableCell className="text-center">{a.total}</TableCell>
                      <TableCell className="text-center text-emerald-600">{a.approved}</TableCell>
                      <TableCell className="text-center text-amber-600">{a.corrected}</TableCell>
                      <TableCell className="text-center text-red-600">{a.rejected}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{a.skipped}</TableCell>
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

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">{t("superAdmin.selfReview.title")}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={String(days)} onValueChange={(v) => { setDays(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t("superAdmin.selfReview.filters.days", { n: 1 })}</SelectItem>
                  <SelectItem value="7">{t("superAdmin.selfReview.filters.days", { n: 7 })}</SelectItem>
                  <SelectItem value="30">{t("superAdmin.selfReview.filters.days", { n: 30 })}</SelectItem>
                  <SelectItem value="90">{t("superAdmin.selfReview.filters.days", { n: 90 })}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={agentFilter} onValueChange={(v) => { setAgentFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("superAdmin.selfReview.filters.allAgents")}</SelectItem>
                  {(agentsList || []).map((a: AgentOption) => (
                    <SelectItem key={a.id} value={a.id}>{a.name || a.template_slug || a.id.slice(0, 12)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
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
            <p className="text-sm text-muted-foreground">{t("superAdmin.selfReview.empty")}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("superAdmin.selfReview.table.timestamp")}</TableHead>
                      <TableHead>{t("superAdmin.selfReview.table.agent")}</TableHead>
                      <TableHead>{t("superAdmin.selfReview.table.status")}</TableHead>
                      <TableHead>{t("superAdmin.selfReview.table.violations")}</TableHead>
                      <TableHead>{t("superAdmin.selfReview.table.reason")}</TableHead>
                      <TableHead>{t("superAdmin.selfReview.table.model")}</TableHead>
                      <TableHead>{t("superAdmin.selfReview.table.latency")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-xs">{formatTime(log.created_at, i18n.language)}</TableCell>
                        <TableCell className="font-medium text-xs">{log.agent_slug || log.agent_id.slice(0, 12)}</TableCell>
                        <TableCell><Badge className={statusColors[log.status] || ""}>{t(`superAdmin.selfReview.statusLabels.${log.status}`)}</Badge></TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs">{log.violations?.join(", ") || "—"}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs">{log.reason || "—"}</TableCell>
                        <TableCell className="text-xs">{log.model_used || "—"}</TableCell>
                        <TableCell className="text-xs">{log.latency_ms ? `${log.latency_ms}ms` : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">{t("common.page")} {page} / {totalPages || 1}</p>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{i18n.dir() === "rtl" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}</Button>
                  <Button variant="outline" size="sm" disabled={totalPages === 0 || page >= totalPages} onClick={() => setPage(page + 1)}>{i18n.dir() === "rtl" ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SuperAdminSelfReviewLogs;
