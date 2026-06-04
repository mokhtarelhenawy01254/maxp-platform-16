import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  Layers3,
  MessageSquareText,
  RadioTower,
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

const quickLinks = [
  {
    title: "شركات واتساب",
    description: "راجع جاهزية كل شركة وافتح مساحة العمل الخاصة بها.",
    href: "/super-admin/whatsapp/companies",
    icon: Building2,
  },
  {
    title: "ربط السيشن",
    description: "ادخل إلى تبويب الجلسات داخل الشركة لربط session وجعلها افتراضية.",
    href: "/super-admin/whatsapp/companies",
    icon: Smartphone,
  },
  {
    title: "أتمتة المنصة",
    description: "تعرض فقط الأتمتة المملوكة للسوبر أدمن وليس كل أتمتة الشركات.",
    href: "/super-admin/whatsapp/automations",
    icon: Settings2,
  },
  {
    title: "السجلات المركزية",
    description: "راقب الإرسال والفشل عبر جميع الشركات من شاشة واحدة.",
    href: "/super-admin/whatsapp/logs",
    icon: Activity,
  },
];

export default function SuperAdminWhatsAppOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get("/admin/whatsapp/overview");
        if (active) {
          setOverview(response.data.data);
        }
      } catch (loadError) {
        console.error("Error loading super admin WhatsApp overview:", loadError);
        if (active) {
          setError("تعذر تحميل لوحة واتساب للسوبر أدمن حالياً.");
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
  }, []);

  if (loading) {
    return (
      <WhatsAppPageShell
        title="واتساب المنصة"
        description="مراقبة جاهزية واتساب عبر الشركات من شاشة واحدة."
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
      title="واتساب المنصة"
      description="مراقبة جاهزية واتساب عبر الشركات من شاشة واحدة."
      icon={RadioTower}
      eyebrow="Super Admin"
      actions={
        <Button
          nativeButton={false}
          render={<Link to="/super-admin/whatsapp/companies" />}
          className="rounded-full bg-[color:var(--color-primary)] text-white hover:bg-[color:color-mix(in_srgb,var(--color-primary)_84%,black)]"
        >
          <Building2 className="size-4" />
          فتح الشركات
        </Button>
      }
    >
      {error ? (
        <Alert className="rounded-[24px] border-amber-300/70 bg-amber-500/10 text-amber-900">
          <AlertTriangle className="size-4" />
          <AlertTitle>تعذر التحميل</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Alert className="rounded-[24px] border-sky-300/70 bg-sky-500/10 text-sky-950 dark:text-sky-100">
        <RadioTower className="size-4" />
        <AlertTitle>ملكية واضحة للشاشات</AlertTitle>
        <AlertDescription>
          شاشة السوبر أدمن تتابع جاهزية الشركات، ربط السيشن، وأتمتة المنصة. أما إشعارات العملاء والطلبات فتظل داخل مساحة كل شركة.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <WhatsAppMetricCard
          label="إجمالي الشركات"
          value={overview?.metrics.totalCompanies || 0}
          hint={`${overview?.metrics.activeCompanies || 0} شركة فعالة`}
          icon={Building2}
          tone="primary"
        />
        <WhatsAppMetricCard
          label="شركات لديها جلسات"
          value={overview?.metrics.companiesWithSessions || 0}
          hint={`${overview?.metrics.companiesWithConnectedSessions || 0} منها متصلة`}
          icon={Layers3}
          tone="info"
        />
        <WhatsAppMetricCard
          label="الجلسات المتصلة"
          value={overview?.metrics.connectedSessions || 0}
          hint={`${overview?.metrics.disconnectedSessions || 0} جلسة تحتاج متابعة`}
          icon={CheckCircle2}
          tone="success"
        />
        <WhatsAppMetricCard
          label="رسائل آخر 24 ساعة"
          value={overview?.metrics.sentLast24Hours || 0}
          hint={`${overview?.metrics.failedLast7Days || 0} فشل خلال 7 أيام`}
          icon={MessageSquareText}
          tone="danger"
        />
        <WhatsAppMetricCard
          label="شركات الإشعارات المفعلة"
          value={overview?.metrics.notificationsEnabledCompanies || 0}
          hint="الشركات التي فعّلت محرك الإشعارات"
          icon={Bell}
          tone="primary"
        />
        <WhatsAppMetricCard
          label="القوالب"
          value={overview?.metrics.totalTemplates || 0}
          hint={`${overview?.metrics.activeTemplates || 0} قالب نشط`}
          icon={Settings2}
          tone="info"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <WhatsAppSurfaceCard
          title="الأحداث الأكثر استخدامًا"
          description="أكثر أنواع الإشعارات إرسالًا خلال آخر 30 يومًا."
        >
          <div className="space-y-3 lg:hidden">
            {(overview?.topEvents || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                لا توجد بيانات إرسال كافية حتى الآن.
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
                  <TableHead>الحدث</TableHead>
                  <TableHead>التصنيف</TableHead>
                  <TableHead className="text-left">الإجمالي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(overview?.topEvents || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      لا توجد بيانات إرسال كافية حتى الآن.
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
          title="تنقل سريع"
          description="أهم الشاشات التي ستحتاجها لإدارة واتساب من السوبر أدمن."
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
        title="آخر حالات الفشل"
        description="آخر الرسائل التي فشلت حتى يسهل تتبع الشركات أو القوالب المتعثرة."
      >
        <div className="space-y-3">
          {(overview?.recentFailures || []).length === 0 ? (
            <p className="text-sm text-[color:var(--color-muted-foreground)]">
              لا توجد حالات فشل مسجلة خلال آخر 7 أيام.
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
    </WhatsAppPageShell>
  );
}
