import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  Layers3,
  MessageSquareText,
  RadioTower,
  RefreshCw,
  Settings2,
  Smartphone,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiClient } from "../../services/apiClient";
import { cn } from "../../lib/utils";
import {
  WhatsAppMetricCard,
  WhatsAppPageShell,
  WhatsAppSurfaceCard,
} from "../whatsapp/components/WhatsAppPageShell";

interface OverviewResponse {
  metrics: {
    totalCompanies: number;
    activeCompanies: number;
    companiesWithSessions: number;
    companiesWithConnectedSessions: number;
    connectedSessions: number;
    disconnectedSessions: number;
    notificationsEnabledCompanies: number;
    totalTemplates: number;
    activeTemplates: number;
    sentLast24Hours: number;
    failedLast7Days: number;
  };
  topEvents: Array<{
    eventType: string;
    total: number;
    category: string;
  }>;
  recentFailures: Array<{
    id: string;
    eventType: string;
    recipientPhone: string;
    failureReason: string | null;
    createdAt: string;
    company: {
      name: string;
      slug: string | null;
    };
  }>;
}

export default function SuperAdminWhatsAppOverview() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get("/admin/whatsapp/overview");
      setOverview(response.data.data);
    } catch (loadError) {
      console.error("Error loading super admin WhatsApp overview:", loadError);
      setError(t("superAdmin.whatsapp.overview.errorMessage"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const quickLinks = [
    {
      title: t("superAdmin.whatsapp.overview.quickNav.links.companies.title"),
      description: t("superAdmin.whatsapp.overview.quickNav.links.companies.description"),
      href: "/super-admin/whatsapp/companies",
      icon: Building2,
    },
    {
      title: t("superAdmin.whatsapp.overview.quickNav.links.session.title"),
      description: t("superAdmin.whatsapp.overview.quickNav.links.session.description"),
      href: "/super-admin/whatsapp/companies",
      icon: Smartphone,
    },
    {
      title: t("superAdmin.whatsapp.overview.quickNav.links.automations.title"),
      description: t("superAdmin.whatsapp.overview.quickNav.links.automations.description"),
      href: "/super-admin/whatsapp/automations",
      icon: Settings2,
    },
    {
      title: t("superAdmin.whatsapp.overview.quickNav.links.logs.title"),
      description: t("superAdmin.whatsapp.overview.quickNav.links.logs.description"),
      href: "/super-admin/whatsapp/logs",
      icon: Activity,
    },
  ];

  if (loading) {
    return (
      <div className="w-full space-y-4" dir="rtl">
        <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4" dir="rtl">
      {/* Linear Taste Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center shrink-0">
            <RadioTower className="size-4 text-foreground/80" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                {t("superAdmin.whatsapp.overview.title")}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-mono tabular-nums text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {overview?.metrics.connectedSessions || 0} جلسة متصلة
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("superAdmin.whatsapp.overview.description")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={load}
            className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] transition-transform"
          >
            <RefreshCw className="size-3.5" />
            <span>تحديث</span>
          </Button>
          <Button
            nativeButton={false}
            render={<Link to="/super-admin/whatsapp/companies" />}
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium bg-primary text-primary-foreground active:scale-[0.98] transition-transform"
          >
            <Building2 className="size-3.5" />
            <span>{t("superAdmin.whatsapp.overview.openCompanies")}</span>
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="py-2.5">
          <AlertTriangle className="size-4" />
          <AlertTitle className="text-xs font-bold">{t("superAdmin.whatsapp.overview.errorTitle")}</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      ) : (
        <>
          {/* HQ Central Company Strip */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 sm:p-4 text-card-foreground shadow-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-bold text-foreground">
                  شركة المنصة المركزية الرسمية (HQ): max-p
                </h3>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-[10px] font-mono text-emerald-700 dark:text-emerald-300">
                  متصلة بالسوبر أدمن
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                جميع إشعارات المنصة ورسائل الترحيب وتنبيهات الإدارة تصدر وتُدار عبر جلسات واتساب شركة max-p.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs font-mono rounded-lg bg-background border-border/80 text-foreground active:scale-[0.98]"
                nativeButton={false}
                render={<Link to="/super-admin/whatsapp/companies/cmopgxu3a07i4jujj6f1oh32h" />}
              >
                <Smartphone className="size-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                جلسات المنصة
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs font-mono rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-[0.98]"
                nativeButton={false}
                render={<Link to="/super-admin/whatsapp/companies/cmopgxu3a07i4jujj6f1oh32h/routing" />}
              >
                <MessageSquareText className="size-3 mr-1" />
                صندوق المحادثات
              </Button>
            </div>
          </div>

          {/* Unified Telemetry Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-x-reverse divide-y sm:divide-y-0 divide-border/60 rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="p-3 sm:p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">كل الشركات</span>
                <span className="size-1.5 rounded-full bg-blue-500" />
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                  {overview?.metrics.totalCompanies || 0}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">{overview?.metrics.activeCompanies || 0} نشطة</p>
            </div>

            <div className="p-3 sm:p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">شركات الجلسات</span>
                <span className="size-1.5 rounded-full bg-indigo-500" />
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                  {overview?.metrics.companiesWithSessions || 0}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] font-mono text-indigo-600 dark:text-indigo-400">{overview?.metrics.companiesWithConnectedSessions || 0} متصلة</p>
            </div>

            <div className="p-3 sm:p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">الجلسات المتصلة</span>
                <span className="size-1.5 rounded-full bg-emerald-500" />
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
                  {overview?.metrics.connectedSessions || 0}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] font-mono text-rose-500">{overview?.metrics.disconnectedSessions || 0} مفصولة</p>
            </div>

            <div className="p-3 sm:p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">رسائل (24 ساعة)</span>
                <span className="size-1.5 rounded-full bg-purple-500" />
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                  {overview?.metrics.sentLast24Hours || 0}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">{overview?.metrics.failedLast7Days || 0} فشلت هذا الأسبوع</p>
            </div>

            <div className="p-3 sm:p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">تنبيهات مفعلة</span>
                <span className="size-1.5 rounded-full bg-amber-500" />
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-amber-600 dark:text-amber-400">
                  {overview?.metrics.notificationsEnabledCompanies || 0}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">شركة مفعلة</p>
            </div>

            <div className="p-3 sm:p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">قوالب الرسائل</span>
                <span className="size-1.5 rounded-full bg-teal-500" />
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold font-mono tabular-nums tracking-tight text-foreground">
                  {overview?.metrics.totalTemplates || 0}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] font-mono text-teal-600 dark:text-teal-400">{overview?.metrics.activeTemplates || 0} قالب نشط</p>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <WhatsAppSurfaceCard
              title={t("superAdmin.whatsapp.overview.topEvents.title")}
              description={t("superAdmin.whatsapp.overview.topEvents.description")}
            >
              <div className="space-y-3 lg:hidden">
                {(overview?.topEvents || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("superAdmin.whatsapp.overview.topEvents.empty")}
                  </p>
                ) : (
                  overview?.topEvents.map((eventItem) => (
                    <div
                      key={eventItem.eventType}
                      className="rounded-[20px] border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_84%,var(--shell-control-bg)_16%)] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="truncate font-medium">{eventItem.eventType}</p>
                          <Badge variant="outline" className="rounded-full">
                            {eventItem.category}
                          </Badge>
                        </div>
                        <p className="text-2xl font-semibold text-[color:var(--color-foreground)]">
                          {eventItem.total}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("superAdmin.whatsapp.overview.topEvents.eventColumn")}</TableHead>
                      <TableHead>{t("superAdmin.whatsapp.overview.topEvents.categoryColumn")}</TableHead>
                      <TableHead className="text-left">{t("superAdmin.whatsapp.overview.topEvents.totalColumn")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(overview?.topEvents || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          {t("superAdmin.whatsapp.overview.topEvents.empty")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      overview?.topEvents.map((eventItem) => (
                        <TableRow key={eventItem.eventType}>
                          <TableCell className="font-medium">{eventItem.eventType}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="rounded-full">
                              {eventItem.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-left">{eventItem.total}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </WhatsAppSurfaceCard>

            <WhatsAppSurfaceCard
              title={t("superAdmin.whatsapp.overview.quickNav.title")}
              description={t("superAdmin.whatsapp.overview.quickNav.description")}
            >
              <div className="space-y-3">
                {quickLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className="flex items-start gap-3 rounded-[22px] border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_84%,var(--shell-control-bg)_16%)] p-4 transition hover:bg-[color:color-mix(in_srgb,var(--app-panel-bg)_94%,white_6%)]"
                    >
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[color:color-mix(in_srgb,var(--color-primary)_16%,var(--app-panel-bg))] text-[color:var(--color-primary)]">
                        <Icon className="size-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-[color:var(--color-foreground)]">
                          {item.title}
                        </p>
                        <p className="text-sm text-[color:var(--color-muted-foreground)]">
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </WhatsAppSurfaceCard>
          </div>

          <WhatsAppSurfaceCard
            title={t("superAdmin.whatsapp.overview.recentFailures.title")}
            description={t("superAdmin.whatsapp.overview.recentFailures.description")}
          >
            <div className="space-y-3">
              {(overview?.recentFailures || []).length === 0 ? (
                <p className="text-sm text-[color:var(--color-muted-foreground)]">
                  {t("superAdmin.whatsapp.overview.recentFailures.empty")}
                </p>
              ) : (
                overview?.recentFailures.map((failure) => (
                  <div
                    key={failure.id}
                    className="rounded-[22px] border border-rose-300/60 bg-rose-500/10 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full bg-rose-600 text-white">
                        {failure.company.name}
                      </Badge>
                      <Badge variant="outline" className="rounded-full">
                        {failure.eventType}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-rose-900">
                      {failure.failureReason || "No failure reason"}
                    </p>
                    <p className="mt-1 text-xs text-rose-800/80">
                      {failure.recipientPhone} ·{" "}
                      {new Date(failure.createdAt).toLocaleString("ar-EG")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </WhatsAppSurfaceCard>
        </>
      )}
    </div>
  );
}
