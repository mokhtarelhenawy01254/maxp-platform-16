import React from "react";
import { useTranslation } from "react-i18next";
import type { Order } from "../../Orders";
import type { OrdersMobileListHelpers } from "../OrdersMobileList";
import { toCompactRelativeTime, formatMobileOrderNumber } from "../../utils/mobileListHelpers";
import { OrdersMobileCompactItem } from "./OrdersMobileCompactItem";
import { OrdersMobileComfortableItem } from "./OrdersMobileComfortableItem";

export interface OrdersMobileOrderItemProps {
  order: Order;
  isSelected: boolean;
  canSelectOrders: boolean;
  density?: "comfortable" | "compact";
  helpers: OrdersMobileListHelpers;
  onOpenOrder: (order: Order) => void;
  onToggleSelection: (orderNumber: string) => void;
  onMarkAsViewed: (orderNumber: string) => void;
}

export const OrdersMobileOrderItem: React.FC<OrdersMobileOrderItemProps> = ({
  order,
  isSelected,
  canSelectOrders,
  density = "comfortable",
  helpers,
  onOpenOrder,
  onToggleSelection,
  onMarkAsViewed,
}) => {
  const { t } = useTranslation();
  const {
    getCustomerDisplayName,
    getRelativeTime,
    getUnifiedStatusDisplay,
  } = helpers;

  const { rawNumber, compactOrderNumber } = formatMobileOrderNumber(order.orderNumber, order.metadata);
  const rawTime = getRelativeTime(order.createdAt || new Date().toISOString());
  const compactTime = toCompactRelativeTime(rawTime);
  const unifiedStatus = getUnifiedStatusDisplay(order, t);
  const customerName = getCustomerDisplayName(order);
  const customerPhone =
    order.customerPhone ||
    order.customer?.phone ||
    order.shippingAddress?.phone ||
    "";
  const customerCity =
    order.shippingAddress?.city ||
    order.shippingAddress?.governorate ||
    "";

  const handleArticleClick = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('input[type="checkbox"]')) return;
    if (!order.isViewed) {
      onMarkAsViewed(order.orderNumber);
    }
    onOpenOrder(order);
  };

  const handleArticleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!order.isViewed) {
        onMarkAsViewed(order.orderNumber);
      }
      onOpenOrder(order);
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${t("orders.order")} ${rawNumber} - ${customerName}`}
      onClick={handleArticleClick}
      onKeyDown={handleArticleKeyDown}
      className={`group relative rounded-xl border bg-card shadow-xs transition-all duration-150 cursor-pointer select-none active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
        density === "compact"
          ? "flex items-center justify-between gap-2 min-h-[42px] px-2.5 py-1.5"
          : "flex flex-col justify-center gap-1.5 min-h-[56px] px-3 py-2.5"
      } ${
        isSelected
          ? "border-primary/70 bg-primary/5 ring-1 ring-primary/30"
          : "border-border/70 hover:border-border"
      }`}
    >
      {density === "compact" ? (
        <OrdersMobileCompactItem
          order={order}
          isSelected={isSelected}
          canSelectOrders={canSelectOrders}
          rawNumber={rawNumber}
          compactOrderNumber={compactOrderNumber}
          compactTime={compactTime}
          customerName={customerName}
          unifiedStatus={unifiedStatus}
          helpers={helpers}
          onToggleSelection={onToggleSelection}
        />
      ) : (
        <OrdersMobileComfortableItem
          order={order}
          isSelected={isSelected}
          canSelectOrders={canSelectOrders}
          rawNumber={rawNumber}
          compactOrderNumber={compactOrderNumber}
          compactTime={compactTime}
          customerName={customerName}
          customerPhone={customerPhone}
          customerCity={customerCity}
          unifiedStatus={unifiedStatus}
          helpers={helpers}
          onToggleSelection={onToggleSelection}
        />
      )}
    </article>
  );
};

export default OrdersMobileOrderItem;
