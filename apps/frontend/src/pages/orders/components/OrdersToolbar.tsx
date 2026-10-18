import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { FilterChips } from "./FilterChips";
import { OrdersFilterDrawer } from "./OrdersFilterDrawer";
import { OrdersSearchBar } from "./toolbar/OrdersSearchBar";
import { OrdersActionButtons } from "./toolbar/OrdersActionButtons";
import { OrdersQuickViewsBar } from "./toolbar/OrdersQuickViewsBar";
import type {
  OrdersFilters,
  OrderStatusDefinition,
  MerchantFilterOption,
  AffiliateFilterOption,
} from "../Orders";
import {
  buildQuickViews,
  buildStatusOptions,
  buildPaymentStatusOptions,
  buildSourceOptions,
  buildFulfillmentOptions,
  buildOperationOptions,
  buildSettlementOptions,
  buildMerchantOptionsList,
  buildAffiliateOptionsList,
} from "../utils/toolbarOptions";

export interface OrdersToolbarProps {
  filters: OrdersFilters;
  advancedFilterCount: number;
  ordersLoadError: string | null;
  showAdvancedFilters: boolean;
  fieldClassName: string;
  filterableOrderStatuses: OrderStatusDefinition[];
  filterablePaymentStatuses: Array<{ code: string; name: string }>;
  merchantOptions: MerchantFilterOption[];
  affiliateOptions: AffiliateFilterOption[];
  showOrderSourceFilter: boolean;
  showUnifiedOperationFilters: boolean;
  showMerchantOperationFilters: boolean;
  showAffiliateOperationFilter: boolean;
  hasCustomDateFilters: boolean;
  getAffiliateDisplayName: (affiliate: AffiliateFilterOption) => string;
  onFilterChange: (key: keyof OrdersFilters, value: OrdersFilters[keyof OrdersFilters]) => void;
  onApplyFilters: (next: Partial<OrdersFilters>) => void;
  onClearAdvancedFilters: () => void;
  onToggleAdvancedFilters: () => void;
  onSetQuickDate: (range: string) => void;
  onRetry: () => void;
  onRefresh?: () => void;
}

export const OrdersToolbar: React.FC<OrdersToolbarProps> = ({
  filters,
  advancedFilterCount,
  ordersLoadError,
  showAdvancedFilters,
  fieldClassName,
  filterableOrderStatuses,
  filterablePaymentStatuses,
  merchantOptions,
  affiliateOptions,
  showOrderSourceFilter,
  showUnifiedOperationFilters,
  showMerchantOperationFilters,
  showAffiliateOperationFilter,
  hasCustomDateFilters,
  getAffiliateDisplayName,
  onFilterChange,
  onApplyFilters,
  onClearAdvancedFilters,
  onToggleAdvancedFilters,
  onSetQuickDate,
  onRetry,
  onRefresh,
}) => {
  const { t } = useTranslation();

  const quickViews = useMemo(
    () => buildQuickViews(t, onSetQuickDate, onFilterChange),
    [t, onSetQuickDate, onFilterChange],
  );

  const statusOptions = useMemo(
    () => buildStatusOptions(filterableOrderStatuses, t),
    [filterableOrderStatuses, t],
  );

  const paymentStatusOptions = useMemo(
    () => buildPaymentStatusOptions(filterablePaymentStatuses),
    [filterablePaymentStatuses],
  );

  const sourceOptions = useMemo(() => buildSourceOptions(t), [t]);
  const fulfillmentOptions = useMemo(() => buildFulfillmentOptions(t), [t]);
  const operationOptions = useMemo(() => buildOperationOptions(t), [t]);
  const settlementOptions = useMemo(() => buildSettlementOptions(t), [t]);

  const merchantOptionsList = useMemo(
    () => buildMerchantOptionsList(merchantOptions),
    [merchantOptions],
  );

  const affiliateOptionsList = useMemo(
    () => buildAffiliateOptionsList(affiliateOptions, getAffiliateDisplayName),
    [affiliateOptions, getAffiliateDisplayName],
  );

  return (
    <div className="mb-2 space-y-2 sm:mb-3 sm:space-y-2.5">
      <div className="space-y-2 rounded-2xl border border-border/70 bg-card p-2 sm:p-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex flex-col gap-2 sm:gap-2.5">
          {/* Row 1: Unified Search & Action Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <OrdersSearchBar
              search={filters.search}
              fieldClassName={fieldClassName}
              onSearchChange={(val) => onFilterChange("search", val)}
            />

            <OrdersActionButtons
              showAdvancedFilters={showAdvancedFilters}
              advancedFilterCount={advancedFilterCount}
              onlyUnseen={Boolean(filters.onlyUnseen)}
              onlyPostPurchaseOffer={Boolean(filters.onlyPostPurchaseOffer)}
              onToggleAdvancedFilters={onToggleAdvancedFilters}
              onToggleOnlyUnseen={() => onFilterChange("onlyUnseen", !filters.onlyUnseen)}
              onToggleOnlyPostPurchaseOffer={() =>
                onFilterChange("onlyPostPurchaseOffer", !filters.onlyPostPurchaseOffer)
              }
              onRefresh={onRefresh}
            />
          </div>

          {/* Row 2: Status Pill Capsule Rail & Saved Views */}
          <OrdersQuickViewsBar
            quickViews={quickViews}
            filters={filters}
            onApplyFilters={onApplyFilters}
          />

          {ordersLoadError && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-[11px] text-destructive">
              <div className="flex min-w-0 items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{ordersLoadError}</span>
              </div>
              <button
                onClick={onRetry}
                className="rounded-lg border border-destructive/30 px-2.5 py-1 font-semibold transition hover:bg-destructive/15 cursor-pointer"
              >
                {t("orders.incompleteRetry")}
              </button>
            </div>
          )}

          {(advancedFilterCount > 0 || filters.onlyUnseen || filters.onlyPostPurchaseOffer) && (
            <FilterChips
              filters={filters}
              filterableOrderStatuses={filterableOrderStatuses}
              filterablePaymentStatuses={filterablePaymentStatuses}
              merchantOptions={merchantOptions}
              affiliateOptions={affiliateOptions}
              onFilterChange={onFilterChange as never}
              onClearAdvancedFilters={onClearAdvancedFilters}
            />
          )}

          {/* Slide-over Side Drawer for all filters */}
          <OrdersFilterDrawer
            isOpen={showAdvancedFilters}
            onClose={onToggleAdvancedFilters}
            filters={filters}
            advancedFilterCount={advancedFilterCount}
            fieldClassName={fieldClassName}
            statusOptions={statusOptions}
            paymentStatusOptions={paymentStatusOptions}
            sourceOptions={sourceOptions}
            merchantOptionsList={merchantOptionsList}
            affiliateOptionsList={affiliateOptionsList}
            fulfillmentOptions={fulfillmentOptions}
            operationOptions={operationOptions}
            settlementOptions={settlementOptions}
            showOrderSourceFilter={showOrderSourceFilter}
            showUnifiedOperationFilters={showUnifiedOperationFilters}
            showMerchantOperationFilters={showMerchantOperationFilters}
            showAffiliateOperationFilter={showAffiliateOperationFilter}
            hasCustomDateFilters={hasCustomDateFilters}
            onFilterChange={onFilterChange}
            onSetQuickDate={onSetQuickDate}
            onClearAdvancedFilters={onClearAdvancedFilters}
          />
        </div>
      </div>
    </div>
  );
};

export default OrdersToolbar;
