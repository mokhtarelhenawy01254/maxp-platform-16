import React from "react";
import { Sparkles, RotateCcw, DollarSign, CheckCircle2, AlertCircle } from "lucide-react";
import { useCurrency } from "../../../hooks/useCurrency";
import { ReturnReasonAnalyticsSummary } from "./returnReasonsTypes";
import { Card, CardContent } from "../../../components/ui/card";

interface Props {
  summary: ReturnReasonAnalyticsSummary;
}

export const ReturnReasonsStatsBar: React.FC<Props> = ({ summary }) => {
  const { formatPrice } = useCurrency();
  const { topReason, topCategory } = summary;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
      {/* Insight Highlight Card */}
      <Card className="col-span-2 md:col-span-4 xl:col-span-2 border-rose-500/30 bg-rose-500/10 text-foreground overflow-hidden">
        <CardContent className="p-4 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
              <Sparkles className="h-3.5 w-3.5" />
              أهم الرؤى الميدانية
            </div>
            {topReason ? (
              <p className="mt-1.5 text-sm font-bold text-foreground leading-snug">
                «{topReason.reason}» الأكثر بنسبة {topReason.percentage}% ·{" "}
                {topReason.count.toLocaleString()} حالة
              </p>
            ) : (
              <p className="mt-1.5 text-sm font-medium text-muted-foreground">
                لا توجد مرتجعات مسجلة في هذه الفترة
              </p>
            )}
          </div>
          {topCategory && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              أعلى تصنيف: <span className="font-semibold text-foreground">{topCategory.category}</span> ({topCategory.percentage}%)
            </p>
          )}
        </CardContent>
      </Card>

      {/* KPI: Total Returns */}
      <Card className="border-border/70 bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>إجمالي المرتجعات</span>
            <RotateCcw className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-foreground">
            {summary.totalReturns.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 font-mono">
            {summary.returnRate}% من {summary.totalOrders.toLocaleString()} طلب
          </div>
        </CardContent>
      </Card>

      {/* KPI: Refund Value */}
      <Card className="border-border/70 bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>قيمة الاسترداد</span>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {formatPrice(summary.totalRefundValue)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 font-mono">
            متوسط {formatPrice(summary.avgReturnValue)}
          </div>
        </CardContent>
      </Card>

      {/* KPI: Resolved Rate */}
      <Card className="border-border/70 bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>تمت المعالجة</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {summary.resolutionRate}%
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 font-mono">
            {summary.resolvedCount.toLocaleString()} طلب معتمد
          </div>
        </CardContent>
      </Card>

      {/* KPI: Without Reason */}
      <Card className="border-border/70 bg-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>بدون سبب مسجل</span>
            <AlertCircle className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-foreground">
            {summary.withoutReasonCount.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 font-mono">
            {summary.withReasonCount.toLocaleString()} بسبب محدد
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
