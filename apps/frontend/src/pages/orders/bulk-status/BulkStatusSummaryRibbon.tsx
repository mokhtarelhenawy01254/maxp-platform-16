import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

interface BulkStatusSummaryRibbonProps {
  summary: { total: number; success: number; failed: number };
}

export const BulkStatusSummaryRibbon: React.FC<BulkStatusSummaryRibbonProps> = ({
  summary,
}) => {
  const successPercent =
    summary.total > 0 ? Math.round((summary.success / summary.total) * 100) : 0;

  return (
    <Card className="bg-card border-border/70 shadow-xs">
      <CardHeader className="pb-3 border-b border-border/60">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span>ملخص نتائج المعالجة</span>
          <span className="text-xs font-mono font-normal text-muted-foreground">
            نسبة النجاح {successPercent}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Progress Bar */}
        <div className="h-2.5 w-full bg-muted/60 rounded-full overflow-hidden flex border border-border/40">
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${successPercent}%` }}
          />
          <div
            className="bg-rose-500 h-full transition-all duration-500"
            style={{ width: `${100 - successPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
            <div className="text-xs text-muted-foreground">إجمالي الصفوف</div>
            <div className="text-xl font-bold font-mono tabular-nums text-foreground mt-0.5">
              {summary.total.toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
            <div className="text-xs text-emerald-600 dark:text-emerald-400">
              ناجحة ومحدثة
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
              {summary.success.toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5">
            <div className="text-xs text-rose-600 dark:text-rose-400">
              فشلت / مرفوضة
            </div>
            <div className="text-xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-0.5">
              {summary.failed.toLocaleString()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkStatusSummaryRibbon;
