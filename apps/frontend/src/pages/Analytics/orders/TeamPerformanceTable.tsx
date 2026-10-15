import React from "react";
import { useTranslation } from "react-i18next";
import { Trophy, ArrowUpDown } from "lucide-react";
import { Card } from "../../../components/ui/card";
import { TeamMemberStat } from "./TeamPerformanceAnalytics";

interface TeamPerformanceTableProps {
  sortedMembers: TeamMemberStat[];
  sortField: keyof TeamMemberStat;
  sortOrder: "asc" | "desc";
  onSort: (field: keyof TeamMemberStat) => void;
}

export const TeamPerformanceTable: React.FC<TeamPerformanceTableProps> = ({
  sortedMembers,
  sortField,
  sortOrder,
  onSort,
}) => {
  const { t } = useTranslation();

  if (!sortedMembers || sortedMembers.length === 0) return null;

  const renderSortIndicator = (field: keyof TeamMemberStat) => {
    if (sortField !== field) return null;
    return <span className="mr-1 text-[10px]">{sortOrder === "desc" ? "▼" : "▲"}</span>;
  };

  return (
    <Card className="border-border/70 bg-card overflow-hidden shadow-sm">
      <div className="p-3 bg-muted/20 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          {t("teamPerformance.performanceDetails", "تفاصيل أداء الموظفين")}
        </h3>
        <span className="text-muted-foreground text-[11px]">
          {t("teamPerformance.sortHint", "انقر على أي عمود للفرز التفاعلي")}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-right">
          <thead className="bg-muted/30 text-muted-foreground border-b border-border/70 text-[11px] font-medium select-none">
            <tr>
              <th
                onClick={() => onSort("userName")}
                className="py-2.5 px-3.5 cursor-pointer hover:text-foreground"
              >
                {t("teamPerformance.employee", "الموظف")} {renderSortIndicator("userName")}
              </th>
              <th
                onClick={() => onSort("role")}
                className="py-2.5 px-3.5 cursor-pointer hover:text-foreground"
              >
                {t("teamPerformance.role", "الدور")} {renderSortIndicator("role")}
              </th>
              <th
                onClick={() => onSort("ordersCreated")}
                className="py-2.5 px-3.5 text-center cursor-pointer hover:text-foreground"
              >
                {t("teamPerformance.ordersCreated", "طلبات منشأة")} {renderSortIndicator("ordersCreated")}
              </th>
              <th
                onClick={() => onSort("ordersConfirmed")}
                className="py-2.5 px-3.5 text-center cursor-pointer hover:text-foreground"
              >
                {t("teamPerformance.ordersConfirmed", "طلبات مؤكدة")} {renderSortIndicator("ordersConfirmed")}
              </th>
              <th
                onClick={() => onSort("ordersAssigned")}
                className="py-2.5 px-3.5 text-center cursor-pointer hover:text-foreground"
              >
                {t("teamPerformance.ordersAssigned", "طلبات مسندة")} {renderSortIndicator("ordersAssigned")}
              </th>
              <th
                onClick={() => onSort("totalRevenue")}
                className="py-2.5 px-3.5 text-center cursor-pointer hover:text-foreground"
              >
                {t("teamPerformance.totalRevenue", "إجمالي الإيراد")} {renderSortIndicator("totalRevenue")}
              </th>
              <th
                onClick={() => onSort("successRate")}
                className="py-2.5 px-3.5 text-center cursor-pointer hover:text-foreground"
              >
                {t("teamPerformance.successRate", "نسبة النجاح")} {renderSortIndicator("successRate")}
              </th>
              <th
                onClick={() => onSort("avgOrderValue")}
                className="py-2.5 px-3.5 text-left cursor-pointer hover:text-foreground"
              >
                {t("teamPerformance.avgOrderValue", "متوسط الطلب")} {renderSortIndicator("avgOrderValue")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {sortedMembers.map((member, index) => (
              <tr
                key={member.userId || index}
                className="hover:bg-muted/20 transition-colors"
              >
                <td className="py-2.5 px-3.5 font-medium text-foreground">
                  <div>
                    <p className="font-semibold">{member.userName}</p>
                    <p className="text-[10px] text-muted-foreground font-mono dir-ltr text-right">{member.email}</p>
                  </div>
                </td>
                <td className="py-2.5 px-3.5 text-muted-foreground">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-muted border border-border/60">
                    {member.role}
                  </span>
                </td>
                <td className="py-2.5 px-3.5 text-center font-mono tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                  {member.ordersCreated?.toLocaleString() || 0}
                </td>
                <td className="py-2.5 px-3.5 text-center font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                  {member.ordersConfirmed?.toLocaleString() || 0}
                </td>
                <td className="py-2.5 px-3.5 text-center font-mono tabular-nums font-semibold text-amber-600 dark:text-amber-400">
                  {(member.ordersAssigned || 0).toLocaleString()}
                </td>
                <td className="py-2.5 px-3.5 text-center font-mono tabular-nums font-bold text-foreground">
                  {member.totalRevenue?.toLocaleString()}
                </td>
                <td className="py-2.5 px-3.5 text-center">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-bold tabular-nums">
                    {typeof member.successRate === "number"
                      ? member.successRate.toFixed(1)
                      : "0.0"}%
                  </span>
                </td>
                <td className="py-2.5 px-3.5 text-left font-mono tabular-nums text-foreground font-medium">
                  {member.avgOrderValue?.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
