import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ShoppingBagIcon,
  PencilIcon,
  PrinterIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { useDateFormat } from "../../../hooks/useDateFormat";
import { OrderDetailsType } from "../types";

interface StatusOption {
  code: string;
  name: string;
  color?: string;
  icon?: string;
}

interface OrderHeaderProps {
  order: OrderDetailsType;
  isEditing: boolean;
  updating: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onPrint: () => void;
  onPrintPreparationSlip: () => void;
  onBack: () => void;
  canEditOrder?: boolean;
  canPrintPreparationSlip?: boolean;
  canUpdateStatus?: boolean;
  currentStatusConfig?: {
    code: string;
    name: string;
    color?: string;
    icon?: string;
  } | null;
  statusOptions?: StatusOption[];
  onStatusSelect?: (statusCode: string) => void;
}

const OrderHeader: React.FC<OrderHeaderProps> = ({
  order,
  isEditing,
  updating,
  onEdit,
  onCancel,
  onSave,
  onPrint,
  onPrintPreparationSlip,
  onBack,
  canEditOrder = true,
  canPrintPreparationSlip = true,
  canUpdateStatus = true,
  currentStatusConfig,
  statusOptions = [],
  onStatusSelect,
}) => {
  const { t } = useTranslation();
  const { formatDate, formatDateTime } = useDateFormat();
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const statusStyles = {
    backgroundColor: currentStatusConfig?.color
      ? `${currentStatusConfig.color}20`
      : "#f3f4f6",
    color: currentStatusConfig?.color || "#374151",
    border: `1px solid ${currentStatusConfig?.color || "#d1d5db"}`,
  };
  const canQuickSelectStatus =
    canUpdateStatus &&
    Boolean(onStatusSelect) &&
    statusOptions.length > 0 &&
    !isEditing &&
    !updating;

  useEffect(() => {
    if (!isStatusMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        statusMenuRef.current &&
        !statusMenuRef.current.contains(event.target as Node)
      ) {
        setIsStatusMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsStatusMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isStatusMenuOpen]);

  useEffect(() => {
    if (isEditing || updating) {
      setIsStatusMenuOpen(false);
    }
  }, [isEditing, updating]);

  const handleStatusBadgeClick = () => {
    if (!canQuickSelectStatus) return;
    setIsStatusMenuOpen((prev) => !prev);
  };

  const handleStatusSelect = (statusCode: string) => {
    setIsStatusMenuOpen(false);
    if (!onStatusSelect || statusCode === currentStatusConfig?.code) return;
    onStatusSelect(statusCode);
  };

  return (
    <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center">
        <button
          onClick={onBack}
          className="ml-4 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <ArrowLeftIcon className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <ShoppingBagIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 ml-3" />
            {t("orderDetails.orderDetailsTitle", {
              orderNumber: order.orderNumber,
            })}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-gray-600 dark:text-gray-400">
              {t("orderDetails.createdAt", {
                date: formatDateTime(order.createdAt),
              })}
            </p>
            {currentStatusConfig && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative" ref={statusMenuRef}>
                  <button
                    type="button"
                    onClick={handleStatusBadgeClick}
                    disabled={!canQuickSelectStatus}
                    title={
                      canQuickSelectStatus
                        ? t("orderDetails.updateStatus").toString()
                        : undefined
                    }
                    aria-haspopup={canQuickSelectStatus ? "menu" : undefined}
                    aria-expanded={canQuickSelectStatus ? isStatusMenuOpen : undefined}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium transition hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-default"
                    style={statusStyles}
                  >
                    <span>
                      {order.turboShipmentStatus ? (
                        `🚚 شحن تربو: ${
                          ({
                            turbo_saved: 'محفوظة قبل الشحن (كود 1)',
                            turbo_sent: 'مرسلة للشحن (كود 2)',
                            processing: 'قيد التنفيذ بالفرع (كود 3)',
                            out_for_delivery: 'مسلمة للمندوب (كود 4)',
                            returned_to_company: 'مرتجعات بالشركة (كود 5)',
                            cancelled: 'ملغي من الشحن (كود 6)',
                            delivered: 'تم التسليم (كود 7)',
                            remitted: 'تم التوريد وتحصيل المبلغ (كود 8)',
                            archived: 'شحنة محذوفة (كود 9)',
                            returned_resent: 'معاد إرسالها (كود 10)',
                            returned_missing: 'مرتجع مفقود (كود 11)',
                            returned_destroyed: 'مرتجع معدوم (كود 12)',
                            delayed: 'مؤجلة مع المندوب (كود 13)'
                          } as Record<string, string>)[order.turboShipmentStatus.toLowerCase()] || order.turboShipmentStatus
                        }`
                      ) : (
                        t("orderDetails.statusLabel", {
                          status: currentStatusConfig.name,
                        })
                      )}
                    </span>
                    {canQuickSelectStatus && (
                      <ChevronDownIcon
                        className={`h-4 w-4 transition-transform ${
                          isStatusMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </button>

                  {canQuickSelectStatus && isStatusMenuOpen && (
                    <div className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
                      <div className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200">
                        اختاري الحالة
                      </div>
                      <div className="max-h-72 overflow-y-auto py-2">
                        {statusOptions.map((status) => {
                          const isCurrent = status.code === currentStatusConfig.code;

                          return (
                            <button
                              key={status.code}
                              type="button"
                              onClick={() => handleStatusSelect(status.code)}
                              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-right transition hover:bg-gray-50 dark:hover:bg-gray-700/60"
                            >
                              <span className="flex min-w-0 items-center gap-3">
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{
                                    backgroundColor: status.color || "#9CA3AF",
                                  }}
                                />
                                <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                                  {status.name}
                                </span>
                              </span>
                              {isCurrent && (
                                <CheckIcon className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        {!isEditing ? (
          <>
            {canEditOrder && (
              <button
                onClick={onEdit}
                className="inline-flex items-center px-4 py-2 border border-blue-600 dark:border-blue-500 text-sm font-medium rounded-lg text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <PencilIcon className="h-4 w-4 ml-2" />
                {t("orderDetails.editOrder")}
              </button>
            )}
            <button
              onClick={onPrint}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <PrinterIcon className="h-4 w-4 ml-2" />
              {t("orderDetails.printInvoice")}
            </button>
            {canPrintPreparationSlip && (
              <button
                onClick={onPrintPreparationSlip}
                className="inline-flex items-center px-4 py-2 border border-green-300 dark:border-green-600 text-sm font-medium rounded-lg text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
              >
                <PrinterIcon className="h-4 w-4 ml-2" />
                طباعة ورقة التجهيز
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={onSave}
              disabled={updating}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600"
            >
              {updating
                ? t("orderDetails.saving")
                : t("orderDetails.saveChanges")}
            </button>
            <button
              onClick={onCancel}
              disabled={updating}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t("orderDetails.cancel")}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OrderHeader;
