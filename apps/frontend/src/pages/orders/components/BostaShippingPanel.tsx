import React from "react";
import { TruckIcon, DocumentArrowDownIcon, XMarkIcon, PlusIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface BostaShippingPanelProps {
  order: any;
  bostaShipment: any;
  bostaLoading: boolean;
  onCreateShipment: () => void;
  onPrintAWB: () => void;
  onCancelShipment: () => void;
  canManageShipments?: boolean;
}

const BostaShippingPanel: React.FC<BostaShippingPanelProps> = ({
  order, bostaShipment, bostaLoading, onCreateShipment, onPrintAWB, onCancelShipment, canManageShipments = true,
}) => {
  const hasShipment = Boolean(bostaShipment);
  const trackingNumber = bostaShipment?.trackingNumber || order?.bostaTrackingNumber;
  const status = bostaShipment?.status || order?.bostaShipmentStatus;

  const getStatusText = (s?: string) => {
    if (!s) return "غير متاح";
    const m: Record<string, string> = {
      PENDING: "قيد الانتظار", CREATED: "تم الإنشاء", CONFIRMED: "مؤكدة",
      PROCESSING: "قيد المعالجة", IN_TRANSIT: "قيد النقل", OUT_FOR_DELIVERY: "في الطريق للتسليم",
      DELIVERED: "تم التسليم", CANCELLED: "ملغاة", RETURNED: "مرتجعة",
      FAILED_DELIVERY: "فشل التوصيل", ON_HOLD: "معلقة",
    };
    return m[s] || s;
  };

  const getStatusColor = (s?: string) => {
    if (!s) return "bg-gray-100 text-gray-800";
    if (s === "DELIVERED") return "bg-green-100 text-green-800";
    if (s === "CANCELLED" || s === "RETURNED") return "bg-red-100 text-red-800";
    if (s === "PROCESSING" || s === "IN_TRANSIT" || s === "OUT_FOR_DELIVERY" || s === "CONFIRMED") return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center mb-4">
        <TruckIcon className="h-5 w-5 text-indigo-500 dark:text-indigo-400 ml-2" />
        شحن Bosta
      </h3>

      {hasShipment ? (
        <div className="space-y-4">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">رقم التتبع:</span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{trackingNumber || "غير متاح"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">حالة الشحنة:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>{getStatusText(status)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canManageShipments && (
              <button onClick={onPrintAWB} disabled={bostaLoading}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm">
                <DocumentArrowDownIcon className="w-4 h-4 ml-1" /> طباعة بوليصة Bosta
              </button>
            )}
            {canManageShipments && status !== "CANCELLED" && status !== "DELIVERED" && (
              <button onClick={onCancelShipment} disabled={bostaLoading}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm">
                <XMarkIcon className="w-4 h-4 ml-1" /> إلغاء الشحنة
              </button>
            )}
            {trackingNumber && (
              <a href={"https://track.bosta.co/" + trackingNumber} target="_blank" rel="noopener noreferrer"
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                <TruckIcon className="w-4 h-4 ml-1" /> تتبع على Bosta
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-gray-500 dark:text-gray-400 mb-4">لم يتم إنشاء شحنة Bosta لهذا الطلب</p>
          {canManageShipments ? (
            <>
              <button onClick={onCreateShipment} disabled={bostaLoading || order?.status !== "CONFIRMED"}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {bostaLoading ? <><ArrowPathIcon className="w-4 h-4 ml-1 animate-spin" /> جاري الإنشاء...</> : <><PlusIcon className="w-4 h-4 ml-1" /> إنشاء شحنة Bosta</>}
              </button>
              {order?.status !== "CONFIRMED" && <p className="text-xs text-gray-400 mt-2">يجب تأكيد الطلب أولاً</p>}
            </>
          ) : (
            <p className="text-xs text-gray-400">إدارة الشحن من صلاحيات الشركة.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default BostaShippingPanel;
