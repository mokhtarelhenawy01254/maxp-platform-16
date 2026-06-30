import React, { useEffect, useId, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import { useStorefrontSettings } from '../hooks/useStorefrontSettings';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import {
  applyCatalogFilters,
  clearCatalogFilters,
  getCatalogSortOptions,
  getCatalogPriceRangeOptions,
  resolvePriceRangeValue,
  resolveSortValue,
  type CatalogPriceRangeValue,
} from '../utils/catalogFilters';
import { formatStorefrontCurrency } from '../utils/currency';
import {
  extractShopStudioConfig,
  hasShopStudioConfig,
} from '../../utils/shopPageStudioConfig';
import { isKhemetLuxeTheme } from '../utils/navigationGuards';

interface FiltersSidebarProps {
  settings?: {
    title?: string;
    subtitle?: string;
    badge?: string;
    mobileTitle?: string;
    mobileSubtitle?: string;
    mobileApplyText?: string;
    mobileResetText?: string;
    showSearch?: boolean;
    searchLabel?: string;
    searchPlaceholder?: string;
    searchButtonText?: string;
    showSort?: boolean;
    sortLabel?: string;
    showCategories?: boolean;
    categoryLabel?: string;
    showPriceFilter?: boolean;
    simpleCatalog?: boolean;
    categoryStyle?: 'list' | 'dropdown';
    priceLabel?: string;
    allProductsLabel?: string;
    clearButtonText?: string;
    showMobileLabel?: string;
    hideMobileLabel?: string;
    [key: string]: unknown;
  };
}

const isShopIndexRoute = (pathname: string): boolean =>
  pathname.replace(/\/+$/, '').endsWith('/shop');

type ElegantLuxePriceRangeValue =
  | 'under-1500'
  | '1500-3000'
  | '3000-4500'
  | 'over-4500';

type KhemetLuxePriceRangeValue =
  | 'under-2000'
  | '2000-2500'
  | '2500-3000'
  | 'over-3000';

type SidebarPriceRangeValue =
  | CatalogPriceRangeValue
  | ElegantLuxePriceRangeValue
  | KhemetLuxePriceRangeValue;

interface SidebarPriceRangeOption {
  value: SidebarPriceRangeValue;
  label: string;
  minPrice?: number;
  maxPrice?: number;
}

const ELEGANT_LUXE_PRICE_RANGES: Array<{
  value: ElegantLuxePriceRangeValue;
  minPrice?: number;
  maxPrice?: number;
}> = [
  { value: 'under-1500', maxPrice: 1500 },
  { value: '1500-3000', minPrice: 1500, maxPrice: 3000 },
  { value: '3000-4500', minPrice: 3000, maxPrice: 4500 },
  { value: 'over-4500', minPrice: 4500 },
];

const KHEMET_LUXE_PRICE_RANGES: Array<{
  value: KhemetLuxePriceRangeValue;
  minPrice?: number;
  maxPrice?: number;
}> = [
  { value: 'under-2000', maxPrice: 2000 },
  { value: '2000-2500', minPrice: 2000, maxPrice: 2500 },
  { value: '2500-3000', minPrice: 2500, maxPrice: 3000 },
  { value: 'over-3000', minPrice: 3000 },
];

const formatPriceRangeLabel = (
  option: Pick<SidebarPriceRangeOption, 'minPrice' | 'maxPrice'>,
  currency: string,
  locale: string,
  direction: 'rtl' | 'ltr',
) => {
  if (option.minPrice === undefined && option.maxPrice !== undefined) {
    return direction === 'rtl'
      ? `أقل من ${formatStorefrontCurrency(option.maxPrice, currency, locale)}`
      : `Under ${formatStorefrontCurrency(option.maxPrice, currency, locale)}`;
  }

  if (option.minPrice !== undefined && option.maxPrice !== undefined) {
    return `${formatStorefrontCurrency(option.minPrice, currency, locale)} - ${formatStorefrontCurrency(option.maxPrice, currency, locale)}`;
  }

  if (option.minPrice !== undefined) {
    return direction === 'rtl'
      ? `أكثر من ${formatStorefrontCurrency(option.minPrice, currency, locale)}`
      : `Over ${formatStorefrontCurrency(option.minPrice, currency, locale)}`;
  }

  return '';
};

const parsePriceParam = (value: string | null): number | null => {
  if (value === null || value.trim() === '') {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const getElegantLuxePriceRangeOptions = (
  currency: string,
  locale: string,
  direction: 'rtl' | 'ltr',
): SidebarPriceRangeOption[] =>
  ELEGANT_LUXE_PRICE_RANGES.map((option) => ({
    ...option,
    label: formatPriceRangeLabel(option, currency, locale, direction),
  }));

const getKhemetLuxePriceRangeOptions = (
  currency: string,
  locale: string,
  direction: 'rtl' | 'ltr',
): SidebarPriceRangeOption[] =>
  KHEMET_LUXE_PRICE_RANGES.map((option) => ({
    ...option,
    label: formatPriceRangeLabel(option, currency, locale, direction),
  }));

const resolveSidebarPriceRangeValue = (
  searchParams: URLSearchParams,
  options: SidebarPriceRangeOption[],
): SidebarPriceRangeValue | null => {
  const minPrice = parsePriceParam(searchParams.get('minPrice'));
  const maxPrice = parsePriceParam(searchParams.get('maxPrice'));
  const match = options.find(
    (option) =>
      (option.minPrice ?? null) === minPrice && (option.maxPrice ?? null) === maxPrice,
  );

  return match?.value ?? null;
};

const FiltersSidebar: React.FC<FiltersSidebarProps> = ({ settings }) => {
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
  
  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>([0, 1000]);

  useEffect(() => {
    setSearchValue(activeSearch);
  }, [activeSearch]);

  if (hideSidebarCompletely) {
    return null;
  }

  const handleCategorySelect = (id: string) => {
    setSearchParams(applyCatalogFilters(searchParams, {
      categoryId: id === 'all' ? null : id,
    }));
  };

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchParams(applyCatalogFilters(searchParams, {
      searchTerm: searchValue.trim() || null,
    }));
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

    setSearchParams(applyCatalogFilters(searchParams, {
      priceRangeValue:
        selectedPriceRange === value ? null : (value as CatalogPriceRangeValue),
    }));
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
      : '';
  const headingClassName = isPcHub
    ? 'mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#6d717c]'
    : isRoseBoutique
      ? 'mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#a26c73]'
    : isDistrictMarket
      ? 'mb-3 text-[11px] font-black tracking-[0.22em] text-[#8c6956]'
      : 'mb-3 text-sm font-semibold tracking-wide text-foreground';

  const filterContent = (
    <div className={isPcHub || isRoseBoutique ? 'space-y-4' : isDistrictMarket ? 'space-y-4' : 'space-y-8'}>
      {isPcHub ? (
        <div className="rounded-[1.45rem] border border-[#d9dee5] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,242,222,0.95))] p-4 shadow-[0_26px_70px_-56px_rgba(31,36,44,0.26)]">
          <span className="inline-flex rounded-full border border-[#1f242c]/10 bg-[#1f242c] px-3 py-1 text-[11px] font-black tracking-[0.22em] text-[#fff4d1]">
            {sidebarBadge}
          </span>
          <h3 className="mt-3 font-heading text-[1.35rem] font-black tracking-tight text-[#1f242c]">
            {sidebarTitle}
          </h3>
          <p className="mt-2 text-sm leading-7 text-[#646b77]">
            {sidebarSubtitle}
          </p>
          <div className="mt-4 grid gap-2">
            <div className="rounded-[1rem] border border-[#d9dee5] bg-white px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c818b]">
                القسم الحالي
              </p>
              <p className="mt-1 text-sm font-black text-[#1f242c]">
                {selectedCategoryLabel}
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#d9dee5] bg-white px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c818b]">
                الميزانية
              </p>
              <p dir="ltr" className="mt-1 text-sm font-black text-[#1f242c]">
                {selectedPriceLabel}
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#eadfb8] bg-[#fff8e2] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8f6f00]">
                حالة الفرز
              </p>
              <p className="mt-1 text-sm font-black text-[#4c3d00]">
                {selectedSortLabel}
              </p>
            </div>
          </div>
        </div>
      ) : isRoseBoutique ? (
        <div className="rounded-[1.45rem] border border-[#ead8cf] bg-[linear-gradient(180deg,rgba(255,253,251,0.98),rgba(250,244,240,0.98))] p-4 shadow-[0_28px_72px_-58px_rgba(76,42,44,0.22)]">
          <span className="inline-flex rounded-full border border-[#f0e2db] bg-white px-3 py-1 text-[11px] font-black tracking-[0.22em] text-[#8f4d41]">
            {sidebarBadge}
          </span>
          <h3 className="mt-3 font-heading text-[1.3rem] font-black tracking-tight text-[#3d2a2f]">
            {sidebarTitle}
          </h3>
          <p className="mt-2 text-sm leading-7 text-[#7a6268]">
            {sidebarSubtitle}
          </p>
          <div className="mt-4 grid gap-2">
            <div className="rounded-[1rem] border border-[#f0e2db] bg-white px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#a26c73]">
                القسم المفتوح
              </p>
              <p className="mt-1 text-sm font-black text-[#3d2a2f]">
                {selectedCategoryLabel}
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#f0e2db] bg-white px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#a26c73]">
                الميزانية
              </p>
              <p dir="ltr" className="mt-1 text-sm font-black text-[#3d2a2f]">
                {selectedPriceLabel}
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#f0e2db] bg-[#fff8f5] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#a26c73]">
                اللمسة الحالية
              </p>
              <p className="mt-1 text-sm font-black text-[#3d2a2f]">
                {selectedSortLabel}
              </p>
            </div>
          </div>
        </div>
      ) : isDistrictMarket ? (
        <div className="rounded-[1.4rem] border border-[#eddcd0] bg-[linear-gradient(180deg,#fffdfa,#fff6ef)] p-4 shadow-[0_22px_60px_-52px_rgba(61,37,25,0.3)]">
          <span className="inline-flex rounded-full border border-[#f0ddd0] bg-white px-3 py-1 text-[11px] font-black tracking-[0.22em] text-[#a65a2a]">
            فلترة ذكية
          </span>
          <p className="mt-3 text-sm leading-7 text-[#6e5849]">
            ابدأ بالبحث أو القسم ثم ضيّق السعر حتى تبقى الرفوف أوضح وأسهل في القرار.
          </p>
        </div>
      ) : null}
      {showSearch ? (
        <div className={shellClassName}>
          <h3 className={`font-heading uppercase ${headingClassName}`}>
            {searchLabel}
          </h3>
          <form onSubmit={handleSearchSubmit} className="space-y-3">
            <label htmlFor={`${fieldPrefix}-search`} className="sr-only">
              {searchPlaceholder}
            </label>
            <input
              id={`${fieldPrefix}-search`}
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder={searchPlaceholder}
              className={`w-full px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                isPcHub
                  ? 'rounded-[1rem] border border-[#d9dee5] bg-[#fffdf8]'
                : isRoseBoutique
                  ? 'rounded-[1rem] border border-[#ead8cf] bg-[#fffaf7]'
                : isDistrictMarket
                  ? 'rounded-[1rem] border border-[#ead8cb] bg-[#fffaf5]'
                  : 'rounded-[var(--radius)] border border-border bg-background'
              }`}
            />
            <button
              type="submit"
              className={`w-full px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95 ${
                isPcHub
                  ? 'rounded-[999px] bg-[#1f242c] text-[#fff4d1] shadow-[0_18px_38px_-28px_rgba(31,36,44,0.55)]'
                : isRoseBoutique
                  ? 'rounded-[999px] bg-[linear-gradient(135deg,#3d2a2f,#8f4d41)] shadow-[0_18px_38px_-28px_rgba(76,42,44,0.42)]'
                : isDistrictMarket
                  ? 'rounded-[999px] bg-[linear-gradient(135deg,#ee742f,#d95d1c)] shadow-[0_18px_40px_-30px_rgba(217,93,28,0.55)]'
                  : 'rounded-[var(--button-radius)] bg-primary'
              }`}
            >
              {searchButtonText}
            </button>
          </form>
        </div>
      ) : null}

      {/* Sort */}
      {showSort ? (
        <div className={shellClassName}>
          <h3 className={`font-heading uppercase ${headingClassName}`}>{sortLabel}</h3>
          <label htmlFor={`${fieldPrefix}-sort`} className="sr-only">
            {prefersArabicCopy ? 'ترتيب المنتجات' : 'Sort products'}
          </label>
          <select
            id={`${fieldPrefix}-sort`}
            name="sort-by"
            value={selectedSort}
            onChange={(e) => setSearchParams(applyCatalogFilters(searchParams, {
              sortValue: e.target.value as typeof selectedSort,
            }))}
            className={`w-full px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
              isPcHub
                ? 'rounded-[1rem] border border-[#d9dee5] bg-[#fffdf8]'
              : isRoseBoutique
                ? 'rounded-[1rem] border border-[#ead8cf] bg-[#fffaf7]'
              : isDistrictMarket
                ? 'rounded-[1rem] border border-[#ead8cb] bg-[#fffaf5]'
                : 'rounded-[var(--radius)] border border-border bg-background'
            }`}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      ) : null}

      {/* Categories */}
      {showCategories ? (
        <div className={shellClassName}>
          <h3 className={`font-heading uppercase ${headingClassName}`}>{categoryLabel}</h3>
          {categoryStyle === 'dropdown' ? (
            <>
              <label htmlFor={`${fieldPrefix}-category`} className="sr-only">
                {prefersArabicCopy ? 'فلترة حسب الفئة' : 'Filter by category'}
              </label>
              <select
                id={`${fieldPrefix}-category`}
                value={selectedCategoryId}
                onChange={(event) => handleCategorySelect(event.target.value)}
                className={`w-full px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
                  isPcHub
                    ? 'rounded-[1rem] border border-[#d9dee5] bg-[#fffdf8]'
                  : isRoseBoutique
                    ? 'rounded-[1rem] border border-[#ead8cf] bg-[#fffaf7]'
                  : isDistrictMarket
                    ? 'rounded-[1rem] border border-[#ead8cb] bg-[#fffaf5]'
                    : 'rounded-[var(--radius)] border border-border bg-background'
                }`}
              >
                <option value="all">{allProductsLabel}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <div className="space-y-1">
              <button
                onClick={() => handleCategorySelect('all')}
                className={`w-full text-start px-3 py-2 text-sm transition-colors ${
                  selectedCategoryId === 'all'
                    ? isPcHub
                      ? 'rounded-[1rem] bg-[#1f242c] font-medium text-[#fff4d1] shadow-[0_16px_34px_-26px_rgba(31,36,44,0.55)]'
                    : isRoseBoutique
                      ? 'rounded-[1rem] bg-[linear-gradient(135deg,#3d2a2f,#8f4d41)] font-medium text-white shadow-[0_16px_32px_-24px_rgba(76,42,44,0.32)]'
                    : isDistrictMarket
                      ? 'rounded-[1rem] bg-[linear-gradient(135deg,#ee742f,#d95d1c)] font-medium text-white shadow-[0_16px_32px_-26px_rgba(217,93,28,0.55)]'
                      : 'rounded-[var(--radius)] bg-primary text-primary-foreground font-medium'
                    : isPcHub
                      ? 'rounded-[1rem] border border-[#d9dee5] text-[#1f242c] hover:border-[#facc15] hover:bg-[#fffdf5]'
                    : isRoseBoutique
                      ? 'rounded-[1rem] border border-[#ead8cf] text-[#5b4950] hover:border-[#d86b55] hover:bg-[#fff8f5]'
                    : isDistrictMarket
                      ? 'rounded-[1rem] text-foreground hover:bg-[#f7eee6]'
                      : 'rounded-[var(--radius)] text-foreground hover:bg-muted'
                }`}
              >
                {allProductsLabel}
              </button>
              
              {isLoading ? (
                <div className="space-y-2 py-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-8 bg-muted animate-pulse rounded-[var(--radius)] w-full" />
                  ))}
                </div>
              ) : (
                categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`w-full text-start px-3 py-2 text-sm transition-colors ${
                      selectedCategoryId === cat.id
                        ? isPcHub
                          ? 'rounded-[1rem] bg-[#1f242c] font-medium text-[#fff4d1] shadow-[0_16px_34px_-26px_rgba(31,36,44,0.55)]'
                        : isRoseBoutique
                          ? 'rounded-[1rem] bg-[linear-gradient(135deg,#3d2a2f,#8f4d41)] font-medium text-white shadow-[0_16px_32px_-24px_rgba(76,42,44,0.32)]'
                        : isDistrictMarket
                          ? 'rounded-[1rem] bg-[linear-gradient(135deg,#ee742f,#d95d1c)] font-medium text-white shadow-[0_16px_32px_-26px_rgba(217,93,28,0.55)]'
                          : 'rounded-[var(--radius)] bg-primary text-primary-foreground font-medium'
                        : isPcHub
                          ? 'rounded-[1rem] border border-[#d9dee5] text-[#1f242c] hover:border-[#facc15] hover:bg-[#fffdf5]'
                        : isRoseBoutique
                          ? 'rounded-[1rem] border border-[#ead8cf] text-[#5b4950] hover:border-[#d86b55] hover:bg-[#fff8f5]'
                        : isDistrictMarket
                          ? 'rounded-[1rem] text-foreground hover:bg-[#f7eee6]'
                          : 'rounded-[var(--radius)] text-foreground hover:bg-muted'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* Price */}
      {showPriceFilter ? (
        <div className={shellClassName}>
          <h3 className={`font-heading uppercase ${
            isPcHub
              ? 'mb-4 text-[11px] font-black tracking-[0.22em] text-[#6d717c]'
              : isRoseBoutique
                ? 'mb-4 text-[11px] font-black tracking-[0.22em] text-[#a26c73]'
              : isDistrictMarket
                ? 'mb-4 text-[11px] font-black tracking-[0.22em] text-[#8c6956]'
                : 'mb-6 text-sm font-semibold text-[#1a3328] tracking-wide'
          }`}>{priceLabel}</h3>
          {isZenOrganic ? (
            <div className="space-y-6 px-1">
              <div className="relative h-1 bg-[#e9ebe5] rounded-full">
                <div className="absolute h-full bg-[#88a876] rounded-full" style={{ left: '0%', right: '40%' }} />
                <input 
                  type="range" 
                  min="0" 
                  max="1000" 
                  className="absolute w-full h-1 bg-transparent appearance-none cursor-pointer accent-[#88a876] pointer-events-auto" 
                />
              </div>
              <div className="flex items-center justify-between">
                <button 
                  className="px-6 py-2 bg-[#1a3328] text-white text-xs font-bold rounded-full uppercase tracking-widest hover:bg-[#1a3328]/90 transition-all"
                  onClick={() => {
                    // Logic to apply the actual numeric range would go here
                    // For now, mirroring the reference visual
                  }}
                >
                  {prefersArabicCopy ? 'فلترة' : 'Filter'}
                </button>
                <span className="text-sm font-semibold text-[#1a3328]/70 tracking-tight">
                  {prefersArabicCopy ? 'السعر: 40$ — 600$' : 'Price: $40 — $600'}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {priceRangeOptions.map((range) => (
                <label
                  key={range.value}
                  htmlFor={`${fieldPrefix}-${range.value}`}
                  className={`flex items-center gap-3 cursor-pointer group ${
                    isPcHub
                      ? 'rounded-[1rem] border border-transparent px-3 py-2.5 hover:border-[#f4e2a3] hover:bg-[#fffdf5]'
                      : isRoseBoutique
                        ? 'rounded-[1rem] border border-transparent px-3 py-2.5 hover:border-[#f0ddd5] hover:bg-[#fff8f5]'
                      : isDistrictMarket
                        ? 'rounded-[1rem] px-2 py-2 hover:bg-[#f7eee6]'
                        : ''
                  }`}
                >
                  <input
                    id={`${fieldPrefix}-${range.value}`}
                    type="radio"
                    name="price-range"
                    checked={selectedPriceRange === range.value}
                    onChange={() => handlePriceRangeSelect(range.value)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-ring accent-primary"
                  />
                  <span dir="ltr" className={`text-sm transition-colors ${
                    isPcHub
                      ? 'font-medium text-[#1f242c] group-hover:text-[#7a5d00]'
                      : isRoseBoutique
                        ? 'font-medium text-[#3d2a2f] group-hover:text-[#8f4d41]'
                      : 'text-foreground group-hover:text-primary'
                  }`}>
                    {range.label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Filter by Rating (Reference Matching) */}
      {isZenOrganic && (
        <div className="pt-2">
          <h3 className="text-sm font-semibold font-heading text-[#1a3328] mb-5 uppercase tracking-wide">
            {prefersArabicCopy ? 'التقييم' : 'Filter by Rating'}
          </h3>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((stars) => (
              <button key={stars} className="flex items-center gap-2 text-[#ffb800] hover:opacity-80 transition-all group">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className={`w-3.5 h-3.5 ${i < stars ? 'fill-current' : 'fill-[#e9ebe5] text-[#e9ebe5]'}`} viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  ))}
                </div>
                <span className="text-xs font-bold text-[#1a3328]/40 group-hover:text-[#1a3328] transition-colors">({stars}.0)</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Clear Filters */}
      <button
        type="button"
        onClick={handleClearFilters}
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

  const activeFilterCount = [
    activeSearch ? 1 : 0,
    selectedCategoryId !== 'all' ? 1 : 0,
    selectedPriceRange !== null ? 1 : 0,
    selectedSort !== 'featured' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  if (simpleCatalog) {
    const toggleSimplePanel = (panel: 'categories' | 'price') => {
      setSimplePanels((current) => ({
        ...current,
        [panel]: !current[panel],
      }));
    };

    const simpleSectionClassName =
      'border border-[#ece5dd] bg-[#faf8f5] px-5 py-4';
    const simpleTriggerClassName =
      'flex w-full items-center justify-between gap-3 text-start text-[1.05rem] font-semibold text-[#241d18]';
    const simpleItemClassName =
      'block w-full py-2 text-start text-sm text-[#5f5348] transition-colors hover:text-[#241d18]';

    const simpleFilterContent = (
      <div className="space-y-6">
        {showCategories ? (
          <div className={simpleSectionClassName}>
            <button
              type="button"
              onClick={() => toggleSimplePanel('categories')}
              className={simpleTriggerClassName}
            >
              <span>{categoryLabel}</span>
              <span>{simplePanels.categories ? '−' : '+'}</span>
            </button>
            {simplePanels.categories ? (
              <div className="mt-4 space-y-1">
                <button
                  type="button"
                  onClick={() => handleCategorySelect('all')}
                  className={`${simpleItemClassName} ${
                    selectedCategoryId === 'all' ? 'font-semibold text-[#241d18]' : ''
                  }`}
                >
                  {allProductsLabel}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`${simpleItemClassName} ${
                      selectedCategoryId === cat.id ? 'font-semibold text-[#241d18]' : ''
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {showPriceFilter ? (
          <div className={simpleSectionClassName}>
            <button
              type="button"
              onClick={() => toggleSimplePanel('price')}
              className={simpleTriggerClassName}
            >
              <span>{priceLabel}</span>
              <span>{simplePanels.price ? '−' : '+'}</span>
            </button>
            {simplePanels.price ? (
              <div className="mt-4 space-y-3">
                {priceRangeOptions.map((range) => (
                  <label
                    key={range.value}
                    htmlFor={`${fieldPrefix}-simple-${range.value}`}
                    className="flex cursor-pointer items-center gap-3 text-sm text-[#5f5348]"
                  >
                    <input
                      id={`${fieldPrefix}-simple-${range.value}`}
                      type="radio"
                      name="simple-price-range"
                      checked={selectedPriceRange === range.value}
                      onChange={() => handlePriceRangeSelect(range.value)}
                      className="h-4 w-4 accent-[#241d18]"
                    />
                    <span dir="ltr">{range.label}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleClearFilters}
          className="text-sm font-medium text-[#6e6257] underline underline-offset-4 transition-colors hover:text-[#241d18]"
        >
          {clearButtonText}
        </button>
      </div>
    );

    return (
      <section className="w-full">
        <div className="lg:hidden">
          <div dir="ltr" className="mb-4 grid grid-cols-2 gap-3">
            <label htmlFor={`${fieldPrefix}-simple-sort`} className="sr-only">
              {prefersArabicCopy ? 'ترتيب المنتجات' : 'Sort products'}
            </label>
            <select
              id={`${fieldPrefix}-simple-sort`}
              name="simple-sort-by"
              value={selectedSort}
              onChange={(event) =>
                handleSortChange(event.target.value as typeof selectedSort)
              }
              className="h-11 rounded-md border border-[#ddd3c9] bg-white px-4 text-sm font-medium text-[#241d18] outline-none transition-colors focus:border-[#b69b73]"
              dir={theme.direction}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-11 items-center justify-between rounded-md border border-[#ddd3c9] bg-white px-4 text-sm font-medium text-[#241d18]"
            >
              <span>{mobileOpen ? hideMobileLabel : showMobileLabel}</span>
              <span className="text-xs text-[#8a7d70]">
                {mobileOpen ? '−' : activeFilterCount > 0 ? activeFilterCount : '+'}
              </span>
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="fixed inset-0 z-[70] lg:hidden">
            <div
              className="absolute inset-0 bg-black/45"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-2xl bg-white px-5 py-5 shadow-2xl">
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#ece5dd] pb-4">
                <h3 className="text-lg font-semibold text-[#241d18]">
                  {showMobileLabel}
                </h3>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="text-sm font-medium text-[#6e6257]"
                >
                  {hideMobileLabel}
                </button>
              </div>
              {simpleFilterContent}
            </div>
          </div>
        ) : null}

        <div className="hidden lg:block lg:sticky lg:top-24">
          {simpleFilterContent}
        </div>
      </section>
    );
  }

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

  return (
    <section
      className={`w-full border p-1 ${
        isPcHub
          ? 'rounded-[1.85rem] border-[#dfe4ea] bg-[linear-gradient(180deg,#fffdf8,#f7f0dd)] shadow-[0_30px_90px_-62px_rgba(31,36,44,0.24)] lg:sticky lg:top-24'
        : isRoseBoutique
          ? 'rounded-[1.8rem] border-[#ead8cf] bg-[linear-gradient(180deg,#fffdfa,#f8f1ee)] shadow-[0_28px_84px_-60px_rgba(76,42,44,0.2)] lg:sticky lg:top-24'
        : isDistrictMarket
          ? 'rounded-[1.75rem] border-[#ead8cb] bg-[linear-gradient(180deg,#fffdfa,#fff6ef)] shadow-[0_28px_72px_-58px_rgba(61,37,25,0.32)] lg:sticky lg:top-24'
          : 'rounded-[var(--radius)] border-border bg-background'
      }`}
    >
      {/* Mobile toggle button */}
      <div className={`lg:hidden px-4 py-3 border-b ${
        isPcHub
          ? 'border-[#dfe4ea]'
          : isRoseBoutique
            ? 'border-[#ead8cf]'
          : isDistrictMarket
            ? 'border-[#ead8cb]'
            : 'border-border'
      }`}>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={`flex w-full items-center justify-between gap-3 text-sm font-medium transition-colors ${
            isPcHub
              ? 'rounded-[1.25rem] border border-[#e4d8b3] bg-[linear-gradient(180deg,#fffefb,#fff6dc)] px-4 py-3 text-[#1f242c] shadow-[0_20px_44px_-36px_rgba(31,36,44,0.32)] hover:border-[#f3ca53]'
            : isRoseBoutique
              ? 'rounded-[1.25rem] border border-[#ead8cf] bg-[linear-gradient(180deg,#fffdfb,#fff6f2)] px-4 py-3 text-[#3d2a2f] shadow-[0_20px_44px_-36px_rgba(76,42,44,0.2)] hover:border-[#d86b55]'
              : 'text-foreground hover:text-primary'
          }`}
        >
          <span className="flex min-w-0 items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                isPcHub
                  ? 'bg-[#1f242c] text-[#fff4d1]'
                  : isRoseBoutique
                    ? 'bg-[#3d2a2f] text-[#fff6f4]'
                    : ''
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="4" y1="21" y2="14" /><line x1="4" x2="4" y1="10" y2="3" />
                <line x1="12" x2="12" y1="21" y2="12" /><line x1="12" x2="12" y1="8" y2="3" />
                <line x1="20" x2="20" y1="21" y2="16" /><line x1="20" x2="20" y1="12" y2="3" />
                <line x1="1" x2="7" y1="14" y2="14" /><line x1="9" x2="15" y1="8" y2="8" />
                <line x1="17" x2="23" y1="16" y2="16" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className={`${
                  isPcHub
                    ? 'text-[11px] font-black uppercase tracking-[0.18em] text-[#6d717c]'
                    : isRoseBoutique
                      ? 'text-[11px] font-black uppercase tracking-[0.18em] text-[#a26c73]'
                      : ''
                }`}>
                  {mobileOpen ? hideMobileLabel : showMobileLabel}
                </span>
                {activeFilterCount > 0 && (
                  <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                    isPcHub
                      ? 'bg-[#1f242c] text-[#fff4d1]'
                      : isRoseBoutique
                        ? 'bg-[#3d2a2f] text-[#fff6f4]'
                        : 'bg-primary text-primary-foreground'
                  }`}>
                    {activeFilterCount}
                  </span>
                )}
              </span>
              {isPcHub ? (
                <span className="mt-1 block truncate text-sm font-semibold text-[#1f242c]">
                  {selectedCategoryId === 'all'
                    ? 'كل الأقسام جاهزة للمراجعة'
                    : `القسم الحالي: ${selectedCategoryLabel}`}
                </span>
              ) : isRoseBoutique ? (
                <span className="mt-1 block truncate text-sm font-semibold text-[#3d2a2f]">
                  {selectedCategoryId === 'all'
                    ? 'كل القطع جاهزة للمراجعة'
                    : `القسم الحالي: ${selectedCategoryLabel}`}
                </span>
              ) : null}
              {isPcHub ? (
                <span className="mt-1 block truncate text-xs text-[#6d717c]">
                  {selectedPriceLabel} • {selectedSortLabel}
                </span>
              ) : isRoseBoutique ? (
                <span className="mt-1 block truncate text-xs text-[#8d747a]">
                  {selectedPriceLabel} • {selectedSortLabel}
                </span>
              ) : null}
            </span>
          </span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${mobileOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Mobile: Bottom Sheet Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
          />
          {/* Sheet */}
          <div
            className={`absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t shadow-2xl animate-in slide-in-from-bottom duration-300 ${
              isPcHub
                ? 'border-[#dfe4ea] bg-[linear-gradient(180deg,#fffef9,#fff7e4_42%,#f5ecda)]'
                : isRoseBoutique
                  ? 'border-[#ead8cf] bg-[linear-gradient(180deg,#fffefd,#fff5f1_42%,#f8eeea)]'
                : 'bg-background border-border'
            }`}
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {/* Handle + Header */}
            <div className={`sticky top-0 z-10 backdrop-blur-sm border-b ${
              isPcHub
                ? 'border-[#dfe4ea] bg-[rgba(255,253,248,0.94)]'
                : isRoseBoutique
                  ? 'border-[#ead8cf] bg-[rgba(255,251,248,0.94)]'
                : 'bg-background/95 border-border'
            }`}>
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
              </div>
              <div className="px-5 pb-4">
                {isPcHub ? (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="inline-flex rounded-full border border-[#1f242c]/10 bg-[#1f242c] px-3 py-1 text-[11px] font-black tracking-[0.22em] text-[#fff4d1]">
                          {sidebarBadge}
                        </span>
                        <h3 className="mt-3 text-xl font-black tracking-tight text-[#1f242c]">
                          {mobilePanelTitle}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-[#646b77]">
                          {mobilePanelSubtitle}
                        </p>
                      </div>
                      <button
                        onClick={() => setMobileOpen(false)}
                        className="rounded-full border border-[#d9dee5] bg-white px-4 py-2 text-xs font-bold text-[#1f242c]"
                      >
                        {hideMobileLabel}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {mobileSummaryItems.map((item) => (
                        <span
                          key={`${item.label}-${item.value}`}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${
                            item.active
                              ? 'border-[#e7c764] bg-[#fff8df] text-[#4c3d00]'
                              : 'border-[#d9dee5] bg-white text-[#6d717c]'
                          }`}
                        >
                          <span className="font-black">{item.label}</span>
                          <span className="font-semibold">{item.value}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : isRoseBoutique ? (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="inline-flex rounded-full border border-[#f0e2db] bg-white px-3 py-1 text-[11px] font-black tracking-[0.22em] text-[#8f4d41]">
                          {sidebarBadge}
                        </span>
                        <h3 className="mt-3 text-xl font-black tracking-tight text-[#3d2a2f]">
                          {mobilePanelTitle}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-[#7a6268]">
                          {mobilePanelSubtitle}
                        </p>
                      </div>
                      <button
                        onClick={() => setMobileOpen(false)}
                        className="rounded-full border border-[#ead8cf] bg-white px-4 py-2 text-xs font-bold text-[#5b4950]"
                      >
                        {hideMobileLabel}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {mobileSummaryItems.map((item) => (
                        <span
                          key={`${item.label}-${item.value}`}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${
                            item.active
                              ? 'border-[#f0ddd5] bg-[#fff8f5] text-[#8f4d41]'
                              : 'border-[#ead8cf] bg-white text-[#8d747a]'
                          }`}
                        >
                          <span className="font-black">{item.label}</span>
                          <span className="font-semibold">{item.value}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-foreground">{showMobileLabel}</h3>
                    <button
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                    >
                      {prefersArabicCopy ? 'تطبيق' : 'Apply'}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className={`px-5 py-6 ${isPcHub || isRoseBoutique ? 'pb-28' : ''}`}>
              {filterContent}
            </div>
            {isPcHub ? (
              <div className="sticky bottom-0 z-10 border-t border-[#dfe4ea] bg-[rgba(255,252,244,0.96)] px-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-4 backdrop-blur">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="rounded-[999px] border border-[#d9dee5] bg-white px-4 py-3 text-sm font-bold text-[#1f242c]"
                  >
                    {mobileResetText}
                  </button>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="rounded-[999px] bg-[#1f242c] px-4 py-3 text-sm font-black text-[#fff4d1] shadow-[0_20px_40px_-30px_rgba(31,36,44,0.58)]"
                  >
                    {mobileApplyText}
                  </button>
                </div>
              </div>
            ) : isRoseBoutique ? (
              <div className="sticky bottom-0 z-10 border-t border-[#ead8cf] bg-[rgba(255,250,247,0.96)] px-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-4 backdrop-blur">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="rounded-[999px] border border-[#ead8cf] bg-white px-4 py-3 text-sm font-bold text-[#5b4950]"
                  >
                    {mobileResetText}
                  </button>
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="rounded-[999px] bg-[linear-gradient(135deg,#3d2a2f,#8f4d41)] px-4 py-3 text-sm font-black text-white shadow-[0_20px_40px_-30px_rgba(76,42,44,0.44)]"
                  >
                    {mobileApplyText}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Desktop: inline sidebar */}
      <div className={`hidden lg:block ${
        isPcHub || isRoseBoutique || isDistrictMarket ? 'px-4 py-4' : 'px-4 py-6'
      }`}>
        {filterContent}
      </div>
    </section>
  );
};

export default FiltersSidebar;
