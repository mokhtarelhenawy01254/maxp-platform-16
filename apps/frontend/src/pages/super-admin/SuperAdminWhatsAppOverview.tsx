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
      <WhatsAppPageShell
        title={t("superAdmin.whatsapp.overview.title")}
        description={t("superAdmin.whatsapp.overview.description")}
        icon={RadioTower}
        eyebrow="Super Admin"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-[24px]" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-80 rounded-[28px]" />
          <Skeleton className="h-80 rounded-[28px]" />
        </div>
      </WhatsAppPageShell>
    );
  }

  return (
    <WhatsAppPageShell
      title={t("superAdmin.whatsapp.overview.title")}
      description={t("superAdmin.whatsapp.overview.description")}
      icon={RadioTower}
      eyebrow="Super Admin"
      actions={
        <Button
          nativeButton={false}
          render={<Link to="/super-admin/whatsapp/companies" />}
          className="rounded-full bg-[color:var(--color-primary)] text-white hover:bg-[color:color-mix(in_srgb,var(--color-primary)_84%,black)]"
        >
          <Building2 className="size-4" />
          {t("superAdmin.whatsapp.overview.openCompanies")}
        </Button>
      }
    >
      {error ? (
        <Alert className="rounded-[24px] border-amber-300/70 bg-amber-500/10 text-amber-900">
          <AlertTriangle className="size-4" />
          <AlertTitle>{t("superAdmin.whatsapp.overview.errorTitle")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button
            onClick={load}
            variant="outline"
            className="mt-3 rounded-full"
          >
            <RefreshCw className="size-4" />
            {t("superAdmin.whatsapp.overview.retry")}
          </Button>
        </Alert>
      ) : (
        <>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-[24px] border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-950 dark:text-emerald-100 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                  شركة المنصة المركزية الرسمية (HQ): max-p
                </h3>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-[11px]">
                  متصلة ومربوطة بالسوبر أدمن
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                جميع إشعارات المنصة، رسائل الترحيب، وتنبيهات الإدارة تصدر وتُدار عبر جلسات واتساب شركة max-p.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold rounded-lg bg-background border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                nativeButton={false}
                render={<Link to="/super-admin/whatsapp/companies/cmopgxu3a07i4jujj6f1oh32h" />}
              >
                <Smartphone className="size-3.5 mr-1 text-emerald-600" />
                جلسات وأرقام المنصة
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                nativeButton={false}
                render={<Link to="/super-admin/whatsapp/companies/cmopgxu3a07i4jujj6f1oh32h/routing" />}
              >
                <MessageSquareText className="size-3.5 mr-1" />
                صندوق المحادثات والروتينج
              </Button>
            </div>
          </div>

          <Alert className="rounded-[24px] border-sky-300/70 bg-sky-500/10 text-sky-950 dark:text-sky-100">
            <RadioTower className="size-4" />
            <AlertTitle>{t("superAdmin.whatsapp.overview.infoTitle")}</AlertTitle>
            <AlertDescription>
              {t("superAdmin.whatsapp.overview.infoDescription")}
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <WhatsAppMetricCard
              label={t("superAdmin.whatsapp.overview.metrics.totalCompanies")}
              value={overview?.metrics.totalCompanies || 0}
              hint={t("superAdmin.whatsapp.overview.metrics.totalCompaniesHint", { active: overview?.metrics.activeCompanies || 0 })}
              icon={Building2}
              tone="primary"
            />
            <WhatsAppMetricCard
              label={t("superAdmin.whatsapp.overview.metrics.companiesWithSessions")}
              value={overview?.metrics.companiesWithSessions || 0}
              hint={t("superAdmin.whatsapp.overview.metrics.companiesWithSessionsHint", { connected: overview?.metrics.companiesWithConnectedSessions || 0 })}
              icon={Layers3}
              tone="info"
            />
            <WhatsAppMetricCard
              label={t("superAdmin.whatsapp.overview.metrics.connectedSessions")}
              value={overview?.metrics.connectedSessions || 0}
              hint={t("superAdmin.whatsapp.overview.metrics.connectedSessionsHint", { disconnected: overview?.metrics.disconnectedSessions || 0 })}
              icon={CheckCircle2}
              tone="success"
            />
            <WhatsAppMetricCard
              label={t("superAdmin.whatsapp.overview.metrics.messages24h")}
              value={overview?.metrics.sentLast24Hours || 0}
              hint={t("superAdmin.whatsapp.overview.metrics.messages24hHint", { failed: overview?.metrics.failedLast7Days || 0 })}
              icon={MessageSquareText}
              tone="danger"
            />
            <WhatsAppMetricCard
              label={t("superAdmin.whatsapp.overview.metrics.notificationsEnabled")}
              value={overview?.metrics.notificationsEnabledCompanies || 0}
              hint={t("superAdmin.whatsapp.overview.metrics.notificationsEnabledHint")}
              icon={Bell}
              tone="primary"
            />
            <WhatsAppMetricCard
              label={t("superAdmin.whatsapp.overview.metrics.templates")}
              value={overview?.metrics.totalTemplates || 0}
              hint={t("superAdmin.whatsapp.overview.metrics.templatesHint", { active: overview?.metrics.activeTemplates || 0 })}
              icon={Settings2}
              tone="info"
            />
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
    </WhatsAppPageShell>
  );
}
