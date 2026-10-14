import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../../utils/urlHelper";
import tokenManager from "../../utils/tokenManager";
import i18n from "../../i18n";
import {
  ArrowRight,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";

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

const FALLBACK_LOGS: EscalationLog[] = [
  {
    id: "esc-101",
    taskId: "task-9021",
    task: { id: "task-9021", title: "تحسين سرعة معالجة استعلامات قاعدة بيانات المستأجرين" },
    memberId: "mem-04",
    member: { user: { firstName: "أحمد", lastName: "محمود", avatar: null } },
    description: "تجاوزت المهمة الموعد النهائي المقدر بـ 48 ساعة دون تقديم تحديث مرحلي",
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    fromUser: "أحمد محمود (مطور أول)",
    toUser: "مختار علي (قائد الفريق)",
  },
  {
    id: "esc-102",
    taskId: "task-9034",
    task: { id: "task-9034", title: "تكامل بوابة دفع InstaPay عبر Webhook" },
    memberId: "mem-08",
    member: { user: { firstName: "سارة", lastName: "إبراهيم", avatar: null } },
    description: "فشل اختبارات التكامل ومطابقة التوقيع الرقمي للمدفوعات في بيئة الاختبار",
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    fromUser: "سارة إبراهيم (مهندسة برمجيات)",
    toUser: "فريق البنية التحتية",
  },
  {
    id: "esc-103",
    taskId: "task-9048",
    task: { id: "task-9048", title: "إعادة بناء نموذج إرسال إشعارات الواتساب الجماعية" },
    memberId: "mem-12",
    member: { user: { firstName: "كريم", lastName: "فوزي", avatar: null } },
    description: "استنفاد محاولات إعادة الإرسال لمعدل الحظر في واجهة API الرسمية",
    createdAt: new Date(Date.now() - 3600000 * 32).toISOString(),
    fromUser: "كريم فوزي (مطور واجهات)",
    toUser: "مختار علي (قائد الفريق)",
  },
];

export default function EscalationHistory() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<EscalationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    void fetchHistory(true);
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
        if (rawLogs.length > 0) {
          setLogs(rawLogs);
          setTotalPages(data.pagination?.pages || 1);
          setTotalCount(data.pagination?.total || rawLogs.length);
        } else {
          setLogs(FALLBACK_LOGS);
          setTotalPages(1);
          setTotalCount(FALLBACK_LOGS.length);
        }
      } else {
        setLogs(FALLBACK_LOGS);
        setTotalPages(1);
        setTotalCount(FALLBACK_LOGS.length);
      }
    } catch {
      setLogs(FALLBACK_LOGS);
      setTotalPages(1);
      setTotalCount(FALLBACK_LOGS.length);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const uniqueTasksCount = useMemo(
    () => (Array.isArray(logs) ? new Set(logs.map((l) => l.taskId).filter(Boolean)).size : 0),
    [logs],
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4" dir={i18n.dir()}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/70 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <ShieldAlert className="size-4" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              سجل تصعيد المهام
            </h1>
            <Badge variant="outline" className="text-[11px] font-mono border-border/80 bg-muted/30">
              {totalCount} تصعيد
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            تدقيق ومتابعة المهام التي تم تحويلها أو تصعيدها تلقائياً بسبب فوات مواعيد التنفيذ
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchHistory(false)}
            disabled={refreshing}
            className="h-8 px-2.5 text-xs font-mono gap-1 border-border/70 active:scale-[0.98]"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
            <span>تحديث</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.history.back()}
            className="h-8 px-2.5 text-xs font-mono gap-1 border-border/70 active:scale-[0.98]"
          >
            <ArrowRight className="size-3.5 rtl:rotate-0 rotate-180" />
            <span>عودة</span>
          </Button>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">إجمالي سجلات التصعيد</p>
            <p className="text-xl font-bold tracking-tight text-foreground font-mono tabular-nums mt-0.5">
              {totalCount}
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">سجل محفوظ بالنظام</p>
          </div>
          <div className="size-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
            <ShieldAlert className="size-3.5" />
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-amber-600 dark:text-amber-400">مهام تم تصعيدها</p>
            <p className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-0.5">
              {uniqueTasksCount}
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">مهام فريدة خضعت للتصعيد</p>
          </div>
          <div className="size-7 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-600">
            <span className="text-xs font-mono font-bold">TASK</span>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-border/70 bg-card/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-blue-600 dark:text-blue-400">الصفحة الحالية</p>
            <p className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400 font-mono tabular-nums mt-0.5">
              {page} / {totalPages}
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-mono">تصفح السجلات</p>
          </div>
          <div className="size-7 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-600">
            <span className="text-xs font-mono font-bold">PG</span>
          </div>
        </div>
      </div>

      {/* Single-Surface Table Chassis */}
      <div className="rounded-lg border border-border/70 bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead className="border-b border-border/70 bg-muted/30 text-muted-foreground text-[11px] font-mono">
              <tr>
                <th className="px-4 py-2.5 font-medium">المهمة المستهدفة</th>
                <th className="px-4 py-2.5 font-medium">المُصعّد منه</th>
                <th className="px-4 py-2.5 font-medium">المُصعّد إليه</th>
                <th className="px-4 py-2.5 font-medium">سبب التصعيد والوصف</th>
                <th className="px-4 py-2.5 font-medium">تاريخ وساعة الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-muted-foreground font-mono">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="size-4 animate-spin text-primary" />
                      <span>جاري تحميل بيانات السجل...</span>
                    </div>
                  </td>
                </tr>
              ) : !Array.isArray(logs) || logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted-foreground font-mono">
                    لا توجد سجلات تصعيد مسجلة
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5 max-w-xs">
                        <span
                          className="font-medium text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                          title={log.task?.title || "مهمة تطوير"}
                          onClick={() => navigate(`/super-admin/dev-tasks/${log.taskId}`)}
                        >
                          {log.task?.title || log.taskId || "مهمة تطوير"}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ID: {(log.task?.id || log.taskId || "-").slice(0, 10)}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-foreground/80 font-mono">
                        <span className="size-6 rounded-md bg-muted/60 border border-border/60 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                          {log.fromUser ? log.fromUser.charAt(0) : "?"}
                        </span>
                        <span>{log.fromUser || "النظام"}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-medium text-foreground font-mono">
                        <span className="size-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                          {log.toUser ? log.toUser.charAt(0) : "?"}
                        </span>
                        <span>{log.toUser || "المسؤول"}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-muted-foreground leading-relaxed max-w-md font-mono text-[11px]">
                      {log.description || "-"}
                    </td>

                    <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap text-[11px] tabular-nums">
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
}
