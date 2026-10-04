import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  EyeIcon,
  ShoppingBagIcon,
  ChatBubbleLeftRightIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { summarizeOrderDocumentItems } from "../../../utils/orderDocumentQuantityOffers";
import { OrdersSkeleton } from "./OrdersSkeleton";
import { OrdersEmptyState } from "./OrdersEmptyState";
import { OrdersPagination } from "./OrdersPagination";
import { CustomerRatingBadge } from "../../../components/orders/CustomerRatingBadge";
import type { Order } from "../Orders";

const toStandardDigits = (str?: string | null): string => {
  if (!str) return "";
  return String(str)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .trim();
};

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
  onCustomerRatingChange?: (orderNumber: string, newRating: string) => void;
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
  onCustomerRatingChange,
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

  const isCompact = density === "compact";
  const cellPadding = isCompact ? "px-3.5 py-2" : "px-4 py-2.5";
  const headerPadding = isCompact ? "px-3.5 py-2.5" : "px-4 py-3";

  return (
    <div
      data-orders-density={density}
      className="hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 lg:block"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-md border-b border-slate-200/80 dark:bg-slate-900/95 dark:border-slate-800">
            <tr>
              {canSelectOrders && (
                <th className={`w-10 ${headerPadding}`}>
                  <input
                    type="checkbox"
                    aria-label={String(t("orders.selectAllOrders"))}
                    className="h-4 w-4 text-blue-600 dark:text-blue-400 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 dark:bg-slate-700"
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
                <th className={`${headerPadding} text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400`}>
                  {t("orders.orderNumber")}
                </th>
              )}
              {columns.includes("customer") && (
                <th className={`${headerPadding} text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400`}>
                  {t("orders.customer")}
                </th>
              )}
              {columns.includes("customerRating") && (
                <th className={`${headerPadding} whitespace-nowrap text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400`}>
                  HEALTH SCORE
                </th>
              )}
              {columns.includes("amount") && (
                <th className={`${headerPadding} whitespace-nowrap text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400`}>
                  {t("orders.amount")}
                </th>
              )}
              {columns.includes("status") && (
                <th className={`${headerPadding} text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400`}>
                  {t("orders.status")}
                </th>
              )}
              {columns.includes("payment") && (
                <th className={`${headerPadding} text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400`}>
                  {t("orders.payment")}
                </th>
              )}
              {columns.includes("date") && (
                <th className={`hidden ${headerPadding} text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400 xl:table-cell`}>
                  {t("orders.date")}
                </th>
              )}
              {columns.includes("actions") && (
                <th className={`${headerPadding} text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400`}>
                  {t("orders.actions")}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
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
                    className={`hover:bg-blue-50/40 dark:hover:bg-blue-900/15 cursor-pointer transition-colors duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50 ${selectedOrders.includes(order.orderNumber)
                      ? "bg-blue-50/60 dark:bg-blue-900/30"
                      : !order.isViewed
                        ? "bg-blue-50/30 dark:bg-blue-900/10"
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
                          className="h-4 w-4 text-blue-600 dark:text-blue-400 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500 dark:bg-slate-700"
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
                      <td className={cellPadding}>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span
                              dir="ltr"
                              className="inline-block whitespace-nowrap font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100"
                            >
                              #{displayOrderNumber}
                            </span>
                            {order.metadata?.isGuestOrder && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                {t("orders.guest")}
                              </span>
                            )}
                            {(order.status === "DUPLICATE_ORDER" || Boolean(order.metadata?.duplicate)) && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-300/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60"
                                title={
                                  order.metadata?.duplicate?.duplicateOfOrderNumber
                                    ? `طلب مكرر من #${order.metadata.duplicate.duplicateOfOrderNumber}`
                                    : "طلب مكرر"
                                }
                              >
                                <DocumentDuplicateIcon className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                                <span>مكرر</span>
                                {order.metadata?.duplicate?.duplicateOfOrderNumber && (
                                  <span className="font-mono text-[10px] opacity-80" dir="ltr">
                                    (#{order.metadata.duplicate.duplicateOfOrderNumber})
                                  </span>
                                )}
                              </span>
                            )}
                            {!order.isViewed && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 border border-red-200/80 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900/50">
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
                            <span className="truncate max-w-[190px] text-sm font-medium text-slate-900 dark:text-slate-100">
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
                                totalAttempts={(order as any).totalAttempts ?? (order as any).totalOrdersCount ?? order.customer?.totalOrdersCount}
                                totalFailed={(order as any).totalFailed}
                                totalCancelled={(order as any).totalCancelled}
                                isDuplicate={order.status === "DUPLICATE_ORDER" || Boolean(order.metadata?.duplicate)}
                                orderStatus={order.status}
                                interactive={true}
                                onRatingChange={(newRating) =>
                                  onCustomerRatingChange?.(order.orderNumber, newRating)
                                }
                                variant="badge"
                                size="xs"
                              />
                            )}
                          </div>
                          {order.customerPhone && (
                            <span
                              className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums"
                              dir="ltr"
                            >
                              {toStandardDigits(order.customerPhone)}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {columns.includes("customerRating") && (
                      <td className={cellPadding} onClick={(e) => e.stopPropagation()}>
                        <CustomerRatingBadge
                          rating={order.customerRating || order.customer?.customerRating}
                          healthScore={order.healthScore}
                          healthDiagnosis={order.healthDiagnosis}
                          orderNumber={order.orderNumber}
                          customerId={order.customerId || order.customer?.id}
                          deliveryRate={(order as any).deliveryRate ?? order.customer?.deliveryRate}
                          totalDelivered={(order as any).totalDelivered ?? order.customer?.totalDelivered}
                          totalAttempts={(order as any).totalAttempts ?? (order as any).totalOrdersCount ?? order.customer?.totalOrdersCount}
                          totalFailed={(order as any).totalFailed}
                          totalCancelled={(order as any).totalCancelled}
                          isDuplicate={order.status === "DUPLICATE_ORDER" || Boolean(order.metadata?.duplicate)}
                          orderStatus={order.status}
                          interactive={true}
                          onRatingChange={(newRating) =>
                            onCustomerRatingChange?.(order.orderNumber, newRating)
                          }
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
                                <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                                  {formatPrice(amount)}
                                </span>
                                {discount > 0 && (
                                  <div
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 dark:text-rose-300 max-w-[170px] truncate"
                                    title={discountReason ? `خصم: -${formatPrice(discount)} (${discountReason})` : `خصم: -${formatPrice(discount)}`}
                                  >
                                    <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400">-{formatPrice(discount)}</span>
                                    {discountReason && (
                                      <span className="truncate text-slate-600 dark:text-slate-300 text-[10px] bg-rose-50 dark:bg-rose-950/40 px-1 py-0.5 rounded border border-rose-200/80 dark:border-rose-900/50 font-normal">
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
                            return <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">0.00</span>;
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
                                  className="text-xs text-slate-500 dark:text-slate-400 font-mono"
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
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(order.confidence)}`}
                              >
                                {getConfidenceIcon(order.confidence)}
                                <span className="mr-0.5">
                                  {(order.confidence * 100).toFixed(0)}%
                                </span>
                              </span>
                            )}
                          </div>
                          {(order.turboReturnReason || order.turboDelayReason) && (
                            <span
                              className="text-[11px] font-medium text-rose-700 dark:text-rose-300 max-w-[170px] truncate block leading-tight"
                              title={`سبب المرتجع: ${order.turboReturnReason || order.turboDelayReason}`}
                            >
                              ↩ {order.turboReturnReason || order.turboDelayReason}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {columns.includes("payment") && (
                      <td className={cellPadding}>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getPaymentStatusBadgeStyle(
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
                        className={`hidden ${cellPadding} whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 xl:table-cell`}
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
                      <td className={cellPadding}>
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
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:border hover:border-slate-200 hover:bg-slate-100 hover:text-emerald-600 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-emerald-400 transition"
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
