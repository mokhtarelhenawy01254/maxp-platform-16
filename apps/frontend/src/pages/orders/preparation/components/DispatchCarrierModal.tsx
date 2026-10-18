import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  TruckIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import OrderModal from "../../../../components/common/OrderModal";

export interface ActiveCarrier {
  id: string;
  name: string;
  providerKey: string;
  integrationMode?: string;
  isActive?: boolean;
}

interface DispatchCarrierModalProps {
  isOpen: boolean;
  onClose: () => void;
  ordersCount: number;
  carriers: ActiveCarrier[];
  onConfirm: (carrier: ActiveCarrier) => void;
  loading: boolean;
}

export const DispatchCarrierModal: React.FC<DispatchCarrierModalProps> = ({
  isOpen,
  onClose,
  ordersCount,
  carriers,
  onConfirm,
  loading,
}) => {
  const { t } = useTranslation();
  const [selectedCarrierId, setSelectedCarrierId] = useState<string>("");

  useEffect(() => {
    if (isOpen && carriers.length > 0) {
      if (!selectedCarrierId || !carriers.some((c) => c.id === selectedCarrierId)) {
        setSelectedCarrierId(carriers[0].id);
      }
    }
  }, [isOpen, carriers, selectedCarrierId]);

  const selectedCarrier = carriers.find((c) => c.id === selectedCarrierId) || carriers[0];

  const handleConfirm = () => {
    if (selectedCarrier) {
      onConfirm(selectedCarrier);
    }
  };

  return (
    <OrderModal
      isOpen={isOpen}
      onClose={onClose}
      title="شحن وتجهيز الطلبات"
      subtitle={`إرسال ${ordersCount} طلب إلى شركة الشحن`}
      size="md"
    >
      <div className="space-y-4 py-2">
        {carriers.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-800 dark:bg-amber-950/40">
            <ExclamationCircleIcon className="mx-auto h-10 w-10 text-amber-500 mb-2" />
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              لا توجد شركة شحن مفعلة حالياً
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 mb-3">
              لتتمكن من إرسال الشحنات مباشرة، يرجى تفعيل إحدى شركات الشحن (مثل كيو بي إكسبريس، بوسطة، أو تربو) من مركز شركات الشحن.
            </p>
            <Link
              to="/shipping-companies"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition shadow-sm"
            >
              <TruckIcon className="h-4 w-4" />
              <span>الانتقال إلى مركز شركات الشحن</span>
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              اختر شركة الشحن التي ترغب في توجيه وإصدار بوالص الـ ({ordersCount}) طلب المحددة من خلالها:
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {carriers.map((carrier) => {
                const isSelected = carrier.id === selectedCarrierId;
                return (
                  <label
                    key={carrier.id}
                    onClick={() => setSelectedCarrierId(carrier.id)}
                    className={
                      isSelected
                        ? "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 dark:border-indigo-500 ring-2 ring-indigo-500/20"
                        : "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={
                          isSelected
                            ? "p-2 rounded-lg bg-indigo-600 text-white"
                            : "p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        }
                      >
                        <TruckIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white block">
                          {carrier.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                            {carrier.providerKey}
                          </span>
                          {carrier.integrationMode && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                              {carrier.integrationMode}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <input
                      type="radio"
                      name="dispatch_carrier"
                      checked={isSelected}
                      onChange={() => setSelectedCarrierId(carrier.id)}
                      className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading || !selectedCarrier}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
              >
                {loading ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    <span>جاري إنشاء الشحنات...</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-4 w-4" />
                    <span>تأكيد وشحن عبر {selectedCarrier?.name || "الشركة"}</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </OrderModal>
  );
};

export default DispatchCarrierModal;
