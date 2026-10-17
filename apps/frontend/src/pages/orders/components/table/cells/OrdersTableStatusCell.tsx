import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowUturnLeftIcon, CalendarIcon } from "@heroicons/react/24/outline";
import type { Order } from "../../../Orders";
import type { OrdersTableHelpers } from "../ordersTableTypes";

interface OrdersTableStatusCellProps {
  order: Order;
  cellPadding: string;
  helpers: Pick<
    OrdersTableHelpers,
    "getUnifiedStatusDisplay" | "getConfidenceColor" | "getConfidenceIcon"
  >;
}

export const OrdersTableStatusCell: React.FC<OrdersTableStatusCellProps> = ({
  order,
  cellPadding,
  helpers,
}) => {
  const { t } = useTranslation();
  const { getUnifiedStatusDisplay, getConfidenceColor, getConfidenceIcon } = helpers;
  const unifiedStatus = getUnifiedStatusDisplay(order, t);

  return (
    <td className={cellPadding}>
      <div className="flex flex-col gap-0.5 items-start">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span
            className={`${unifiedStatus.className} text-xs py-1 px-2.5 rounded-full font-medium`}
            style={unifiedStatus.style}
            aria-label={unifiedStatus.labelKey}
          >
            {unifiedStatus.text}
          </span>

          {order.isScheduled && order.scheduledDeliveryDate && (
            <span
              className="inline-flex items-center gap-1 text-xs text-muted-foreground font-mono tabular-nums"
              dir="ltr"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
              {new Date(order.scheduledDeliveryDate).toLocaleDateString("ar-EG", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}

          {order.confidence && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(
                order.confidence,
              )}`}
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
            <span className="truncate">
              {order.turboReturnReason || order.turboDelayReason}
            </span>
          </span>
        )}
      </div>
    </td>
  );
};

export default OrdersTableStatusCell;
