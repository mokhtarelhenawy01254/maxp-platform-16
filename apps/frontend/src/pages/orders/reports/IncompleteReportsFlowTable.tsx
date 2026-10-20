import React from "react";
import { useCurrency } from "../../../hooks/useCurrency";
import { getDirection } from "../../../i18n";
import type { CohortDay, SummaryData } from "./IncompleteReportsTypes";
import { IncompleteReportsFlowTableRow } from "./IncompleteReportsFlowTableRow";
import { IncompleteReportsFlowTableFooter } from "./IncompleteReportsFlowTableFooter";

export interface IncompleteReportsFlowTableProps {
  cohorts: CohortDay[];
  summary: SummaryData;
  totalUncompletedCount: number;
  totalUncompletedValue: number;
}

export const IncompleteReportsFlowTable: React.FC<
  IncompleteReportsFlowTableProps
> = ({ cohorts, summary, totalUncompletedCount, totalUncompletedValue }) => {
  const { formatPrice } = useCurrency();
  const isRTL = getDirection() === "rtl";

  return (
    <section className="bg-card rounded-xl p-4 sm:p-5 shadow-2xs border border-border/70 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            جدول كشف السلات غير المكتملة والفاقد اليومي (Daily Uncompleted Flow)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            تتبع يومي للسلات التي لم تكتمل ومصيرها: كم ألغاه الفريق بعد التواصل، كم
            فُقد بمرور الوقت، وكم لا يزال معلقاً في الطابور
          </p>
        </div>
        <div className="text-xs text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-md border border-border/60 font-mono tabular-nums">
          إجمالي الأيام:{" "}
          <strong className="text-foreground">{cohorts.length}</strong>
        </div>
      </div>

      {cohorts.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-start min-w-[800px] divide-y divide-border/60">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3.5 py-2.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  اليوم / التاريخ
                </th>
                <th className="px-3.5 py-2.5 text-center text-xs font-semibold text-foreground uppercase tracking-wider">
                  إجمالي غير المكتمل
                </th>
                <th className="px-3.5 py-2.5 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  حولها الفريق لأوردرات
                </th>
                <th className="px-3.5 py-2.5 text-center text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                  ألغاها الفريق بالتأكيد
                </th>
                <th className="px-3.5 py-2.5 text-center text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  مفقودة بالتقادم
                </th>
                <th className="px-3.5 py-2.5 text-center text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  معلقة في الطابور (فرص)
                </th>
                <th className="px-3.5 py-2.5 text-end text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  حالة الحسم
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {cohorts.map((row) => (
                <IncompleteReportsFlowTableRow
                  key={row.date}
                  row={row}
                  isRTL={isRTL}
                  formatPrice={formatPrice}
                />
              ))}
            </tbody>

            <IncompleteReportsFlowTableFooter
              summary={summary}
              totalUncompletedCount={totalUncompletedCount}
              totalUncompletedValue={totalUncompletedValue}
              formatPrice={formatPrice}
            />
          </table>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-8 text-center">
          لا توجد سلات مسجلة في هذه الفترة
        </p>
      )}
    </section>
  );
};

export default IncompleteReportsFlowTable;
