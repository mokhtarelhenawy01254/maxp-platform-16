import React from "react";
import type { Order } from "../../../Orders";

interface OrdersTableAmountCellProps {
  order: Order;
  cellPadding: string;
  formatPrice: (value: number) => string;
}

export const OrdersTableAmountCell: React.FC<OrdersTableAmountCellProps> = ({
  order,
  cellPadding,
  formatPrice,
}) => {
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
      order.discountReason || (order.metadata as any)?.discountReason;

    const discountApprovalStatus =
      order.discountApprovalStatus ||
      (order.metadata as any)?.discountApprovalStatus;

    const isPendingDiscountApproval =
      discountApprovalStatus === "PENDING_APPROVAL" ||
      Boolean(order.needsDiscountApproval || (order.metadata as any)?.needsDiscountApproval);

    return (
      <td className={`${cellPadding} whitespace-nowrap`}>
        <div className="flex flex-col items-start gap-0.5">
          <span className="text-sm font-bold font-mono tabular-nums text-foreground">
            {formatPrice(amount)}
          </span>
          {discount > 0 && (
            <div
              className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 dark:text-rose-300 max-w-[170px] truncate"
              title={
                discountReason
                  ? `خصم: -${formatPrice(discount)} (${discountReason})`
                  : `خصم: -${formatPrice(discount)}`
              }
            >
              <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400">
                -{formatPrice(discount)}
              </span>
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
      </td>
    );
  } catch (e) {
    return (
      <td className={`${cellPadding} whitespace-nowrap`}>
        <span className="text-sm font-mono font-bold text-foreground">0.00</span>
      </td>
    );
  }
};

export default OrdersTableAmountCell;
