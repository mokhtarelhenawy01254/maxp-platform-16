import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  BoltIcon,
  XMarkIcon,
  GiftIcon,
} from "@heroicons/react/24/outline";
import { CommandPalette } from "../../../components/common/CommandPalette";
import { MultiSelectFilter, type MultiSelectOption } from "./MultiSelectFilter";
import { FilterChips } from "./FilterChips";
import { SavedViews } from "./SavedViews";
import { OrdersFilterDrawer } from "./OrdersFilterDrawer";
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
  onRefresh?: () => void;
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
  onRefresh,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [localSearch, setLocalSearch] = React.useState(filters.search);
  const [isSpinning, setIsSpinning] = React.useState(false);

  const handleRefresh = () => {
    if (onRefresh) {
      setIsSpinning(true);
      onRefresh();
      setTimeout(() => setIsSpinning(false), 700);
    }
  };

  React.useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  React.useEffect(() => {
    if (localSearch === filters.search) return;
    const timer = setTimeout(() => {
      onFilterChange("search", localSearch);
    }, 250);
    return () => clearTimeout(timer);
  }, [localSearch, filters.search, onFilterChange]);

  // Smart order-code detection: when the typed value looks like an order
  // code (ORD-… or a long numeric code), offer one-press navigation to the
  // order details instead of filtering the list.
  const trimmedSearch = localSearch.trim();
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
        key: "all",
        label: t("orders.allOrders"),
        isActive: (f: OrdersFilters) =>
          !f.timeRange && f.status.length === 0 && !f.onlyUnseen,
        apply: () => {
          onFilterChange("status", []);
          onFilterChange("timeRange", "");
          onFilterChange("onlyUnseen", false);
        },
      },
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
    <div className="mb-2 space-y-2 sm:mb-3 sm:space-y-2.5">
      {/* Filters Section: Single-surface on mobile without nested border padding, framed on desktop */}
      <div className="space-y-2 rounded-2xl border border-border/70 bg-card p-2 sm:p-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex flex-col gap-2 sm:gap-2.5">
          {/* Row 1: Unified Search & Action Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="relative min-w-0 flex-1">
              <MagnifyingGlassIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 sm:h-4.5 sm:w-4.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                aria-label={String(t("orders.searchPlaceholderUnified"))}
                placeholder={t("orders.searchPlaceholderUnified")}
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className={`${fieldClassName} h-9 sm:h-10 w-full rounded-xl border border-border/70 bg-background/80 pr-9 pl-8 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground/5 transition-all`}
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearch("");
                    onFilterChange("search", "");
                  }}
                  aria-label={String(t("common.clear", { defaultValue: "مسح" }))}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              )}
              {looksLikeOrderCode && (
                <button
                  type="button"
                  onClick={() => navigate(`/orders/${trimmedSearch}`)}
                  className="absolute right-0 top-full z-20 mt-1.5 flex w-full min-w-[240px] items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-lg shadow-black/5 transition hover:bg-muted/80 text-foreground"
                >
                  <span className="flex items-center gap-2 font-semibold text-primary">
                    <ArrowLeftIcon className="h-4 w-4" />
                    {t("orders.openOrderHint")}: {trimmedSearch}
                  </span>
                  <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    ↵
                  </kbd>
                </button>
              )}
            </div>

            <div className="hidden sm:block">
              <CommandPalette />
            </div>

            {onRefresh && (
              <button
                type="button"
                onClick={handleRefresh}
                aria-label={String(t("orders.refreshOrders"))}
                title={t("orders.refreshOrders")}
                className="inline-flex h-9 sm:h-10 w-9 sm:w-10 flex-shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/80 p-2 text-foreground transition hover:bg-muted active:scale-[0.97]"
              >
                <ArrowPathIcon className={`h-4 w-4 ${isSpinning ? "animate-spin text-primary" : "text-muted-foreground"}`} />
              </button>
            )}

            <button
              type="button"
              onClick={onToggleAdvancedFilters}
              aria-label={String(t("orders.filters"))}
              className={`inline-flex h-9 sm:h-10 flex-shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 sm:px-3 text-xs sm:text-sm font-semibold transition active:scale-[0.97] ${
                showAdvancedFilters || advancedFilterCount > 0
                  ? "border-transparent bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                  : "border-border/70 bg-background/80 text-foreground hover:bg-muted"
              }`}
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4" />
              <span className="hidden sm:inline whitespace-nowrap">
                {t("orders.filters")}
              </span>
              {advancedFilterCount > 0 && (
                <span
                  className={`inline-flex min-w-[20px] h-5 items-center justify-center rounded-full px-1 text-[11px] font-bold tabular-nums ${
                    showAdvancedFilters || advancedFilterCount > 0
                      ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                      : "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  }`}
                >
                  {advancedFilterCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onFilterChange("onlyUnseen", !filters.onlyUnseen)}
              aria-label={String(filters.onlyUnseen ? t("orders.showAll") : t("orders.unseen"))}
              title={filters.onlyUnseen ? t("orders.showAll") : t("orders.unseen")}
              className={`inline-flex h-9 sm:h-10 flex-shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 sm:px-3 text-xs sm:text-sm font-semibold transition active:scale-[0.97] ${
                filters.onlyUnseen
                  ? "border-transparent bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                  : "border-border/70 bg-background/80 text-foreground hover:bg-muted"
              }`}
            >
              <EyeIcon className="h-4 w-4" />
              <span className="hidden sm:inline whitespace-nowrap">
                {filters.onlyUnseen ? t("orders.showAll") : t("orders.unseen")}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onFilterChange("onlyPostPurchaseOffer", !filters.onlyPostPurchaseOffer)}
              aria-label={String(filters.onlyPostPurchaseOffer ? "عرض كل الطلبات" : "عروض بعد الشراء")}
              title={filters.onlyPostPurchaseOffer ? "عرض كل الطلبات" : "تصفية: طلبات عروض بعد الشراء"}
              className={`inline-flex h-9 sm:h-10 flex-shrink-0 items-center justify-center gap-1.5 rounded-xl border px-2.5 sm:px-3 text-xs sm:text-sm font-semibold transition active:scale-[0.97] ${
                filters.onlyPostPurchaseOffer
                  ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  : "border-border/70 bg-background/80 text-foreground hover:bg-muted"
              }`}
            >
              <GiftIcon className={`h-4 w-4 ${filters.onlyPostPurchaseOffer ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
              <span className="hidden sm:inline whitespace-nowrap">
                {filters.onlyPostPurchaseOffer ? "عرض الكل" : "عروض بعد الشراء"}
              </span>
            </button>
          </div>

          {/* Row 2: Status Pill Capsule Rail & Saved Views */}
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-0.5 sm:flex-wrap">
            <span className="hidden items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:inline-flex">
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
                  className={`inline-flex h-7 sm:h-8 min-h-[28px] sm:min-h-[32px] flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-lg sm:rounded-xl border px-2.5 sm:px-3 text-xs font-semibold active:scale-[0.97] transition-all duration-150 ${
                    active
                      ? "border-transparent bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                      : "border-border/60 bg-background/70 text-muted-foreground hover:text-foreground hover:bg-muted/80 hover:border-border"
                  }`}
                >
                  {view.label}
                </button>
              );
            })}
            <span className="mx-0.5 hidden h-4 w-px bg-border sm:inline-block" />
            <div className="flex-shrink-0">
              <SavedViews filters={filters} onApplyFilters={onApplyFilters} />
            </div>
          </div>

          {ordersLoadError && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200/80 bg-red-50/80 px-3 py-1.5 text-[11px] text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
              <div className="flex min-w-0 items-center gap-2">
                <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{ordersLoadError}</span>
              </div>
              <button
                onClick={onRetry}
                className="rounded-lg border border-red-200/80 px-2.5 py-1 font-semibold transition hover:bg-red-100/80 dark:border-red-500/30 dark:hover:bg-red-500/10"
              >
                {t("orders.incompleteRetry")}
              </button>
            </div>
          )}

          {(advancedFilterCount > 0 || filters.onlyUnseen) && (
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

          {/* Slide-over Side Drawer for all filters */}
          <OrdersFilterDrawer
            isOpen={showAdvancedFilters}
            onClose={onToggleAdvancedFilters}
            filters={filters}
            advancedFilterCount={advancedFilterCount}
            fieldClassName={fieldClassName}
            statusOptions={statusOptions}
            paymentStatusOptions={paymentStatusOptions}
            sourceOptions={sourceOptions}
            merchantOptionsList={merchantOptionsList}
            affiliateOptionsList={affiliateOptionsList}
            fulfillmentOptions={fulfillmentOptions}
            operationOptions={operationOptions}
            settlementOptions={settlementOptions}
            showOrderSourceFilter={showOrderSourceFilter}
            showUnifiedOperationFilters={showUnifiedOperationFilters}
            showMerchantOperationFilters={showMerchantOperationFilters}
            showAffiliateOperationFilter={showAffiliateOperationFilter}
            hasCustomDateFilters={hasCustomDateFilters}
            onFilterChange={onFilterChange}
            onSetQuickDate={onSetQuickDate}
            onClearAdvancedFilters={onClearAdvancedFilters}
          />
        </div>
      </div>
    </div>
  );
};

export default OrdersToolbar;
