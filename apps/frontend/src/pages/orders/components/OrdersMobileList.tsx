import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import {
  EyeIcon,
  ShoppingBagIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import { summarizeOrderDocumentItems } from "../../../utils/orderDocumentQuantityOffers";
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
    getOrderSourceText,
    getRelativeTime,
    formatDate,
    getPaymentStatusBadgeStyle,
    getPaymentStatusColor,
    getPaymentStatusText,
    getUnifiedStatusDisplay,
  } = helpers;

  const mobileListRef = useRef<HTMLDivElement>(null);
  const mobileRowVirtualizer = useWindowVirtualizer({
    count: orders.length,
    estimateSize: (index) => {
      const order = orders[index];
      if (!order) return 240;
      const hasOffers = summarizeOrderDocumentItems(order.items).hasQuantityOffers;
      return hasOffers ? 300 : 240;
    },
    overscan: 5,
    scrollMargin: mobileListRef.current?.offsetTop ?? 0,
  });

  return (
    <div ref={mobileListRef} className="mb-6 lg:hidden">
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
        <div
          className="relative w-full"
          style={{ height: `${mobileRowVirtualizer.getTotalSize()}px` }}
        >
          {mobileRowVirtualizer.getVirtualItems().map((virtualRow) => {
            const order = orders[virtualRow.index];
            if (!order) return null;
            const orderItemsSummary = summarizeOrderDocumentItems(order.items);
            const isSelected = selectedOrders.includes(order.orderNumber);

            return (
              <div
                key={`mobile-${order.id || virtualRow.key}`}
                data-index={virtualRow.index}
                ref={mobileRowVirtualizer.measureElement}
                className="absolute left-0 top-0 w-full pb-4"
                style={{
                  transform: `translateY(${virtualRow.start - mobileRowVirtualizer.options.scrollMargin}px)`,
                }}
              >
                <article
                  className={`rounded-2xl border p-3.5 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.5)] transition ${isSelected
                    ? "border-blue-400/70 bg-blue-50/90 dark:border-blue-500/60 dark:bg-blue-500/10"
                    : "border-slate-200/70 bg-white/90 dark:border-slate-700/70 dark:bg-slate-900/70"
                    }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          #{order.orderNumber}
                        </span>
                        {!order.isViewed && (
                          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                            {t("orders.newLabel")}
                          </span>
                        )}
                        {order.metadata?.isGuestOrder && (
                          <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {t("orders.guest")}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <h3 className="truncate text-[15px] font-semibold text-slate-900 dark:text-white">
                          {getCustomerDisplayName(order)}
                        </h3>
                        {order.customerPhone && (
                          <p
                            className="text-xs text-slate-500 dark:text-slate-400"
                            dir="ltr"
                          >
                            {order.customerPhone}
                          </p>
                        )}
                      </div>
                    </div>

                    {canSelectOrders && (
                      <input
                        type="checkbox"
                        aria-label={String(t("orders.selectOrder", { orderNumber: order.orderNumber }))}
                        className="mt-0.5 h-5 w-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-blue-400"
                        checked={isSelected}
                        onChange={() => onToggleSelection(order.orderNumber)}
                      />
                    )}
                  </div>

                  {orderItemsSummary.hasQuantityOffers ? (
                    <div className="mt-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
                      <div className="font-semibold">
                        {t("orders.quantityOffersLabel")}: {orderItemsSummary.primaryLabel}
                      </div>
                      <div className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                        {orderItemsSummary.secondaryLabel}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-2.5 dark:border-slate-700 dark:bg-slate-950/40">
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        {t("orders.amount")}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-bold text-slate-900 dark:text-white">
                        {formatPrice(getOrderAmount(order))}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">
                        {getOrderSourceText(order)}
                      </p>
                    </div>

                    <div className="min-w-0 text-left">
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        {t("orders.time")}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {getRelativeTime(order.createdAt || new Date().toISOString())}
                      </p>
                      <p
                        className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400"
                        title={formatDate(order.createdAt || new Date().toISOString())}
                      >
                        {formatDate(order.createdAt || new Date().toISOString())}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getPaymentStatusBadgeStyle(
                        order.paymentStatus || "pending",
                      )
                        ? ""
                        : getPaymentStatusColor(
                            (order.paymentStatus || "pending").toLowerCase(),
                          )}`}
                      style={getPaymentStatusBadgeStyle(order.paymentStatus || "pending")}
                    >
                      {getPaymentStatusText(
                        (order.paymentStatus || "pending").toLowerCase(),
                      )}
                    </span>
                    {(() => {
                      const unifiedStatus = getUnifiedStatusDisplay(order, t);
                      return (
                        <span className={unifiedStatus.className} style={unifiedStatus.style} aria-label={unifiedStatus.labelKey}>
                          {unifiedStatus.text}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => onOpenOrder(order)}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-2xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      <EyeIcon className="h-4 w-4" />
                      {t("orders.quickView")}
                    </button>

                    <Link
                      to={`/orders/${order.orderNumber}`}
                      onClick={() => {
                        if (!order.isViewed) {
                          onMarkAsViewed(order.orderNumber);
                        }
                      }}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <ShoppingBagIcon className="h-4 w-4" />
                      {t("orders.viewDetails")}
                    </Link>

                    {order.conversationId && (
                      <Link
                        to={`/whatsapp?conversationId=${order.conversationId}`}
                        className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
                        aria-label={`${t("orders.conversation")} ${order.orderNumber}`}
                        title={t("orders.conversation")}
                      >
                        <ChatBubbleLeftRightIcon className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrdersMobileList;
