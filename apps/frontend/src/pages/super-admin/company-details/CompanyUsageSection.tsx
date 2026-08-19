import { formatDate } from '@/utils/formatters';
import { formatCurrency } from '@/utils/formatters';
import type { CompanyReview } from "./companyDetailsTypes";
import { BarChart, BarChart3, Package } from 'lucide-react';
import { cn } from "../../../lib/utils";
import { Badge } from "../../../components/ui/badge";
import { MiniStat } from "./MiniStat";
import { SectionShell } from "./SectionShell";
import { EmptyState } from "./EmptyState";
import {
  formatDate,
  formatNumber,
  formatCurrency,
  formatUsageFeatureLabel,
  getStatusMeta,
  getPricingModelLabel,
} from "./helpers";

export function CompanyUsageSection({ review, reviewCurrency }: {
  review?: CompanyReview | null;
  reviewCurrency: string;
}) {
  return (
    <>
      <SectionShell title="الاستهلاك هذا الشهر" description="إجمالي التكلفة، تقسيم الاستخدام، ومؤشرات الحمل الحالية.">
        <div className="grid gap-3 sm:grid-cols-3">
          <MiniStat label="رسوم التطبيقات" value={formatCurrency(review?.usage?.costs?.subscriptions, reviewCurrency)} helper="اشتراكات الأدوات المفعلة" />
          <MiniStat label="تكلفة الاستخدام" value={formatCurrency(review?.usage?.costs?.usage, reviewCurrency)} helper="استهلاك فعلي حسب العمليات" />
          <MiniStat label="عدد العمليات" value={formatNumber(review?.usage?.totalActions || 0)} helper={`${formatNumber(review?.usage?.totalQuantity || 0)} وحدة`} />
        </div>

        <div className="divide-y divide-border/20">
          {review?.usage?.usageBreakdown?.length ? (
            review.usage.usageBreakdown.slice(0, 5).map((entry) => (
              <div key={entry.feature} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">{formatUsageFeatureLabel(entry.feature)}</p>
                  <p className="text-xs text-muted-foreground">{formatNumber(entry.totalActions)} عملية / {formatNumber(entry.totalQuantity)} وحدة</p>
                </div>
                <div className="text-sm font-bold text-foreground">{formatCurrency(entry.totalCost, reviewCurrency)}</div>
              </div>
            ))
          ) : (
            <EmptyState message="لا يوجد استهلاك مسجل خلال الفترة الحالية." icon={BarChart3} />
          )}
        </div>
      </SectionShell>

      <SectionShell title="الأدوات المثبتة" description="حالة كل أداة، تاريخها القادم، واستهلاكها الشهري.">
        <div className="space-y-2">
          {review?.usage?.installedApps?.length ? (
            review.usage.installedApps.map((companyApp) => (
              <div key={companyApp.id} className="py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black text-foreground">{companyApp.app?.name || "أداة بدون اسم"}</p>
                      <Badge variant="outline" className={cn("rounded-full px-2.5 py-1 text-[11px]", getStatusMeta("app", companyApp.status).className)}>
                        {getStatusMeta("app", companyApp.status).label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {getPricingModelLabel(companyApp.app?.pricingModel)} • {formatCurrency(companyApp.app?.monthlyPrice, reviewCurrency)} / شهر
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {companyApp.trialEndsAt
                        ? `نهاية التجربة ${formatDate(companyApp.trialEndsAt)}`
                        : companyApp.validUntil
                          ? `ساري حتى ${formatDate(companyApp.validUntil)}`
                          : companyApp.nextBillingAt
                            ? `التحصيل القادم ${formatDate(companyApp.nextBillingAt)}`
                            : "بدون موعد محدد"}
                    </p>
                  </div>
                  <div className="grid min-w-[180px] gap-2 text-xs text-muted-foreground sm:text-left">
                    <span>شهر حالي: {formatCurrency(companyApp.monthlyUsage?.totalCost, reviewCurrency)}</span>
                    <span>{companyApp.monthlyUsage?.totalActions || 0} عملية</span>
                    <span>إجمالي مصروف {formatCurrency(companyApp.totalSpent, reviewCurrency)}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState message="لا توجد أدوات مثبتة على هذه الشركة حاليًا." icon={Package} />
          )}
        </div>
      </SectionShell>
    </>
  );
}
