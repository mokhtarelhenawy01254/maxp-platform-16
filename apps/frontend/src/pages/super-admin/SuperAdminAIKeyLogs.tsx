import React, { useState, useMemo, useCallback } from "react";
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
    <div className="p-4 max-w-[1440px] mx-auto">
      <h1 className="text-2xl font-bold mb-4">سجل استخدام المفاتيح</h1>
      <KeyLogsContent />
    </div>
  );
}

function KeyLogsContent() {
  const navigate = useNavigate();
  const { data: keys } = useAiKeys();
  const [providerFilter, setProviderFilter] = useState("");
  const [keyFilter, setKeyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);

  const [refreshTick, setRefreshTick] = useState(0);

  const [selectedLog, setSelectedLog] = useState<AiKeyLog | null>(null);

  const { data: companies } = useQuery({
    queryKey: ["super-admin", "companies"],
    queryFn: () => companyAwareApi.getAllCompanies({ pageSize: 0 }),
    staleTime: 300_000,
    select: (res) => res.data?.data?.companies ?? [],
  });

  const companyNameMap = useMemo(() => {
    if (!Array.isArray(companies)) return {};
    const map: Record<string, string> = {};
    for (const c of companies) map[c.id] = c.name;
    return map;
  }, [companies]);

  const offset = page * PAGE_SIZE;

  const { data: logsRes, isLoading, isFetching, error, refetch } = useAiKeyLogs({
    provider: providerFilter || undefined,
    key_id: keyFilter || undefined,
    status: statusFilter || undefined,
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
    return keys.filter((k) => !providerFilter || k.provider === providerFilter)
      .map((k) => ({ id: k.id, name: k.name }));
  }, [keys, providerFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const stats = useMemo(() => {
    if (!Array.isArray(logs)) return { total: 0, success: 0, failed: 0, avgLatency: 0 };
    const success = logs.filter((l) => l.status === "success" || l.status === "ok").length;
    const failed = logs.filter((l) => l.status === "failed" || l.status === "error").length;
    const latencies = logs.map((l) => l.latency_ms).filter((v): v is number => v != null);
    const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    return { total: logs.length, success, failed, avgLatency };
  }, [logs]);

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

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>فشل تحميل السجل. يرجى المحاولة مرة أخرى.</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="size-4 ml-1" /> إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card className="relative overflow-hidden col-span-2 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">إجمالي السجلات</p>
                <p className="text-2xl font-bold mt-1">{total.toLocaleString()}</p>
              </div>
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Activity className="size-4 text-primary" />
              </div>
            </div>
            <div className="mt-3 h-1 bg-primary/10 rounded-full overflow-hidden">
              <div className="h-full w-full bg-primary/30 rounded-full animate-pulse" />
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-green-200/50 dark:border-green-800/30">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">ناجح</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.success}</p>
              </div>
              <div className="size-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-red-200/50 dark:border-red-800/30">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">فاشل</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{stats.failed}</p>
              </div>
              <div className="size-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <XCircle className="size-4 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden col-span-2 md:col-span-1 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border-amber-200/50 dark:border-amber-800/30">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">متوسط الزمن</p>
                <p className="text-2xl font-bold mt-1">{stats.avgLatency} <span className="text-sm font-normal text-muted-foreground">ms</span></p>
              </div>
              <div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <Zap className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            {stats.avgLatency > 0 && (
              <div className="mt-3 h-1 bg-amber-100 dark:bg-amber-900/30 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 transition-all"
                  style={{ width: `${Math.min(100, stats.avgLatency / 20)}%` }} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Select value={providerFilter} onValueChange={(v) => { setProviderFilter(v); setKeyFilter(""); setPage(0); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="كل المزودين" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">كل المزودين</SelectItem>
            {providerList.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={keyFilter} onValueChange={(v) => { setKeyFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="كل المفاتيح" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">كل المفاتيح</SelectItem>
            {keyOptions.map((k) => (
              <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="كل الحالات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">كل الحالات</SelectItem>
            <SelectItem value="success">نجاح</SelectItem>
            <SelectItem value="failed">فشل</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={handleRefresh} title="تحديث" className={isFetching ? "animate-spin" : ""}>
          <RefreshCw className="size-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={exportCSV} title="تصدير CSV"
          disabled={!logs || logs.length === 0}>
          <Download className="size-4 ml-1" /> CSV
        </Button>
        {isFetching && <span className="text-xs text-muted-foreground">جاري التحديث…</span>}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="border rounded-xl bg-card/80 backdrop-blur-xl shadow-sm">
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