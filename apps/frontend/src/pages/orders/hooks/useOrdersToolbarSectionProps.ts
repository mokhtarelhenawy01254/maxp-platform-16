import { useMemo } from "react";
import type { OrdersToolbarSectionProps } from "../components/OrdersToolbarSection";
import type {
  OrdersFilters,
  OrderStatusDefinition,
  MerchantFilterOption,
  AffiliateFilterOption,
  MerchantSettlementSummary,
} from "../Orders";

export interface UseOrdersToolbarSectionPropsParams {
  filters: OrdersFilters;
  advancedFilterCount: number;
  ordersLoadError: string | null;
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: React.Dispatch<React.SetStateAction<boolean>>;
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
  handleFilterChange: (
    key: keyof OrdersFilters,
    value: OrdersFilters[keyof OrdersFilters],
  ) => void;
  applySavedFilters: (next: Partial<OrdersFilters>) => void;
  clearAdvancedFilters: () => void;
  setQuickDate: (days: number) => void;
  fetchOrders: () => void;

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
}

export function useOrdersToolbarSectionProps(
  params: UseOrdersToolbarSectionPropsParams,
): OrdersToolbarSectionProps {
  return useMemo<OrdersToolbarSectionProps>(
    () => ({
      filters: params.filters,
      advancedFilterCount: params.advancedFilterCount,
      ordersLoadError: params.ordersLoadError,
      showAdvancedFilters: params.showAdvancedFilters,
      fieldClassName: params.fieldClassName,
      filterableOrderStatuses: params.filterableOrderStatuses,
      filterablePaymentStatuses: params.filterablePaymentStatuses,
      merchantOptions: params.merchantOptions,
      affiliateOptions: params.affiliateOptions,
      showOrderSourceFilter: params.showOrderSourceFilter,
      showUnifiedOperationFilters: params.showUnifiedOperationFilters,
      showMerchantOperationFilters: params.showMerchantOperationFilters,
      showAffiliateOperationFilter: params.showAffiliateOperationFilter,
      hasCustomDateFilters: params.hasCustomDateFilters,
      getAffiliateDisplayName: params.getAffiliateDisplayName,
      onFilterChange: params.handleFilterChange,
      onApplyFilters: params.applySavedFilters,
      onClearAdvancedFilters: params.clearAdvancedFilters,
      onToggleAdvancedFilters: () =>
        params.setShowAdvancedFilters((prev) => !prev),
      onSetQuickDate: params.setQuickDate,
      onRetry: params.fetchOrders,
      onRefresh: params.fetchOrders,
      isAdmin: params.isAdmin,
      isMerchant: params.isMerchant,
      merchantSettlementSummary: params.merchantSettlementSummary,
      merchantSettlementLoading: params.merchantSettlementLoading,
      merchantSettlementError: params.merchantSettlementError,
      formatPrice: params.formatPrice,
      getFulfillmentSourceText: params.getFulfillmentSourceText,
      onClearMerchantFilters: () => {
        params.handleFilterChange("merchantOperationStatus", []);
        params.handleFilterChange("merchantSettlementStatus", []);
      },
      onShowDueOrders: () => {
        params.handleFilterChange("merchantOperationStatus", ["DELIVERED"]);
        params.handleFilterChange("merchantSettlementStatus", ["PAYABLE"]);
      },
    }),
    [
      params.filters,
      params.advancedFilterCount,
      params.ordersLoadError,
      params.showAdvancedFilters,
      params.setShowAdvancedFilters,
      params.fieldClassName,
      params.filterableOrderStatuses,
      params.filterablePaymentStatuses,
      params.merchantOptions,
      params.affiliateOptions,
      params.showOrderSourceFilter,
      params.showUnifiedOperationFilters,
      params.showMerchantOperationFilters,
      params.showAffiliateOperationFilter,
      params.hasCustomDateFilters,
      params.getAffiliateDisplayName,
      params.handleFilterChange,
      params.applySavedFilters,
      params.clearAdvancedFilters,
      params.setQuickDate,
      params.fetchOrders,
      params.isAdmin,
      params.isMerchant,
      params.merchantSettlementSummary,
      params.merchantSettlementLoading,
      params.merchantSettlementError,
      params.formatPrice,
      params.getFulfillmentSourceText,
    ],
  );
}
