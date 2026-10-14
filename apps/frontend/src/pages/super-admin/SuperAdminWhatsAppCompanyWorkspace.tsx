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
  ArrowRight,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "../../services/apiClient";

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

  const ws = (key: string) => t(`superAdmin.whatsapp.workspace.${key}`, key);

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
      setError(t("superAdmin.whatsapp.overview.errorMessage", "تعذر استدعاء مساحة عمل الشركة"));
    } finally {
      setLoading(false);
    }
  }, [companyId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="w-full space-y-4" dir="rtl">
        <div className="flex items-center justify-between border-b border-border/80 bg-card p-4 rounded-xl shadow-xs">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="h-20 rounded-xl" />))}
        </div>
      </div>
    );
  }

  const company = data?.company;

  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      {/* Linear Single-Surface Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 bg-card p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon" className="size-8 rounded-lg shrink-0 cursor-pointer">
            <Link to="/super-admin/whatsapp/companies" title={ws("backLabel")}>
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <div className="size-9 rounded-lg border border-border/80 bg-muted/20 flex items-center justify-center shrink-0 shadow-2xs">
            <Building2 className="size-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                {company ? t("superAdmin.whatsapp.workspace.titleWithName", { name: company.name }) : ws("title")}
              </h1>
              {company?.slug && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono text-muted-foreground bg-muted/30 border border-border/70">
                  @{company.slug}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{ws("description")}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-auto">
          {companyId && (
            <>
              <Button asChild variant="outline" size="sm" className="h-7 text-xs font-mono gap-1 active:scale-[0.98]">
                <Link to={`/super-admin/whatsapp/companies/${companyId}/settings?tab=sessions`}>
                  <Smartphone className="size-3" />
                  <span>{ws("actions.linkSession")}</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-7 text-xs font-mono gap-1 active:scale-[0.98]">
                <Link to={`/super-admin/whatsapp/companies/${companyId}/settings`}>
                  <Settings2 className="size-3" />
                  <span>{ws("actions.settings")}</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-7 text-xs font-mono gap-1 active:scale-[0.98]">
                <Link to={`/super-admin/whatsapp/companies/${companyId}/notifications`}>
                  <Bell className="size-3" />
                  <span>{ws("actions.notifications")}</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="h-7 text-xs font-mono gap-1 active:scale-[0.98]">
                <Link to={`/super-admin/whatsapp/companies/${companyId}/inbox`}>
                  <MessageSquare className="size-3" />
                  <span>{ws("actions.inbox")}</span>
                </Link>
              </Button>
              <Button asChild size="sm" className="h-7 text-xs font-mono gap-1 bg-primary text-primary-foreground active:scale-[0.98]">
                <Link to={`/super-admin/whatsapp/companies/${companyId}/analytics`}>
                  <BarChart3 className="size-3" />
                  <span>{ws("actions.analytics")}</span>
                </Link>
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={load} className="h-7 text-xs font-mono gap-1 cursor-pointer">
            <RefreshCw className="size-3" />
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="py-2.5">
          <AlertTriangle className="size-4" />
          <AlertTitle className="text-xs font-bold">{t("superAdmin.whatsapp.overview.errorTitle", "خطأ")}</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      ) : (
        <>
          {data?.summary.connectedSessions === 0 || !data?.summary.defaultSession ? (
            <Alert className="py-2.5 border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100">
              <AlertTriangle className="size-4 text-amber-600" />
              <AlertTitle className="text-xs font-bold">{ws("noSessionAlert.title")}</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-xs mt-1">
                <span>{ws("noSessionAlert.description")}</span>
                {companyId ? (
                  <Button asChild size="sm" className="h-6 text-[10px] font-mono bg-amber-600 text-white hover:bg-amber-700">
                    <Link to={`/super-admin/whatsapp/companies/${companyId}/settings?tab=sessions`}>
                      <Smartphone className="size-3 mr-1" />
                      {ws("actions.openSessions")}
                    </Link>
                  </Button>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Telemetry Ribbon */}
          <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-border/80 bg-card divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60 overflow-hidden shadow-xs">
            <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-medium text-[11px]">{ws("metrics.sessions")}</span>
                <span className="size-1.5 rounded-full bg-emerald-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                {data?.summary.sessionsTotal || 0}
              </div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                {data?.summary.connectedSessions || 0} جلسات متصلة
              </p>
            </div>

            <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-medium text-[11px]">{ws("metrics.notifications")}</span>
                <span className="size-1.5 rounded-full bg-primary" />
              </div>
              <div className="text-sm font-semibold tracking-tight text-foreground mt-1">
                {data?.summary.notificationsEnabled ? ws("metrics.notificationsEnabled") : ws("metrics.notificationsDisabled")}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{ws("metrics.notificationsHint")}</p>
            </div>

            <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-medium text-[11px]">{ws("metrics.templates")}</span>
                <span className="size-1.5 rounded-full bg-indigo-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                {data?.summary.templatesTotal || 0}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">إجمالي {data?.stats.total || 0} رسالة مرسلة</p>
            </div>

            <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-medium text-[11px]">{ws("metrics.failures")}</span>
                <span className="size-1.5 rounded-full bg-rose-500" />
              </div>
              <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                {data?.stats.failed || 0}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{data?.stats.read || 0} رسالة مقروءة</p>
            </div>
          </div>

          {/* Sessions & Templates Chassis */}
          <div className="grid gap-3.5 xl:grid-cols-2">
            {/* Sessions Card */}
            <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                  <h2 className="text-xs font-semibold text-foreground">{ws("sessionsCard.title")}</h2>
                  <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                    {(data?.sessions || []).length} جلسات
                  </span>
                </div>

                <div className="p-3 space-y-2">
                  {(data?.sessions || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6 font-mono">{ws("sessionsCard.empty")}</p>
                  ) : (
                    data?.sessions.map((session) => (
                      <div key={session.id} className="p-2.5 rounded-lg border border-border/60 bg-muted/15 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-xs text-foreground">{session.name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">
                            {session.phoneNumber || "No phone"} · {session.provider}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {session.isDefault && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              {ws("sessionsCard.defaultBadge")}
                            </span>
                          )}
                          <Badge variant="outline" className="text-[10px] font-mono">{session.status}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-3 border-t border-border/60 bg-muted/10">
                <p className="text-[10px] font-mono text-muted-foreground">{ws("sessionsCard.description")}</p>
              </div>
            </div>

            {/* Templates Card */}
            <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                  <h2 className="text-xs font-semibold text-foreground">{ws("templatesCard.title")}</h2>
                  <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                    {(data?.templates || []).length} قوالب
                  </span>
                </div>

                <div className="p-3 space-y-2">
                  {(data?.templates || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6 font-mono">{ws("templatesCard.empty")}</p>
                  ) : (
                    data?.templates.map((template) => (
                      <div key={template.id} className="p-2.5 rounded-lg border border-border/60 bg-muted/15 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-xs text-foreground">{template.name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">
                            {template.eventType} · {template.category}
                          </p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] font-mono ${template.isActive ? "text-emerald-600 border-emerald-500/30" : "text-muted-foreground"}`}>
                          {template.isActive ? ws("templatesCard.active") : ws("templatesCard.inactive")}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-3 border-t border-border/60 bg-muted/10">
                <p className="text-[10px] font-mono text-muted-foreground">{ws("templatesCard.description")}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
