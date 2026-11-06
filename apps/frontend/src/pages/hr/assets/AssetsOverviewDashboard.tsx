import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlusIcon } from "@heroicons/react/24/outline";

import OverviewSection from "./sections/OverviewSection";
import WhyAssetsSection from "./sections/WhyAssetsSection";
import BenefitsSection from "./sections/BenefitsSection";
import HowItWorksSection from "./sections/HowItWorksSection";
import KPIsSection from "./sections/KPIsSection";
import ComplianceSection from "./sections/ComplianceSection";
import DocumentsSection from "./sections/DocumentsSection";
import ReceiptFormSection from "./sections/ReceiptFormSection";
import AssetRequestsSection from "./sections/AssetRequestsSection";
import AssetMaintenanceSection from "./sections/AssetMaintenanceSection";
import AssetList from "./AssetList";
import AssetCategories from "./AssetCategories";
import AssetSuppliers from "./AssetSuppliers";
import CustodyHistory from "./CustodyHistory";
import AssetForm from "./AssetForm";

import {
  useAssetsOverviewDashboardController,
  AssetsOverviewSidebar,
  AssetsOverviewTopHeader,
  AssetsOverviewReportsGrid,
} from "./dashboard";

const AssetsOverviewDashboard: React.FC = () => {
  const {
    activeSection,
    setActiveSection,
    showAddModal,
    setShowAddModal,
    refreshTrigger,
    handleRefresh,
    loadingReport,
    handleDownloadReport,
  } = useAssetsOverviewDashboardController();

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return <OverviewSection />;
      case "manage":
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                سجل الأصول
              </h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shadow-xs font-semibold"
              >
                <PlusIcon className="h-5 w-5" />
                إضافة أصل جديد
              </button>
            </div>

            {showAddModal && (
              <div className="rounded-2xl border border-border/70 bg-card shadow-xs p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    نموذج إضافة أصل
                  </h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                  >
                    إغلاق
                  </button>
                </div>
                <AssetForm
                  usePortal={false}
                  onClose={() => setShowAddModal(false)}
                  onSuccess={() => {
                    setShowAddModal(false);
                    handleRefresh();
                  }}
                />
              </div>
            )}

            <AssetList refreshTrigger={refreshTrigger} />
          </div>
        );
      case "categories":
        return <AssetCategories />;
      case "suppliers":
        return <AssetSuppliers />;
      case "custody":
        return <CustodyHistory />;
      case "documents":
        return <DocumentsSection />;
      case "receipts":
        return <ReceiptFormSection />;
      case "requests":
        return <AssetRequestsSection />;
      case "maintenance":
        return <AssetMaintenanceSection />;
      case "reports":
        return (
          <AssetsOverviewReportsGrid
            loadingReport={loadingReport}
            onDownloadReport={handleDownloadReport}
          />
        );
      case "why":
        return <WhyAssetsSection />;
      case "benefits":
        return <BenefitsSection />;
      case "how":
        return <HowItWorksSection />;
      case "kpis":
        return <KPIsSection />;
      case "compliance":
        return <ComplianceSection />;
      default:
        return <OverviewSection />;
    }
  };

  return (
    <div className="space-y-6 w-full pb-8" dir="rtl">
      <div className="rounded-2xl border border-border/70 bg-card flex flex-col md:flex-row overflow-hidden shadow-xs">
        {/* Sidebar Navigation */}
        <AssetsOverviewSidebar
          activeSection={activeSection}
          onSelectSection={setActiveSection}
        />

        {/* Main Content Area */}
        <div className="flex-1 min-w-0 flex flex-col min-h-[600px]">
          {/* Top Header */}
          <AssetsOverviewTopHeader
            activeSection={activeSection}
            onSelectSection={setActiveSection}
          />

          {/* Content with animation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="p-4 sm:p-6 flex-1"
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AssetsOverviewDashboard;
