import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import { CommandPalette } from "../../../components/common/CommandPalette";
import { MultiSelectFilter, type MultiSelectOption } from "./MultiSelectFilter";
import { FilterChips } from "./FilterChips";
import { SavedViews } from "./SavedViews";
import type {
  OrdersFilters,
  OrderStatusDefinition,
  MerchantFilterOption,
  AffiliateFilterOption,
} from "../Orders";

interface OrdersToolbarProps {
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
  onFilterChange: (key: keyof OrdersFilters, value: OrdersFilters[keyof OrdersFilters]) => void;
  onApplyFilters: (next: Partial<OrdersFilters>) => void;
  onClearAdvancedFilters: () => void;
  onToggleAdvancedFilters: () => void;
  onSetQuickDate: (range: string) => void;
  onRetry: () => void;
}

export const OrdersToolbar: React.FC<OrdersToolbarProps> = ({
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
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Smart order-code detection: when the typed value looks like an order
  // code (ORD-… or a long numeric code), offer one-press navigation to the
  // order details instead of filtering the list.
  const trimmedSearch = filters.search.trim();
  const looksLikeOrderCode =
    /^ORD-/i.test(trimmedSearch) || /^\d{6,}$/.test(trimmedSearch);
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && looksLikeOrderCode) {
      e.preventDefault();
      navigate(`/orders/${trimmedSearch}`);
    }
  };

  // Quick views: one-press presets for the highest-frequency filter combos.
  const quickViews = useMemo(
    () => [
      {
        key: "today",
        label: t("orders.today"),
        isActive: (f: OrdersFilters) => f.timeRange === "today",
        apply: () => onSetQuickDate("today"),
      },
      {
        key: "pending",
        label: t("orders.pending"),
        isActive: (f: OrdersFilters) =>
          f.status.length === 1 && f.status[0]?.toUpperCase() === "PENDING",
        apply: () => onFilterChange("status", ["PENDING"]),
      },
      {
        key: "processing",
        label: t("orders.processing"),
        isActive: (f: OrdersFilters) =>
          f.status.length === 1 && f.status[0]?.toUpperCase() === "PROCESSING",
        apply: () => onFilterChange("status", ["PROCESSING"]),
      },
      {
        key: "cancelled",
        label: t("orders.cancelled"),
        isActive: (f: OrdersFilters) =>
          f.status.length === 1 && f.status[0]?.toUpperCase() === "CANCELLED",
        apply: () => onFilterChange("status", ["CANCELLED"]),
      },
    ],
    [t, onSetQuickDate, onFilterChange],
  );

  const statusOptions = useMemo<MultiSelectOption[]>(
    () => [
      ...filterableOrderStatuses.map((status) => ({
        code: status.code.toLowerCase(),
        name: status.name,
        color: status.color,
      })),
      { code: "trash", name: t("orders.trash") },
    ],
    [filterableOrderStatuses, t],
  );

  const paymentStatusOptions = useMemo<MultiSelectOption[]>(
    () =>
      filterablePaymentStatuses.map((status) => ({
        code: status.code.toLowerCase(),
        name: status.name,
      })),
    [filterablePaymentStatuses],
  );

  const sourceOptions = useMemo<MultiSelectOption[]>(
    () => [
      { code: "ai_conversation", name: t("orders.sourceAutoConversation") },
      { code: "manual", name: t("orders.sourceManual") },
      { code: "storefront", name: t("orders.sourceStorefront") },
      { code: "woocommerce", name: t("orders.sourceWooCommerce") },
      { code: "pos", name: t("orders.sourcePOS") },
      { code: "api", name: t("orders.sourceAPI") },
      { code: "import", name: t("orders.sourceImport") },
      { code: "unknown", name: t("orders.sourceUnknown") },
    ],
    [t],
  );

  const fulfillmentOptions = useMemo<MultiSelectOption[]>(
    () => [
      { code: "MERCHANT", name: t("orders.fromMerchant") },
      { code: "COMPANY_WAREHOUSE", name: t("orders.fromCompanyWarehouse") },
    ],
    [t],
  );

  const operationOptions = useMemo<MultiSelectOption[]>(
    () => [
      { code: "PREPARATION", name: t("orders.preparation") },
      { code: "IN_SHIPPING", name: t("orders.inShipping") },
      { code: "DELIVERED", name: t("orders.delivered") },
      { code: "NOT_DELIVERED", name: t("orders.returnedOrNotDelivered") },
    ],
    [t],
  );

  const settlementOptions = useMemo<MultiSelectOption[]>(
    () => [
      { code: "PAYABLE", name: t("orders.settlementPayable") },
      { code: "PAID", name: t("orders.settlementPaid") },
      { code: "NOT_PAYABLE", name: t("orders.settlementNotPayable") },
    ],
    [t],
  );

  const merchantOptionsList = useMemo<MultiSelectOption[]>(
    () =>
      merchantOptions.map((merchantOption) => ({
        code: merchantOption.id,
        name: merchantOption.name || merchantOption.email || merchantOption.id,
      })),
    [merchantOptions],
  );

  const affiliateOptionsList = useMemo<MultiSelectOption[]>(
    () =>
      affiliateOptions.map((affiliateOption) => ({
        code: affiliateOption.id,
        name: getAffiliateDisplayName(affiliateOption),
      })),
    [affiliateOptions, getAffiliateDisplayName],
  );

  const multiSelectCommon = {
    searchPlaceholder: String(t("orders.filterSearch")),
    selectAllLabel: String(t("orders.filterSelectAll")),
    noResultsLabel: String(t("orders.filterNoResults")),
    clearAllLabel: String(t("orders.clearAll")),
    fieldClassName,
  };

  return (
    <div className="mb-3 space-y-2.5">
      {/* Compact Filters Section */}
      <div className="rounded-[22px] border border-slate-200/70 bg-white/90 p-2 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.35)] dark:border-slate-700/70 dark:bg-slate-950/55">
        <div className="flex flex-col gap-3">
          {/* Quick views: one-press presets for the highest-frequency filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="hidden items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 sm:inline-flex">
              <BoltIcon className="h-3.5 w-3.5" />
              {t("orders.quickViews")}
            </span>
            {quickViews.map((view) => {
              const active = view.isActive(filters);
              return (
                <button
                  key={view.key}
                  type="button"
                  onClick={view.apply}
                  className={`inline-flex min-h-[32px] items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition ${active
                    ? "border-blue-500 bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                    : "border-slate-200/80 bg-white/80 text-slate-600 hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-200"
                    }`}
                >
                  {view.label}
                </button>
              );
            })}
            <span className="mx-0.5 hidden h-5 w-px bg-slate-200 dark:bg-slate-700 sm:inline-block" />
            <SavedViews filters={filters} onApplyFilters={onApplyFilters} />
          </div>

          {ordersLoadError && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-red-200/80 bg-red-50/80 px-3 py-1.5 text-[11px] text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
              <div className="flex min-w-0 items-center gap-2">
                <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{ordersLoadError}</span>
              </div>
              <button
                onClick={onRetry}
                className="rounded-xl border border-red-200/80 px-2.5 py-1 font-semibold transition hover:bg-red-100/80 dark:border-red-500/30 dark:hover:bg-red-500/10"
              >
                {t("orders.incompleteRetry")}
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
            <div className="relative min-w-[200px] flex-1 lg:min-w-0">
              <MagnifyingGlassIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                aria-label={String(t("orders.searchPlaceholderUnified"))}
                placeholder={t("orders.searchPlaceholderUnified")}
                value={filters.search}
                onChange={(e) => onFilterChange("search", e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className={`${fieldClassName} pr-10`}
              />
              {looksLikeOrderCode && (
                <button
                  type="button"
                  onClick={() => navigate(`/orders/${trimmedSearch}`)}
                  className="absolute right-0 top-full z-20 mt-1.5 flex w-full min-w-[240px] items-center justify-between gap-2 rounded-xl border border-blue-200/80 bg-white px-3 py-2 text-sm shadow-lg shadow-slate-900/5 transition hover:bg-blue-50/70 dark:border-blue-500/30 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <span className="flex items-center gap-2 font-semibold text-blue-600 dark:text-blue-300">
                    <ArrowLeftIcon className="h-4 w-4" />
                    {t("orders.openOrderHint")}: {trimmedSearch}
                  </span>
                  <kbd className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                    ↵
                  </kbd>
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
              <CommandPalette />
              <button
                type="button"
                onClick={onToggleAdvancedFilters}
                className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition sm:text-sm ${showAdvancedFilters
                  ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "border-slate-200/80 bg-white/90 text-slate-700 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-800/85 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
              >
                <AdjustmentsHorizontalIcon className="h-4 w-4" />
                <span className="whitespace-nowrap">
                  {showAdvancedFilters ? t("orders.hideFilters") : t("orders.filters")}
                </span>
                {advancedFilterCount > 0 && (
                  <span className={`inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold ${showAdvancedFilters
                    ? "bg-white/90 text-blue-700 dark:bg-slate-900/80 dark:text-blue-200"
                    : "bg-blue-600 text-white dark:bg-blue-500 dark:text-white"
                    }`}>
                    {advancedFilterCount}
                  </span>
                )}
              </button>

              <button
                onClick={() =>
                  onFilterChange("onlyUnseen", !filters.onlyUnseen)
                }
                className={`flex min-h-[44px] min-w-[118px] items-center justify-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-semibold transition sm:text-sm ${filters.onlyUnseen
                  ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "border-slate-200/80 bg-white/90 text-slate-700 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-800/85 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
              >
                <EyeIcon className="h-4 w-4" />
                <span className="whitespace-nowrap">
                  {filters.onlyUnseen
                    ? t("orders.showAll")
                    : t("orders.unseen")}
                </span>
              </button>
            </div>
          </div>

          {!showAdvancedFilters && (advancedFilterCount > 0 || filters.onlyUnseen) && (
            <FilterChips
              filters={filters}
              filterableOrderStatuses={filterableOrderStatuses}
              filterablePaymentStatuses={filterablePaymentStatuses}
              merchantOptions={merchantOptions}
              affiliateOptions={affiliateOptions}
              onFilterChange={onFilterChange as never}
              onClearAdvancedFilters={onClearAdvancedFilters}
            />
          )}

          {showAdvancedFilters && (
            <div className="animate-in slide-in-from-top-2 flex flex-col gap-2.5 border-t border-slate-200/70 pt-2.5 duration-200 dark:border-slate-700/70">
              <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-4">
                <div className="relative min-w-[130px] sm:flex-1 lg:min-w-0">
                  <FunnelIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <select
                    aria-label={String(t("orders.allDates"))}
                    value={filters.timeRange}
                    onChange={(e) => onSetQuickDate(e.target.value)}
                    className={`${fieldClassName} appearance-none pr-8 pl-2 text-xs sm:text-sm`}
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
                </div>

                <div className="min-w-[130px] sm:flex-1 lg:min-w-0">
                  <MultiSelectFilter
                    ariaLabel={String(t("orders.allStatuses"))}
                    placeholder={String(t("orders.allStatuses"))}
                    options={statusOptions}
                    value={filters.status}
                    onChange={(next) => onFilterChange("status", next)}
                    {...multiSelectCommon}
                  />
                </div>

                <div className="min-w-[130px] sm:flex-1 lg:min-w-0">
                  <MultiSelectFilter
                    ariaLabel={String(t("orders.allPaymentStatuses"))}
                    placeholder={String(t("orders.allPaymentStatuses"))}
                    options={paymentStatusOptions}
                    value={filters.paymentStatus}
                    onChange={(next) => onFilterChange("paymentStatus", next)}
                    {...multiSelectCommon}
                  />
                </div>

                {showOrderSourceFilter && (
                  <div className="min-w-[140px] sm:flex-1 lg:min-w-0">
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
              </div>

              {showUnifiedOperationFilters && (
                <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-5">
                  {showMerchantOperationFilters && (
                    <div className="min-w-[150px] sm:flex-1 lg:min-w-0">
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
                    <div className="min-w-[150px] sm:flex-1 lg:min-w-0">
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
                      <div className="min-w-[150px] sm:flex-1 lg:min-w-0">
                        <MultiSelectFilter
                          ariaLabel={String(t("orders.fulfillmentSource"))}
                          placeholder={String(t("orders.allFulfillmentSources"))}
                          options={fulfillmentOptions}
                          value={filters.fulfillmentSource}
                          onChange={(next) => onFilterChange("fulfillmentSource", next)}
                          {...multiSelectCommon}
                        />
                      </div>

                      <div className="min-w-[150px] sm:flex-1 lg:min-w-0">
                        <MultiSelectFilter
                          ariaLabel={String(t("orders.merchantOperationStatus"))}
                          placeholder={String(t("orders.allMerchantOperationStatuses"))}
                          options={operationOptions}
                          value={filters.merchantOperationStatus}
                          onChange={(next) => onFilterChange("merchantOperationStatus", next)}
                          {...multiSelectCommon}
                        />
                      </div>

                      <div className="min-w-[150px] sm:flex-1 lg:min-w-0">
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

              {hasCustomDateFilters && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/90 px-3 py-2 dark:border-slate-700/80 dark:bg-slate-900/80">
                      <span className="whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400">
                        {t("orders.fromDate")}
                      </span>
                      <input
                        type="date"
                        aria-label={String(t("orders.startDate"))}
                        value={filters.startDate}
                        onChange={(e) => {
                          onFilterChange("startDate", e.target.value);
                          if (filters.timeRange !== "custom")
                            onFilterChange("timeRange", "custom");
                        }}
                        className="theme-native-control rounded-xl border-0 bg-transparent p-0 text-xs text-slate-700 focus:ring-0 dark:text-slate-100"
                      />
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/90 px-3 py-2 dark:border-slate-700/80 dark:bg-slate-900/80">
                      <span className="whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400">
                        {t("orders.toDate")}
                      </span>
                      <input
                        type="date"
                        aria-label={String(t("orders.endDate"))}
                        value={filters.endDate}
                        onChange={(e) => {
                          onFilterChange("endDate", e.target.value);
                          if (filters.timeRange !== "custom")
                            onFilterChange("timeRange", "custom");
                        }}
                        className="theme-native-control rounded-xl border-0 bg-transparent p-0 text-xs text-slate-700 focus:ring-0 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <button
                    onClick={onClearAdvancedFilters}
                    className="rounded-xl px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
                  >
                    {t("orders.clearAdvancedFilters")}
                  </button>
                </div>
              )}

              {!hasCustomDateFilters && advancedFilterCount > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={onClearAdvancedFilters}
                    className="rounded-xl px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
                  >
                    {t("orders.clearAdvancedFilters")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrdersToolbar;
