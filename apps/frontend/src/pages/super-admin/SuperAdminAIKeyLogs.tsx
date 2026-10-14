import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { RefreshCw, Clock, Download, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Activity, Zap, Building2, ArrowUpRight, Database, Key } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { companyAwareApi } from "../../services/companyAwareApi";
import { useAiKeyLogs } from "../../hooks/useAiKeyLogs";
import { useAiKeys } from "../../hooks/useAiAdminData";
import type { AiKeyLog } from "../../types/ai-admin";

const PAGE_SIZE = 25;

const ACTION_LABELS: Record<string, string> = {
  generation_success: "توليد رد", generation_failed: "فشل توليد",
  "key.created": "إنشاء مفتاح", "key.updated": "تحديث مفتاح", "key.test": "اختبار مفتاح",
};

const STATUS_LABELS: Record<string, string> = { success: "نجاح", ok: "نجاح", failed: "فشل", error: "خطأ" };

const statusColor = (status?: string) => {
  if (!status) return "bg-muted text-muted-foreground border-border/60";
  const s = status.toLowerCase();
  if (s === "success" || s === "ok") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
};

const latencyColor = (ms: number) => ms < 1000 ? "text-emerald-600 dark:text-emerald-400" : ms < 5000 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ar-EG", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} س`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `منذ ${days} ي`;
  return formatTime(iso);
}

function SuperAdminAIKeyLogs() {
  const navigate = useNavigate();
  const { data: keys } = useAiKeys();
  const [providerFilter, setProviderFilter] = useState("ALL");
  const [keyFilter, setKeyFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AiKeyLog | null>(null);

  const { data: companies } = useQuery({
    queryKey: ["super-admin", "companies"],
    queryFn: () => companyAwareApi.getAllCompanies({ pageSize: 0 }),
    staleTime: 300_000,
    select: (res: any) => res.data?.data?.companies ?? [],
  });

  const companyNameMap = useMemo(() => {
    if (!Array.isArray(companies)) return {};
    const map: Record<string, string> = {};
    for (const c of companies) map[c.id] = c.name;
    return map;
  }, [companies]);

  const offset = page * PAGE_SIZE;

  const { data: logsRes, isLoading, isFetching, error, refetch } = useAiKeyLogs({
    provider: providerFilter && providerFilter !== "ALL" ? providerFilter : undefined,
    key_id: keyFilter && keyFilter !== "ALL" ? keyFilter : undefined,
    status: statusFilter && statusFilter !== "ALL" ? statusFilter : undefined,
    limit: PAGE_SIZE, offset,
  }, refreshTick);

  const logs = useMemo(() => {
    if (!logsRes?.items) return undefined;
    return [...logsRes.items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [logsRes?.items]);
  const total = logsRes?.total ?? 0;

  const keyNameMap = useMemo(() => {
    if (!Array.isArray(keys)) return {};
    const map: Record<string, string> = {};
    for (const k of keys) map[k.id] = k.name;
    return map;
  }, [keys]);

  const providerList = useMemo(() => {
    if (!Array.isArray(keys)) return [];
    return [...new Set(keys.map((k) => k.provider).filter(Boolean))];
  }, [keys]);

  const keyOptions = useMemo(() => {
    if (!Array.isArray(keys)) return [];
    return keys.filter((k) => !providerFilter || providerFilter === "ALL" || k.provider === providerFilter)
      .map((k) => ({ id: k.id, name: k.name }));
  }, [keys, providerFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const stats = useMemo(() => {
    if (logsRes && logsRes.success_count !== undefined) {
      return { total, success: logsRes.success_count, failed: logsRes.failed_count ?? 0, avgLatency: logsRes.avg_latency ?? 0 };
    }
    if (!Array.isArray(logs)) return { total: 0, success: 0, failed: 0, avgLatency: 0 };
    const success = logs.filter((l) => l.status === "success" || l.status === "ok").length;
    const failed = logs.filter((l) => l.status === "failed" || l.status === "error").length;
    const latencies = logs.map((l) => l.latency_ms).filter((v): v is number => v != null);
    const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    return { total: logs.length, success, failed, avgLatency };
  }, [logs, logsRes, total]);

  const exportCSV = useCallback(() => {
    if (!Array.isArray(logs) || logs.length === 0) return;
    const header = "الوقت,المزود,المفتاح,الإجراء,الحالة,النموذج,الزمن (ms),الخطأ\n";
    const rows = logs.map((l) =>
      `"${formatTime(l.created_at)}","${l.provider}","${keyNameMap[l.key_id || ""] || l.key_id || ""}","${ACTION_LABELS[l.action] || l.action}","${STATUS_LABELS[l.status] || l.status}","${l.model || ""}","${l.latency_ms ?? ""}","${(l.error || "").replace(/"/g, '""')}"`
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-key-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logs, keyNameMap]);

  return (
    <div className="w-full space-y-4" dir="rtl">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono uppercase bg-primary/10 text-primary border border-primary/20">
              <Key className="h-3 w-3" />
              AI Key Telemetry
            </span>
            <span className="text-xs text-muted-foreground font-mono">/ ai-key-logs</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            سجل استخدام مفاتيح الذكاء الاصطناعي
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            تدقيق لحظي لعمليات توليد النصوص، استهلاك النماذج، وأزمنة الاستجابة
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs self-end sm:self-auto">
          <Button variant="outline" size="sm" onClick={() => setRefreshTick((t) => t + 1)} disabled={isFetching} className="h-8 gap-1.5 shadow-2xs active:scale-[0.98]">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!logs || logs.length === 0} className="h-8 gap-1.5 shadow-2xs active:scale-[0.98]">
            <Download className="h-3.5 w-3.5" />
            <span>تصدير CSV</span>
          </Button>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 rounded-xl border border-border/80 bg-card shadow-xs divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden font-mono">
        <div className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="text-[11px] uppercase">إجمالي السجلات</span>
            <span className="size-1.5 rounded-full bg-primary" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{total.toLocaleString()}</div>
          <p className="text-[10px] text-muted-foreground">عملية مسجلة</p>
        </div>
        <div className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="text-[11px] uppercase">الطلبات الناجحة</span>
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
            {stats.success.toLocaleString()}{" "}
            <span className="text-xs font-normal text-muted-foreground">({total > 0 ? ((stats.success / total) * 100).toFixed(1) : 0}%)</span>
          </div>
          <p className="text-[10px] text-muted-foreground">استجابة بنجاح 200</p>
        </div>
        <div className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="text-[11px] uppercase">الطلبات الفاشلة</span>
            <span className="size-1.5 rounded-full bg-rose-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 tabular-nums">
            {stats.failed.toLocaleString()}{" "}
            <span className="text-xs font-normal text-muted-foreground">({total > 0 ? ((stats.failed / total) * 100).toFixed(1) : 0}%)</span>
          </div>
          <p className="text-[10px] text-muted-foreground">أخطاء استدعاء أو سعة</p>
        </div>
        <div className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="text-[11px] uppercase">متوسط الاستجابة</span>
            <span className="size-1.5 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 tabular-nums">
            {stats.avgLatency.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">ms</span>
          </div>
          <p className="text-[10px] text-muted-foreground">زمن معالجة الطلبات</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
        <Select value={providerFilter} onValueChange={(v) => { setProviderFilter(v); setKeyFilter("ALL"); setPage(0); }}>
          <SelectTrigger className="w-[140px] h-8 text-xs font-mono bg-card border-border/70"><SelectValue placeholder="كل المزودين" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل المزودين</SelectItem>
            {providerList.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
          </SelectContent>
        </Select>

        <Select value={keyFilter} onValueChange={(v) => { setKeyFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px] h-8 text-xs font-mono bg-card border-border/70"><SelectValue placeholder="كل المفاتيح" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل المفاتيح</SelectItem>
            {keyOptions.map((k) => (<SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[130px] h-8 text-xs font-mono bg-card border-border/70"><SelectValue placeholder="كل الحالات" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل الحالات</SelectItem>
            <SelectItem value="success">نجاح</SelectItem>
            <SelectItem value="failed">فشل</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-xl border-destructive/30">
          <AlertDescription className="flex items-center justify-between text-xs font-mono">
            <span>فشل تحميل سجل المفاتيح. يرجى المحاولة لاحقاً.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs font-mono">
              <RefreshCw className="size-3 ml-1" /> إعادة المحاولة
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px] rounded-xl border border-border/80 bg-card">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <LoadingSpinner size="sm" />
            <span>جاري استدعاء سجلات المفاتيح...</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-muted/20 border-b border-border/60">
              <TableRow>
                <TableHead className="text-right text-[11px] font-mono">الوقت</TableHead>
                <TableHead className="text-right text-[11px] font-mono">المزود</TableHead>
                <TableHead className="text-right text-[11px] font-mono">المفتاح</TableHead>
                <TableHead className="text-right text-[11px] font-mono">الشركة</TableHead>
                <TableHead className="text-right text-[11px] font-mono">الإجراء</TableHead>
                <TableHead className="text-right text-[11px] font-mono">الحالة</TableHead>
                <TableHead className="text-right text-[11px] font-mono">النموذج</TableHead>
                <TableHead className="text-right text-[11px] font-mono">الزمن</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60 font-mono text-xs">
              {!logs || logs.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">لا توجد سجلات</TableCell></TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="cursor-pointer hover:bg-muted/20 transition-colors" onClick={() => setSelectedLog(log)}>
                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">{timeAgo(log.created_at)}</TableCell>
                    <TableCell><span className="text-[11px] bg-muted/60 px-2 py-0.5 rounded border border-border/60">{log.provider}</span></TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[140px]">{keyNameMap[log.key_id || ""] || log.key_id || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {log.company_id ? (
                        <button onClick={(e) => { e.stopPropagation(); navigate(`/super-admin/companies/${log.company_id}`); }} className="hover:underline text-primary cursor-pointer truncate max-w-[120px] text-right block">
                          {companyNameMap[log.company_id] || log.company_id.substring(0, 8) + "…"}
                        </button>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="inline-flex items-center gap-1.5">{ACTION_LABELS[log.action] || log.action}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border ${statusColor(log.status)}`}>
                        <span className={`size-1.5 rounded-full ${log.status === "success" || log.status === "ok" ? "bg-emerald-500" : "bg-rose-500"}`} />
                        {STATUS_LABELS[log.status] || log.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[140px]">{log.model || "—"}</TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {log.latency_ms != null ? (<span className={latencyColor(log.latency_ms)}>{log.latency_ms}ms</span>) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-card font-mono text-xs">
          <span className="text-muted-foreground">صفحة {page + 1} من {totalPages} ({total.toLocaleString()} سجل)</span>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)} className="h-7 text-xs font-mono">
              <ChevronRight className="size-3.5 ml-1" /> السابق
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="h-7 text-xs font-mono">
              التالي <ChevronLeft className="size-3.5 mr-1" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!selectedLog} onOpenChange={(o) => { if (!o) setSelectedLog(null); }}>
        <DialogContent className="max-w-md font-mono text-xs" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">تفاصيل سجل الاستدعاء</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">معلومات كاملة عن طلب المزود والنموذج</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-2.5 border border-border/60 rounded-xl p-3 bg-muted/10 font-mono text-xs">
              <div className="grid grid-cols-3 gap-2 items-center">
                <span className="text-muted-foreground">الوقت</span>
                <span className="col-span-2 font-semibold text-foreground">{formatTime(selectedLog.created_at)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <span className="text-muted-foreground">المزود والنموذج</span>
                <span className="col-span-2 font-semibold text-foreground">{selectedLog.provider} / {selectedLog.model || "—"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <span className="text-muted-foreground">المفتاح</span>
                <span className="col-span-2 truncate">{keyNameMap[selectedLog.key_id || ""] || selectedLog.key_id || "—"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <span className="text-muted-foreground">الزمن والحالة</span>
                <span className="col-span-2 font-semibold text-foreground">{selectedLog.latency_ms != null ? `${selectedLog.latency_ms}ms` : "—"} ({STATUS_LABELS[selectedLog.status] || selectedLog.status})</span>
              </div>
              {selectedLog.error && (
                <div className="border-t border-border/40 pt-2 text-rose-600 bg-rose-500/10 p-2 rounded text-[11px] font-mono" dir="ltr">
                  {selectedLog.error}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SuperAdminAIKeyLogs;