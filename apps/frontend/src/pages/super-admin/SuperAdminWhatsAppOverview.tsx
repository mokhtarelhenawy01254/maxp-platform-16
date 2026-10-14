import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  MessageSquareText,
  RadioTower,
  RefreshCw,
  Settings2,
  Smartphone,
  ExternalLink,
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
      setError(t("superAdmin.whatsapp.overview.errorMessage", "تعذر استدعاء إحصائيات واتساب المركزية"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const quickLinks = [
    { title: t("superAdmin.whatsapp.overview.quickNav.links.companies.title", "شركات المنصة"), description: t("superAdmin.whatsapp.overview.quickNav.links.companies.description", "إدارة كافة المستأجرين والجلسات"), href: "/super-admin/whatsapp/companies", icon: Building2 },
    { title: t("superAdmin.whatsapp.overview.quickNav.links.session.title", "حالة الربط والاتصال"), description: t("superAdmin.whatsapp.overview.quickNav.links.session.description", "الجلسات الفعالة وفحص الـ QR"), href: "/super-admin/whatsapp/companies", icon: Smartphone },
    { title: t("superAdmin.whatsapp.overview.quickNav.links.automations.title", "كتالوج الأتمتة"), description: t("superAdmin.whatsapp.overview.quickNav.links.automations.description", "قوالب وأحداث الإشعارات اللحظية"), href: "/super-admin/whatsapp/automations", icon: Settings2 },
    { title: t("superAdmin.whatsapp.overview.quickNav.links.logs.title", "سجل الإرسال والأخطاء"), description: t("superAdmin.whatsapp.overview.quickNav.links.logs.description", "تتبع الرسائل ومراقبة التسليم"), href: "/super-admin/whatsapp/logs", icon: Activity },
  ];

  const metricsCards = [
    { label: "كل الشركات", val: overview?.metrics.totalCompanies || 0, sub: `${overview?.metrics.activeCompanies || 0} نشطة`, dot: "bg-blue-500", valColor: "text-foreground" },
    { label: "شركات الجلسات", val: overview?.metrics.companiesWithSessions || 0, sub: `${overview?.metrics.companiesWithConnectedSessions || 0} متصلة`, dot: "bg-indigo-500", valColor: "text-foreground" },
    { label: "الجلسات المتصلة", val: overview?.metrics.connectedSessions || 0, sub: `${overview?.metrics.disconnectedSessions || 0} مفصولة`, dot: "bg-emerald-500", valColor: "text-emerald-600 dark:text-emerald-400" },
    { label: "رسائل (24 ساعة)", val: overview?.metrics.sentLast24Hours || 0, sub: `${overview?.metrics.failedLast7Days || 0} فشلت هذا الأسبوع`, dot: "bg-purple-500", valColor: "text-foreground" },
    { label: "تنبيهات مفعلة", val: overview?.metrics.notificationsEnabledCompanies || 0, sub: "شركة مفعلة", dot: "bg-amber-500", valColor: "text-amber-600 dark:text-amber-400" },
    { label: "قوالب الرسائل", val: overview?.metrics.totalTemplates || 0, sub: `${overview?.metrics.activeTemplates || 0} قالب نشط`, dot: "bg-teal-500", valColor: "text-foreground" },
  ];

  if (loading) {
    return (
      <div className="w-full space-y-4" dir="rtl">
        <div className="flex items-center justify-between border-b border-border/80 bg-card p-4 rounded-xl shadow-xs">
          <Skeleton className="h-8 w-48" /><Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-20 rounded-xl" />))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 font-sans" dir="rtl">
      {/* Linear Single Chassis Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 bg-card p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/20 flex items-center justify-center shrink-0 shadow-2xs">
            <RadioTower className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                {t("superAdmin.whatsapp.overview.title", "شبكة واتساب المركزية (WhatsApp Hub)")}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[11px] font-mono tabular-nums text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {overview?.metrics.connectedSessions || 0} جلسة متصلة
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{t("superAdmin.whatsapp.overview.description", "مراقبة وإدارة جلسات واتساب وقنوات الإرسال المباشر للشركات والمتاجر")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={load} className="h-8 gap-1.5 text-xs font-mono active:scale-[0.98] cursor-pointer">
            <RefreshCw className="size-3.5" />
            <span>تحديث</span>
          </Button>
          <Button asChild size="sm" className="h-8 gap-1.5 text-xs font-mono font-medium bg-primary text-primary-foreground active:scale-[0.98] cursor-pointer">
            <Link to="/super-admin/whatsapp/companies">
              <Building2 className="size-3.5" />
              <span>{t("superAdmin.whatsapp.overview.openCompanies", "شركات المنصة")}</span>
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" className="py-2.5">
          <AlertTriangle className="size-4" />
          <AlertTitle className="text-xs font-bold">{t("superAdmin.whatsapp.overview.errorTitle", "تنبيه خطأ")}</AlertTitle>
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      ) : (
        <>
          {/* HQ Central Platform Hub Strip */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 sm:p-4 shadow-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-bold text-foreground">شركة المنصة المركزية الرسمية (HQ): max-p</h3>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-[10px] font-mono text-emerald-700 dark:text-emerald-300">
                  متصلة بالسوبر أدمن
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                جميع إشعارات المنصة ورسائل الترحيب وتنبيهات الإدارة تصدر وتُدار عبر جلسات واتساب شركة max-p.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" className="h-7 text-xs font-mono rounded-lg bg-background border-border/80 text-foreground active:scale-[0.98] cursor-pointer" asChild>
                <Link to="/super-admin/whatsapp/companies/cmopgxu3a07i4jujj6f1oh32h">
                  <Smartphone className="size-3 mr-1 text-emerald-600 dark:text-emerald-400" /> جلسات المنصة
                </Link>
              </Button>
              <Button size="sm" className="h-7 text-xs font-mono rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-[0.98] cursor-pointer" asChild>
                <Link to="/super-admin/whatsapp/companies/cmopgxu3a07i4jujj6f1oh32h/routing">
                  <MessageSquareText className="size-3 mr-1" /> صندوق المحادثات
                </Link>
              </Button>
            </div>
          </div>

          {/* Unified Telemetry Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-x-reverse divide-y sm:divide-y-0 divide-border/60 rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
            {metricsCards.map((m, idx) => (
              <div key={idx} className="p-3 sm:p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground">{m.label}</span>
                  <span className={`size-1.5 rounded-full ${m.dot}`} />
                </div>
                <div className="mt-2">
                  <span className={`text-xl font-bold font-mono tabular-nums tracking-tight ${m.valColor}`}>{m.val}</span>
                </div>
                <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Activity Grid */}
          <div className="grid gap-3.5 xl:grid-cols-[1.3fr_0.7fr]">
            {/* Top Events Panel */}
            <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
              <div className="p-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-semibold text-foreground">{t("superAdmin.whatsapp.overview.topEvents.title", "الأحداث الأكثر نشاطاً")}</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t("superAdmin.whatsapp.overview.topEvents.description", "توزيع رسائل الإشعارات حسب نوع الحدث")}</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">{(overview?.topEvents || []).length} حدث</Badge>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60 bg-muted/10">
                      <TableHead className="text-xs font-mono">{t("superAdmin.whatsapp.overview.topEvents.eventColumn", "الحدث")}</TableHead>
                      <TableHead className="text-xs font-mono">{t("superAdmin.whatsapp.overview.topEvents.categoryColumn", "التصنيف")}</TableHead>
                      <TableHead className="text-left text-xs font-mono">{t("superAdmin.whatsapp.overview.topEvents.totalColumn", "الإجمالي")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(overview?.topEvents || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-xs text-muted-foreground">
                          {t("superAdmin.whatsapp.overview.topEvents.empty", "لا توجد أحداث مسجلة حالياً")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      overview?.topEvents.map((eventItem) => (
                        <TableRow key={eventItem.eventType} className="border-border/50 hover:bg-muted/15 transition-colors">
                          <TableCell className="font-mono text-xs font-medium text-foreground">{eventItem.eventType}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-mono rounded-md">{eventItem.category}</Badge>
                          </TableCell>
                          <TableCell className="text-left font-mono tabular-nums text-xs font-semibold">{eventItem.total}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Quick Navigation Panel */}
            <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-3 border-b border-border/60 bg-muted/20">
                  <h2 className="text-xs font-semibold text-foreground">{t("superAdmin.whatsapp.overview.quickNav.title", "روابط الوصول السريع")}</h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t("superAdmin.whatsapp.overview.quickNav.description", "الانتقال المباشر لأدوات إدارة واتساب")}</p>
                </div>

                <div className="p-3 space-y-2">
                  {quickLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.href} to={item.href} className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/15 hover:bg-muted/30 transition-colors group">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-md bg-muted/60 border border-border/70 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                            <Icon className="size-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{item.title}</p>
                            <p className="text-[10px] text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                        <ExternalLink className="size-3 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 border-t border-border/60 bg-muted/10">
                <p className="text-[10px] font-mono text-muted-foreground">إدارة شبكة واتساب المركزية · MaxP v2026</p>
              </div>
            </div>
          </div>

          {/* Recent Failures Panel */}
          <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
            <div className="p-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold text-foreground">{t("superAdmin.whatsapp.overview.recentFailures.title", "تنبيهات الإرسال الفاشل الأخيرة")}</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t("superAdmin.whatsapp.overview.recentFailures.description", "رصد الرسائل التي تعذر تسليمها عبر كافة الشركات")}</p>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-rose-500 border-rose-500/30">
                {(overview?.recentFailures || []).length} أخطاء
              </Badge>
            </div>

            <div className="p-3">
              {(overview?.recentFailures || []).length === 0 ? (
                <div className="flex items-center justify-center p-8 text-xs font-mono text-muted-foreground">
                  <CheckCircle2 className="size-4 text-emerald-500 mr-2" />
                  <span>{t("superAdmin.whatsapp.overview.recentFailures.empty", "لا توجد أخطاء إرسال حديثة")}</span>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {overview?.recentFailures.map((failure) => (
                    <div key={failure.id} className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-semibold text-foreground truncate">{failure.company.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shrink-0">
                          {failure.eventType}
                        </span>
                      </div>
                      <p className="text-xs text-rose-600 dark:text-rose-400 line-clamp-2 leading-relaxed font-mono">
                        {failure.failureReason || "No failure reason"}
                      </p>
                      <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-1 border-t border-rose-500/10">
                        <span>{failure.recipientPhone}</span>
                        <span>{new Date(failure.createdAt).toLocaleDateString("ar-EG")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
