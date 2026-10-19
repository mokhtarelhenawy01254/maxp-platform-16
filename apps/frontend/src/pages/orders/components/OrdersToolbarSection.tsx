import React from "react";
import { HeldOrdersBanner } from "./HeldOrdersBanner";
import { OrdersToolbar } from "./OrdersToolbar";
import { OrdersStatsBar } from "./OrdersStatsBar";
import type {
  OrderStatusDefinition,
  MerchantFilterOption,
  MerchantSettlementSummary,
} from "../ordersConstants";
import type { OrdersFilters } from "../ordersFilterTypes";
import type { AffiliateFilterOption } from "../utils/orderTransformer";

export interface OrdersToolbarSectionProps {
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
  onFilterChange: (
    key: keyof OrdersFilters,
    value: OrdersFilters[keyof OrdersFilters],
  ) => void;
  onApplyFilters: (next: Partial<OrdersFilters>) => void;
  onClearAdvancedFilters: () => void;
  onToggleAdvancedFilters: () => void;
  onSetQuickDate: (days: number) => void;
  onRetry: () => void;
  onRefresh: () => void;

  isAdmin: boolean;
  isMerchant: boolean;
  merchantSettlementSummary: MerchantSettlementSummary | null;
  merchantSettlementLoading: boolean;
  merchantSettlementError: string | null;
  formatPrice: (
    amount: number | null | undefined,
    currencyCode?: string,
  ) => string;
  getFulfillmentSourceText: (source?: string | null) => string;
  onClearMerchantFilters: () => void;
  onShowDueOrders: () => void;
}

export const OrdersToolbarSection: React.FC<OrdersToolbarSectionProps> = ({
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

  isAdmin,
  isMerchant,
  merchantSettlementSummary,
  merchantSettlementLoading,
  merchantSettlementError,
  formatPrice,
  getFulfillmentSourceText,
  onClearMerchantFilters,
  onShowDueOrders,
}) => {
  return (
    <>
      <HeldOrdersBanner />

      <OrdersToolbar
        filters={filters}
        advancedFilterCount={advancedFilterCount}
        ordersLoadError={ordersLoadError}
        showAdvancedFilters={showAdvancedFilters}
        fieldClassName={fieldClassName}
        filterableOrderStatuses={filterableOrderStatuses}
        filterablePaymentStatuses={filterablePaymentStatuses}
        merchantOptions={merchantOptions}
        affiliateOptions={affiliateOptions}
        showOrderSourceFilter={showOrderSourceFilter}
        showUnifiedOperationFilters={showUnifiedOperationFilters}
        showMerchantOperationFilters={showMerchantOperationFilters}
        showAffiliateOperationFilter={showAffiliateOperationFilter}
        hasCustomDateFilters={hasCustomDateFilters}
        getAffiliateDisplayName={getAffiliateDisplayName}
        onFilterChange={onFilterChange}
        onApplyFilters={onApplyFilters}
        onClearAdvancedFilters={onClearAdvancedFilters}
        onToggleAdvancedFilters={onToggleAdvancedFilters}
        onSetQuickDate={onSetQuickDate}
        onRetry={onRetry}
        onRefresh={onRefresh}
      />

      <OrdersStatsBar
        isAdmin={isAdmin}
        isMerchant={isMerchant}
        merchantId={filters.merchantId?.[0] || ""}
        merchantSettlementSummary={merchantSettlementSummary}
        merchantSettlementLoading={merchantSettlementLoading}
        merchantSettlementError={merchantSettlementError}
        merchantOptions={merchantOptions}
        formatPrice={formatPrice}
        getFulfillmentSourceText={getFulfillmentSourceText}
        onClearMerchantFilters={onClearMerchantFilters}
        onShowDueOrders={onShowDueOrders}
      />
    </>
  );
};

export default OrdersToolbarSection;
