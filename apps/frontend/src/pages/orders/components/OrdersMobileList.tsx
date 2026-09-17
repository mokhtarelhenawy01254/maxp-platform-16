import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { OrdersSkeleton } from "./OrdersSkeleton";
import { OrdersEmptyState } from "./OrdersEmptyState";
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

interface OrdersMobileListProps {
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
  const { t } = useTranslation();
  const {
    getCustomerDisplayName,
    formatPrice,
    getOrderAmount,
    getRelativeTime,
    formatDate,
    getUnifiedStatusDisplay,
  } = helpers;

  return (
    <div className="mb-6 lg:hidden">
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

            const isCartId = String(order.orderNumber || "").startsWith("cart_");
            const displayOrderNumber =
              order.metadata?.isIncompleteCart || isCartId
                ? `INC-${String(order.orderNumber || "").replace(/^cart_/, "").slice(0, 8).toUpperCase()}`
                : order.orderNumber;

            const unifiedStatus = getUnifiedStatusDisplay(order, t);
            const customerName = getCustomerDisplayName(order);
            const orderKey = `mobile-${order.id || order.orderNumber || idx}`;

            return (
              <article
                key={orderKey}
                role="button"
                tabIndex={0}
                aria-label={`${t("orders.order")} ${displayOrderNumber} - ${customerName}`}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('input[type="checkbox"]')) return;
                  if (!order.isViewed) {
                    onMarkAsViewed(order.orderNumber);
                  }
                  onOpenOrder(order);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (!order.isViewed) {
                      onMarkAsViewed(order.orderNumber);
                    }
                    onOpenOrder(order);
                  }
                }}
                className={`group relative flex items-center justify-between gap-2 rounded-xl border bg-white/95 shadow-sm transition-all duration-150 cursor-pointer select-none active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:bg-slate-900/90 ${
                  density === "compact"
                    ? "min-h-[44px] px-2.5 py-1.5"
                    : "min-h-[50px] px-3 py-2"
                } ${
                  isSelected
                    ? "border-blue-500/70 bg-blue-50/80 ring-1 ring-blue-500/30 dark:border-blue-500/60 dark:bg-blue-500/10"
                    : "border-slate-200/80 hover:border-slate-300 dark:border-slate-700/80 dark:hover:border-slate-600"
                }`}
              >
                {/* Right side (RTL): Checkbox + Order # + New Dot + Relative Time */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {canSelectOrders && (
                    <input
                      type="checkbox"
                      aria-label={String(
                        t("orders.selectOrder", { orderNumber: displayOrderNumber }),
                      )}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-blue-400 shrink-0 cursor-pointer"
                      checked={isSelected}
                      onChange={() => onToggleSelection(order.orderNumber)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      dir="ltr"
                      className="inline-flex items-center rounded-lg border border-slate-200/80 bg-slate-50 px-2 py-0.5 text-[11px] font-bold font-mono tabular-nums text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      #{displayOrderNumber}
                    </span>
                    {!order.isViewed && (
                      <span
                        className="inline-block h-2 w-2 rounded-full bg-red-500 ring-2 ring-red-200 dark:ring-red-900/50 shrink-0"
                        title={t("orders.newLabel")}
                      />
                    )}
                  </div>

                  <span
                    className="truncate text-[11px] font-medium text-slate-400 dark:text-slate-400 shrink-0"
                    title={formatDate(order.createdAt || new Date().toISOString())}
                  >
                    {getRelativeTime(order.createdAt || new Date().toISOString())}
                  </span>
                </div>

                {/* Left side (RTL): Total Amount + Status Badge + Open Indicator */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-black font-mono tabular-nums text-slate-900 dark:text-white shrink-0">
                    {formatPrice(getOrderAmount(order))}
                  </span>

                  <span
                    className={`${unifiedStatus.className} text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-sm`}
                    style={unifiedStatus.style}
                    aria-label={unifiedStatus.labelKey}
                  >
                    {unifiedStatus.text}
                  </span>

                  <ChevronLeftIcon className="h-4 w-4 text-slate-400 transition-transform duration-150 group-hover:text-slate-600 group-active:-translate-x-0.5 dark:text-slate-500 dark:group-hover:text-slate-300 shrink-0" />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrdersMobileList;
