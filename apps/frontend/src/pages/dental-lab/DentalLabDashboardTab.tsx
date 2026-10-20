import { useTranslation } from "react-i18next";
import { Loader2, RefreshCw } from "lucide-react";
import { useDentalDashboard } from "./dashboard/hooks/useDentalDashboard";
import { DashboardKpiGrid } from "./dashboard/components/DashboardKpiGrid";
import { DashboardStatusBreakdown } from "./dashboard/components/DashboardStatusBreakdown";
import { DashboardTopDoctors } from "./dashboard/components/DashboardTopDoctors";
import { DashboardTopDebtors } from "./dashboard/components/DashboardTopDebtors";
import { DashboardQuickActions } from "./dashboard/components/DashboardQuickActions";

export default function DentalLabDashboardTab() {
  const { t } = useTranslation();
  const {
    data,
    loading,
    error,
    refresh,
    cards,
    byStatus,
    topDoctors,
    topDebtors,
    totalCases,
  } = useDentalDashboard();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t("dentalLab.tabs.dashboard")}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("dentalLab.dashboard.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 border dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {t("dentalLab.common.refresh")}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 text-sm">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          <DashboardKpiGrid cards={cards} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <DashboardStatusBreakdown
              byStatus={byStatus}
              totalCases={totalCases}
            />

            <DashboardTopDoctors topDoctors={topDoctors} />

            <DashboardTopDebtors topDebtors={topDebtors} />

            <DashboardQuickActions />
          </div>
        </>
      )}
    </div>
  );
}
