import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChatBubbleLeftRightIcon,
  EyeIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import type { Order } from "../../../Orders";

interface OrdersTableActionsCellProps {
  order: Order;
  displayOrderNumber: string;
  cellPadding: string;
  onOpenOrder: (order: Order) => void;
  onMarkAsViewed: (orderNumber: string) => void;
}

export const OrdersTableActionsCell: React.FC<OrdersTableActionsCellProps> = ({
  order,
  displayOrderNumber,
  cellPadding,
  onOpenOrder,
  onMarkAsViewed,
}) => {
  const { t } = useTranslation();

  return (
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
  );
};

export default OrdersTableActionsCell;
