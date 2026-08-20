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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">نظام إدارة المعمل</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">الاستقبال، الاختبارات، النتائج والتقارير</p>
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

      {activeTab === "dashboard" && <TabErrorBoundary tabLabel="لوحة المعمل"><LabDashboardTab /></TabErrorBoundary>}
      {activeTab === "reception" && <TabErrorBoundary tabLabel="الاستقبال"><ReceptionTab /></TabErrorBoundary>}
      {activeTab === "patients" && <TabErrorBoundary tabLabel="المرضى"><LabPatientsTab /></TabErrorBoundary>}
      {activeTab === "orders" && <TabErrorBoundary tabLabel="الطلبات"><OrdersTab /></TabErrorBoundary>}
      {activeTab === "reports-medical" && <TabErrorBoundary tabLabel="التقارير الطبية"><OrdersTab /></TabErrorBoundary>}
      {activeTab === "tests" && <TabErrorBoundary tabLabel="الاختبارات"><TestsTab /></TabErrorBoundary>}
      {activeTab === "cultures" && <TabErrorBoundary tabLabel="المزارع"><CulturesTab /></TabErrorBoundary>}
      {activeTab === "price-lists" && <TabErrorBoundary tabLabel="قوائم الأسعار"><PriceListsTab /></TabErrorBoundary>}
      {activeTab === "contracts" && <TabErrorBoundary tabLabel="التعاقدات"><ContractsTab /></TabErrorBoundary>}
      {activeTab === "branches" && <TabErrorBoundary tabLabel="الفروع"><LabBranchesTab /></TabErrorBoundary>}
      {activeTab === "invoices" && <TabErrorBoundary tabLabel="المدفوعات"><LabInvoicesTab /></TabErrorBoundary>}
      {activeTab === "reports" && <TabErrorBoundary tabLabel="التقارير"><BookingReportsTab /></TabErrorBoundary>}
      {activeTab === "home-visits" && <TabErrorBoundary tabLabel="الزيارات المنزلية"><HomeVisitsTab /></TabErrorBoundary>}
      {activeTab === "settings" && <TabErrorBoundary tabLabel="الإعدادات"><SettingsTab /></TabErrorBoundary>}
    </div>
  );
}
