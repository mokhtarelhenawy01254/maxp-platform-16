import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Check,
  ChevronDown,
  Truck,
  RotateCcw,
  CreditCard,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { getOrderStatusDisplay, getTurboStatusDisplay } from "../../../utils/statusRegistry";
import { getOrderReturnDetails } from "../utils/returnHelper";
import type { OrderDetailsType } from "../types";

export interface StatusOption {
  code: string;
  name: string;
  color?: string;
  icon?: string;
}

interface OrderStatusBadgeRailProps {
  order: OrderDetailsType;
  currentStatusConfig?: {
    code: string;
    name: string;
    color?: string;
    icon?: string;
  } | null;
  statusOptions?: StatusOption[];
  onStatusSelect?: (statusCode: string) => void;
  canUpdateStatus?: boolean;
  isEditing?: boolean;
  updating?: boolean;
  isStatusMenuOpen: boolean;
  setIsStatusMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  statusMenuRef: React.RefObject<HTMLDivElement | null>;
  statusStyles: React.CSSProperties;
}

export const OrderStatusBadgeRail: React.FC<OrderStatusBadgeRailProps> = ({
  order,
  currentStatusConfig,
  statusOptions = [],
  onStatusSelect,
  canUpdateStatus = true,
  isEditing = false,
  updating = false,
  isStatusMenuOpen,
  setIsStatusMenuOpen,
  statusMenuRef,
  statusStyles,
}) => {
  const { t } = useTranslation();

  const canQuickSelectStatus =
    canUpdateStatus &&
    Boolean(onStatusSelect) &&
    statusOptions.length > 0 &&
    !isEditing &&
    !updating;

  const handleStatusBadgeClick = () => {
    if (!canQuickSelectStatus) return;
    setIsStatusMenuOpen((prev) => !prev);
  };

  const handleStatusSelect = (statusCode: string) => {
    setIsStatusMenuOpen(false);
    if (!onStatusSelect || statusCode === currentStatusConfig?.code) return;
    onStatusSelect(statusCode);
  };

  const returnDetails = getOrderReturnDetails(order);
  const pStatus = String(order.paymentStatus || "").toUpperCase();
  const isPaid = pStatus === "COMPLETED";
  const isFailed = pStatus === "FAILED";
  const hasKashier = Boolean(order.kashierPayment || (order.metadata as any)?.kashierPayment);
  const isCod =
    !hasKashier &&
    (order.paymentMethod === "COD" ||
      !order.paymentMethod ||
      String(order.paymentMethod).toLowerCase() === "cash_on_delivery");

  const firstShipment =
    (order as any).shipment ||
    (Array.isArray((order as any).shipments) && (order as any).shipments[0]);
  const carrier =
    (order as any).carrierType ||
    (order as any).shippingCarrier ||
    firstShipment?.carrierType;
  const trackingNumber =
    (order as any).trackingNumber ||
    firstShipment?.trackingNumber ||
    (order as any).metadata?.trackingNumber;
  const sStatus = firstShipment?.status || (order as any).shipmentStatus;

  const convId =
    order.conversationId ||
    (order as any).metadata?.conversationId ||
    (order as any).conversation?.id;
  const isWhatsApp =
    order.conversation?.channel === "WHATSAPP" ||
    (order as any).sourceType?.includes("whatsapp") ||
    (order as any).platform === "whatsapp";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* 1. Main Order Status with Dropdown */}
      {currentStatusConfig && (
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
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm font-medium transition hover:shadow-xs focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-default"
            style={statusStyles}
          >
            <span>
              {(() => {
                const display = getOrderStatusDisplay(order);
                if (!display.primary.labelKey && currentStatusConfig?.name) {
                  return currentStatusConfig.name;
                }
                return t(display.primary.labelKey) || display.primary.label;
              })()}
            </span>
            {canQuickSelectStatus && (
              <ChevronDown
                className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform ${
                  isStatusMenuOpen ? "rotate-180" : ""
                }`}
              />
            )}
          </button>

          {canQuickSelectStatus && isStatusMenuOpen && (
            <div className="absolute right-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
              <div className="border-b border-border/70 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                اختاري الحالة
              </div>
              <div className="max-h-72 overflow-y-auto py-1.5">
                {statusOptions.map((status) => {
                  const isCurrent = status.code === currentStatusConfig.code;
                  return (
                    <button
                      key={status.code}
                      type="button"
                      onClick={() => handleStatusSelect(status.code)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-2 text-right transition hover:bg-muted/60"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: status.color || "#9CA3AF",
                          }}
                        />
                        <span className="truncate text-xs sm:text-sm font-medium text-foreground">
                          {status.name}
                        </span>
                      </span>
                      {isCurrent && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Prominent Return Status & Reason Pill */}
      {returnDetails?.isReturned && (
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs font-bold bg-destructive/10 text-destructive border border-destructive/30 shadow-xs"
          title={returnDetails.reason ? `سبب المرتجع: ${returnDetails.reason}` : "طلب مرتجع"}
        >
          <RotateCcw className="h-3.5 w-3.5 shrink-0 text-destructive" />
          <span>{returnDetails.returnTypeLabel}</span>
          {returnDetails.reason && (
            <span className="max-w-[160px] sm:max-w-[320px] truncate font-semibold border-r border-destructive/30 pr-1.5 mr-0.5">
              {returnDetails.reason}
            </span>
          )}
        </div>
      )}

      {/* 3. Courier / Shipping Status Badge */}
      {order.turboShipmentStatus ? (
        (() => {
          const turboInfo = getTurboStatusDisplay(order.turboShipmentStatus);
          return (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs font-medium ${turboInfo.colorClass}`}>
              <Truck className="h-3.5 w-3.5 shrink-0" />
              <span>{turboInfo.label}</span>
            </span>
          );
        })()
      ) : carrier === "QP_EXPRESS" || (order as any).metadata?.qpExpress || (trackingNumber && String(trackingNumber).startsWith("22")) ? (
        (() => {
          const isDelivered = sStatus === "DELIVERED";
          const isReturned = sStatus === "RETURNED" || sStatus === "CANCELLED";
          return (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs font-medium border ${
                isDelivered
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                  : isReturned
                  ? "bg-destructive/10 text-destructive border-destructive/30"
                  : "bg-primary/10 text-primary border-primary/30"
              }`}
            >
              <Truck className="h-3.5 w-3.5 shrink-0" />
              <span>كيو بي (QP): {isDelivered ? "تم التسليم" : isReturned ? "مرتجع / ملغي" : `بوليصة #${trackingNumber || ""}`}</span>
            </span>
          );
        })()
      ) : carrier === "BOSTA" || firstShipment?.carrierType === "BOSTA" ? (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
          <Truck className="h-3.5 w-3.5 shrink-0" />
          <span>بوستا: {sStatus === "DELIVERED" ? "تم التسليم" : `بوليصة #${trackingNumber || ""}`}</span>
        </span>
      ) : firstShipment && trackingNumber ? (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs font-medium bg-muted text-foreground border border-border/70 font-mono tabular-nums">
          <Truck className="h-3.5 w-3.5 shrink-0" />
          <span>الشحنة: #{trackingNumber}</span>
        </span>
      ) : null}

      {/* 4. Payment Status Pill */}
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 sm:px-2.5 sm:py-1 text-xs font-semibold ${
          isPaid
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
            : isFailed
            ? "bg-destructive/10 text-destructive border border-destructive/30"
            : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30"
        }`}
      >
        <CreditCard className="h-3.5 w-3.5 shrink-0" />
        <span>{isPaid ? "مدفوع بالكامل" : isFailed ? "فشل الدفع" : isCod ? "دفع عند الاستلام (COD)" : "بانتظار الدفع"}</span>
        {hasKashier && <span className="opacity-75 font-normal">(كاشير)</span>}
      </span>

      {/* 5. Conversation Source Badge */}
      {Boolean(convId) && (
        <Link
          to={
            isWhatsApp
              ? `/whatsapp?conversationId=${convId}`
              : `/facebook-inbox?conversation=${convId}`
          }
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-xs font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/30 hover:bg-sky-500/20 transition active:scale-97 shadow-xs"
          title="الطلب مرتبط بمحادثة - اضغط لفتح المحادثة"
        >
          <MessageSquare className="h-3 w-3 shrink-0" />
          <span>جاي من محادثة</span>
          <ExternalLink className="h-2.5 w-2.5 opacity-75 shrink-0" />
        </Link>
      )}
    </div>
  );
};
