import React from "react";
import { useTranslation } from "react-i18next";
import { Truck, Store, Users } from "lucide-react";
import { MultiSelectFilter, type MultiSelectOption } from "./MultiSelectFilter";
import type { OrdersFilters } from "../Orders";

interface OrdersOperationsFilterSectionProps {
  filters: OrdersFilters;
  merchantOptionsList: MultiSelectOption[];
  affiliateOptionsList: MultiSelectOption[];
  fulfillmentOptions: MultiSelectOption[];
  operationOptions: MultiSelectOption[];
  settlementOptions: MultiSelectOption[];
  showMerchantOperationFilters: boolean;
  showAffiliateOperationFilter: boolean;
  multiSelectCommon: {
    searchPlaceholder: string;
    selectAllLabel: string;
    noResultsLabel: string;
    clearAllLabel: string;
    fieldClassName: string;
  };
  onFilterChange: (key: keyof OrdersFilters, value: OrdersFilters[keyof OrdersFilters]) => void;
}

export const OrdersOperationsFilterSection: React.FC<OrdersOperationsFilterSectionProps> = ({
  filters,
  merchantOptionsList,
  affiliateOptionsList,
  fulfillmentOptions,
  operationOptions,
  settlementOptions,
  showMerchantOperationFilters,
  showAffiliateOperationFilter,
  multiSelectCommon,
  onFilterChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-3 sm:p-3.5">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
        <Truck className="h-4 w-4 text-primary shrink-0" />
        {t("orders.unifiedOperations", { defaultValue: "العمليات والتنفيذ" })}
      </div>

      {showMerchantOperationFilters && (
        <div className="space-y-1">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <Store className="h-3.5 w-3.5" />
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
        <div className="space-y-1">
          <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
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
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground">
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

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground">
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

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground">
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
  );
};
