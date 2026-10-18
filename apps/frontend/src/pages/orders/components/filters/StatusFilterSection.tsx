import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, CreditCard, Globe } from "lucide-react";
import { MultiSelectFilter, type MultiSelectOption } from "../MultiSelectFilter";
import type { OrdersFilters } from "../../Orders";

export interface StatusFilterSectionProps {
  filters: OrdersFilters;
  statusOptions: MultiSelectOption[];
  paymentStatusOptions: MultiSelectOption[];
  sourceOptions: MultiSelectOption[];
  showOrderSourceFilter: boolean;
  multiSelectCommon: {
    searchPlaceholder: string;
    selectAllLabel: string;
    noResultsLabel: string;
    clearAllLabel: string;
    fieldClassName: string;
  };
  onFilterChange: (key: keyof OrdersFilters, value: OrdersFilters[keyof OrdersFilters]) => void;
}

export const StatusFilterSection: React.FC<StatusFilterSectionProps> = ({
  filters,
  statusOptions,
  paymentStatusOptions,
  sourceOptions,
  showOrderSourceFilter,
  multiSelectCommon,
  onFilterChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3.5">
      {/* Order Status */}
      <div className="space-y-2 rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <span>{t("orders.allStatuses", { defaultValue: "حالة الطلب" })}</span>
          </label>
          {filters.status.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary font-mono tabular-nums">
              {filters.status.length}
            </span>
          )}
        </div>
        <MultiSelectFilter
          ariaLabel={String(t("orders.allStatuses", { defaultValue: "كل الحالات" }))}
          placeholder={String(t("orders.allStatuses", { defaultValue: "كل الحالات" }))}
          options={statusOptions}
          value={filters.status}
          onChange={(next) => onFilterChange("status", next)}
          {...multiSelectCommon}
        />
      </div>

      {/* Payment Status */}
      <div className="space-y-2 rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <CreditCard className="h-4 w-4 text-primary shrink-0" />
            <span>{t("orders.allPaymentStatuses", { defaultValue: "حالة الدفع" })}</span>
          </label>
          {filters.paymentStatus.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary font-mono tabular-nums">
              {filters.paymentStatus.length}
            </span>
          )}
        </div>
        <MultiSelectFilter
          ariaLabel={String(t("orders.allPaymentStatuses", { defaultValue: "كل حالات الدفع" }))}
          placeholder={String(t("orders.allPaymentStatuses", { defaultValue: "كل حالات الدفع" }))}
          options={paymentStatusOptions}
          value={filters.paymentStatus}
          onChange={(next) => onFilterChange("paymentStatus", next)}
          {...multiSelectCommon}
        />
      </div>

      {/* Order Source */}
      {showOrderSourceFilter && (
        <div className="space-y-2 rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
              <Globe className="h-4 w-4 text-primary shrink-0" />
              <span>{t("orders.allSources", { defaultValue: "مصدر الطلب" })}</span>
            </label>
            {filters.sourceType.length > 0 && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary font-mono tabular-nums">
                {filters.sourceType.length}
              </span>
            )}
          </div>
          <MultiSelectFilter
            ariaLabel={String(t("orders.allSources", { defaultValue: "كل المصادر" }))}
            placeholder={String(t("orders.allSources", { defaultValue: "كل المصادر" }))}
            options={sourceOptions}
            value={filters.sourceType}
            onChange={(next) => onFilterChange("sourceType", next)}
            {...multiSelectCommon}
          />
        </div>
      )}
    </div>
  );
};

export default StatusFilterSection;
