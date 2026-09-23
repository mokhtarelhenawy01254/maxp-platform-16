import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { getDefaultRegisteredVariantId, hasRegisteredVariant } from '../variants';
import { isKhemetLuxeTheme } from '../utils/navigationGuards';
import { CatalogSortValue,
  applyCatalogFilters,
  clearCatalogFilters,
  getCatalogSortOptions,
  getCatalogProductQuery,
  resolveSortValue,
} from '../utils/catalogFilters';

interface ShopCommandBarProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    title?: string;
    subtitle?: string;
    simpleToolbar?: boolean;
    searchPlaceholder?: string;
    allCategoriesLabel?: string;
    resultsLabel?: string;
    clearButtonText?: string;
    stickyLabel?: string;
    chipLimit?: number;
    hideHeader?: boolean;
    hideDesktopCategoryChips?: boolean;
    hideSearch?: boolean;
    [key: string]: unknown;
  };
}

type ShopCommandBarVariant =
  | 'default-discovery'
  | 'marketplace-dense'
  | 'minimal-toolbar'
  | 'menu-quick-order'
  | 'boutique-discovery'
  | 'fit-finder'
  | 'soft-sort-bar'
  | 'fragrance-console'
  | 'spec-console'
  | 'elessi-bag-toolbar'
  | 'elessi-filter-deck'
  | 'elessi-category-ribbon'
  | 'elessi-spec-toolbar'
  | 'elessi-gift-toolbar'
  | 'elessi-organic-toolbar'
  | 'elessi-plant-toolbar'
  | 'elessi-digital-toolbar'
  | 'elessi-bike-toolbar'
  | 'butcher-cut-console'
  | 'decision-deck'
  | 'occasion-planner'
  | 'graceful-bar';

const SHOP_COMMAND_BAR_FAMILY = 'ShopCommandBar';
const SHOP_COMMAND_BAR_DEFAULT =
  (getDefaultRegisteredVariantId(SHOP_COMMAND_BAR_FAMILY) as ShopCommandBarVariant | undefined) ||
  'default-discovery';

const normalizeShopCommandBarVariant = (rawVariant: unknown): ShopCommandBarVariant => {
  const value = String(rawVariant || '').trim().toLowerCase();
  if (
    (
      value === 'default-discovery' ||
      value === 'marketplace-dense' ||
      value === 'minimal-toolbar' ||
      value === 'menu-quick-order' ||
      value === 'boutique-discovery' ||
      value === 'fit-finder' ||
      value === 'soft-sort-bar' ||
      value === 'fragrance-console' ||
      value === 'spec-console' ||
      value === 'elessi-bag-toolbar' ||
      value === 'elessi-filter-deck' ||
      value === 'elessi-category-ribbon' ||
      value === 'elessi-spec-toolbar' ||
      value === 'elessi-gift-toolbar' ||
      value === 'elessi-organic-toolbar' ||
      value === 'elessi-plant-toolbar' ||
      value === 'elessi-digital-toolbar' ||
      value === 'elessi-bike-toolbar' ||
      value === 'butcher-cut-console' ||
      value === 'decision-deck' ||
      value === 'graceful-bar' ||
      value === 'occasion-planner'
    ) &&
    hasRegisteredVariant(SHOP_COMMAND_BAR_FAMILY, value)
  ) {
    return value as ShopCommandBarVariant;
  }
  return SHOP_COMMAND_BAR_DEFAULT;
};

const ShopCommandBar: React.FC<ShopCommandBarProps> = ({ section, settings }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { theme } = useStorefrontTheme();
  const controlId = React.useId();
  const prefersArabicCopy = theme.direction === 'rtl';
  const { categories } = useCategories();
  const selectedSort = resolveSortValue(searchParams);
  const selectedCategory = searchParams.get('category') || 'all';
  const activeSearch = searchParams.get('search') || '';
  const [searchValue, setSearchValue] = useState(activeSearch);
  const searchInputId = `${controlId}-search`;
  const sortSelectId = `${controlId}-sort`;
  const variant = normalizeShopCommandBarVariant(section?.variant);
  const isBiteRush = theme.id === 'restaurant-demo';
  const isMenShoes = theme.id === 'men-shoes-eg';
  const isBoutiqueDiscovery = variant === 'boutique-discovery';
  const isFitFinder = variant === 'fit-finder';
  const isSoftSortBar = variant === 'soft-sort-bar';
  const isOccasionPlanner = variant === 'occasion-planner';
  const isSoftFashionDiscovery = isBoutiqueDiscovery || isFitFinder || isSoftSortBar;
  const isElessiBagToolbar = variant === 'elessi-bag-toolbar';
  const isElessiFilterDeck = variant === 'elessi-filter-deck';
  const isElessiCategoryRibbon = variant === 'elessi-category-ribbon';
  const isElessiSpecToolbar = variant === 'elessi-spec-toolbar';
  const isElessiGiftToolbar = variant === 'elessi-gift-toolbar';
  const isElessiOrganicToolbar = variant === 'elessi-organic-toolbar';
  const isElessiPlantToolbar = variant === 'elessi-plant-toolbar';
  const isElessiDigitalToolbar = variant === 'elessi-digital-toolbar';
  const isElessiBikeToolbar = variant === 'elessi-bike-toolbar';
  const isButcherCutConsole = variant === 'butcher-cut-console';
  const isGracefulBar = variant === 'graceful-bar';
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const chipLimit =
    typeof settings?.chipLimit === 'number' && settings.chipLimit > 0
      ? settings.chipLimit
      : variant === 'marketplace-dense'
      ? 8
        : variant === 'menu-quick-order'
          ? 5
        : isSoftFashionDiscovery
          ? 7
          : variant === 'fragrance-console'
            ? 7
          : isElessiBagToolbar || isElessiFilterDeck || isElessiCategoryRibbon || isElessiSpecToolbar || isElessiGiftToolbar || isElessiOrganicToolbar || isElessiPlantToolbar || isElessiDigitalToolbar || isElessiBikeToolbar
            ? 6
          : variant === 'spec-console'
            ? 7
          : isButcherCutConsole
            ? 8
          : variant === 'decision-deck'
            ? 8
          : isOccasionPlanner
            ? 7
        : 6;

  useEffect(() => {
    setSearchValue(activeSearch);
  }, [activeSearch]);

  const handleClearFilters = () => {
    setSearchValue('');
    setSearchParams((prev) => clearCatalogFilters(prev));
  };

  const catalogLimit = useMemo(() => {
    const isSale = location.pathname.endsWith('/sale');
    const sections = (isSale ? theme.pages?.sale?.sections : theme.pages?.shop?.sections) as
      | Array<{ type?: string; settings?: { limit?: number } }>
      | undefined;
    const gridSection = sections?.find((s) => s.type === 'product-grid');
    if (typeof gridSection?.settings?.limit === 'number' && gridSection.settings.limit > 0) {
      return gridSection.settings.limit;
    }
    return isKhemetLuxeTheme(theme.id) ? (isSale ? 12 : 16) : 12;
  }, [theme, location.pathname]);

  const productQuery = useMemo(
    () => ({
      limit: catalogLimit,
      ...getCatalogProductQuery(searchParams),
    }),
    [catalogLimit, searchParams],
  );
  const { pagination, isLoading } = useProducts(productQuery);

  const visibleCategories = categories.slice(0, chipLimit);
  const title =
    settings?.title ||
    (isElessiBagToolbar
      ? 'تسوّق الحقائب حسب الاستخدام'
      : isElessiOrganicToolbar
      ? 'ابدأ من الخضار أو الفاكهة أو الصندوق المناسب'
      : isElessiDigitalToolbar
      ? 'واجهتك الأسرع للأجهزة والملحقات'
      : isElessiGiftToolbar
      ? 'مرشحات الهدية والاختيار'
      : isElessiBikeToolbar
        ? 'اختَر الدراجة أو القطعة بسرعة'
      : isButcherCutConsole
        ? 'كونسول التقطيع والوزن'
      : isOccasionPlanner
        ? 'ابدئي من نوع المناسبة'
      : isSoftSortBar
        ? 'ترتيب سريع وواضح'
        : isElessiSpecToolbar
          ? 'تصفح المواصفات والمسارات'
        : isElessiCategoryRibbon
        ? 'شريط الأقسام السريع'
        : isElessiPlantToolbar
          ? 'تصفح النباتات'
        : isBoutiqueDiscovery
          ? 'اكتشفي القطع بهدوء'
        : isElessiFilterDeck
          ? 'لوحة تصفح أقرب للقرار'
            : 'تحكم أسرع في التصفح');
  const subtitle =
    settings?.subtitle ||
    (isElessiBagToolbar
      ? 'ابدأ من حقيبة يومية أو سفر أو هدية، ثم بدّل اللون والحجم وكمّل الطلب من نفس الصفحة.'
      : isElessiOrganicToolbar
      ? 'ابحث باسم المنتج أو العبوة، ثم تنقّل بين الأقسام والنتائج داخل رف عضوي أخف وأوضح.'
      : isElessiDigitalToolbar
      ? 'ابحث بالموديل أو فئة الاستخدام، ثم بدّل بين الأقسام والنتائج داخل شريط سريع يقرّبك من المنتج المناسب بدون زحام.'
      : isElessiGiftToolbar
      ? 'ابحث عن المجموعة أو الهدية أو الحجم، ثم بدّل بين الأقسام بدون مغادرة الشبكة.'
      : isElessiBikeToolbar
        ? 'ابحث بالموديل أو الفئة أو القطعة، ثم راجع النتائج في شبكة بيضاء أخف تشبه متاجر الدراجات الجاهزة للبيع.'
      : isButcherCutConsole
        ? 'ابحث باسم القطعية، اضبط القسم، وخلي القرار مبني على الوزن والتجهيز بدل تصفح منتجات عام.'
      : isOccasionPlanner
        ? 'ابدئي من دعوة الخطوبة أو عشاء المساء أو الإطلالة المستعجلة، ثم ضيقي النتيجة حسب القسم والترتيب من نفس السطح.'
      : isSoftSortBar
        ? 'اختاري القسم أو رتّبي الرف مباشرة، ثم ادخلي على القطعة أو quick view بدون زحمة أدوات.'
        : isElessiSpecToolbar
          ? 'فلترة أسرع للمسارات التقنية والقطع المرتبطة بدل شبكة عامة متشابهة.'
        : isElessiCategoryRibbon
        ? 'الأقسام والفلاتر الأساسية في شريط واضح، سريع، ومباشر من أول نظرة.'
        : isElessiPlantToolbar
          ? 'ابحث باسم النبات أو الأصيص، بدّل بين الأقسام، واحتفظ بالشبكة مفتوحة حتى تصل للقطعة المناسبة بسرعة.'
        : isBoutiqueDiscovery
          ? 'ابدئي من اسم القطعة أو القسم المفتوح، ثم اتركي الرف أخف وأوضح من أول نظرة.'
          : isElessiFilterDeck
            ? 'ابحث بسرعة، فلتر حسب التصنيف، ثم غيّر الترتيب داخل لوحة خفيفة تقرّب المنتج المناسب.'
            : 'ابحث بسرعة، فلتر حسب التصنيف، ثم غيّر الترتيب بدون مغادرة الشبكة.');
  const searchPlaceholder = settings?.searchPlaceholder || 'ابحث داخل المنتجات';
  const allCategoriesLabel = settings?.allCategoriesLabel || 'كل المنتجات';
  const resultsLabel = settings?.resultsLabel || 'منتج متاح';
  const clearButtonText = settings?.clearButtonText || 'إزالة الفلاتر';
  const stickyLabel =
    settings?.stickyLabel ||
    (variant === 'marketplace-dense'
      ? 'أدوات السوق'
      : variant === 'minimal-toolbar'
        ? 'أدوات التصفح'
        : variant === 'menu-quick-order'
          ? 'اطلب بسرعة'
        : isBoutiqueDiscovery
          ? 'دليل البوتيك'
        : isFitFinder
          ? 'Fit Finder'
        : isOccasionPlanner
          ? 'مخطط المناسبة'
        : isSoftSortBar
          ? 'ترتيب سريع'
        : variant === 'fragrance-console'
            ? 'أدوات العطر'
          : isElessiBagToolbar
          ? 'دليل الحقائب'
          : isElessiOrganicToolbar
            ? prefersArabicCopy
              ? 'مسار التسوق'
              : 'Organic routing'
          : isElessiDigitalToolbar
            ? 'أدوات المتجر'
          : isElessiGiftToolbar
          ? prefersArabicCopy
            ? 'دليل الهدايا'
            : 'Gift routing'
          : isElessiBikeToolbar
            ? prefersArabicCopy
              ? 'فلترة أسرع'
              : 'Ride filters'
          : isButcherCutConsole
            ? 'Black cut console'
          : isElessiSpecToolbar
          ? prefersArabicCopy
            ? 'دليل المواصفات'
            : 'Spec routing'
        : isElessiCategoryRibbon
          ? prefersArabicCopy
            ? 'شريط الأقسام'
            : 'Category ribbon'
          : isElessiPlantToolbar
            ? prefersArabicCopy
              ? 'أدوات النباتات'
              : 'Plant toolbar'
          : isElessiFilterDeck
            ? prefersArabicCopy
              ? 'دليل التصفح'
              : 'Browse filters'
          : variant === 'spec-console'
            ? 'أدوات التصفح'
          : variant === 'decision-deck'
            ? prefersArabicCopy
              ? 'غرفة القرار'
              : 'Decision deck'
          : prefersArabicCopy
            ? 'أدوات التصفح'
            : 'Browse tools');
  const hideHeader = settings?.hideHeader === true;
  const hideDesktopCategoryChips = settings?.hideDesktopCategoryChips === true;
  const hideSearch = settings?.hideSearch === true;
  const simpleToolbar = settings?.simpleToolbar === true;
  const sortOptions = useMemo(
    () => getCatalogSortOptions(theme.direction),
    [theme.direction],
  );
  const isSpecConsole = variant === 'spec-console';
  const isDecisionDeck = variant === 'decision-deck';
  const isFragranceConsole = variant === 'fragrance-console';
  const selectedSortLabel =
    sortOptions.find((option) => option.value === selectedSort)?.label || '';
  const activeCategoryLabel =
    selectedCategory === 'all'
      ? allCategoriesLabel
      : categories.find((category) => category.id === selectedCategory)?.name ||
        allCategoriesLabel;
  const shouldShowMobileCategoryChips =
    (isMenShoes || isDecisionDeck || isElessiFilterDeck || isElessiCategoryRibbon || isFitFinder || isButcherCutConsole) &&
    !hideDesktopCategoryChips;

  const hasActiveControls =
    selectedCategory !== 'all' || Boolean(activeSearch) || selectedSort !== 'featured';
  const decisionModeLabel = activeSearch
    ? prefersArabicCopy
      ? 'بحث مباشر'
      : 'Live search'
    : hasActiveControls
      ? prefersArabicCopy
        ? 'فلترة مركزة'
        : 'Focused filtering'
      : prefersArabicCopy
        ? 'جاهز للاستكشاف'
        : 'Ready to explore';

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchParams(
      applyCatalogFilters(searchParams, {
        searchTerm: searchValue.trim() || null,
      }),
    );
  };

  if (isGracefulBar) {
    const totalProducts = isLoading ? '…' : pagination.total;
    const isFilterOpen = filterPanelOpen;

    return (
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-black/[0.06] pb-5">
        {/* Filter dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterPanelOpen(!isFilterOpen)}
            aria-expanded={isFilterOpen}
            className="inline-flex items-center gap-2.5 text-[15px] text-[#2f2f2f] transition-colors hover:text-[#e16244]"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M3 6h18M7 12h10M10 18h4" />
            </svg>
            Filter
          </button>
          {isFilterOpen ? (
            <div className="absolute left-0 top-full z-30 mt-3 w-72 rounded-[14px] border border-black/[0.06] bg-white p-5 shadow-[0_30px_70px_-32px_rgba(0,0,0,0.4)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#9a9a9a]">Categories</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearchParams(applyCatalogFilters(searchParams, { categoryId: null }));
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-[#171717] text-white'
                      : 'border border-black/10 text-[#2f2f2f] hover:border-[#171717]'
                  }`}
                >
                  {allCategoriesLabel}
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setSearchParams(applyCatalogFilters(searchParams, { categoryId: category.id }));
                    }}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-[#171717] text-white'
                        : 'border border-black/10 text-[#2f2f2f] hover:border-[#171717]'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
              {hasActiveControls ? (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="mt-4 text-xs font-semibold text-[#e16244] underline-offset-4 hover:underline"
                >
                  {clearButtonText}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Count */}
        <p className="text-[15px] text-[#2f2f2f]">
          Total products: <span className="font-semibold">{totalProducts}</span>
        </p>

        {/* Sort */}
        <div className="flex items-center gap-3">
          <span className="text-[15px] text-[#2f2f2f]">Sort by:</span>
          <select
            id={sortSelectId}
            value={selectedSort}
            onChange={(event) =>
              setSearchParams(
                applyCatalogFilters(searchParams, {
                  sortValue: event.target.value as CatalogSortValue,
                }),
              )
            }
            className="h-11 rounded-[10px] border border-black/[0.08] bg-[#f6f6f6] px-4 text-sm font-medium text-[#2f2f2f] outline-none transition-colors focus:border-[#171717]"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  if (isButcherCutConsole) {
    return (
      <section className="mb-8 overflow-hidden border border-[#37312c] bg-[#0b0908] text-[#f4ead8] shadow-[0_28px_80px_-64px_rgba(0,0,0,0.84)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
          {!hideHeader ? (
            <div className="border-b border-[#37312c] px-5 py-6 md:px-6 lg:border-b-0 lg:border-s">
              <span className="inline-flex border border-[#8b6b3e] bg-[#15110f] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-[#d7b674]">
                {stickyLabel}
              </span>
              <h2 className="mt-5 font-heading text-[2rem] font-black leading-tight text-[#fff7e8] md:text-[2.85rem]">
                {title}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#b7ab9c]">
                {subtitle}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="border border-[#8f1d2b] bg-[#5f1118] px-3 py-2 text-xs font-black text-[#fff4dc]">
                  {isLoading ? '...' : pagination.total} {resultsLabel}
                </span>
                <span className="border border-[#37312c] bg-[#15110f] px-3 py-2 text-xs font-bold text-[#d6cbbb]">
                  {activeCategoryLabel}
                </span>
                {selectedSortLabel ? (
                  <span className="border border-[#37312c] bg-[#15110f] px-3 py-2 text-xs font-bold text-[#d7b674]">
                    {selectedSortLabel}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="px-5 py-6 md:px-6">
            {!hideSearch ? (
              <form onSubmit={handleSearchSubmit} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_13rem_auto]">
                <label htmlFor={searchInputId} className="sr-only">
                  {searchPlaceholder}
                </label>
                <input
                  id={searchInputId}
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-12 border border-[#4a4138] bg-[#15110f] px-4 text-sm font-bold text-[#fff7e8] outline-none transition-colors placeholder:text-[#81756b] focus:border-[#b99154]"
                />
                <select
                  id={sortSelectId}
                  value={selectedSort}
                  onChange={(event) =>
                    setSearchParams(
                      applyCatalogFilters(searchParams, {
                        sortValue: event.target.value as CatalogSortValue,
                      }),
                    )
                  }
                  className="h-12 border border-[#4a4138] bg-[#15110f] px-4 text-sm font-bold text-[#fff7e8] outline-none transition-colors focus:border-[#b99154]"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {hasActiveControls ? (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="inline-flex h-12 items-center justify-center border border-[#4a4138] bg-[#0b0908] px-5 text-sm font-black text-[#d6cbbb] transition-colors hover:border-[#b99154] hover:text-[#fff7e8]"
                  >
                    {clearButtonText}
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="inline-flex h-12 items-center justify-center border border-[#8f1d2b] bg-[#7a131d] px-5 text-sm font-black text-[#fff4dc] transition-colors hover:bg-[#9a1d2a]"
                  >
                    {prefersArabicCopy ? 'طبّق' : 'Apply'}
                  </button>
                )}
              </form>
            ) : null}

            {!hideDesktopCategoryChips ? (
              <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() =>
                    setSearchParams(
                      applyCatalogFilters(searchParams, {
                        categoryId: null,
                      }),
                    )
                  }
                  className={`shrink-0 border px-4 py-2 text-sm font-black transition-colors ${
                    selectedCategory === 'all'
                      ? 'border-[#8f1d2b] bg-[#5f1118] text-[#fff4dc]'
                      : 'border-[#37312c] bg-[#15110f] text-[#b7ab9c] hover:border-[#8b6b3e] hover:text-[#fff7e8]'
                  }`}
                >
                  {allCategoriesLabel}
                </button>
                {visibleCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() =>
                      setSearchParams(
                        applyCatalogFilters(searchParams, {
                          categoryId: category.id,
                        }),
                      )
                    }
                    className={`shrink-0 border px-4 py-2 text-sm font-black transition-colors ${
                      selectedCategory === category.id
                        ? 'border-[#b99154] bg-[#d7b674] text-[#120d0b]'
                        : 'border-[#37312c] bg-[#15110f] text-[#b7ab9c] hover:border-[#8b6b3e] hover:text-[#fff7e8]'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (simpleToolbar) {
    return (
      <section className="mb-6 hidden border-b border-[#e8ddd2] pb-4 lg:block">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <select
            id={sortSelectId}
            name="catalogSort"
            value={selectedSort}
            onChange={(event) =>
              setSearchParams(
                applyCatalogFilters(searchParams, {
                  sortValue: event.target.value as typeof selectedSort,
                }),
              )
            }
            className="h-11 min-w-[190px] rounded-md border border-[#ddd3c9] bg-white px-4 text-sm font-medium text-[#241d18] outline-none transition-colors focus:border-[#b69b73]"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {hasActiveControls ? (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex h-11 items-center justify-center rounded-md border border-[#ddd3c9] bg-white px-4 text-sm font-medium text-[#5d5147] transition-colors hover:border-[#b69b73] hover:text-[#241d18]"
            >
              {clearButtonText}
            </button>
          ) : (
            <div />
          )}
        </div>
      </section>
    );
  }

  if (isOccasionPlanner) {
    const occasionRoutes = prefersArabicCopy
      ? [
          {
            label: 'خطوبة أو كتب كتاب',
            searchTerm: 'فستان',
            note: 'قطع أنيقة لكن غير ثقيلة من أول مرور.',
          },
          {
            label: 'دعوة عشاء',
            searchTerm: 'سهرة',
            note: 'خامات ولمعان خفيف مناسب للصور والمساء.',
          },
          {
            label: 'نهار رسمي',
            searchTerm: 'طقم',
            note: 'إطلالة متوازنة لو المناسبة تبدأ بدري.',
          },
          {
            label: 'طلب مستعجل',
            searchTerm: 'جاهز',
            note: 'ابدئي بالقطع الأقرب للحسم خلال يوم واحد.',
          },
        ]
      : [
          {
            label: 'Engagement or Wedding',
            searchTerm: 'dress',
            note: 'Elegant pieces that stay light from the first pass.',
          },
          {
            label: 'Dinner Invitation',
            searchTerm: 'evening',
            note: 'Fluid fabrics with a soft sheen made for evenings.',
          },
          {
            label: 'Formal Daytime',
            note: 'A balanced look if the occasion starts early.',
            searchTerm: 'set',
          },
          {
            label: 'Last-Minute Order',
            note: 'Start with the quickest pieces to decide within a day.',
            searchTerm: 'ready',
          },
        ];

    return (
      <section className="mb-6 overflow-hidden rounded-[2rem] border border-[#e9d9d1] bg-[linear-gradient(135deg,#fffdfb_0%,#f7efe8_46%,#fff9f4_100%)] shadow-[0_32px_88px_-64px_rgba(76,42,44,0.26)]">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-5 px-5 py-5 md:px-6 md:py-6">
            {!hideHeader ? (
              <div className="space-y-3">
                <span className="inline-flex w-fit rounded-full border border-[#ead7cf] bg-white/92 px-3 py-1 text-[11px] font-black tracking-[0.22em] text-[#8e5348]">
                  {stickyLabel}
                </span>
                <div className="space-y-2">
                  <h2 className="font-heading text-[2rem] font-black tracking-tight text-[#2a1f1d] md:text-[2.35rem]">
                    {title}
                  </h2>
                  <p className="max-w-2xl text-sm leading-7 text-[#6c5958] md:text-base">
                    {subtitle}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-[#2a1f1d] px-3 py-1 text-xs font-black text-white">
                {isLoading ? '...' : pagination.total} {resultsLabel}
              </span>
              <span className="inline-flex rounded-full border border-[#ead7cf] bg-white px-3 py-1 text-xs font-bold text-[#6c5958]">
                {decisionModeLabel}
              </span>
              <span className="inline-flex rounded-full border border-[#ead7cf] bg-white px-3 py-1 text-xs font-bold text-[#6c5958]">
                {activeCategoryLabel}
              </span>
              {selectedSortLabel ? (
                <span className="inline-flex rounded-full border border-[#ead7cf] bg-white px-3 py-1 text-xs font-bold text-[#8e5348]">
                  {selectedSortLabel}
                </span>
              ) : null}
            </div>
          </div>

          <div className="border-t border-[#efdfd7] px-5 py-5 lg:border-s lg:border-t-0 md:px-6 md:py-6">
            {!hideSearch ? (
              <form onSubmit={handleSearchSubmit} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto] md:items-center">
                <label htmlFor={searchInputId} className="sr-only">
                  {searchPlaceholder}
                </label>
                <input
                  id={searchInputId}
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-12 rounded-full border border-[#e5d3cb] bg-white px-4 text-sm font-medium text-[#2a1f1d] outline-none transition focus:border-[#c27d6f]"
                />
                <select
                  id={sortSelectId}
                  value={selectedSort}
                  onChange={(event) =>
                    setSearchParams(
                      applyCatalogFilters(searchParams, {
                        sortValue: event.target.value as CatalogSortValue,
                      }),
                    )
                  }
                  className="h-12 rounded-full border border-[#e5d3cb] bg-white px-4 text-sm font-bold text-[#2a1f1d] outline-none transition focus:border-[#c27d6f]"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {hasActiveControls ? (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="inline-flex h-12 items-center justify-center rounded-full border border-[#ead7cf] bg-white px-5 text-sm font-bold text-[#6c5958] transition-colors hover:border-[#c27d6f] hover:text-[#2a1f1d]"
                  >
                    {clearButtonText}
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="inline-flex h-12 items-center justify-center rounded-full bg-[#2a1f1d] px-5 text-sm font-black text-white transition-colors hover:bg-[#15100f]"
                  >
                    {prefersArabicCopy ? 'ابدئي الفرز' : 'Apply'}
                  </button>
                )}
              </form>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {occasionRoutes.map((route) => {
                const isActiveRoute = activeSearch === route.searchTerm;

                return (
                  <button
                    key={route.label}
                    type="button"
                    onClick={() =>
                      setSearchParams(
                        applyCatalogFilters(searchParams, {
                          searchTerm: route.searchTerm,
                        }),
                      )
                    }
                    className={`rounded-[1.35rem] border px-4 py-4 text-start transition-all ${
                      isActiveRoute
                        ? 'border-[#2a1f1d] bg-[#2a1f1d] text-white shadow-[0_22px_52px_-40px_rgba(42,31,29,0.72)]'
                        : 'border-[#ead7cf] bg-white/90 text-[#2a1f1d] hover:-translate-y-0.5 hover:border-[#c27d6f]'
                    }`}
                  >
                    <p className={`text-[11px] font-black tracking-[0.22em] ${isActiveRoute ? 'text-white/76' : 'text-[#a16a60]'}`}>
                      ROUTE
                    </p>
                    <p className="mt-2 text-base font-black">
                      {route.label}
                    </p>
                    <p className={`mt-2 text-sm leading-6 ${isActiveRoute ? 'text-white/82' : 'text-[#6c5958]'}`}>
                      {route.note}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {!hideDesktopCategoryChips ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-[#efdfd7] px-5 py-4 md:px-6">
            <button
              type="button"
              onClick={() =>
                setSearchParams(
                  applyCatalogFilters(searchParams, {
                    categoryId: null,
                  }),
                )
              }
              className={`inline-flex rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-[#2a1f1d] text-white'
                  : 'border border-[#ead7cf] bg-white text-[#6c5958] hover:border-[#c27d6f] hover:text-[#2a1f1d]'
              }`}
            >
              {allCategoriesLabel}
            </button>
            {visibleCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() =>
                  setSearchParams(
                    applyCatalogFilters(searchParams, {
                      categoryId: category.id,
                    }),
                  )
                }
                className={`inline-flex rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-[#c77463] text-white'
                    : 'border border-[#ead7cf] bg-white text-[#6c5958] hover:border-[#c27d6f] hover:text-[#2a1f1d]'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        ) : null}
      </section>
    );
  }

  if (isSoftSortBar) {
    return (
      <section className="mb-5 border-b border-[#edd8d0] bg-[#fffaf7] py-4">
        <div className="flex flex-col gap-4">
          {!hideHeader ? (
            <div className="flex flex-col gap-2">
              <h2 className="font-heading text-[1.55rem] font-black tracking-tight text-[#2c2426] md:text-[1.8rem]">
                {title}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[#6d5b5f]">
                {subtitle}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-[#6d5b5f]">
              <span className="font-black text-[#2c2426]">{isLoading ? '...' : pagination.total}</span>
              <span>{resultsLabel}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor={sortSelectId} className="text-xs font-black uppercase tracking-[0.2em] text-[#9b7370]">
                {prefersArabicCopy ? 'الترتيب' : 'Sort'}
              </label>
              <select
                id={sortSelectId}
                value={selectedSort}
                onChange={(event) =>
                  setSearchParams(
                    applyCatalogFilters(searchParams, {
                      sortValue: event.target.value as CatalogSortValue,
                    }),
                  )
                }
                className="h-10 min-w-[11rem] rounded-full border border-[#ead8cf] bg-white px-4 text-sm font-bold text-[#2c2426] outline-none transition focus:border-[#d86b55]"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {hasActiveControls ? (
                <button
                  type="button"
                    onClick={handleClearFilters}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[#ead8cf] bg-[#fff7f2] px-4 text-sm font-bold text-[#6d5b5f] transition-colors hover:border-[#d86b55] hover:text-[#2c2426]"
                >
                  {clearButtonText}
                </button>
              ) : null}
            </div>
          </div>

          {!hideDesktopCategoryChips ? (
            <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() =>
                  setSearchParams(
                    applyCatalogFilters(searchParams, {
                      categoryId: null,
                    }),
                  )
                }
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-[#2c2426] text-white'
                    : 'border border-[#ead8cf] bg-white text-[#6d5b5f] hover:border-[#d86b55] hover:text-[#2c2426]'
                }`}
              >
                {allCategoriesLabel}
              </button>
              {visibleCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() =>
                    setSearchParams(
                      applyCatalogFilters(searchParams, {
                        categoryId: category.id,
                      }),
                    )
                  }
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-[#ef6d5b] text-white'
                      : 'border border-[#ead8cf] bg-white text-[#6d5b5f] hover:border-[#d86b55] hover:text-[#2c2426]'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (isElessiDigitalToolbar) {
    return (
      <section className="mb-7 border-b border-[#e4e9f0] bg-white py-4">
        <div className="flex flex-col gap-5">
          {!hideHeader ? (
            <div className="flex flex-col gap-3">
              <span className="inline-flex w-fit text-[11px] font-black uppercase tracking-[0.22em] text-[#7a8595]">
                {stickyLabel}
              </span>
              <div className="space-y-2">
                <h2 className="font-heading text-[1.9rem] font-black tracking-tight text-[#161c26] md:text-[2.2rem]">
                  {title}
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-[#536172] md:text-base">
                  {subtitle}
                </p>
              </div>
            </div>
          ) : null}

          {!hideDesktopCategoryChips ? (
            <div className="flex flex-wrap items-center gap-2 overflow-x-auto border-b border-[#edf1f6] pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() =>
                  setSearchParams(
                    applyCatalogFilters(searchParams, {
                      categoryId: null,
                    }),
                  )
                }
                className={`inline-flex shrink-0 items-center border px-4 py-2 text-sm font-bold transition-colors ${
                  selectedCategory === 'all'
                    ? 'border-[#161c26] bg-[#161c26] text-white'
                    : 'border-[#dce3ec] bg-white text-[#516170] hover:border-[#f59e0b] hover:text-[#161c26]'
                }`}
              >
                {allCategoriesLabel}
              </button>
              {visibleCategories.map((category, index) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() =>
                    setSearchParams(
                      applyCatalogFilters(searchParams, {
                        categoryId: category.id,
                      }),
                    )
                  }
                  className={`inline-flex shrink-0 items-center gap-2 border px-4 py-2 text-sm font-bold transition-colors ${
                    selectedCategory === category.id
                      ? 'border-[#161c26] bg-[#161c26] text-white'
                      : 'border-[#dce3ec] bg-white text-[#516170] hover:border-[#f59e0b] hover:text-[#161c26]'
                  }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-75">
                    {`0${index + 1}`}
                  </span>
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-4 border-b border-[#edf1f6] pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              {!hideSearch ? (
                <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
                  <input
                    id={searchInputId}
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-11 flex-1 border border-[#dce3ec] bg-[#fbfcfe] px-4 text-sm text-[#161c26] outline-none transition focus:border-[#f59e0b]"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-11 shrink-0 items-center justify-center bg-[#161c26] px-5 text-sm font-bold text-white transition-colors hover:bg-[#0d1219]"
                  >
                    {prefersArabicCopy ? 'بحث' : 'Search'}
                  </button>
                </form>
              ) : null}

              <div className="flex items-center gap-2 text-sm text-[#607184]">
                <span className="font-bold text-[#161c26]">{isLoading ? '...' : pagination.total}</span>
                <span>{resultsLabel}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor={sortSelectId} className="text-sm font-bold text-[#607184]">
                {prefersArabicCopy ? 'الترتيب' : 'Sort'}
              </label>
              <select
                id={sortSelectId}
                value={selectedSort}
                onChange={(event) =>
                  setSearchParams(
                    applyCatalogFilters(searchParams, {
                      sortValue: event.target.value as CatalogSortValue,
                    }),
                  )
                }
                className="h-11 border border-[#dce3ec] bg-white px-4 text-sm font-bold text-[#161c26] outline-none transition focus:border-[#f59e0b]"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                {['2', '3', '4'].map((label, index) => (
                  <span
                    key={`${label}-${index}`}
                    className={`inline-flex h-10 w-10 items-center justify-center border text-xs font-black ${
                      index === 1
                        ? 'border-[#161c26] bg-[#161c26] text-white'
                        : 'border-[#dce3ec] bg-white text-[#7a8595]'
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>

              {hasActiveControls ? (
                <button
                  type="button"
                    onClick={handleClearFilters}
                  className="inline-flex h-11 items-center justify-center border border-[#dce3ec] bg-white px-4 text-sm font-bold text-[#516170] transition-colors hover:border-[#f59e0b] hover:text-[#161c26]"
                >
                  {clearButtonText}
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center border border-[#dce3ec] bg-[#fbfcfe] px-4 py-2 font-bold text-[#243042]">
              {activeCategoryLabel}
            </span>
            <span className="inline-flex items-center border border-[#e8edf5] bg-white px-4 py-2 font-bold text-[#607184]">
              {selectedSortLabel}
            </span>
            <span className="inline-flex items-center border border-[#eef2f7] bg-[#f7f9fc] px-4 py-2 font-bold text-[#7a8595]">
              {decisionModeLabel}
            </span>
            {activeSearch ? (
              <span className="inline-flex items-center border border-[#fae5bf] bg-[#fff8ea] px-4 py-2 font-bold text-[#b45309]">
                {`“${activeSearch}”`}
              </span>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (isElessiBikeToolbar) {
    return (
      <section className="mb-7 border-b border-[#e3e7eb] bg-white py-4">
        <div className="flex flex-col gap-5">
          {!hideHeader ? (
            <div className="flex flex-col gap-3">
              <span className="inline-flex w-fit text-[11px] font-black uppercase tracking-[0.22em] text-[#7d8894]">
                {stickyLabel}
              </span>
              <div className="space-y-2">
                <h2 className="font-heading text-[1.9rem] font-black tracking-tight text-[#1d2a33] md:text-[2.2rem]">
                  {title}
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-[#60717f] md:text-base">
                  {subtitle}
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-4 border-y border-[#edf1f4] py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              {!hideSearch ? (
                <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
                  <input
                    id={searchInputId}
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-11 flex-1 border border-[#d9dee4] bg-white px-4 text-sm text-[#1d2a33] outline-none transition focus:border-[#d97706]"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-11 shrink-0 items-center justify-center bg-[#1d2a33] px-5 text-sm font-bold text-white transition-colors hover:bg-[#121d24]"
                  >
                    {prefersArabicCopy ? 'بحث' : 'Search'}
                  </button>
                </form>
              ) : null}

              <div className="flex items-center gap-2 text-sm text-[#60717f]">
                <span className="font-bold text-[#1d2a33]">
                  {isLoading ? '...' : pagination.total}
                </span>
                <span>{resultsLabel}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor={sortSelectId} className="text-sm font-bold text-[#60717f]">
                {prefersArabicCopy ? 'الترتيب' : 'Sort'}
              </label>
              <select
                id={sortSelectId}
                value={selectedSort}
                onChange={(event) =>
                  setSearchParams(
                    applyCatalogFilters(searchParams, {
                      sortValue: event.target.value as CatalogSortValue,
                    }),
                  )
                }
                className="h-11 border border-[#d9dee4] bg-white px-4 text-sm font-bold text-[#1d2a33] outline-none transition focus:border-[#d97706]"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                {['2', '3', '4'].map((label, index) => (
                  <span
                    key={`${label}-${index}`}
                    className={`inline-flex h-10 w-10 items-center justify-center border text-xs font-black ${
                      index === 2
                        ? 'border-[#1d2a33] bg-[#1d2a33] text-white'
                        : 'border-[#d9dee4] bg-white text-[#677684]'
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>

              {hasActiveControls ? (
                <button
                  type="button"
                    onClick={handleClearFilters}
                  className="inline-flex h-11 items-center justify-center border border-[#d9dee4] bg-white px-4 text-sm font-bold text-[#516170] transition-colors hover:border-[#bfc9d2] hover:text-[#1d2a33]"
                >
                  {clearButtonText}
                </button>
              ) : null}
            </div>
          </div>

          {!hideDesktopCategoryChips ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setSearchParams(
                    applyCatalogFilters(searchParams, {
                      categoryId: null,
                    }),
                  )
                }
                className={`inline-flex items-center border px-4 py-2 text-sm font-bold transition-colors ${
                  selectedCategory === 'all'
                    ? 'border-[#1d2a33] bg-[#1d2a33] text-white'
                    : 'border-[#d9dee4] bg-white text-[#516170] hover:border-[#bfc9d2] hover:text-[#1d2a33]'
                }`}
              >
                {allCategoriesLabel}
              </button>
              {visibleCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() =>
                    setSearchParams(
                      applyCatalogFilters(searchParams, {
                        categoryId: category.id,
                      }),
                    )
                  }
                  className={`inline-flex items-center border px-4 py-2 text-sm font-bold transition-colors ${
                    selectedCategory === category.id
                      ? 'border-[#1d2a33] bg-[#1d2a33] text-white'
                      : 'border-[#d9dee4] bg-white text-[#516170] hover:border-[#bfc9d2] hover:text-[#1d2a33]'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          ) : null}

          {activeSearch ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center border border-[#fde7c2] bg-[#fff7eb] px-4 py-2 font-bold text-[#b45309]">
                {`“${activeSearch}”`}
              </span>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (isElessiOrganicToolbar) {
    return (
      <section className="mb-7 border-b border-[#eadfcd] bg-white py-4">
        <div className="flex flex-col gap-5">
          {!hideHeader ? (
            <div className="flex flex-col gap-3">
              <span className="inline-flex w-fit text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6546]">
                {stickyLabel}
              </span>
              <div className="space-y-2">
                <h2 className="font-heading text-[1.9rem] font-black tracking-tight text-[#2d3b27] md:text-[2.2rem]">
                  {title}
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-[#67705e] md:text-base">
                  {subtitle}
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 overflow-x-auto border-b border-[#f1e8dc] pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() =>
                setSearchParams(
                  applyCatalogFilters(searchParams, {
                    categoryId: null,
                  }),
                )
              }
              className={`inline-flex shrink-0 items-center rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                selectedCategory === 'all'
                  ? 'border-[#2d3b27] bg-[#2d3b27] text-white'
                  : 'border-[#eadfcd] bg-white text-[#6c5b49] hover:border-[#d39c4d] hover:text-[#8c5d1e]'
              }`}
            >
              {allCategoriesLabel}
            </button>
            {visibleCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() =>
                  setSearchParams(
                    applyCatalogFilters(searchParams, {
                      categoryId: category.id,
                    }),
                  )
                }
                className={`inline-flex shrink-0 items-center rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                  selectedCategory === category.id
                    ? 'border-[#2d3b27] bg-[#2d3b27] text-white'
                    : 'border-[#eadfcd] bg-white text-[#6c5b49] hover:border-[#d39c4d] hover:text-[#8c5d1e]'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              {!hideSearch ? (
                <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
                  <input
                    id={searchInputId}
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-11 flex-1 rounded-full border border-[#e4d9cb] bg-[#fffdf9] px-5 text-sm text-[#2d3b27] outline-none transition focus:border-[#d39c4d]"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-[#2d3b27] px-5 text-sm font-bold text-white transition-colors hover:bg-[#202a1c]"
                  >
                    {prefersArabicCopy ? 'بحث' : 'Search'}
                  </button>
                </form>
              ) : null}

              <div className="flex items-center gap-2 text-sm text-[#7d6c58]">
                <span className="font-bold text-[#2d3b27]">
                  {isLoading ? '...' : pagination.total}
                </span>
                <span>{resultsLabel}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor={sortSelectId} className="text-sm font-bold text-[#6c5b49]">
                {prefersArabicCopy ? 'الترتيب' : 'Sort'}
              </label>
              <select
                id={sortSelectId}
                value={selectedSort}
                onChange={(event) =>
                  setSearchParams(
                    applyCatalogFilters(searchParams, {
                      sortValue: event.target.value as CatalogSortValue,
                    }),
                  )
                }
                className="h-11 rounded-full border border-[#e4d9cb] bg-white px-4 text-sm font-bold text-[#2d3b27] outline-none transition focus:border-[#d39c4d]"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {hasActiveControls ? (
                <button
                  type="button"
                    onClick={handleClearFilters}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[#eadfcd] bg-white px-4 text-sm font-bold text-[#6c5b49] transition-colors hover:border-[#d39c4d] hover:text-[#8c5d1e]"
                >
                  {clearButtonText}
                </button>
              ) : null}
            </div>
          </div>

          {activeSearch ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center rounded-full border border-[#f5dfba] bg-[#fff8e9] px-4 py-2 font-bold text-[#a16207]">
                {`“${activeSearch}”`}
              </span>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (isElessiBagToolbar) {
    return (
      <section className="mb-7 border-b border-[#ece1d5] bg-white py-4">
        <div className="flex flex-col gap-5">
          {!hideHeader ? (
            <div className="flex flex-col gap-3">
              <span className="inline-flex w-fit text-[11px] font-black uppercase tracking-[0.22em] text-[#9a7666]">
                {stickyLabel}
              </span>
              <div className="space-y-2">
                <h2 className="font-heading text-[1.9rem] font-black tracking-tight text-[#241815] md:text-[2.2rem]">
                  {title}
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-[#705a50] md:text-base">
                  {subtitle}
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 overflow-x-auto border-b border-[#f2e8de] pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() =>
                setSearchParams(
                  applyCatalogFilters(searchParams, {
                    categoryId: null,
                  }),
                )
              }
              className={`inline-flex shrink-0 items-center rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                selectedCategory === 'all'
                  ? 'border-[#241815] bg-[#241815] text-white'
                  : 'border-[#eadfd4] bg-white text-[#6f5a50] hover:border-[#c9ab95] hover:text-[#241815]'
              }`}
            >
              {allCategoriesLabel}
            </button>
            {visibleCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() =>
                  setSearchParams(
                    applyCatalogFilters(searchParams, {
                      categoryId: category.id,
                    }),
                  )
                }
                className={`inline-flex shrink-0 items-center rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                  selectedCategory === category.id
                    ? 'border-[#241815] bg-[#241815] text-white'
                    : 'border-[#eadfd4] bg-white text-[#6f5a50] hover:border-[#c9ab95] hover:text-[#241815]'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              {!hideSearch ? (
                <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
                  <input
                    id={searchInputId}
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-11 flex-1 rounded-full border border-[#e4d8cd] bg-[#fffdfb] px-5 text-sm text-[#241815] outline-none transition focus:border-[#caa48f]"
                  />
                  <button
                    type="submit"
                    className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-[#241815] bg-[#241815] px-5 text-sm font-bold text-white transition-colors hover:bg-[#3a2a25]"
                  >
                    {prefersArabicCopy ? 'بحث' : 'Search'}
                  </button>
                </form>
              ) : null}

              <div className="flex items-center gap-2 text-sm text-[#7f685d]">
                <span className="font-bold text-[#241815]">
                  {isLoading ? '...' : pagination.total}
                </span>
                <span>{resultsLabel}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor={sortSelectId} className="text-sm font-bold text-[#6f5a50]">
                {prefersArabicCopy ? 'الترتيب' : 'Sort'}
              </label>
              <select
                id={sortSelectId}
                value={selectedSort}
                onChange={(event) =>
                  setSearchParams(
                    applyCatalogFilters(searchParams, {
                      sortValue: event.target.value as CatalogSortValue,
                    }),
                  )
                }
                className="h-11 rounded-full border border-[#e4d8cd] bg-[#fffdfb] px-4 text-sm font-bold text-[#241815] outline-none transition focus:border-[#caa48f]"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {hasActiveControls ? (
                <button
                  type="button"
                    onClick={handleClearFilters}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[#eadfd4] bg-white px-4 text-sm font-bold text-[#6f5a50] transition-colors hover:border-[#c9ab95] hover:text-[#241815]"
                >
                  {clearButtonText}
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center rounded-full bg-[#f7efe7] px-4 py-2 font-bold text-[#6f5a50]">
              {activeCategoryLabel}
            </span>
            {activeSearch ? (
              <span className="inline-flex items-center rounded-full bg-[#fff4ec] px-4 py-2 font-bold text-[#8f5d47]">
                {`“${activeSearch}”`}
              </span>
            ) : null}
            <span className="inline-flex items-center rounded-full bg-[#f5f0ea] px-4 py-2 font-bold text-[#7d665b]">
              {selectedSortLabel}
            </span>
            <span className="inline-flex items-center rounded-full bg-[#fcf8f4] px-4 py-2 font-bold text-[#9a7666]">
              {decisionModeLabel}
            </span>
          </div>
        </div>
      </section>
    );
  }

  if (isElessiPlantToolbar) {
    return (
      <section className="mb-7 border-b border-[#e7efe4] bg-white py-4">
        <div className="flex flex-col gap-5">
          {!hideHeader ? (
            <div className="flex flex-col gap-3 lg:items-center">
              <span className="inline-flex w-fit self-end text-[11px] font-black uppercase tracking-[0.22em] text-[#99a392]">
                {stickyLabel}
              </span>
              <div className="space-y-2 text-center">
                <h2 className="font-heading text-[1.95rem] font-black tracking-tight text-[#203528]">
                  {title}
                </h2>
                <p className="mx-auto max-w-3xl text-sm leading-7 text-[#56715e]">
                  {subtitle}
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-y border-[#e7efe4] py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold text-[#6d7568]">
                {prefersArabicCopy ? 'فلترة حسب:' : 'Filter by:'}
              </span>
              <select
                value={selectedCategory}
                onChange={(event) =>
                  setSearchParams(
                    applyCatalogFilters(searchParams, {
                      categoryId:
                        event.target.value === 'all' ? null : event.target.value,
                    }),
                  )
                }
                className="rounded-full border border-[#d8e6d8] bg-white px-4 py-2.5 text-sm font-bold text-[#203528] outline-none"
              >
                <option value="all">{allCategoriesLabel}</option>
                {visibleCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                <input
                  id={searchInputId}
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="min-w-[15rem] rounded-full border border-[#d8e6d8] bg-white px-4 py-2.5 text-sm text-[#203528] outline-none transition focus:border-[#7fa178]"
                />
                <button
                  type="submit"
                  className="rounded-full border border-[#d8e6d8] bg-white px-4 py-2.5 text-sm font-bold text-[#203528] transition-colors hover:border-[#7fa178]"
                >
                  {prefersArabicCopy ? 'بحث' : 'Search'}
                </button>
              </form>
              <span className="text-sm font-bold text-[#8a9383]">
                {isLoading ? '...' : pagination.total} {resultsLabel}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor={sortSelectId} className="text-sm font-bold text-[#6d7568]">
                {prefersArabicCopy ? 'الترتيب' : 'Sort by'}
              </label>
              <select
                id={sortSelectId}
                value={selectedSort}
                onChange={(event) =>
                  setSearchParams(
                    applyCatalogFilters(searchParams, {
                      sortValue: event.target.value as CatalogSortValue,
                    }),
                  )
                }
                className="rounded-full border border-[#d8e6d8] bg-white px-4 py-2.5 text-sm font-bold text-[#203528] outline-none"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                {['II', 'III', 'IIII'].map((label, index) => (
                  <span
                    key={`${label}-${index}`}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-[0.4rem] border text-xs font-black ${
                      index === 2
                        ? 'border-[#203528] bg-[#203528] text-white'
                        : 'border-[#d8e6d8] bg-white text-[#798371]'
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>

              {hasActiveControls ? (
                <button
                  type="button"
                    onClick={handleClearFilters}
                  className="rounded-full border border-[#d8e6d8] bg-white px-4 py-2.5 text-sm font-bold text-[#56715e]"
                >
                  {clearButtonText}
                </button>
              ) : null}
            </div>
          </div>

          {!hideDesktopCategoryChips ? (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              <button
                type="button"
                onClick={() =>
                  setSearchParams(
                    applyCatalogFilters(searchParams, {
                      categoryId: null,
                    }),
                  )
                }
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                  selectedCategory === 'all'
                    ? 'border-[#203528] bg-[#203528] text-[#f4fbf5]'
                    : 'border-[#d8e6d8] bg-white text-[#43604b]'
                }`}
              >
                {allCategoriesLabel}
              </button>
              {visibleCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() =>
                    setSearchParams(
                      applyCatalogFilters(searchParams, {
                        categoryId: category.id,
                      }),
                    )
                  }
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                    selectedCategory === category.id
                      ? 'border-[#203528] bg-[#203528] text-[#f4fbf5]'
                      : 'border-[#d8e6d8] bg-white text-[#43604b]'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className={`sticky ${isBiteRush ? 'top-24' : 'top-20'} z-30 mb-6 rounded-[calc(var(--radius)+0.35rem)] border px-4 py-4 backdrop-blur md:px-5 ${
      isElessiFilterDeck
        ? 'border-[#ead8cb] bg-[linear-gradient(180deg,rgba(255,253,249,0.98),rgba(248,239,231,0.96))] shadow-[0_30px_90px_-56px_rgba(91,57,40,0.26)]'
        : isElessiCategoryRibbon
        ? 'border-[#ead8cb] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(251,244,237,0.96))] shadow-[0_28px_86px_-58px_rgba(91,57,40,0.22)]'
        : isElessiSpecToolbar
        ? 'border-[#ddd3c6] bg-[linear-gradient(180deg,rgba(255,254,249,0.98),rgba(245,236,218,0.96))] shadow-[0_30px_92px_-58px_rgba(40,31,24,0.24)]'
        : isElessiGiftToolbar
        ? 'border-[#ead8cb] bg-[linear-gradient(180deg,rgba(255,252,248,0.98),rgba(248,239,233,0.96))] shadow-[0_30px_92px_-58px_rgba(91,57,40,0.24)]'
      : isSpecConsole
        ? 'border-[#1f242c]/12 bg-[linear-gradient(180deg,rgba(255,252,244,0.98),rgba(247,239,221,0.98))] shadow-[0_28px_92px_-52px_rgba(31,36,44,0.34)]'
        : isDecisionDeck
        ? 'border-[#1f242c]/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,239,221,0.96))] shadow-[0_30px_96px_-54px_rgba(31,36,44,0.32)]'
        : variant === 'minimal-toolbar'
        ? 'border-border/70 bg-background/88 shadow-[0_14px_46px_-40px_rgba(15,23,42,0.25)]'
        : isFragranceConsole
          ? 'border-[#e6d8cf] bg-[linear-gradient(180deg,rgba(255,253,250,0.98),rgba(251,246,242,0.96))] shadow-[0_28px_86px_-58px_rgba(61,41,44,0.22)]'
        : isSoftFashionDiscovery
          ? 'border-[#ead8cf] bg-[linear-gradient(180deg,rgba(255,253,250,0.98),rgba(250,242,236,0.96))] shadow-[0_30px_90px_-60px_rgba(76,42,44,0.26)]'
        : variant === 'marketplace-dense'
          ? 'border-primary/12 bg-background/95 shadow-[0_24px_80px_-46px_rgba(15,23,42,0.42)]'
          : isBiteRush
            ? 'border-[#171717]/10 bg-white shadow-[0_24px_50px_-34px_rgba(17,17,17,0.28)]'
          : isMenShoes
            ? 'border-[#ded0c2] bg-[linear-gradient(180deg,rgba(255,252,248,0.98),rgba(250,243,236,0.96))] shadow-[0_28px_78px_-52px_rgba(31,38,43,0.34)]'
          : variant === 'menu-quick-order'
            ? 'border-accent/16 bg-background/95 shadow-[0_22px_66px_-44px_rgba(124,45,18,0.28)]'
            : 'border-border bg-background/92 shadow-[0_20px_70px_-46px_rgba(15,23,42,0.35)]'
    }`}>
      <div className={`flex flex-col ${hideHeader ? 'gap-3' : 'gap-4'}`}>
        <div className="flex items-center justify-between gap-3 md:hidden">
          <span className={`inline-flex w-fit rounded-[var(--button-radius)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] ${
            isBiteRush
              ? 'bg-[#fff1ea] text-[#dc2626]'
              : isElessiFilterDeck
                ? 'border border-[#ead8cb] bg-white text-[#8f5c44]'
              : isElessiCategoryRibbon
                ? 'border border-[#ead8cb] bg-[#fff7f1] text-[#8f5c44]'
              : isElessiSpecToolbar
                ? 'border border-[#1f242c]/10 bg-[#2d241f] text-[#f6dec3]'
              : isElessiGiftToolbar
                ? 'border border-[#ead8cb] bg-[#fff5ef] text-[#7d4d40]'
              : isSoftFashionDiscovery
                ? 'border border-[#ead8cf] bg-white text-[#8f4d41]'
              : isSpecConsole
                ? 'border border-[#1f242c]/10 bg-[#1f242c] text-[#fff1b8]'
                : isDecisionDeck
                  ? 'border border-[#1f242c]/10 bg-[#1f242c] text-[#fff4d1]'
                : isFragranceConsole
                  ? 'border border-[#eadfd7] bg-[#fff7f1] text-[#5b3940]'
                  : isSoftFashionDiscovery
                    ? 'border border-[#ead8cf] bg-[#fff7f3] text-[#8f4d41]'
                  : isMenShoes
                    ? 'border border-[#e6d8cb] bg-white text-[#1f262b]'
                  : 'border border-primary/10 bg-primary/5 text-primary'
          }`}>
            {stickyLabel}
          </span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`rounded-[var(--button-radius)] px-3 py-1.5 font-semibold ${
              isBiteRush
                ? 'border border-[#171717]/10 bg-white text-[#171717]'
                : isElessiFilterDeck
                  ? 'border border-[#ead8cb] bg-white text-[#6b4a3c]'
                : isElessiCategoryRibbon
                  ? 'border border-[#ead8cb] bg-white text-[#6b4a3c]'
                : isElessiSpecToolbar
                  ? 'border border-[#1f242c]/10 bg-white/88 text-[#2d241f]'
                : isElessiGiftToolbar
                  ? 'border border-[#ead8cb] bg-white text-[#7d4d40]'
                : isSpecConsole
                  ? 'border border-[#1f242c]/10 bg-white/84 text-[#1f242c]'
                : isDecisionDeck
                  ? 'border border-[#1f242c]/10 bg-white text-[#1f242c]'
                : isFragranceConsole
                  ? 'border border-[#eadfd7] bg-white text-[#5b3940]'
                : isSoftFashionDiscovery
                  ? 'border border-[#ead8cf] bg-white text-[#8f4d41]'
                : isMenShoes
                  ? 'border border-[#e6d8cb] bg-white text-[#4f4034]'
                  : 'border border-border bg-card'
            }`}>
              {isLoading ? '...' : pagination.total} {resultsLabel}
            </span>
            {hasActiveControls ? (
              <button
                type="button"
                    onClick={handleClearFilters}
                className={`rounded-[var(--button-radius)] border px-3 py-1.5 font-semibold transition-colors ${
                  isBiteRush
                    ? 'border-[#171717]/10 text-[#171717] hover:border-[#ff6b2c] hover:text-[#dc2626]'
                    : isElessiFilterDeck || isElessiCategoryRibbon
                      ? 'border-[#ead8cb] text-[#6b4a3c] hover:border-[#c79f8b] hover:text-[#8f5c44]'
                    : isElessiSpecToolbar
                      ? 'border-[#1f242c]/10 text-[#2d241f] hover:border-[#cda56d] hover:text-[#2d241f]'
                    : isElessiGiftToolbar
                      ? 'border-[#ead8cb] text-[#7d4d40] hover:border-[#c79f8b] hover:text-[#7d4d40]'
                    : isSpecConsole
                      ? 'border-[#1f242c]/10 text-[#1f242c] hover:border-[#ffd400] hover:text-[#1f242c]'
                    : isDecisionDeck
                      ? 'border-[#1f242c]/10 text-[#1f242c] hover:border-[#facc15] hover:text-[#1f242c]'
                    : isSoftFashionDiscovery
                      ? 'border-[#ead8cf] text-[#8f4d41] hover:border-[#d86b55] hover:text-[#d86b55]'
                    : isFragranceConsole
                      ? 'border-[#eadfd7] text-[#5b3940] hover:border-[#c79f8b] hover:text-[#5b3940]'
                    : isMenShoes
                      ? 'border-[#e6d8cb] text-[#4f4034] hover:border-[#f57a1d] hover:text-[#f57a1d]'
                      : 'border-border text-foreground hover:border-primary/30 hover:text-primary'
                }`}
              >
                {clearButtonText}
              </button>
            ) : null}
          </div>
        </div>

        {hideHeader ? (
          <div className="hidden items-center justify-between gap-3 md:flex">
            <span className={`inline-flex w-fit rounded-[var(--button-radius)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] ${
              isBiteRush
                ? 'bg-[#fff1ea] text-[#dc2626]'
                : isElessiFilterDeck
                  ? 'border border-[#ead8cb] bg-white text-[#8f5c44]'
                : isElessiCategoryRibbon
                  ? 'border border-[#ead8cb] bg-[#fff7f1] text-[#8f5c44]'
                : isElessiSpecToolbar
                  ? 'border border-[#1f242c]/10 bg-[#2d241f] text-[#f6dec3]'
                : isElessiGiftToolbar
                  ? 'border border-[#ead8cb] bg-[#fff5ef] text-[#7d4d40]'
                : isSpecConsole
                  ? 'border border-[#1f242c]/10 bg-[#1f242c] text-[#fff1b8]'
                : isDecisionDeck
                  ? 'border border-[#1f242c]/10 bg-[#1f242c] text-[#fff4d1]'
                  : isSoftFashionDiscovery
                    ? 'border border-[#ead8cf] bg-[#fff7f3] text-[#8f4d41]'
                  : isFragranceConsole
                    ? 'border border-[#eadfd7] bg-[#fff7f1] text-[#5b3940]'
                  : 'border border-primary/10 bg-primary/5 text-primary'
            }`}>
              {stickyLabel}
            </span>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className={`rounded-[var(--button-radius)] px-3 py-1.5 font-semibold ${
                isBiteRush
                  ? 'border border-[#171717]/10 bg-white text-[#171717]'
                  : isElessiFilterDeck
                    ? 'border border-[#ead8cb] bg-white text-[#6b4a3c]'
                  : isElessiCategoryRibbon
                    ? 'border border-[#ead8cb] bg-white text-[#6b4a3c]'
                  : isElessiSpecToolbar
                    ? 'border border-[#1f242c]/10 bg-white/88 text-[#2d241f]'
                  : isElessiGiftToolbar
                    ? 'border border-[#ead8cb] bg-white text-[#7d4d40]'
                  : isSpecConsole
                    ? 'border border-[#1f242c]/10 bg-white/84 text-[#1f242c]'
                  : isDecisionDeck
                    ? 'border border-[#1f242c]/10 bg-white text-[#1f242c]'
                  : isSoftFashionDiscovery
                    ? 'border border-[#ead8cf] bg-white text-[#8f4d41]'
                  : 'border border-border bg-card'
              }`}>
                {isLoading ? '...' : pagination.total} {resultsLabel}
              </span>
              {hasActiveControls ? (
                <button
                  type="button"
                    onClick={handleClearFilters}
                  className={`rounded-[var(--button-radius)] border px-3 py-1.5 font-semibold transition-colors ${
                    isBiteRush
                      ? 'border-[#171717]/10 text-[#171717] hover:border-[#ff6b2c] hover:text-[#dc2626]'
                      : isElessiFilterDeck || isElessiCategoryRibbon
                        ? 'border-[#ead8cb] text-[#6b4a3c] hover:border-[#c79f8b] hover:text-[#8f5c44]'
                      : isElessiSpecToolbar
                        ? 'border-[#1f242c]/10 text-[#2d241f] hover:border-[#cda56d] hover:text-[#2d241f]'
                      : isElessiGiftToolbar
                        ? 'border-[#ead8cb] text-[#7d4d40] hover:border-[#c79f8b] hover:text-[#7d4d40]'
                      : isSpecConsole
                        ? 'border-[#1f242c]/10 text-[#1f242c] hover:border-[#ffd400] hover:text-[#1f242c]'
                      : isDecisionDeck
                        ? 'border-[#1f242c]/10 text-[#1f242c] hover:border-[#facc15] hover:text-[#1f242c]'
                      : isSoftFashionDiscovery
                        ? 'border-[#ead8cf] text-[#8f4d41] hover:border-[#d86b55] hover:text-[#d86b55]'
                      : 'border-border text-foreground hover:border-primary/30 hover:text-primary'
                  }`}
                >
                  {clearButtonText}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="hidden flex-col gap-3 md:flex xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <span className={`inline-flex w-fit rounded-[var(--button-radius)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] ${
                isBiteRush
                  ? 'bg-[#fff1ea] text-[#dc2626]'
                  : isElessiFilterDeck
                    ? 'border border-[#ead8cb] bg-white text-[#8f5c44]'
                  : isElessiCategoryRibbon
                    ? 'border border-[#ead8cb] bg-[#fff7f1] text-[#8f5c44]'
                  : isElessiSpecToolbar
                    ? 'border border-[#1f242c]/10 bg-[#2d241f] text-[#f6dec3]'
                  : isElessiGiftToolbar
                    ? 'border border-[#ead8cb] bg-[#fff5ef] text-[#7d4d40]'
                  : isSpecConsole
                    ? 'border border-[#1f242c]/10 bg-[#1f242c] text-[#fff1b8]'
                  : isDecisionDeck
                    ? 'border border-[#1f242c]/10 bg-[#1f242c] text-[#fff4d1]'
                  : isSoftFashionDiscovery
                    ? 'border border-[#ead8cf] bg-[#fff7f3] text-[#8f4d41]'
                  : 'border border-primary/10 bg-primary/5 text-primary'
              }`}>
                {stickyLabel}
              </span>
              <div className="space-y-1">
                <h2 className={`font-heading font-black tracking-tight ${
                  isBiteRush
                    ? 'text-3xl uppercase italic text-[#171717]'
                    : isElessiFilterDeck || isElessiCategoryRibbon
                      ? 'text-[1.45rem] text-[#2d211e] md:text-[1.6rem]'
                    : isElessiSpecToolbar
                      ? 'text-[1.4rem] text-[#2d241f] md:text-[1.55rem]'
                    : isElessiGiftToolbar
                      ? 'text-[1.4rem] text-[#3d292c] md:text-[1.55rem]'
                    : isDecisionDeck
                      ? 'text-[1.35rem] text-[#1f242c] md:text-[1.5rem]'
                      : isFragranceConsole
                        ? 'text-[1.35rem] text-[#3d292c] md:text-[1.55rem]'
                      : 'text-xl text-foreground'
                }`}>
                  {title}
                </h2>
                <p className={`max-w-2xl text-sm leading-6 ${
                  isBiteRush
                    ? 'text-[#5f5f5f]'
                    : isElessiFilterDeck || isElessiCategoryRibbon
                      ? 'text-[#7b645b]'
                    : isElessiSpecToolbar
                      ? 'text-[#70655d]'
                    : isElessiGiftToolbar
                      ? 'text-[#7a5d60]'
                    : isDecisionDeck
                      ? 'text-[#646b77]'
                      : isSoftFashionDiscovery
                        ? 'text-[#7a6268]'
                      : isFragranceConsole
                        ? 'text-[#7a5d60]'
                      : 'text-muted-foreground'
                }`}>
                  {subtitle}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className={`rounded-[var(--button-radius)] px-3 py-1.5 font-semibold ${
                isBiteRush
                  ? 'border border-[#171717]/10 bg-white text-[#171717]'
                  : isElessiFilterDeck
                    ? 'border border-[#ead8cb] bg-white text-[#6b4a3c]'
                  : isElessiCategoryRibbon
                    ? 'border border-[#ead8cb] bg-white text-[#6b4a3c]'
                  : isElessiSpecToolbar
                    ? 'border border-[#1f242c]/10 bg-white/88 text-[#2d241f]'
                  : isElessiGiftToolbar
                    ? 'border border-[#ead8cb] bg-white text-[#5b3940]'
                  : isSpecConsole
                    ? 'border border-[#1f242c]/10 bg-white/84 text-[#1f242c]'
                  : isDecisionDeck
                    ? 'border border-[#1f242c]/10 bg-white text-[#1f242c]'
                  : isSoftFashionDiscovery
                    ? 'border border-[#ead8cf] bg-white text-[#8f4d41]'
                  : isFragranceConsole
                    ? 'border border-[#eadfd7] bg-white text-[#5b3940]'
                  : 'border border-border bg-card'
              }`}>
                {isLoading ? '...' : pagination.total} {resultsLabel}
              </span>
              {hasActiveControls && (
                <button
                  type="button"
                    onClick={handleClearFilters}
                  className={`rounded-[var(--button-radius)] border px-3 py-1.5 font-semibold transition-colors ${
                    isBiteRush
                      ? 'border-[#171717]/10 text-[#171717] hover:border-[#ff6b2c] hover:text-[#dc2626]'
                      : isElessiFilterDeck || isElessiCategoryRibbon
                        ? 'border-[#ead8cb] text-[#6b4a3c] hover:border-[#c79f8b] hover:text-[#8f5c44]'
                      : isElessiSpecToolbar
                        ? 'border-[#1f242c]/10 text-[#2d241f] hover:border-[#cda56d] hover:text-[#2d241f]'
                      : isElessiGiftToolbar
                        ? 'border-[#ead8cb] text-[#5b3940] hover:border-[#c79f8b] hover:text-[#5b3940]'
                      : isSpecConsole
                        ? 'border-[#1f242c]/10 text-[#1f242c] hover:border-[#ffd400] hover:text-[#1f242c]'
                      : isDecisionDeck
                        ? 'border-[#1f242c]/10 text-[#1f242c] hover:border-[#facc15] hover:text-[#1f242c]'
                      : isSoftFashionDiscovery
                        ? 'border-[#ead8cf] text-[#8f4d41] hover:border-[#d86b55] hover:text-[#d86b55]'
                      : isFragranceConsole
                        ? 'border-[#eadfd7] text-[#5b3940] hover:border-[#c79f8b] hover:text-[#5b3940]'
                      : 'border-border text-foreground hover:border-primary/30 hover:text-primary'
                  }`}
                >
                  {clearButtonText}
                </button>
              )}
            </div>
          </div>
        )}

        {isDecisionDeck ? (
          <div className="grid gap-3 rounded-[1.5rem] border border-[#1f242c]/10 bg-white/82 p-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1rem] border border-[#1f242c]/8 bg-[#fffdf7] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c818b]">
                {prefersArabicCopy ? 'المسار الحالي' : 'Current path'}
              </p>
              <p className="mt-2 text-sm font-black text-[#1f242c]">
                {activeCategoryLabel}
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#1f242c]/8 bg-[#fffdf7] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c818b]">
                {prefersArabicCopy ? 'المعروض الآن' : 'Showing now'}
              </p>
              <p className="mt-2 text-sm font-black text-[#1f242c]">
                {isLoading ? '...' : `${pagination.total} ${resultsLabel}`}
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#1f242c]/8 bg-[#fffdf7] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c818b]">
                {prefersArabicCopy ? 'ترتيب الفحص' : 'Sort review'}
              </p>
              <p className="mt-2 text-sm font-black text-[#1f242c]">
                {selectedSortLabel}
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#1f242c]/8 bg-[#1f242c] px-4 py-3 text-[#fff4d1] shadow-[0_24px_60px_-48px_rgba(31,36,44,0.72)]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ffd400]">
                {prefersArabicCopy ? 'جاهزية القرار' : 'Decision readiness'}
              </p>
              <p className="mt-2 text-sm font-black">
                {decisionModeLabel}
              </p>
            </div>
          </div>
        ) : isSpecConsole ? (
          <div className="grid gap-3 rounded-[1.45rem] border border-[#1f242c]/10 bg-white/76 p-3 sm:grid-cols-3">
            <div className="rounded-[1rem] border border-[#1f242c]/8 bg-[#fffdf6] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c818b]">
                {prefersArabicCopy ? 'التصنيف الحالي' : 'Current category'}
              </p>
              <p className="mt-2 text-sm font-black text-[#1f242c]">
                {activeCategoryLabel}
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#1f242c]/8 bg-[#fffdf6] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7c818b]">
                {prefersArabicCopy ? 'المطابق الآن' : 'Matching now'}
              </p>
              <p className="mt-2 text-sm font-black text-[#1f242c]">
                {isLoading ? '...' : `${pagination.total} ${resultsLabel}`}
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#1f242c]/8 bg-[#1f242c] px-4 py-3 text-[#fff4d1] shadow-[0_24px_60px_-48px_rgba(31,36,44,0.72)]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ffd400]">
                {prefersArabicCopy ? 'ترتيب القراءة' : 'Read order'}
              </p>
              <p className="mt-2 text-sm font-black">
                {selectedSortLabel}
              </p>
            </div>
          </div>
        ) : isElessiFilterDeck ? (
          <div className="grid gap-3 rounded-[1.45rem] border border-[#ead8cb] bg-white/82 p-3 sm:grid-cols-3">
            <div className="rounded-[1rem] border border-[#efe0d4] bg-[#fffaf6] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8f5c44]">
                القسم المفتوح
              </p>
              <p className="mt-2 text-sm font-black text-[#2d211e]">
                {activeCategoryLabel}
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#efe0d4] bg-[#fffaf6] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8f5c44]">
                {prefersArabicCopy ? 'المعروض الآن' : 'Showing now'}
              </p>
              <p className="mt-2 text-sm font-black text-[#2d211e]">
                {isLoading ? '...' : `${pagination.total} ${resultsLabel}`}
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#ead8cb] bg-[#2d211e] px-4 py-3 text-[#f8e5d3] shadow-[0_24px_60px_-48px_rgba(45,33,30,0.72)]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#f0c9ab]">
                إيقاع التصفح
              </p>
              <p className="mt-2 text-sm font-black">
                {hasActiveControls ? 'قرار أقرب' : 'جاهز للاكتشاف'}
              </p>
            </div>
          </div>
        ) : isElessiSpecToolbar ? (
          <div className="grid gap-3 rounded-[1.45rem] border border-[#d8cdbd] bg-white/78 p-3 sm:grid-cols-3">
            <div className="rounded-[1rem] border border-[#e7dccd] bg-[#fffdf7] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8a6a48]">
                المسار المفتوح
              </p>
              <p className="mt-2 text-sm font-black text-[#2d241f]">
                {activeCategoryLabel}
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#e7dccd] bg-[#fffdf7] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8a6a48]">
                {prefersArabicCopy ? 'المطابق الآن' : 'Matching now'}
              </p>
              <p className="mt-2 text-sm font-black text-[#2d241f]">
                {isLoading ? '...' : `${pagination.total} ${resultsLabel}`}
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#d8cdbd] bg-[#2d241f] px-4 py-3 text-[#f6dec3] shadow-[0_24px_60px_-48px_rgba(45,36,31,0.7)]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#e7c08d]">
                الفرز الحالي
              </p>
              <p className="mt-2 text-sm font-black">
                {selectedSortLabel}
              </p>
            </div>
          </div>
        ) : isElessiCategoryRibbon ? (
          <div className="grid gap-3 rounded-[1.4rem] border border-[#ead8cb] bg-white/82 p-3 sm:grid-cols-3">
            <div className="rounded-[1rem] border border-[#efe0d4] bg-[#fffaf6] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8f5c44]">
                دخول أسرع
              </p>
              <p className="mt-2 text-sm font-bold text-[#2d211e]">
                اختَر القسم أو ابحث، ثم ادخل إلى الشبكة بدون دوران زائد.
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#efe0d4] bg-[#fffaf6] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8f5c44]">
                {prefersArabicCopy ? 'المعروض الآن' : 'Showing now'}
              </p>
              <p className="mt-2 text-sm font-bold text-[#2d211e]">
                {isLoading ? '...' : `${pagination.total} ${resultsLabel}`}
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#efe0d4] bg-[#fffaf6] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8f5c44]">
                الترتيب الحالي
              </p>
              <p className="mt-2 text-sm font-bold text-[#2d211e]">
                {selectedSortLabel}
              </p>
            </div>
          </div>
        ) : isElessiGiftToolbar ? (
          <div className="grid gap-3 rounded-[1.4rem] border border-[#ead8cb] bg-white/82 p-3 sm:grid-cols-3">
            <div className="rounded-[1rem] border border-[#f0e4dd] bg-[#fffaf6] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8b623e]">
                المجموعة المفتوحة
              </p>
              <p className="mt-2 text-sm font-bold text-[#3d292c]">
                {activeCategoryLabel}
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#f0e4dd] bg-[#fffaf6] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8b623e]">
                {prefersArabicCopy ? 'المعروض الآن' : 'Showing now'}
              </p>
              <p className="mt-2 text-sm font-bold text-[#3d292c]">
                {isLoading ? '...' : `${pagination.total} ${resultsLabel}`}
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#f0e4dd] bg-[#fffaf6] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8b623e]">
                الفرز الحالي
              </p>
              <p className="mt-2 text-sm font-bold text-[#3d292c]">
                {selectedSortLabel}
              </p>
            </div>
          </div>
        ) : isBoutiqueDiscovery ? (
          <div className="grid gap-3 rounded-[1.4rem] border border-[#eddcd4] bg-white/76 p-3 sm:grid-cols-3">
            <div className="rounded-[1rem] border border-[#f0e2db] bg-[#fffaf6] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8f4d41]">
                الإيقاع المفتوح
              </p>
              <p className="mt-2 text-sm font-bold text-[#3d2a2f]">
                ابدئي من الفساتين أو البلوزات أو الإكسسوار، ثم ضيّقي الطريق من غير ما تثقلي الرف.
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#f0e2db] bg-[#fffaf6] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8f4d41]">
                {prefersArabicCopy ? 'المعروض الآن' : 'Showing now'}
              </p>
              <p className="mt-2 text-sm font-bold text-[#3d2a2f]">
                {isLoading ? '...' : `${pagination.total} ${resultsLabel}`}
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#f0e2db] bg-[#fffaf6] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8f4d41]">
                اللمسة الأخيرة
              </p>
              <p className="mt-2 text-sm font-bold text-[#3d2a2f]">
                {selectedSortLabel}
              </p>
            </div>
          </div>
        ) : isFitFinder ? (
          <>
            <div className="flex flex-wrap items-center gap-2 rounded-[1.2rem] border border-[#eddcd4] bg-white/88 p-3 sm:hidden">
              <span className="inline-flex rounded-full bg-[linear-gradient(135deg,#2f232d_0%,#8f4d41_100%)] px-3 py-1 text-xs font-black text-white">
                {isLoading ? '...' : `${pagination.total} ${resultsLabel}`}
              </span>
              <span className="inline-flex rounded-full border border-[#ead8cf] bg-[#fffaf6] px-3 py-1 text-xs font-bold text-[#5b4950]">
                {activeCategoryLabel}
              </span>
              {selectedSortLabel ? (
                <span className="inline-flex rounded-full border border-[#ead8cf] bg-[#fffaf6] px-3 py-1 text-xs font-bold text-[#8f4d41]">
                  {selectedSortLabel}
                </span>
              ) : null}
            </div>
            <div className="hidden gap-3 rounded-[1.4rem] border border-[#eddcd4] bg-white/75 p-3 sm:grid sm:grid-cols-3">
            <div className="rounded-[1rem] border border-[#f0e2db] bg-[#fffaf6] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8f4d41]">
                أقرب مقاس
              </p>
              <p className="mt-2 text-sm font-bold text-[#3d2a2f]">
                فلترة أسرع حسب المقاس واللون بدل التنقل الطويل داخل الشبكة.
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#f0e2db] bg-[#fffaf6] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8f4d41]">
                السعر أولًا
              </p>
              <p className="mt-2 text-sm font-bold text-[#3d2a2f]">
                اعرفي عدد النتائج والفرز الحالي قبل ما تدخلي أي منتج.
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#f0e2db] bg-[#fffaf6] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8f4d41]">
                طريق أقصر
              </p>
              <p className="mt-2 text-sm font-bold text-[#3d2a2f]">
                ابدئي من الفستان أو الحذاء أو المقاس المطلوب مباشرة.
              </p>
            </div>
            </div>
          </>
        ) : isFragranceConsole ? (
          <div className="grid gap-3 rounded-[1.4rem] border border-[#eadfd7] bg-white/82 p-3 sm:grid-cols-3">
            <div className="rounded-[1rem] border border-[#f0e4dd] bg-[#fffaf6] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8b623e]">
                العائلة المفتوحة
              </p>
              <p className="mt-2 text-sm font-bold text-[#3d292c]">
                {activeCategoryLabel}
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#f0e4dd] bg-[#fffaf6] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8b623e]">
                {prefersArabicCopy ? 'المعروض الآن' : 'Showing now'}
              </p>
              <p className="mt-2 text-sm font-bold text-[#3d292c]">
                {isLoading ? '...' : `${pagination.total} ${resultsLabel}`}
              </p>
            </div>
            <div className="rounded-[1rem] border border-[#f0e4dd] bg-[#fffaf6] px-4 py-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8b623e]">
                الفرز الحالي
              </p>
              <p className="mt-2 text-sm font-bold text-[#3d292c]">
                {selectedSortLabel}
              </p>
            </div>
          </div>
        ) : null}

        <div className={hideSearch ? 'flex justify-end' : 'grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_220px]'}>
          {!hideSearch ? (
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                id={searchInputId}
                name="catalogSearch"
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder={searchPlaceholder}
                className={`h-12 w-full rounded-[var(--button-radius)] px-5 pe-28 text-sm outline-none transition-colors ${
                  isBiteRush
                    ? 'border border-[#171717]/10 bg-[#fffaf6] text-[#171717] placeholder:text-[#8c766a] focus:border-[#ff6b2c] focus:ring-2 focus:ring-[#ff6b2c]/15'
                  : isMenShoes
                    ? 'border border-[#ded0c2] bg-white text-[#1f262b] placeholder:text-[#8d7768] focus:border-[#f57a1d] focus:ring-2 focus:ring-[#f57a1d]/12'
                  : isElessiFilterDeck || isElessiCategoryRibbon
                    ? 'border border-[#ead8cb] bg-white text-[#2d211e] placeholder:text-[#94786f] focus:border-[#c79f8b] focus:ring-2 focus:ring-[#c79f8b]/12'
                  : isElessiSpecToolbar
                    ? 'border border-[#d8cdbd] bg-white/92 text-[#2d241f] placeholder:text-[#8a7b71] focus:border-[#cda56d] focus:ring-2 focus:ring-[#cda56d]/12'
                  : isElessiGiftToolbar
                    ? 'border border-[#ead8cb] bg-white text-[#3d292c] placeholder:text-[#8b756f] focus:border-[#c79f8b] focus:ring-2 focus:ring-[#c79f8b]/12'
                  : isFragranceConsole
                    ? 'border border-[#e6d8cf] bg-white text-[#3d292c] placeholder:text-[#8b756f] focus:border-[#c79f8b] focus:ring-2 focus:ring-[#c79f8b]/12'
                  : isSpecConsole
                      ? 'border border-[#1f242c]/10 bg-white/88 text-[#1f242c] placeholder:text-[#7c818b] focus:border-[#ffd400] focus:ring-2 focus:ring-[#ffd400]/15'
                    : isDecisionDeck
                      ? 'border border-[#1f242c]/10 bg-white text-[#1f242c] placeholder:text-[#818792] focus:border-[#facc15] focus:ring-2 focus:ring-[#facc15]/15'
                    : isSoftFashionDiscovery
                      ? 'border border-[#ead8cf] bg-white text-[#3d2a2f] placeholder:text-[#90797f] focus:border-[#d86b55] focus:ring-2 focus:ring-[#d86b55]/12'
                    : 'border border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary/35 focus:ring-2 focus:ring-primary/10'
                }`}
              />
              <button
                type="submit"
                className={`absolute inset-y-1 end-1 rounded-[var(--button-radius)] px-5 text-sm font-bold transition-opacity hover:opacity-95 ${
                  isBiteRush
                    ? 'bg-[#171717] text-white'
                  : isMenShoes
                    ? 'bg-[#1f262b] text-white'
                  : isElessiFilterDeck || isElessiCategoryRibbon
                    ? 'bg-[linear-gradient(135deg,#8f5c44_0%,#6b4a3c_100%)] text-white'
                  : isElessiSpecToolbar
                    ? 'bg-[#2d241f] text-[#f6dec3]'
                  : isElessiGiftToolbar
                    ? 'bg-[linear-gradient(135deg,#5b3940_0%,#8b623e_100%)] text-white'
                  : isFragranceConsole
                    ? 'bg-[linear-gradient(135deg,#3d292c_0%,#6d4c4a_100%)] text-white'
                  : isSpecConsole
                      ? 'bg-[#1f242c] text-[#fff4d1]'
                    : isDecisionDeck
                      ? 'bg-[#1f242c] text-[#fff4d1]'
                    : isSoftFashionDiscovery
                      ? 'bg-[linear-gradient(135deg,#2f232d_0%,#8f4d41_100%)] text-white'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                {prefersArabicCopy ? 'بحث' : 'Search'}
              </button>
            </form>
          ) : null}

          <select
            id={sortSelectId}
            name="catalogSort"
            value={selectedSort}
            onChange={(event) =>
              setSearchParams(
                applyCatalogFilters(searchParams, {
                  sortValue: event.target.value as typeof selectedSort,
                }),
              )
            }
            className={`h-12 ${hideSearch ? 'min-w-[220px]' : 'w-full'} rounded-[var(--button-radius)] px-4 text-sm font-semibold outline-none transition-colors ${
                isBiteRush
                  ? 'border border-[#171717]/10 bg-[#fffaf6] text-[#171717] focus:border-[#ff6b2c] focus:ring-2 focus:ring-[#ff6b2c]/15'
                : isMenShoes
                  ? 'border border-[#ded0c2] bg-white text-[#1f262b] focus:border-[#f57a1d] focus:ring-2 focus:ring-[#f57a1d]/12'
                : isElessiFilterDeck || isElessiCategoryRibbon
                  ? 'border border-[#ead8cb] bg-white text-[#2d211e] focus:border-[#c79f8b] focus:ring-2 focus:ring-[#c79f8b]/12'
                : isElessiSpecToolbar
                  ? 'border border-[#d8cdbd] bg-white/92 text-[#2d241f] focus:border-[#cda56d] focus:ring-2 focus:ring-[#cda56d]/12'
                : isElessiGiftToolbar
                  ? 'border border-[#ead8cb] bg-white text-[#3d292c] focus:border-[#c79f8b] focus:ring-2 focus:ring-[#c79f8b]/12'
                : isFragranceConsole
                  ? 'border border-[#e6d8cf] bg-white text-[#3d292c] focus:border-[#c79f8b] focus:ring-2 focus:ring-[#c79f8b]/12'
                : isSpecConsole
                    ? 'border border-[#1f242c]/10 bg-white/88 text-[#1f242c] focus:border-[#ffd400] focus:ring-2 focus:ring-[#ffd400]/15'
                  : isDecisionDeck
                    ? 'border border-[#1f242c]/10 bg-white text-[#1f242c] focus:border-[#facc15] focus:ring-2 focus:ring-[#facc15]/15'
                  : isSoftFashionDiscovery
                    ? 'border border-[#ead8cf] bg-white text-[#3d2a2f] focus:border-[#d86b55] focus:ring-2 focus:ring-[#d86b55]/12'
                  : 'border border-border bg-card text-foreground focus:border-primary/35 focus:ring-2 focus:ring-primary/10'
            }`}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {shouldShowMobileCategoryChips ? (
          <div className="md:hidden -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() =>
                setSearchParams(
                  applyCatalogFilters(searchParams, {
                    categoryId: null,
                  }),
                )
              }
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                selectedCategory === 'all'
                  ? isElessiFilterDeck || isElessiCategoryRibbon
                    ? 'bg-[linear-gradient(135deg,#8f5c44_0%,#6b4a3c_100%)] text-white shadow-[0_18px_36px_-24px_rgba(107,74,60,0.58)]'
                    : isFitFinder
                      ? 'bg-[linear-gradient(135deg,#2f232d_0%,#8f4d41_100%)] text-white shadow-[0_18px_36px_-24px_rgba(107,33,49,0.44)]'
                    : 'bg-[#1f262b] text-white shadow-[0_18px_36px_-24px_rgba(31,38,43,0.8)]'
                  : isDecisionDeck
                    ? 'border border-[#d6dbe2] bg-white text-[#1f242c]'
                  : isFitFinder
                    ? 'border border-[#ead8cf] bg-white text-[#5b4950]'
                  : isElessiFilterDeck || isElessiCategoryRibbon
                    ? 'border border-[#ead8cb] bg-white text-[#6b4a3c]'
                  : 'border border-[#ded0c2] bg-white text-[#4f4034]'
              }`}
            >
              {allCategoriesLabel}
            </button>

            {visibleCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() =>
                  setSearchParams(
                    applyCatalogFilters(searchParams, {
                      categoryId: category.id,
                    }),
                  )
                }
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                  selectedCategory === category.id
                    ? isDecisionDeck
                      ? 'bg-[#1f242c] text-[#fff4d1] shadow-[0_20px_40px_-24px_rgba(31,36,44,0.72)]'
                      : isFitFinder
                        ? 'bg-[linear-gradient(135deg,#d86b55_0%,#8f4d41_100%)] text-white shadow-[0_20px_40px_-24px_rgba(107,33,49,0.44)]'
                      : isElessiFilterDeck || isElessiCategoryRibbon
                        ? 'bg-[linear-gradient(135deg,#8f5c44_0%,#6b4a3c_100%)] text-white shadow-[0_20px_40px_-24px_rgba(107,74,60,0.58)]'
                      : 'bg-[linear-gradient(135deg,#f57a1d_0%,#d65700_100%)] text-white shadow-[0_20px_40px_-24px_rgba(245,122,29,0.7)]'
                    : isDecisionDeck
                      ? 'border border-[#d6dbe2] bg-white text-[#1f242c]'
                      : isFitFinder
                        ? 'border border-[#ead8cf] bg-white text-[#5b4950]'
                      : isElessiFilterDeck || isElessiCategoryRibbon
                        ? 'border border-[#ead8cb] bg-white text-[#6b4a3c]'
                      : 'border border-[#ded0c2] bg-white text-[#4f4034]'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        ) : null}

        {!hideDesktopCategoryChips ? (
          <div className={`hidden flex-wrap md:flex ${variant === 'marketplace-dense' ? 'gap-1.5' : 'gap-2'}`}>
            <button
              type="button"
              onClick={() =>
                setSearchParams(
                  applyCatalogFilters(searchParams, {
                    categoryId: null,
                  }),
                )
              }
              className={`rounded-[var(--button-radius)] px-3 py-2 text-sm font-semibold transition-colors ${
                selectedCategory === 'all'
                  ? isBiteRush
                    ? 'bg-[#171717] text-white'
                    : isElessiFilterDeck || isElessiCategoryRibbon
                      ? 'bg-[linear-gradient(135deg,#8f5c44_0%,#6b4a3c_100%)] text-white shadow-[0_18px_40px_-24px_rgba(143,92,68,0.52)]'
                    : isElessiSpecToolbar
                      ? 'bg-[#2d241f] text-[#f6dec3] shadow-[0_18px_40px_-24px_rgba(45,36,31,0.62)]'
                    : isElessiGiftToolbar
                      ? 'bg-[linear-gradient(135deg,#5b3940_0%,#8b623e_100%)] text-white shadow-[0_18px_40px_-24px_rgba(91,57,64,0.42)]'
                    : isMenShoes
                      ? 'bg-[#1f262b] text-white'
                    : isSpecConsole
                      ? 'bg-[#1f242c] text-[#fff4d1]'
                    : isDecisionDeck
                      ? 'bg-[#1f242c] text-[#fff4d1]'
                    : isFragranceConsole
                      ? 'bg-[linear-gradient(135deg,#3d292c_0%,#6d4c4a_100%)] text-white'
                    : isSoftFashionDiscovery
                      ? 'bg-[linear-gradient(135deg,#2f232d_0%,#8f4d41_100%)] text-white'
                    : 'bg-primary text-primary-foreground'
                  : isBiteRush
                    ? 'border border-[#171717]/10 bg-white text-[#171717] hover:border-[#ff6b2c] hover:text-[#dc2626]'
                    : isElessiFilterDeck || isElessiCategoryRibbon
                      ? 'border border-[#ead8cb] bg-white text-[#6b4a3c] hover:border-[#c79f8b] hover:text-[#8f5c44]'
                    : isElessiSpecToolbar
                      ? 'border border-[#d8cdbd] bg-white/92 text-[#2d241f] hover:border-[#cda56d] hover:text-[#2d241f]'
                    : isElessiGiftToolbar
                      ? 'border border-[#ead8cb] bg-white text-[#6d4c4a] hover:border-[#c79f8b] hover:text-[#5b3940]'
                    : isMenShoes
                      ? 'border border-[#ded0c2] bg-white text-[#4f4034] hover:border-[#f57a1d] hover:text-[#f57a1d]'
                    : isSpecConsole
                      ? 'border border-[#1f242c]/10 bg-white/84 text-[#1f242c] hover:border-[#ffd400] hover:text-[#1f242c]'
                    : isDecisionDeck
                      ? 'border border-[#d6dbe2] bg-white text-[#1f242c] hover:border-[#facc15] hover:text-[#1f242c]'
                    : isFragranceConsole
                      ? 'border border-[#eadfd7] bg-white text-[#6d4c4a] hover:border-[#c79f8b] hover:text-[#5b3940]'
                    : isSoftFashionDiscovery
                      ? 'border border-[#ead8cf] bg-white text-[#5b4950] hover:border-[#d86b55] hover:text-[#d86b55]'
                    : 'border border-border bg-card text-foreground hover:border-primary/25 hover:text-primary'
              }`}
            >
              {allCategoriesLabel}
            </button>

            {visibleCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() =>
                  setSearchParams(
                    applyCatalogFilters(searchParams, {
                      categoryId: category.id,
                    }),
                  )
                }
                className={`rounded-[var(--button-radius)] px-3 py-2 text-sm font-semibold transition-colors ${
                  selectedCategory === category.id
                    ? isBiteRush
                      ? 'bg-[#dc2626] text-white'
                      : isElessiFilterDeck || isElessiCategoryRibbon
                        ? 'bg-[linear-gradient(135deg,#8f5c44_0%,#6b4a3c_100%)] text-white shadow-[0_18px_40px_-24px_rgba(143,92,68,0.52)]'
                      : isElessiSpecToolbar
                        ? 'bg-[#2d241f] text-[#f6dec3] shadow-[0_18px_40px_-24px_rgba(45,36,31,0.62)]'
                      : isElessiGiftToolbar
                        ? 'bg-[linear-gradient(135deg,#5b3940_0%,#8b623e_100%)] text-white shadow-[0_18px_40px_-24px_rgba(91,57,64,0.42)]'
                      : isMenShoes
                        ? 'bg-[linear-gradient(135deg,#f57a1d_0%,#d65700_100%)] text-white'
                        : isSpecConsole
                          ? 'bg-[#ffd400] text-[#1f242c] shadow-[0_18px_40px_-24px_rgba(255,212,0,0.68)]'
                        : isDecisionDeck
                          ? 'bg-[#1f242c] text-[#fff4d1] shadow-[0_18px_40px_-24px_rgba(31,36,44,0.72)]'
                        : isFragranceConsole
                          ? 'bg-[linear-gradient(135deg,#5b3940_0%,#8b623e_100%)] text-white shadow-[0_18px_40px_-24px_rgba(91,57,64,0.42)]'
                        : isSoftFashionDiscovery
                          ? 'bg-[linear-gradient(135deg,#d86b55_0%,#8f4d41_100%)] text-white'
                      : 'bg-primary text-primary-foreground'
                    : isBiteRush
                      ? 'border border-[#171717]/10 bg-white text-[#171717] hover:border-[#ff6b2c] hover:text-[#dc2626]'
                      : isElessiFilterDeck || isElessiCategoryRibbon
                        ? 'border border-[#ead8cb] bg-white text-[#6b4a3c] hover:border-[#c79f8b] hover:text-[#8f5c44]'
                      : isElessiSpecToolbar
                        ? 'border border-[#d8cdbd] bg-white/92 text-[#2d241f] hover:border-[#cda56d] hover:text-[#2d241f]'
                      : isElessiGiftToolbar
                        ? 'border border-[#ead8cb] bg-white text-[#6d4c4a] hover:border-[#c79f8b] hover:text-[#5b3940]'
                      : isMenShoes
                        ? 'border border-[#ded0c2] bg-white text-[#4f4034] hover:border-[#f57a1d] hover:text-[#f57a1d]'
                        : isSpecConsole
                          ? 'border border-[#1f242c]/10 bg-white/84 text-[#1f242c] hover:border-[#ffd400] hover:text-[#1f242c]'
                        : isDecisionDeck
                          ? 'border border-[#d6dbe2] bg-white text-[#1f242c] hover:border-[#facc15] hover:text-[#1f242c]'
                        : isFragranceConsole
                          ? 'border border-[#eadfd7] bg-white text-[#6d4c4a] hover:border-[#c79f8b] hover:text-[#5b3940]'
                        : isSoftFashionDiscovery
                          ? 'border border-[#ead8cf] bg-white text-[#5b4950] hover:border-[#d86b55] hover:text-[#d86b55]'
                      : 'border border-border bg-card text-foreground hover:border-primary/25 hover:text-primary'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default ShopCommandBar;
