import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  MessageSquareText,
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
    plan: string;
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
  const { companyId } = useParams<{ companyId: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CompanySummaryResponse | null>(null);

  useEffect(() => {
    if (!companyId) return;
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(
          `/admin/whatsapp/companies/${companyId}/summary`,
          {
            params: {
              scope: "SUPER_ADMIN",
            },
          },
        );
        if (active) {
          setData(response.data.data);
        }
      } catch (error) {
        console.error("Error loading company WhatsApp workspace:", error);
        if (active) {
          setData(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [companyId]);

  if (loading) {
    return (
      <WhatsAppPageShell
        title="مساحة شركة واتساب"
        description="تحميل بيانات الشركة..."
        icon={Building2}
        eyebrow="Super Admin"
        backHref="/super-admin/whatsapp/companies"
        backLabel="الرجوع للشركات"
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

  return (
    <WhatsAppPageShell
      title={company ? `مساحة واتساب · ${company.name}` : "مساحة شركة واتساب"}
      description="ملخص سريع لرسائل تسجيل الشركة والاشتراك قبل فتح الجلسات أو شاشة إشعارات onboarding."
      icon={Building2}
      eyebrow="Super Admin"
      backHref="/super-admin/whatsapp/companies"
      backLabel="الرجوع للشركات"
      actions={
        companyId ? (
          <>
            <Button
              nativeButton={false}
              variant="outline"
              render={
                <Link to={`/super-admin/whatsapp/companies/${companyId}/settings?tab=sessions`} />
              }
              className="rounded-full"
            >
              <Smartphone className="size-4" />
              ربط السيشن
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              render={<Link to={`/super-admin/whatsapp/companies/${companyId}/settings`} />}
              className="rounded-full"
            >
              <Settings2 className="size-4" />
              الإعدادات
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              render={
                <Link to={`/super-admin/whatsapp/companies/${companyId}/notifications`} />
              }
              className="rounded-full"
            >
              <Bell className="size-4" />
              إشعارات التسجيل
            </Button>
            <Button
              nativeButton={false}
              render={<Link to={`/super-admin/whatsapp/companies/${companyId}/analytics`} />}
              className="rounded-full bg-[color:var(--color-primary)] text-white hover:bg-[color:color-mix(in_srgb,var(--color-primary)_84%,black)]"
            >
              <BarChart3 className="size-4" />
              التحليلات
            </Button>
          </>
        ) : null
      }
    >
      {data?.summary.connectedSessions === 0 || !data?.summary.defaultSession ? (
        <Alert className="rounded-[24px] border-amber-300/70 bg-amber-500/10 text-amber-950 dark:text-amber-100">
          <AlertTriangle className="size-4" />
          <AlertTitle>الشركة تحتاج ربط سيشن أولًا</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>
              قبل تشغيل الأتمتة أو الاعتماد على الإشعارات، افتح تبويب الجلسات واربط session متصلة واجعلها افتراضية.
            </span>
            {companyId ? (
              <Button
                nativeButton={false}
                size="sm"
                render={
                  <Link to={`/super-admin/whatsapp/companies/${companyId}/settings?tab=sessions`} />
                }
                className="rounded-full bg-amber-700 text-white hover:bg-amber-800"
              >
                <Smartphone className="size-4" />
                فتح الجلسات
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <WhatsAppMetricCard
          label="الجلسات"
          value={data?.summary.sessionsTotal || 0}
          hint={`${data?.summary.connectedSessions || 0} جلسة متصلة`}
          icon={Smartphone}
          tone="success"
        />
        <WhatsAppMetricCard
          label="الإشعارات"
          value={data?.summary.notificationsEnabled ? "مفعلة" : "معطلة"}
          hint="حالة محرك الإشعارات"
          icon={Bell}
          tone="primary"
        />
        <WhatsAppMetricCard
          label="القوالب"
          value={data?.summary.templatesTotal || 0}
          hint={`${data?.stats.total || 0} رسالة onboarding خلال 30 يوم`}
          icon={Settings2}
          tone="info"
        />
        <WhatsAppMetricCard
          label="الفشل"
          value={data?.stats.failed || 0}
          hint={`${data?.stats.read || 0} رسالة مقروءة`}
          icon={MessageSquareText}
          tone="danger"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <WhatsAppSurfaceCard
          title="الجلسات الحالية"
          description="الجلسات المتاحة للشركة، مع توضيح الجلسة الافتراضية."
        >
          <div className="space-y-3">
            {(data?.sessions || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد جلسات واتساب لهذه الشركة حتى الآن.</p>
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
                      <Badge className="rounded-full bg-emerald-600 text-white">افتراضية</Badge>
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
          title="أحدث القوالب"
          description="آخر قوالب تسجيل الشركات والاشتراكات التي يراجعها السوبر أدمن لهذه الشركة."
        >
          <div className="space-y-3">
            {(data?.templates || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد قوالب محفوظة لهذه الشركة بعد.</p>
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
                      {template.isActive ? "نشط" : "غير نشط"}
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
