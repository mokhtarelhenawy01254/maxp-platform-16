import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

export interface FiltersState {
  searchQuery: string;
  categoryFilter: string;
  statusFilter: string;
  stockFilter: string;
  offersOnly?: string;
  priceMin: string;
  priceMax: string;
  dateFrom: string;
  dateTo: string;
  tagsFilter: string;
}

export interface ProductsFiltersProps {
  filters: FiltersState;
  categories: string[];
  allTags: string[];
  offersCount?: number;
  showAdvancedFilters: boolean;
  onFilterChange: (key: keyof FiltersState, value: string) => void;
  onToggleAdvancedFilters: () => void;
  onResetAdvancedFilters: () => void;
}

const ProductsFilters: React.FC<ProductsFiltersProps> = ({
  filters,
  categories,
  allTags,
  offersCount,
  showAdvancedFilters,
  onFilterChange,
  onToggleAdvancedFilters,
  onResetAdvancedFilters,
}) => {
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Calculate active filters count (excluding search)
  const activeCount = [
    filters.categoryFilter !== "all" ? 1 : 0,
    filters.statusFilter !== "all" ? 1 : 0,
    filters.stockFilter !== "all" ? 1 : 0,
    filters.offersOnly === "true" ? 1 : 0,
    filters.priceMin ? 1 : 0,
    filters.priceMax ? 1 : 0,
    filters.dateFrom ? 1 : 0,
    filters.dateTo ? 1 : 0,
    filters.tagsFilter ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Quick filter chips definitions
  const quickChips = [
    {
      label: isEn ? "All" : "الكل",
      isActive: filters.statusFilter === "all" && filters.stockFilter === "all" && !filters.offersOnly,
      isSpecial: false,
      icon: null,
      onClick: () => {
        onFilterChange("statusFilter", "all");
        onFilterChange("stockFilter", "all");
        onFilterChange("offersOnly", "");
      },
    },
    {
      label: isEn ? "Published" : "منشور",
      isActive: filters.statusFilter === "published",
      isSpecial: false,
      icon: null,
      onClick: () => {
        onFilterChange("statusFilter", filters.statusFilter === "published" ? "all" : "published");
      },
    },
    {
      label: isEn ? "Unpublished" : "ملغي النشر",
      isActive: filters.statusFilter === "unpublished",
      isSpecial: false,
      icon: null,
      onClick: () => {
        onFilterChange("statusFilter", filters.statusFilter === "unpublished" ? "all" : "unpublished");
      },
    },
    {
      label: (isEn ? "Quantity Offers" : "عروض الكميات") + (offersCount !== undefined && offersCount > 0 ? ` (${offersCount})` : ""),
      isActive: filters.offersOnly === "true",
      isSpecial: true,
      icon: SparklesIcon,
      onClick: () => {
        onFilterChange("offersOnly", filters.offersOnly === "true" ? "" : "true");
      },
    },
    {
      label: isEn ? "Low Stock" : "مخزون منخفض",
      isActive: filters.stockFilter === "low-stock",
      isSpecial: false,
      icon: null,
      onClick: () => {
        onFilterChange("stockFilter", filters.stockFilter === "low-stock" ? "all" : "low-stock");
      },
    },
    {
      label: isEn ? "Out of Stock" : "نفد المخزون",
      isActive: filters.stockFilter === "out-of-stock",
      isSpecial: false,
      icon: null,
      onClick: () => {
        onFilterChange("stockFilter", filters.stockFilter === "out-of-stock" ? "all" : "out-of-stock");
      },
    },
    {
      label: isEn ? "Draft" : "مسودة",
      isActive: filters.statusFilter === "draft",
      isSpecial: false,
      icon: null,
      onClick: () => {
        onFilterChange("statusFilter", filters.statusFilter === "draft" ? "all" : "draft");
      },
    },
    {
      label: isEn ? "In Review" : "قيد المراجعة",
      isActive: filters.statusFilter === "in_review",
      isSpecial: false,
      icon: null,
      onClick: () => {
        onFilterChange("statusFilter", filters.statusFilter === "in_review" ? "all" : "in_review");
      },
    },
  ];

  return (
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-xs border border-gray-200/80 dark:border-gray-700/60 p-2.5 sm:p-4 space-y-2 sm:space-y-3 animate-slide-up">
      {/* Top Search and Action Bar */}
      <div className="flex items-center gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <MagnifyingGlassIcon className={`h-4 w-4 sm:h-5 sm:w-5 absolute ${isEn ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none`} />
          <input
            type="text"
            aria-label={isEn ? "Search by product, SKU or Tag" : "البحث عن منتج أو SKU أو Tag"}
            placeholder={isEn ? "Search by name, SKU or Tag..." : "بحث بالاسم أو SKU أو Tag..."}
            value={filters.searchQuery}
            onChange={(e) => onFilterChange("searchQuery", e.target.value)}
            className={`w-full ${isEn ? "pl-9 pr-8" : "pr-9 pl-8"} py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700/80 dark:text-gray-100 dark:placeholder-gray-400 transition-all shadow-xs`}
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => onFilterChange("searchQuery", "")}
              className={`absolute ${isEn ? "right-2.5" : "left-2.5"} top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5`}
              aria-label={isEn ? "Clear search" : "مسح البحث"}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Mobile Filter Toggle Button */}
        <button
          type="button"
          onClick={() => setShowMobileFilters((v) => !v)}
          className={`md:hidden inline-flex items-center gap-1 px-3 py-1.5 border rounded-lg text-xs font-semibold transition-colors shrink-0 shadow-xs ${
            showMobileFilters || activeCount > 0
              ? "border-indigo-500 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30"
              : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          }`}
        >
          <AdjustmentsHorizontalIcon className="h-4 w-4" />
          <span>{isEn ? "Filters" : "فلاتر"}</span>
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center bg-indigo-600 text-white rounded-full h-4 w-4 text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </button>

        {/* Desktop Advanced Toggle */}
        <button
          type="button"
          onClick={onToggleAdvancedFilters}
          className={`hidden md:inline-flex items-center px-3.5 py-2 border rounded-lg text-xs font-semibold transition-colors shrink-0 shadow-xs ${
            showAdvancedFilters
              ? "border-indigo-500 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30"
              : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          }`}
        >
          <FunnelIcon className={`h-3.5 w-3.5 ${isEn ? "mr-1.5" : "ml-1.5"}`} />
          {isEn ? "Advanced Filters" : "فلاتر متقدمة"}
          {activeCount > 0 && (
            <span className={`${isEn ? "ml-1.5" : "mr-1.5"} bg-indigo-600 text-white rounded-full px-1.5 py-0.2 text-[10px] font-bold`}>
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Quick Filter Chips + Category & Stock Dropdowns (always visible, scrollable row) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
        {/* Category select — always visible */}
        {categories.length > 0 && (
          <select
            value={filters.categoryFilter}
            onChange={(e) => onFilterChange("categoryFilter", e.target.value)}
            aria-label={isEn ? "Filter by category" : "تصفية حسب الفئة"}
            className={`shrink-0 px-2.5 py-1 text-[11px] sm:text-xs font-semibold border rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
              filters.categoryFilter !== "all"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-gray-100 dark:bg-gray-700/70 text-gray-600 dark:text-gray-300 border-gray-200/50 dark:border-gray-600/50 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            <option value="all">{isEn ? "All Categories" : "جميع الفئات"}</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}

        {/* Stock select — moved up alongside Category */}
        <select
          value={filters.stockFilter}
          onChange={(e) => onFilterChange("stockFilter", e.target.value)}
          aria-label={isEn ? "Filter by stock" : "تصفية حسب المخزون"}
          className={`shrink-0 px-2.5 py-1 text-[11px] sm:text-xs font-semibold border rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
            filters.stockFilter !== "all"
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-gray-100 dark:bg-gray-700/70 text-gray-600 dark:text-gray-300 border-gray-200/50 dark:border-gray-600/50 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          <option value="all">{isEn ? "All Stock" : "جميع المخزون"}</option>
          <option value="in-stock">{isEn ? "In Stock" : "متوفر"}</option>
          <option value="low-stock">{isEn ? "Low Stock" : "مخزون منخفض"}</option>
          <option value="out-of-stock">{isEn ? "Out of Stock" : "نفد المخزون"}</option>
        </select>

        {quickChips.map((chip) => {
          const Icon = chip.icon;
          return (
            <button
              key={chip.label}
              type="button"
              onClick={chip.onClick}
              className={`inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-semibold transition-all shrink-0 ${
                chip.isActive
                  ? chip.isSpecial
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-indigo-600 text-white shadow-xs"
                  : chip.isSpecial
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/60 dark:border-emerald-800/40"
                    : "bg-gray-100 dark:bg-gray-700/70 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200/50 dark:border-gray-600/50"
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{chip.label}</span>
            </button>
          );
        })}

        {activeCount > 0 && (
          <button
            type="button"
            onClick={onResetAdvancedFilters}
            className={`whitespace-nowrap px-2 py-1 text-[11px] text-red-600 dark:text-red-400 hover:underline font-medium shrink-0 ${isEn ? "ml-1" : "mr-1"}`}
          >
            {isEn ? `Reset (${activeCount})` : `إعادة تعيين (${activeCount})`}
          </button>
        )}
      </div>

      {/* Mobile Collapsible Filter Drawer */}
      {showMobileFilters && (
        <div className="md:hidden pt-3 border-t border-gray-100 dark:border-gray-700/60 space-y-3 animate-in fade-in duration-150">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">{isEn ? "Status" : "الحالة"}</label>
              <select
                value={filters.statusFilter}
                onChange={(e) => onFilterChange("statusFilter", e.target.value)}
                aria-label={isEn ? "Filter by status" : "تصفية حسب الحالة"}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700/80 dark:text-gray-100 shadow-xs"
              >
                <option value="all">{isEn ? "All Statuses" : "جميع الحالات"}</option>
                <option value="published">{isEn ? "Published" : "منشور"}</option>
                <option value="unpublished">{isEn ? "Unpublished" : "ملغي النشر"}</option>
                <option value="draft">{isEn ? "Draft" : "مسودة"}</option>
                <option value="in_review">{isEn ? "In Review" : "قيد المراجعة"}</option>
                <option value="approved">{isEn ? "Approved" : "معتمد"}</option>
                <option value="rejected">{isEn ? "Rejected" : "مرفوض"}</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">{isEn ? "Stock" : "المخزون"}</label>
              <select
                value={filters.stockFilter}
                onChange={(e) => onFilterChange("stockFilter", e.target.value)}
                aria-label={isEn ? "Filter by stock" : "تصفية حسب المخزون"}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700/80 dark:text-gray-100 shadow-xs"
              >
                <option value="all">{isEn ? "All Stock" : "جميع المخزون"}</option>
                <option value="in-stock">{isEn ? "In Stock" : "متوفر"}</option>
                <option value="low-stock">{isEn ? "Low Stock" : "مخزون منخفض"}</option>
                <option value="out-of-stock">{isEn ? "Out of Stock" : "نفد المخزون"}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="filter-mobile-price-min" className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">{isEn ? "Price From" : "السعر من"}</label>
              <input
                id="filter-mobile-price-min"
                type="number"
                value={filters.priceMin}
                onChange={(e) => onFilterChange("priceMin", e.target.value)}
                placeholder="0"
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700/80 dark:text-gray-100 shadow-xs"
              />
            </div>
            <div>
              <label htmlFor="filter-mobile-price-max" className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">{isEn ? "Price To" : "السعر إلى"}</label>
              <input
                id="filter-mobile-price-max"
                type="number"
                value={filters.priceMax}
                onChange={(e) => onFilterChange("priceMax", e.target.value)}
                placeholder="999999"
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700/80 dark:text-gray-100 shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">{isEn ? "Tags" : "الوسوم (Tags)"}</label>
            <select
              value={filters.tagsFilter}
              onChange={(e) => onFilterChange("tagsFilter", e.target.value)}
              aria-label={isEn ? "Filter by tags" : "تصفية حسب الوسوم"}
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700/80 dark:text-gray-100 shadow-xs"
            >
              <option value="">{isEn ? "All Tags" : "جميع الـ Tags"}</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          <div className="pt-1 flex items-center justify-between">
            <button
              type="button"
              onClick={onResetAdvancedFilters}
              className="text-xs text-red-600 dark:text-red-400 font-medium"
            >
              {isEn ? "Clear All" : "مسح الكل"}
            </button>
            <button
              type="button"
              onClick={() => setShowMobileFilters(false)}
              className="text-xs bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-lg shadow-xs"
            >
              {isEn ? "Done" : "تم"}
            </button>
          </div>
        </div>
      )}

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="mt-2 pt-3 border-t border-gray-100 dark:border-gray-700/60 animate-in fade-in duration-150">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 sm:gap-3">
            <div>
              <label htmlFor="filter-status-adv" className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isEn ? "Status" : "الحالة"}
              </label>
              <select
                id="filter-status-adv"
                value={filters.statusFilter}
                onChange={(e) => onFilterChange("statusFilter", e.target.value)}
                aria-label={isEn ? "Filter by status" : "تصفية حسب الحالة"}
                className="w-full px-2.5 py-1.5 text-xs sm:text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700/80 dark:text-gray-100 shadow-xs"
              >
                <option value="all">{isEn ? "All Statuses" : "جميع الحالات"}</option>
                <option value="published">{isEn ? "Published" : "منشور"}</option>
                <option value="unpublished">{isEn ? "Unpublished" : "ملغي النشر"}</option>
                <option value="draft">{isEn ? "Draft" : "مسودة"}</option>
                <option value="in_review">{isEn ? "In Review" : "قيد المراجعة"}</option>
                <option value="approved">{isEn ? "Approved" : "معتمد"}</option>
                <option value="rejected">{isEn ? "Rejected" : "مرفوض"}</option>
              </select>
            </div>
            <div>
              <label htmlFor="filter-price-min" className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isEn ? "Price From" : "السعر من"}
              </label>
              <input
                id="filter-price-min"
                type="number"
                value={filters.priceMin}
                onChange={(e) => onFilterChange("priceMin", e.target.value)}
                placeholder="0"
                className="w-full px-2.5 py-1.5 text-xs sm:text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700/80 dark:text-gray-100 shadow-xs"
              />
            </div>
            <div>
              <label htmlFor="filter-price-max" className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isEn ? "Price To" : "السعر إلى"}
              </label>
              <input
                id="filter-price-max"
                type="number"
                value={filters.priceMax}
                onChange={(e) => onFilterChange("priceMax", e.target.value)}
                placeholder="999999"
                className="w-full px-2.5 py-1.5 text-xs sm:text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700/80 dark:text-gray-100 shadow-xs"
              />
            </div>
            <div>
              <label htmlFor="filter-date-from" className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isEn ? "From Date" : "من تاريخ"}
              </label>
              <input
                id="filter-date-from"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onFilterChange("dateFrom", e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs sm:text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700/80 dark:text-gray-100 shadow-xs"
              />
            </div>
            <div>
              <label htmlFor="filter-date-to" className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isEn ? "To Date" : "إلى تاريخ"}
              </label>
              <input
                id="filter-date-to"
                type="date"
                value={filters.dateTo}
                onChange={(e) => onFilterChange("dateTo", e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs sm:text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700/80 dark:text-gray-100 shadow-xs"
              />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isEn ? "Tags" : "الوسوم"}
              </label>
              <select
                value={filters.tagsFilter}
                onChange={(e) => onFilterChange("tagsFilter", e.target.value)}
                aria-label={isEn ? "Filter by tags" : "تصفية حسب الوسوم"}
                className="w-full px-2.5 py-1.5 text-xs sm:text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700/80 dark:text-gray-100 shadow-xs"
              >
                <option value="">{isEn ? "All Tags" : "جميع الـ Tags"}</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-2.5 flex justify-end">
            <button
              type="button"
              onClick={onResetAdvancedFilters}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
            >
              {isEn ? "Reset Filters" : "إعادة تعيين الفلاتر"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsFilters;
export type { FiltersState };

