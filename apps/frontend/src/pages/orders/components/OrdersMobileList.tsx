import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Copy, Undo2 } from "lucide-react";
import { OrdersSkeleton } from "./OrdersSkeleton";
import { OrdersEmptyState } from "./OrdersEmptyState";
import { CustomerRatingBadge } from "../../../components/orders/CustomerRatingBadge";
import type { Order } from "../Orders";
import { toCompactRelativeTime, formatMobileOrderNumber } from "../utils/mobileListHelpers";

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
            const orderKey = `mobile-${order.id || order.orderNumber || idx}`;

            return (
              <article
                key={orderKey}
                role="button"
                tabIndex={0}
                aria-label={`${t("orders.order")} ${rawNumber} - ${customerName}`}
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
                  /* Compact 1-Row Layout: Order# + Customer Name + Time + Price + Status */
                  <>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {canSelectOrders && (
                        <input
                          type="checkbox"
                          aria-label={String(
                            t("orders.selectOrder", { orderNumber: rawNumber }),
                          )}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary shrink-0 cursor-pointer"
                          checked={isSelected}
                          onChange={() => onToggleSelection(order.orderNumber)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}

                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          dir="ltr"
                          className="inline-flex items-center rounded-md border border-border/70 bg-muted/60 px-1.5 py-0.5 text-[11px] font-bold font-mono tabular-nums text-foreground shadow-xs"
                        >
                          #{compactOrderNumber}
                        </span>
                        {(order.status === "DUPLICATE_ORDER" || Boolean(order.metadata?.duplicate)) && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-500/30 dark:text-amber-400 shrink-0"
                            title={
                              order.metadata?.duplicate?.duplicateOfOrderNumber
                                ? `طلب مكرر من #${order.metadata.duplicate.duplicateOfOrderNumber}`
                                : "طلب مكرر"
                            }
                          >
                            <Copy className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                            <span>مكرر</span>
                          </span>
                        )}
                        {!order.isViewed && (
                          <span
                            className="inline-block h-2 w-2 rounded-full bg-red-500 ring-2 ring-red-200 dark:ring-red-900/50 shrink-0"
                            title={t("orders.newLabel")}
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <span className="truncate text-xs font-semibold text-foreground">
                          {customerName}
                        </span>
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
                          interactive={false}
                          variant="badge"
                          size="xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="truncate text-[11px] font-medium text-muted-foreground shrink-0"
                        title={formatDate(order.createdAt || new Date().toISOString())}
                      >
                        {compactTime}
                      </span>

                      <div className="flex flex-col items-end">
                        <span className="text-xs font-bold font-mono tabular-nums text-foreground shrink-0">
                          {formatPrice(getOrderAmount(order))}
                        </span>
                        {Boolean(order.discount && Number(order.discount) > 0) && (
                          <span
                            className="text-[9px] text-destructive font-medium truncate max-w-[70px] leading-tight"
                            title={order.discountReason ? `خصم: ${order.discountReason}` : "خصم"}
                          >
                            {order.discountReason || "خصم"}
                          </span>
                        )}
                        {((order.discountApprovalStatus || (order.metadata as any)?.discountApprovalStatus) === "PENDING_APPROVAL" || order.needsDiscountApproval) && (
                          <span className="text-[8px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/30">
                            بانتظار الاعتماد
                          </span>
                        )}
                      </div>

                      <span
                        className={`${unifiedStatus.className} text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-xs`}
                        style={unifiedStatus.style}
                        aria-label={unifiedStatus.labelKey}
                      >
                        {unifiedStatus.text}
                      </span>

                      <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground group-active:-translate-x-0.5 shrink-0 transition-transform duration-150" />
                    </div>
                  </>
                ) : (
                  /* Comfortable 2-Row Layout: Ergonomic, Rich & Balanced */
                  <>
                    {/* Row 1: Order # + Customer Name + Amount + Chevron */}
                    <div className="flex items-center justify-between gap-2 min-w-0 w-full">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {canSelectOrders && (
                          <input
                            type="checkbox"
                            aria-label={String(
                              t("orders.selectOrder", { orderNumber: rawNumber }),
                            )}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary shrink-0 cursor-pointer"
                            checked={isSelected}
                            onChange={() => onToggleSelection(order.orderNumber)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}

                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            dir="ltr"
                            className="inline-flex items-center rounded-md border border-border/70 bg-muted/60 px-1.5 py-0.5 text-[11px] font-bold font-mono tabular-nums text-foreground shadow-xs"
                          >
                            #{compactOrderNumber}
                          </span>
                          {(order.status === "DUPLICATE_ORDER" || Boolean(order.metadata?.duplicate)) && (
                            <span
                              className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-500/30 dark:text-amber-400 shrink-0"
                              title={
                                order.metadata?.duplicate?.duplicateOfOrderNumber
                                  ? `طلب مكرر من #${order.metadata.duplicate.duplicateOfOrderNumber}`
                                  : "طلب مكرر"
                              }
                            >
                              <Copy className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                              <span>مكرر</span>
                            </span>
                          )}
                          {!order.isViewed && (
                            <span
                              className="inline-block h-2 w-2 rounded-full bg-red-500 ring-2 ring-red-200 dark:ring-red-900/50 shrink-0"
                              title={t("orders.newLabel")}
                            />
                          )}
                        </div>

                        <span className="truncate text-xs sm:text-sm font-semibold text-foreground min-w-0 flex-1">
                          {customerName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex flex-col items-end">
                          <span className="text-xs sm:text-sm font-bold font-mono tabular-nums text-foreground shrink-0">
                            {formatPrice(getOrderAmount(order))}
                          </span>
                          {Boolean(order.discount && Number(order.discount) > 0) && (
                            <span
                              className="text-[10px] text-destructive font-medium truncate max-w-[100px] leading-tight"
                              title={order.discountReason ? `خصم: ${order.discountReason}` : "خصم"}
                            >
                              {order.discountReason || "خصم"}
                            </span>
                          )}
                          {((order.discountApprovalStatus || (order.metadata as any)?.discountApprovalStatus) === "PENDING_APPROVAL" || order.needsDiscountApproval) && (
                            <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/30">
                              بانتظار الاعتماد
                            </span>
                          )}
                        </div>

                        <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground group-active:-translate-x-0.5 shrink-0 transition-transform duration-150" />
                      </div>
                    </div>

                    {/* Row 2: Relative Time + Phone/City + Status Badge */}
                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground w-full min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                        <span
                          className="shrink-0 font-medium text-muted-foreground"
                          title={formatDate(order.createdAt || new Date().toISOString())}
                        >
                          {compactTime}
                        </span>

                        {customerPhone && (
                          <>
                            <span className="text-border shrink-0">•</span>
                            <span
                              dir="ltr"
                              className="font-mono tabular-nums text-[11px] text-muted-foreground shrink-0"
                            >
                              {customerPhone}
                            </span>
                          </>
                        )}

                        {customerCity && (
                          <>
                            <span className="text-border shrink-0">•</span>
                            <span className="truncate text-[11px] text-muted-foreground min-w-0">
                              {customerCity}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {(order.turboReturnReason || (order as any).turboDelayReason) && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-medium text-destructive max-w-[120px] truncate"
                            title={`سبب المرتجع: ${order.turboReturnReason || (order as any).turboDelayReason}`}
                          >
                            <Undo2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{order.turboReturnReason || (order as any).turboDelayReason}</span>
                          </span>
                        )}
                        <span
                          className={`${unifiedStatus.className} text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 shadow-xs`}
                          style={unifiedStatus.style}
                          aria-label={unifiedStatus.labelKey}
                        >
                          {unifiedStatus.text}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrdersMobileList;
