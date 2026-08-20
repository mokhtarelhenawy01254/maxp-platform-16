import { useParams } from "react-router-dom";
import { TabId, TABS } from "./shared";
import LabDashboardTab from "./LabDashboardTab";
import TestsTab from "./TestsTab";
import ReceptionTab from "./ReceptionTab";
import OrdersTab from "./OrdersTab";
import LabPatientsTab from "./LabPatientsTab";
import LabBranchesTab from "./LabBranchesTab";
import LabInvoicesTab from "./LabInvoicesTab";
import CulturesTab from "./CulturesTab";
import ContractsTab from "./ContractsTab";
import HomeVisitsTab from "./HomeVisitsTab";
import SettingsTab from "./SettingsTab";
import PriceListsTab from "@/pages/admin/booking/PriceListsTab";
import BookingReportsTab from "@/pages/admin/booking/BookingReportsTab";
import TabErrorBoundary from "@/pages/admin/OrderWorkflow/TabErrorBoundary";

export default function LabManagementPage() {
  const { "*": path } = useParams();
  const urlTab = (path || "").split("/")[0] || "";
  const activeTab = (TABS.some(t => t.id === urlTab) ? urlTab : "dashboard") as TabId;

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full h-full overflow-y-auto" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">┘å╪╕╪º┘à ╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä┘à╪╣┘à┘ä</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">╪º┘ä╪º╪│╪¬┘é╪¿╪º┘ä╪î ╪º┘ä╪º╪«╪¬╪¿╪º╪▒╪º╪¬╪î ╪º┘ä┘å╪¬╪º╪ª╪¼ ┘ê╪º┘ä╪¬┘é╪º╪▒┘è╪▒</p>
        </div>
        <div className="flex flex-wrap gap-1.5 max-w-3xl">
          {TABS.map(t => (
            <a
              key={t.id}
              href={`/lab/${t.id}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === t.id
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 border dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
            >
              {t.label}
            </a>
          ))}
        </div>
      </div>

      {activeTab === "dashboard" && <TabErrorBoundary tabLabel="┘ä┘ê╪¡╪⌐ ╪º┘ä┘à╪╣┘à┘ä"><LabDashboardTab /></TabErrorBoundary>}
      {activeTab === "reception" && <TabErrorBoundary tabLabel="╪º┘ä╪º╪│╪¬┘é╪¿╪º┘ä"><ReceptionTab /></TabErrorBoundary>}
      {activeTab === "patients" && <TabErrorBoundary tabLabel="╪º┘ä┘à╪▒╪╢┘ë"><LabPatientsTab /></TabErrorBoundary>}
      {activeTab === "orders" && <TabErrorBoundary tabLabel="╪º┘ä╪╖┘ä╪¿╪º╪¬"><OrdersTab /></TabErrorBoundary>}
      {activeTab === "reports-medical" && <TabErrorBoundary tabLabel="╪º┘ä╪¬┘é╪º╪▒┘è╪▒ ╪º┘ä╪╖╪¿┘è╪⌐"><OrdersTab /></TabErrorBoundary>}
      {activeTab === "tests" && <TabErrorBoundary tabLabel="╪º┘ä╪º╪«╪¬╪¿╪º╪▒╪º╪¬"><TestsTab /></TabErrorBoundary>}
      {activeTab === "cultures" && <TabErrorBoundary tabLabel="╪º┘ä┘à╪▓╪º╪▒╪╣"><CulturesTab /></TabErrorBoundary>}
      {activeTab === "price-lists" && <TabErrorBoundary tabLabel="┘é┘ê╪º╪ª┘à ╪º┘ä╪ú╪│╪╣╪º╪▒"><PriceListsTab /></TabErrorBoundary>}
      {activeTab === "contracts" && <TabErrorBoundary tabLabel="╪º┘ä╪¬╪╣╪º┘é╪»╪º╪¬"><ContractsTab /></TabErrorBoundary>}
      {activeTab === "branches" && <TabErrorBoundary tabLabel="╪º┘ä┘ü╪▒┘ê╪╣"><LabBranchesTab /></TabErrorBoundary>}
      {activeTab === "invoices" && <TabErrorBoundary tabLabel="╪º┘ä┘à╪»┘ü┘ê╪╣╪º╪¬"><LabInvoicesTab /></TabErrorBoundary>}
      {activeTab === "reports" && <TabErrorBoundary tabLabel="╪º┘ä╪¬┘é╪º╪▒┘è╪▒"><BookingReportsTab /></TabErrorBoundary>}
      {activeTab === "home-visits" && <TabErrorBoundary tabLabel="╪º┘ä╪▓┘è╪º╪▒╪º╪¬ ╪º┘ä┘à┘å╪▓┘ä┘è╪⌐"><HomeVisitsTab /></TabErrorBoundary>}
      {activeTab === "settings" && <TabErrorBoundary tabLabel="╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬"><SettingsTab /></TabErrorBoundary>}
    </div>
  );
}
