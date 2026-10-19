import { useMemo } from "react";
import type { OrdersTableSectionProps } from "../components/OrdersTableSection";
import type {
  Order,
  OrderStatusDefinition,
} from "../Orders";
import type { OrdersMobileListHelpers } from "../components/OrdersMobileList";
import type { OrdersTableHelpers } from "../components/OrdersTable";
import type { TableDensity } from "./useOrdersTableSettings";

export interface UseOrdersTableSectionPropsParams {
  canSelectOrders: boolean;
  selectedOrders: string[];
  bulkUpdatableStatuses: OrderStatusDefinition[];
  isTrashView?: boolean;
  bulkProcessing: boolean;
  printingInvoices: boolean;
  setSelectedOrders: (orders: string[]) => void;
  handleBulkStatusUpdate: (status: string) => void;
  handleBulkPrintInvoices: () => void;
  handleBulkDelete: () => void;
  hasActiveTurbo: boolean;
  hasActiveQpExpress: boolean;
  hasActiveBosta: boolean;
  handleBulkCreateTurboShipments: () => void;
  handleBulkCreateQpExpressShipments: () => void;
  handleBulkCreateBostaShipments: () => void;

  displayedOrders: Order[];
  loading: boolean;
  ordersLoadError: string | null;
  isMerchant: boolean;
  activeFilterCount: number;
  search: string;

  columnsToRender: string[];
  tableColumnCount: number;
  tableDensity: TableDensity;

  page: number;
  totalPages: number;
  totalOrders: number;
  limit: number;

  mobileListHelpers: OrdersMobileListHelpers;
  tableHelpers: OrdersTableHelpers;

  handleOpenOrder: (order: Order) => void;
  toggleOrderSelection: (orderNumber: string) => void;
  toggleAllSelection: () => void;
  handleMarkAsViewed: (orderNumber: string) => void;
  clearAllFilters: () => void;
  handleCustomerRatingChange?: (orderNumber: string, newRating: string) => void;
  handlePageChange: (newPage: number) => void;
  handleLimitChange: (newLimit: number) => void;
  changeTableDensity: (newDensity: TableDensity) => void;
}

export function useOrdersTableSectionProps(
  params: UseOrdersTableSectionPropsParams,
): OrdersTableSectionProps {
  return useMemo<OrdersTableSectionProps>(
    () => ({
      canSelectOrders: params.canSelectOrders,
      selectedOrders: params.selectedOrders,
      bulkUpdatableStatuses: params.bulkUpdatableStatuses,
      isTrashView: params.isTrashView,
      bulkProcessing: params.bulkProcessing,
      printingInvoices: params.printingInvoices,
      onClearSelection: () => params.setSelectedOrders([]),
      onBulkStatusUpdate: params.handleBulkStatusUpdate,
      onBulkPrintInvoices: params.handleBulkPrintInvoices,
      onBulkDelete: params.handleBulkDelete,
      hasActiveTurbo: params.hasActiveTurbo,
      hasActiveQpExpress: params.hasActiveQpExpress,
      hasActiveBosta: params.hasActiveBosta,
      handleBulkCreateTurboShipments: params.handleBulkCreateTurboShipments,
      handleBulkCreateQpExpressShipments:
        params.handleBulkCreateQpExpressShipments,
      handleBulkCreateBostaShipments: params.handleBulkCreateBostaShipments,
      displayedOrders: params.displayedOrders,
      loading: params.loading,
      ordersLoadError: params.ordersLoadError,
      isMerchant: params.isMerchant,
      activeFilterCount: params.activeFilterCount,
      search: params.search,
      columnsToRender: params.columnsToRender,
      tableColumnCount: params.tableColumnCount,
      tableDensity: params.tableDensity,
      page: params.page,
      totalPages: params.totalPages,
      totalOrders: params.totalOrders,
      limit: params.limit,
      mobileListHelpers: params.mobileListHelpers,
      tableHelpers: params.tableHelpers,
      onOpenOrder: params.handleOpenOrder,
      toggleOrderSelection: params.toggleOrderSelection,
      toggleAllSelection: params.toggleAllSelection,
      onMarkAsViewed: params.handleMarkAsViewed,
      clearAllFilters: params.clearAllFilters,
      handleCustomerRatingChange: params.handleCustomerRatingChange,
      handlePageChange: params.handlePageChange,
      handleLimitChange: params.handleLimitChange,
      changeTableDensity: params.changeTableDensity,
    }),
    [
      params.canSelectOrders,
      params.selectedOrders,
      params.bulkUpdatableStatuses,
      params.isTrashView,
      params.bulkProcessing,
      params.printingInvoices,
      params.setSelectedOrders,
      params.handleBulkStatusUpdate,
      params.handleBulkPrintInvoices,
      params.handleBulkDelete,
      params.hasActiveTurbo,
      params.hasActiveQpExpress,
      params.hasActiveBosta,
      params.handleBulkCreateTurboShipments,
      params.handleBulkCreateQpExpressShipments,
      params.handleBulkCreateBostaShipments,
      params.displayedOrders,
      params.loading,
      params.ordersLoadError,
      params.isMerchant,
      params.activeFilterCount,
      params.search,
      params.columnsToRender,
      params.tableColumnCount,
      params.tableDensity,
      params.page,
      params.totalPages,
      params.totalOrders,
      params.limit,
      params.mobileListHelpers,
      params.tableHelpers,
      params.handleOpenOrder,
      params.toggleOrderSelection,
      params.toggleAllSelection,
      params.handleMarkAsViewed,
      params.clearAllFilters,
      params.handleCustomerRatingChange,
      params.handlePageChange,
      params.handleLimitChange,
      params.changeTableDensity,
    ],
  );
}
