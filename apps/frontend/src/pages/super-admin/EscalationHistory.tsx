import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  ArrowRight,
  Clock,
  RefreshCw,
  AlertTriangle,
  User,
  ArrowLeftRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Button } from "../../components/ui/button";

interface EscalationLog {
  id: string;
  taskId: string;
  task: {
    id: string;
    title: string;
  };
  memberId: string;
  member: {
    user: {
      firstName: string;
      lastName: string;
      avatar: string | null;
    };
  };
  description: string;
  createdAt: string;
  fromUser: string;
  toUser: string;
}

const EscalationHistory = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<EscalationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchHistory(true);
  }, [page]);

  const fetchHistory = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch(
        buildApiUrl(`super-admin/dev/escalations?page=${page}&limit=20`),
        {
          headers: tokenManager.createAuthHeaders(),
        },
      );
      const data = await res.json();
      if (data.success) {
        const rawLogs = Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.data?.escalations)
            ? data.data.escalations
            : Array.isArray(data.data?.logs)
              ? data.data.logs
              : [];
        setLogs(rawLogs);
        setTotalPages(data.pagination?.pages || 1);
        setTotalCount(data.pagination?.total || rawLogs.length);
      }
    } catch (error) {
      console.error("Failed to fetch history", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const uniqueTasksCount = useMemo(
    () => (Array.isArray(logs) ? new Set(logs.map((l) => l.taskId).filter(Boolean)).size : 0),
    [logs],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <RefreshCw className="size-4 animate-spin text-primary" />
          <span>جاري استدعاء سجل التصعيد...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto" dir={i18n.dir()}>
      {/* Linear Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-card flex items-center justify-center text-foreground shadow-2xs">
            <ShieldAlert className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                سجل تصعيد المهام
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                {totalCount} تصعيد
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              تدقيق ومتابعة المهام التي تم تحويلها أو تصعيدها تلقائياً بسبب فوات مواعيد التنفيذ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchHistory(false)}
            disabled={refreshing}
            className="h-8 text-xs font-medium gap-1.5 shadow-2xs active:scale-[0.98] transition-transform"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            <span>تحديث</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.history.back()}
            className="h-8 text-xs font-medium gap-1.5 shadow-2xs active:scale-[0.98] transition-transform"
          >
            <ArrowRight className="size-3.5 rtl:rotate-0 rotate-180" />
            <span>عودة</span>
          </Button>
        </div>
      </div>

      {/* Linear Telemetry Strip */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x sm:rtl:divide-x-reverse divide-border/60">
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">إجمالي سجلات التصعيد</span>
              <span className="size-1.5 rounded-full bg-primary" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {totalCount}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">مهام تم تصعيدها</span>
              <span className="size-1.5 rounded-full bg-amber-500" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {uniqueTasksCount}
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">الصفحة الحالية</span>
              <span className="size-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {page} / {totalPages}
            </div>
          </div>
        </div>
      </div>

      {/* Single-Surface Table Chassis */}
      <div className="rounded-xl border border-border/80 dark:border-border/60 bg-card shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead className="border-b border-border/60 bg-muted/20 text-muted-foreground uppercase text-[11px] font-mono">
              <tr>
                <th className="px-4 py-3 font-semibold">المهمة المستهدفة</th>
                <th className="px-4 py-3 font-semibold">المُصعّد منه</th>
                <th className="px-4 py-3 font-semibold">المُصعّد إليه</th>
                <th className="px-4 py-3 font-semibold">سبب التصعيد والوصف</th>
                <th className="px-4 py-3 font-semibold">تاريخ وساعة الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {!Array.isArray(logs) || logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground">
                    لا توجد سجلات تصعيد حالياً
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5 max-w-xs">
                        <a
                          href={`/super-admin/dev-tasks/${log.task?.id || log.taskId || ""}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors truncate"
                          title={log.task?.title || "مهمة تطوير"}
                        >
                          {log.task?.title || log.taskId || "مهمة تطوير"}
                        </a>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ID: {(log.task?.id || log.taskId || "-").slice(0, 10)}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-foreground/80 font-mono">
                        <span className="size-6 rounded-md bg-muted/60 border border-border/60 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                          {log.fromUser ? log.fromUser.charAt(0) : "؟"}
                        </span>
                        <span>{log.fromUser || "النظام"}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-medium text-foreground font-mono">
                        <span className="size-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                          {log.toUser ? log.toUser.charAt(0) : "؟"}
                        </span>
                        <span>{log.toUser || "المسؤول"}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-muted-foreground leading-relaxed max-w-md">
                      {log.description || "-"}
                    </td>

                    <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
                      {log.createdAt ? format(new Date(log.createdAt), "yyyy/MM/dd - HH:mm", { locale: ar }) : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-border/60 bg-muted/10 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-mono">
              صفحة {page} من {totalPages} ({totalCount} سجل)
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-7 text-xs font-mono"
              >
                <ChevronRight className="size-3.5 ml-1" /> السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-7 text-xs font-mono"
              >
                التالي <ChevronLeft className="size-3.5 mr-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EscalationHistory;
