import React from "react";
import type { CohortDay } from "./IncompleteReportsTypes";
import { toDateInput } from "./useIncompleteReportsData";

const formatCohortDayLabel = (dateStr: string, isRTL: boolean) => {
  const now = new Date();
  const todayKey = toDateInput(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toDateInput(yesterday);

  if (dateStr === todayKey) {
    return {
      main: isRTL ? "اليوم" : "Today",
      isToday: true,
      isYesterday: false,
    };
  }
  if (dateStr === yesterdayKey) {
    return {
      main: isRTL ? "أمس" : "Yesterday",
      isToday: false,
      isYesterday: true,
    };
  }
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const main = dateObj.toLocaleDateString(isRTL ? "ar-EG" : "en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    return { main, isToday: false, isYesterday: false };
  } catch {
    return { main: dateStr, isToday: false, isYesterday: false };
  }
};

export interface IncompleteReportsFlowTableRowProps {
  row: CohortDay;
  isRTL: boolean;
  formatPrice: (amount: number) => string;
}

export const IncompleteReportsFlowTableRow: React.FC<
  IncompleteReportsFlowTableRowProps
> = ({ row, isRTL, formatPrice }) => {
  const dayLabel = formatCohortDayLabel(row.date, isRTL);
  const rowUncompleted =
    row.uncompleted ?? row.cancelled + row.lost + row.active;
  const rowUncompletedValue =
    row.uncompletedValue ??
    row.cancelledValue + row.lostValue + row.activeValue;
  const resolvedCount = row.cancelled + row.lost;
  const resolvedRate =
    rowUncompleted > 0 ? (resolvedCount / rowUncompleted) * 100 : 0;

  return (
    <tr
      className={`hover:bg-muted/40 transition-colors ${
        dayLabel.isToday ? "bg-primary/5 font-medium" : ""
      }`}
    >
      {/* اليوم والتاريخ */}
      <td className="px-3.5 py-2.5 text-start">
        <div className="flex items-center gap-2">
          {dayLabel.isToday && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
              اليوم
            </span>
          )}
          {dayLabel.isYesterday && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground border border-border/50">
              أمس
            </span>
          )}
          <div>
            <div className="text-xs sm:text-sm font-semibold text-foreground">
              {dayLabel.main}
            </div>
            <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
              {row.date}
            </div>
          </div>
        </div>
      </td>

      {/* إجمالي غير المكتمل */}
      <td className="px-3.5 py-2.5 text-center">
        <div className="text-xs sm:text-sm font-bold text-foreground font-mono tabular-nums">
          {rowUncompleted.toLocaleString()}
        </div>
        <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
          {formatPrice(rowUncompletedValue)}
        </div>
      </td>

      {/* حولها الفريق لأوردرات */}
      <td className="px-3.5 py-2.5 text-center">
        <div className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
          {row.byTeamConverted.toLocaleString()}
        </div>
        {row.byTeamConvertedValue > 0 && (
          <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
            {formatPrice(row.byTeamConvertedValue)}
          </div>
        )}
      </td>

      {/* ألغاها الفريق بالتأكيد */}
      <td className="px-3.5 py-2.5 text-center">
        <div className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 font-mono tabular-nums">
          {row.cancelled.toLocaleString()}
        </div>
        {row.cancelledValue > 0 && (
          <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
            {formatPrice(row.cancelledValue)}
          </div>
        )}
      </td>

      {/* مفقودة بالتقادم */}
      <td className="px-3.5 py-2.5 text-center">
        <div className="text-xs sm:text-sm font-semibold text-amber-600 dark:text-amber-400 font-mono tabular-nums">
          {row.lost.toLocaleString()}
        </div>
        {row.lostValue > 0 && (
          <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
            {formatPrice(row.lostValue)}
          </div>
        )}
      </td>

      {/* معلقة في الطابور */}
      <td className="px-3.5 py-2.5 text-center">
        <div className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 font-mono tabular-nums">
          {row.active.toLocaleString()}
        </div>
        {row.activeValue > 0 && (
          <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
            {formatPrice(row.activeValue)}
          </div>
        )}
      </td>

      {/* حالة الحسم */}
      <td className="px-3.5 py-2.5 text-end">
        <div className="inline-flex flex-col items-end gap-1">
          <span className="text-xs font-semibold text-foreground font-mono tabular-nums">
            {row.active > 0 ? (
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                {row.active} معلقة
              </span>
            ) : (
              <span className="text-muted-foreground font-sans text-[11px]">
                حُسمت بالكامل
              </span>
            )}
          </span>
          <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-1.5 rounded-full transition-all"
              style={{
                width: `${Math.min(100, Math.max(0, resolvedRate))}%`,
              }}
              title={`تم حسم ${resolvedRate.toFixed(
                0
              )}% من السلات غير المكتملة`}
            />
          </div>
        </div>
      </td>
    </tr>
  );
};
