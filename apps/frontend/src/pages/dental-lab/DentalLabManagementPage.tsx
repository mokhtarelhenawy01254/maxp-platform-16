import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2 } from "lucide-react";
import { TabId, TABS, fetchMyInfo } from "./shared";
import DentalTechKioskTab from "./technician/DentalTechKioskTab";
import DentalLabDashboardTab from "./DentalLabDashboardTab";
import DentalCasesTab from "./DentalCasesTab";
import DentalDoctorsTab from "./DentalDoctorsTab";
import DentalWorkTypesTab from "./DentalWorkTypesTab";
import DentalTechniciansTab from "./DentalTechniciansTab";
import DentalInvoicesTab from "./DentalInvoicesTab";
import DentalMaterialsTab from "./DentalMaterialsTab";
import DentalLabSettingsTab from "./DentalLabSettingsTab";
import DentalLabNotificationsTab from "./DentalLabNotificationsTab";
import DentalLabReportsTab from "./DentalLabReportsTab";
import DentalTechnicianPortal from "./DentalTechnicianPortal";
import TabErrorBoundary from "@/pages/admin/OrderWorkflow/TabErrorBoundary";

export default function DentalLabManagementPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { "*": path } = useParams();
  const [techPortal, setTechPortal] = useState<boolean | null>(null);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchMyInfo()
      .then((info) => {
        if (mounted) {
          const isTech = info.dentalRole === "TECHNICIAN";
          setTechPortal(isTech);
          if (isTech) {
            try {
              sessionStorage.setItem("dentalRole", "TECHNICIAN");
              localStorage.setItem("dentalRole", "TECHNICIAN");
              const raw = localStorage.getItem("user");
              if (raw) {
                const u = JSON.parse(raw);
                if (!u.isDentalTechnician || u.dentalRole !== "TECHNICIAN") {
                  u.isDentalTechnician = true;
                  u.dentalRole = "TECHNICIAN";
                  localStorage.setItem("user", JSON.stringify(u));
                }
              }
            } catch (_) {}
          } else {
            try {
              sessionStorage.removeItem("dentalRole");
              localStorage.removeItem("dentalRole");
              const raw = localStorage.getItem("user");
              if (raw) {
                const u = JSON.parse(raw);
                if (u.isDentalTechnician || u.dentalRole === "TECHNICIAN") {
                  delete u.isDentalTechnician;
                  delete u.dentalRole;
                  localStorage.setItem("user", JSON.stringify(u));
                }
              }
            } catch (_) {}
          }
          setFetchError(false);
        }
      })
      .catch(() => {
        if (mounted) setFetchError(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const urlTab = (path || "").split("/")[0] || "";
  const isKioskRoute = urlTab === "kiosk";
  const activeTab = (TABS.some(t => t.id === urlTab) ? urlTab : "dashboard") as TabId;

  if (techPortal === true) {
    return (
      <div className="p-3 sm:p-6 w-full h-full overflow-y-auto">
        <TabErrorBoundary tabLabel={t("dentalLab.myCases.title")}>
          <DentalTechnicianPortal initialSection={urlTab} />
        </TabErrorBoundary>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="p-4 md:p-6 lg:p-8 w-full h-full overflow-y-auto">
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-sm text-red-500">{t("dentalLab.common.noData")}</p>
          <button onClick={() => { setFetchError(false); setTechPortal(null); fetchMyInfo().then(i=>setTechPortal(i.dentalRole==="TECHNICIAN")).catch(()=>setFetchError(true)); }} className="px-4 py-2 border rounded-lg text-sm">{t("dentalLab.common.refresh")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 w-full h-full overflow-y-auto">
      {techPortal === null && (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      )}
      {techPortal === false && isKioskRoute && (
        <TabErrorBoundary tabLabel={t("dentalLab.tabs.kiosk")}>
          <div className="max-w-xl mx-auto">
            <button
              onClick={() => navigate("/dental-lab/cases")}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
              <span>{t("dentalLab.common.back")}</span>
            </button>
            <DentalTechKioskTab />
          </div>
        </TabErrorBoundary>
      )}
      {techPortal === false && !isKioskRoute && (
        <>
          {activeTab === "dashboard" && <TabErrorBoundary tabLabel={t("dentalLab.tabs.dashboard")}><DentalLabDashboardTab /></TabErrorBoundary>}
          {activeTab === "cases" && <TabErrorBoundary tabLabel={t("dentalLab.tabs.cases")}><DentalCasesTab /></TabErrorBoundary>}
          {activeTab === "doctors" && <TabErrorBoundary tabLabel={t("dentalLab.tabs.doctors")}><DentalDoctorsTab /></TabErrorBoundary>}
          {activeTab === "work-types" && <TabErrorBoundary tabLabel={t("dentalLab.tabs.work-types")}><DentalWorkTypesTab /></TabErrorBoundary>}
          {activeTab === "technicians" && <TabErrorBoundary tabLabel={t("dentalLab.tabs.technicians")}><DentalTechniciansTab /></TabErrorBoundary>}
          {activeTab === "materials" && <TabErrorBoundary tabLabel={t("dentalLab.tabs.materials", "الخامات والمخازن")}><DentalMaterialsTab /></TabErrorBoundary>}
          {activeTab === "invoices" && <TabErrorBoundary tabLabel={t("dentalLab.tabs.invoices")}><DentalInvoicesTab /></TabErrorBoundary>}
          {activeTab === "settings" && <TabErrorBoundary tabLabel={t("dentalLab.tabs.settings")}><DentalLabSettingsTab /></TabErrorBoundary>}
          {activeTab === "notifications" && <TabErrorBoundary tabLabel={t("dentalLab.notifications.title")}><DentalLabNotificationsTab /></TabErrorBoundary>}
          {activeTab === "reports" && <TabErrorBoundary tabLabel={t("dentalLab.reports.title")}><DentalLabReportsTab /></TabErrorBoundary>}
        </>
      )}
    </div>
  );
}