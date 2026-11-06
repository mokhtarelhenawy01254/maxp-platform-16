import React from "react";
import {
  ArrowRightCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import {
  useAssetRequestsSectionController,
  AssetRequestsContentPanels,
  CreateAssetRequestModal,
} from "./asset-requests";

const AssetRequestsSection: React.FC = () => {
  const {
    view,
    setView,
    requests,
    showRequestModal,
    setShowRequestModal,
    loading,
    newRequest,
    setNewRequest,
    fetchRequests,
    handleCreateRequest,
    handleUpdateStatus,
  } = useAssetRequestsSectionController();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ArrowRightCircleIcon className="h-7 w-7 text-indigo-600" />
            نظام طلبات العهدة والأصول
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            تقديم طلبات عهدة جديدة ومتابعة حالات الموافقة والتخصيص (يدعم إشعارات
            WhatsApp)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => void fetchRequests()}
            className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 transition-all"
          >
            <ArrowPathIcon
              className={`h-5 w-5 text-gray-500 ${loading ? "animate-spin" : ""}`}
            />
          </button>
          <div className="flex bg-card p-1 rounded-xl border border-border/70 shadow-xs">
            <button
              onClick={() => setView("employee")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                view === "employee"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              طلباتي
            </button>
            <button
              onClick={() => setView("hr")}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                view === "hr"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              إدارة HR
            </button>
          </div>
        </div>
      </div>

      <AssetRequestsContentPanels
        view={view}
        requests={requests}
        onOpenModal={() => setShowRequestModal(true)}
        onUpdateStatus={handleUpdateStatus}
      />

      <CreateAssetRequestModal
        open={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        newRequest={newRequest}
        onChangeRequest={setNewRequest}
        onSubmit={handleCreateRequest}
      />
    </div>
  );
};

export default AssetRequestsSection;
