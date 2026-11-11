import type { ReactNode } from "react";
import type { CompanyData, CompanyReview, CompanyUser } from "./companyDetailsTypes";
import { AlertTriangle, Building2, CalendarClock, Globe, Mail, Phone, ShieldCheck, Store, ExternalLink } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent } from "../../../components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { InfoLine } from "./InfoLine";
import { formatDateTime, getCompanyRiskInfo, normalizeWebsite } from "./helpers";

export function CompanyHeroCard({ company, review, ownerUser, actions }: {
  company: CompanyData;
  review?: CompanyReview | null;
  ownerUser?: CompanyUser | null;
  actions?: ReactNode;
}) {
  const storefrontUrl = company.customDomain
    ? `https://${company.customDomain}`
    : company.slug
    ? `https://${company.slug}.maxp.online`
    : null;
  const riskInfo = getCompanyRiskInfo(company, review);

  return (
    <Card className="rounded-none border-0 bg-transparent shadow-none">
      <CardContent className="space-y-3.5 p-0 sm:p-0">
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-start">
          <div className="flex size-14 sm:size-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-amber-200/60 text-2xl font-black text-primary dark:to-amber-500/20">
            {company.name?.charAt(0) || "ش"}
          </div>
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                  {company.name}
                </h1>
                <StatusBadge isActive={company.isActive} />
                <Badge
                  variant="outline"
                  data-testid="company-risk-badge"
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${riskInfo.className}`}
                >
                  {riskInfo.level !== "ok" ? <AlertTriangle className="size-3" /> : null}
                  {riskInfo.label}
                </Badge>
                {company.businessSpecialty ? (
                  <Badge variant="outline" className="inline-flex items-center gap-1 rounded-full border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                    <Building2 className="size-3" />
                    {company.businessSpecialty.nameAr || company.businessSpecialty.nameEn}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="inline-flex items-center gap-1 rounded-full border-border/60 bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <Building2 className="size-3 opacity-60" />
                    نشاط عام
                  </Badge>
                )}
              </div>
              {actions ? (
                <div className="flex flex-wrap items-center gap-2 shrink-0" data-testid="company-header-actions">
                  {actions}
                </div>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <InfoLine icon={Mail}>{company.email || "غير متوفر"}</InfoLine>
              {company.phone ? <InfoLine icon={Phone}>{company.phone}</InfoLine> : null}
              {company.website ? (
                <InfoLine icon={Globe} asLink href={normalizeWebsite(company.website) ?? undefined}>
                  {company.website}
                </InfoLine>
              ) : null}
              <InfoLine icon={ShieldCheck}>
                {ownerUser ? `المالك: ${ownerUser.firstName} ${ownerUser.lastName}` : "المالك: غير محدد"}
              </InfoLine>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {storefrontUrl ? (
                <a
                  href={storefrontUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary hover:bg-primary/20 transition-colors"
                  title="فتح المتجر المباشر في تبويب جديد"
                >
                  <Store className="size-3.5" />
                  معاينة المتجر: {company.customDomain || `${company.slug}.maxp.online`}
                  <ExternalLink className="size-3 opacity-60" />
                </a>
              ) : null}
              <Badge variant="outline" className="rounded-full border-border/50 bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                العملة: {company.currency || "EGP"}
              </Badge>
              {company.createdAt ? (
                <Badge variant="outline" className="rounded-full border-border/50 bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground gap-1">
                  <CalendarClock className="size-3" /> تاريخ الإنشاء: {formatDateTime(company.createdAt)}
                </Badge>
              ) : null}
              {company.slug ? (
                <Badge variant="outline" className="rounded-full border-border/50 bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  المعرّف: {company.slug}
                </Badge>
              ) : null}
              {review?.limits?.coupon?.appliedCode ? (
                <Badge variant="outline" className="rounded-full border-sky-200 bg-sky-50 px-2.5 py-1 text-xs text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-300">
                  كوبون: {review.limits.coupon.appliedCode}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
