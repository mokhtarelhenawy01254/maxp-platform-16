import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  CreditCardIcon,
  GlobeAltIcon,
  BuildingStorefrontIcon,
  UsersIcon,
  TruckIcon,
  ArrowPathIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { MultiSelectFilter, type MultiSelectOption } from "./MultiSelectFilter";
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

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when open
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
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <aside
        className="relative z-50 flex h-full w-full max-w-md flex-col border-s border-slate-200 bg-white shadow-2xl transition-transform animate-in slide-in-from-end duration-200 dark:border-slate-800 dark:bg-slate-950 sm:max-w-lg"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-4 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <AdjustmentsHorizontalIcon className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="orders-filter-drawer-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                {t("orders.filters")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {advancedFilterCount > 0 ? (
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {advancedFilterCount} {t("orders.activeFilters", { count: advancedFilterCount }) || "فلاتر نشطة"}
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
                className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 active:scale-95 dark:text-red-400 dark:hover:bg-red-950/30"
                title={t("orders.clearAdvancedFilters")}
              >
                <ArrowPathIcon className="h-3.5 w-3.5" />
                <span>{t("orders.clearAll")}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={String(t("common.close") || "إغلاق")}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 active:scale-95 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body - Scrollable */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Section: Date Range */}
          <div className="space-y-2 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-3.5 dark:border-slate-800/70 dark:bg-slate-900/30">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <CalendarDaysIcon className="h-4 w-4 text-blue-500" />
                {t("orders.allDates")}
              </label>
              {filters.timeRange && (
                <button
                  type="button"
                  onClick={() => onSetQuickDate("")}
                  className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {t("orders.clearAll")}
                </button>
              )}
            </div>

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
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <span className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
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
                  <span className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
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
          </div>

          {/* Section: Order Status */}
          <div className="space-y-2 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-3.5 dark:border-slate-800/70 dark:bg-slate-900/30">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
                {t("orders.allStatuses")}
              </label>
              {filters.status.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  {filters.status.length}
                </span>
              )}
            </div>
            <MultiSelectFilter
              ariaLabel={String(t("orders.allStatuses"))}
              placeholder={String(t("orders.allStatuses"))}
              options={statusOptions}
              value={filters.status}
              onChange={(next) => onFilterChange("status", next)}
              {...multiSelectCommon}
            />
          </div>

          {/* Section: Payment Status */}
          <div className="space-y-2 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-3.5 dark:border-slate-800/70 dark:bg-slate-900/30">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <CreditCardIcon className="h-4 w-4 text-purple-500" />
                {t("orders.allPaymentStatuses")}
              </label>
              {filters.paymentStatus.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  {filters.paymentStatus.length}
                </span>
              )}
            </div>
            <MultiSelectFilter
              ariaLabel={String(t("orders.allPaymentStatuses"))}
              placeholder={String(t("orders.allPaymentStatuses"))}
              options={paymentStatusOptions}
              value={filters.paymentStatus}
              onChange={(next) => onFilterChange("paymentStatus", next)}
              {...multiSelectCommon}
            />
          </div>

          {/* Section: Order Source */}
          {showOrderSourceFilter && (
            <div className="space-y-2 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-3.5 dark:border-slate-800/70 dark:bg-slate-900/30">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  <GlobeAltIcon className="h-4 w-4 text-cyan-500" />
                  {t("orders.allSources")}
                </label>
                {filters.sourceType.length > 0 && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    {filters.sourceType.length}
                  </span>
                )}
              </div>
              <MultiSelectFilter
                ariaLabel={String(t("orders.allSources"))}
                placeholder={String(t("orders.allSources"))}
                options={sourceOptions}
                value={filters.sourceType}
                onChange={(next) => onFilterChange("sourceType", next)}
                {...multiSelectCommon}
              />
            </div>
          )}

          {/* Section: Operations, Merchants & Affiliates */}
          {showUnifiedOperationFilters && (
            <div className="space-y-3.5 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-3.5 dark:border-slate-800/70 dark:bg-slate-900/30">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <TruckIcon className="h-4 w-4 text-amber-500" />
                {t("orders.unifiedOperations") || "العمليات والتنفيذ"}
              </div>

              {showMerchantOperationFilters && (
                <div className="space-y-1.5">
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    <BuildingStorefrontIcon className="h-3.5 w-3.5" />
                    {t("orders.allMerchants")}
                  </span>
                  <MultiSelectFilter
                    ariaLabel={String(t("orders.allMerchants"))}
                    placeholder={String(t("orders.allMerchants"))}
                    options={merchantOptionsList}
                    value={filters.merchantId}
                    onChange={(next) => onFilterChange("merchantId", next)}
                    {...multiSelectCommon}
                  />
                </div>
              )}

              {showAffiliateOperationFilter && (
                <div className="space-y-1.5">
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    <UsersIcon className="h-3.5 w-3.5" />
                    {t("orders.allAffiliates")}
                  </span>
                  <MultiSelectFilter
                    ariaLabel={String(t("orders.allAffiliates"))}
                    placeholder={String(t("orders.allAffiliates"))}
                    options={affiliateOptionsList}
                    value={filters.affiliateId}
                    onChange={(next) => onFilterChange("affiliateId", next)}
                    {...multiSelectCommon}
                  />
                </div>
              )}

              {showMerchantOperationFilters && (
                <>
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      {t("orders.fulfillmentSource")}
                    </span>
                    <MultiSelectFilter
                      ariaLabel={String(t("orders.fulfillmentSource"))}
                      placeholder={String(t("orders.allFulfillmentSources"))}
                      options={fulfillmentOptions}
                      value={filters.fulfillmentSource}
                      onChange={(next) => onFilterChange("fulfillmentSource", next)}
                      {...multiSelectCommon}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      {t("orders.merchantOperationStatus")}
                    </span>
                    <MultiSelectFilter
                      ariaLabel={String(t("orders.merchantOperationStatus"))}
                      placeholder={String(t("orders.allMerchantOperationStatuses"))}
                      options={operationOptions}
                      value={filters.merchantOperationStatus}
                      onChange={(next) => onFilterChange("merchantOperationStatus", next)}
                      {...multiSelectCommon}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      {t("orders.merchantSettlements")}
                    </span>
                    <MultiSelectFilter
                      ariaLabel={String(t("orders.merchantSettlements"))}
                      placeholder={String(t("orders.allSettlements"))}
                      options={settlementOptions}
                      value={filters.merchantSettlementStatus}
                      onChange={(next) => onFilterChange("merchantSettlementStatus", next)}
                      {...multiSelectCommon}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Section: Unseen toggle */}
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/50 p-3.5 dark:border-slate-800/70 dark:bg-slate-900/30">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <EyeIcon className="h-4 w-4 text-blue-500" />
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {t("orders.unseen")}
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t("orders.unseenHint") || "عرض الطلبات غير المقروءة فقط"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={filters.onlyUnseen}
                onClick={() => onFilterChange("onlyUnseen", !filters.onlyUnseen)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                  filters.onlyUnseen ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    filters.onlyUnseen ? "ltr:translate-x-5 rtl:-translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Sticky Footer */}
        <div className="border-t border-slate-200/80 bg-slate-50/90 px-5 py-3.5 backdrop-blur-xs dark:border-slate-800/80 dark:bg-slate-900/90">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                onClearAdvancedFilters();
              }}
              disabled={advancedFilterCount === 0 && !filters.onlyUnseen}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t("orders.clearAdvancedFilters")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-blue-600 px-5 py-2 text-center text-xs font-bold text-white shadow-sm shadow-blue-600/30 transition hover:bg-blue-700 active:scale-95 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {t("orders.applyFilters") || "عرض النتائج"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default OrdersFilterDrawer;
