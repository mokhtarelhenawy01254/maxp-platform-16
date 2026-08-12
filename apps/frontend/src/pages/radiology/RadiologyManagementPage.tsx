import { useParams } from "react-router-dom";
import { TabId, TABS } from "./shared";
import RadiologyDashboardTab from "./RadiologyDashboardTab";
import ReceptionTab from "./ReceptionTab";
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
import ExamAdditionsTab from "./ExamAdditionsTab";
import StatisticsTab from "./StatisticsTab";
import CashierShiftsTab from "./CashierShiftsTab";
import SettingsTab from "./SettingsTab";
import TabErrorBoundary from "@/pages/admin/OrderWorkflow/TabErrorBoundary";

export default function RadiologyManagementPage() {
  const { "*": path } = useParams();
  const urlTab = (path || "").split("/")[0] || "";
  const activeTab = (TABS.some(t => t.id === urlTab) ? urlTab : "dashboard") as TabId;

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full h-full overflow-y-auto" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">نظام الأشعة</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">الاستقبال، الدراسات، الصور والتقارير</p>
        </div>
        <div className="flex flex-wrap gap-1.5 max-w-3xl">
          {TABS.map(t => (
            <a
              key={t.id}
              href={`/radiology/${t.id}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === t.id
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 border dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
            >
              {t.label}
            </a>
          ))}
        </div>
      </div>

      {activeTab === "dashboard" && <TabErrorBoundary tabLabel="لوحة الأشعة"><RadiologyDashboardTab /></TabErrorBoundary>}
      {activeTab === "reception" && <TabErrorBoundary tabLabel="الاستقبال"><ReceptionTab /></TabErrorBoundary>}
      {activeTab === "patients" && <TabErrorBoundary tabLabel="المرضى"><RadiologyPatientsTab /></TabErrorBoundary>}
      {activeTab === "studies" && <TabErrorBoundary tabLabel="الدراسات"><StudiesTab /></TabErrorBoundary>}
      {activeTab === "reports" && <TabErrorBoundary tabLabel="التقارير الطبية"><RadiologyReportsTab /></TabErrorBoundary>}
      {activeTab === "exam-types" && <TabErrorBoundary tabLabel="أنواع الفحوصات"><ExamTypesTab /></TabErrorBoundary>}
      {activeTab === "price-lists" && <TabErrorBoundary tabLabel="قوائم الأسعار"><PriceListsTab /></TabErrorBoundary>}
      {activeTab === "contracts" && <TabErrorBoundary tabLabel="التعاقدات"><RadiologyContractsTab /></TabErrorBoundary>}
      {activeTab === "branches" && <TabErrorBoundary tabLabel="الفروع"><RadiologyBranchesTab /></TabErrorBoundary>}
      {activeTab === "invoices" && <TabErrorBoundary tabLabel="المدفوعات"><RadiologyInvoicesTab /></TabErrorBoundary>}
      {activeTab === "reports-overview" && <TabErrorBoundary tabLabel="التقارير"><RadiologyReportsOverviewTab /></TabErrorBoundary>}
      {activeTab === "insurance-invoices" && <TabErrorBoundary tabLabel="فواتير التأمين"><InsuranceInvoicesTab /></TabErrorBoundary>}
      {activeTab === "insurance-ledger" && <TabErrorBoundary tabLabel="دفتر التأمين"><InsuranceLedgerTab /></TabErrorBoundary>}
      {activeTab === "insurance-companies" && <TabErrorBoundary tabLabel="شركات التأمين"><InsuranceCompaniesTab /></TabErrorBoundary>}
      {activeTab === "price-quote" && <TabErrorBoundary tabLabel="عرض سعر"><PriceQuoteTab /></TabErrorBoundary>}
      {activeTab === "radiologists" && <TabErrorBoundary tabLabel="أخصائيو الأشعة"><RadiologistsTab /></TabErrorBoundary>}
      {activeTab === "schedule" && <TabErrorBoundary tabLabel="الحجوزات"><ScheduleTab /></TabErrorBoundary>}
      {activeTab === "referring-physicians" && <TabErrorBoundary tabLabel="الأطباء المحوّلون"><ReferringPhysiciansTab /></TabErrorBoundary>}
      {activeTab === "exam-additions" && <TabErrorBoundary tabLabel="إضافات الفحوصات"><ExamAdditionsTab /></TabErrorBoundary>}
      {activeTab === "statistics" && <TabErrorBoundary tabLabel="الإحصائيات"><StatisticsTab /></TabErrorBoundary>}
      {activeTab === "cashier-shifts" && <TabErrorBoundary tabLabel="الورديات"><CashierShiftsTab /></TabErrorBoundary>}
      {activeTab === "settings" && <TabErrorBoundary tabLabel="الإعدادات"><SettingsTab /></TabErrorBoundary>}
    </div>
  );
}
