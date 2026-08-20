import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { apiClient, type ApiRequestConfig } from "../../services/apiClient";
import { WhatsAppPageShell } from "./components/WhatsAppPageShell";

interface WhatsAppNotificationLogsProps {
  companyId?: string;
  companyName?: string;
  superAdminMode?: boolean;
}

interface LogEntry {
  id: string;
  status: string;
  messageType: string;
  sessionId?: string | null;
  recipientPhone: string;
  recipientName?: string | null;
  eventType: string;
  category: string;
  content?: string | null;
  failureReason?: string | null;
  errorCode?: string | null;
  whatsappMessageId?: string | null;
  createdAt: string;
  templateName?: string | null;
  metaTemplateName?: string | null;
  templateChannel?: string | null;
  orderNumber?: string | null;
  orderTotal?: string | null;
  sessionName?: string | null;
  sessionPhone?: string | null;
  sessionProvider?: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  SENT: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-400",
  DELIVERED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-400",
  READ: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-900/20 dark:text-sky-400",
  FAILED:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400",
  PENDING:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-400",
  CANCELLED:
    "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400",
};

const MESSAGE_TYPE_STYLES: Record<string, string> = {
  TEMPLATE:
    "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-400",
  BUTTONS:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-400",
  TEXT: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400",
  LIST: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-400",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "قيد الانتظار",
  QUEUED: "في الطابور",
  SENDING: "جاري الإرسال",
  SENT: "تم الإرسال",
  DELIVERED: "تم التسليم",
  READ: "تم القراءة",
  FAILED: "فشل",
  CANCELLED: "ملغي",
};

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  TEMPLATE: "قالب ميتا",
  BUTTONS: "أزرار",
  TEXT: "نص حر",
  LIST: "قائمة",
};

const EVENT_LABELS: Record<string, string> = {
  ORDER_CREATED: "طلب جديد",
  ORDER_CONFIRMED: "تأكيد الطلب",
  ORDER_PROCESSING: "قيد التنفيذ",
  ORDER_SHIPPED: "تم الشحن",
  ORDER_DELIVERED: "تم التسليم",
  ORDER_CANCELLED: "إلغاء الطلب",
  ORDER_RETURNED: "تم الإرجاع",
  PAYMENT_REMINDER: "تذكير بالدفع",
  ABANDONED_CART: "سلة متروكة",
  WELCOME_MESSAGE: "رسالة ترحيب",
};

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const WhatsAppNotificationLogs: React.FC<WhatsAppNotificationLogsProps> = ({
  companyId,
  companyName,
  superAdminMode = false,
}) => {
  const { t, i18n } = useTranslation();

  const pageTitle = companyName
    ? `${t("whatsappNotificationLogs.title")} · ${companyName}`
    : t("whatsappNotificationLogs.title");
  const backHref =
    superAdminMode && companyId
      ? `/super-admin/whatsapp/companies/${companyId}`
      : "/whatsapp/notifications";
  const eyebrow =
    superAdminMode && companyName
      ? i18n.language === "ar"
        ? `شركة: ${companyName}`
        : `Company: ${companyName}`
      : undefined;

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState("");
  const [messageTypeFilter, setMessageTypeFilter] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const withCompanyConfig = useCallback(
    (config: ApiRequestConfig = {}) =>
      companyId ? { ...config, _companyId: companyId } : config,
    [companyId],
  );

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get("/whatsapp-notifications/logs", withCompanyConfig({
        params: {
          page: page + 1,
          limit: rowsPerPage,
          status: statusFilter || undefined,
          eventType: eventTypeFilter || undefined,
          search: search || undefined,
        },
      }));
      setLogs((response as any).data.logs || []);
      setTotal((response as any).data.pagination?.total || 0);
    } catch (loadError: any) {
      console.error("Error fetching notification logs:", loadError);
      setError(loadError?.response?.data?.error || loadError?.message || "حدث خطأ أثناء جلب السجلات");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, statusFilter, eventTypeFilter, search, withCompanyConfig]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchLogs();
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch sessions for the session filter dropdown
  const [sessions, setSessions] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiClient.get("/whatsapp-notifications/settings", withCompanyConfig({}));
        if (mounted) {
          const sessionList = (res as any).data?.sessions || [];
          setSessions(
            sessionList.map((s: any) => ({ id: s.id, name: s.name || s.phoneNumber || s.id })),
          );
        }
      } catch (e) {
        // غير حرج — قائمة الجلسات اختيارية
      }
    })();
    return () => {
      mounted = false;
    };
  }, [withCompanyConfig]);

  // Client-side session filter (API doesn't support it directly)
  const visibleLogs = useMemo(() => {
    if (!sessionFilter) return logs;
    return logs.filter((l) => l.sessionId === sessionFilter || l.sessionName === sessionFilter);
  }, [logs, sessionFilter]);

  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const from = total === 0 ? 0 : page * rowsPerPage + 1;
  const to = total === 0 ? 0 : Math.min(total, (page + 1) * rowsPerPage);

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US", {
        dateStyle: "short",
        timeStyle: "short",
      });
    } catch {
      return value;
    }
  };

  if (loading && logs.length === 0) {
    return (
      <WhatsAppPageShell
        title={pageTitle}
        description={t("whatsappNotificationLogs.description")}
        icon={ClipboardList}
        backHref={backHref}
        backLabel={t("common.back") as string}
        eyebrow={eyebrow}
      >
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </WhatsAppPageShell>
    );
  }

  return (
    <WhatsAppPageShell
      title={pageTitle}
      description={t("whatsappNotificationLogs.description")}
      icon={ClipboardList}
      backHref={backHref}
      backLabel={t("common.back") as string}
      eyebrow={eyebrow}
      actions={
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
          {t("common.refresh")}
        </Button>
      }
    >
      {/* فلاتر */}
      <div className="mb-4 grid gap-3 rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
          <Input
            value={search}
            onChange={(e) => {
              setPage(0);
              setSearch(e.target.value);
            }}
            placeholder={t("whatsappNotificationLogs.searchPlaceholder") as string}
            className="pr-9"
          />
        </div>

        <Select
          value={statusFilter || "__all__"}
          onValueChange={(v) => {
            setPage(0);
            setStatusFilter(v === "__all__" ? "" : (v ?? ""));
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("whatsappNotificationLogs.statusFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("common.all")}</SelectItem>
            {Object.entries(STATUS_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={messageTypeFilter || "__all__"}
          onValueChange={(v) => {
            setPage(0);
            setMessageTypeFilter(v === "__all__" ? "" : (v ?? ""));
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("whatsappNotificationLogs.typeFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("common.all")}</SelectItem>
            {Object.entries(MESSAGE_TYPE_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={eventTypeFilter || "__all__"}
          onValueChange={(v) => {
            setPage(0);
            setEventTypeFilter(v === "__all__" ? "" : (v ?? ""));
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("whatsappNotificationLogs.eventFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("common.all")}</SelectItem>
            {Object.entries(EVENT_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sessionFilter || "__all__"}
          onValueChange={(v) => {
            setPage(0);
            setSessionFilter(v === "__all__" ? "" : (v ?? ""));
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("whatsappNotificationLogs.sessionFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("common.all")}</SelectItem>
            {sessions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("whatsappNotificationLogs.recipient")}</TableHead>
              <TableHead>{t("whatsappNotificationLogs.session")}</TableHead>
              <TableHead>{t("whatsappNotificationLogs.type")}</TableHead>
              <TableHead>{t("whatsappNotificationLogs.event")}</TableHead>
              <TableHead>{t("whatsappNotificationLogs.status")}</TableHead>
              <TableHead>{t("whatsappNotificationLogs.failureReason")}</TableHead>
              <TableHead>{t("whatsappNotificationLogs.date")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleLogs.length > 0 ? (
              visibleLogs.map((log) => (
                <TableRow
                  key={log.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="font-medium text-[color:var(--color-foreground)]">
                        {log.recipientName || t("whatsappNotificationLogs.unknownRecipient")}
                      </div>
                      <div className="text-xs text-[color:var(--color-muted-foreground)]" dir="ltr">
                        {log.recipientPhone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="text-sm text-[color:var(--color-foreground)]">
                        {log.sessionName || "—"}
                      </div>
                      {log.sessionPhone ? (
                        <div className="text-xs text-[color:var(--color-muted-foreground)]" dir="ltr">
                          {log.sessionPhone}
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full",
                        MESSAGE_TYPE_STYLES[log.messageType] ||
                          MESSAGE_TYPE_STYLES["TEXT"],
                      )}
                    >
                      {MESSAGE_TYPE_LABELS[log.messageType] || log.messageType || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-[color:var(--color-muted-foreground)]">
                      {EVENT_LABELS[log.eventType] || log.eventType}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full",
                        STATUS_STYLES[log.status] || STATUS_STYLES["CANCELLED"],
                      )}
                    >
                      {log.status === "SENT" && log.messageType === "BUTTONS" ? (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="size-3" />
                          {STATUS_LABELS[log.status] || log.status}
                        </span>
                      ) : log.status === "FAILED" ? (
                        <span className="flex items-center gap-1">
                          <XCircle className="size-3" />
                          {STATUS_LABELS[log.status] || log.status}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="size-3" />
                          {STATUS_LABELS[log.status] || log.status}
                        </span>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {log.status === "FAILED" && log.failureReason ? (
                      <span
                        className="block max-w-[220px] truncate text-xs text-red-600 dark:text-red-400"
                        title={log.failureReason}
                      >
                        {log.failureReason}
                      </span>
                    ) : (
                      <span className="text-xs text-[color:var(--color-muted-foreground)]">—</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-[color:var(--color-muted-foreground)]">
                    {formatDate(log.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-center">
                    <ClipboardList className="size-10 text-[color:var(--color-muted-foreground)]" />
                    <p className="font-medium text-[color:var(--color-foreground)]">
                      {t("whatsappNotificationLogs.noLogs")}
                    </p>
                    <p className="text-sm text-[color:var(--color-muted-foreground)]">
                      {t("whatsappNotificationLogs.noLogsHint")}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-[color:var(--color-muted-foreground)]">
          {t("whatsappAnalytics.logs.displayedRows", { from, to, count: total })}
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={String(rowsPerPage)}
            onValueChange={(v) => {
              setRowsPerPage(Number(v));
              setPage(0);
            }}
          >
            <SelectTrigger className="w-[7rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROWS_PER_PAGE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronRight className="size-4 rtl:rotate-180" />
            </Button>
            <span className="min-w-[3rem] text-center text-sm text-[color:var(--color-muted-foreground)]">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              <ChevronLeft className="size-4 rtl:rotate-180" />
            </Button>
          </div>
        </div>
      </div>

      {/* تفاصيل الرسالة */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("whatsappNotificationLogs.detailsTitle")}</DialogTitle>
            <DialogDescription>
              {selectedLog ? formatDate(selectedLog.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedLog ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[color:var(--shell-control-border)] p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                    {t("whatsappNotificationLogs.recipient")}
                  </div>
                  <div className="mt-1 font-medium">
                    {selectedLog.recipientName || "—"}
                  </div>
                  <div className="text-xs text-[color:var(--color-muted-foreground)]" dir="ltr">
                    {selectedLog.recipientPhone}
                  </div>
                </div>
                <div className="rounded-xl border border-[color:var(--shell-control-border)] p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                    {t("whatsappNotificationLogs.session")}
                  </div>
                  <div className="mt-1 font-medium">{selectedLog.sessionName || "—"}</div>
                  <div className="text-xs text-[color:var(--color-muted-foreground)]" dir="ltr">
                    {selectedLog.sessionPhone || ""} {selectedLog.sessionProvider ? `· ${selectedLog.sessionProvider}` : ""}
                  </div>
                </div>
                <div className="rounded-xl border border-[color:var(--shell-control-border)] p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                    {t("whatsappNotificationLogs.type")}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full",
                        MESSAGE_TYPE_STYLES[selectedLog.messageType] ||
                          MESSAGE_TYPE_STYLES["TEXT"],
                      )}
                    >
                      {MESSAGE_TYPE_LABELS[selectedLog.messageType] || selectedLog.messageType || "—"}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-xl border border-[color:var(--shell-control-border)] p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                    {t("whatsappNotificationLogs.status")}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full",
                        STATUS_STYLES[selectedLog.status] || STATUS_STYLES["CANCELLED"],
                      )}
                    >
                      {STATUS_LABELS[selectedLog.status] || selectedLog.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {selectedLog.templateName || selectedLog.metaTemplateName ? (
                <div className="rounded-xl border border-[color:var(--shell-control-border)] p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                    {t("whatsappNotificationLogs.template")}
                  </div>
                  <div className="mt-1 text-sm">
                    {selectedLog.templateName || "—"}
                    {selectedLog.metaTemplateName ? (
                      <span className="mr-2 rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" dir="ltr">
                        {selectedLog.metaTemplateName}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {selectedLog.failureReason ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-900/20">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-red-600 dark:text-red-400">
                    {t("whatsappNotificationLogs.failureReason")}
                  </div>
                  <div className="mt-1 text-sm text-red-700 dark:text-red-400">
                    {selectedLog.failureReason}
                  </div>
                  {selectedLog.errorCode ? (
                    <div className="mt-1 text-xs text-red-500" dir="ltr">
                      {selectedLog.errorCode}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {selectedLog.content ? (
                <div className="rounded-xl border border-[color:var(--shell-control-border)] p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                    {t("whatsappNotificationLogs.messageContent")}
                  </div>
                  <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[color:var(--color-muted)] p-3 text-xs leading-5 text-[color:var(--color-foreground)]">
                    {selectedLog.content}
                  </pre>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                {selectedLog.orderNumber ? (
                  <div className="rounded-xl border border-[color:var(--shell-control-border)] p-3">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                      {t("whatsappNotificationLogs.order")}
                    </div>
                    <div className="mt-1 text-sm" dir="ltr">
                      {selectedLog.orderNumber}
                    </div>
                  </div>
                ) : null}
                {selectedLog.whatsappMessageId ? (
                  <div className="rounded-xl border border-[color:var(--shell-control-border)] p-3">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                      {t("whatsappNotificationLogs.messageId")}
                    </div>
                    <div className="mt-1 truncate text-xs text-[color:var(--color-muted-foreground)]" dir="ltr">
                      {selectedLog.whatsappMessageId}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </WhatsAppPageShell>
  );
};

export default WhatsAppNotificationLogs;
