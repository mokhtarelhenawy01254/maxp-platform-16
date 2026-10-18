import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Copy } from "lucide-react";
import { CustomerRatingBadge } from "../../../../components/orders/CustomerRatingBadge";
import type { Order } from "../../Orders";
import type { OrdersMobileListHelpers } from "../OrdersMobileList";

export interface OrdersMobileCompactItemProps {
  order: Order;
  isSelected: boolean;
  canSelectOrders: boolean;
  rawNumber: string;
  compactOrderNumber: string;
  compactTime: string;
  customerName: string;
  unifiedStatus: {
    text: string;
    labelKey: string;
    className: string;
    style: React.CSSProperties | undefined;
  };
  helpers: OrdersMobileListHelpers;
  onToggleSelection: (orderNumber: string) => void;
}

export const OrdersMobileCompactItem: React.FC<OrdersMobileCompactItemProps> = ({
  order,
  isSelected,
  canSelectOrders,
  rawNumber,
  compactOrderNumber,
  compactTime,
  customerName,
  unifiedStatus,
  helpers,
  onToggleSelection,
}) => {
  const { t } = useTranslation();
  const { formatPrice, getOrderAmount, formatDate } = helpers;

  return (
    <>
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {canSelectOrders && (
          <input
            type="checkbox"
            aria-label={String(
              t("orders.selectOrder", { orderNumber: rawNumber }),
            )}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary shrink-0 cursor-pointer"
            checked={isSelected}
            onChange={() => onToggleSelection(order.orderNumber)}
            onClick={(e) => e.stopPropagation()}
          />
        )}

        <div className="flex items-center gap-1 shrink-0">
          <span
            dir="ltr"
            className="inline-flex items-center rounded-md border border-border/70 bg-muted/60 px-1.5 py-0.5 text-[11px] font-bold font-mono tabular-nums text-foreground shadow-xs"
          >
            #{compactOrderNumber}
          </span>
          {(order.status === "DUPLICATE_ORDER" || Boolean(order.metadata?.duplicate)) && (
            <span
              className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-500/30 dark:text-amber-400 shrink-0"
              title={
                order.metadata?.duplicate?.duplicateOfOrderNumber
                  ? `طلب مكرر من #${order.metadata.duplicate.duplicateOfOrderNumber}`
                  : "طلب مكرر"
              }
            >
              <Copy className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
              <span>مكرر</span>
            </span>
          )}
          {!order.isViewed && (
            <span
              className="inline-block h-2 w-2 rounded-full bg-red-500 ring-2 ring-red-200 dark:ring-red-900/50 shrink-0"
              title={t("orders.newLabel")}
            />
          )}
        </div>

        <div className="flex items-center gap-1 min-w-0 flex-1">
          <span className="truncate text-xs font-semibold text-foreground">
            {customerName}
          </span>
          <CustomerRatingBadge
            rating={order.customerRating || order.customer?.customerRating}
            healthScore={order.healthScore}
            healthDiagnosis={order.healthDiagnosis}
            orderNumber={order.orderNumber}
            customerId={order.customerId || order.customer?.id}
            deliveryRate={(order as any).deliveryRate ?? order.customer?.deliveryRate}
            totalDelivered={(order as any).totalDelivered ?? order.customer?.totalDelivered}
            totalAttempts={(order as any).totalAttempts}
            totalOrdersCount={(order as any).totalOrdersCount ?? order.customer?.totalOrdersCount}
            totalFailed={(order as any).totalFailed}
            totalCancelled={(order as any).totalCancelled}
            isDuplicate={order.status === "DUPLICATE_ORDER" || Boolean(order.metadata?.duplicate)}
            orderStatus={order.status}
            interactive={false}
            variant="badge"
            size="xs"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className="truncate text-[11px] font-medium text-muted-foreground shrink-0"
          title={formatDate(order.createdAt || new Date().toISOString())}
        >
          {compactTime}
        </span>

        <div className="flex flex-col items-end">
          <span className="text-xs font-bold font-mono tabular-nums text-foreground shrink-0">
            {formatPrice(getOrderAmount(order))}
          </span>
          {Boolean(order.discount && Number(order.discount) > 0) && (
            <span
              className="text-[9px] text-destructive font-medium truncate max-w-[70px] leading-tight"
              title={order.discountReason ? `خصم: ${order.discountReason}` : "خصم"}
            >
              {order.discountReason || "خصم"}
            </span>
          )}
          {((order.discountApprovalStatus || (order.metadata as any)?.discountApprovalStatus) === "PENDING_APPROVAL" || order.needsDiscountApproval) && (
            <span className="text-[8px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/30">
              بانتظار الاعتماد
            </span>
          )}
        </div>

        <span
          className={`${unifiedStatus.className} text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-xs`}
          style={unifiedStatus.style}
          aria-label={unifiedStatus.labelKey}
        >
          {unifiedStatus.text}
        </span>

        <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground group-active:-translate-x-0.5 shrink-0 transition-transform duration-150" />
      </div>
    </>
  );
};

export default OrdersMobileCompactItem;
