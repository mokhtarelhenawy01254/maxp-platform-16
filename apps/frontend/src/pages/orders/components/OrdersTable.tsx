import React from "react";
import { OrdersSkeleton } from "./OrdersSkeleton";
import { OrdersEmptyState } from "./OrdersEmptyState";
import { OrdersPagination } from "./OrdersPagination";
import {
  OrdersTableHelpers,
  OrdersTableProps,
  dedupOrders,
} from "./table/ordersTableTypes";
import { OrdersTableHeader } from "./table/OrdersTableHeader";
import { OrdersTableRow } from "./table/OrdersTableRow";

export type { OrdersTableHelpers, OrdersTableProps };

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
  const isCompact = density === "compact";
  const cellPadding = isCompact ? "px-3.5 py-2" : "px-4 py-2.5";
  const headerPadding = isCompact ? "px-3.5 py-2.5" : "px-4 py-3";

  return (
    <div
      data-orders-density={density}
      className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.04)] lg:block"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <OrdersTableHeader
            canSelectOrders={canSelectOrders}
            headerPadding={headerPadding}
            columns={columns}
            orders={orders}
            selectedOrders={selectedOrders}
            onToggleAllSelection={onToggleAllSelection}
          />
          <tbody className="divide-y divide-border/40">
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
                  className="px-6 py-10 text-center text-muted-foreground"
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
              dedupOrders(orders).map((order, idx) => (
                <OrdersTableRow
                  key={order.id || order.orderNumber || idx}
                  order={order}
                  selectedOrders={selectedOrders}
                  canSelectOrders={canSelectOrders}
                  columns={columns}
                  cellPadding={cellPadding}
                  helpers={helpers}
                  onOpenOrder={onOpenOrder}
                  onToggleSelection={onToggleSelection}
                  onMarkAsViewed={onMarkAsViewed}
                />
              ))
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
