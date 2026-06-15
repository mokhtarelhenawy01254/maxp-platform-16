import { CalendarDays } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { MiniStat } from "./MiniStat";
import { SectionShell } from "./SectionShell";
import {
  formatDate,
  formatNumber,
  formatCurrency,
  formatRelativeDateLabel,
  getStatusMeta,
} from "./helpers";

export function CompanySubscriptionSection({ review, reviewCurrency, company, nextBillingDate, scrollToActivationSection }) {
  return (
    <SectionShell
      title="الاشتراك والتجديد"
      description="الخطة الحالية، رسوم المنصة، ومؤشرات التجديد القادمة."
      actions={
        <Button type="button" variant="outline" className="rounded-2xl" onClick={scrollToActivationSection}>
          <CalendarDays className="size-4" />
          إدارة التفعيل
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <MiniStat label="رسوم المنصة" value={formatCurrency(review?.subscription?.monthlyFee, reviewCurrency)}
          helper={`الخطة ${getStatusMeta("plan", review?.subscription?.plan || company.plan).label}`} />
        <MiniStat label="التجديد القادم" value={nextBillingDate ? formatDate(nextBillingDate) : "غير متوفر"}
          helper={nextBillingDate ? formatRelativeDateLabel(nextBillingDate) : "بدون موعد"} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-black">حالة الاشتراك</p>
              <p className="text-xs text-muted-foreground">تشمل رسوم المنصة فقط وليس التطبيقات المضافة.</p>
            </div>
            <Badge variant="outline" className={cn("rounded-full px-3 py-1 text-xs", getStatusMeta("subscription", review?.subscription?.status).className)}>
              {getStatusMeta("subscription", review?.subscription?.status).label}
            </Badge>
          </div>
        </div>

        <div className="py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-black">تغطية المحفظة</p>
              <p className="text-xs text-muted-foreground">مقارنة الرصيد الحالي مع رسوم المنصة القادمة.</p>
            </div>
            <Badge variant="outline" className={cn("rounded-full px-3 py-1 text-xs",
              (review?.wallet?.balance || 0) >= (review?.subscription?.monthlyFee || 0)
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300"
                : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100"
            )}>
              {(review?.wallet?.balance || 0) >= (review?.subscription?.monthlyFee || 0) ? "كافٍ" : "بحاجة شحن"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border/20">
        <div className="flex items-center justify-between gap-3 py-3">
          <span className="text-sm text-muted-foreground">آخر فوترة</span>
          <span className="text-sm font-bold text-foreground">{formatDate(review?.subscription?.lastBillingDate)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 py-3">
          <span className="text-sm text-muted-foreground">يوم التحصيل</span>
          <span className="text-sm font-bold text-foreground">{formatNumber(review?.subscription?.billingDay || 1)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 py-3">
          <span className="text-sm text-muted-foreground">محاولات الفشل</span>
          <span className="text-sm font-bold text-destructive">{formatNumber(review?.subscription?.failedAttempts || 0)}</span>
        </div>
        {review?.subscription?.hasEnterpriseOverrides ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 dark:border-sky-800/50 dark:bg-sky-950/20 dark:text-sky-300">
            هذه الشركة لديها تخصيصات مؤسسية على الرسوم أو الحدود.
          </div>
        ) : null}
      </div>
    </SectionShell>
  );
}
