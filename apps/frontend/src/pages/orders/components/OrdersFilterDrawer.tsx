import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  SlidersHorizontal,
  Calendar,
  CheckCircle2,
  CreditCard,
  Globe,
  RotateCcw,
  Eye,
} from "lucide-react";
import { MultiSelectFilter, type MultiSelectOption } from "./MultiSelectFilter";
import { OrdersOperationsFilterSection } from "./OrdersOperationsFilterSection";
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

interface FilterSectionProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count?: number;
  onClear?: () => void;
  clearLabel?: string;
  children: React.ReactNode;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  icon: Icon,
  title,
  count,
  onClear,
  clearLabel,
  children,
}) => (
  <div className="space-y-2 rounded-2xl border border-border/70 bg-muted/20 p-3 sm:p-3.5">
    <div className="flex items-center justify-between">
      <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
        <Icon className="h-4 w-4 text-primary shrink-0" />
        {title}
      </label>
      <div className="flex items-center gap-1.5">
        {count !== undefined && count > 0 && (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary tabular-nums">
            {count}
          </span>
        )}
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {clearLabel || "مسح"}
          </button>
        )}
      </div>
    </div>
    {children}
  </div>
);

export const OrdersFilterDrawer: React.FC<OrdersFilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  advancedFilterCount,
  fieldClassName,
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
    searchPlaceholder: String(t("orders.filterSearch")),
    selectAllLabel: String(t("orders.filterSelectAll")),
    noResultsLabel: String(t("orders.filterNoResults")),
    clearAllLabel: String(t("orders.clearAll")),
    fieldClassName: "theme-native-control w-full",
  };

  return (
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
      <aside className="relative z-50 flex h-full w-full max-w-md flex-col border-s border-border bg-card shadow-2xl transition-transform animate-in slide-in-from-end duration-200 sm:max-w-lg">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-border/70 px-4 sm:px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="orders-filter-drawer-title"
                className="text-sm sm:text-base font-bold text-foreground"
              >
                {t("orders.filters")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {advancedFilterCount > 0 ? (
                  <span className="font-semibold text-primary tabular-nums">
                    {advancedFilterCount}{" "}
                    {t("orders.activeFilters", { count: advancedFilterCount }) || "فلاتر نشطة"}
                  </span>
                ) : (
                  t("orders.allOrders")
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {advancedFilterCount > 0 && (
              <button
                type="button"
                onClick={onClearAdvancedFilters}
                className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 active:scale-95 transition"
                title={t("orders.clearAdvancedFilters")}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{t("orders.clearAll")}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={String(t("common.close") || "إغلاق")}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body - Scrollable */}
        <div className="flex-1 space-y-4 overflow-y-auto px-4 sm:px-5 py-4">
          {/* Section: Date Range */}
          <FilterSection
            icon={Calendar}
            title={String(t("orders.allDates"))}
            onClear={filters.timeRange ? () => onSetQuickDate("") : undefined}
            clearLabel={String(t("orders.clearAll"))}
          >
            <select
              aria-label={String(t("orders.allDates"))}
              value={filters.timeRange}
              onChange={(e) => onSetQuickDate(e.target.value)}
              className={`${fieldClassName} w-full text-xs sm:text-sm`}
            >
              <option value="">{t("orders.allDates")}</option>
              <option value="today">{t("orders.today")}</option>
              <option value="yesterday">{t("orders.yesterday")}</option>
              <option value="last7">{t("orders.last7Days")}</option>
              <option value="last30">{t("orders.last30Days")}</option>
              <option value="last90">{t("orders.last90Days")}</option>
              <option value="last180">{t("orders.last6Months")}</option>
              <option value="last365">{t("orders.lastYear")}</option>
              <option value="thisMonth">{t("orders.thisMonth")}</option>
              <option value="thisYear">{t("orders.thisYear")}</option>
              <option value="custom">{t("orders.customPeriod")}</option>
            </select>

            {hasCustomDateFilters && (
              <div className="grid grid-cols-2 gap-2 pt-1.5">
                <div>
                  <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
                    {t("orders.fromDate")}
                  </span>
                  <input
                    type="date"
                    aria-label={String(t("orders.startDate"))}
                    value={filters.startDate}
                    onChange={(e) => {
                      onFilterChange("startDate", e.target.value);
                      if (filters.timeRange !== "custom") {
                        onFilterChange("timeRange", "custom");
                      }
                    }}
                    className={`${fieldClassName} w-full text-xs`}
                  />
                </div>
                <div>
                  <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
                    {t("orders.toDate")}
                  </span>
                  <input
                    type="date"
                    aria-label={String(t("orders.endDate"))}
                    value={filters.endDate}
                    onChange={(e) => {
                      onFilterChange("endDate", e.target.value);
                      if (filters.timeRange !== "custom") {
                        onFilterChange("timeRange", "custom");
                      }
                    }}
                    className={`${fieldClassName} w-full text-xs`}
                  />
                </div>
              </div>
            )}
          </FilterSection>

          {/* Section: Order Status */}
          <FilterSection
            icon={CheckCircle2}
            title={String(t("orders.allStatuses"))}
            count={filters.status.length}
          >
            <MultiSelectFilter
              ariaLabel={String(t("orders.allStatuses"))}
              placeholder={String(t("orders.allStatuses"))}
              options={statusOptions}
              value={filters.status}
              onChange={(next) => onFilterChange("status", next)}
              {...multiSelectCommon}
            />
          </FilterSection>

          {/* Section: Payment Status */}
          <FilterSection
            icon={CreditCard}
            title={String(t("orders.allPaymentStatuses"))}
            count={filters.paymentStatus.length}
          >
            <MultiSelectFilter
              ariaLabel={String(t("orders.allPaymentStatuses"))}
              placeholder={String(t("orders.allPaymentStatuses"))}
              options={paymentStatusOptions}
              value={filters.paymentStatus}
              onChange={(next) => onFilterChange("paymentStatus", next)}
              {...multiSelectCommon}
            />
          </FilterSection>

          {/* Section: Order Source */}
          {showOrderSourceFilter && (
            <FilterSection
              icon={Globe}
              title={String(t("orders.allSources"))}
              count={filters.sourceType.length}
            >
              <MultiSelectFilter
                ariaLabel={String(t("orders.allSources"))}
                placeholder={String(t("orders.allSources"))}
                options={sourceOptions}
                value={filters.sourceType}
                onChange={(next) => onFilterChange("sourceType", next)}
                {...multiSelectCommon}
              />
            </FilterSection>
          )}

          {/* Section: Operations, Merchants & Affiliates */}
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

          {/* Section: Unseen toggle */}
          <div className="rounded-2xl border border-border/70 bg-muted/20 p-3 sm:p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <span className="text-xs font-bold text-foreground">
                    {t("orders.unseen")}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    {t("orders.unseenHint") || "عرض الطلبات غير المقروءة فقط"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={filters.onlyUnseen}
                onClick={() => onFilterChange("onlyUnseen", !filters.onlyUnseen)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  filters.onlyUnseen ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-xs ring-0 transition duration-200 ease-in-out ${
                    filters.onlyUnseen ? "ltr:translate-x-5 rtl:-translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Sticky Footer */}
        <div className="border-t border-border/70 bg-card px-4 sm:px-5 py-3 backdrop-blur-xs">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClearAdvancedFilters}
              disabled={advancedFilterCount === 0 && !filters.onlyUnseen}
              className="inline-flex items-center justify-center rounded-xl border border-border/70 px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 active:scale-95 transition"
            >
              {t("orders.clearAdvancedFilters")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-primary px-5 py-2 text-center text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-95 transition"
            >
              {t("orders.applyFilters", { defaultValue: "تطبيق الفلاتر" })}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default OrdersFilterDrawer;
