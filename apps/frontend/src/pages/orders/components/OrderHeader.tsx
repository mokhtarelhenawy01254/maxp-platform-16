import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ShoppingBagIcon,
  PencilIcon,
  PrinterIcon,
  TruckIcon,
  TicketIcon,
  ArrowPathRoundedSquareIcon,
  CreditCardIcon,
  ArrowsRightLeftIcon,
  CalendarDaysIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { WhatsAppIcon } from "../../../components/icons/brands";
import { useDateFormat } from "../../../hooks/useDateFormat";
import { getOrderStatusDisplay, getTurboStatusDisplay } from "../../../utils/statusRegistry";
import { OrderDetailsType } from "../types";
import { getOrderReturnDetails } from "../utils/returnHelper";

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
  onOpenTicket?: () => void;
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
  whatsappChatUrl?: string | null;
  canUpdatePaymentStatus?: boolean;
  onUpdatePayment?: () => void;
  canPostponeOrder?: boolean;
  onPostponeOrder?: () => void;
  canPartialDelivery?: boolean;
  onPartialDelivery?: () => void;
  showLateCancellationButton?: boolean;
  onCancelRequest?: () => void;
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
  onOpenTicket,
  canEditOrder = true,
  canPrintPreparationSlip = true,
  canUpdateStatus = true,
  currentStatusConfig,
  statusOptions = [],
  onStatusSelect,
  whatsappChatUrl,
  canUpdatePaymentStatus = false,
  onUpdatePayment,
  canPostponeOrder = false,
  onPostponeOrder,
  canPartialDelivery = false,
  onPartialDelivery,
  showLateCancellationButton = false,
  onCancelRequest,
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
    <div className="mb-4 sm:mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
      <div className="flex items-start sm:items-center min-w-0">
        <button
          onClick={onBack}
          className="me-2.5 sm:me-4 p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition shrink-0"
          aria-label={t("common.back", { defaultValue: "رجوع" })}
        >
          <ArrowLeftIcon className="h-5 w-5 sm:h-6 sm:w-6 rtl:rotate-180" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex flex-wrap items-center gap-1.5 sm:gap-2 leading-tight">
            <ShoppingBagIcon className="h-5 w-5 sm:h-7 sm:w-7 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>{t("orderDetails.titlePrefix", { defaultValue: "تفاصيل الطلب" })}</span>
            <span dir="ltr" className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
              #{String(order.orderNumber || "").startsWith("cart_")
                ? `INC-${String(order.orderNumber).replace(/^cart_/, "").slice(0, 8).toUpperCase()}`
                : order.orderNumber}
            </span>
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <p className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {t("orderDetails.createdAt", {
                date: formatDateTime(order.createdAt),
              })}
            </p>
            {currentStatusConfig && (
              <div className="flex flex-wrap items-center gap-1.5">
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
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm font-medium transition hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-default"
                    style={statusStyles}
                  >
                    <span>
                      {(() => {
                        // 🛡️ (custom-status-persist): الحالات المخصصة — الاسم المعرّف
                        // من إعداد الشركة بدل الكود الخام من fallback الـ registry.
                        const display = getOrderStatusDisplay(order);
                        if (!display.primary.labelKey && currentStatusConfig?.name) {
                          return currentStatusConfig.name;
                        }
                        return t(display.primary.labelKey) || display.primary.label;
                      })()}
                    </span>
                    {canQuickSelectStatus && (
                      <ChevronDownIcon
                        className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform ${
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

                {/* Prominent Return Status & Reason Pill */}
                {(() => {
                  const returnDetails = getOrderReturnDetails(order);
                  if (!returnDetails?.isReturned) return null;
                  return (
                    <div
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800 shadow-2xs"
                      title={returnDetails.reason ? `سبب المرتجع: ${returnDetails.reason}` : "طلب مرتجع"}
                    >
                      <ArrowPathRoundedSquareIcon className="h-3.5 w-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                      <span>{returnDetails.returnTypeLabel}</span>
                      {returnDetails.reason && (
                        <span className="max-w-[160px] sm:max-w-[320px] truncate font-semibold border-r border-rose-300 dark:border-rose-700 pr-1.5 mr-0.5 text-rose-950 dark:text-rose-100">
                          {returnDetails.reason}
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* Courier / Shipping Status Badge */}
                {(() => {
                  if (order.turboShipmentStatus) {
                    const turboInfo = getTurboStatusDisplay(order.turboShipmentStatus);
                    return (
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs font-medium ${turboInfo.colorClass}`}>
                        <TruckIcon className="h-3.5 w-3.5 shrink-0" />
                        <span>{turboInfo.label}</span>
                      </span>
                    );
                  }

                  const firstShipment = (order as any).shipment || (Array.isArray((order as any).shipments) && (order as any).shipments[0]);
                  const carrier = (order as any).carrierType || (order as any).shippingCarrier || firstShipment?.carrierType;
                  const trackingNumber = (order as any).trackingNumber || firstShipment?.trackingNumber || (order as any).metadata?.trackingNumber;
                  const sStatus = firstShipment?.status || (order as any).shipmentStatus;

                  if (carrier === "QP_EXPRESS" || (order as any).metadata?.qpExpress || (trackingNumber && String(trackingNumber).startsWith("22"))) {
                    const isDelivered = sStatus === "DELIVERED";
                    const isReturned = sStatus === "RETURNED" || sStatus === "CANCELLED";
                    return (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs font-medium border ${
                          isDelivered
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                            : isReturned
                            ? "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                            : "bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800"
                        }`}
                      >
                        <TruckIcon className="h-3.5 w-3.5 shrink-0" />
                        <span>كيو بي (QP): {isDelivered ? "تم التسليم" : isReturned ? "مرتجع / ملغي" : `بوليصة #${trackingNumber || ""}`}</span>
                      </span>
                    );
                  }

                  if (carrier === "BOSTA" || firstShipment?.carrierType === "BOSTA") {
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs font-medium bg-orange-50 text-orange-800 border border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800">
                        <TruckIcon className="h-3.5 w-3.5 shrink-0" />
                        <span>بوستا: {sStatus === "DELIVERED" ? "تم التسليم" : `بوليصة #${trackingNumber || ""}`}</span>
                      </span>
                    );
                  }

                  if (firstShipment && trackingNumber) {
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                        <TruckIcon className="h-3.5 w-3.5 shrink-0" />
                        <span>الشحنة: #{trackingNumber}</span>
                      </span>
                    );
                  }

                  return null;
                })()}

                {/* Payment Status Pill */}
                {(() => {
                  const pStatus = String(order.paymentStatus || "").toUpperCase();
                  const isPaid = pStatus === "COMPLETED";
                  const isFailed = pStatus === "FAILED";
                  const hasKashier = Boolean(order.kashierPayment || (order.metadata as any)?.kashierPayment);
                  const isCod = !hasKashier && (order.paymentMethod === "COD" || !order.paymentMethod || String(order.paymentMethod).toLowerCase() === "cash_on_delivery");

                  return (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 sm:px-2.5 sm:py-1 text-xs font-semibold ${
                        isPaid
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                          : isFailed
                          ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                      }`}
                    >
                      <CreditCardIcon className="h-3.5 w-3.5 shrink-0" />
                      <span>{isPaid ? "مدفوع بالكامل" : isFailed ? "فشل الدفع" : isCod ? "دفع عند الاستلام (COD)" : "بانتظار الدفع"}</span>
                      {hasKashier && <span className="opacity-75 font-normal">(كاشير)</span>}
                    </span>
                  );
                })()}

                {/* Conversation Source Badge */}
                {order.conversationId && (
                  <Link
                    to={
                      order.conversation?.channel === "WHATSAPP" || (order as any).sourceType?.includes("whatsapp")
                        ? `/whatsapp?conversationId=${order.conversationId}`
                        : `/facebook-inbox?conversation=${order.conversationId}`
                    }
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 hover:border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 transition active:scale-97 shadow-2xs"
                    title="الطلب مرتبط بمحادثة - اضغط لفتح المحادثة"
                  >
                    <span>💬</span>
                    <span>جاي من محادثة</span>
                    <span className="text-[10px] opacity-75 font-mono">↗</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unified Action Toolbar */}
      <div className="w-full lg:w-auto mt-1 lg:mt-0">
        {!isEditing ? (
          <div className="no-scrollbar flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
            {canEditOrder && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 border border-blue-500/40 text-xs sm:text-sm font-semibold rounded-lg text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/30 hover:bg-blue-100/80 dark:hover:bg-blue-900/40 whitespace-nowrap shrink-0 transition active:scale-97 shadow-2xs"
              >
                <PencilIcon className="h-4 w-4 shrink-0" />
                <span>{t("orderDetails.editOrder")}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onPrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 border border-gray-300 dark:border-gray-600 text-xs sm:text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap shrink-0 transition active:scale-97 shadow-2xs"
            >
              <PrinterIcon className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <span>
                <span className="hidden sm:inline">طباعة </span>
                <span>{t("orderDetails.invoice", { defaultValue: "الفاتورة" })}</span>
              </span>
            </button>

            {canPrintPreparationSlip && (
              <button
                type="button"
                onClick={onPrintPreparationSlip}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 border border-emerald-300 dark:border-emerald-700 text-xs sm:text-sm font-medium rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/40 whitespace-nowrap shrink-0 transition active:scale-97 shadow-2xs"
              >
                <PrinterIcon className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  <span className="hidden sm:inline">طباعة </span>
                  <span>{t("orderDetails.preparationSlip", { defaultValue: "ورقة التجهيز" })}</span>
                </span>
              </button>
            )}

            {canUpdatePaymentStatus && onUpdatePayment && (
              <button
                type="button"
                onClick={onUpdatePayment}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 border border-gray-300 dark:border-gray-600 text-xs sm:text-sm font-medium rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap shrink-0 transition active:scale-97 shadow-2xs"
              >
                <CreditCardIcon className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
                <span>{t("orderDetails.updatePayment")}</span>
              </button>
            )}

            {canPostponeOrder && onPostponeOrder && (
              <button
                type="button"
                onClick={onPostponeOrder}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 border border-orange-300 dark:border-orange-700/70 text-xs sm:text-sm font-medium rounded-lg text-orange-700 dark:text-orange-300 bg-orange-50/70 dark:bg-orange-950/30 hover:bg-orange-100/80 dark:hover:bg-orange-900/40 whitespace-nowrap shrink-0 transition active:scale-97 shadow-2xs"
              >
                <CalendarDaysIcon className="h-4 w-4 shrink-0 text-orange-600 dark:text-orange-400" />
                <span>{t("orderDetails.postponeOrder")}</span>
              </button>
            )}

            {canPartialDelivery && onPartialDelivery && (
              <button
                type="button"
                onClick={onPartialDelivery}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 border border-indigo-300 dark:border-indigo-700/70 text-xs sm:text-sm font-medium rounded-lg text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/30 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/40 whitespace-nowrap shrink-0 transition active:scale-97 shadow-2xs"
              >
                <TruckIcon className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <span>{t("orderDetails.partialDelivery")}</span>
              </button>
            )}

            {onOpenTicket && (
              <button
                type="button"
                onClick={onOpenTicket}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 border border-amber-300 dark:border-amber-700/70 text-xs sm:text-sm font-medium rounded-lg text-amber-800 dark:text-amber-200 bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100/80 dark:hover:bg-amber-900/40 whitespace-nowrap shrink-0 transition active:scale-97 shadow-2xs"
                title="فتح أو متابعة تذاكر الدعم لهذا الطلب"
              >
                <TicketIcon className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>{t("orderDetails.supportTickets", { defaultValue: "تذاكر الدعم" })}</span>
              </button>
            )}

            {whatsappChatUrl && (
              <Link
                to={whatsappChatUrl}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 border border-emerald-300 dark:border-emerald-700/70 text-xs sm:text-sm font-medium rounded-lg text-emerald-800 dark:text-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/40 whitespace-nowrap shrink-0 transition active:scale-97 shadow-2xs"
                title="فتح محادثة العميل على واتساب المنصة"
              >
                <WhatsAppIcon className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{t("orderDetails.whatsapp", { defaultValue: "واتساب المنصة" })}</span>
              </Link>
            )}

            {["DELIVERED", "PARTIALLY_DELIVERED", "SHIPPED"].includes(String(order.status || "").toUpperCase()) && (
              <Link
                to={`/orders/manual?exchangeOrderNumber=${encodeURIComponent(order.orderNumber)}&phone=${encodeURIComponent(order.customerPhone || "")}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 border border-blue-300 dark:border-blue-700/70 text-xs sm:text-sm font-medium rounded-lg text-blue-800 dark:text-blue-200 bg-blue-50/70 dark:bg-blue-950/30 hover:bg-blue-100/80 dark:hover:bg-blue-900/40 whitespace-nowrap shrink-0 transition active:scale-97 shadow-2xs"
                title="إنشاء طلب استبدال مبني على هذا الطلب"
              >
                <ArrowsRightLeftIcon className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <span>{t("orderDetails.exchangeOrder", { defaultValue: "طلب استبدال" })}</span>
              </Link>
            )}

            {showLateCancellationButton && onCancelRequest && (
              <button
                type="button"
                onClick={onCancelRequest}
                disabled={updating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 border border-rose-300 dark:border-rose-700/70 text-xs sm:text-sm font-medium rounded-lg text-rose-700 dark:text-rose-300 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100/80 dark:hover:bg-rose-900/40 whitespace-nowrap shrink-0 transition active:scale-97 shadow-2xs disabled:opacity-50"
              >
                <XCircleIcon className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{t("orderDetails.cancelOrderRequest")}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={updating}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-transparent text-xs sm:text-sm font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 whitespace-nowrap shrink-0 transition active:scale-97 shadow-sm disabled:opacity-50"
            >
              <CheckIcon className="h-4 w-4 shrink-0" />
              <span>{updating ? t("orderDetails.saving") : t("orderDetails.saveChanges")}</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={updating}
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 dark:border-gray-600 text-xs sm:text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap shrink-0 transition active:scale-97 disabled:opacity-50"
            >
              <span>{t("orderDetails.cancel")}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHeader;
