import React from "react";
import { useTranslation } from "react-i18next";
import {
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

interface CustomerListFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  showOnlyWithOrders: boolean;
  onToggleWithOrders: () => void;
  autoDiscountFilter: "" | "AVAILABLE" | "PRE_ACTIVATION";
  onAutoDiscountChange: (value: "" | "AVAILABLE" | "PRE_ACTIVATION") => void;
  availableTags: { name: string; count: number }[];
  selectedTag: string;
  onTagFilterChange: (tagName: string) => void;
}

export const CustomerListFilterBar: React.FC<CustomerListFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  showOnlyWithOrders,
  onToggleWithOrders,
  autoDiscountFilter,
  onAutoDiscountChange,
  availableTags,
  selectedTag,
  onTagFilterChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-zinc-900 p-3 sm:p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs">
      <div className="flex flex-col sm:flex-row gap-2.5">
        {/* Search */}
        <form onSubmit={onSearchSubmit} className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("customers.searchPlaceholder")}
              className="block w-full pr-9 pl-3 py-2 text-xs sm:text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50/50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all shadow-2xs"
            />
          </div>
        </form>

        {/* Toggle: with orders only */}
        <button
          type="button"
          onClick={onToggleWithOrders}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-150 active:scale-[0.97] shrink-0 shadow-2xs ${
            showOnlyWithOrders
              ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 font-semibold"
              : "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700"
          }`}
        >
          {showOnlyWithOrders ? (
            <ShoppingBagIcon className="h-3.5 w-3.5" />
          ) : (
            <UsersIcon className="h-3.5 w-3.5" />
          )}
          <span>
            {showOnlyWithOrders
              ? t("customers.withOrdersOnly")
              : t("customers.showAllCustomers")}
          </span>
        </button>

        {/* Auto-Discount Status Filter */}
        <select
          value={autoDiscountFilter}
          onChange={(e) =>
            onAutoDiscountChange(
              e.target.value as "" | "AVAILABLE" | "PRE_ACTIVATION",
            )
          }
          className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
        >
          <option value="">كل الخصومات</option>
          <option value="AVAILABLE">خصم متاح</option>
          <option value="PRE_ACTIVATION">قبل تفعيل النظام</option>
        </select>

        {/* Tag Filter */}
        {availableTags.length > 0 && (
          <select
            value={selectedTag}
            onChange={(e) => onTagFilterChange(e.target.value)}
            className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          >
            <option value="">{t("customers.allTags")}</option>
            {availableTags.map((tag) => (
              <option key={tag.name} value={tag.name}>
                {tag.name} ({tag.count})
              </option>
            ))}
          </select>
        )}

        {/* NPS Filter */}
        <select
          value={selectedTag.startsWith("nps_") ? selectedTag : ""}
          onChange={(e) => onTagFilterChange(e.target.value)}
          className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          title="فلترة حسب تقييم NPS"
        >
          <option value="">كل تقييمات NPS</option>
          <option value="nps_promoter">9-10 مروّج</option>
          <option value="nps_passive">7-8 محايد</option>
          <option value="nps_detractor">0-6 منتقد</option>
        </select>
      </div>
    </div>
  );
};
