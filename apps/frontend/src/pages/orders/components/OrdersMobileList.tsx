import React from "react";
import { OrdersSkeleton } from "./OrdersSkeleton";
import { OrdersEmptyState } from "./OrdersEmptyState";
import { OrdersMobileOrderItem } from "./mobile-list/OrdersMobileOrderItem";
import type { Order } from "../Orders";

export interface OrdersMobileListHelpers {
  getCustomerDisplayName: (order: Order) => string;
  formatPrice: (amount: number | null | undefined, currencyCode?: string) => string;
  getOrderAmount: (order: Order) => number;
  getOrderSourceText: (order: Order) => string;
  getRelativeTime: (dateString: string) => string;
  formatDate: (date: Date | string | number) => string;
  getPaymentStatusBadgeStyle: (status: string) => React.CSSProperties | undefined;
  getPaymentStatusColor: (status: string) => string;
  getPaymentStatusText: (status: string) => string;
  getUnifiedStatusDisplay: (
    order: Order,
    translate: (key: string) => string,
  ) => {
    text: string;
    labelKey: string;
    className: string;
    style: React.CSSProperties | undefined;
  };
}

export interface OrdersMobileListProps {
  orders: Order[];
  loading: boolean;
  ordersLoadError: string | null;
  selectedOrders: string[];
  canSelectOrders: boolean;
  isMerchant: boolean;
  activeFilterCount: number;
  search: string;
  density?: "comfortable" | "compact";
  helpers: OrdersMobileListHelpers;
  onOpenOrder: (order: Order) => void;
  onToggleSelection: (orderNumber: string) => void;
  onMarkAsViewed: (orderNumber: string) => void;
  onClearFilters: () => void;
  onCustomerRatingChange?: (orderNumber: string, newRating: string) => void;
}

export const OrdersMobileList: React.FC<OrdersMobileListProps> = ({
  orders,
  loading,
  ordersLoadError,
  selectedOrders,
  canSelectOrders,
  isMerchant,
  activeFilterCount,
  search,
  density = "comfortable",
  helpers,
  onOpenOrder,
  onToggleSelection,
  onMarkAsViewed,
  onClearFilters,
}) => {
  return (
    <div className="mb-6 lg:hidden pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
      {loading ? (
        <OrdersSkeleton variant="mobile" />
      ) : orders.length === 0 ? (
        <OrdersEmptyState
          variant="mobile"
          error={ordersLoadError}
          isMerchant={isMerchant}
          hasActiveFilters={activeFilterCount > 0 || Boolean(search)}
          onClearFilters={onClearFilters}
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          {orders.map((order, idx) => {
            if (!order) return null;
            const isSelected = selectedOrders.includes(order.orderNumber);
            const orderKey = `mobile-${order.id || order.orderNumber || idx}`;

            return (
              <OrdersMobileOrderItem
                key={orderKey}
                order={order}
                isSelected={isSelected}
                canSelectOrders={canSelectOrders}
                density={density}
                helpers={helpers}
                onOpenOrder={onOpenOrder}
                onToggleSelection={onToggleSelection}
                onMarkAsViewed={onMarkAsViewed}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrdersMobileList;
