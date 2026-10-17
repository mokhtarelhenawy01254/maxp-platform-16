import React from 'react';
import { AgentReportBreakdown, WorkspaceReportsData } from './useWorkspaceReports';

interface ReportsBreakdownTableProps {
  agentBreakdown: AgentReportBreakdown[];
  kpis: WorkspaceReportsData['kpis'];
  isManager: boolean;
  isArabic: boolean;
}

export const ReportsBreakdownTable: React.FC<ReportsBreakdownTableProps> = ({
  agentBreakdown,
  kpis,
  isManager,
  isArabic,
}) => {
  const formatSeconds = (totalSecs: number) => {
    if (!totalSecs || totalSecs <= 0) return isArabic ? '0 ث' : '0s';
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins === 0) return isArabic ? `${secs} ث` : `${secs}s`;
    return isArabic ? `${mins} د ${secs > 0 ? `${secs} ث` : ''}` : `${mins}m ${secs > 0 ? `${secs}s` : ''}`;
  };

  const formatHandlingMinutes = (mins: number) => {
    if (!mins || mins <= 0) return isArabic ? '0 دقيقة' : '0 min';
    if (mins < 60) return isArabic ? `${mins} دقيقة` : `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return isArabic ? `${hrs} س ${remMins > 0 ? `${remMins} د` : ''}` : `${hrs}h ${remMins > 0 ? `${remMins}m` : ''}`;
  };

  return (
    <div className="rounded-lg border border-border/50 bg-card shadow-xs overflow-hidden dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5 bg-muted/20 dark:border-slate-800 dark:bg-slate-800/60">
        <span className="text-xs font-bold text-foreground dark:text-slate-100">
          {isManager
            ? isArabic ? 'تفاصيل أداء فريق التأكيد' : 'Confirmation Team Breakdown'
            : isArabic ? 'تفاصيل أدائي الفردي' : 'My Individual Performance'}
        </span>
        <span className="text-[11px] font-medium text-muted-foreground tabular-nums dark:text-slate-400">
          {agentBreakdown.length} {isArabic ? 'وكيل' : 'agents'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-start text-xs border-collapse">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30 text-muted-foreground font-semibold dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300">
              <th className="py-2.5 px-3 text-start">{isArabic ? 'الوكيل' : 'Agent'}</th>
              <th className="py-2.5 px-3 text-center">{isArabic ? 'تواصل بها' : 'Contacted'}</th>
              <th className="py-2.5 px-3 text-center">{isArabic ? 'مؤكدة' : 'Confirmed'}</th>
              <th className="py-2.5 px-3 text-center">{isArabic ? 'نسبة التأكيد' : 'Conf. Rate'}</th>
              <th className="py-2.5 px-3 text-center">{isArabic ? 'مؤجلة' : 'Follow-up'}</th>
              <th className="py-2.5 px-3 text-center">{isArabic ? 'ملغية' : 'Cancelled'}</th>
              <th className="py-2.5 px-3 text-center">{isArabic ? 'مفتوحة الآن' : 'Open'}</th>
              <th className="py-2.5 px-3 text-center">{isArabic ? 'المكالمات' : 'Calls'}</th>
              <th className="py-2.5 px-3 text-center">{isArabic ? 'المدة' : 'Duration'}</th>
              <th className="py-2.5 px-3 text-center">{isArabic ? 'المحاولات/طلب' : 'Attempts/Ord'}</th>
              <th className="py-2.5 px-3 text-center">{isArabic ? 'زمن المعالجة' : 'Handling Time'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30 dark:divide-slate-800/70">
            {agentBreakdown.map((row) => (
              <tr
                key={row.agentId}
                className="hover:bg-muted/40 transition-colors dark:hover:bg-slate-800/50"
              >
                <td className="py-2.5 px-3 font-semibold text-foreground dark:text-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span>{row.agentName}</span>
                    {row.role && (
                      <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground font-normal dark:bg-slate-800 dark:text-slate-400">
                        {row.role}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-center font-bold tabular-nums text-foreground dark:text-slate-100">
                  {row.contactedOrders}
                </td>
                <td className="py-2.5 px-3 text-center font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {row.confirmedOrders}
                </td>
                <td className="py-2.5 px-3 text-center font-bold tabular-nums dark:text-slate-200">
                  {row.confirmationRate}%
                </td>
                <td className="py-2.5 px-3 text-center font-medium tabular-nums text-amber-600 dark:text-amber-400">
                  {row.followUpOrders}
                </td>
                <td className="py-2.5 px-3 text-center font-medium tabular-nums text-rose-600 dark:text-rose-400">
                  {row.cancelledOrders}
                </td>
                <td className="py-2.5 px-3 text-center font-medium tabular-nums text-foreground dark:text-slate-200">
                  {row.openOrders}
                </td>
                <td className="py-2.5 px-3 text-center font-medium tabular-nums text-foreground dark:text-slate-200">
                  {row.totalCalls}
                </td>
                <td className="py-2.5 px-3 text-center font-medium tabular-nums text-muted-foreground dark:text-slate-400">
                  {formatSeconds(row.totalDurationSeconds)}
                </td>
                <td className="py-2.5 px-3 text-center font-medium tabular-nums text-foreground dark:text-slate-200">
                  {row.avgAttemptsPerOrder}
                </td>
                <td className="py-2.5 px-3 text-center font-medium tabular-nums text-muted-foreground dark:text-slate-400">
                  {formatHandlingMinutes(row.avgHandlingTimeMinutes)}
                </td>
              </tr>
            ))}
          </tbody>
          {/* Table Footer: Totals */}
          {agentBreakdown.length > 1 && (
            <tfoot>
              <tr className="border-t-2 border-border/60 bg-muted/20 font-bold dark:border-slate-700 dark:bg-slate-800/80">
                <td className="py-2.5 px-3 text-foreground dark:text-slate-100">{isArabic ? 'إجمالي الفريق' : 'Team Total'}</td>
                <td className="py-2.5 px-3 text-center tabular-nums text-foreground dark:text-slate-100">
                  {kpis.contactedOrders.value}
                </td>
                <td className="py-2.5 px-3 text-center tabular-nums text-emerald-600 dark:text-emerald-400">
                  {kpis.confirmedOrders.value}
                </td>
                <td className="py-2.5 px-3 text-center tabular-nums text-foreground dark:text-slate-100">
                  {kpis.confirmationRate.value}%
                </td>
                <td className="py-2.5 px-3 text-center tabular-nums text-amber-600 dark:text-amber-400">
                  {kpis.followUpOrders.value}
                </td>
                <td className="py-2.5 px-3 text-center tabular-nums text-rose-600 dark:text-rose-400">
                  {kpis.cancelledOrders.value}
                </td>
                <td className="py-2.5 px-3 text-center tabular-nums text-foreground dark:text-slate-100">
                  {kpis.openOrders.value}
                </td>
                <td className="py-2.5 px-3 text-center tabular-nums text-foreground dark:text-slate-100">
                  {kpis.totalCalls.value}
                </td>
                <td className="py-2.5 px-3 text-center tabular-nums text-muted-foreground dark:text-slate-400">
                  {formatSeconds(kpis.totalDurationSeconds.value)}
                </td>
                <td className="py-2.5 px-3 text-center tabular-nums text-foreground dark:text-slate-100">
                  {kpis.avgAttemptsPerOrder.value}
                </td>
                <td className="py-2.5 px-3 text-center tabular-nums text-muted-foreground dark:text-slate-400">
                  {formatHandlingMinutes(kpis.avgHandlingTimeMinutes.value)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
