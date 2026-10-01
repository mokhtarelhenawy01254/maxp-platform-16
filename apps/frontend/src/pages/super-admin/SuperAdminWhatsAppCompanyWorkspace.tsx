import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  MessageSquareText,
  MessageSquare,
  RefreshCw,
  Settings2,
  Smartphone,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "../../services/apiClient";
import {
  WhatsAppMetricCard,
  WhatsAppPageShell,
  WhatsAppSurfaceCard,
} from "../whatsapp/components/WhatsAppPageShell";

interface CompanySummaryResponse {
  company: {
    id: string;
    name: string;
    slug: string | null;
    email: string;
  };
  summary: {
    sessionsTotal: number;
    connectedSessions: number;
    defaultSession: {
      id: string;
      name: string;
      phoneNumber: string | null;
      provider: string;
    } | null;
    notificationsEnabled: boolean;
    templatesTotal: number;
    templatesByCategory: Record<string, number>;
  };
  sessions: Array<{
    id: string;
    name: string;
    phoneNumber: string | null;
    status: string;
    isDefault: boolean;
    provider: string;
    lastConnectedAt: string | null;
  }>;
  templates: Array<{
    id: string;
    name: string;
    eventType: string;
    category: string;
    isActive: boolean;
    updatedAt: string;
  }>;
  stats: {
    total: number;
    failed: number;
    read: number;
  };
}

export default function SuperAdminWhatsAppCompanyWorkspace() {
  const { t } = useTranslation();
  const { companyId } = useParams<{ companyId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CompanySummaryResponse | null>(null);

  const ws = (key: string) => t(`superAdmin.whatsapp.workspace.${key}`);

  const load = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(
        `/admin/whatsapp/companies/${companyId}/summary`,
        { params: { scope: "SUPER_ADMIN" } },
      );
      setData(response.data.data);
    } catch (err) {
      console.error("Error loading company WhatsApp workspace:", err);
      setError(t("superAdmin.whatsapp.overview.errorMessage"));
    } finally {
      setLoading(false);
    }
  }, [companyId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <WhatsAppPageShell
        title={ws("title")}
        description={ws("loadingDescription")}
        icon={Building2}
        eyebrow="Super Admin"
        backHref="/super-admin/whatsapp/companies"
        backLabel={ws("backLabel")}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
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

  const company = data?.company;

  if (error) {
    return (
      <WhatsAppPageShell
        title={company ? t("superAdmin.whatsapp.workspace.titleWithName", { name: company.name }) : ws("title")}
        description={ws("description")}
        icon={Building2}
        eyebrow="Super Admin"
        backHref="/super-admin/whatsapp/companies"
        backLabel={ws("backLabel")}
      >
        <Alert className="rounded-[24px] border-amber-300/70 bg-amber-500/10 text-amber-900">
          <AlertTriangle className="size-4" />
          <AlertTitle>{t("superAdmin.whatsapp.overview.errorTitle")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button onClick={load} variant="outline" className="mt-3 rounded-full">
            <RefreshCw className="size-4" />
            {t("superAdmin.whatsapp.overview.retry")}
          </Button>
        </Alert>
      </WhatsAppPageShell>
    );
  }

  return (
    <WhatsAppPageShell
      title={company ? t("superAdmin.whatsapp.workspace.titleWithName", { name: company.name }) : ws("title")}
      description={ws("description")}
      icon={Building2}
      eyebrow="Super Admin"
      backHref="/super-admin/whatsapp/companies"
      backLabel={ws("backLabel")}
      actions={
        companyId ? (
          <>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link to={`/super-admin/whatsapp/companies/${companyId}/settings?tab=sessions`} />}
              className="rounded-full"
            >
              <Smartphone className="size-4" />
              {ws("actions.linkSession")}
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link to={`/super-admin/whatsapp/companies/${companyId}/settings`} />}
              className="rounded-full"
            >
              <Settings2 className="size-4" />
              {ws("actions.settings")}
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link to={`/super-admin/whatsapp/companies/${companyId}/notifications`} />}
              className="rounded-full"
            >
              <Bell className="size-4" />
              {ws("actions.notifications")}
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link to={`/super-admin/whatsapp/companies/${companyId}/inbox`} />}
              className="rounded-full"
            >
              <MessageSquare className="size-4" />
              {ws("actions.inbox")}
            </Button>
            <Button
              nativeButton={false}
              render={<Link to={`/super-admin/whatsapp/companies/${companyId}/analytics`} />}
              className="rounded-full bg-[color:var(--color-primary)] text-white hover:bg-[color:color-mix(in_srgb,var(--color-primary)_84%,black)]"
            >
              <BarChart3 className="size-4" />
              {ws("actions.analytics")}
            </Button>
          </>
        ) : null
      }
    >
      {data?.summary.connectedSessions === 0 || !data?.summary.defaultSession ? (
        <Alert className="rounded-[24px] border-amber-300/70 bg-amber-500/10 text-amber-950 dark:text-amber-100">
          <AlertTriangle className="size-4" />
          <AlertTitle>{ws("noSessionAlert.title")}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>{ws("noSessionAlert.description")}</span>
            {companyId ? (
              <Button
                nativeButton={false}
                size="sm"
                render={<Link to={`/super-admin/whatsapp/companies/${companyId}/settings?tab=sessions`} />}
                className="rounded-full bg-amber-700 text-white hover:bg-amber-800"
              >
                <Smartphone className="size-4" />
                {ws("actions.openSessions")}
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <WhatsAppMetricCard
          label={ws("metrics.sessions")}
          value={data?.summary.sessionsTotal || 0}
          hint={t("superAdmin.whatsapp.workspace.metrics.sessionsHint", { connected: data?.summary.connectedSessions || 0 })}
          icon={Smartphone}
          tone="success"
        />
        <WhatsAppMetricCard
          label={ws("metrics.notifications")}
          value={data?.summary.notificationsEnabled ? ws("metrics.notificationsEnabled") : ws("metrics.notificationsDisabled")}
          hint={ws("metrics.notificationsHint")}
          icon={Bell}
          tone="primary"
        />
        <WhatsAppMetricCard
          label={ws("metrics.templates")}
          value={data?.summary.templatesTotal || 0}
          hint={t("superAdmin.whatsapp.workspace.metrics.templatesHint", { total: data?.stats.total || 0 })}
          icon={Settings2}
          tone="info"
        />
        <WhatsAppMetricCard
          label={ws("metrics.failures")}
          value={data?.stats.failed || 0}
          hint={t("superAdmin.whatsapp.workspace.metrics.failuresHint", { read: data?.stats.read || 0 })}
          icon={MessageSquareText}
          tone="danger"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <WhatsAppSurfaceCard
          title={ws("sessionsCard.title")}
          description={ws("sessionsCard.description")}
        >
          <div className="space-y-3">
            {(data?.sessions || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{ws("sessionsCard.empty")}</p>
            ) : (
              data?.sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-3 rounded-[20px] border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_84%,var(--shell-control-bg)_16%)] p-4"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{session.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.phoneNumber || "No phone"} · {session.provider}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {session.isDefault ? (
                      <Badge className="rounded-full bg-emerald-600 text-white">{ws("sessionsCard.defaultBadge")}</Badge>
                    ) : null}
                    <Badge variant="outline" className="rounded-full">
                      {session.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </WhatsAppSurfaceCard>

        <WhatsAppSurfaceCard
          title={ws("templatesCard.title")}
          description={ws("templatesCard.description")}
        >
          <div className="space-y-3">
            {(data?.templates || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{ws("templatesCard.empty")}</p>
            ) : (
              data?.templates.map((template) => (
                <div
                  key={template.id}
                  className="rounded-[20px] border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_84%,var(--shell-control-bg)_16%)] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium">{template.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {template.eventType} · {template.category}
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-full">
                      {template.isActive ? ws("templatesCard.active") : ws("templatesCard.inactive")}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </WhatsAppSurfaceCard>
      </div>
    </WhatsAppPageShell>
  );
}
