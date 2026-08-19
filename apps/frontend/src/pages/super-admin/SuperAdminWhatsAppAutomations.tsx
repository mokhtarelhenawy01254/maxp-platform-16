import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, BellRing, Link2, Phone, Smartphone, Workflow } from 'lucide-react';

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

export default function SuperAdminWhatsAppAutomations() {
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [companyId, setCompanyId] = useState("all");
  const [platformReadyNow, setPlatformReadyNow] = useState<PlatformAutomation[]>([]);
  const [companyOwnedSummary, setCompanyOwnedSummary] =
    useState<CompanyOwnedSummary | null>(null);
  const [nextPhase, setNextPhase] = useState<PlannedAutomation[]>([]);

  const controlClass =
    "h-11 rounded-2xl border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_82%,var(--shell-control-bg)_18%)]";
  const softCardClass =
    "rounded-[24px] border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_86%,var(--shell-control-bg)_14%)] p-4 shadow-[0_18px_36px_rgba(15,27,45,0.06)]";

  useEffect(() => {
    let active = true;

    const loadCompanies = async () => {
      try {
        const response = await apiClient.get("/admin/companies");
        if (active) {
          setCompanies(response.data.data?.companies || []);
        }
      } catch (error) {
        console.error("Error loading companies for automation catalog:", error);
      }
    };

    void loadCompanies();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadCatalog = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get("/admin/whatsapp/automation-catalog", {
          params: {
            companyId: companyId === "all" ? undefined : companyId,
          },
        });
        if (active) {
          setPlatformReadyNow(response.data.data?.platformReadyNow || []);
          setCompanyOwnedSummary(response.data.data?.companyOwnedSummary || null);
          setNextPhase(response.data.data?.nextPhase || []);
        }
      } catch (error) {
        console.error("Error loading automation catalog:", error);
        if (active) {
          setPlatformReadyNow([]);
          setCompanyOwnedSummary(null);
          setNextPhase([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadCatalog();
    return () => {
      active = false;
    };
  }, [companyId]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === companyId) || null,
    [companies, companyId],
  );

  return (
    <WhatsAppPageShell
      title="أتمتة واتساب"
      description="هذه الشاشة تعرض فقط أتمتة المنصة التي يملكها السوبر أدمن، بينما أتمتة العملاء والطلبات تبقى داخل مساحة كل شركة."
      icon={Workflow}
      eyebrow="Super Admin"
      actions={
        selectedCompany ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              nativeButton={false}
              variant="outline"
              render={
                <Link
                  to={`/super-admin/whatsapp/companies/${selectedCompany.id}/settings?tab=sessions`}
                />
              }
              className="rounded-full border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_80%,var(--shell-control-bg)_20%)]"
            >
              <Smartphone className="size-4" />
              ربط السيشن
            </Button>
            <Button
              nativeButton={false}
              render={
                <Link to={`/super-admin/whatsapp/companies/${selectedCompany.id}/notifications`} />
              }
              className="rounded-full bg-[color:var(--color-primary)] text-white hover:bg-[color:color-mix(in_srgb,var(--color-primary)_84%,black)]"
            >
              <BellRing className="size-4" />
              إدارة {selectedCompany.name}
            </Button>
          </div>
        ) : null
      }
    >
      <WhatsAppSurfaceCard
        title="نطاق العرض"
        description="اختر شركة إذا أردت القفز مباشرة إلى مساحة واتساب الخاصة بها بعد مراجعة ملكية الأتمتة."
      >
        <div className="max-w-sm">
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger className={controlClass}>
              <SelectValue placeholder="اختر شركة أو اعرض الكل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">المنصة بالكامل</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </WhatsAppSurfaceCard>

      <div className="grid gap-4 md:grid-cols-3">
        <div className={softCardClass}>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
            أتمتة المنصة
          </p>
          <p className="mt-2 text-3xl font-semibold text-[color:var(--color-foreground)]">
            {loading ? "…" : platformReadyNow.length}
          </p>
          <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
            أحداث تخص رحلة الشركة والاشتراك ويراجعها السوبر أدمن.
          </p>
        </div>

        <div className={softCardClass}>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
            داخل الشركات
          </p>
          <p className="mt-2 text-3xl font-semibold text-[color:var(--color-foreground)]">
            {loading ? "…" : companyOwnedSummary?.totalEvents || 0}
          </p>
          <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
            أحداث العملاء والطلبات والتسويق لا نكررها هنا وتُدار من مساحة الشركة.
          </p>
        </div>

        <div className={softCardClass}>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--color-muted-foreground)]">
            مسار الربط
          </p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--color-foreground)]">
            تبويب الجلسات هو نقطة ربط السيشن
          </p>
          <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
            من إعدادات الشركة افتح الجلسات، أنشئ session، ثم اجعلها افتراضية قبل تفعيل الأتمتة.
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <WhatsAppSurfaceCard
          title="ما يخص السوبر أدمن"
          description="أحداث المنصة التي يراجعها السوبر أدمن لأنها مرتبطة بالتسجيل، الاشتراك، أو رحلة صاحب الشركة."
        >
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-[18px]" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {platformReadyNow.map((item) => (
                <div
                  key={item.eventType}
                  className={softCardClass}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full">
                      {item.category}
                    </Badge>
                    <Badge className="rounded-full bg-[color:var(--color-primary)] text-white">
                      مرسل المنصة
                    </Badge>
                    <Badge variant="outline" className="rounded-full">
                      {item.activeCompanies} شركة فعّالة
                    </Badge>
                  </div>
                  <p className="mt-2 font-medium">{item.name}</p>
                  <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">
                    {item.eventType}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[color:var(--color-muted-foreground)]">
                    <span>{item.templateCount} قالب</span>
                    <span>•</span>
                    <span>{item.configuredCompanies} شركة مهيأة</span>
                    <span>•</span>
                    <span>{item.variables.length} متغير</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </WhatsAppSurfaceCard>

        <WhatsAppSurfaceCard
          title="ما لا يظهر هنا"
          description="هذه المساحة تشرح ما يُدار داخل الشركات أو عبر أدوات الإشعارات الأخرى بدل تكراره في شاشة السوبر أدمن."
        >
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-24 rounded-[18px]" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-[24px] border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--app-panel-bg)_84%,var(--shell-control-bg)_16%)] p-4">
                <p className="font-medium text-[color:var(--color-foreground)]">
                  أتمتة الشركة نفسها
                </p>
                <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted-foreground)]">
                  {companyOwnedSummary?.note}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(companyOwnedSummary?.categories || []).map((item) => (
                    <div
                      key={item.category}
                      className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:color-mix(in_srgb,var(--shell-control-bg)_78%,transparent)] px-3 py-2 text-sm"
                    >
                      <Badge variant="outline" className="rounded-full">
                        {item.category}
                      </Badge>
                      <p className="mt-2 font-medium text-[color:var(--color-foreground)]">
                        {item.totalEvents} حدث
                      </p>
                      <p className="text-xs text-[color:var(--color-muted-foreground)]">
                        {item.activeCompanies} شركة فعّالة
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-sky-300/60 bg-sky-500/10 p-4 text-sm text-sky-950 dark:text-sky-100">
                <p className="font-medium">إشعارات عملاء الموقع لا تتكرر هنا</p>
                <p className="mt-2 leading-6">
                  إذا كان الهدف رسائل العملاء من المتجر أو حملات البرودكاست أو السلاسل التسويقية، فتُدار من مساحة الشركة أو من الأداة المخصصة لذلك.
                </p>
                {selectedCompany ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      nativeButton={false}
                      variant="outline"
                      render={
                        <Link
                          to={`/super-admin/whatsapp/companies/${selectedCompany.id}/notifications`}
                        />
                      }
                      className="rounded-full border-sky-300/70 bg-[color:color-mix(in_srgb,var(--app-panel-bg)_86%,var(--shell-control-bg)_14%)] text-sky-950 hover:bg-[color:color-mix(in_srgb,var(--app-panel-bg)_92%,var(--shell-control-bg)_8%)] dark:text-sky-100"
                    >
                      <BellRing className="size-4" />
                      إشعارات الشركة
                    </Button>
                    <Button
                      nativeButton={false}
                      variant="outline"
                      render={
                        <Link
                          to={`/super-admin/whatsapp/companies/${selectedCompany.id}/settings?tab=sessions`}
                        />
                      }
                      className="rounded-full border-sky-300/70 bg-[color:color-mix(in_srgb,var(--app-panel-bg)_86%,var(--shell-control-bg)_14%)] text-sky-950 hover:bg-[color:color-mix(in_srgb,var(--app-panel-bg)_92%,var(--shell-control-bg)_8%)] dark:text-sky-100"
                    >
                      <Link2 className="size-4" />
                      الجلسات
                    </Button>
                  </div>
                ) : null}
              </div>

              {nextPhase.length > 0 ? (
                <div className="rounded-[24px] border border-amber-300/70 bg-amber-500/10 p-4">
                  <p className="font-medium text-amber-950 dark:text-amber-100">
                    المرحلة التالية
                  </p>
                  <div className="mt-3 space-y-2">
                    {nextPhase.map((item) => (
                      <div
                        key={item.eventType}
                        className="rounded-2xl border border-amber-300/60 bg-[color:color-mix(in_srgb,var(--app-panel-bg)_90%,var(--shell-control-bg)_10%)] p-3"
                      >
                        <p className="font-medium text-amber-950 dark:text-amber-100">{item.name}</p>
                        <p className="mt-1 text-sm text-amber-900 dark:text-amber-50/85">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </WhatsAppSurfaceCard>
      </div>
    </WhatsAppPageShell>
  );
}
