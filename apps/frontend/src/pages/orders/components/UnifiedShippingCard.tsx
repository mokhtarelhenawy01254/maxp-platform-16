import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  TruckIcon,
  ArrowPathIcon,
  PrinterIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { apiClient } from "../../../services/apiClient";
import { useCurrency } from "../../../hooks/useCurrency";

interface ShippingCompany {
  id: string;
  name: string;
  slug?: string;
  providerKey?: string;
  integrationMode?: string;
  isActive: boolean;
}

interface UnifiedShippingCardProps {
  order: any;
  onOrderUpdated?: () => void;
  canManageShipments?: boolean;
}

const UnifiedShippingCard: React.FC<UnifiedShippingCardProps> = ({
  order,
  onOrderUpdated,
  canManageShipments = true,
}) => {
  const { formatPrice } = useCurrency();

  const [companies, setCompanies] = useState<ShippingCompany[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [isManualCourier, setIsManualCourier] = useState(false);
  const [manualTracking, setManualTracking] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Extract shipment if already linked
  const shipment = order?.shipment || (Array.isArray(order?.shipments) && order.shipments[0]) || null;
  const existingTracking =
    shipment?.trackingNumber ||
    order?.trackingNumber ||
    order?.turboTrackingNumber ||
    order?.metadata?.trackingNumber ||
    null;

  const existingCarrierName =
    shipment?.shippingCompany?.name ||
    order?.shippingCompany?.name ||
    order?.carrierType ||
    (order?.turboTrackingNumber ? "Turbo" : null) ||
    "شركة الشحن";

  const shipmentStatus =
    shipment?.status ||
    order?.shipmentStatus ||
    order?.turboShipmentStatus ||
    "PENDING";

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await apiClient.get("/shipping-companies?all=true");
        if (res.data?.success && Array.isArray(res.data.data)) {
          const activeOnes = res.data.data.filter((c: ShippingCompany) => c.isActive);
          setCompanies(activeOnes);
          if (activeOnes.length > 0 && !selectedCompanyId) {
            setSelectedCompanyId(activeOnes[0].id);
          }
        }
      } catch (err) {
        console.error("Error fetching shipping companies:", err);
      }
    };
    fetchCompanies();
  }, []);

  const copyTracking = () => {
    if (existingTracking) {
      navigator.clipboard.writeText(existingTracking);
      toast.success("تم نسخ رقم التتبع");
    }
  };

  // Dispatch / Create Shipment
  const handleCreateShipment = async () => {
    if (!canManageShipments) {
      toast.error("ليس لديك صلاحية إدارة الشحن");
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post("/shipments/create", {
        orderId: order.id,
        shippingCompanyId: isManualCourier ? null : selectedCompanyId || null,
        trackingNumber: isManualCourier ? manualTracking : undefined,
        manualDeliveryNotes: manualNotes || undefined,
      });

      if (res.data?.success) {
        toast.success(res.data.message || "تم إنشاء الشحنة بنجاح");
        if (onOrderUpdated) onOrderUpdated();
      } else {
        toast.error(res.data?.error || "تعذر إنشاء الشحنة");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "حدث خطأ أثناء إنشاء الشحنة");
    } finally {
      setLoading(false);
    }
  };

  // Sync Live Status
  const handleSyncStatus = async () => {
    if (!shipment?.id) {
      // Fallback for Turbo legacy if no shipment entity exists
      if (order?.turboTrackingNumber) {
        try {
          setSyncing(true);
          const res = await apiClient.post(`/turbo/sync-status/${order.id}`);
          if (res.data?.success) {
            toast.success("تمت مزامنة حالة شحنة تربو");
            if (onOrderUpdated) onOrderUpdated();
          }
        } catch {
          toast.error("فشلت المزامنة مع شركة الشحن");
        } finally {
          setSyncing(false);
        }
        return;
      }
      toast.error("لا توجد شحنة مسجلة للمزامنة");
      return;
    }

    setSyncing(true);
    try {
      const res = await apiClient.post(`/shipments/${shipment.id}/sync`);
      if (res.data?.success) {
        toast.success(res.data.message || "تمت مزامنة حالة الشحنة بنجاح");
        if (onOrderUpdated) onOrderUpdated();
      } else {
        toast.error(res.data?.error || "فشلت المزامنة");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "تعذر مزامنة الشحنة");
    } finally {
      setSyncing(false);
    }
  };

  // Cancel Shipment
  const handleCancelShipment = async () => {
    setCancelling(true);
    try {
      if (shipment?.id) {
        const res = await apiClient.post(`/shipments/${shipment.id}/cancel`, {
          reason: cancelReason,
        });
        if (res.data?.success) {
          toast.success("تم إلغاء الشحنة بنجاح");
          setShowCancelModal(false);
          if (onOrderUpdated) onOrderUpdated();
          return;
        }
      } else if (order?.turboTrackingNumber) {
        const res = await apiClient.post(`/turbo/cancel-shipment/${order.id}`, {
          reason: cancelReason,
        });
        if (res.data?.success) {
          toast.success("تم إلغاء شحنة تربو بنجاح");
          setShowCancelModal(false);
          if (onOrderUpdated) onOrderUpdated();
          return;
        }
      }
      toast.error("تعذر إلغاء الشحنة");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل إلغاء الشحنة");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <TruckIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
              إدارة الشحن والتوصيل
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              ربط ومتابعة شحنة الطلب مع أي شركة شحن أو مندوب
            </p>
          </div>
        </div>

        {existingTracking && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            {shipmentStatus}
          </span>
        )}
      </div>

      {/* Case 1: Order already has a shipment */}
      {existingTracking ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-50 dark:bg-gray-900/60 rounded-lg border border-gray-100 dark:border-gray-700/60">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">شركة الشحن</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                {existingCarrierName}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">رقم التتبع (AWB)</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {existingTracking}
                </span>
                <button
                  type="button"
                  onClick={copyTracking}
                  className="text-gray-400 hover:text-gray-600 p-0.5"
                  title="نسخ"
                >
                  <ClipboardDocumentIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">قيمة التحصيل (COD)</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
                {formatPrice(order?.total || 0)}
              </p>
            </div>
          </div>

          {/* Action Buttons for active shipment */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSyncStatus}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <ArrowPathIcon className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              <span>مزامنة الحالة</span>
            </button>

            {shipment?.labelUrl && (
              <a
                href={shipment.labelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition"
              >
                <PrinterIcon className="h-3.5 w-3.5" />
                <span>طباعة البوليصة AWB</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 border border-rose-200 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/30 transition"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
              <span>إلغاء الشحنة</span>
            </button>
          </div>
        </div>
      ) : (
        /* Case 2: Order NOT shipped yet - Select courier and dispatch */
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-xs font-medium text-gray-700 dark:text-gray-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="courierMode"
                checked={!isManualCourier}
                onChange={() => setIsManualCourier(false)}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <span>شحن آلي عبر الربط (API Courier)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="courierMode"
                checked={isManualCourier}
                onChange={() => setIsManualCourier(true)}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <span>شحن يدوي / مندوب خاص</span>
            </label>
          </div>

          {!isManualCourier ? (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                اختر شركة الشحن
              </label>
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.integrationMode ? `(${c.integrationMode})` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  رقم البوليصة أو التتبع (اختياري)
                </label>
                <input
                  type="text"
                  placeholder="مثال: EXP-982341"
                  value={manualTracking}
                  onChange={(e) => setManualTracking(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  اسم المندوب أو ملاحظات التسليم
                </label>
                <input
                  type="text"
                  placeholder="اسم المندوب ورقم هاتفه"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleCreateShipment}
              disabled={loading || (!isManualCourier && !selectedCompanyId)}
              className="w-full sm:w-auto px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-2"
            >
              <TruckIcon className="h-4 w-4" />
              <span>{loading ? "جاري إنشاء الشحنة..." : "إنشاء الشحنة وتسليم للشركة"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <h4 className="text-base font-bold text-gray-900 dark:text-white">
              تأكيد إلغاء الشحنة
            </h4>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              سيتم إرسال طلب إلغاء لشركة الشحن وتغيير حالة الشحنة إلى ملغية.
            </p>
            <input
              type="text"
              placeholder="سبب الإلغاء (اختياري)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                رجوع
              </button>
              <button
                type="button"
                onClick={handleCancelShipment}
                disabled={cancelling}
                className="px-4 py-2 text-xs font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700"
              >
                {cancelling ? "جاري الإلغاء..." : "تأكيد الإلغاء"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedShippingCard;
