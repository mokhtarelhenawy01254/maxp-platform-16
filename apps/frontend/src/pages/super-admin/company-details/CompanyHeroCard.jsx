import { Globe, Mail, Phone, ShieldCheck } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent } from "../../../components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { InfoLine } from "./InfoLine";
import { getStatusMeta, normalizeWebsite } from "./helpers";

export function CompanyHeroCard({ company, review, ownerUser }) {
  return (
    <Card className="app-panel-theme rounded-2xl border">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-amber-200/60 text-3xl font-black text-primary dark:to-amber-500/20">
            {company.name?.charAt(0) || "ش"}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {company.name}
              </h1>
              <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px] font-bold">
                {getStatusMeta("plan", company.plan).label}
              </Badge>
              <StatusBadge isActive={company.isActive} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoLine icon={Mail}>{company.email || "غير متوفر"}</InfoLine>
              {company.phone ? <InfoLine icon={Phone}>{company.phone}</InfoLine> : null}
              {company.website ? (
                <InfoLine icon={Globe} asLink href={normalizeWebsite(company.website)}>
                  {company.website}
                </InfoLine>
              ) : null}
              <InfoLine icon={ShieldCheck}>
                {ownerUser ? `${ownerUser.firstName} ${ownerUser.lastName}` : "لا يوجد مالك محدد"}
              </InfoLine>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full border-border/50 bg-muted/30 px-3 py-1.5 text-xs">
                العملة: {company.currency || "EGP"}
              </Badge>
              {company.slug ? (
                <Badge variant="outline" className="rounded-full border-border/50 bg-muted/30 px-3 py-1.5 text-xs">
                  slug: {company.slug}
                </Badge>
              ) : null}
              {review?.limits?.coupon?.appliedCode ? (
                <Badge variant="outline" className="rounded-full border-sky-200 bg-sky-50 px-3 py-1.5 text-xs text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-300">
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
