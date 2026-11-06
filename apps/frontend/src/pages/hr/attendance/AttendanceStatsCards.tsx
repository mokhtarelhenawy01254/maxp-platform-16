import React from "react";
import { UserCheck, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TodayStats } from "./types";

interface AttendanceStatsCardsProps {
  todayStats: TodayStats | null;
}

export const AttendanceStatsCards: React.FC<AttendanceStatsCardsProps> = ({
  todayStats,
}) => {
  const stats = [
    {
      label: "إجمالي الموظفين",
      value: todayStats?.totalEmployees,
      icon: UserCheck,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "حاضر",
      value: todayStats?.present,
      icon: CheckCircle,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "متأخر",
      value: todayStats?.late,
      icon: AlertCircle,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "غائب",
      value: todayStats?.absent,
      icon: XCircle,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <Card
          key={i}
          className="rounded-2xl border border-border/70 bg-card shadow-xs transition-colors hover:border-border"
        >
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate mb-1">
                {stat.label}
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-foreground tracking-tight">
                {stat.value || 0}
              </h3>
            </div>
            <div className={`p-3 rounded-xl border border-border/40 ${stat.bg} ${stat.color} shrink-0`}>
              <stat.icon className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
