import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Inbox } from "lucide-react";
import { fmtMoney } from "../../shared";
import type { ReportsKpi } from "../types/reportsTypes";

export function ReportsKpiCards({ kpi }: { kpi: ReportsKpi | null }) {
  const { t } = useTranslation();

  const kpiCards = [
    {
      label: t("dentalLab.dashboard.collected"),
      value: kpi ? fmtMoney(kpi.revenue) : "—",
      icon: <ArrowUpRight className="w-4 h-4" />,
      tone: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: t("dentalLab.dashboard.outstanding"),
      value: kpi ? fmtMoney(kpi.outstanding) : "—",
      icon: <ArrowDownLeft className="w-4 h-4" />,
      tone: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-900/20",
    },
    {
      label: t("dentalLab.dashboard.todayReceived"),
      value: String(kpi?.todayReceived ?? "—"),
      icon: <Inbox className="w-4 h-4" />,
      tone: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: t("dentalLab.dashboard.overdueCount"),
      value: String(kpi?.overdueCount ?? "—"),
      icon: <AlertTriangle className="w-4 h-4" />,
      tone: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {kpiCards.map((k) => (
        <div
          key={k.label}
          className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-4 py-3"
        >
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${k.bg} ${k.tone}`}
          >
            {k.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {k.label}
            </p>
            <p className={`text-lg font-bold truncate font-mono tabular-nums ${k.tone}`}>
              {k.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ReportsKpiCards;
