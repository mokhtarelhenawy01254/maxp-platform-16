import React from 'react';
import type { Category } from '../../hooks/useCategories';
import type { CatalogSortValue } from '../../utils/catalogFilters';
import type { SidebarPriceRangeOption, SidebarPriceRangeValue } from './types';
import FiltersThemedHero from './FiltersThemedHero';
import FiltersSidebarSearch from './FiltersSidebarSearch';
import FiltersSidebarSort from './FiltersSidebarSort';
import FiltersSidebarCategories from './FiltersSidebarCategories';
import FiltersSidebarRatingAndSize from './FiltersSidebarRatingAndSize';
import FiltersSidebarPrice from './FiltersSidebarPrice';

interface FiltersContentGroupProps {
  isPcHub: boolean;
  isRoseBoutique: boolean;
  isDistrictMarket: boolean;
  isZenOrganic: boolean;
  isKhemetLuxe: boolean;
  isMarketplaceAvenue?: boolean;
  sidebarBadge: string;
  sidebarTitle: string;
  sidebarSubtitle: string;
  selectedCategoryLabel: string;
  selectedPriceLabel: string;
  selectedSortLabel: string;
  showSearch: boolean;
  shellClassName: string;
  headingClassName: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchButtonText: string;
  fieldPrefix: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  showSort: boolean;
  sortLabel: string;
  prefersArabicCopy: boolean;
  selectedSort: CatalogSortValue;
  sortOptions: Array<{ value: CatalogSortValue; label: string }>;
  onSortChange: (value: CatalogSortValue) => void;
  showCategories: boolean;
  categoryLabel: string;
  categoryStyle: 'list' | 'dropdown' | string;
  selectedCategoryId: string;
  allProductsLabel: string;
  categories: Category[];
  isLoading: boolean;
  onCategorySelect: (id: string) => void;
  showSizeFilter?: boolean;
  searchParams: URLSearchParams;
  onSizeChange: (size: string) => void;
  showPriceFilter: boolean;
  priceLabel: string;
  selectedPriceRange: SidebarPriceRangeValue | null;
  priceRangeOptions: SidebarPriceRangeOption[];
  onPriceRangeSelect: (value: SidebarPriceRangeValue) => void;
  clearButtonText: string;
  onClearFilters: () => void;
}

export const FiltersContentGroup: React.FC<FiltersContentGroupProps> = ({
  isPcHub,
  isRoseBoutique,
  isDistrictMarket,
  isZenOrganic,
  isKhemetLuxe,
  isMarketplaceAvenue = false,
  sidebarBadge,
  sidebarTitle,
  sidebarSubtitle,
  selectedCategoryLabel,
  selectedPriceLabel,
  selectedSortLabel,
  showSearch,
  shellClassName,
  headingClassName,
  searchLabel,
  searchPlaceholder,
  searchButtonText,
  fieldPrefix,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  showSort,
  sortLabel,
  prefersArabicCopy,
  selectedSort,
  sortOptions,
  onSortChange,
  showCategories,
  categoryLabel,
  categoryStyle,
  selectedCategoryId,
  allProductsLabel,
  categories,
  isLoading,
  onCategorySelect,
  showSizeFilter,
  searchParams,
  onSizeChange,
  showPriceFilter,
  priceLabel,
  selectedPriceRange,
  priceRangeOptions,
  onPriceRangeSelect,
  clearButtonText,
  onClearFilters,
}) => {
  return (
    <div
      className={
        isPcHub || isRoseBoutique || isDistrictMarket || isMarketplaceAvenue
          ? 'space-y-4'
          : 'space-y-8'
      }
      data-testid="filters-content-group"
    >
      <FiltersThemedHero
        isPcHub={isPcHub}
        isRoseBoutique={isRoseBoutique}
        isDistrictMarket={isDistrictMarket}
        sidebarBadge={sidebarBadge}
        sidebarTitle={sidebarTitle}
        sidebarSubtitle={sidebarSubtitle}
        selectedCategoryLabel={selectedCategoryLabel}
        selectedPriceLabel={selectedPriceLabel}
        selectedSortLabel={selectedSortLabel}
      />

      <FiltersSidebarSearch
        showSearch={showSearch}
        shellClassName={shellClassName}
        headingClassName={headingClassName}
        searchLabel={searchLabel}
        searchPlaceholder={searchPlaceholder}
        searchButtonText={searchButtonText}
        fieldPrefix={fieldPrefix}
        searchValue={searchValue}
        isPcHub={isPcHub}
        isRoseBoutique={isRoseBoutique}
        isDistrictMarket={isDistrictMarket}
        isMarketplaceAvenue={isMarketplaceAvenue}
        onSearchChange={onSearchChange}
        onSearchSubmit={onSearchSubmit}
      />

      <FiltersSidebarSort
        showSort={showSort}
        shellClassName={shellClassName}
        headingClassName={headingClassName}
        sortLabel={sortLabel}
        fieldPrefix={fieldPrefix}
        prefersArabicCopy={prefersArabicCopy}
        selectedSort={selectedSort}
        sortOptions={sortOptions}
        isPcHub={isPcHub}
        isRoseBoutique={isRoseBoutique}
        isDistrictMarket={isDistrictMarket}
        onSortChange={onSortChange}
      />

      <FiltersSidebarCategories
        showCategories={showCategories}
        shellClassName={shellClassName}
        headingClassName={headingClassName}
        categoryLabel={categoryLabel}
        categoryStyle={categoryStyle}
        fieldPrefix={fieldPrefix}
        prefersArabicCopy={prefersArabicCopy}
        selectedCategoryId={selectedCategoryId}
        allProductsLabel={allProductsLabel}
        categories={categories}
        isLoading={isLoading}
        isPcHub={isPcHub}
        isRoseBoutique={isRoseBoutique}
        isDistrictMarket={isDistrictMarket}
        isMarketplaceAvenue={isMarketplaceAvenue}
        onCategorySelect={onCategorySelect}
      />

      <FiltersSidebarRatingAndSize
        isZenOrganic={isZenOrganic}
        isKhemetLuxe={isKhemetLuxe}
        showSizeFilter={showSizeFilter}
        shellClassName={shellClassName}
        headingClassName={headingClassName}
        prefersArabicCopy={prefersArabicCopy}
        searchParams={searchParams}
        onSizeChange={onSizeChange}
      />

      <FiltersSidebarPrice
        showPriceFilter={showPriceFilter}
        shellClassName={shellClassName}
        priceLabel={priceLabel}
        fieldPrefix={fieldPrefix}
        prefersArabicCopy={prefersArabicCopy}
        selectedPriceRange={selectedPriceRange}
        priceRangeOptions={priceRangeOptions}
        isPcHub={isPcHub}
        isRoseBoutique={isRoseBoutique}
        isDistrictMarket={isDistrictMarket}
        isZenOrganic={isZenOrganic}
        onPriceRangeSelect={onPriceRangeSelect}
      />

      {/* Clear Filters Button */}
      <button
        type="button"
        onClick={onClearFilters}
        className={`text-sm transition-colors ${
          isPcHub
            ? 'w-full rounded-[999px] border border-[#d9dee5] bg-white px-4 py-3 font-bold text-[#1f242c] hover:border-[#facc15] hover:bg-[#fffdf5]'
            : isRoseBoutique
              ? 'w-full rounded-[999px] border border-[#ead8cf] bg-white px-4 py-3 font-bold text-[#5b4950] hover:border-[#d86b55] hover:bg-[#fff8f5]'
              : isDistrictMarket
                ? 'text-[#8c6956] hover:text-[#3d2419]'
                : 'text-muted-foreground underline underline-offset-4 hover:text-foreground'
        }`}
      >
        {clearButtonText}
      </button>
    </div>
  );
};

export default FiltersContentGroup;
