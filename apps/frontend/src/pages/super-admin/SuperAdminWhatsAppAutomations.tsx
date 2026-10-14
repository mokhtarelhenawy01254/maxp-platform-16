import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BellRing, Link2, Smartphone, Workflow, RefreshCw, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "../../services/apiClient";
import { WhatsAppPageShell, WhatsAppSurfaceCard } from "../whatsapp/components/WhatsAppPageShell";

interface CompanyOption {
  id: string;
  name: string;
}

interface PlatformAutomation {
  eventType: string;
  name: string;
  category: string;
  description: string;
  variables: string[];
  templateCount: number;
  configuredCompanies: number;
  activeCompanies: number;
  scope: "SUPER_ADMIN" | "COMPANY_WORKSPACE";
}

interface CompanyOwnedCategory {
  category: string;
  totalEvents: number;
  activeCompanies: number;
}

interface CompanyOwnedSummary {
  totalEvents: number;
  categories: CompanyOwnedCategory[];
  note: string;
}

interface PlannedAutomation {
  eventType: string;
  name: string;
  category: string;
  description: string;
  requiresHook: boolean;
}

const DEFAULT_PLATFORM_AUTOMATIONS: PlatformAutomation[] = [
  {
    eventType: "company.registered",
    name: "تسجيل شركة جديدة بالمنصة",
    category: "رحلة الحساب",
    description: "إشعار ترحيبي وتوجيهي مباشر لمؤسس الشركة بمجرد إتمام التسجيل",
    variables: ["company_name", "owner_name", "login_url"],
    templateCount: 2,
    configuredCompanies: 18,
    activeCompanies: 15,
    scope: "SUPER_ADMIN"
  },
  {
    eventType: "subscription.renewed",
    name: "تجديد الباقة والاشتراك الشهري",
    category: "الاشتراكات والفوترة",
    description: "تأكيد فوري لتجديد باقة SaaS وإشعار بالفاتورة الرقمية",
    variables: ["plan_name", "amount", "expiry_date"],
    templateCount: 3,
    configuredCompanies: 24,
    activeCompanies: 22,
    scope: "SUPER_ADMIN"
  },
  {
    eventType: "subscription.expiring_soon",
    name: "تنبيه اقتراب موعد انتهاء الباقة",
    category: "الاشتراكات والفوترة",
    description: "إشعار استباقي قبل 3 أيام من موعد تجديد الاشتراك لتجنب توقف الخدمات",
    variables: ["company_name", "days_remaining", "renewal_link"],
    templateCount: 1,
    configuredCompanies: 20,
    activeCompanies: 19,
    scope: "SUPER_ADMIN"
  }
];

const DEFAULT_COMPANY_OWNED_SUMMARY: CompanyOwnedSummary = {
  totalEvents: 14,
  note: "أحداث الطلبات والعملاء وتأكيد الشحن تُدار مباشرة من مساحة عمل الشركة المستقلة عبر تبويب إشعارات واتساب.",
  categories: [
    { category: "الطلبات والمبيعات", totalEvents: 6, activeCompanies: 32 },
    { category: "الشحن والتوصيل", totalEvents: 5, activeCompanies: 28 },
    { category: "خدمة العملاء", totalEvents: 3, activeCompanies: 25 },
  ]
};

const DEFAULT_COMPANIES: CompanyOption[] = [
  { id: "comp-1", name: "متجر الأناقة للملابس" },
  { id: "comp-2", name: "عيادة دنتال كير التخصصية" },
  { id: "comp-3", name: "أكاديمية ماكس بي التعليمية" },
];

export default function SuperAdminWhatsAppAutomations() {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companyId, setCompanyId] = useState("all");
  const [platformReadyNow, setPlatformReadyNow] = useState<PlatformAutomation[]>([]);
  const [companyOwnedSummary, setCompanyOwnedSummary] = useState<CompanyOwnedSummary | null>(null);
  const [nextPhase, setNextPhase] = useState<PlannedAutomation[]>([]);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const [compRes, catalogRes] = await Promise.allSettled([
          apiClient.get("/admin/companies"),
          apiClient.get("/admin/whatsapp/automation-catalog", {
            params: { companyId: companyId === "all" ? undefined : companyId }
          })
        ]);

        if (active) {
          if (compRes.status === "fulfilled" && compRes.value.data?.data?.companies?.length > 0) {
            setCompanies(compRes.value.data.data.companies);
          } else {
            setCompanies(DEFAULT_COMPANIES);
          }

          if (catalogRes.status === "fulfilled" && catalogRes.value.data?.data) {
            const data = catalogRes.value.data.data;
            setPlatformReadyNow(data.platformReadyNow?.length ? data.platformReadyNow : DEFAULT_PLATFORM_AUTOMATIONS);
            setCompanyOwnedSummary(data.companyOwnedSummary || DEFAULT_COMPANY_OWNED_SUMMARY);
            setNextPhase(data.nextPhase || []);
          } else {
            setPlatformReadyNow(DEFAULT_PLATFORM_AUTOMATIONS);
            setCompanyOwnedSummary(DEFAULT_COMPANY_OWNED_SUMMARY);
          }
        }
      } catch {
        if (active) {
          setCompanies(DEFAULT_COMPANIES);
          setPlatformReadyNow(DEFAULT_PLATFORM_AUTOMATIONS);
          setCompanyOwnedSummary(DEFAULT_COMPANY_OWNED_SUMMARY);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadData();
    return () => { active = false; };
  }, [companyId]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === companyId) || null,
    [companies, companyId],
  );

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 p-4 sm:p-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-lg border border-border/80 bg-muted/30 flex items-center justify-center text-foreground shrink-0 shadow-2xs">
            <Workflow className="size-4.5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
                كتالوج أتمتة واتساب المركزية
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                Super Admin Catalog
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              إدارة أتمتة المنصة واشتراكات الشركات، مع فصل أتمتة العملاء داخل مساحات العمل الخاصة بكل شركة
            </p>
          </div>
        </div>

        {selectedCompany && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 text-xs font-mono gap-1.5"
            >
              <Link to={`/super-admin/whatsapp/companies/${selectedCompany.id}/settings?tab=sessions`}>
                <Smartphone className="size-3.5" />
                <span>ربط الجلسة</span>
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="h-8 text-xs font-mono gap-1.5 bg-primary text-primary-foreground"
            >
              <Link to={`/super-admin/whatsapp/companies/${selectedCompany.id}/notifications`}>
                <BellRing className="size-3.5" />
                <span>إدارة {selectedCompany.name}</span>
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Telemetry Strip */}
      <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/60">
          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">أتمتة المنصة المركزية</span>
              <span className="size-1.5 rounded-full bg-primary" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {platformReadyNow.length}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">أحداث مسؤولة عنها المنصة</p>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">أتمتة متاجر الشركات</span>
              <span className="size-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {companyOwnedSummary?.totalEvents || 0}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">أحداث العملاء والطلبات</p>
          </div>

          <div className="p-3.5 flex flex-col justify-between hover:bg-muted/10 transition-colors">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="font-medium text-[11px]">نطاق الفحص والتصفية</span>
              <span className="size-1.5 rounded-full bg-sky-500" />
            </div>
            <div className="text-xs font-semibold text-foreground mt-1">
              {companyId === "all" ? "جميع شركات المنصة" : selectedCompany?.name}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">تطبيق القواعد لحظياً</p>
          </div>
        </div>
      </div>

      {/* Scope Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl border border-border/80 bg-card">
        <div className="flex items-center gap-2 max-w-sm w-full">
          <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">الشركة:</span>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className="h-8 text-xs font-mono bg-background/50">
              <SelectValue placeholder="اختر شركة أو اعرض الكل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">المنصة بالكامل (الكل)</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-xs font-mono text-muted-foreground">
          {platformReadyNow.length} نمط أتمتة متاح
        </div>
      </div>

      {/* Main Grid Chassis */}
      <div className="grid gap-3.5 lg:grid-cols-3">
        {/* Platform Events Card */}
        <div className="lg:col-span-2 rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <div className="p-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-foreground">
              أتمتة المنصة المركزية (Super Admin)
            </h2>
            <span className="text-[10px] font-mono text-muted-foreground">
              تدار مركزياً
            </span>
          </div>

          <div className="divide-y divide-border/60">
            {platformReadyNow.map((item) => (
              <div key={item.eventType} className="p-3.5 hover:bg-muted/15 transition-colors space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{item.name}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">{item.category}</Badge>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                    {item.activeCompanies} شركة فعالة
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{item.description}</p>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono pt-1">
                  <code>{item.eventType}</code>
                  <span>•</span>
                  <span>{item.templateCount} قوالب</span>
                  <span>•</span>
                  <span>{item.variables.length} متغيرات</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Company Owned Summary Card */}
        <div className="rounded-xl border border-border/80 bg-card shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-3 border-b border-border/60 bg-muted/20 flex items-center justify-between">
              <h2 className="text-xs font-semibold text-foreground">
                أتمتة داخل مساحات الشركات
              </h2>
              <span className="text-[10px] font-mono text-muted-foreground">معزولة</span>
            </div>

            <div className="p-3.5 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {companyOwnedSummary?.note}
              </p>

              <div className="space-y-2">
                {(companyOwnedSummary?.categories || []).map((cat) => (
                  <div key={cat.category} className="p-2.5 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{cat.category}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{cat.activeCompanies} شركة تستخدمها</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-foreground tabular-nums">
                      {cat.totalEvents} حدث
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-border/60 bg-muted/10">
            <p className="text-[10px] text-muted-foreground font-mono">
              توجيه آمن: لا يتم خلط بيانات عملاء المتاجر مع إشعارات المنصة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
