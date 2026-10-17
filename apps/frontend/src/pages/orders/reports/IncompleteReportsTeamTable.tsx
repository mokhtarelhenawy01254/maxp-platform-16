import React from "react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../../hooks/useCurrency";
import type { TeamMemberReport } from "./IncompleteReportsTypes";

interface IncompleteReportsTeamTableProps {
  team: TeamMemberReport[];
}

export const IncompleteReportsTeamTable: React.FC<
  IncompleteReportsTeamTableProps
> = ({ team }) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrency();

  return (
    <section className="bg-card rounded-xl p-4 sm:p-5 shadow-2xs border border-border/70 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            تعامل الفريق مع السلات المتروكة
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            تفصيل إنجاز كل موظف: كم سلة نجح في استردادها وتحويلها لأوردر، كم ألغى
            بالتأكيد، ومحاولات التواصل
          </p>
        </div>
        {team.length > 0 && (
          <div className="text-xs text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-md border border-border/60 font-mono tabular-nums">
            عدد أعضاء الفريق:{" "}
            <strong className="text-foreground">{team.length}</strong>
          </div>
        )}
      </div>

      {team.length ? (
        <div className="overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-start min-w-[750px] divide-y divide-border/60">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3.5 py-2.5 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("orders.incompleteTeamEmployee", "الموظف")}
                </th>
                <th className="px-3.5 py-2.5 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  سلات حولها لأوردرات
                </th>
                <th className="px-3.5 py-2.5 text-center text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                  سلات ألغاها بالتأكيد
                </th>
                <th className="px-3.5 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  محاولات التواصل
                </th>
                <th className="px-3.5 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  إجمالي التعامل
                </th>
                <th className="px-3.5 py-2.5 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  نسبة التحويل
                </th>
                <th className="px-3.5 py-2.5 text-end text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  معدل الاستجابة
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 bg-card">
              {team.map((member, idx) => {
                const name =
                  member.displayName ||
                  member.employeeName ||
                  t("orders.incompleteTeamUnknown", "غير معروف");
                const initials =
                  name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase() || "U";
                const handled = Number(
                  member.handledTotal ??
                    member.conversions + (member.dismissed || 0)
                );

                return (
                  <tr
                    key={`${member.employeeId || member.employeeName}-${idx}`}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-3.5 py-2.5 text-start">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-muted-foreground w-4 text-center font-mono tabular-nums">
                          #{idx + 1}
                        </span>
                        {member.avatar ? (
                          <img
                            src={member.avatar}
                            alt={name}
                            className="w-7 h-7 rounded-full object-cover border border-border/70 shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-semibold text-foreground truncate">
                            {name}
                          </div>
                          {member.email && member.email !== name && (
                            <div className="text-[11px] text-muted-foreground truncate">
                              {member.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-3.5 py-2.5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono tabular-nums">
                        {Number(member.conversions || 0).toLocaleString()}
                      </span>
                      {Number(member.value || 0) > 0 && (
                        <div className="text-[10px] text-muted-foreground font-mono tabular-nums mt-0.5">
                          {formatPrice(member.value)}
                        </div>
                      )}
                    </td>

                    <td className="px-3.5 py-2.5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-mono tabular-nums">
                        {Number(member.dismissed || 0).toLocaleString()}
                      </span>
                    </td>

                    <td className="px-3.5 py-2.5 text-center text-xs font-medium text-foreground font-mono tabular-nums">
                      {member.contacts.toLocaleString()}
                    </td>

                    <td className="px-3.5 py-2.5 text-center text-xs font-bold text-foreground font-mono tabular-nums">
                      {handled.toLocaleString()}
                    </td>

                    <td className="px-3.5 py-2.5 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                      {Number(member.conversionRate || 0).toFixed(1)}%
                    </td>

                    <td className="px-3.5 py-2.5 text-end text-xs font-medium text-muted-foreground font-mono tabular-nums">
                      {member.responseRate.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {team.length > 1 && (
              <tfoot className="bg-muted/40 font-semibold border-t border-border/80 text-xs">
                <tr>
                  <td className="px-3.5 py-2.5 text-start text-foreground font-bold">
                    إجمالي تعامل الفريق
                  </td>
                  <td className="px-3.5 py-2.5 text-center text-emerald-600 dark:text-emerald-400 font-mono tabular-nums font-bold">
                    <div>
                      {team
                        .reduce((s, m) => s + Number(m.conversions || 0), 0)
                        .toLocaleString()}
                    </div>
                    <div className="text-[10px] font-normal text-muted-foreground">
                      {formatPrice(
                        team.reduce((s, m) => s + Number(m.value || 0), 0)
                      )}
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5 text-center text-rose-600 dark:text-rose-400 font-mono tabular-nums font-bold">
                    {team
                      .reduce((s, m) => s + Number(m.dismissed || 0), 0)
                      .toLocaleString()}
                  </td>
                  <td className="px-3.5 py-2.5 text-center text-foreground font-mono tabular-nums font-bold">
                    {team
                      .reduce((s, m) => s + m.contacts, 0)
                      .toLocaleString()}
                  </td>
                  <td className="px-3.5 py-2.5 text-center text-foreground font-mono tabular-nums font-bold">
                    {team
                      .reduce(
                        (s, m) =>
                          s +
                          Number(
                            m.handledTotal ??
                              m.conversions + (m.dismissed || 0)
                          ),
                        0
                      )
                      .toLocaleString()}
                  </td>
                  <td className="px-3.5 py-2.5 text-center text-emerald-600 dark:text-emerald-400 font-mono tabular-nums font-bold">
                    {(() => {
                      const totalHandled = team.reduce(
                        (s, m) =>
                          s +
                          Number(
                            m.handledTotal ??
                              m.conversions + (m.dismissed || 0)
                          ),
                        0
                      );
                      const totalConv = team.reduce(
                        (s, m) => s + Number(m.conversions || 0),
                        0
                      );
                      return `${
                        totalHandled > 0
                          ? ((totalConv / totalHandled) * 100).toFixed(1)
                          : "0.0"
                      }%`;
                    })()}
                  </td>
                  <td className="px-3.5 py-2.5 text-end text-muted-foreground font-mono tabular-nums font-bold">
                    {(() => {
                      const totalContacts = team.reduce(
                        (s, m) => s + m.contacts,
                        0
                      );
                      const totalResponses = team.reduce(
                        (s, m) => s + m.responses,
                        0
                      );
                      return `${
                        totalContacts > 0
                          ? ((totalResponses / totalContacts) * 100).toFixed(1)
                          : "0.0"
                      }%`;
                    })()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-8 text-center">
          لا توجد تعاملات مسجلة للفريق في هذه الفترة
        </p>
      )}
    </section>
  );
};

export default IncompleteReportsTeamTable;
