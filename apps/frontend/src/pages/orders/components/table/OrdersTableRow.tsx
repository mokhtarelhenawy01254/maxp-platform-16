import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  EyeIcon,
  ShoppingBagIcon,
  ChatBubbleLeftRightIcon,
  DocumentDuplicateIcon,
  GiftIcon,
  CalendarIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/outline";
import { summarizeOrderDocumentItems } from "../../../../utils/orderDocumentQuantityOffers";
import { CustomerRatingBadge } from "../../../../components/orders/CustomerRatingBadge";
import { hasPostPurchaseOffer } from "../../../../utils/postPurchaseOfferBadge";
import type { Order } from "../../Orders";
import { OrdersTableHelpers, toStandardDigits } from "./ordersTableTypes";

interface OrdersTableRowProps {
  order: Order;
  selectedOrders: string[];
  canSelectOrders: boolean;
  columns: string[];
  cellPadding: string;
  helpers: OrdersTableHelpers;
  onOpenOrder: (order: Order) => void;
  onToggleSelection: (orderNumber: string) => void;
  onMarkAsViewed: (orderNumber: string) => void;
}

export const OrdersTableRow: React.FC<OrdersTableRowProps> = ({
  order,
  selectedOrders,
  canSelectOrders,
  columns,
  cellPadding,
  helpers,
  onOpenOrder,
  onToggleSelection,
  onMarkAsViewed,
}) => {
  const { t } = useTranslation();
  const {
    getCustomerDisplayName,
    formatPrice,
    getRelativeTime,
    formatDate,
    getPaymentStatusBadgeStyle,
    getPaymentStatusColor,
    getPaymentStatusText,
    getUnifiedStatusDisplay,
    getConfidenceColor,
    getConfidenceIcon,
  } = helpers;

  const orderItemsSummary = summarizeOrderDocumentItems(order.items);
  const isCartId = String(order.orderNumber || "").startsWith("cart_");
  const displayOrderNumber =
    order.metadata?.isIncompleteCart || isCartId
      ? `INC-${String(order.orderNumber || "").replace(/^cart_/, "").slice(0, 8).toUpperCase()}`
      : order.orderNumber;

  const isSelected = selectedOrders.includes(order.orderNumber);

  return (
    <tr
      onClick={() => onOpenOrder(order)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onOpenOrder(order);
        }
      }}
      tabIndex={0}
      aria-label={`${t("orders.viewDetails")} ${displayOrderNumber}`}
      className={`hover:bg-muted/40 cursor-pointer transition-colors duration-100 group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/40 ${
        isSelected
          ? "bg-primary/5 dark:bg-primary/10"
          : !order.isViewed
            ? "bg-primary/[0.02]"
            : ""
      }`}
    >
      {canSelectOrders && (
        <td
          className={`${cellPadding} w-10`}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            aria-label={String(t("orders.selectOrder", { orderNumber: displayOrderNumber }))}
            className="h-4 w-4 text-primary border-border rounded focus:ring-primary/20 accent-primary cursor-pointer"
            checked={isSelected}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelection(order.orderNumber);
            }}
          />
        </td>
      )}

      {columns.includes("orderNumber") && (
        <td className={cellPadding}>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span
                dir="ltr"
                className="inline-block whitespace-nowrap font-mono text-xs sm:text-[13px] font-bold tabular-nums text-foreground tracking-tight"
              >
                #{displayOrderNumber}
              </span>
              {hasPostPurchaseOffer(order) && (
                <span
                  className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/20"
                  title="يحتوي على عرض خاص بعد الشراء (Post-Purchase Upsell)"
                >
                  <GiftIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span className="hidden sm:inline">عرض بعد الشراء</span>
                </span>
              )}
              {order.metadata?.isGuestOrder && (
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/50">
                  {t("orders.guest")}
                </span>
              )}
              {(order.status === "DUPLICATE_ORDER" || Boolean(order.metadata?.duplicate)) && (
                <span
                  className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/20"
                  title={
                    order.metadata?.duplicate?.duplicateOfOrderNumber
                      ? `طلب مكرر من #${order.metadata.duplicate.duplicateOfOrderNumber}`
                      : "طلب مكرر"
                  }
                >
                  <DocumentDuplicateIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>مكرر</span>
                  {order.metadata?.duplicate?.duplicateOfOrderNumber && (
                    <span className="font-mono text-[10px] opacity-80" dir="ltr">
                      (#{order.metadata.duplicate.duplicateOfOrderNumber})
                    </span>
                  )}
                </span>
              )}
              {!order.isViewed && (
                <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-400 border border-rose-500/20">
                  {t("orders.newLabel")}
                </span>
              )}
            </div>
            {orderItemsSummary.hasQuantityOffers && (
              <div className="inline-flex items-center gap-1 max-w-[220px] truncate rounded border border-amber-200/80 bg-amber-50/80 px-1.5 py-0.5 text-[11px] font-medium text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                <span>{orderItemsSummary.primaryLabel}</span>
              </div>
            )}
            {order.notes && (
              <div
                className="inline-flex items-center gap-1 max-w-[240px] truncate rounded border border-indigo-200/80 bg-indigo-50/80 px-1.5 py-0.5 text-[11px] font-medium text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-900/20 dark:text-indigo-200"
                title={order.notes}
              >
                <span className="truncate">{order.notes}</span>
              </div>
            )}
          </div>
        </td>
      )}

      {columns.includes("customer") && (
        <td className={cellPadding}>
          <div className="flex flex-col gap-1 leading-tight">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="truncate max-w-[190px] text-sm font-medium text-foreground">
                {getCustomerDisplayName(order)}
              </span>
              {!columns.includes("customerRating") && (
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
              )}
            </div>
            {order.customerPhone && (
              <span
                className="text-xs text-muted-foreground font-mono tabular-nums"
                dir="ltr"
              >
                {toStandardDigits(order.customerPhone)}
              </span>
            )}
          </div>
        </td>
      )}

      {columns.includes("customerRating") && (
        <td className={cellPadding}>
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
            size="sm"
          />
        </td>
      )}

      {columns.includes("amount") && (
        <td className={`${cellPadding} whitespace-nowrap`}>
          {(() => {
            try {
              const subtotal =
                typeof order.subtotal === "number"
                  ? order.subtotal
                  : parseFloat(order.subtotal as any) || 0;
              const shipping =
                typeof order.shipping === "number"
                  ? order.shipping
                  : parseFloat(order.shipping as any) || 0;
              const tax =
                typeof order.tax === "number"
                  ? order.tax
                  : parseFloat(order.tax as any) || 0;
              const discount =
                typeof order.discount === "number"
                  ? order.discount
                  : parseFloat(order.discount as any) || 0;

              const amount =
                order.total != null && order.total > 0
                  ? order.total
                  : Math.max(0, subtotal + shipping + tax - discount);

              const discountReason =
                order.discountReason ||
                (order.metadata as any)?.discountReason;

              const discountApprovalStatus =
                order.discountApprovalStatus ||
                (order.metadata as any)?.discountApprovalStatus;

              const isPendingDiscountApproval =
                discountApprovalStatus === "PENDING_APPROVAL" ||
                Boolean(order.needsDiscountApproval || (order.metadata as any)?.needsDiscountApproval);

              return (
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-sm font-bold font-mono tabular-nums text-foreground">
                    {formatPrice(amount)}
                  </span>
                  {discount > 0 && (
                    <div
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 dark:text-rose-300 max-w-[170px] truncate"
                      title={discountReason ? `خصم: -${formatPrice(discount)} (${discountReason})` : `خصم: -${formatPrice(discount)}`}
                    >
                      <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400">-{formatPrice(discount)}</span>
                      {discountReason && (
                        <span className="truncate text-foreground text-[10px] bg-rose-50 dark:bg-rose-950/40 px-1 py-0.5 rounded border border-rose-200/80 dark:border-rose-900/50 font-normal">
                          {discountReason}
                        </span>
                      )}
                    </div>
                  )}
                  {isPendingDiscountApproval && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800">
                      بانتظار اعتماد الخصم
                    </span>
                  )}
                </div>
              );
            } catch (e) {
              return <span className="text-sm font-mono font-bold text-foreground">0.00</span>;
            }
          })()}
        </td>
      )}

      {columns.includes("status") && (
        <td className={cellPadding}>
          <div className="flex flex-col gap-0.5 items-start">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              {(() => {
                const unifiedStatus = getUnifiedStatusDisplay(order, t);
                return (
                  <span
                    className={`${unifiedStatus.className} text-xs py-1 px-2.5 rounded-full font-medium`}
                    style={unifiedStatus.style}
                    aria-label={unifiedStatus.labelKey}
                  >
                    {unifiedStatus.text}
                  </span>
                );
              })()}
              {order.isScheduled &&
                order.scheduledDeliveryDate && (
                  <span
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground font-mono tabular-nums"
                    dir="ltr"
                  >
                    <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    {new Date(
                      order.scheduledDeliveryDate,
                    ).toLocaleDateString("ar-EG", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              {order.confidence && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(order.confidence)}`}
                >
                  {getConfidenceIcon(order.confidence)}
                  <span className="mr-0.5 font-mono tabular-nums">
                    {(order.confidence * 100).toFixed(0)}%
                  </span>
                </span>
              )}
            </div>
            {(order.turboReturnReason || order.turboDelayReason) && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 dark:text-rose-300 max-w-[170px] truncate leading-tight"
                title={`سبب المرتجع: ${order.turboReturnReason || order.turboDelayReason}`}
              >
                <ArrowUturnLeftIcon className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="truncate">{order.turboReturnReason || order.turboDelayReason}</span>
              </span>
            )}
          </div>
        </td>
      )}

      {columns.includes("payment") && (
        <td className={cellPadding}>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
              getPaymentStatusBadgeStyle(order.paymentStatus || "pending")
                ? ""
                : getPaymentStatusColor((order.paymentStatus || "pending").toLowerCase())
            }`}
            style={getPaymentStatusBadgeStyle(order.paymentStatus || "pending")}
          >
            {getPaymentStatusText((order.paymentStatus || "pending").toLowerCase())}
          </span>
        </td>
      )}

      {columns.includes("date") && (
        <td
          className={`hidden ${cellPadding} whitespace-nowrap text-xs text-muted-foreground xl:table-cell font-mono tabular-nums`}
          title={formatDate(order.createdAt || new Date().toISOString())}
        >
          {(() => {
            try {
              return getRelativeTime(order.createdAt || new Date().toISOString());
            } catch (e) {
              return "-";
            }
          })()}
        </td>
      )}

      {columns.includes("actions") && (
        <td className={cellPadding}>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenOrder(order);
              }}
              aria-label={`${t("orders.quickView")} ${displayOrderNumber}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground hover:border-border hover:bg-muted/80 hover:text-primary active:scale-95 transition"
              title={t("orders.quickView")}
            >
              <EyeIcon className="w-4 h-4" />
            </button>
            <Link
              to={
                order.metadata?.isIncompleteCart
                  ? `/orders/incomplete/${encodeURIComponent(order.metadata.cartId || order.orderNumber)}`
                  : `/orders/${order.orderNumber}`
              }
              onClick={(e) => {
                e.stopPropagation();
                if (!order.isViewed) {
                  onMarkAsViewed(order.orderNumber);
                }
              }}
              aria-label={`${t("orders.viewFullDetails")} ${displayOrderNumber}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground hover:border-border hover:bg-muted/80 hover:text-primary active:scale-95 transition"
              title={t("orders.viewFullDetails")}
            >
              <ShoppingBagIcon className="w-4 h-4" />
            </Link>
            {order.conversationId && (
              <Link
                to={`/whatsapp?conversationId=${order.conversationId}`}
                onClick={(e) => e.stopPropagation()}
                aria-label={`${t("orders.conversation")} ${order.orderNumber}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground hover:border-border hover:bg-muted/80 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95 transition"
                title={t("orders.conversation")}
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
              </Link>
            )}
          </div>
        </td>
      )}
    </tr>
  );
};
