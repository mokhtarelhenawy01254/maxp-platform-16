import React from "react";
import { MagnifyingGlassIcon, FunnelIcon } from "@heroicons/react/24/outline";

interface FiltersState {
  searchQuery: string;
  categoryFilter: string;
  statusFilter: string;
  stockFilter: string;
  priceMin: string;
  priceMax: string;
  dateFrom: string;
  dateTo: string;
  tagsFilter: string;
}

interface ProductsFiltersProps {
  filters: FiltersState;
  categories: string[];
  allTags: string[];
  showAdvancedFilters: boolean;
  onFilterChange: (key: keyof FiltersState, value: string) => void;
  onToggleAdvancedFilters: () => void;
  onResetAdvancedFilters: () => void;
}

const ProductsFilters: React.FC<ProductsFiltersProps> = ({
  filters,
  categories,
  allTags,
  showAdvancedFilters,
  onFilterChange,
  onToggleAdvancedFilters,
  onResetAdvancedFilters,
}) => {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-md border border-gray-100 dark:border-gray-700/50 p-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            aria-label="البحث عن منتج أو SKU أو Tag"
            placeholder="البحث عن منتج أو SKU أو Tag..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange("searchQuery", e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 transition-all shadow-sm"
          />
        </div>

        {/* Category */}
        <select
          value={filters.categoryFilter}
          onChange={(e) => onFilterChange("categoryFilter", e.target.value)}
          aria-label="تصفية حسب الفئة"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
        >
          <option value="all">جميع الفئات</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Status */}
        <select
          value={filters.statusFilter}
          onChange={(e) => onFilterChange("statusFilter", e.target.value)}
          aria-label="تصفية حسب الحالة"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
        >
          <option value="all">جميع الحالات</option>
          <option value="draft">مسودة</option>
          <option value="in_review">قيد المراجعة</option>
          <option value="approved">معتمد</option>
          <option value="rejected">مرفوض</option>
          <option value="published">منشور</option>
        </select>

        {/* Stock */}
        <select
          value={filters.stockFilter}
          onChange={(e) => onFilterChange("stockFilter", e.target.value)}
          aria-label="تصفية حسب المخزون"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
        >
          <option value="all">جميع المخزون</option>
          <option value="in-stock">متوفر</option>
          <option value="low-stock">مخزون منخفض</option>
          <option value="out-of-stock">نفد المخزون</option>
        </select>

        {/* Advanced Toggle */}
        <button
          onClick={onToggleAdvancedFilters}
          className={`inline-flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
            showAdvancedFilters
              ? "border-indigo-500 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20"
              : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          }`}
        >
          <FunnelIcon className="h-4 w-4 ml-2" />
          فلاتر متقدمة
        </button>
      </div>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label htmlFor="filter-price-min" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                السعر من
              </label>
              <input
                id="filter-price-min"
                type="number"
                value={filters.priceMin}
                onChange={(e) => onFilterChange("priceMin", e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label htmlFor="filter-price-max" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                السعر إلى
              </label>
              <input
                id="filter-price-max"
                type="number"
                value={filters.priceMax}
                onChange={(e) => onFilterChange("priceMax", e.target.value)}
                placeholder="999999"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label htmlFor="filter-date-from" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                من تاريخ
              </label>
              <input
                id="filter-date-from"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onFilterChange("dateFrom", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label htmlFor="filter-date-to" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                إلى تاريخ
              </label>
              <input
                id="filter-date-to"
                type="date"
                value={filters.dateTo}
                onChange={(e) => onFilterChange("dateTo", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags
              </label>
              <select
                value={filters.tagsFilter}
                onChange={(e) => onFilterChange("tagsFilter", e.target.value)}
                aria-label="تصفية حسب الوسوم"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">جميع الـ Tags</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={onResetAdvancedFilters}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
            >
              إعادة تعيين الفلاتر
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsFilters;
export type { FiltersState };
