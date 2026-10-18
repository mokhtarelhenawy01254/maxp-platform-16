import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { FilterDrawerHeader } from "./filters/FilterDrawerHeader";
import { DateRangeFilterSection } from "./filters/DateRangeFilterSection";
import { StatusFilterSection } from "./filters/StatusFilterSection";
import { UnseenFilterSection } from "./filters/UnseenFilterSection";
import { FilterDrawerFooter } from "./filters/FilterDrawerFooter";
import { OrdersOperationsFilterSection } from "./OrdersOperationsFilterSection";
import type { MultiSelectOption } from "./MultiSelectFilter";
import type { OrdersFilters } from "../Orders";

export interface OrdersFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: OrdersFilters;
  advancedFilterCount: number;
  fieldClassName: string;
  statusOptions: MultiSelectOption[];
  paymentStatusOptions: MultiSelectOption[];
  sourceOptions: MultiSelectOption[];
  merchantOptionsList: MultiSelectOption[];
  affiliateOptionsList: MultiSelectOption[];
  fulfillmentOptions: MultiSelectOption[];
  operationOptions: MultiSelectOption[];
  settlementOptions: MultiSelectOption[];
  showOrderSourceFilter: boolean;
  showUnifiedOperationFilters: boolean;
  showMerchantOperationFilters: boolean;
  showAffiliateOperationFilter: boolean;
  hasCustomDateFilters: boolean;
  onFilterChange: (key: keyof OrdersFilters, value: OrdersFilters[keyof OrdersFilters]) => void;
  onSetQuickDate: (range: string) => void;
  onClearAdvancedFilters: () => void;
}

export const OrdersFilterDrawer: React.FC<OrdersFilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  advancedFilterCount,
  fieldClassName: _fieldClassName,
  statusOptions,
  paymentStatusOptions,
  sourceOptions,
  merchantOptionsList,
  affiliateOptionsList,
  fulfillmentOptions,
  operationOptions,
  settlementOptions,
  showOrderSourceFilter,
  showUnifiedOperationFilters,
  showMerchantOperationFilters,
  showAffiliateOperationFilter,
  hasCustomDateFilters,
  onFilterChange,
  onSetQuickDate,
  onClearAdvancedFilters,
}) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const multiSelectCommon = {
    searchPlaceholder: String(t("orders.filterSearch", { defaultValue: "بحث في الخيارات..." })),
    selectAllLabel: String(t("orders.filterSelectAll", { defaultValue: "تحديد الكل" })),
    noResultsLabel: String(t("orders.filterNoResults", { defaultValue: "لا توجد نتائج مطابقة" })),
    clearAllLabel: String(t("orders.clearAll", { defaultValue: "مسح الكل" })),
  };

  const drawerContent = (
    <div
      className="fixed inset-0 z-40 flex justify-end animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="orders-filter-drawer-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <aside className="relative z-[45] flex h-full w-full max-w-md sm:max-w-lg lg:max-w-xl flex-col border-s border-border bg-card shadow-2xl transition-transform animate-in slide-in-from-end duration-200">
        {/* Header */}
        <FilterDrawerHeader
          advancedFilterCount={advancedFilterCount}
          onClearAdvancedFilters={onClearAdvancedFilters}
          onClose={onClose}
        />

        {/* Scrollable Content Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-4 sm:px-6 py-5">
          {/* Section: Date Range */}
          <DateRangeFilterSection
            filters={filters}
            hasCustomDateFilters={hasCustomDateFilters}
            onFilterChange={onFilterChange}
            onSetQuickDate={onSetQuickDate}
          />

          {/* Section: Statuses & Sources */}
          <StatusFilterSection
            filters={filters}
            statusOptions={statusOptions}
            paymentStatusOptions={paymentStatusOptions}
            sourceOptions={sourceOptions}
            showOrderSourceFilter={showOrderSourceFilter}
            multiSelectCommon={multiSelectCommon}
            onFilterChange={onFilterChange}
          />

          {/* Section: Unified Operations & Fulfillment */}
          {showUnifiedOperationFilters && (
            <OrdersOperationsFilterSection
              filters={filters}
              merchantOptionsList={merchantOptionsList}
              affiliateOptionsList={affiliateOptionsList}
              fulfillmentOptions={fulfillmentOptions}
              operationOptions={operationOptions}
              settlementOptions={settlementOptions}
              showMerchantOperationFilters={showMerchantOperationFilters}
              showAffiliateOperationFilter={showAffiliateOperationFilter}
              multiSelectCommon={multiSelectCommon}
              onFilterChange={onFilterChange}
            />
          )}

          {/* Section: Unseen & Post-Purchase Toggles */}
          <UnseenFilterSection
            onlyUnseen={Boolean(filters.onlyUnseen)}
            onToggleUnseen={(next) => onFilterChange("onlyUnseen", next)}
            onlyPostPurchaseOffer={Boolean(filters.onlyPostPurchaseOffer)}
            onToggleOnlyPostPurchaseOffer={(next) => onFilterChange("onlyPostPurchaseOffer", next)}
          />
        </div>

        {/* Footer */}
        <FilterDrawerFooter
          advancedFilterCount={advancedFilterCount}
          onlyUnseen={Boolean(filters.onlyUnseen)}
          onlyPostPurchaseOffer={Boolean(filters.onlyPostPurchaseOffer)}
          onClearAdvancedFilters={onClearAdvancedFilters}
          onClose={onClose}
        />
      </aside>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(drawerContent, document.body) : drawerContent;
};

export default OrdersFilterDrawer;
