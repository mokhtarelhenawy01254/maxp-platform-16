import React, { useState, useMemo, useCallback } from "react";
import { Badge } from "../../components/ui/badge";
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
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import {
  Search,
  RefreshCw,
  Clock,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "../../components/ui/input";
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

function formatTime(iso: string) {
  const d = new Date(iso);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return d.toLocaleString("ar-EG", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    hour12: false,
  }) + " " + tz;
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
  const { data: keys } = useAiKeys();
  const [providerFilter, setProviderFilter] = useState("");
  const [keyFilter, setKeyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);

  const [refreshTick, setRefreshTick] = useState(0);

  const { data: companies } = useQuery({
    queryKey: ["super-admin", "companies"],
    queryFn: () => companyAwareApi.getAllCompanies(),
    staleTime: 300_000,
  });

  const companyNameMap = useMemo(() => {
    if (!companies?.data) return {};
    const map: Record<string, string> = {};
    for (const c of companies.data) map[c.id] = c.name;
    return map;
  }, [companies]);

  const { data: logs, isLoading, error } = useAiKeyLogs({
    provider: providerFilter || undefined,
    key_id: keyFilter || undefined,
    status: statusFilter || undefined,
    limit: 200,
  }, refreshTick);

  function handleRefresh() {
    setRefreshTick((t) => t + 1);
    setPage(0);
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

  const filtered = useMemo(() => {
    if (!Array.isArray(logs)) return [];
    let result = logs;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter((l) =>
        l.provider?.toLowerCase().includes(q) ||
        l.action?.toLowerCase().includes(q) ||
        l.model?.toLowerCase().includes(q) ||
        l.key_id?.toLowerCase().includes(q) ||
        keyNameMap[l.key_id || ""]?.toLowerCase().includes(q)
      );
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((l) => new Date(l.created_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setDate(to.getDate() + 1);
      result = result.filter((l) => new Date(l.created_at) < to);
    }
    return result;
  }, [logs, searchTerm, dateFrom, dateTo, keyNameMap]);

  const paged = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

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
    const header = "الوقت,المزود,المفتاح,الإجراء,الحالة,النموذج,الزمن (ms)\n";
    const rows = logs.map((l) =>
      `"${formatTime(l.created_at)}","${l.provider}","${keyNameMap[l.key_id || ""] || l.key_id || ""}","${ACTION_LABELS[l.action] || l.action}","${STATUS_LABELS[l.status] || l.status}","${l.model || ""}","${l.latency_ms ?? ""}"`
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
      <Alert variant="destructive">
        <AlertDescription>فشل تحميل السجل. يرجى المحاولة مرة أخرى.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">إجمالي</p>
          <p className="text-xl font-bold">{stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">ناجح</p>
          <p className="text-xl font-bold text-green-600">{stats.success}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">فاشل</p>
          <p className="text-xl font-bold text-red-600">{stats.failed}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-xs text-muted-foreground">متوسط الزمن (ms)</p>
          <p className="text-xl font-bold">{stats.avgLatency}</p>
        </CardContent></Card>
      </div>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input className="pr-9" placeholder="بحث..." value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }} />
        </div>
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
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          className="h-9 rounded border px-2 text-sm bg-background" title="من تاريخ" />
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
          className="h-9 rounded border px-2 text-sm bg-background" title="إلى تاريخ" />
        <Button variant="outline" size="icon" onClick={handleRefresh} title="تحديث">
          <RefreshCw className="size-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={exportCSV} title="تصدير CSV"
          disabled={!logs || logs.length === 0}>
          <Download className="size-4 ml-1" /> CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="border rounded bg-card">
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
              {paged.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    لا توجد سجلات
                  </TableCell>
                </TableRow>
              ) : (
                paged.map((log) => (
                    <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">{formatTime(log.created_at)}</TableCell>
                    <TableCell>
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{log.provider}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.key_id ? (
                        <span title={keyNameMap[log.key_id] || log.key_id}>
                          {(keyNameMap[log.key_id] || log.key_id).substring(0, 12)}{log.key_id.length > 12 ? "..." : ""}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.company_id ? (companyNameMap[log.company_id] || log.company_id.substring(0, 8) + "…") : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{ACTION_LABELS[log.action] || log.action}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${statusColor(log.status)}`}
                        title={log.error || undefined}>
                        {STATUS_LABELS[log.status] || log.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.model || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {log.latency_ms != null ? (
                        <span className="flex items-center gap-1">
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

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            <ChevronRight className="size-4 ml-1" /> السابق
          </Button>
          <span className="text-sm text-muted-foreground">
            صفحة {page + 1} من {totalPages} ({filtered.length} سجل)
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
            التالي <ChevronLeft className="size-4 mr-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default SuperAdminAIKeyLogs;
