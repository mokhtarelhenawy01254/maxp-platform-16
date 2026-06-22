import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Eye,
  RefreshCw,
  Send,
  TrendingUp,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

import { apiClient, type ApiRequestConfig } from "../../services/apiClient";
import {
  WhatsAppMetricCard,
  WhatsAppPageShell,
  WhatsAppSurfaceCard,
} from "./components/WhatsAppPageShell";

interface Stats {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  deliveryRate: string;
  readRate: string;
  byCategory: Record<string, number>;
  byEvent: Record<string, number>;
}

interface NotificationLog {
  id: string;
  recipientPhone: string;
  recipientName: string;
  category: string;
  eventType: string;
  content: string;
  status: string;
  sentAt: string;
  createdAt: string;
  template?: { name: string };
  order?: { orderNumber: string };
  customer?: { firstName: string; lastName: string };
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  PENDING:
    "border-amber-300/70 bg-amber-500/10 text-amber-800 dark:border-amber-500/40 dark:text-amber-200",
  QUEUED:
    "border-sky-300/70 bg-sky-500/10 text-sky-800 dark:border-sky-500/40 dark:text-sky-200",
  SENDING:
    "border-sky-300/70 bg-sky-500/10 text-sky-800 dark:border-sky-500/40 dark:text-sky-200",
  SENT:
    "border-emerald-300/70 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-200",
  DELIVERED:
    "border-emerald-300/70 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-200",
  READ: "border-blue-300/70 bg-blue-500/10 text-blue-800 dark:border-blue-500/40 dark:text-blue-200",
  FAILED:
    "border-rose-300/70 bg-rose-500/10 text-rose-800 dark:border-rose-500/40 dark:text-rose-200",
  CANCELLED:
    "border-slate-300/70 bg-slate-500/10 text-slate-700 dark:border-slate-500/40 dark:text-slate-200",
};

interface WhatsAppAnalyticsProps {
  companyId?: string;
  companyName?: string;
  superAdminMode?: boolean;
}

const WhatsAppAnalytics: React.FC<WhatsAppAnalyticsProps> = ({
  companyId,
  companyName,
  superAdminMode = false,
}) => {
  const { t, i18n } = useTranslation();
  const pageTitle = companyName
    ? `${t("whatsappAnalytics.title")} · ${companyName}`
    : t("whatsappAnalytics.title");
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

  const STATUS_LABELS: Record<string, string> = {
    PENDING: t("whatsappNotifications.status.pending"),
    QUEUED: t("whatsappNotifications.status.queued"),
    SENDING: t("whatsappNotifications.status.sending"),
    SENT: t("whatsappNotifications.status.sent"),
    DELIVERED: t("whatsappNotifications.status.delivered"),
    READ: t("whatsappNotifications.status.read"),
    FAILED: t("whatsappNotifications.status.failed"),
    CANCELLED: t("whatsappNotifications.status.cancelled"),
  };

  const CATEGORY_LABELS: Record<string, string> = {
    ORDERS: t("whatsappNotifications.tabs.orders"),
    PRODUCTS: t("whatsappNotifications.tabs.products"),
    MARKETING: t("whatsappNotifications.tabs.marketing"),
    ABANDONED_CART: t("whatsappNotifications.tabs.abandonedCart"),
    HR: t("whatsappNotifications.tabs.hr"),
    SYSTEM: t("common.system"),
  };

  const EVENT_LABELS: Record<string, string> = {
    ORDER_CREATED: t("whatsappNotifications.orders.orderCreated"),
    ORDER_CONFIRMED: t("whatsappNotifications.orders.orderConfirmed"),
    ORDER_PROCESSING: t("whatsappNotifications.orders.orderProcessing"),
    ORDER_SHIPPED: t("whatsappNotifications.orders.orderShipped"),
    ORDER_OUT_FOR_DELIVERY: t("whatsappNotifications.orders.orderShipped"),
    ORDER_DELIVERED: t("whatsappNotifications.orders.orderDelivered"),
    ORDER_CANCELLED: t("whatsappNotifications.orders.orderCancelled"),
    PAYMENT_REMINDER: t("whatsappNotifications.orders.paymentReminder"),
    BACK_IN_STOCK: t("whatsappNotifications.products.backInStock"),
    PRICE_DROP: t("whatsappNotifications.products.priceDrop"),
    CART_ABANDONED_1H: t("whatsappNotifications.abandonedCart.firstReminder"),
    CART_ABANDONED_24H: t("whatsappNotifications.abandonedCart.secondReminder"),
    CART_ABANDONED_WITH_DISCOUNT: t(
      "whatsappNotifications.abandonedCart.incentiveDiscount",
    ),
    PROMOTIONAL: t("whatsappNotifications.marketing.promotional"),
    COUPON_SENT: t("whatsappNotifications.marketing.coupons"),
    BIRTHDAY_WISH: t("whatsappNotifications.marketing.birthday"),
    ATTENDANCE_REMINDER: t("whatsappNotifications.hr.attendance"),
    LEAVE_APPROVED: t("whatsappNotifications.hr.leave"),
    PAYROLL_READY: t("whatsappNotifications.hr.payroll"),
  };

  const fallbackError =
    i18n.language === "ar"
      ? "تعذر تحميل بيانات التحليلات حالياً."
      : "Unable to load analytics data right now.";
  const unknownRecipient =
    i18n.language === "ar" ? "غير معروف" : "Unknown";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalLogs, setTotalLogs] = useState(0);
  const [dateRange, setDateRange] = useState(30);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const withCompanyConfig = useCallback(
    (config: ApiRequestConfig = {}) =>
      companyId ? { ...config, _companyId: companyId } : config,
    [companyId],
  );

  const fetchStats = useCallback(async () => {
    const response = await apiClient.get("/whatsapp-notifications/stats", withCompanyConfig({
      params: { days: dateRange },
    }));
    setStats(response.data.stats);
  }, [dateRange, withCompanyConfig]);

  const fetchLogs = useCallback(async () => {
    const response = await apiClient.get("/whatsapp-notifications/logs", withCompanyConfig({
      params: {
        page: page + 1,
        limit: rowsPerPage,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
      },
    }));

    setLogs(response.data.logs || []);
    setTotalLogs(response.data.pagination?.total || 0);
  }, [categoryFilter, page, rowsPerPage, statusFilter, withCompanyConfig]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        if (isMounted) {
          setLoading(true);
          setError(null);
        }

        await Promise.all([fetchStats(), fetchLogs()]);
      } catch (loadError) {
        console.error("Error fetching WhatsApp analytics:", loadError);
        if (isMounted) {
          setError(fallbackError);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [fallbackError, fetchLogs, fetchStats]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      await Promise.all([fetchStats(), fetchLogs()]);
    } catch (refreshError) {
      console.error("Error refreshing WhatsApp analytics:", refreshError);
      setError(fallbackError);
    } finally {
      setRefreshing(false);
    }
  };

  const formatLocaleDate = (value: string) =>
    new Date(value).toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US");

  const formatPercent = (value: string | number | undefined) => {
    const parsed =
      typeof value === "string" ? parseFloat(value) : Number(value || 0);

    if (!Number.isFinite(parsed)) {
      return "0";
    }

    return parsed.toFixed(parsed % 1 === 0 ? 0 : 1);
  };

  const summaryHint = `${t("whatsappAnalytics.timeRange.label")}: ${
    dateRange === 7
      ? t("whatsappAnalytics.timeRange.last7Days")
      : dateRange === 30
        ? t("whatsappAnalytics.timeRange.last30Days")
        : dateRange === 90
          ? t("whatsappAnalytics.timeRange.last90Days")
          : t("whatsappAnalytics.timeRange.lastYear")
  }`;

  const categorySeries = useMemo(
    () => Object.entries(stats?.byCategory ?? {}),
    [stats?.byCategory],
  );

  const topEvents = useMemo(
    () =>
      Object.entries(stats?.byEvent ?? {})
        .sort(([, left], [, right]) => right - left)
        .slice(0, 5),
    [stats?.byEvent],
  );

  const totalPages = Math.max(1, Math.ceil(totalLogs / rowsPerPage));
  const from = totalLogs === 0 ? 0 : page * rowsPerPage + 1;
  const to = totalLogs === 0 ? 0 : Math.min(totalLogs, (page + 1) * rowsPerPage);
  const canGoPrevious = page > 0;
  const canGoNext = page + 1 < totalPages;

  if (loading) {
    return (
      <WhatsAppPageShell
        title={pageTitle}
        description={t("whatsappAnalytics.description")}
        icon={BarChart3}
        backHref={backHref}
        backLabel={t("common.back")}
        eyebrow={eyebrow}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-3xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
        <Skeleton className="h-[26rem] rounded-3xl" />
      </WhatsAppPageShell>
    );
  }

  return (
    <WhatsAppPageShell
      title={pageTitle}
      description={t("whatsappAnalytics.description")}
      icon={BarChart3}
      backHref={backHref}
      backLabel={t("common.back")}
      eyebrow={eyebrow}
      actions={
        <>
          <Select
            value={String(dateRange)}
            onValueChange={(value) => {
              setPage(0);
              setDateRange(Number(value));
            }}
          >
            <SelectTrigger className="min-w-[13rem] bg-[color:var(--color-card)]">
              <SelectValue placeholder={t("whatsappAnalytics.timeRange.label")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">
                {t("whatsappAnalytics.timeRange.last7Days")}
              </SelectItem>
              <SelectItem value="30">
                {t("whatsappAnalytics.timeRange.last30Days")}
              </SelectItem>
              <SelectItem value="90">
                {t("whatsappAnalytics.timeRange.last90Days")}
              </SelectItem>
              <SelectItem value="365">
                {t("whatsappAnalytics.timeRange.lastYear")}
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] text-[color:var(--color-foreground)] hover:brightness-95"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={refreshing ? "size-4 animate-spin" : "size-4"} />
            {t("common.refresh")}
          </Button>
        </>
      }
    >
      {error ? (
        <Alert className="rounded-3xl border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] text-[color:var(--color-foreground)]">
          <AlertTriangle className="size-4 text-[color:var(--color-warning)]" />
          <AlertTitle>{t("whatsappAnalytics.title")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <WhatsAppMetricCard
          label={t("whatsappAnalytics.stats.total")}
          value={stats?.total || 0}
          hint={summaryHint}
          icon={Send}
          tone="primary"
        />
        <WhatsAppMetricCard
          label={t("whatsappAnalytics.stats.delivered")}
          value={stats?.delivered || 0}
          hint={t("whatsappAnalytics.stats.deliveryRate")}
          icon={CheckCircle2}
          tone="success"
        />
        <WhatsAppMetricCard
          label={t("whatsappAnalytics.stats.read")}
          value={stats?.read || 0}
          hint={t("whatsappAnalytics.stats.readRate")}
          icon={Eye}
          tone="info"
        />
        <WhatsAppMetricCard
          label={t("whatsappAnalytics.stats.failed")}
          value={stats?.failed || 0}
          hint={t("whatsappAnalytics.logs.status")}
          icon={AlertTriangle}
          tone="danger"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <WhatsAppSurfaceCard
          title={t("whatsappAnalytics.stats.deliveryRate")}
          description={summaryHint}
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-3xl font-semibold tracking-tight text-[color:var(--color-foreground)]">
                  {formatPercent(stats?.deliveryRate)}%
                </p>
                <p className="text-sm text-[color:var(--color-muted-foreground)]">
                  {t("whatsappAnalytics.stats.delivered")}
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-700">
                <TrendingUp className="size-4" />
                {formatPercent(stats?.deliveryRate)}%
              </div>
            </div>
            <div className="h-2 rounded-full bg-emerald-500/10">
              <div
                className="h-2 rounded-full bg-emerald-500 transition-[width]"
                style={{
                  width: `${Math.min(
                    100,
                    Number(formatPercent(stats?.deliveryRate)),
                  )}%`,
                }}
              />
            </div>
          </div>
        </WhatsAppSurfaceCard>

        <WhatsAppSurfaceCard
          title={t("whatsappAnalytics.stats.readRate")}
          description={summaryHint}
        >
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-3xl font-semibold tracking-tight text-[color:var(--color-foreground)]">
                  {formatPercent(stats?.readRate)}%
                </p>
                <p className="text-sm text-[color:var(--color-muted-foreground)]">
                  {t("whatsappAnalytics.stats.read")}
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-700">
                <TrendingUp className="size-4" />
                {formatPercent(stats?.readRate)}%
              </div>
            </div>
            <div className="h-2 rounded-full bg-blue-500/10">
              <div
                className="h-2 rounded-full bg-blue-500 transition-[width]"
                style={{
                  width: `${Math.min(100, Number(formatPercent(stats?.readRate)))}%`,
                }}
              />
            </div>
          </div>
        </WhatsAppSurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <WhatsAppSurfaceCard
          title={t("whatsappAnalytics.charts.byCategory")}
          description={t("whatsappAnalytics.description")}
        >
          {categorySeries.length > 0 ? (
            <div className="space-y-4">
              {categorySeries.map(([category, count]) => {
                const percentage = Number(
                  ((count / (stats?.total || 1)) * 100).toFixed(1),
                );

                return (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-[color:var(--color-foreground)]">
                        {CATEGORY_LABELS[category] || category}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)]"
                        >
                          {percentage}%
                        </Badge>
                        <span className="text-sm font-medium text-[color:var(--color-foreground)]">
                          {count}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-primary/10">
                      <div
                        className="h-2 rounded-full bg-[color:var(--color-primary)] transition-[width]"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Alert className="rounded-xl border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)]">
              <AlertTitle>{t("whatsappAnalytics.charts.byCategory")}</AlertTitle>
              <AlertDescription>
                {t("whatsappAnalytics.charts.noData")}
              </AlertDescription>
            </Alert>
          )}
        </WhatsAppSurfaceCard>

        <WhatsAppSurfaceCard
          title={t("whatsappAnalytics.charts.topEvents")}
          description={summaryHint}
        >
          {topEvents.length > 0 ? (
            <div className="space-y-4">
              {topEvents.map(([event, count]) => {
                const percentage = Number(
                  ((count / (stats?.total || 1)) * 100).toFixed(1),
                );

                return (
                  <div key={event} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-[color:var(--color-foreground)]">
                        {EVENT_LABELS[event] || event}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)]"
                        >
                          {percentage}%
                        </Badge>
                        <span className="text-sm font-medium text-[color:var(--color-foreground)]">
                          {count}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-secondary/10">
                      <div
                        className="h-2 rounded-full bg-[color:var(--color-secondary)] transition-[width]"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Alert className="rounded-xl border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)]">
              <AlertTitle>{t("whatsappAnalytics.charts.topEvents")}</AlertTitle>
              <AlertDescription>
                {t("whatsappAnalytics.charts.noData")}
              </AlertDescription>
            </Alert>
          )}
        </WhatsAppSurfaceCard>
      </div>

      <WhatsAppSurfaceCard
        title={t("whatsappAnalytics.logs.title")}
        description={t("whatsappAnalytics.description")}
        action={
          <div className="flex flex-wrap gap-2">
            <Select
              value={categoryFilter || "__all__"}
              onValueChange={(value) => {
                setPage(0);
                setCategoryFilter(value === "__all__" ? "" : value);
              }}
            >
              <SelectTrigger className="min-w-[11rem] bg-[color:var(--color-card)]">
                <SelectValue placeholder={t("whatsappAnalytics.logs.type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("common.all")}</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter || "__all__"}
              onValueChange={(value) => {
                setPage(0);
                setStatusFilter(value === "__all__" ? "" : value);
              }}
            >
              <SelectTrigger className="min-w-[11rem] bg-[color:var(--color-card)]">
                <SelectValue placeholder={t("whatsappAnalytics.logs.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t("common.all")}</SelectItem>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      >
        <div className="overflow-hidden rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("whatsappAnalytics.logs.recipient")}</TableHead>
                <TableHead>{t("whatsappAnalytics.logs.type")}</TableHead>
                <TableHead>{t("whatsappAnalytics.logs.status")}</TableHead>
                <TableHead>{t("whatsappAnalytics.logs.date")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-[color:var(--color-foreground)]">
                          {log.recipientName || unknownRecipient}
                        </div>
                        <div className="text-xs text-[color:var(--color-muted-foreground)]">
                          {log.recipientPhone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="max-w-full rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)] text-[color:var(--color-foreground)]"
                      >
                        {EVENT_LABELS[log.eventType] || log.eventType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          STATUS_BADGE_CLASSES[log.status] ||
                          STATUS_BADGE_CLASSES.CANCELLED
                        }
                      >
                        {STATUS_LABELS[log.status] || log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-[color:var(--color-muted-foreground)]">
                      {formatLocaleDate(log.createdAt)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center">
                    <div className="space-y-2">
                      <p className="font-medium text-[color:var(--color-foreground)]">
                        {t("whatsappAnalytics.logs.noLogs")}
                      </p>
                      <p className="text-sm text-[color:var(--color-muted-foreground)]">
                        {summaryHint}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-[color:color-mix(in_srgb,var(--shell-control-border)_76%,transparent)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="text-sm text-[color:var(--color-muted-foreground)]">
              {t("whatsappAnalytics.logs.displayedRows", {
                from,
                to,
                count: totalLogs,
              })}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-[color:var(--color-muted-foreground)]">
                {t("whatsappAnalytics.logs.rowsPerPage")}
              </span>
              <Select
                value={String(rowsPerPage)}
                onValueChange={(value) => {
                  setRowsPerPage(Number(value));
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-[6.5rem] bg-[color:var(--color-card)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              disabled={!canGoPrevious}
              className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:brightness-95"
            >
              {t("common.previous")}
            </Button>
            <div className="rounded-full border border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] px-3 py-1 text-sm text-[color:var(--color-muted-foreground)]">
              {page + 1} / {totalPages}
            </div>
            <Button
              variant="outline"
              onClick={() => setPage((current) => current + 1)}
              disabled={!canGoNext}
              className="rounded-full border-[color:var(--shell-control-border)] bg-[color:var(--color-card)] hover:brightness-95"
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
      </WhatsAppSurfaceCard>
    </WhatsAppPageShell>
  );
};

export default WhatsAppAnalytics;
