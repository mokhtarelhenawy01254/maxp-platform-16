import type { CompanyReview } from "./companyDetailsTypes";
import { cn } from "../../../lib/utils";
import { Badge } from "../../../components/ui/badge";
import { MiniStat } from "./MiniStat";
import { SectionShell } from "./SectionShell";
import { UsageBar, getUsageTone } from "./UsageBar";
import { formatNumber, formatLimit, getMetricDetails } from "./helpers";

export function CompanyLimitsSection({ review, limitEntries, directUsersCount }: {
  review?: CompanyReview | null;
  limitEntries: NonNullable<NonNullable<CompanyReview["limits"]>["entries"]>;
  directUsersCount?: number;
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
        <MiniStat label="الربط البرمجي (API)" value={review?.limits?.features?.apiAccess ? "مفعل" : "غير مفعل"} helper="صلاحية الربط البرمجي" />
      </div>

      <div className="space-y-3 pt-1">
        {(limitEntries || []).map((entry) => {
          const tone = getUsageTone(entry.percentage);
          const meta = getMetricDetails(entry);
          const unlimited = Boolean(entry.isUnlimited) || Number(entry.limit) === -1;
          const displayLabel = entry.key === "users" ? "الأعضاء" : entry.label;
          const externalMembersCount =
            entry.key === "users" && directUsersCount !== undefined
              ? Math.max(0, Number(entry.current) - directUsersCount)
              : 0;
          return (
            <div key={entry.key} className="rounded-xl border border-border/40 bg-card/60 p-3 space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-foreground">{displayLabel}</p>
                    {entry.bonus ? (
                      <Badge variant="outline" className="rounded-full border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/30 dark:text-sky-300">
                        +{formatNumber(entry.bonus)} بونص
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">{meta.detail}</p>
                  {externalMembersCount > 0 ? (
                    <p className="text-[11px] text-muted-foreground">
                      عضويات user_companies شاملة {formatNumber(externalMembersCount)} {externalMembersCount === 1 ? "عضو" : "أعضاء"} من شركات أخرى (المستخدمون الأساسيون من جدول users: {formatNumber(directUsersCount)})
                    </p>
                  ) : null}
                </div>
                {unlimited ? (
                  <span className="w-fit rounded-full border border-border/50 bg-muted/40 px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                    بدون حد أقصى
                  </span>
                ) : (
                  <div className={cn("text-xs font-black", tone.text)}>
                    {meta.percentageText}
                  </div>
                )}
              </div>
              {unlimited ? null : (
                <>
                  <UsageBar percentage={entry.percentage} />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span className="font-semibold">{meta.remainingText}</span>
                    <span>الحد الإجمالي: {formatLimit(entry.limit)}</span>
                  </div>
                </>
              )}
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
