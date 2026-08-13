import { useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TabId, TABS } from "./shared";
import RadiologyDashboardTab from "./RadiologyDashboardTab";
import RadiologyPatientsTab from "./RadiologyPatientsTab";
import StudiesTab from "./StudiesTab";
import RadiologyReportsTab from "./RadiologyReportsTab";
import ExamTypesTab from "./ExamTypesTab";
import PriceListsTab from "./PriceListsTab";
import RadiologyContractsTab from "./RadiologyContractsTab";
import RadiologyBranchesTab from "./RadiologyBranchesTab";
import RadiologyInvoicesTab from "./RadiologyInvoicesTab";
import RadiologyReportsOverviewTab from "./RadiologyReportsOverviewTab";
import InsuranceInvoicesTab from "./InsuranceInvoicesTab";
import InsuranceLedgerTab from "./InsuranceLedgerTab";
import InsuranceCompaniesTab from "./InsuranceCompaniesTab";
import PriceQuoteTab from "./PriceQuoteTab";
import RadiologistsTab from "./RadiologistsTab";
import ScheduleTab from "./ScheduleTab";
import ReferringPhysiciansTab from "./ReferringPhysiciansTab";
import StatisticsTab from "./StatisticsTab";
import CashierShiftsTab from "./CashierShiftsTab";
import SettingsTab from "./SettingsTab";
import TabErrorBoundary from "@/pages/admin/OrderWorkflow/TabErrorBoundary";

export default function RadiologyManagementPage() {
  const { t } = useTranslation();
  const { "*": path } = useParams();
  const urlTab = (path || "").split("/")[0] || "";
  // Legacy route redirect: reception was merged into schedule (appointment-based daily workflow)
  if (urlTab === "reception") return <Navigate to="/radiology/schedule" replace />;
  const activeTab = (TABS.some(t => t.id === urlTab) ? urlTab : "dashboard") as TabId;

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full h-full overflow-y-auto" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("radiology.title")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("radiology.subtitle")}</p>
        </div>
      </div>

      {activeTab === "dashboard" && <TabErrorBoundary tabLabel={t("radiology.tabs.dashboard")}><RadiologyDashboardTab /></TabErrorBoundary>}
      {activeTab === "patients" && <TabErrorBoundary tabLabel={t("radiology.tabs.patients")}><RadiologyPatientsTab /></TabErrorBoundary>}
      {activeTab === "studies" && <TabErrorBoundary tabLabel={t("radiology.tabs.studies")}><StudiesTab /></TabErrorBoundary>}
      {activeTab === "reports" && <TabErrorBoundary tabLabel={t("radiology.tabs.reports")}><RadiologyReportsTab /></TabErrorBoundary>}
      {activeTab === "exam-types" && <TabErrorBoundary tabLabel={t("radiology.tabs.exam-types")}><ExamTypesTab /></TabErrorBoundary>}
      {activeTab === "price-lists" && <TabErrorBoundary tabLabel={t("radiology.tabs.price-lists")}><PriceListsTab /></TabErrorBoundary>}
      {activeTab === "contracts" && <TabErrorBoundary tabLabel={t("radiology.tabs.contracts")}><RadiologyContractsTab /></TabErrorBoundary>}
      {activeTab === "branches" && <TabErrorBoundary tabLabel={t("radiology.tabs.branches")}><RadiologyBranchesTab /></TabErrorBoundary>}
      {activeTab === "invoices" && <TabErrorBoundary tabLabel={t("radiology.tabs.invoices")}><RadiologyInvoicesTab /></TabErrorBoundary>}
      {activeTab === "reports-overview" && <TabErrorBoundary tabLabel={t("radiology.tabs.reports-overview")}><RadiologyReportsOverviewTab /></TabErrorBoundary>}
      {activeTab === "insurance-invoices" && <TabErrorBoundary tabLabel={t("radiology.tabs.insurance-invoices")}><InsuranceInvoicesTab /></TabErrorBoundary>}
      {activeTab === "insurance-ledger" && <TabErrorBoundary tabLabel={t("radiology.tabs.insurance-ledger")}><InsuranceLedgerTab /></TabErrorBoundary>}
      {activeTab === "insurance-companies" && <TabErrorBoundary tabLabel={t("radiology.tabs.insurance-companies")}><InsuranceCompaniesTab /></TabErrorBoundary>}
      {activeTab === "price-quote" && <TabErrorBoundary tabLabel={t("radiology.tabs.price-quote")}><PriceQuoteTab /></TabErrorBoundary>}
      {activeTab === "radiologists" && <TabErrorBoundary tabLabel={t("radiology.tabs.radiologists")}><RadiologistsTab /></TabErrorBoundary>}
      {activeTab === "schedule" && <TabErrorBoundary tabLabel={t("radiology.tabs.schedule")}><ScheduleTab /></TabErrorBoundary>}
      {activeTab === "referring-physicians" && <TabErrorBoundary tabLabel={t("radiology.tabs.referring-physicians")}><ReferringPhysiciansTab /></TabErrorBoundary>}
      {activeTab === "statistics" && <TabErrorBoundary tabLabel={t("radiology.tabs.statistics")}><StatisticsTab /></TabErrorBoundary>}
      {activeTab === "cashier-shifts" && <TabErrorBoundary tabLabel={t("radiology.tabs.cashier-shifts")}><CashierShiftsTab /></TabErrorBoundary>}
      {activeTab === "settings" && <TabErrorBoundary tabLabel={t("radiology.tabs.settings")}><SettingsTab /></TabErrorBoundary>}
    </div>
  );
}
