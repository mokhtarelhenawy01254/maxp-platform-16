import React from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import CustomerImportModal from "./CustomerImportModal";
import { useCustomerListController } from "./components/customer-list/useCustomerListController";
import { CustomerListHeader } from "./components/customer-list/CustomerListHeader";
import { CustomerListStatusTabs } from "./components/customer-list/CustomerListStatusTabs";
import { CustomerListFilterBar } from "./components/customer-list/CustomerListFilterBar";
import { CustomerBulkToolbar } from "./components/customer-list/CustomerBulkToolbar";
import { CustomerTable } from "./components/customer-list/CustomerTable";
import { CustomerListEmptyState } from "./components/customer-list/CustomerListEmptyState";

const CustomerList: React.FC = () => {
  const ctrl = useCustomerListController();

  if (ctrl.isLoading && ctrl.customers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4 sm:space-y-5">
        {/* Header */}
        <CustomerListHeader
          totalCount={ctrl.pagination.total}
          availableDiscountCount={ctrl.availableDiscountCount}
          isAdmin={ctrl.isAdmin}
          onImportClick={() => ctrl.setIsImportModalOpen(true)}
          onExportClick={ctrl.handleExport}
        />

        {/* Quick Status Tabs (Linear-style unified tray) */}
        <CustomerListStatusTabs
          currentStatus={ctrl.currentStatus}
          onStatusChange={ctrl.handleStatusTabChange}
        />

        {/* Filters */}
        <CustomerListFilterBar
          searchQuery={ctrl.searchQuery}
          onSearchChange={ctrl.setSearchQuery}
          onSearchSubmit={ctrl.handleSearch}
          showOnlyWithOrders={ctrl.showOnlyWithOrders}
          onToggleWithOrders={ctrl.handleToggleWithOrders}
          autoDiscountFilter={ctrl.autoDiscountFilter}
          onAutoDiscountChange={ctrl.handleAutoDiscountFilter}
          availableTags={ctrl.availableTags}
          selectedTag={ctrl.selectedTag}
          onTagFilterChange={ctrl.handleTagFilter}
        />

        {/* Error Message */}
        {ctrl.error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-xs sm:text-sm">
            {ctrl.error}
          </div>
        )}

        {/* Bulk Action Toolbar */}
        <CustomerBulkToolbar
          selectedCount={ctrl.selectedIds.size}
          onCancel={() => ctrl.setSelectedIds(new Set())}
        />

        {/* Customers Table */}
        {ctrl.customers.length > 0 && (
          <CustomerTable
            customers={ctrl.customers}
            selectedIds={ctrl.selectedIds}
            statusOptions={ctrl.statusOptions}
            onToggleSelectAll={ctrl.toggleSelectAll}
            onToggleSelect={ctrl.toggleSelect}
            pagination={ctrl.pagination}
            onPageChange={ctrl.handlePageChange}
          />
        )}

        {/* Empty State */}
        {!ctrl.isLoading && ctrl.customers.length === 0 && (
          <CustomerListEmptyState isAdmin={ctrl.isAdmin} />
        )}
      </div>

      {/* Import Modal */}
      <CustomerImportModal
        isOpen={ctrl.isImportModalOpen}
        onClose={() => ctrl.setIsImportModalOpen(false)}
        onSuccess={() => {
          ctrl.setIsImportModalOpen(false);
          ctrl.loadCustomers();
        }}
      />
    </>
  );
};

export default CustomerList;
