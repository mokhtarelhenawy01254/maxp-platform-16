import { useEffect, useId, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useCategories } from '../../hooks/useCategories';
import { useStorefrontSettings } from '../../hooks/useStorefrontSettings';
import { useStorefrontTheme } from '../../engine/ThemeProvider';
import {
  applyCatalogFilters,
  clearCatalogFilters,
  getCatalogSortOptions,
  getCatalogPriceRangeOptions,
  resolvePriceRangeValue,
  resolveSortValue,
  type CatalogPriceRangeValue,
} from '../../utils/catalogFilters';
import {
  extractShopStudioConfig,
  hasShopStudioConfig,
} from '../../../utils/shopPageStudioConfig';
import { isKhemetLuxeTheme } from '../../utils/navigationGuards';

import {
  getElegantLuxePriceRangeOptions,
  getKhemetLuxePriceRangeOptions,
  isShopIndexRoute,
  resolveSidebarPriceRangeValue,
  type FiltersSidebarProps,
  type SidebarPriceRangeOption,
  type SidebarPriceRangeValue,
} from './types';

export const useFiltersSidebarController = ({ settings }: FiltersSidebarProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { categories, isLoading } = useCategories();
  const { settings: storefrontSettings } = useStorefrontSettings();
  const { theme } = useStorefrontTheme();
  const prefersArabicCopy = theme.direction === 'rtl';
  const fieldPrefix = useId();
  const locale = prefersArabicCopy ? 'ar-EG' : 'en-US';

  const selectedCategoryId = searchParams.get('category') || 'all';
  const selectedSort = resolveSortValue(searchParams);
  const activeSearch = searchParams.get('search') || '';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(activeSearch);
  const [simplePanels, setSimplePanels] = useState({
    categories: true,
    price: false,
  });

  const currency =
    storefrontSettings?.storefront?.settings?.currency ||
    storefrontSettings?.company?.currency ||
    'EGP';

  const isElegantLuxe = theme.id === 'elegant-luxe';
  const isKhemetLuxe = isKhemetLuxeTheme(theme.id);
  const usesThemeSpecificPriceRanges = isElegantLuxe || isKhemetLuxe;

  const priceRangeOptions = useMemo(
    (): SidebarPriceRangeOption[] =>
      isElegantLuxe
        ? getElegantLuxePriceRangeOptions(currency, locale, theme.direction)
        : isKhemetLuxe
          ? getKhemetLuxePriceRangeOptions(currency, locale, theme.direction)
          : getCatalogPriceRangeOptions(currency, locale, theme.direction),
    [currency, isElegantLuxe, isKhemetLuxe, locale, theme.direction],
  );

  const selectedPriceRange: SidebarPriceRangeValue | null = usesThemeSpecificPriceRanges
    ? resolveSidebarPriceRangeValue(searchParams, priceRangeOptions)
    : resolvePriceRangeValue(searchParams);

  const sortOptions = useMemo(
    () => getCatalogSortOptions(theme.direction),
    [theme.direction],
  );

  const sortLabel = settings?.sortLabel || (prefersArabicCopy ? 'الترتيب' : 'Sort By');
  const categoryLabel = settings?.categoryLabel || (prefersArabicCopy ? 'الفئة' : 'Category');
  const priceLabel = settings?.priceLabel || (prefersArabicCopy ? 'السعر' : 'Price');
  const allProductsLabel = settings?.allProductsLabel || (prefersArabicCopy ? 'كل المنتجات' : 'All Products');
  const clearButtonText = settings?.clearButtonText || (prefersArabicCopy ? 'مسح الفلاتر' : 'Clear all filters');
  const showMobileLabel = settings?.showMobileLabel || (prefersArabicCopy ? 'إظهار الفلاتر' : 'Show Filters');
  const hideMobileLabel = settings?.hideMobileLabel || (prefersArabicCopy ? 'إخفاء الفلاتر' : 'Hide Filters');
  const showSearch = settings?.showSearch === true;
  const searchLabel = settings?.searchLabel || (prefersArabicCopy ? 'البحث' : 'Search');
  const searchPlaceholder = settings?.searchPlaceholder || (prefersArabicCopy ? 'ابحث داخل المنتجات' : 'Search products');
  const searchButtonText = settings?.searchButtonText || (prefersArabicCopy ? 'بحث' : 'Search');

  const isShopPage = isShopIndexRoute(location.pathname);
  const hasCustomShopStudio =
    isShopPage && hasShopStudioConfig(storefrontSettings?.storefront);
  const shopStudioConfig = hasCustomShopStudio
    ? extractShopStudioConfig(storefrontSettings?.storefront)
    : null;

  const showSort =
    typeof settings?.showSort === 'boolean'
      ? settings.showSort
      : hasCustomShopStudio
        ? shopStudioConfig?.filters.showSort !== false
        : true;

  const showCategories =
    typeof settings?.showCategories === 'boolean'
      ? settings.showCategories
      : hasCustomShopStudio
        ? shopStudioConfig?.filters.showCategories !== false
        : true;

  const showPriceFilter =
    typeof settings?.showPriceFilter === 'boolean'
      ? settings.showPriceFilter
      : hasCustomShopStudio
        ? shopStudioConfig?.filters.showPriceFilter !== false
        : true;

  const simpleCatalog = settings?.simpleCatalog === true;
  const categoryStyle =
    typeof settings?.categoryStyle === 'string'
      ? settings.categoryStyle
      : hasCustomShopStudio
        ? shopStudioConfig?.filters.categoryStyle || 'list'
        : 'list';

  const hideSidebarCompletely =
    hasCustomShopStudio &&
    shopStudioConfig?.layout.sidebarPosition === 'none';

  const isZenOrganic = theme.id === 'zen-organic';
  const isDistrictMarket = theme.id === 'district-market';
  const isPcHub = theme.id === 'pc-hub-eg';
  const isRoseBoutique = theme.id === 'rose-boutique-eg';
  const isMarketplaceAvenue =
    theme.id === 'marketplace-avenue' ||
    theme.id === 'marketplace-avenue-ar' ||
    Boolean(theme.id?.startsWith('marketplace-avenue'));

  const sidebarTitle =
    settings?.title ||
    (isPcHub
      ? 'صفِّ النتائج بهدوء'
      : isRoseBoutique
        ? 'رف هادئ للتصفية'
        : prefersArabicCopy
          ? 'فلترة النتائج'
          : 'Refine Results');

  const sidebarSubtitle =
    settings?.subtitle ||
    (isPcHub
      ? 'اختصر الطريق: اختر القسم أو الميزانية هنا، واترك المقارنة السريعة للرف الرئيسي.'
      : isRoseBoutique
        ? 'ابدئي بالقسم أو الميزانية، ثم اتركي الشبكة أخف وأوضح من غير تشويش بصري.'
        : prefersArabicCopy
          ? 'فلترة أسرع حسب الفئة والسعر والترتيب.'
          : 'Refine the catalog by category, price, and sorting.');

  const sidebarBadge =
    settings?.badge ||
    (isPcHub
      ? 'تصفية أدق'
      : isRoseBoutique
        ? 'تصفية هادئة'
        : prefersArabicCopy
          ? 'فلترة'
          : 'Filters');

  const mobilePanelTitle =
    settings?.mobileTitle ||
    (isPcHub
      ? 'لوحة التصفية السريعة'
      : isRoseBoutique
        ? 'دليل التصفية الهادئة'
        : prefersArabicCopy
          ? 'لوحة التصفية'
          : 'Filter panel');

  const mobilePanelSubtitle =
    settings?.mobileSubtitle ||
    (isPcHub
      ? 'راجع القسم والميزانية والفرز من شاشة واحدة ثم ارجع مباشرة لرف المقارنة.'
      : isRoseBoutique
        ? 'راجعي القسم والميزانية ثم عودي مباشرة إلى الرف من غير دوران زائد.'
        : prefersArabicCopy
          ? 'عدّل الترتيب والفئة والسعر ثم اعرض المنتجات.'
          : 'Adjust sorting, category, and price before returning to the catalog.');

  const mobileApplyText =
    settings?.mobileApplyText ||
    (isPcHub
      ? 'اعرض المنتجات'
      : isRoseBoutique
        ? 'اعرضي القطع'
        : prefersArabicCopy
          ? 'تطبيق الفلاتر'
          : 'Apply filters');

  const mobileResetText =
    settings?.mobileResetText ||
    (isPcHub
      ? 'ابدأ من جديد'
      : isRoseBoutique
        ? 'امسحي الاختيارات'
        : prefersArabicCopy
          ? 'مسح الكل'
          : 'Reset all');

  useEffect(() => {
    setSearchValue(activeSearch);
  }, [activeSearch]);

  const handleCategorySelect = (id: string) => {
    setSearchParams(
      applyCatalogFilters(searchParams, {
        categoryId: id === 'all' ? null : id,
      }),
    );
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchParams(
      applyCatalogFilters(searchParams, {
        searchTerm: searchValue.trim() || null,
      }),
    );
  };

  const handleClearFilters = () => {
    setSearchValue('');
    setSearchParams((prev) => clearCatalogFilters(prev));
  };

  const handlePriceRangeSelect = (value: SidebarPriceRangeValue) => {
    if (usesThemeSpecificPriceRanges) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('minPrice');
      nextParams.delete('maxPrice');

      if (selectedPriceRange !== value) {
        const selectedOption = priceRangeOptions.find((range) => range.value === value);
        if (selectedOption?.minPrice !== undefined) {
          nextParams.set('minPrice', String(selectedOption.minPrice));
        }
        if (selectedOption?.maxPrice !== undefined) {
          nextParams.set('maxPrice', String(selectedOption.maxPrice));
        }
      }

      setSearchParams(nextParams);
      return;
    }

    setSearchParams(
      applyCatalogFilters(searchParams, {
        priceRangeValue:
          selectedPriceRange === value ? null : (value as CatalogPriceRangeValue),
      }),
    );
  };

  const handleSortChange = (sortValue: typeof selectedSort) => {
    setSearchParams(
      applyCatalogFilters(searchParams, {
        sortValue,
      }),
    );
  };

  const selectedSortLabel =
    sortOptions.find((opt) => opt.value === selectedSort)?.label ||
    (prefersArabicCopy ? 'الترتيب المقترح' : 'Recommended');

  const selectedCategoryLabel =
    selectedCategoryId === 'all'
      ? allProductsLabel
      : categories.find((cat) => cat.id === selectedCategoryId)?.name || allProductsLabel;

  const selectedPriceLabel =
    selectedPriceRange !== null
      ? priceRangeOptions.find((range) => range.value === selectedPriceRange)?.label ||
        (prefersArabicCopy ? 'ميزانية مخصصة' : 'Custom Budget')
      : prefersArabicCopy
        ? 'أي ميزانية'
        : 'Any Budget';

  const shellClassName = isPcHub
    ? 'rounded-[1.3rem] border border-[#d9dee5] bg-white/88 p-4 shadow-[0_20px_50px_-42px_rgba(31,36,44,0.18)]'
    : isRoseBoutique
      ? 'rounded-[1.3rem] border border-[#ead8cf] bg-[rgba(255,255,255,0.88)] p-4 shadow-[0_22px_58px_-48px_rgba(76,42,44,0.18)]'
      : isDistrictMarket
        ? 'rounded-[1.3rem] border border-[#eddcd0] bg-white/84 p-4'
        : isMarketplaceAvenue
          ? 'rounded-[8px] border border-[#f0f0f0] bg-white p-4 shadow-xs'
          : '';

  const headingClassName = isPcHub
    ? 'mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#6d717c]'
    : isRoseBoutique
      ? 'mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#a26c73]'
      : isDistrictMarket
        ? 'mb-3 text-[11px] font-black tracking-[0.22em] text-[#8c6956]'
        : isMarketplaceAvenue
          ? 'mb-3 text-[14px] font-semibold text-[#333333] border-b border-[#f0f0f0] pb-2'
          : 'mb-3 text-sm font-semibold tracking-wide text-foreground';

  const activeFilterCount = [
    activeSearch ? 1 : 0,
    selectedCategoryId !== 'all' ? 1 : 0,
    selectedPriceRange !== null ? 1 : 0,
    selectedSort !== 'featured' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const mobileSummaryItems = [
    {
      label: prefersArabicCopy ? 'القسم' : 'Category',
      value: selectedCategoryLabel,
      active: selectedCategoryId !== 'all',
    },
    {
      label: prefersArabicCopy ? 'السعر' : 'Price',
      value: selectedPriceLabel,
      active: selectedPriceRange !== null,
    },
    {
      label: prefersArabicCopy ? 'الفرز' : 'Sort',
      value: selectedSortLabel,
      active: selectedSort !== 'featured',
    },
  ];

  return {
    fieldPrefix,
    theme,
    prefersArabicCopy,
    searchParams,
    setSearchParams,
    categories,
    isLoading,
    mobileOpen,
    setMobileOpen,
    searchValue,
    setSearchValue,
    simplePanels,
    setSimplePanels,
    hideSidebarCompletely,
    isZenOrganic,
    isDistrictMarket,
    isPcHub,
    isRoseBoutique,
    isMarketplaceAvenue,
    isKhemetLuxe,
    isElegantLuxe,
    simpleCatalog,
    showSearch,
    searchLabel,
    searchPlaceholder,
    searchButtonText,
    showSort,
    sortLabel,
    sortOptions,
    selectedSort,
    showCategories,
    categoryLabel,
    categoryStyle,
    selectedCategoryId,
    allProductsLabel,
    showPriceFilter,
    priceLabel,
    priceRangeOptions,
    selectedPriceRange,
    sidebarTitle,
    sidebarSubtitle,
    sidebarBadge,
    mobilePanelTitle,
    mobilePanelSubtitle,
    mobileApplyText,
    mobileResetText,
    clearButtonText,
    showMobileLabel,
    hideMobileLabel,
    selectedSortLabel,
    selectedCategoryLabel,
    selectedPriceLabel,
    shellClassName,
    headingClassName,
    activeFilterCount,
    mobileSummaryItems,
    handleCategorySelect,
    handleSearchSubmit,
    handleClearFilters,
    handlePriceRangeSelect,
    handleSortChange,
  };
};

export type FiltersSidebarController = ReturnType<typeof useFiltersSidebarController>;
