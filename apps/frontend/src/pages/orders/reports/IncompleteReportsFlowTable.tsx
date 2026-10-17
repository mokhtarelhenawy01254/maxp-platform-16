import React from "react";
import { useCurrency } from "../../../hooks/useCurrency";
import { getDirection } from "../../../i18n";
import type { CohortDay, SummaryData } from "./IncompleteReportsTypes";
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

interface IncompleteReportsFlowTableProps {
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
              {cohorts.map((row) => {
                const dayLabel = formatCohortDayLabel(row.date, isRTL);
                const rowUncompleted =
                  row.uncompleted ??
                  row.cancelled + row.lost + row.active;
                const rowUncompletedValue =
                  row.uncompletedValue ??
                  row.cancelledValue + row.lostValue + row.activeValue;
                const resolvedCount = row.cancelled + row.lost;
                const resolvedRate =
                  rowUncompleted > 0
                    ? (resolvedCount / rowUncompleted) * 100
                    : 0;

                return (
                  <tr
                    key={row.date}
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
                              width: `${Math.min(
                                100,
                                Math.max(0, resolvedRate)
                              )}%`,
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
              })}
            </tbody>

            {/* صف الإجمالي النهائي */}
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
