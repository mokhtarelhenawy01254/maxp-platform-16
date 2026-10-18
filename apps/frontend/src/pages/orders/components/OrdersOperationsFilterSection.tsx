import React from "react";
import { useTranslation } from "react-i18next";
import { Truck, Store, Users, PackageCheck, Activity, DollarSign } from "lucide-react";
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
    fieldClassName?: string;
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
    <div className="space-y-3.5 rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4 shadow-xs">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
        <Truck className="h-4 w-4 text-primary shrink-0" />
        <span>{t("orders.unifiedOperations", { defaultValue: "العمليات والتنفيذ والشحن" })}</span>
      </div>

      {showMerchantOperationFilters && (
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Store className="h-3.5 w-3.5" />
            <span>{t("orders.allMerchants", { defaultValue: "التجار" })}</span>
          </label>
          <MultiSelectFilter
            ariaLabel={String(t("orders.allMerchants", { defaultValue: "كل التجار" }))}
            placeholder={String(t("orders.allMerchants", { defaultValue: "كل التجار" }))}
            options={merchantOptionsList}
            value={filters.merchantId}
            onChange={(next) => onFilterChange("merchantId", next)}
            {...multiSelectCommon}
          />
        </div>
      )}

      {showAffiliateOperationFilter && (
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{t("orders.allAffiliates", { defaultValue: "المسوقين والشركاء" })}</span>
          </label>
          <MultiSelectFilter
            ariaLabel={String(t("orders.allAffiliates", { defaultValue: "كل المسوقين" }))}
            placeholder={String(t("orders.allAffiliates", { defaultValue: "كل المسوقين" }))}
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
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <PackageCheck className="h-3.5 w-3.5" />
              <span>{t("orders.fulfillmentSource", { defaultValue: "مصدر التنفيذ" })}</span>
            </label>
            <MultiSelectFilter
              ariaLabel={String(t("orders.fulfillmentSource", { defaultValue: "مصدر التنفيذ" }))}
              placeholder={String(t("orders.allFulfillmentSources", { defaultValue: "كل مصادر التنفيذ" }))}
              options={fulfillmentOptions}
              value={filters.fulfillmentSource}
              onChange={(next) => onFilterChange("fulfillmentSource", next)}
              {...multiSelectCommon}
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              <span>{t("orders.merchantOperationStatus", { defaultValue: "حالة تشغيل التاجر" })}</span>
            </label>
            <MultiSelectFilter
              ariaLabel={String(t("orders.merchantOperationStatus", { defaultValue: "حالة تشغيل التاجر" }))}
              placeholder={String(t("orders.allMerchantOperationStatuses", { defaultValue: "كل حالات تشغيل التاجر" }))}
              options={operationOptions}
              value={filters.merchantOperationStatus}
              onChange={(next) => onFilterChange("merchantOperationStatus", next)}
              {...multiSelectCommon}
            />
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" />
              <span>{t("orders.merchantSettlements", { defaultValue: "مستحقات التاجر" })}</span>
            </label>
            <MultiSelectFilter
              ariaLabel={String(t("orders.merchantSettlements", { defaultValue: "مستحقات التاجر" }))}
              placeholder={String(t("orders.allSettlements", { defaultValue: "كل المستحقات" }))}
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

export default OrdersOperationsFilterSection;
