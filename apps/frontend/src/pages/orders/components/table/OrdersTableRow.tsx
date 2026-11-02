import React from "react";
import { useTranslation } from "react-i18next";
import { CustomerRatingBadge } from "../../../../components/orders/CustomerRatingBadge";
import type { Order } from "../../Orders";
import { OrdersTableHelpers, toStandardDigits } from "./ordersTableTypes";
import OrdersTableOrderNumberCell from "./cells/OrdersTableOrderNumberCell";
import OrdersTableAmountCell from "./cells/OrdersTableAmountCell";
import OrdersTableStatusCell from "./cells/OrdersTableStatusCell";
import OrdersTableActionsCell from "./cells/OrdersTableActionsCell";

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
  } = helpers;

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
        <OrdersTableOrderNumberCell
          order={order}
          displayOrderNumber={displayOrderNumber}
          cellPadding={cellPadding}
        />
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
                  interactive
                  allowManualEdit
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
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
              <span className="inline-flex items-center gap-1" title={`منشئ الطلب: ${order.createdByName || (order.createdBy ? 'موظف' : (order.sourceType === 'storefront' ? 'متجر إلكتروني' : '—'))}`}>
                <span className="font-normal text-muted-foreground/80">المنشئ:</span>
                <span className="font-medium text-foreground">{order.createdByName || (order.createdBy ? "موظف" : (order.sourceType === "storefront" ? "متجر" : "—"))}</span>
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span className="inline-flex items-center gap-1" title={`الموظف المسؤول: ${order.assignedToName || (order.assignedTo ? 'موظف' : 'غير موزع')}`}>
                <span className="font-normal text-muted-foreground/80">المسؤول:</span>
                <span className="font-medium text-foreground">{order.assignedToName || (order.assignedTo ? "موظف" : "غير موزع")}</span>
                {order.assignmentStrategy === "round_robin" && (
                  <span className="text-[9px] text-blue-600 dark:text-blue-400 font-normal">(آلي)</span>
                )}
              </span>
            </div>
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
            interactive
            allowManualEdit
            variant="badge"
            size="sm"
          />
        </td>
      )}

      {columns.includes("creator") && (
        <td className={cellPadding}>
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="inline-flex items-center gap-1 text-xs font-semibold text-foreground truncate max-w-[150px]"
              title={order.createdByName || (order.createdBy ? "موظف" : (order.sourceType === "storefront" ? "متجر إلكتروني" : "—"))}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate">
                {order.createdByName || (order.createdBy ? "موظف" : (order.sourceType === "storefront" ? "متجر إلكتروني" : "—"))}
              </span>
            </span>
          </div>
        </td>
      )}

      {columns.includes("assignedTo") && (
        <td className={cellPadding}>
          <div className="flex flex-col gap-0.5 items-start min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="inline-flex items-center gap-1 text-xs font-semibold text-foreground truncate max-w-[150px]"
                title={order.assignedToName || (order.assignedTo ? "موظف" : "غير موزع")}
              >
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${order.assignedTo ? "bg-blue-500" : "bg-muted-foreground/40"}`} />
                <span className="truncate">
                  {order.assignedToName || (order.assignedTo ? "موظف" : "غير موزع")}
                </span>
              </span>
            </div>
            {order.assignmentStrategy === "round_robin" && (
              <span className="inline-flex items-center text-[10px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800">
                توزيع آلي
              </span>
            )}
          </div>
        </td>
      )}

      {columns.includes("amount") && (
        <OrdersTableAmountCell
          order={order}
          cellPadding={cellPadding}
          formatPrice={formatPrice}
        />
      )}

      {columns.includes("status") && (
        <OrdersTableStatusCell
          order={order}
          cellPadding={cellPadding}
          helpers={helpers}
        />
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
        <OrdersTableActionsCell
          order={order}
          displayOrderNumber={displayOrderNumber}
          cellPadding={cellPadding}
          onOpenOrder={onOpenOrder}
          onMarkAsViewed={onMarkAsViewed}
        />
      )}
    </tr>
  );
};

export default OrdersTableRow;
