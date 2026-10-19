import type React from "react";
import type { OrdersToolbarSectionProps } from "../components/OrdersToolbarSection";
import type { OrdersTableSectionProps } from "../components/OrdersTableSection";
import type { OrdersModalsContainerProps } from "../components/OrdersModalsContainer";
import type { OrdersFilters } from "../ordersFilterTypes";
import type { Order } from "../utils/orderTransformer";
import type {
  OrderStatusDefinition,
  MerchantFilterOption,
  MerchantSettlementSummary,
} from "../ordersConstants";
import type { AffiliateFilterOption } from "../utils/orderTransformer";
import type { TableDensity } from "./useOrdersTableSettings";
import type { UseOrdersOperationsReturn } from "./useOrdersOperations";
import type { UseOrdersViewDecoratorsReturn } from "./useOrdersViewDecorators";
import { useOrdersToolbarSectionProps } from "./useOrdersToolbarSectionProps";
import { useOrdersTableSectionProps } from "./useOrdersTableSectionProps";
import { useOrdersModalsContainerProps } from "./useOrdersModalsContainerProps";

export interface UseOrdersSectionsPropsOptions {
  filters: OrdersFilters;
  advancedFilterCount: number;
  activeFilterCount: number;
  ordersLoadError: string | null;
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: React.Dispatch<React.SetStateAction<boolean>>;
  fieldClassName: string;
  merchantOptions: MerchantFilterOption[];
  affiliateOptions: AffiliateFilterOption[];
  showOrderSourceFilter: boolean;
  showUnifiedOperationFilters: boolean;
  showMerchantOperationFilters: boolean;
  showAffiliateOperationFilter: boolean;
  hasCustomDateFilters: boolean;
  fetchOrders: () => void;

  isAdmin: boolean;
  isMerchant: boolean;
  merchantSettlementSummary: MerchantSettlementSummary | null;
  merchantSettlementLoading: boolean;
  merchantSettlementError: string | null;
  formatPrice: (amount: number | null | undefined, currencyCode?: string) => string;

  canSelectOrders: boolean;
  selectedOrders: string[];
  isTrashView?: boolean;
  setSelectedOrders: (orders: string[]) => void;
  hasActiveTurbo: boolean;
  hasActiveQpExpress: boolean;
  hasActiveBosta: boolean;
  loading: boolean;
  columnsToRender: string[];
  tableColumnCount: number;
  tableDensity: TableDensity;
  page: number;
  totalPages: number;
  totalOrders: number;
  limit: number;
  changeTableDensity: (density: TableDensity) => void;

  orderStatuses: OrderStatusDefinition[];
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  selectedOrder: Order | null;
  setSelectedOrder: (order: Order | null) => void;
  showOrderModal: boolean;
  setShowOrderModal: (val: boolean) => void;

  operations: UseOrdersOperationsReturn;
  decorators: UseOrdersViewDecoratorsReturn;
}

export interface UseOrdersSectionsPropsReturn {
  toolbarSectionProps: OrdersToolbarSectionProps;
  tableSectionProps: OrdersTableSectionProps;
  modalsContainerProps: OrdersModalsContainerProps;
}

export function useOrdersSectionsProps({
  filters,
  advancedFilterCount,
  activeFilterCount,
  ordersLoadError,
  showAdvancedFilters,
  setShowAdvancedFilters,
  fieldClassName,
  merchantOptions,
  affiliateOptions,
  showOrderSourceFilter,
  showUnifiedOperationFilters,
  showMerchantOperationFilters,
  showAffiliateOperationFilter,
  hasCustomDateFilters,
  fetchOrders,
  isAdmin,
  isMerchant,
  merchantSettlementSummary,
  merchantSettlementLoading,
  merchantSettlementError,
  formatPrice,
  canSelectOrders,
  selectedOrders,
  isTrashView,
  setSelectedOrders,
  hasActiveTurbo,
  hasActiveQpExpress,
  hasActiveBosta,
  loading,
  columnsToRender,
  tableColumnCount,
  tableDensity,
  page,
  totalPages,
  totalOrders,
  limit,
  changeTableDensity,
  orderStatuses,
  orders,
  setOrders,
  selectedOrder,
  setSelectedOrder,
  showOrderModal,
  setShowOrderModal,
  operations,
  decorators,
}: UseOrdersSectionsPropsOptions): UseOrdersSectionsPropsReturn {
  const toolbarSectionProps = useOrdersToolbarSectionProps({
    filters,
    advancedFilterCount,
    ordersLoadError,
    showAdvancedFilters,
    setShowAdvancedFilters,
    fieldClassName,
    filterableOrderStatuses: decorators.filterableOrderStatuses,
    filterablePaymentStatuses: decorators.filterablePaymentStatuses,
    merchantOptions,
    affiliateOptions,
    showOrderSourceFilter,
    showUnifiedOperationFilters,
    showMerchantOperationFilters,
    showAffiliateOperationFilter,
    hasCustomDateFilters,
    getAffiliateDisplayName: decorators.getAffiliateDisplayName,
    handleFilterChange: operations.handleFilterChange,
    applySavedFilters: operations.applySavedFilters,
    clearAdvancedFilters: operations.clearAdvancedFilters,
    setQuickDate: operations.setQuickDate,
    fetchOrders,
    isAdmin,
    isMerchant,
    merchantSettlementSummary,
    merchantSettlementLoading,
    merchantSettlementError,
    formatPrice,
    getFulfillmentSourceText: decorators.getFulfillmentSourceText,
  });

  const tableSectionProps = useOrdersTableSectionProps({
    canSelectOrders,
    selectedOrders,
    bulkUpdatableStatuses: decorators.bulkUpdatableStatuses,
    isTrashView,
    bulkProcessing: operations.bulkProcessing,
    printingInvoices: operations.printingInvoices,
    setSelectedOrders,
    handleBulkStatusUpdate: operations.handleBulkStatusUpdate,
    handleBulkPrintInvoices: operations.handleBulkPrintInvoices,
    handleBulkDelete: operations.handleBulkDelete,
    hasActiveTurbo,
    hasActiveQpExpress,
    hasActiveBosta,
    handleBulkCreateTurboShipments: operations.handleBulkCreateTurboShipments,
    handleBulkCreateQpExpressShipments: operations.handleBulkCreateQpExpressShipments,
    handleBulkCreateBostaShipments: operations.handleBulkCreateBostaShipments,
    displayedOrders: operations.displayedOrders,
    loading,
    ordersLoadError,
    isMerchant,
    activeFilterCount,
    search: filters.search,
    columnsToRender,
    tableColumnCount,
    tableDensity,
    page,
    totalPages,
    totalOrders,
    limit,
    mobileListHelpers: decorators.mobileListHelpers,
    tableHelpers: decorators.tableHelpers,
    handleOpenOrder: decorators.handleOpenOrder,
    toggleOrderSelection: operations.toggleOrderSelection,
    toggleAllSelection: operations.toggleAllSelection,
    handleMarkAsViewed: operations.handleMarkAsViewed,
    clearAllFilters: operations.clearAllFilters,
    handleCustomerRatingChange: decorators.handleCustomerRatingChange,
    handlePageChange: operations.handlePageChange,
    handleLimitChange: operations.handleLimitChange,
    changeTableDensity,
  });

  const modalsContainerProps = useOrdersModalsContainerProps({
    selectedOrder,
    setSelectedOrder,
    showOrderModal,
    setShowOrderModal,
    isMerchant,
    orderStatuses,
    orders,
    setOrders,
    selectedInvoice: operations.selectedInvoice,
    setSelectedInvoice: operations.setSelectedInvoice,
  });

  return {
    toolbarSectionProps,
    tableSectionProps,
    modalsContainerProps,
  };
}
