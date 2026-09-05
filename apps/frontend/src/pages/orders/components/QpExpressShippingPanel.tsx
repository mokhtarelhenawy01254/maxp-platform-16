import React, { useState, useEffect } from "react";
import {
  TruckIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  PhoneIcon,
  UserIcon,
  ChatBubbleBottomCenterTextIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { useQpExpressShipping } from "../hooks/useQpExpressShipping";

interface QpExpressShippingPanelProps {
  order: any;
  setOrder: (order: any) => void;
  canManageShipments?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: "طلب جديد / قيد التجهيز", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: ExclamationCircleIcon },
  OUT_FOR_DELIVERY: { label: "خرج للتوصيل مع المندوب", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: TruckIcon },
  DELIVERED: { label: "تم التسليم بنجاح", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", icon: CheckCircleIcon },
  RETURNED: { label: "مرتجع / ملغي", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300", icon: ExclamationCircleIcon },
  UNKNOWN: { label: "غير محدد", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300", icon: TruckIcon },
};

export const QpExpressShippingPanel: React.FC<QpExpressShippingPanelProps> = ({
  order,
  setOrder,
  canManageShipments = true,
}) => {
  const { loading, trackingData, fetchTracking, createShipment } = useQpExpressShipping(order, setOrder);
  const [customNotes, setCustomNotes] = useState(
    order?.notes || "المعاينة في وجود المندوب ولا يوجد استرجاع إلا في حالة عيوب الصناعة"
  );
  const [copied, setCopied] = useState(false);

  const trackingNumber =
    trackingData?.trackingNumber ||
    order?.shippingTrackingNumber ||
    (order?.shippingCarrier === "QP_EXPRESS" ? order?.trackingNumber : null);

  useEffect(() => {
    if (trackingNumber) {
      fetchTracking();
    }
  }, [trackingNumber]);

  const copyTracking = () => {
    if (trackingNumber) {
      navigator.clipboard.writeText(trackingNumber);
      setCopied(true);
      toast.success("تم نسخ رقم البوليصة");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreate = async () => {
    if (!canManageShipments) {
      toast.error("ليس لديك صلاحية لإرسال الشحنات");
      return;
    }
    await createShipment(customNotes);
  };

  const statusInfo = trackingData?.status
    ? STATUS_CONFIG[trackingData.status] || STATUS_CONFIG.UNKNOWN
    : STATUS_CONFIG.PENDING;

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4 border-b pb-3 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
            <TruckIcon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              شركة كيو بي إكسبريس (QP Express)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              الشحن المباشر والتوصيل المحلي السريع
            </p>
          </div>
        </div>

        {trackingNumber && (
          <button
            onClick={fetchTracking}
            disabled={loading}
            className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
            title="تحديث الحالة اللحظية"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            تحديث الحالة
          </button>
        )}
      </div>

      {trackingNumber ? (
        <div className="space-y-4">
          {/* Status & Waybill Card */}
          <div className="bg-gray-50 dark:bg-gray-900/40 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                  رقم بوليصة الشحن (AWB):
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-base font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {trackingNumber}
                  </span>
                  <button
                    onClick={copyTracking}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500"
                    title="نسخ رقم البوليصة"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  </button>
                  {copied && <span className="text-xs text-green-600">تم النسخ!</span>}
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
                  الحالة اللحظية:
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}
                >
                  <statusInfo.icon className="h-3.5 w-3.5" />
                  {trackingData?.statusLabel || statusInfo.label}
                </span>
              </div>
            </div>
          </div>

          {/* Delivery & Driver Details */}
          {trackingData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {trackingData.driverName && (
                <div className="flex items-center gap-2 p-2.5 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                  <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div className="truncate">
                    <span className="text-xs text-gray-500 block">المندوب:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {trackingData.driverName}
                    </span>
                  </div>
                </div>
              )}

              {trackingData.driverPhone && (
                <div className="flex items-center gap-2 p-2.5 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                  <PhoneIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <span className="text-xs text-gray-500 block">هاتف المندوب:</span>
                    <a
                      href={`tel:${trackingData.driverPhone}`}
                      className="font-medium text-blue-600 dark:text-blue-400 hover:underline font-mono"
                    >
                      {trackingData.driverPhone}
                    </a>
                  </div>
                </div>
              )}

              {trackingData.statusNote && (
                <div className="sm:col-span-2 flex items-start gap-2 p-2.5 bg-amber-50/60 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-900/30">
                  <ChatBubbleBottomCenterTextIcon className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs text-amber-800 dark:text-amber-300 font-bold block">
                      ملاحظة المندوب الميدانية:
                    </span>
                    <p className="text-xs text-amber-900 dark:text-amber-200 mt-0.5">
                      {trackingData.statusNote}
                    </p>
                  </div>
                </div>
              )}

              {trackingData.totalFees !== undefined && (
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                  <CurrencyDollarIcon className="h-4 w-4 text-gray-500 shrink-0" />
                  <div>
                    <span className="text-xs text-gray-500 block">مصاريف الشحن:</span>
                    <span className="font-bold text-gray-900 dark:text-gray-100">
                      {trackingData.totalFees} ج.م
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Unshipped Order - Form to Create Shipment */
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            لم يتم إنشاء بوليصة شحن لهذا الطلب بعد لدى كيو بي إكسبريس. يمكنك إرسال الطلب مباشرة
            وتوليد البوليصة.
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              ملاحظات المعاينة والتسليم للمندوب:
            </label>
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="مثال: المعاينة في وجود المندوب"
              className="w-full text-xs p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors shadow disabled:opacity-50"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                جاري الإرسال وتوليد البوليصة...
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="h-4 w-4 rotate-180" />
                إرسال الشحنة إلى QP Express وتوليد البوليصة
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default QpExpressShippingPanel;
