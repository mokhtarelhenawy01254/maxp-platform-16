import React from 'react';
import {
  FiltersContentGroup,
  FiltersMobileBar,
  FiltersMobileDrawer,
  FiltersSimpleCatalogView,
  useFiltersSidebarController,
  type FiltersSidebarProps,
} from './filters-sidebar';

export const FiltersSidebar: React.FC<FiltersSidebarProps> = ({ settings }) => {
  const ctrl = useFiltersSidebarController({ settings });

  if (ctrl.hideSidebarCompletely) {
    return null;
  }

  const handleSizeChange = (size: string) => {
    const next = new URLSearchParams(ctrl.searchParams);
    if (next.get('size') === size) {
      next.delete('size');
    } else {
      next.set('size', size);
    }
    ctrl.setSearchParams(next);
  };

  const toggleSimplePanel = (panel: 'categories' | 'price') => {
    ctrl.setSimplePanels((current) => ({
      ...current,
      [panel]: !current[panel],
    }));
  };

  if (ctrl.simpleCatalog) {
    return (
      <FiltersSimpleCatalogView
        showCategories={ctrl.showCategories}
        categoryLabel={ctrl.categoryLabel}
        simplePanels={ctrl.simplePanels}
        onTogglePanel={toggleSimplePanel}
        selectedCategoryId={ctrl.selectedCategoryId}
        allProductsLabel={ctrl.allProductsLabel}
        categories={ctrl.categories}
        onCategorySelect={ctrl.handleCategorySelect}
        showPriceFilter={ctrl.showPriceFilter}
        priceLabel={ctrl.priceLabel}
        priceRangeOptions={ctrl.priceRangeOptions}
        fieldPrefix={ctrl.fieldPrefix}
        selectedPriceRange={ctrl.selectedPriceRange}
        onPriceRangeSelect={ctrl.handlePriceRangeSelect}
        clearButtonText={ctrl.clearButtonText}
        onClearFilters={ctrl.handleClearFilters}
        prefersArabicCopy={ctrl.prefersArabicCopy}
        selectedSort={ctrl.selectedSort}
        sortOptions={ctrl.sortOptions}
        onSortChange={ctrl.handleSortChange}
        themeDirection={ctrl.theme.direction}
        mobileOpen={ctrl.mobileOpen}
        setMobileOpen={ctrl.setMobileOpen}
        showMobileLabel={ctrl.showMobileLabel}
        hideMobileLabel={ctrl.hideMobileLabel}
        activeFilterCount={ctrl.activeFilterCount}
      />
    );
  }

  const contentGroup = (
    <FiltersContentGroup
      isPcHub={ctrl.isPcHub}
      isRoseBoutique={ctrl.isRoseBoutique}
      isDistrictMarket={ctrl.isDistrictMarket}
      isZenOrganic={ctrl.isZenOrganic}
      isKhemetLuxe={ctrl.isKhemetLuxe}
      sidebarBadge={ctrl.sidebarBadge}
      sidebarTitle={ctrl.sidebarTitle}
      sidebarSubtitle={ctrl.sidebarSubtitle}
      selectedCategoryLabel={ctrl.selectedCategoryLabel}
      selectedPriceLabel={ctrl.selectedPriceLabel}
      selectedSortLabel={ctrl.selectedSortLabel}
      showSearch={ctrl.showSearch}
      shellClassName={ctrl.shellClassName}
      headingClassName={ctrl.headingClassName}
      searchLabel={ctrl.searchLabel}
      searchPlaceholder={ctrl.searchPlaceholder}
      searchButtonText={ctrl.searchButtonText}
      fieldPrefix={ctrl.fieldPrefix}
      searchValue={ctrl.searchValue}
      onSearchChange={ctrl.setSearchValue}
      onSearchSubmit={ctrl.handleSearchSubmit}
      showSort={ctrl.showSort}
      sortLabel={ctrl.sortLabel}
      prefersArabicCopy={ctrl.prefersArabicCopy}
      selectedSort={ctrl.selectedSort}
      sortOptions={ctrl.sortOptions}
      onSortChange={ctrl.handleSortChange}
      showCategories={ctrl.showCategories}
      categoryLabel={ctrl.categoryLabel}
      categoryStyle={ctrl.categoryStyle}
      selectedCategoryId={ctrl.selectedCategoryId}
      allProductsLabel={ctrl.allProductsLabel}
      categories={ctrl.categories}
      isLoading={ctrl.isLoading}
      onCategorySelect={ctrl.handleCategorySelect}
      showSizeFilter={settings?.showSizeFilter}
      searchParams={ctrl.searchParams}
      onSizeChange={handleSizeChange}
      showPriceFilter={ctrl.showPriceFilter}
      priceLabel={ctrl.priceLabel}
      selectedPriceRange={ctrl.selectedPriceRange}
      priceRangeOptions={ctrl.priceRangeOptions}
      onPriceRangeSelect={ctrl.handlePriceRangeSelect}
      clearButtonText={ctrl.clearButtonText}
      onClearFilters={ctrl.handleClearFilters}
    />
  );

  return (
    <section
      className={`w-full border p-1 ${
        ctrl.isPcHub
          ? 'rounded-[1.85rem] border-[#dfe4ea] bg-[linear-gradient(180deg,#fffdf8,#f7f0dd)] shadow-[0_30px_90px_-62px_rgba(31,36,44,0.24)] lg:sticky lg:top-24'
          : ctrl.isRoseBoutique
            ? 'rounded-[1.8rem] border-[#ead8cf] bg-[linear-gradient(180deg,#fffdfa,#f8f1ee)] shadow-[0_28px_84px_-60px_rgba(76,42,44,0.2)] lg:sticky lg:top-24'
            : ctrl.isDistrictMarket
              ? 'rounded-[1.75rem] border-[#ead8cb] bg-[linear-gradient(180deg,#fffdfa,#fff6ef)] shadow-[0_28px_72px_-58px_rgba(61,37,25,0.32)] lg:sticky lg:top-24'
              : ctrl.isMarketplaceAvenue
                ? 'rounded-xl border-[#eef0f2] bg-white shadow-xs lg:sticky lg:top-24'
                : 'rounded-[var(--radius)] border-border bg-background'
      }`}
      data-testid="filters-sidebar"
    >
      {/* Mobile toggle button bar */}
      <FiltersMobileBar
        mobileOpen={ctrl.mobileOpen}
        isPcHub={ctrl.isPcHub}
        isRoseBoutique={ctrl.isRoseBoutique}
        isDistrictMarket={ctrl.isDistrictMarket}
        isKhemetLuxe={ctrl.isKhemetLuxe}
        showMobileLabel={ctrl.showMobileLabel}
        hideMobileLabel={ctrl.hideMobileLabel}
        activeFilterCount={ctrl.activeFilterCount}
        selectedCategoryId={ctrl.selectedCategoryId}
        selectedCategoryLabel={ctrl.selectedCategoryLabel}
        selectedPriceLabel={ctrl.selectedPriceLabel}
        selectedSortLabel={ctrl.selectedSortLabel}
        onToggle={() => ctrl.setMobileOpen(!ctrl.mobileOpen)}
      />

      {/* Mobile: Bottom Sheet Overlay */}
      <FiltersMobileDrawer
        mobileOpen={ctrl.mobileOpen}
        isPcHub={ctrl.isPcHub}
        isRoseBoutique={ctrl.isRoseBoutique}
        sidebarBadge={ctrl.sidebarBadge}
        mobilePanelTitle={ctrl.mobilePanelTitle}
        mobilePanelSubtitle={ctrl.mobilePanelSubtitle}
        hideMobileLabel={ctrl.hideMobileLabel}
        showMobileLabel={ctrl.showMobileLabel}
        mobileSummaryItems={ctrl.mobileSummaryItems}
        prefersArabicCopy={ctrl.prefersArabicCopy}
        mobileResetText={ctrl.mobileResetText}
        mobileApplyText={ctrl.mobileApplyText}
        onClearFilters={ctrl.handleClearFilters}
        onClose={() => ctrl.setMobileOpen(false)}
      >
        {contentGroup}
      </FiltersMobileDrawer>

      {/* Desktop: inline sidebar */}
      <div
        className={`hidden lg:block ${
          ctrl.isPcHub || ctrl.isRoseBoutique || ctrl.isDistrictMarket || ctrl.isMarketplaceAvenue
            ? 'px-4 py-4'
            : 'px-4 py-6'
        }`}
      >
        {contentGroup}
      </div>
    </section>
  );
};

export default FiltersSidebar;
