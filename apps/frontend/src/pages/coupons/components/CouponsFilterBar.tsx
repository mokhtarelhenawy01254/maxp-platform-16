import React from "react";
import { useTranslation } from "react-i18next";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { CouponFilters } from "./types";

interface CouponsFilterBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  filters: CouponFilters;
  onFiltersChange: (val: CouponFilters) => void;
  onReset: () => void;
}

export const CouponsFilterBar: React.FC<CouponsFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  onReset,
}) => {
  const { t } = useTranslation();

  const isFiltered = Boolean(
    searchQuery || filters.isActive || filters.type || filters.customerSegment,
  );

  return (
    <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2 bg-gray-50/50 dark:bg-gray-900/50">
      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("coupons.searchPlaceholder")}
            className="w-full pr-9 pl-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white transition-all"
          />
        </div>

        <select
          value={filters.isActive}
          onChange={(e) => onFiltersChange({ ...filters, isActive: e.target.value })}
          className="px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-700 dark:text-gray-200 focus:outline-none"
        >
          <option value="">{t("coupons.filterAllStatuses")}</option>
          <option value="true">{t("coupons.filterActive")}</option>
          <option value="false">{t("coupons.filterInactive")}</option>
        </select>

        <select
          value={filters.type}
          onChange={(e) => onFiltersChange({ ...filters, type: e.target.value })}
          className="px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-700 dark:text-gray-200 focus:outline-none"
        >
          <option value="">{t("coupons.filterAllTypes")}</option>
          <option value="percentage">{t("coupons.filterPercentage")}</option>
          <option value="fixed">{t("coupons.filterFixed")}</option>
          <option value="free_shipping">{t("coupons.filterFreeShipping")}</option>
        </select>

        <select
          value={filters.customerSegment}
          onChange={(e) => onFiltersChange({ ...filters, customerSegment: e.target.value })}
          className="px-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-700 dark:text-gray-200 focus:outline-none"
        >
          <option value="">{t("coupons.filterAllSegments")}</option>
          <option value="all">{t("coupons.filterAllCustomers")}</option>
          <option value="new">{t("coupons.filterNewCustomers")}</option>
          <option value="VIP">{t("coupons.filterVip")}</option>
          <option value="regular">{t("coupons.filterRegular")}</option>
        </select>
      </div>

      {isFiltered && (
        <button
          onClick={onReset}
          className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 underline px-2 py-1"
        >
          {t("coupons.filterReset")}
        </button>
      )}
    </div>
  );
};
