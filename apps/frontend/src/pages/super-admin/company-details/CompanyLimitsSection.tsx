import type { CompanyReview } from "./companyDetailsTypes";
import { cn } from "../../../lib/utils";
import { Badge } from "../../../components/ui/badge";
import { MiniStat } from "./MiniStat";
import { SectionShell } from "./SectionShell";
import { UsageBar, getUsageTone } from "./UsageBar";
import { formatNumber, formatLimit } from "./helpers";

export function CompanyLimitsSection({ review, limitEntries }: {
  review?: CompanyReview | null;
  limitEntries: NonNullable<CompanyReview['limits']>['entries'];
}) {
  return (
    <SectionShell
      title="الحدود والمزايا"
      description="استهلاك الشركة الحالي مقابل حدود الخطة والبونصات المطبقة."
      actions={
        review?.limits?.coupon ? (
          <Badge variant="outline" className="rounded-full border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-300">
            {review.limits.coupon.name || review.limits.coupon.appliedCode}
          </Badge>
        ) : null
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <MiniStat label="مزايا متقدمة" value={review?.limits?.features?.advancedReports ? "مفعلة" : "غير مفعلة"} helper="تقارير متقدمة على مستوى الخطة" />
        <MiniStat label="API Access" value={review?.limits?.features?.apiAccess ? "مفعل" : "غير مفعل"} helper="صلاحية الربط البرمجي" />
      </div>

      <div className="space-y-3">
        {(limitEntries || []).map((entry) => {
          const tone = getUsageTone(entry.percentage);
          return (
            <div key={entry.key} className="py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-foreground">{entry.label}</p>
                    {entry.bonus ? (
                      <Badge variant="outline" className="rounded-full border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-300">
                        +{formatNumber(entry.bonus)} بونص
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">المستخدم {formatNumber(entry.current)} من أصل {formatLimit(entry.limit)}</p>
                </div>
                <div className={cn("text-sm font-bold", tone.text)}>
                  {entry.isUnlimited ? "بدون حد" : `${Math.round(entry.percentage)}% مستخدم`}
                </div>
              </div>
              <UsageBar percentage={entry.percentage} />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>المتبقي {entry.isUnlimited ? "غير محدود" : formatNumber(entry.remaining)}</span>
                <span>الحد النهائي {formatLimit(entry.limit)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {review?.limits?.coupon?.benefitSummary?.length ? (
        <div className="rounded-xl border border-sky-200/70 bg-sky-50/80 p-4 dark:border-sky-800/50 dark:bg-sky-950/20">
          <p className="text-sm font-black text-sky-900 dark:text-sky-100">مزايا الكوبون المطبق</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {review.limits.coupon.benefitSummary.map((benefit) => (
              <Badge key={benefit} variant="outline" className="rounded-full border-sky-300 bg-white/75 px-3 py-1 text-xs text-sky-700 dark:border-sky-700/60 dark:bg-slate-950/40 dark:text-sky-300">
                {benefit}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </SectionShell>
  );
}
