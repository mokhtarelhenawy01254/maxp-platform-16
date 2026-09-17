import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  EyeIcon,
  ShoppingBagIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import { summarizeOrderDocumentItems } from "../../../utils/orderDocumentQuantityOffers";
import { toStandardDigits } from "../../../utils/validation";
import { OrdersSkeleton } from "./OrdersSkeleton";
import { OrdersEmptyState } from "./OrdersEmptyState";
import { OrdersPagination } from "./OrdersPagination";
import type { Order } from "../Orders";

// شبكة أمان إضافية ضد التكرار في الواجهة: لو الباك أرسل نفس الطلب مرتين
// (بنفس رقم الطلب) في نفس الصفحة، نعرض النسخة الأولى بس.
const dedupOrders = (list: Order[]): Order[] => {
  const seen = new Set<string>();
  const out: Order[] = [];
  for (const order of list) {
    const key = String(order.orderNumber || order.id || "").trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(order);
  }
  return out;
};

export interface OrdersTableHelpers {
  getCustomerDisplayName: (order: Order) => string;
  formatPrice: (amount: number | null | undefined, currencyCode?: string) => string;
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
  getConfidenceColor: (confidence?: number) => string;
  getConfidenceIcon: (confidence?: number) => React.ReactNode;
  getOrderSourceText?: (order: Order) => string;
}

interface OrdersTableProps {
  orders: Order[];
  loading: boolean;
  ordersLoadError: string | null;
  selectedOrders: string[];
  canSelectOrders: boolean;
  isMerchant: boolean;
  activeFilterCount: number;
  search: string;
  columns: string[];
  columnCount: number;
  density: "comfortable" | "compact";
  page: number;
  totalPages: number;
  totalOrders: number;
  limit: number;
  helpers: OrdersTableHelpers;
  onOpenOrder: (order: Order) => void;
  onToggleSelection: (orderNumber: string) => void;
  onToggleAllSelection: () => void;
  onMarkAsViewed: (orderNumber: string) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onDensityChange: (density: "comfortable" | "compact") => void;
}

export const OrdersTable: React.FC<OrdersTableProps> = ({
  orders,
  loading,
  ordersLoadError,
  selectedOrders,
  canSelectOrders,
  isMerchant,
  activeFilterCount,
  search,
  columns,
  columnCount,
  density,
  page,
  totalPages,
  totalOrders,
  limit,
  helpers,
  onOpenOrder,
  onToggleSelection,
  onToggleAllSelection,
  onMarkAsViewed,
  onClearFilters,
  onPageChange,
  onLimitChange,
  onDensityChange,
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

  return (
    <div
      data-orders-density={density}
      className="hidden overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/90 shadow-[0_24px_80px_-56px_rgba(15,23,42,0.5)] dark:border-slate-700/70 dark:bg-slate-900/70 lg:block"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-md border-b border-slate-200/80 dark:bg-slate-900/90 dark:border-slate-700/80">
            <tr>
              {canSelectOrders && (
                <th className="w-10 px-3 py-2.5 lg:px-4">
                  <input
                    type="checkbox"
                    aria-label={String(t("orders.selectAllOrders"))}
                    className="w-5 h-5 text-blue-600 dark:text-blue-400 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 dark:bg-slate-700"
                    onChange={onToggleAllSelection}
                    checked={
                      orders.length > 0 &&
                      orders.every((o) =>
                        selectedOrders.includes(o.orderNumber),
                      )
                    }
                  />
                </th>
              )}
              {columns.includes("orderNumber") && (
                <th className="px-3 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 lg:px-4">
                  {t("orders.orderNumber")}
                </th>
              )}
              {columns.includes("customer") && (
                <th className="px-3 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 lg:px-4">
                  {t("orders.customer")}
                </th>
              )}
              {columns.includes("amount") && (
                <th className="whitespace-nowrap px-3 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 lg:px-4">
                  {t("orders.amount")}
                </th>
              )}
              {columns.includes("status") && (
                <th className="px-3 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 lg:px-4">
                  {t("orders.status")}
                </th>
              )}
              {columns.includes("payment") && (
                <th className="px-3 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 lg:px-4">
                  {t("orders.payment")}
                </th>
              )}
              {columns.includes("date") && (
                <th className="hidden px-3 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 lg:px-4 xl:table-cell">
                  {t("orders.date")}
                </th>
              )}
              {columns.includes("actions") && (
                <th className="px-3 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 lg:px-4">
                  {t("orders.actions")}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? (
              <OrdersSkeleton
                variant="table"
                rowCount={5}
                columns={columns}
                showSelect={canSelectOrders}
              />
            ) : orders.length === 0 ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="px-6 py-10 text-center text-slate-500 dark:text-slate-400"
                >
                  <OrdersEmptyState
                    variant="table"
                    error={ordersLoadError}
                    isMerchant={isMerchant}
                    hasActiveFilters={activeFilterCount > 0 || Boolean(search)}
                    onClearFilters={onClearFilters}
                  />
                </td>
              </tr>
            ) : (
              dedupOrders(orders).map((order, idx) => {
                const orderItemsSummary = summarizeOrderDocumentItems(order.items);
                const isCartId = String(order.orderNumber || "").startsWith("cart_");
                const displayOrderNumber =
                  order.metadata?.isIncompleteCart || isCartId
                    ? `INC-${String(order.orderNumber || "").replace(/^cart_/, "").slice(0, 8).toUpperCase()}`
                    : order.orderNumber;

                return (
                  <tr
                    key={order.id || idx}
                    onClick={() => {
                      onOpenOrder(order);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onOpenOrder(order);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`${t("orders.viewDetails")} ${displayOrderNumber}`}
                    className={`hover:bg-blue-50/50 dark:hover:bg-blue-900/15 cursor-pointer transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50 ${selectedOrders.includes(order.orderNumber)
                      ? "bg-blue-50/60 dark:bg-blue-900/30"
                      : !order.isViewed
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : ""
                      }`}
                  >
                    {canSelectOrders && (
                      <td
                        className="px-3 py-2.5 lg:px-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          aria-label={String(t("orders.selectOrder", { orderNumber: displayOrderNumber }))}
                          className="w-5 h-5 text-blue-600 dark:text-blue-400 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 dark:bg-slate-700"
                          checked={selectedOrders.includes(order.orderNumber)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            onToggleSelection(order.orderNumber);
                          }}
                        />
                      </td>
                    )}
                    {columns.includes("orderNumber") && (
                      <td className="px-3 py-2.5 lg:px-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <span dir="ltr" className="inline-block font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                              #{displayOrderNumber}
                            </span>
                            {order.metadata?.isGuestOrder && (
                              <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full">
                                {t("orders.guest")}
                              </span>
                            )}
                            {!order.isViewed && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 border border-red-200">
                                {t("orders.newLabel")}
                              </span>
                            )}
                          </div>
                          {orderItemsSummary.hasQuantityOffers ? (
                            <div className="max-w-[240px] rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
                              <div className="font-semibold">
                                {t("orders.quantityOffersLabel")}: {orderItemsSummary.primaryLabel}
                              </div>
                              <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                                {orderItemsSummary.secondaryLabel}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    )}
                    {columns.includes("customer") && (
                      <td className="px-3 py-2.5 lg:px-4">
                        <div className="flex flex-col">
                          <span className="text-slate-900 dark:text-slate-100 font-medium">
                            {getCustomerDisplayName(order)}
                          </span>
                          {order.customerPhone && (
                            <span
                              className="text-slate-500 dark:text-slate-400 text-xs font-mono tabular-nums self-start"
                              dir="ltr"
                            >
                              {toStandardDigits(order.customerPhone)}
                            </span>
                          )}
                          <span className="mt-0.5 hidden text-xs text-slate-400 dark:text-slate-500 2xl:inline">
                            {helpers.getOrderSourceText
                              ? helpers.getOrderSourceText(order)
                              : order.extractionMethod === "ai_enhanced"
                                ? t("orders.enhancedExtraction")
                                : order.extractionMethod === "ai_basic"
                                  ? t("orders.basicExtraction")
                                  : order.extractionMethod === "manual"
                                    ? t("orders.manual")
                                    : order.extractionMethod}
                          </span>
                        </div>
                      </td>
                    )}
                    {columns.includes("amount") && (
                      <td className="whitespace-nowrap px-3 py-2.5 font-medium tabular-nums text-slate-900 dark:text-slate-100 lg:px-4">
                        {(() => {
                          try {
                            const subtotal =
                              typeof order.subtotal === "number"
                                ? order.subtotal
                                : 0;
                            const shipping =
                              typeof order.shipping === "number"
                                ? order.shipping
                                : 0;
                            const tax =
                              typeof order.tax === "number" ? order.tax : 0;

                            const amount =
                              subtotal + shipping + tax || order.total || 0;
                            return formatPrice(amount);
                          } catch (e) {
                            return "0.00";
                          }
                        })()}
                      </td>
                    )}
                    {columns.includes("status") && (
                      <td className="px-3 py-2.5 lg:px-4">
                        <div className="flex flex-col gap-1">
                          {(() => {
                            const unifiedStatus = getUnifiedStatusDisplay(order, t);
                            return (
                              <span
                                className={unifiedStatus.className}
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
                                className="text-xs text-slate-600 dark:text-slate-400"
                                dir="ltr"
                              >
                                📅{" "}
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
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${getConfidenceColor(order.confidence)}`}
                            >
                              {getConfidenceIcon(order.confidence)}
                              <span className="mr-1">
                                {(order.confidence * 100).toFixed(0)}%
                              </span>
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {columns.includes("payment") && (
                      <td className="px-3 py-2.5 lg:px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusBadgeStyle(
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
                      </td>
                    )}
                    {columns.includes("date") && (
                      <td
                        className="hidden px-3 py-2.5 text-sm text-slate-500 dark:text-slate-400 lg:px-4 xl:table-cell"
                        title={formatDate(
                          order.createdAt || new Date().toISOString(),
                        )}
                      >
                        {(() => {
                          try {
                            return getRelativeTime(
                              order.createdAt || new Date().toISOString(),
                            );
                          } catch (e) {
                            return "-";
                          }
                        })()}
                      </td>
                    )}
                    {columns.includes("actions") && (
                      <td className="px-3 py-2.5 lg:px-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenOrder(order);
                            }}
                            aria-label={`${t("orders.quickView")} ${displayOrderNumber}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 hover:border-slate-200 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-blue-400 active:scale-95 transition"
                            title={t("orders.quickView")}
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <Link
                            to={order.metadata?.isIncompleteCart
                              ? `/orders/incomplete/${encodeURIComponent(order.metadata.cartId || order.orderNumber)}`
                              : `/orders/${order.orderNumber}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!order.isViewed) {
                                onMarkAsViewed(order.orderNumber);
                              }
                            }}
                            aria-label={`${t("orders.viewFullDetails")} ${displayOrderNumber}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 hover:border-slate-200 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-blue-400 active:scale-95 transition"
                            title={t("orders.viewFullDetails")}
                          >
                            <ShoppingBagIcon className="w-4 h-4" />
                          </Link>
                          {order.conversationId && (
                            <Link
                              to={`/whatsapp?conversationId=${order.conversationId}`}
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`${t("orders.conversation")} ${order.orderNumber}`}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                              title={t("orders.conversation")}
                            >
                              <ChatBubbleLeftRightIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                            </Link>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {!loading && orders.length > 0 && (
        <OrdersPagination
          variant="desktop"
          page={page}
          totalPages={totalPages}
          totalOrders={totalOrders}
          limit={limit}
          density={density}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
          onDensityChange={onDensityChange}
        />
      )}
    </div>
  );
};

export default OrdersTable;
