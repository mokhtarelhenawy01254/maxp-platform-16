import React, { useState } from "react";
import { XMarkIcon, TruckIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { ShippingCompanyRef } from "./CarrierTabsBar";

interface CreateShipmentModalProps {
  companies: ShippingCompanyRef[];
  defaultCompanyId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface OrderOption {
  id: string;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  total: number;
  governorate?: string;
  city?: string;
}

export const CreateShipmentModal: React.FC<CreateShipmentModalProps> = ({
  companies,
  defaultCompanyId,
  onClose,
  onSuccess,
}) => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    defaultCompanyId && defaultCompanyId !== "ALL" ? defaultCompanyId : (companies[0]?.id || "")
  );
  const [orderQuery, setOrderQuery] = useState("");
  const [orderOptions, setOrderOptions] = useState<OrderOption[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderOption | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [manualTracking, setManualTracking] = useState("");
  const [notes, setNotes] = useState("");

  const activeCompany = companies.find((c) => c.id === selectedCompanyId);
  const isLive = activeCompany?.integrationMode === "LIVE" || activeCompany?.providerKey === "TURBO";

  // Search un-shipped orders
  const searchOrders = async (query: string) => {
    if (!query.trim()) return;
    setLoadingOrders(true);
    try {
      const res = await apiClient.get<any>("/orders", {
        params: {
          search: query.trim(),
          limit: 10,
        },
      });
      if (res.data?.success || res.data?.data) {
        const list = res.data.data?.orders || res.data.data || [];
        setOrderOptions(
          list.map((o: any) => ({
            id: o.id,
            orderNumber: o.orderNumber || o.id?.slice(0, 8),
            customerName: o.customerName || (o.customer ? `${o.customer.firstName || ''} ${o.customer.lastName || ''}`.trim() : ''),
            customerPhone: o.customerPhone || o.customer?.phone || '',
            total: Number(o.total || 0),
            governorate: o.governorate || o.shippingAddress?.governorate || '',
            city: o.city || o.shippingAddress?.city || '',
          }))
        );
      }
    } catch (err) {
      console.error("Error searching orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) {
      toast.error("يرجى اختيار الطلب أولاً");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post<any>("/shipments/create", {
        orderId: selectedOrder.id,
        shippingCompanyId: selectedCompanyId || undefined,
        trackingNumber: !isLive && manualTracking ? manualTracking.trim() : undefined,
        manualDeliveryNotes: notes ? notes.trim() : undefined,
      });

      if (res.data?.success) {
        toast.success(res.data.message || "تم إنشاء وتوجيه الشحنة بنجاح");
        onSuccess();
        onClose();
      } else {
        toast.error(res.data?.error || "تعذر إنشاء الشحنة");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "حدث خطأ أثناء إنشاء الشحنة");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <TruckIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                إضافة وتوجيه شحنة جديدة
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                إرسال الطلب لشركة الشحن واستخراج بوليصة الشحن (AWB)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreate} className="p-5 space-y-4 overflow-y-auto">
          {/* Company Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              شركة الشحن المستهدفة
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.integrationMode === "LIVE" ? "ربط مباشر API" : "شحن يدوي"})
                </option>
              ))}
            </select>
          </div>

          {/* Order Search & Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              اختر الطلب
            </label>
            {!selectedOrder ? (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    value={orderQuery}
                    onChange={(e) => {
                      setOrderQuery(e.target.value);
                      searchOrders(e.target.value);
                    }}
                    placeholder="ابحث برقم الطلب أو اسم العميل أو الهاتف..."
                    className="w-full pr-9 pl-3 py-2 text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
                  />
                  <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>

                {/* Search Results Dropdown */}
                {loadingOrders ? (
                  <p className="text-xs text-gray-400 py-2 text-center">جاري البحث...</p>
                ) : (
                  orderOptions.length > 0 && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl divide-y divide-gray-100 dark:divide-gray-800 max-h-40 overflow-y-auto">
                      {orderOptions.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => setSelectedOrder(o)}
                          className="w-full p-2.5 text-right hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              #{o.orderNumber}
                            </span>{" "}
                            - <span>{o.customerName || "عميل"}</span>
                            <span className="text-gray-400 mr-2">({o.customerPhone})</span>
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {o.total} ج.م
                          </span>
                        </button>
                      ))}
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-emerald-900 dark:text-emerald-200">
                    طلب #{selectedOrder.orderNumber}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 mt-0.5">
                    العميل: {selectedOrder.customerName} ({selectedOrder.customerPhone})
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">
                    الوجهة: {selectedOrder.governorate} {selectedOrder.city} • المبلغ: {selectedOrder.total} ج.م
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="text-xs text-rose-600 hover:underline font-medium"
                >
                  تغيير الطلب
                </button>
              </div>
            )}
          </div>

          {/* Manual Tracking Number if not LIVE API */}
          {!isLive && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                رقم بوليصة الشحن (AWB) اليدوي
              </label>
              <input
                type="text"
                value={manualTracking}
                onChange={(e) => setManualTracking(e.target.value)}
                placeholder="أدخل رقم البوليصة المسجل يدويًا (اختياري)..."
                className="w-full px-3 py-2 text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white font-mono"
              />
            </div>
          )}

          {/* Delivery Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              ملاحظات وتعليمات للمندوب
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: يرجى الاتصال قبل الوصول، مسموح بفتح المعاينة..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
            />
          </div>

          {/* Submit Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedOrder}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm transition active:scale-95 flex items-center gap-1.5"
            >
              <TruckIcon className="h-4 w-4" />
              <span>{submitting ? "جاري الإرسال..." : "إرسال وتوجيه الشحنة"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
