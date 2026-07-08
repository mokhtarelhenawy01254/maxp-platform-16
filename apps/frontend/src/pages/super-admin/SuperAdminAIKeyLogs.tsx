import React, { useState, useMemo } from "react";
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
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useAiKeyLogs } from "../../hooks/useAiKeyLogs";
import { useAiKeys } from "../../hooks/useAiAdminData";
import type { AiKeyLog } from "../../types/ai-admin";

const ACTION_LABELS: Record<string, string> = {
  "generation_success": "توليد رد",
  "generation_failed": "فشل توليد",
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
  return d.toLocaleString("ar-SA", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
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
  const { data: logs, isLoading, error } = useAiKeyLogs({
    provider: providerFilter || undefined,
    key_id: keyFilter || undefined,
    status: statusFilter || undefined,
    limit: 200,
  });

  const [refreshTick, setRefreshTick] = useState(0);
  function handleRefresh() {
    setRefreshTick((t) => t + 1);
  }

  const providerList = useMemo(() => {
    if (!Array.isArray(keys)) return [];
    const names = keys.map((k) => k.provider).filter(Boolean);
    return [...new Set(names)];
  }, [keys]);

  const keyOptions = useMemo(() => {
    if (!Array.isArray(keys)) return [];
    return keys
      .filter((k) => !providerFilter || k.provider === providerFilter)
      .map((k) => ({ id: k.id, name: k.name, provider: k.provider }));
  }, [keys, providerFilter]);

  const stats = useMemo(() => {
    if (!Array.isArray(logs)) return { total: 0, success: 0, failed: 0, avgLatency: 0 };
    const success = logs.filter((l) => l.status === "success" || l.status === "ok").length;
    const failed = logs.filter((l) => l.status === "failed" || l.status === "error").length;
    const latencies = logs.map((l) => l.latency_ms).filter((v): v is number => v != null);
    const avgLatency = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
    return { total: logs.length, success, failed, avgLatency };
  }, [logs]);

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
          <Input className="pr-9" placeholder="بحث..." disabled />
        </div>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
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
        <Select value={keyFilter} onValueChange={setKeyFilter}>
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="كل الحالات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">كل الحالات</SelectItem>
            <SelectItem value="success">نجاح</SelectItem>
            <SelectItem value="failed">فشل</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={handleRefresh} title="تحديث">
          <RefreshCw className="size-4" />
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
                <TableHead>الإجراء</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>النموذج</TableHead>
                <TableHead>الزمن</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!logs || logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    لا توجد سجلات
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">{formatTime(log.created_at)}</TableCell>
                    <TableCell>
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{log.provider}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.key_id ? log.key_id.substring(0, 8) + "..." : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{ACTION_LABELS[log.action] || log.action}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${statusColor(log.status)}`}>
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
    </div>
  );
}

export default SuperAdminAIKeyLogs;
