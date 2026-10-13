import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Card, CardContent } from "../../components/ui/card";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
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
  generation_success: "توليد رد",
  generation_failed: "فشل توليد",
  "key.created": "إنشاء مفتاح",
  "key.updated": "تحديث مفتاح",
  "key.test": "اختبار مفتاح",
};

const STATUS_LABELS: Record<string, string> = {
  success: "نجاح",
  ok: "نجاح",
  failed: "فشل",
  error: "خطأ",
};

function statusColor(status?: string) {
  if (!status) return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  const s = status.toLowerCase();
  if (s === "success" || s === "ok") return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
  return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
}

function latencyColor(ms: number) {
  if (ms < 1000) return "text-green-600";
  if (ms < 5000) return "text-yellow-600";
  return "text-red-600";
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return d.toLocaleString("ar-EG", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    hour12: false,
  }) + " " + tz;
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
  return (
    <div className="space-y-4">
      <KeyLogsContent />
    </div>
  );
}

function KeyLogsContent() {
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
    limit: PAGE_SIZE,
    offset,
  }, refreshTick);

  const logs = useMemo(() => {
    if (!logsRes?.items) return undefined;
    return [...logsRes.items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [logsRes?.items]);
  const total = logsRes?.total ?? 0;

  function handleRefresh() {
    setRefreshTick((t) => t + 1);
  }

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
      return {
        total,
        success: logsRes.success_count,
        failed: logsRes.failed_count ?? 0,
        avgLatency: logsRes.avg_latency ?? 0,
      };
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono uppercase bg-primary/10 text-primary border border-primary/20">
              <Key className="h-3 w-3" />
              الذكاء الاصطناعي المركزي
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

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
            className="h-8 text-xs font-mono gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            disabled={!logs || logs.length === 0}
            className="h-8 text-xs font-mono gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>تصدير CSV</span>
          </Button>
        </div>
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 rounded-xl border border-border/80 bg-card/40 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px] font-mono uppercase">إجمالي السجلات</span>
            <span className="size-1.5 rounded-full bg-primary" />
          </div>
          <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
            {total.toLocaleString()}
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">عملية مسجلة</p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px] font-mono uppercase">الطلبات الناجحة</span>
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {stats.success.toLocaleString()}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              ({total > 0 ? ((stats.success / total) * 100).toFixed(1) : 0}%)
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">استجابة بنجاح 200</p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px] font-mono uppercase">الطلبات الفاشلة</span>
            <span className="size-1.5 rounded-full bg-rose-500" />
          </div>
          <div className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono tabular-nums">
            {stats.failed.toLocaleString()}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              ({total > 0 ? ((stats.failed / total) * 100).toFixed(1) : 0}%)
            </span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">أخطاء استدعاء أو سعة</p>
        </div>

        <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="font-medium text-[11px] font-mono uppercase">متوسط الاستجابة</span>
            <span className="size-1.5 rounded-full bg-amber-500" />
          </div>
          <div className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums">
            {stats.avgLatency.toLocaleString()}{" "}
            <span className="text-xs font-normal text-muted-foreground">ms</span>
          </div>
          <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">زمن معالجة الطلبات</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={providerFilter} onValueChange={(v) => { setProviderFilter(v); setKeyFilter("ALL"); setPage(0); }}>
          <SelectTrigger className="w-[140px] h-8 text-xs font-mono">
            <SelectValue placeholder="كل المزودين" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل المزودين</SelectItem>
            {providerList.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={keyFilter} onValueChange={(v) => { setKeyFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px] h-8 text-xs font-mono">
            <SelectValue placeholder="كل المفاتيح" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل المفاتيح</SelectItem>
            {keyOptions.map((k) => (
              <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[130px] h-8 text-xs font-mono">
            <SelectValue placeholder="كل الحالات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل الحالات</SelectItem>
            <SelectItem value="success">نجاح</SelectItem>
            <SelectItem value="failed">فشل</SelectItem>
          </SelectContent>
        </Select>

        {isFetching && <span className="text-xs font-mono text-muted-foreground animate-pulse">جاري المزامنة...</span>}
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
            <TableHeader>
              <TableRow>
                <TableHead>الوقت</TableHead>
                <TableHead>المزود</TableHead>
                <TableHead>المفتاح</TableHead>
                <TableHead>الشركة</TableHead>
                <TableHead>الإجراء</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>النموذج</TableHead>
                <TableHead>الزمن</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!logs || logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    لا توجد سجلات
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}
                    className="cursor-pointer hover:bg-muted/50 hover:shadow-sm transition-all duration-200"
                    onClick={() => setSelectedLog(log)}>
                    <TableCell className="text-xs whitespace-nowrap" title={formatTime(log.created_at)}>
                      <span className="font-medium">{timeAgo(log.created_at)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono bg-muted/60 px-2 py-0.5 rounded-md border">{log.provider}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.key_id ? (
                        <span title={keyNameMap[log.key_id] || log.key_id}>
                          {(keyNameMap[log.key_id] || log.key_id).substring(0, 12)}{log.key_id.length > 12 ? "..." : ""}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.company_id ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/super-admin/companies/${log.company_id}`); }}
                          className="hover:underline text-primary cursor-pointer"
                        >
                          {companyNameMap[log.company_id] || log.company_id.substring(0, 8) + "…"}
                        </button>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        {log.action.startsWith("generation") ? <Zap className="size-3 text-amber-500" /> :
                         log.action === "key.created" ? <Building2 className="size-3 text-blue-500" /> :
                         log.action === "key.updated" ? <RefreshCw className="size-3 text-purple-500" /> :
                         log.action === "key.test" ? <Activity className="size-3 text-teal-500" /> : null}
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${statusColor(log.status)}`}
                        title={log.error || undefined}>
                        <span className={`size-1.5 rounded-full ${log.status === "success" || log.status === "ok" ? "bg-green-500" : "bg-red-500"}`} />
                        {STATUS_LABELS[log.status] || log.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.model || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {log.latency_ms != null ? (
                        <span className={`flex items-center gap-1 ${latencyColor(log.latency_ms)}`}>
                          <Clock className="size-3" />
                          {log.latency_ms}ms
                        </span>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            <ChevronRight className="size-4 ml-1" /> السابق
          </Button>
          <span className="text-sm text-muted-foreground">
            صفحة {page + 1} من {totalPages} ({total.toLocaleString()} سجل)
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
            التالي <ChevronLeft className="size-4 mr-1" />
          </Button>
        </div>
      )}

      <Dialog open={!!selectedLog} onOpenChange={(o) => { if (!o) setSelectedLog(null); }}>
        <DialogContent className="max-w-lg" dir="rtl">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary/5 to-transparent rounded-lg" />
          <DialogHeader>
            <DialogTitle>تفاصيل السجل</DialogTitle>
            <DialogDescription>معلومات كاملة عن طلب المزود</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-2 items-center">
                <span className="text-muted-foreground flex items-center gap-1.5"><Clock className="size-3" /> الوقت</span>
                <span className="col-span-2 font-medium">{formatTime(selectedLog.created_at)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <span className="text-muted-foreground flex items-center gap-1.5"><Database className="size-3" /> المزود</span>
                <span className="col-span-2">
                  <span className="text-xs font-mono bg-muted/60 px-2 py-0.5 rounded-md border">{selectedLog.provider}</span>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <span className="text-muted-foreground flex items-center gap-1.5"><Key className="size-3" /> المفتاح</span>
                <span className="col-span-2 font-mono text-xs">{keyNameMap[selectedLog.key_id || ""] || selectedLog.key_id || "—"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <span className="text-muted-foreground flex items-center gap-1.5"><Building2 className="size-3" /> الشركة</span>
                <span className="col-span-2">
                  {selectedLog.company_id ? (
                    <button
                      onClick={() => navigate(`/super-admin/companies/${selectedLog.company_id}`)}
                      className="hover:underline text-primary cursor-pointer flex items-center gap-1"
                    >
                      {companyNameMap[selectedLog.company_id] || selectedLog.company_id}
                      <ArrowUpRight className="size-3" />
                    </button>
                  ) : "—"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <span className="text-muted-foreground flex items-center gap-1.5"><Activity className="size-3" /> الإجراء</span>
                <span className="col-span-2">
                  <span className="inline-flex items-center gap-1.5">
                    {selectedLog.action.startsWith("generation") ? <Zap className="size-3 text-amber-500" /> :
                     selectedLog.action === "key.created" ? <Building2 className="size-3 text-blue-500" /> :
                     selectedLog.action === "key.updated" ? <RefreshCw className="size-3 text-purple-500" /> :
                     selectedLog.action === "key.test" ? <Activity className="size-3 text-teal-500" /> : null}
                    {ACTION_LABELS[selectedLog.action] || selectedLog.action}
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <span className="text-muted-foreground">{STATUS_LABELS[selectedLog.status] === "نجاح" ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />} الحالة</span>
                <span className="col-span-2">
                  <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${statusColor(selectedLog.status)}`}>
                    <span className={`size-1.5 rounded-full ${selectedLog.status === "success" || selectedLog.status === "ok" ? "bg-green-500" : "bg-red-500"}`} />
                    {STATUS_LABELS[selectedLog.status] || selectedLog.status}
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <span className="text-muted-foreground flex items-center gap-1.5"><Zap className="size-3" /> النموذج</span>
                <span className="col-span-2 font-mono text-xs">{selectedLog.model || "—"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <span className="text-muted-foreground flex items-center gap-1.5"><Clock className="size-3" /> الزمن</span>
                <span className={`col-span-2 flex items-center gap-1 ${selectedLog.latency_ms != null ? latencyColor(selectedLog.latency_ms) : ""}`}>
                  {selectedLog.latency_ms != null ? <><Clock className="size-3" /> {selectedLog.latency_ms}ms</> : "—"}
                </span>
              </div>
              {selectedLog.error && (
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-muted-foreground flex items-center gap-1.5"><XCircle className="size-3 text-red-500" /> الخطأ</span>
                  <span className="col-span-2 text-red-600 break-words bg-red-50 dark:bg-red-950 p-2 rounded text-xs font-mono" dir="ltr">
                    {selectedLog.error}
                  </span>
                </div>
              )}
              {selectedLog.action === "generation_success" && selectedLog.response && (
                <div className="space-y-2 pt-2 border-t">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <Zap className="size-3 text-amber-500" /> الرد المولد
                  </span>
                  <div className="bg-muted/50 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap break-words max-h-80 overflow-y-auto" dir="auto">
                    {selectedLog.response}
                  </div>
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