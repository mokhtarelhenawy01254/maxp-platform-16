import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarRange } from "lucide-react";

import type { ReportView } from "./reports/types/reportsTypes";
import { ReportsKpiCards } from "./reports/components/ReportsKpiCards";
import { ReportsTabNav } from "./reports/components/ReportsTabNav";
import { DoctorStatementView } from "./reports/views/DoctorStatementView";
import { TechnicianProductivityView } from "./reports/views/TechnicianProductivityView";
import { WorkTypeRevenueView } from "./reports/views/WorkTypeRevenueView";
import { OverdueCasesView } from "./reports/views/OverdueCasesView";
import { DebtAgingView } from "./reports/views/DebtAgingView";
import { RemakesAnalysisView } from "./reports/views/RemakesAnalysisView";
import { useDentalReportsDashboard } from "./reports/hooks/useDentalReportsDashboard";

export default function DentalLabReportsTab() {
  const { t } = useTranslation();
  const [view, setView] = useState<ReportView>("statement");
  const { kpi } = useDentalReportsDashboard();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t("dentalLab.reports.title")}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("dentalLab.reports.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <CalendarRange className="w-4 h-4" />
          {t("dentalLab.reports.periodHint")}
        </div>
      </div>

      <ReportsKpiCards kpi={kpi} />

      <ReportsTabNav currentView={view} onSelectView={setView} />

      <div>
        {view === "statement" && <DoctorStatementView />}
        {view === "productivity" && <TechnicianProductivityView />}
        {view === "revenue" && <WorkTypeRevenueView />}
        {view === "overdue" && <OverdueCasesView />}
        {view === "aging" && <DebtAgingView />}
        {view === "remakes" && <RemakesAnalysisView />}
      </div>
    </div>
  );
}
