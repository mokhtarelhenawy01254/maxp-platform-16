import React from "react";
import { BulkActionBar, type BulkStatusOption } from "./BulkActionBar";
import { OrdersBulkCommandPalette } from "./OrdersBulkCommandPalette";
import { OrdersMobileList, type OrdersMobileListHelpers } from "./OrdersMobileList";
import { OrdersTable, type OrdersTableHelpers } from "./OrdersTable";
import { OrdersPagination } from "./OrdersPagination";
import type { Order } from "../Orders";
import type { TableDensity } from "../hooks/useOrdersTableSettings";

export interface OrdersTableSectionProps {
  canSelectOrders: boolean;
  selectedOrders: string[];
  bulkUpdatableStatuses: BulkStatusOption[];
  isTrashView?: boolean;
  bulkProcessing: boolean;
  printingInvoices: boolean;
  onClearSelection: () => void;
  onBulkStatusUpdate: (status: string) => void;
  onBulkPrintInvoices: () => void;
  onBulkDelete: () => void;

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

  onOpenOrder: (order: Order) => void;
  toggleOrderSelection: (orderNumber: string) => void;
  toggleAllSelection: () => void;
  onMarkAsViewed: (orderNumber: string) => void;
  clearAllFilters: () => void;
  handleCustomerRatingChange?: (orderNumber: string, newRating: string) => void;
  handlePageChange: (newPage: number) => void;
  handleLimitChange: (newLimit: number) => void;
  changeTableDensity: (newDensity: TableDensity) => void;
}

export const OrdersTableSection: React.FC<OrdersTableSectionProps> = ({
  canSelectOrders,
  selectedOrders,
  bulkUpdatableStatuses,
  isTrashView,
  bulkProcessing,
  printingInvoices,
  onClearSelection,
  onBulkStatusUpdate,
  onBulkPrintInvoices,
  onBulkDelete,

  hasActiveTurbo,
  hasActiveQpExpress,
  hasActiveBosta,
  handleBulkCreateTurboShipments,
  handleBulkCreateQpExpressShipments,
  handleBulkCreateBostaShipments,

  displayedOrders,
  loading,
  ordersLoadError,
  isMerchant,
  activeFilterCount,
  search,

  columnsToRender,
  tableColumnCount,
  tableDensity,

  page,
  totalPages,
  totalOrders,
  limit,

  mobileListHelpers,
  tableHelpers,

  onOpenOrder,
  toggleOrderSelection,
  toggleAllSelection,
  onMarkAsViewed,
  clearAllFilters,
  handleCustomerRatingChange,
  handlePageChange,
  handleLimitChange,
  changeTableDensity,
}) => {
  return (
    <>
      {/* Bulk Toolbar */}
      {canSelectOrders && (
        <BulkActionBar
          count={selectedOrders.length}
          statuses={bulkUpdatableStatuses}
          isTrashView={isTrashView}
          busy={bulkProcessing}
          printing={printingInvoices}
          onClearSelection={onClearSelection}
          onStatusChange={onBulkStatusUpdate}
          onPrintInvoices={onBulkPrintInvoices}
          onCreateTurboShipments={
            hasActiveTurbo ? handleBulkCreateTurboShipments : undefined
          }
          onCreateQpExpressShipments={
            hasActiveQpExpress ? handleBulkCreateQpExpressShipments : undefined
          }
          onCreateBostaShipments={
            hasActiveBosta ? handleBulkCreateBostaShipments : undefined
          }
          onDelete={onBulkDelete}
        />
      )}

      {/* Hidden command palette that registers the page-level bulk actions */}
      <OrdersBulkCommandPalette
        hasActiveTurbo={hasActiveTurbo}
        hasActiveQpExpress={hasActiveQpExpress}
        hasActiveBosta={hasActiveBosta}
        handleBulkPrintInvoices={onBulkPrintInvoices}
        handleBulkCreateTurboShipments={handleBulkCreateTurboShipments}
        handleBulkCreateQpExpressShipments={handleBulkCreateQpExpressShipments}
        handleBulkCreateBostaShipments={handleBulkCreateBostaShipments}
        handleBulkDelete={onBulkDelete}
      />

      <OrdersMobileList
        orders={displayedOrders}
        loading={loading}
        ordersLoadError={ordersLoadError}
        selectedOrders={selectedOrders}
        canSelectOrders={canSelectOrders}
        isMerchant={isMerchant}
        activeFilterCount={activeFilterCount}
        search={search}
        density={tableDensity}
        helpers={mobileListHelpers}
        onOpenOrder={onOpenOrder}
        onToggleSelection={toggleOrderSelection}
        onMarkAsViewed={onMarkAsViewed}
        onClearFilters={clearAllFilters}
        onCustomerRatingChange={handleCustomerRatingChange}
      />

      <OrdersTable
        orders={displayedOrders}
        loading={loading}
        ordersLoadError={ordersLoadError}
        selectedOrders={selectedOrders}
        canSelectOrders={canSelectOrders}
        isMerchant={isMerchant}
        activeFilterCount={activeFilterCount}
        search={search}
        columns={columnsToRender}
        columnCount={tableColumnCount}
        density={tableDensity}
        page={page}
        totalPages={totalPages}
        totalOrders={totalOrders}
        limit={limit}
        helpers={tableHelpers}
        onOpenOrder={onOpenOrder}
        onToggleSelection={toggleOrderSelection}
        onToggleAllSelection={toggleAllSelection}
        onMarkAsViewed={onMarkAsViewed}
        onClearFilters={clearAllFilters}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        onDensityChange={changeTableDensity}
        onCustomerRatingChange={handleCustomerRatingChange}
      />

      {!loading && displayedOrders.length > 0 && (
        <OrdersPagination
          variant="mobile"
          page={page}
          totalPages={totalPages}
          totalOrders={totalOrders}
          limit={limit}
          density={tableDensity}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
          onDensityChange={changeTableDensity}
        />
      )}
    </>
  );
};

export default OrdersTableSection;
