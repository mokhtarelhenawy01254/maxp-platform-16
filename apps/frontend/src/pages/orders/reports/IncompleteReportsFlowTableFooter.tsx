import React from "react";
import type { SummaryData } from "./IncompleteReportsTypes";

export interface IncompleteReportsFlowTableFooterProps {
  summary: SummaryData;
  totalUncompletedCount: number;
  totalUncompletedValue: number;
  formatPrice: (amount: number) => string;
}

export const IncompleteReportsFlowTableFooter: React.FC<
  IncompleteReportsFlowTableFooterProps
> = ({
  summary,
  totalUncompletedCount,
  totalUncompletedValue,
  formatPrice,
}) => {
  return (
    <tfoot className="bg-muted/40 font-semibold border-t border-border/80 text-xs">
      <tr>
        <td className="px-3.5 py-2.5 text-start text-foreground font-bold">
          إجمالي الفترة المحددة
        </td>
        <td className="px-3.5 py-2.5 text-center text-foreground font-mono tabular-nums">
          <div className="font-bold">
            {totalUncompletedCount.toLocaleString()}
          </div>
          <div className="text-muted-foreground text-[11px]">
            {formatPrice(totalUncompletedValue)}
          </div>
        </td>
        <td className="px-3.5 py-2.5 text-center text-emerald-600 dark:text-emerald-400 font-mono tabular-nums font-bold">
          <div>{summary.byTeam.toLocaleString()}</div>
          {summary.byTeamValue > 0 && (
            <div className="text-emerald-600/80 text-[11px]">
              {formatPrice(summary.byTeamValue)}
            </div>
          )}
        </td>
        <td className="px-3.5 py-2.5 text-center text-rose-600 dark:text-rose-400 font-mono tabular-nums font-bold">
          <div>{summary.cancelled.toLocaleString()}</div>
          {summary.cancelledValue > 0 && (
            <div className="text-muted-foreground text-[11px]">
              {formatPrice(summary.cancelledValue)}
            </div>
          )}
        </td>
        <td className="px-3.5 py-2.5 text-center text-amber-600 dark:text-amber-400 font-mono tabular-nums font-bold">
          <div>{summary.lost.toLocaleString()}</div>
          {summary.lostValue > 0 && (
            <div className="text-muted-foreground text-[11px]">
              {formatPrice(summary.lostValue)}
            </div>
          )}
        </td>
        <td className="px-3.5 py-2.5 text-center text-blue-600 dark:text-blue-400 font-mono tabular-nums font-bold">
          <div>{summary.active.toLocaleString()}</div>
          {summary.activeValue > 0 && (
            <div className="text-muted-foreground text-[11px]">
              {formatPrice(summary.activeValue)}
            </div>
          )}
        </td>
        <td className="px-3.5 py-2.5 text-end text-foreground font-mono tabular-nums font-bold text-xs">
          {summary.active > 0
            ? `${summary.active} فرصة معلقة`
            : "لا توجد سلات معلقة"}
        </td>
      </tr>
    </tfoot>
  );
};
