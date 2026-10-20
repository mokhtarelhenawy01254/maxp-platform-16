import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  FileText,
  RotateCcw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type { ReportView } from "../types/reportsTypes";

interface ReportsTabNavProps {
  currentView: ReportView;
  onSelectView: (view: ReportView) => void;
}

export function ReportsTabNav({
  currentView,
  onSelectView,
}: ReportsTabNavProps) {
  const { t } = useTranslation();

  const VIEWS: {
    id: ReportView;
    labelKey?: string;
    label?: string;
    icon: ReactNode;
  }[] = [
    {
      id: "statement",
      labelKey: "dentalLab.reports.statementTab",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: "productivity",
      labelKey: "dentalLab.reports.productivityTab",
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: "aging",
      labelKey: "dentalLab.reports.aging.title",
      icon: <Wallet className="w-4 h-4" />,
    },
    {
      id: "overdue",
      labelKey: "dentalLab.reports.overdueTab",
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    {
      id: "revenue",
      labelKey: "dentalLab.reports.revenueTab",
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      id: "remakes",
      label: "تحليل الإعادات والأسباب (Remakes)",
      icon: <RotateCcw className="w-4 h-4" />,
    },
  ];

  return (
    <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 gap-1 flex-wrap">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          onClick={() => onSelectView(v.id)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentView === v.id
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          {v.icon}
          {v.labelKey ? t(v.labelKey) : v.label}
        </button>
      ))}
    </div>
  );
}

export default ReportsTabNav;
