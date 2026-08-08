import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ShoppingBagIcon,
  BriefcaseIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { CommandPalette } from "../../../components/common/CommandPalette";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { Checkbox } from "../../../components/ui/checkbox";
import { FilterChips } from "./FilterChips";
import type {
  OrdersFilters,
  OrderStatusDefinition,
  MerchantFilterOption,
  AffiliateFilterOption,
} from "../Orders";

interface OrdersToolbarProps {
  filters: OrdersFilters;
  loading: boolean;
  totalOrders: number;
  activeFilterCount: number;
  advancedFilterCount: number;
  isMerchant: boolean;
  hasAgentWorkspace: boolean;
  ordersCount: number;
  page: number;
  limit: number;
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
  lastUpdatedAt: Date | null;
  isConnected: boolean;
  getAffiliateDisplayName: (affiliate: AffiliateFilterOption) => string;
  onFilterChange: (key: keyof OrdersFilters, value: OrdersFilters[keyof OrdersFilters]) => void;
  onClearAdvancedFilters: () => void;
  onToggleAdvancedFilters: () => void;
  onSetQuickDate: (range: string) => void;
  onOpenWorkspace: () => void;
  onRetry: () => void;
  onRefresh: () => void;
}

interface StatusMultiSelectProps {
  ariaLabel: string;
  placeholder: string;
  searchPlaceholder: string;
  selectAllLabel: string;
  noResultsLabel: string;
  clearAllLabel: string;
  trashLabel?: string;
  options: OrderStatusDefinition[];
  value: string[];
  onChange: (next: string[]) => void;
  fieldClassName: string;
}

const StatusMultiSelect: React.FC<StatusMultiSelectProps> = ({
  ariaLabel,
  placeholder,
  searchPlaceholder,
  selectAllLabel,
  noResultsLabel,
  clearAllLabel,
  trashLabel,
  options,
  value,
  onChange,
  fieldClassName,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const normalized = useMemo(() => {
    const rows = options.map((option) => ({
      code: option.code.toLowerCase(),
      name: option.name,
    }));
    if (trashLabel) {
      rows.push({ code: "trash", name: trashLabel });
    }
    return rows;
  }, [options, trashLabel]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter(
      (option) =>
        option.name.toLowerCase().includes(q) || option.code.includes(q),
    );
  }, [normalized, query]);

  const selectedMap = useMemo(
    () => new Set(value.map((v) => v.toLowerCase())),
    [value],
  );

  const toggle = (code: string, checked: boolean) => {
    if (checked) {
      if (!selectedMap.has(code)) onChange([...value, code]);
    } else {
      onChange(value.filter((v) => v.toLowerCase() !== code));
    }
  };

  const selectedNames = value
    .map((v) => normalized.find((option) => option.code === v.toLowerCase())?.name)
    .filter((name): name is string => Boolean(name));

  const triggerText =
    selectedNames.length === 0
      ? placeholder
      : selectedNames.length <= 2
        ? selectedNames.join("، ")
        : `${selectedNames.slice(0, 2).join("، ")} +${selectedNames.length - 2}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        className={`${fieldClassName} flex items-center justify-between gap-1.5 text-start`}
      >
        <span
          className={`truncate ${value.length === 0 ? "text-slate-400 dark:text-slate-500" : ""}`}
        >
          {triggerText}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {value.length > 0 && (
            <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
              {value.length}
            </span>
          )}
          <ChevronDownIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <div className="flex flex-col gap-2">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              aria-label={searchPlaceholder}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="theme-native-control w-full rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5 pr-8 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/15 dark:border-slate-700/80 dark:bg-slate-800/85 dark:text-slate-100"
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onChange(normalized.map((option) => option.code))}
              className="rounded-lg px-2 py-1 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
            >
              {selectAllLabel}
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="rounded-lg px-2 py-1 text-[11px] font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
            >
              {clearAllLabel}
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="px-2 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                {noResultsLabel}
              </div>
            ) : (
              visible.map((option) => {
                const isChecked = selectedMap.has(option.code);
                return (
                  <label
                    key={option.code}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => toggle(option.code, Boolean(checked))}
                      className="rounded"
                    />
                    <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                      {option.name}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const OrdersToolbar: React.FC<OrdersToolbarProps> = ({
  filters,
  loading,
  totalOrders,
  activeFilterCount,
  advancedFilterCount,
  isMerchant,
  hasAgentWorkspace,
  ordersCount,
  page,
  limit,
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
  lastUpdatedAt,
  isConnected,
  getAffiliateDisplayName,
  onFilterChange,
  onClearAdvancedFilters,
  onToggleAdvancedFilters,
  onSetQuickDate,
  onOpenWorkspace,
  onRetry,
  onRefresh,
}) => {
  const { t } = useTranslation();

  return (
    <div className="mb-3 space-y-2.5">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-200/70 bg-blue-50/80 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
              <ShoppingBagIcon className="h-4 w-4" />
              {isMerchant ? t("orders.myOrders") : t("orders.title")}
            </span>
            {!loading && (
              <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-300">
                {t("orders.totalOrdersCount", { count: totalOrders })}
              </span>
            )}
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-200/70 bg-fuchsia-50/80 px-3 py-1 text-xs font-medium text-fuchsia-700 dark:border-fuchsia-500/20 dark:bg-fuchsia-500/10 dark:text-fuchsia-200">
                <FunnelIcon className="h-3.5 w-3.5" />
                {t("orders.activeFiltersCount", { count: activeFilterCount })}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div className="flex w-full gap-1.5 sm:w-auto sm:gap-2">
            <button
              onClick={() => onFilterChange("status", [])}
              className={`relative inline-flex flex-1 sm:flex-none sm:min-w-[126px] items-center justify-center rounded-[16px] px-2 sm:px-4 py-2 text-sm font-semibold transition ${!filters.status || filters.status.length === 0
                ? "bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-300"
                : "border border-slate-200/70 bg-white/70 text-slate-500 hover:text-slate-800 dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
            >
              {t("orders.allOrders")}
            </button>
            {hasAgentWorkspace && (
              <button
                onClick={onOpenWorkspace}
                title={t('orders.workspaceSubtitle')}
                className="relative inline-flex flex-1 sm:flex-none sm:min-w-[126px] items-center justify-center gap-1.5 rounded-[16px] bg-gradient-to-r from-blue-600 to-indigo-600 px-2 sm:px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] dark:from-blue-500 dark:to-indigo-500 dark:hover:from-blue-600 dark:hover:to-indigo-600"
              >
                <BriefcaseIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{t('orders.workspaceTitle')}</span>
                <span className="sm:hidden">{t('orders.myWorkspace')}</span>
              </button>
            )}

            {!loading && (
              <div className="hidden items-center gap-2 rounded-full border border-slate-200/70 bg-white/75 px-3 py-2 text-xs font-medium text-slate-500 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-300 lg:inline-flex">
                <span>{t("orders.showing")}</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {ordersCount > 0
                    ? `${(page - 1) * limit + 1}-${Math.min(page * limit, totalOrders)}`
                    : "0"}
                </span>
                <span>{t("orders.of")} {totalOrders}</span>
              </div>
            )}
          </div>

          {/* Refresh + live indicator */}
          <div className="flex items-center gap-1.5">
            <span
              title={isConnected ? String(t("orders.liveUpdates")) : String(t("orders.offlineUpdates"))}
              className={`hidden h-2 w-2 rounded-full sm:inline-block ${isConnected
                ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]"
                : "bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.2)]"
                }`}
            />
            {lastUpdatedAt && (
              <span className="hidden text-[11px] font-medium text-slate-400 dark:text-slate-500 md:inline">
                {t("orders.lastUpdatedAt", {
                  time: lastUpdatedAt.toLocaleTimeString("ar-EG", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  }),
                })}
              </span>
            )}
            <button
              type="button"
              onClick={onRefresh}
              title={String(t("orders.refreshOrders"))}
              aria-label={String(t("orders.refreshOrders"))}
              disabled={loading}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-600 transition hover:bg-slate-50 hover:text-blue-600 disabled:opacity-60 dark:border-slate-700/80 dark:bg-slate-800/85 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-300"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Compact Filters Section */}
      <div className="rounded-[22px] border border-slate-200/70 bg-white/90 p-2 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.35)] dark:border-slate-700/70 dark:bg-slate-950/55">
        <div className="flex flex-col gap-3">
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
                aria-label={String(t("orders.searchPlaceholder"))}
                placeholder={t("orders.searchPlaceholder")}
                value={filters.search}
                onChange={(e) => onFilterChange("search", e.target.value)}
                className={`${fieldClassName} pr-10`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
              <CommandPalette />
              <button
                type="button"
                onClick={onToggleAdvancedFilters}
                className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition sm:text-sm ${showAdvancedFilters
                  ? "border-fuchsia-300/80 bg-fuchsia-50/90 text-fuchsia-700 dark:border-fuchsia-500/30 dark:bg-fuchsia-500/10 dark:text-fuchsia-200"
                  : "border-slate-200/80 bg-white/90 text-slate-700 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-800/85 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
              >
                <AdjustmentsHorizontalIcon className="h-4 w-4" />
                <span className="whitespace-nowrap">
                  {showAdvancedFilters ? t("orders.hideFilters") : t("orders.filters")}
                </span>
                {advancedFilterCount > 0 && (
                  <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-white/90 px-1.5 py-0.5 text-[11px] font-bold text-fuchsia-700 dark:bg-slate-900/80 dark:text-fuchsia-200">
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
                    <option value="thisMonth">{t("orders.thisMonth")}</option>
                    <option value="custom">{t("orders.customPeriod")}</option>
                  </select>
                </div>

                <div className="min-w-[130px] sm:flex-1 lg:min-w-0">
                  <StatusMultiSelect
                    ariaLabel={String(t("orders.allStatuses"))}
                    placeholder={String(t("orders.allStatuses"))}
                    searchPlaceholder={String(t("orders.statusSearch"))}
                    selectAllLabel={String(t("orders.statusSelectAll"))}
                    noResultsLabel={String(t("orders.statusNoResults"))}
                    clearAllLabel={String(t("orders.clearAll"))}
                    trashLabel={String(t("orders.trash"))}
                    options={filterableOrderStatuses}
                    value={filters.status}
                    onChange={(next) => onFilterChange("status", next)}
                    fieldClassName={fieldClassName}
                  />
                </div>

                <div className="relative min-w-[130px] sm:flex-1 lg:min-w-0">
                  <select
                    aria-label={String(t("orders.allPaymentStatuses"))}
                    value={filters.paymentStatus}
                    onChange={(e) =>
                      onFilterChange("paymentStatus", e.target.value)
                    }
                    className={`${fieldClassName} appearance-none text-xs sm:text-sm`}
                  >
                    <option value="">{t("orders.allPaymentStatuses")}</option>
                    {filterablePaymentStatuses.map((status) => (
                      <option
                        key={status.code}
                        value={status.code.toLowerCase()}
                      >
                        {status.name}
                      </option>
                    ))}
                  </select>
                </div>

                {showOrderSourceFilter && (
                  <div className="relative min-w-[140px] sm:flex-1 lg:min-w-0">
                    <select
                      aria-label={String(t("orders.allSources"))}
                      value={filters.sourceType}
                      onChange={(e) =>
                        onFilterChange("sourceType", e.target.value)
                      }
                      className={`${fieldClassName} appearance-none text-xs sm:text-sm`}
                    >
                      <option value="">{t("orders.allSources")}</option>
                      <option value="ai_conversation">
                        {t("orders.sourceAutoConversation")}
                      </option>
                      <option value="manual">{t("orders.sourceManual")}</option>
                      <option value="storefront">
                        {t("orders.sourceStorefront")}
                      </option>
                      <option value="woocommerce">
                        {t("orders.sourceWooCommerce")}
                      </option>
                      <option value="pos">{t("orders.sourcePOS")}</option>
                      <option value="api">{t("orders.sourceAPI")}</option>
                      <option value="import">{t("orders.sourceImport")}</option>
                      <option value="unknown">{t("orders.sourceUnknown")}</option>
                    </select>
                  </div>
                )}
              </div>

              {showUnifiedOperationFilters && (
                <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-5">
                  {showMerchantOperationFilters && (
                    <div className="relative min-w-[150px] sm:flex-1 lg:min-w-0">
                      <select
                        aria-label={String(t("orders.allMerchants"))}
                        value={filters.merchantId}
                        onChange={(e) =>
                          onFilterChange("merchantId", e.target.value)
                        }
                        className={`${fieldClassName} appearance-none text-xs sm:text-sm`}
                      >
                        <option value="">{t("orders.allMerchants")}</option>
                        {merchantOptions.map((merchantOption) => (
                          <option key={merchantOption.id} value={merchantOption.id}>
                            {merchantOption.name || merchantOption.email || merchantOption.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {showAffiliateOperationFilter && (
                    <div className="relative min-w-[150px] sm:flex-1 lg:min-w-0">
                      <select
                        aria-label={String(t("orders.allAffiliates"))}
                        value={filters.affiliateId}
                        onChange={(e) =>
                          onFilterChange("affiliateId", e.target.value)
                        }
                        className={`${fieldClassName} appearance-none text-xs sm:text-sm`}
                      >
                        <option value="">{t("orders.allAffiliates")}</option>
                        {affiliateOptions.map((affiliateOption) => (
                          <option key={affiliateOption.id} value={affiliateOption.id}>
                            {getAffiliateDisplayName(affiliateOption)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {showMerchantOperationFilters && (
                    <>
                      <div className="relative min-w-[150px] sm:flex-1 lg:min-w-0">
                        <select
                          aria-label={String(t("orders.fulfillmentSource"))}
                          value={filters.fulfillmentSource}
                          onChange={(e) =>
                            onFilterChange("fulfillmentSource", e.target.value)
                          }
                          className={`${fieldClassName} appearance-none text-xs sm:text-sm`}
                        >
                          <option value="">{t("orders.allFulfillmentSources")}</option>
                          <option value="MERCHANT">{t("orders.fromMerchant")}</option>
                          <option value="COMPANY_WAREHOUSE">{t("orders.fromCompanyWarehouse")}</option>
                        </select>
                      </div>

                      <div className="relative min-w-[150px] sm:flex-1 lg:min-w-0">
                        <select
                          aria-label={String(t("orders.merchantOperationStatus"))}
                          value={filters.merchantOperationStatus}
                          onChange={(e) =>
                            onFilterChange(
                              "merchantOperationStatus",
                              e.target.value,
                            )
                          }
                          className={`${fieldClassName} appearance-none text-xs sm:text-sm`}
                        >
                          <option value="">{t("orders.allMerchantOperationStatuses")}</option>
                          <option value="PREPARATION">{t("orders.preparation")}</option>
                          <option value="IN_SHIPPING">{t("orders.inShipping")}</option>
                          <option value="DELIVERED">{t("orders.delivered")}</option>
                          <option value="NOT_DELIVERED">{t("orders.returnedOrNotDelivered")}</option>
                        </select>
                      </div>

                      <div className="relative min-w-[150px] sm:flex-1 lg:min-w-0">
                        <select
                          aria-label={String(t("orders.merchantSettlements"))}
                          value={filters.merchantSettlementStatus}
                          onChange={(e) =>
                            onFilterChange(
                              "merchantSettlementStatus",
                              e.target.value,
                            )
                          }
                          className={`${fieldClassName} appearance-none text-xs sm:text-sm`}
                        >
                          <option value="">{t("orders.allSettlements")}</option>
                          <option value="PAYABLE">{t("orders.settlementPayable")}</option>
                          <option value="PAID">{t("orders.settlementPaid")}</option>
                          <option value="NOT_PAYABLE">{t("orders.settlementNotPayable")}</option>
                        </select>
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
