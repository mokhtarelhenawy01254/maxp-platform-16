import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Check,
  Pencil,
  Printer,
  CreditCard,
  Calendar,
  Truck,
  Ticket,
  ArrowLeftRight,
  XCircle,
} from "lucide-react";
import { WhatsAppIcon } from "../../../../components/icons/brands";
import type { OrderDetailsType } from "../../types";

export interface OrderHeaderActionsProps {
  order: OrderDetailsType;
  isEditing: boolean;
  updating: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onPrint: () => void;
  onPrintPreparationSlip: () => void;
  onOpenTicket?: () => void;
  canEditOrder?: boolean;
  canPrintPreparationSlip?: boolean;
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

export const OrderHeaderActions: React.FC<OrderHeaderActionsProps> = ({
  order,
  isEditing,
  updating,
  onEdit,
  onCancel,
  onSave,
  onPrint,
  onPrintPreparationSlip,
  onOpenTicket,
  canEditOrder = true,
  canPrintPreparationSlip = true,
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

  return (
    <div className="w-full lg:w-auto mt-1 lg:mt-0">
      {!isEditing ? (
        <div className="no-scrollbar flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
          {canEditOrder && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-2 border border-primary/30 text-xs sm:text-sm font-semibold rounded-xl text-primary bg-primary/10 hover:bg-primary/20 whitespace-nowrap shrink-0 transition active:scale-97 shadow-xs"
            >
              <Pencil className="h-4 w-4 shrink-0" />
              <span>{t("orderDetails.editOrder")}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-2 border border-border/70 text-xs sm:text-sm font-medium rounded-xl text-foreground bg-card hover:bg-muted whitespace-nowrap shrink-0 transition active:scale-97 shadow-xs"
          >
            <Printer className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>
              <span className="hidden sm:inline">طباعة </span>
              <span>
                {t("orderDetails.invoice", { defaultValue: "الفاتورة" })}
              </span>
            </span>
          </button>

          {canPrintPreparationSlip && (
            <button
              type="button"
              onClick={onPrintPreparationSlip}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-2 border border-emerald-500/30 text-xs sm:text-sm font-medium rounded-xl text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 whitespace-nowrap shrink-0 transition active:scale-97 shadow-xs"
            >
              <Printer className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                <span className="hidden sm:inline">طباعة </span>
                <span>
                  {t("orderDetails.preparationSlip", {
                    defaultValue: "ورقة التجهيز",
                  })}
                </span>
              </span>
            </button>
          )}

          {canUpdatePaymentStatus && onUpdatePayment && (
            <button
              type="button"
              onClick={onUpdatePayment}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-2 border border-border/70 text-xs sm:text-sm font-medium rounded-xl text-foreground bg-card hover:bg-muted whitespace-nowrap shrink-0 transition active:scale-97 shadow-xs"
            >
              <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{t("orderDetails.updatePayment")}</span>
            </button>
          )}

          {canPostponeOrder && onPostponeOrder && (
            <button
              type="button"
              onClick={onPostponeOrder}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-2 border border-amber-500/30 text-xs sm:text-sm font-medium rounded-xl text-amber-700 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 whitespace-nowrap shrink-0 transition active:scale-97 shadow-xs"
            >
              <Calendar className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{t("orderDetails.postponeOrder")}</span>
            </button>
          )}

          {canPartialDelivery && onPartialDelivery && (
            <button
              type="button"
              onClick={onPartialDelivery}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-2 border border-primary/30 text-xs sm:text-sm font-medium rounded-xl text-primary bg-primary/10 hover:bg-primary/20 whitespace-nowrap shrink-0 transition active:scale-97 shadow-xs"
            >
              <Truck className="h-4 w-4 shrink-0 text-primary" />
              <span>{t("orderDetails.partialDelivery")}</span>
            </button>
          )}

          {onOpenTicket && (
            <button
              type="button"
              onClick={onOpenTicket}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-2 border border-amber-500/30 text-xs sm:text-sm font-medium rounded-xl text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 whitespace-nowrap shrink-0 transition active:scale-97 shadow-xs"
              title="فتح أو متابعة تذاكر الدعم لهذا الطلب"
            >
              <Ticket className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                {t("orderDetails.supportTickets", {
                  defaultValue: "تذاكر الدعم",
                })}
              </span>
            </button>
          )}

          {whatsappChatUrl && (
            <Link
              to={whatsappChatUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-2 border border-emerald-500/30 text-xs sm:text-sm font-medium rounded-xl text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 whitespace-nowrap shrink-0 transition active:scale-97 shadow-xs"
              title="فتح محادثة العميل على واتساب المنصة"
            >
              <WhatsAppIcon className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                {t("orderDetails.whatsapp", {
                  defaultValue: "واتساب المنصة",
                })}
              </span>
            </Link>
          )}

          {["DELIVERED", "PARTIALLY_DELIVERED", "SHIPPED"].includes(
            String(order.status || "").toUpperCase()
          ) && (
            <Link
              to={`/orders/manual?exchangeOrderNumber=${encodeURIComponent(
                order.orderNumber
              )}&phone=${encodeURIComponent(order.customerPhone || "")}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-2 border border-blue-500/30 text-xs sm:text-sm font-medium rounded-xl text-blue-700 dark:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 whitespace-nowrap shrink-0 transition active:scale-97 shadow-xs"
              title="إنشاء طلب استبدال مبني على هذا الطلب"
            >
              <ArrowLeftRight className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>
                {t("orderDetails.exchangeOrder", {
                  defaultValue: "طلب استبدال",
                })}
              </span>
            </Link>
          )}

          {showLateCancellationButton && onCancelRequest && (
            <button
              type="button"
              onClick={onCancelRequest}
              disabled={updating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3 sm:py-2 border border-destructive/30 text-xs sm:text-sm font-medium rounded-xl text-destructive bg-destructive/10 hover:bg-destructive/20 whitespace-nowrap shrink-0 transition active:scale-97 shadow-xs disabled:opacity-50"
            >
              <XCircle className="h-4 w-4 shrink-0 text-destructive" />
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
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-transparent text-xs sm:text-sm font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 whitespace-nowrap shrink-0 transition active:scale-97 shadow-xs disabled:opacity-50"
          >
            <Check className="h-4 w-4 shrink-0" />
            <span>
              {updating
                ? t("orderDetails.saving")
                : t("orderDetails.saveChanges")}
            </span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={updating}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-border/70 text-xs sm:text-sm font-medium rounded-xl text-foreground bg-card hover:bg-muted whitespace-nowrap shrink-0 transition active:scale-97 disabled:opacity-50"
          >
            <span>{t("orderDetails.cancel")}</span>
          </button>
        </div>
      )}
    </div>
  );
};
