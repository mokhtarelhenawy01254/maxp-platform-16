import React from 'react';
import { Link } from 'react-router-dom';
import type { ProductGridController } from './useProductGridController';

export interface ProductGridHeaderProps {
  controller: ProductGridController;
}

const MARKETPLACE_CATEGORY_IMAGES: Record<string, string> = {
  // Beauty & Care
  'beauty-care': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80',
  'hair-dryers': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80',
  'hair': 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80',
  'shavers': 'https://images.unsplash.com/photo-1508380702597-707c1b00695c?auto=format&fit=crop&w=400&q=80',
  'skincare': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80',
  'makeup': 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=400&q=80',
  'perfumes': 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=400&q=80',
  // Tools & Home Improvement
  'tools-improvement': 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80',
  'power-tools': 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80',
  'hand-tools': 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=400&q=80',
  'lighting': 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=400&q=80',
  'plumbing': 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=400&q=80',
  'industrial-scientific': 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80',
  // Electronics
  'electronics': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80',
  'mobiles': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80',
  'laptops': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=400&q=80',
  'televisions': 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=400&q=80',
  'headphones': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
  'smart-watches': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
  'tablets': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=400&q=80',
  // Appliances
  'appliances': 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=400&q=80',
  'washing-machines': 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=400&q=80',
  'refrigerators': 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=400&q=80',
  'air-conditioners': 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=400&q=80',
  'vacuum-cleaners': 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=400&q=80',
  'microwaves': 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?auto=format&fit=crop&w=400&q=80',
  'water-heaters': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
  // Home & Kitchen
  'home-kitchen': 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=400&q=80',
  'blenders': 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=400&q=80',
  'cookware': 'https://images.unsplash.com/photo-1584990347449-3972a953716a?auto=format&fit=crop&w=400&q=80',
  'coffee-makers': 'https://images.unsplash.com/photo-1517668808822-9ebb02ae2a0e?auto=format&fit=crop&w=400&q=80',
  'kitchen-tools': 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=400&q=80',
  // Health & Home
  'health-home': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80',
  'supplements': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80',
  'medical-devices': 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=400&q=80',
  // Sports
  'sports': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80',
  'fitness-equipment': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80',
  'sports-gear': 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=400&q=80',
  // Garden
  'garden': 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=400&q=80',
  'garden-tools': 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=400&q=80',
  'planters': 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=400&q=80',
  'outdoor-furniture': 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?auto=format&fit=crop&w=400&q=80',
};

const getMarketplaceCategoryImage = (tokenOrSlug: string): string => {
  const clean = String(tokenOrSlug || '').toLowerCase().trim();
  for (const [key, url] of Object.entries(MARKETPLACE_CATEGORY_IMAGES)) {
    if (clean.includes(key)) return url;
  }
  return 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=400&q=80';
};

const getCategoryFromUrl = (url?: string): string => {
  if (!url || typeof url !== 'string') return '';
  try {
    const queryPart = url.includes('?') ? url.split('?')[1] : url;
    return new URLSearchParams(queryPart || '').get('category') || '';
  } catch {
    return '';
  }
};

const isCategoryMatch = (url?: string, activeCat?: string | null): boolean => {
  if (!activeCat || !url) return false;
  const param = getCategoryFromUrl(url);
  if (param) return param.toLowerCase() === activeCat.toLowerCase();
  return url.toLowerCase().includes(`category=${activeCat.toLowerCase()}`);
};

export const ProductGridHeader: React.FC<ProductGridHeaderProps> = ({ controller }) => {
  const {
    isShopPage,
    isSalePage,
    saleOnly,
    isZenOrganic,
    theme,
    filteredProducts,
    resultsCount,
    searchParams,
    setSearchParams,
    isBiteRush,
    heading,
    productsFoundLabel,
    isButcherCutGrid,
    settings,
    activeFilterCount,
    isAnyElessiOrganicGrid,
    isWomenCuratedRack,
    isWomenFitCatalog,
    isWomenDealEdit,
    isPerfumeCabinet,
    isPerfumeShelf,
    variant,
    isAnyElessiBikeGrid,
    isElessiBikeShopGrid,
    activeCategoryLabel,
    isAnyElessiDigitalGrid,
    isElessiDigitalCatalogGrid,
    activeSearchTerm,
    isAnyElessiBagGrid,
    isElessiBagShopGrid,
    isElessiGrid,
    isElessiSpotlightGrid,
    isElessiListingGrid,
    isElessiCompactShelf,
    isElessiEditorialStack,
    isElessiPlantFavorites,
    isElessiPlantNurseryGrid,
    isDistrictMarket,
    districtMarketSubtitle,
    retailAirEyebrow,
    retailAirSubtitle,
    showRetailAirResultsMeta,
    boutiqueShelfEyebrow,
    boutiqueShelfSubtitle,
    boutiqueRailEyebrow,
    boutiqueRailSubtitle,
    sectionCtaHref,
    sectionCtaText,
    specRackEyebrow,
    specRackSubtitle,
    hideHeader,
    isVelaQuickViewFashionGrid,
    sectionEyebrow,
    isFastlyOfferWall,
    isKhemetLuxe,
    isMarketplaceAvenue,
    viewMode,
    setViewMode,
  } = controller;

  const isRtl = theme.direction === 'rtl';
  const activeCategoryParam = searchParams.get('category');
  const dropdownCategories = (theme.header?.dropdowns || []) as Array<{
    label: string;
    to: string;
    items?: Array<{ label: string; to: string }>;
  }>;

  const matchedDepartment = dropdownCategories.find((d) => {
    if (!activeCategoryParam) return false;
    if (isCategoryMatch(d?.to, activeCategoryParam)) return true;
    return (d.items || []).some((it) => isCategoryMatch(it?.to, activeCategoryParam));
  });

  const activeSubcategory = matchedDepartment?.items?.find((it) =>
    activeCategoryParam ? isCategoryMatch(it?.to, activeCategoryParam) : false
  );

  const activeHeadingTitle = activeSubcategory
    ? activeSubcategory.label
    : matchedDepartment
      ? matchedDepartment.label
      : isRtl
        ? 'جميع المنتجات'
        : 'All Products';

  const circularItems: Array<{ label: string; to: string; active: boolean; slug: string }> = (() => {
    if (matchedDepartment && Array.isArray(matchedDepartment.items) && matchedDepartment.items.length > 0) {
      return matchedDepartment.items.map((it) => {
        const itemCatParam = getCategoryFromUrl(it?.to);
        const safeTo = it?.to || (itemCatParam ? `/shop?category=${itemCatParam}` : '/shop');
        return {
          label: it?.label || '',
          to: safeTo,
          active: isCategoryMatch(safeTo, activeCategoryParam),
          slug: itemCatParam || it?.label || 'category',
        };
      });
    }
    return dropdownCategories.slice(0, 8).map((d) => {
      const itemCatParam = getCategoryFromUrl(d?.to);
      const safeTo = d?.to || (itemCatParam ? `/shop?category=${itemCatParam}` : '/shop');
      return {
        label: d?.label || '',
        to: safeTo,
        active: isCategoryMatch(safeTo, activeCategoryParam),
        slug: itemCatParam || d?.label || 'category',
      };
    });
  })();

  return (
    <>
      {isShopPage && isMarketplaceAvenue ? (
        <div className="mb-8" dir={theme.direction}>
          {/* 1. Breadcrumbs (WoodMart Marketplace 2 style) */}
          <nav className="mb-2.5 flex flex-wrap items-center gap-1.5 text-[13px] text-[#777777]" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-[#e14a5c] transition-colors">{isRtl ? 'الرئيسية' : 'Home'}</Link>
            <span className="text-[#cccccc] text-xs">/</span>
            <Link to="/shop" className="hover:text-[#e14a5c] transition-colors">{isRtl ? 'المتجر' : 'Shop'}</Link>
            {matchedDepartment && (
              <>
                <span className="text-[#cccccc] text-xs">/</span>
                {activeSubcategory ? (
                  <Link to={matchedDepartment.to || '/shop'} className="hover:text-[#e14a5c] transition-colors">
                    {matchedDepartment.label}
                  </Link>
                ) : (
                  <span className="font-semibold text-[#333333]">{matchedDepartment.label}</span>
                )}
              </>
            )}
            {activeSubcategory && (
              <>
                <span className="text-[#cccccc] text-xs">/</span>
                <span className="font-semibold text-[#333333]">{activeSubcategory.label}</span>
              </>
            )}
          </nav>

          {/* 2. Page Title */}
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-[#222222] mb-5 tracking-tight">
            {activeHeadingTitle}
          </h1>

          {/* 3. Circular Subcategories Carousel / Row (WoodMart Marketplace 2 .wd-cats) */}
          {circularItems.length > 0 && (
            <div className="mb-8 overflow-x-auto py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex items-start gap-4 sm:gap-6 md:gap-7 min-w-max pb-1">
                {circularItems.map((item) => {
                  const img = getMarketplaceCategoryImage(item.slug);
                  return (
                    <Link
                      key={item.label}
                      to={item.to || '/shop'}
                      className="group flex flex-col items-center shrink-0 w-20 sm:w-24 md:w-28 text-center transition-transform hover:-translate-y-1"
                    >
                      <div
                        className={`relative aspect-square w-18 h-18 sm:w-22 sm:h-22 md:w-24 md:h-24 rounded-full overflow-hidden bg-white shadow-xs border transition-all ${
                          item.active
                            ? 'border-[#e14a5c] ring-2 ring-[#e14a5c] ring-offset-2'
                            : 'border-[#e5e7eb] group-hover:border-[#e14a5c]'
                        }`}
                      >
                        <img
                          src={img}
                          alt={item.label}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                      <span
                        className={`mt-2.5 text-xs sm:text-[13px] font-semibold leading-tight line-clamp-2 transition-colors ${
                          item.active ? 'text-[#e14a5c] font-bold' : 'text-[#333333] group-hover:text-[#e14a5c]'
                        }`}
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Toolbar (Shop loop head) */}
          <div className="flex flex-col gap-3 border-b border-[#e5e7eb] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[14px] font-normal text-[#777777]">
              {theme.direction === 'rtl' ? (
                <>عرض ١–{Math.min(filteredProducts.length, resultsCount)} من أصل {resultsCount} نتيجة</>
              ) : (
                <>Showing 1–{Math.min(filteredProducts.length, resultsCount)} of {resultsCount} results</>
              )}
            </p>
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={searchParams.get('sortBy') || 'default'}
                  onChange={(e) => setSearchParams((prev) => {
                    const nextParams = new URLSearchParams(prev);
                    if (e.target.value === 'default') nextParams.delete('sortBy');
                    else nextParams.set('sortBy', e.target.value);
                    return nextParams;
                  })}
                  className={`appearance-none cursor-pointer rounded-[4px] border border-[#e2e8f0] bg-white py-1.5 ${theme.direction === 'rtl' ? 'pl-8 pr-3' : 'pr-8 pl-3'} text-[13px] font-medium text-[#333333] shadow-xs outline-none transition hover:border-[#ad7d61] focus:border-[#ad7d61] focus:ring-1 focus:ring-[#ad7d61]`}
                >
                  <option value="default">{theme.direction === 'rtl' ? 'الترتيب الافتراضي' : 'Default sorting'}</option>
                  <option value="price-asc">{theme.direction === 'rtl' ? 'ترتيب حسب السعر: من الأقل إلى الأعلى' : 'Sort by price: low to high'}</option>
                  <option value="price-desc">{theme.direction === 'rtl' ? 'ترتيب حسب السعر: من الأعلى إلى الأقل' : 'Sort by price: high to low'}</option>
                  <option value="latest">{theme.direction === 'rtl' ? 'ترتيب حسب الأحدث' : 'Sort by latest'}</option>
                </select>
                <div className={`pointer-events-none absolute ${theme.direction === 'rtl' ? 'left-2.5' : 'right-2.5'} top-1/2 -translate-y-1/2 text-[#777777]`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-[4px] border border-[#e2e8f0] bg-[#fbfbfb] p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`rounded-[3px] p-1.5 transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white text-[#333333] shadow-xs'
                      : 'text-[#888888] hover:text-[#333333]'
                  }`}
                  aria-label={theme.direction === 'rtl' ? 'عرض شبكي' : 'Grid view'}
                  title={theme.direction === 'rtl' ? 'عرض شبكي' : 'Grid view'}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
                    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`rounded-[3px] p-1.5 transition-all ${
                    viewMode === 'list'
                      ? 'bg-white text-[#333333] shadow-xs'
                      : 'text-[#888888] hover:text-[#333333]'
                  }`}
                  aria-label={theme.direction === 'rtl' ? 'عرض قائمة' : 'List view'}
                  title={theme.direction === 'rtl' ? 'عرض قائمة' : 'List view'}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="3" y="4" width="18" height="3" rx="1"/>
                    <rect x="3" y="10.5" width="18" height="3" rx="1"/>
                    <rect x="3" y="17" width="18" height="3" rx="1"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : isShopPage && isZenOrganic ? (
        <div className="mb-10 flex flex-col gap-4 border-b border-[#e9ebe5] pb-5 sm:flex-row sm:items-center sm:justify-between" dir={theme.direction}>
          <p className="font-sans text-sm font-medium tracking-wide text-muted-foreground">
            {theme.direction === 'rtl' ? (
              <>عرض ١–{Math.min(filteredProducts.length, resultsCount)} من أصل {resultsCount} نتيجة</>
            ) : (
              <>Showing 1–{Math.min(filteredProducts.length, resultsCount)} of {resultsCount} results</>
            )}
          </p>
          <div className="flex items-center gap-8">
            <div className="group relative">
              <select
                value={searchParams.get('sortBy') || 'default'}
                onChange={(e) => setSearchParams((prev) => {
                  const nextParams = new URLSearchParams(prev);
                  if (e.target.value === 'default') nextParams.delete('sortBy');
                  else nextParams.set('sortBy', e.target.value);
                  return nextParams;
                })}
                className={`appearance-none cursor-pointer border-none bg-transparent ${theme.direction === 'rtl' ? 'pl-7' : 'pr-7'} font-sans text-[0.95rem] font-bold text-[#1a3328] outline-none transition-all hover:opacity-75 focus:ring-0`}
              >
                <option value="default">{theme.direction === 'rtl' ? 'الترتيب الافتراضي' : 'Default sorting'}</option>
                <option value="price-asc">{theme.direction === 'rtl' ? 'ترتيب حسب السعر: من الأقل إلى الأعلى' : 'Sort by price: low to high'}</option>
                <option value="price-desc">{theme.direction === 'rtl' ? 'ترتيب حسب السعر: من الأعلى إلى الأقل' : 'Sort by price: high to low'}</option>
                <option value="latest">{theme.direction === 'rtl' ? 'ترتيب حسب الأحدث' : 'Sort by latest'}</option>
              </select>
              <div className={`pointer-events-none absolute ${theme.direction === 'rtl' ? 'left-0' : 'right-0'} top-1/2 -translate-y-1/2 text-[#1a3328]`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-0"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
            <div className="flex items-center gap-3.5">
              <button className="rounded-md p-1.5 text-[#1a3328] transition-all hover:bg-[#88a876]/10" aria-label="Grid view">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
              </button>
              <button className="rounded-md p-1.5 text-[#1a3328]/25 transition-all hover:bg-[#88a876]/10 hover:text-[#1a3328]" aria-label="List view">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="4" rx="1.5"/><rect x="3" y="10" width="18" height="4" rx="1.5"/><rect x="3" y="17" width="18" height="4" rx="1.5"/></svg>
              </button>
            </div>
          </div>
        </div>
      ) : isBiteRush ? (
        <div className="mb-10 flex flex-col gap-4">
          <span className="inline-flex w-fit rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.42em] text-[#dc2626] shadow-md">
            منيو BiteRush
          </span>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <h2 className="font-heading text-4xl font-black uppercase italic tracking-tight text-[#171717] md:text-5xl">
                {heading}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[#5f5f5f] md:text-base">
                صور واضحة، أسعار ظاهرة، وإضافات جاهزة من أول نظرة عشان تختار أسرع.
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#171717]/10 bg-white px-5 py-2 text-sm font-black text-[#171717] shadow-[0_18px_40px_-28px_rgba(17,17,17,0.3)]">
              <span className="text-[#dc2626]">{resultsCount}</span>
              <span>{productsFoundLabel}</span>
            </div>
          </div>
        </div>
      ) : isButcherCutGrid ? (
        <div className="mb-8 border-b border-[#e4d3c2] pb-5 md:mb-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex w-fit rounded-full border border-[#e4d3c2] bg-white px-3 py-1 text-[11px] font-black tracking-[0.24em] text-[#8f1d1d]">
                {isShopPage ? 'رف الجزارة اليومي' : 'تقطيعات مختارة'}
              </span>
              <h2 className="font-heading text-[1.95rem] font-black text-[#2a1714] md:text-[2.35rem]">
                {heading}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[#6c554a] md:text-base">
                {typeof settings?.['subtitle'] === 'string' && settings['subtitle'].trim()
                  ? settings['subtitle'].trim()
                  : isShopPage
                    ? 'اختار القطعية والوزن والتجهيز بسرعة، مع بطاقات واضحة مناسبة للطلبات اليومية والشوي.'
                    : 'رفوف تقطيعات تبرز الوزن والاستخدام المقترح بدل شبكة منتجات عامة.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[#e4d3c2] bg-white px-4 py-2 text-sm font-black text-[#2a1714] shadow-[0_16px_36px_-30px_rgba(42,23,20,0.2)]">
                {resultsCount} {productsFoundLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-[#ebddd0] bg-[#fffaf4] px-4 py-2 text-sm font-bold text-[#8f1d1d]">
                {activeFilterCount > 0 ? `${activeFilterCount} فلاتر مفعّلة` : 'وزن وتقطيع واضح'}
              </span>
            </div>
          </div>
        </div>
      ) : isAnyElessiOrganicGrid ? (
        <div className="mb-8 border-b border-[#eadfcd] pb-5 md:mb-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex w-fit rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-black tracking-[0.24em] text-[#8a6546]">
                {isShopPage ? 'رف السوق اليومي' : 'مختارات الحصاد'}
              </span>
              <h2 className="font-heading text-[1.95rem] font-black tracking-tight text-[#2d3b27] md:text-[2.3rem]">
                {heading}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[#67705e] md:text-base">
                {typeof settings?.['subtitle'] === 'string' && settings['subtitle'].trim()
                  ? settings['subtitle'].trim()
                  : isShopPage
                    ? 'بطاقات أخف للطلب اليومي توضّح الحجم والسعر وتبقي مسار الشراء قريبًا من السلة.'
                    : 'رفوف طازجة تضع الصناديق والاختيارات الأسرع أمام العميل بدون ازدحام بصري.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[#eadfcd] bg-white px-4 py-2 text-sm font-black text-[#2d3b27] shadow-[0_16px_36px_-30px_rgba(45,59,39,0.14)]">
                {resultsCount} {productsFoundLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-[#efe6da] bg-[#fff9f2] px-4 py-2 text-sm font-bold text-[#6c5b49]">
                {activeFilterCount > 0 ? `${activeFilterCount} فلاتر مفعّلة` : 'اختيارات موسمية'}
              </span>
            </div>
          </div>
        </div>
      ) : isWomenCuratedRack ? (
        <div className="mb-7 border-b border-[#ead8cf] pb-5 md:mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex w-fit rounded-full border border-[#eed9cf] bg-white/92 px-3 py-1 text-[11px] font-black tracking-[0.24em] text-[#8f4d41]">
                {isShopPage ? 'فلتر ثم اختاري' : saleOnly ? 'خصم محسوب' : 'رف التحرير'}
              </span>
              <h2 className="font-heading text-[1.9rem] font-black tracking-tight text-foreground md:text-[2.2rem]">
                {heading}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[#6e585f] md:text-base">
                {typeof settings?.['subtitle'] === 'string' && settings['subtitle'].trim()
                  ? settings['subtitle'].trim()
                  : isShopPage
                    ? 'شبكة أهدأ لقطع أكثر، مع بقاء الصور والسعر والخصم أقرب للحسم.'
                    : saleOnly
                      ? 'العروض تظهر كاختيارات مركزة بدل شبكة ممتدة بنفس الإيقاع.'
                      : 'قطعة رئيسية تقود العين ثم 3 اختيارات أخف حولها، بدل 4 بطاقات متشابهة.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[#ead8cf] bg-white px-4 py-2 text-sm font-black text-[#3d2419] shadow-[0_16px_36px_-30px_rgba(61,37,25,0.16)]">
                {resultsCount} {productsFoundLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-[#f1e2d6] bg-[#fff7f1] px-4 py-2 text-sm font-bold text-[#8c6956]">
                {activeFilterCount > 0 ? `${activeFilterCount} فلاتر مفعّلة` : 'صور حقيقية'}
              </span>
            </div>
          </div>
        </div>
      ) : isWomenFitCatalog ? (
        <div className="mb-7 border-b border-[#ead8cf] pb-5 md:mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex w-fit rounded-full border border-[#eed9cf] bg-white/92 px-3 py-1 text-[11px] font-black tracking-[0.24em] text-[#8f4d41]">
                فلتر ثم احسمي
              </span>
              <h2 className="font-heading text-[1.85rem] font-black tracking-tight text-foreground md:text-[2.1rem]">
                {heading}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[#6e585f] md:text-base">
                {typeof settings?.['subtitle'] === 'string' && settings['subtitle'].trim()
                  ? settings['subtitle'].trim()
                  : 'شبكة اكتشاف أسرع تركز على اللون والمقاس والسعر بدل الإيقاع التحريري الموجود في الهوم.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[#ead8cf] bg-white px-4 py-2 text-sm font-black text-[#3d2419] shadow-[0_16px_36px_-30px_rgba(61,37,25,0.16)]">
                {resultsCount} {productsFoundLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-[#f1e2d6] bg-[#fff7f1] px-4 py-2 text-sm font-bold text-[#8c6956]">
                {activeFilterCount > 0 ? `${activeFilterCount} فلاتر نشطة` : 'مقارنة أسرع'}
              </span>
            </div>
          </div>
        </div>
      ) : isWomenDealEdit ? (
        <div className="mb-7 rounded-[1.6rem] border border-[#f0d6d0] bg-[linear-gradient(180deg,rgba(255,248,244,0.98),rgba(255,239,233,0.96))] p-5 shadow-[0_26px_74px_-58px_rgba(143,77,65,0.24)] md:mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex w-fit rounded-full bg-[#4b2332] px-3 py-1 text-[11px] font-black tracking-[0.22em] text-white">
                خصومات مركزة
              </span>
              <h2 className="font-heading text-[1.85rem] font-black tracking-tight text-foreground md:text-[2.15rem]">
                {heading}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[#6e585f] md:text-base">
                {typeof settings?.['subtitle'] === 'string' && settings['subtitle'].trim()
                  ? settings['subtitle'].trim()
                  : 'العروض الأساسية تظهر أولًا بشكل أقوى، ثم تكملها قطع أخف للمقارنة السريعة.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[#f0d6d0] bg-white px-4 py-2 text-sm font-black text-[#4b2332] shadow-[0_16px_34px_-30px_rgba(75,35,50,0.16)]">
                {resultsCount} {productsFoundLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-[#f3dfd9] bg-[#fff6f2] px-4 py-2 text-sm font-bold text-[#b25548]">
                أسعار أوضح
              </span>
            </div>
          </div>
        </div>
      ) : isPerfumeCabinet || isPerfumeShelf ? (
        <div className="mb-8 rounded-[1.85rem] border border-[#eadfd6] bg-[linear-gradient(180deg,#fffefb,#f9f2eb)] p-5 shadow-[0_28px_90px_-66px_rgba(61,41,44,0.22)] md:mb-10 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex w-fit rounded-full border border-[#e6d7c9] bg-white/92 px-3 py-1 text-[11px] font-black tracking-[0.22em] text-[#7c4b33]">
                {isPerfumeCabinet ? 'خزانة أثر' : 'فهرس الروائح'}
              </span>
              <h2 className="font-heading text-[1.95rem] font-black tracking-tight text-[#312126] md:text-[2.3rem]">
                {heading}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[#6e5a57] md:text-base">
                {typeof settings?.['subtitle'] === 'string' && settings['subtitle'].trim()
                  ? settings['subtitle'].trim()
                  : isPerfumeCabinet
                    ? 'زجاجات أصلية، فرق سعر واضح، وأحجام معروضة كأنها على رف برفنات مرتب لا داخل شبكة عامة.'
                    : 'اسم العطر، الحجم، والسعر ظاهرون بسرعة حتى تبدأ المقارنة من أول scroll.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[#eadfd6] bg-white px-4 py-2 text-sm font-black text-[#312126] shadow-[0_16px_38px_-30px_rgba(61,41,44,0.2)]">
                {resultsCount} {productsFoundLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-[#efe2d7] bg-[#fff8f3] px-4 py-2 text-sm font-bold text-[#8a5b48]">
                {activeFilterCount > 0 ? `${activeFilterCount} فلاتر مفعّلة` : 'صور حقيقية'}
              </span>
            </div>
          </div>
        </div>
      ) : variant === 'curated-rack' ? (
        <div className="mb-8 rounded-[1.75rem] border border-[#ead8cf] bg-[linear-gradient(180deg,#fffdfa,#fff4ee)] p-5 shadow-[0_26px_76px_-58px_rgba(76,42,44,0.24)] md:mb-10 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex w-fit rounded-full border border-[#eed9cf] bg-white/92 px-3 py-1 text-[11px] font-black tracking-[0.24em] text-[#8f4d41]">
                Curated Rack
              </span>
              <h2 className="font-heading text-[1.95rem] font-black tracking-tight text-foreground md:text-[2.35rem]">
                {heading}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[#6e585f] md:text-base">
                {typeof settings?.['subtitle'] === 'string' && settings['subtitle'].trim()
                  ? settings['subtitle'].trim()
                  : 'شبكة بيع أوضح لصور الملابس والأحذية، مع خصومات ومقاسات أقرب للقرار بدل بطاقات عامة متكررة.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[#ead8cf] bg-white px-4 py-2 text-sm font-black text-[#3d2419] shadow-[0_16px_36px_-30px_rgba(61,37,25,0.24)]">
                {resultsCount} {productsFoundLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-[#f1e2d6] bg-[#fff7f1] px-4 py-2 text-sm font-bold text-[#8c6956]">
                {activeFilterCount > 0 ? `${activeFilterCount} فلاتر مفعّلة` : 'صور حقيقية'}
              </span>
            </div>
          </div>
        </div>
      ) : isAnyElessiBikeGrid ? (
        <div className="mb-7 border-b border-[#e3e7eb] pb-5 md:mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex w-fit text-[11px] font-black uppercase tracking-[0.24em] text-[#7d8894]">
                {isElessiBikeShopGrid
                  ? theme.direction === 'rtl'
                    ? 'الدراجات والمعدات'
                    : 'Ride catalog'
                  : theme.direction === 'rtl'
                    ? 'اختيارات الأسبوع'
                    : 'Weekly picks'}
              </span>
              <h2 className="font-heading text-[2rem] font-black tracking-tight text-[#1d2a33] md:text-[2.3rem]">
                {heading}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[#60717f] md:text-base">
                {typeof settings?.['subtitle'] === 'string' && settings['subtitle'].trim()
                  ? settings['subtitle'].trim()
                  : isElessiBikeShopGrid
                    ? 'شبكة بيضاء أخف للدراجات والملحقات، مع صورة أوضح وسعر ظاهر ومسار شراء أسرع.'
                    : 'اختيارات جاهزة للمدينة والسرعة والصيانة، مع بطاقات مسطحة وأقرب لمتاجر الدراجات المباشرة.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center border border-[#d9dee4] bg-white px-4 py-2 text-sm font-black text-[#1d2a33] shadow-[0_14px_34px_-28px_rgba(18,34,48,0.14)]">
                {resultsCount} {productsFoundLabel}
              </span>
              <span className="inline-flex items-center border border-[#e3e7eb] bg-[#f8fafb] px-4 py-2 text-sm font-bold text-[#60717f]">
                {activeFilterCount > 0
                  ? `${activeFilterCount} فلاتر مفعّلة`
                  : isElessiBikeShopGrid
                    ? activeCategoryLabel
                    : 'شحن سريع ومقاسات أوضح'}
              </span>
            </div>
          </div>
        </div>
      ) : isAnyElessiDigitalGrid ? (
        <div className="mb-7 border-b border-[#e4e9f0] pb-5 md:mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex w-fit text-[11px] font-black uppercase tracking-[0.24em] text-[#7a8595]">
                {isElessiDigitalCatalogGrid
                  ? theme.direction === 'rtl'
                    ? 'كتالوج الأجهزة'
                    : 'Digital catalog'
                  : theme.direction === 'rtl'
                    ? 'ترشيحات اليوم'
                    : 'Today picks'}
              </span>
              <h2 className="font-heading text-[2rem] font-black tracking-tight text-[#161c26] md:text-[2.3rem]">
                {heading}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[#536172] md:text-base">
                {typeof settings?.['subtitle'] === 'string' && settings['subtitle'].trim()
                  ? settings['subtitle'].trim()
                  : isElessiDigitalCatalogGrid
                    ? 'بطاقات تقنية تعرض المواصفات الأساسية والسعر وخيارات النسخ بشكل أوضح وأسرع.'
                    : 'منتجات تقنية جاهزة للمقارنة السريعة: صورة أوضح، مواصفات أقرب، ومسار إضافة أسرع من أول نظرة.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center border border-[#dce3ec] bg-white px-4 py-2 text-sm font-black text-[#161c26] shadow-[0_14px_34px_-28px_rgba(15,23,42,0.14)]">
                {resultsCount} {productsFoundLabel}
              </span>
              <span className="inline-flex items-center border border-[#e8edf5] bg-[#f7f9fc] px-4 py-2 text-sm font-bold text-[#607184]">
                {activeFilterCount > 0
                  ? `${activeFilterCount} فلاتر مفعّلة`
                  : isElessiDigitalCatalogGrid
                    ? activeCategoryLabel
                    : 'الأكثر طلبًا'}
              </span>
              {activeSearchTerm ? (
                <span className="inline-flex items-center border border-[#fae5bf] bg-[#fff8ea] px-4 py-2 text-sm font-bold text-[#b45309]">
                  {`“${activeSearchTerm}”`}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : isAnyElessiBagGrid ? (
        <div className="mb-7 border-b border-[#efe2d7] pb-5 md:mb-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex w-fit text-[11px] font-black uppercase tracking-[0.24em] text-[#9a7666]">
                {isElessiBagShopGrid ? 'حقائب وإكسسوارات' : 'اختيارات اليوم'}
              </span>
              <h2 className="font-heading text-[2rem] font-black tracking-tight text-[#241815] md:text-[2.3rem]">
                {heading}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[#705a50] md:text-base">
                {typeof settings?.['subtitle'] === 'string' && settings['subtitle'].trim()
                  ? settings['subtitle'].trim()
                  : isElessiBagShopGrid
                    ? 'شبكة أوضح للحقائب والمحافظ والأحزمة مع صور أكبر وقرار أسرع حول اللون والحجم والسعر.'
                    : 'منتجات يومية وهدايا وتنقل مرتبة على رف واحد خفيف يساعد العميل يدخل السلة بسرعة.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[#eadfd4] bg-white px-4 py-2 text-sm font-black text-[#241815] shadow-[0_14px_34px_-28px_rgba(61,37,25,0.18)]">
                {resultsCount} {productsFoundLabel}
              </span>
              <span className="inline-flex items-center rounded-full bg-[#f7efe7] px-4 py-2 text-sm font-bold text-[#8b6757]">
                {activeFilterCount > 0
                  ? `${activeFilterCount} فلاتر مفعّلة`
                  : isElessiBagShopGrid
                    ? activeCategoryLabel
                    : 'ألوان ومقاسات متعددة'}
              </span>
            </div>
          </div>
        </div>
      ) : isElessiGrid ? (
        <div className="mb-8 rounded-[1.85rem] border border-[#ead8ca] bg-[linear-gradient(180deg,#fffefb,#f9f0e7)] p-5 shadow-[0_28px_84px_-62px_rgba(91,57,40,0.22)] md:mb-10 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex w-fit rounded-full border border-[#ead8ca] bg-white/94 px-3 py-1 text-[11px] font-black tracking-[0.24em] text-[#8f5c44]">
                {isElessiSpotlightGrid
                  ? 'اختيارات لافتة'
                  : isElessiListingGrid
                    ? 'منتجات جاهزة للمقارنة'
                    : isElessiCompactShelf
                      ? 'رف اليوم'
                      : 'منتجات مميزة'}
              </span>
              <h2 className="font-heading text-[1.95rem] font-black tracking-tight text-[#2d211e] md:text-[2.35rem]">
                {heading}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[#6f5a54] md:text-base">
                {typeof settings?.['subtitle'] === 'string' && settings['subtitle'].trim()
                  ? settings['subtitle'].trim()
                  : isElessiListingGrid
                    ? 'شبكة أقرب لأسلوب القوائم المبيعة: صور أوضح، أسماء مباشرة، وحسم أسرع من أول Scroll.'
                    : isElessiCompactShelf
                      ? 'رف منتجات كثيف باكتشاف سريع، حركة أقل، ومساحة أكبر للمنتجات الأكثر طلبًا.'
                      : isElessiEditorialStack
                        ? 'تجميع أكثر تحررًا للمنتجات البارزة والعروض المدعومة بالصور والنصوص المختصرة.'
                        : 'شبكة بيع دافئة ومباشرة ببطاقات قوية، تلميحات واضحة، ومداخل أقرب للحسم.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[#ead8ca] bg-white px-4 py-2 text-sm font-black text-[#3d2419] shadow-[0_16px_36px_-30px_rgba(61,37,25,0.24)]">
                {resultsCount} {productsFoundLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-[#f1e2d6] bg-[#fff7f1] px-4 py-2 text-sm font-bold text-[#8c6956]">
                {activeFilterCount > 0
                  ? `${activeFilterCount} فلاتر مفعّلة`
                  : isElessiEditorialStack
                    ? 'عرض تحريري'
                    : isElessiCompactShelf
                      ? 'تصفح أسرع'
                      : 'صور أقوى'}
              </span>
            </div>
          </div>
        </div>
      ) : isElessiPlantFavorites || isElessiPlantNurseryGrid ? (
        <div className="mb-7 border-b border-[#e7efe4] pb-5 md:mb-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex w-fit text-[11px] font-black uppercase tracking-[0.24em] text-[#96a08f]">
                {isElessiPlantFavorites ? 'Our Favorites' : 'Plants nursery'}
              </span>
              <h2 className="font-heading text-[2rem] font-black tracking-tight text-[#203528] md:text-[2.25rem]">
                {heading}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[#56715e] md:text-base">
                {typeof settings?.['subtitle'] === 'string' && settings['subtitle'].trim()
                  ? settings['subtitle'].trim()
                  : isElessiPlantFavorites
                    ? 'اختيارات منزلية سهلة تضيف خضرة هادئة للبيت أو المكتب، مع أصص وإضافات تكمل الشكل.'
                    : 'تصفّح النباتات والأصص والهدايا بسرعة، ثم اختر القطعة الأنسب لمساحتك وميزانيتك.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[#d8e6d8] bg-white px-4 py-2 text-sm font-black text-[#203528]">
                {resultsCount} {productsFoundLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-[#d8e6d8] bg-[#f8fbf7] px-4 py-2 text-sm font-bold text-[#56715e]">
                {activeFilterCount > 0
                  ? `${activeFilterCount} فلاتر مفعّلة`
                  : activeCategoryLabel}
              </span>
              {activeSearchTerm ? (
                <span className="inline-flex items-center rounded-full border border-[#d8e6d8] bg-[#eef5ea] px-4 py-2 text-sm font-bold text-[#43604b]">
                  {`“${activeSearchTerm}”`}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : isDistrictMarket ? (
        <div className="mb-8 rounded-[1.75rem] border border-[#eddcd0] bg-[linear-gradient(180deg,#fffdfa,#fff6ef)] p-5 shadow-[0_24px_70px_-56px_rgba(61,37,25,0.28)] md:mb-10 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex w-fit rounded-full border border-[#eed8c9] bg-white/90 px-3 py-1 text-[11px] font-black tracking-[0.24em] text-[#a65a2a]">
                {isShopPage ? 'رفوف جاهزة للطلب' : 'اختيارات مرتبة'}
              </span>
              <h2 className="font-heading text-[1.95rem] font-black tracking-tight text-foreground md:text-[2.35rem]">
                {heading}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[#6e5849] md:text-base">
                {districtMarketSubtitle}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[#ead8cb] bg-white px-4 py-2 text-sm font-black text-[#3d2419] shadow-[0_16px_36px_-30px_rgba(61,37,25,0.24)]">
                {resultsCount} {productsFoundLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-[#f1e2d6] bg-[#fff7f1] px-4 py-2 text-sm font-bold text-[#8c6956]">
                {isShopPage
                  ? activeFilterCount > 0
                    ? `${activeFilterCount} فلاتر مفعّلة`
                    : 'فلترة جاهزة'
                  : 'صور واقعية'}
              </span>
            </div>
          </div>
        </div>
      ) : variant === 'retail-air-grid' ? (
        <div className="mb-8 flex flex-col gap-5 md:mb-10 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            {retailAirEyebrow ? (
              <span className="inline-flex w-fit rounded-full border border-[#e5e7eb] bg-white px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-[#6b7280] shadow-[0_8px_20px_-18px_rgba(15,23,42,0.18)]">
                {retailAirEyebrow}
              </span>
            ) : null}
            <h2 className="font-heading text-[2rem] font-semibold tracking-tight text-[#111827] md:text-[2.25rem]">
              {heading}
            </h2>
            {retailAirSubtitle ? (
              <p className="max-w-2xl text-sm leading-7 text-[#6b7280] md:text-base">
                {retailAirSubtitle}
              </p>
            ) : null}
          </div>
          {showRetailAirResultsMeta ? (
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-5 py-2.5 text-sm font-medium text-[#374151] shadow-[0_10px_26px_-22px_rgba(15,23,42,0.18)]">
              <span className="font-sans text-[#111827]">{resultsCount}</span>
              <span>{productsFoundLabel}</span>
            </div>
          ) : null}
        </div>
      ) : variant === 'boutique-shelf' ? (
        hideHeader ? null : (
          <div className={`mb-10 ${isShopPage ? 'flex flex-col gap-5 md:flex-row md:items-end md:justify-between' : 'mx-auto max-w-2xl text-center'}`}>
            <div className="space-y-3">
              {boutiqueShelfEyebrow ? (
                <span className={`inline-flex w-fit rounded-full border border-[#ead8d2] bg-white px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-[#b06767] shadow-[0_16px_30px_-28px_rgba(59,33,28,0.18)] ${isShopPage ? '' : 'mx-auto'}`}>
                  {boutiqueShelfEyebrow}
                </span>
              ) : null}
              <h2 className="font-heading text-[2rem] font-semibold tracking-tight text-[#201915] md:text-[2.35rem]">
                {heading}
              </h2>
              {boutiqueShelfSubtitle ? (
                <p className={`text-sm leading-7 text-[#7b6d68] md:text-base ${isShopPage ? 'max-w-2xl' : ''}`}>
                  {boutiqueShelfSubtitle}
                </p>
              ) : null}
            </div>
            {isShopPage ? (
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#ead8d2] bg-white px-5 py-2.5 text-sm font-medium text-[#6a5954] shadow-[0_16px_32px_-28px_rgba(59,33,28,0.14)]">
                <span className="font-sans font-semibold text-[#201915]">{resultsCount}</span>
                <span>{productsFoundLabel}</span>
              </div>
            ) : null}
          </div>
        )
      ) : variant === 'boutique-rail' ? (
        <div className={`mb-10 ${isShopPage ? 'flex flex-col gap-5 md:flex-row md:items-end md:justify-between' : 'space-y-4 text-center'}`}>
          <div className={`space-y-3 ${isShopPage ? '' : 'mx-auto max-w-3xl'}`}>
            {boutiqueRailEyebrow ? (
              <span className={`inline-flex w-fit border-b border-[#b89963] pb-2 text-[11px] font-semibold uppercase tracking-[0.34em] text-[#7b6443] ${isShopPage ? '' : 'mx-auto'}`}>
                {boutiqueRailEyebrow}
              </span>
            ) : null}
            <h2 className="font-heading text-[2.2rem] font-semibold tracking-tight text-[#1f1916] md:text-[2.7rem]">
              {heading}
            </h2>
            {boutiqueRailSubtitle ? (
              <p className={`text-sm leading-8 text-[#6f6158] md:text-base ${isShopPage ? 'max-w-2xl' : 'mx-auto max-w-2xl'}`}>
                {boutiqueRailSubtitle}
              </p>
            ) : null}
          </div>
          {sectionCtaHref ? (
            <Link
              to={sectionCtaHref}
              className={`inline-flex w-fit items-center gap-2 border-b border-[#1f1916] pb-1 text-sm font-semibold text-[#1f1916] transition-colors hover:text-[#866230] hover:border-[#866230] ${isShopPage ? '' : 'mx-auto'}`}
            >
              {sectionCtaText || 'عرض الكل'}
              <span aria-hidden="true">←</span>
            </Link>
          ) : null}
        </div>
      ) : variant === 'butcher-cut-grid' || variant === 'butcher-atelier-grid' ? (
        <div className="mb-12 space-y-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="space-y-4">
              <span className="inline-flex w-fit rounded-full border border-[#c5a059]/30 bg-[#3f0c0d] px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059] shadow-xl">
                {theme.direction === 'rtl' ? 'مختارات الجزار' : 'THE BUTCHER\'S SELECTION'}
              </span>
              <h2 className="font-heading text-4xl font-black tracking-tight text-[#3f0c0d] md:text-6xl">
                {heading}
              </h2>
              {settings?.['subtitle'] && (
                <p className="max-w-2xl text-sm leading-8 text-[#3f0c0d]/60 md:text-base">
                  {String(settings['subtitle'])}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-2xl font-black text-[#3f0c0d]">{resultsCount}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#c5a059]">{productsFoundLabel}</span>
              </div>
            </div>
          </div>
          <div className="h-px w-full bg-gradient-to-r from-[#c5a059]/60 via-[#c5a059]/20 to-transparent" />
        </div>
      ) : variant === 'spec-rack' ? (
        <div className="mb-8 rounded-[1.85rem] border border-[#dfe4ea] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,242,222,0.94))] p-5 shadow-[0_28px_88px_-60px_rgba(31,36,44,0.24)] md:mb-10 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <span className="inline-flex w-fit rounded-full border border-[#1f242c]/10 bg-[#1f242c] px-3 py-1 text-[11px] font-black tracking-[0.22em] text-[#fff4d1]">
                {specRackEyebrow}
              </span>
              <h2 className="font-heading text-[1.9rem] font-black tracking-tight text-[#1f242c] md:text-[2.25rem]">
                {heading}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[#5f6470] md:text-base">
                {specRackSubtitle}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-[#1f242c]/10 bg-white px-4 py-2 text-sm font-black text-[#1f242c] shadow-[0_16px_34px_-28px_rgba(31,36,44,0.22)]">
                {resultsCount} {productsFoundLabel}
              </span>
              <span className="inline-flex items-center rounded-full border border-[#eadfb8] bg-[#fff7dc] px-4 py-2 text-sm font-bold text-[#6d5b16]">
                {activeFilterCount > 0 ? `${activeFilterCount} فلاتر مفعّلة` : 'مقارنة أسرع'}
              </span>
            </div>
          </div>
        </div>
      ) : hideHeader ? null : (
        <div className="mb-8 flex flex-col space-y-2">
          {isVelaQuickViewFashionGrid ? (
            isShopPage ? null : (
              <div className="border-b border-[#eadad4] pb-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="space-y-1">
                    {sectionEyebrow ? (
                      <p className="font-heading text-sm font-bold text-[#0abb45] md:text-lg">
                        {sectionEyebrow}
                      </p>
                    ) : null}
                    <h2 className="font-heading text-lg font-bold tracking-normal text-[#131316] md:text-4xl">
                      {heading}
                    </h2>
                  </div>
                  {sectionCtaHref ? (
                    <Link
                      to={sectionCtaHref}
                      className="text-sm font-medium text-[#171717] transition-colors hover:text-[#555555]"
                    >
                      {sectionCtaText || 'View All'}
                    </Link>
                  ) : null}
                </div>
              </div>
            )
          ) : variant === 'legacy-compact-listing' ? (
            <div className="flex flex-col gap-3 border-b border-[#111111] pb-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <h2 className="font-heading text-[1.5rem] font-black uppercase tracking-[0.08em] text-[#111111] md:text-[1.8rem]">
                  {heading}
                </h2>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6a6a6a]">
                  {resultsCount} {productsFoundLabel}
                </p>
              </div>
              {sectionCtaHref ? (
                <Link
                  to={sectionCtaHref}
                  className="inline-flex w-fit items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-[#111111] transition-colors hover:text-[#555555]"
                >
                  {sectionCtaText || 'More'}
                  <span aria-hidden="true">&gt;</span>
                </Link>
              ) : null}
            </div>
          ) : isFastlyOfferWall ? (
            <div className="flex items-center justify-between gap-4 border-b-2 border-[#111111] pb-3">
              <h2 className="font-body text-[1.2rem] font-black tracking-tight text-[#111111] md:text-[1.45rem]">
                {heading}
              </h2>
              {sectionCtaHref ? (
                <Link
                  to={sectionCtaHref}
                  className="inline-flex items-center gap-1 text-sm font-bold text-[#111111] transition-colors hover:text-[#d11f25]"
                >
                  {sectionCtaText || 'المزيد'}
                </Link>
              ) : null}
            </div>
          ) : theme.id === 'style-store-eg' && variant === 'retail-direct-grid' ? (
            <div className="flex flex-col gap-3 border-b-2 border-[#111111]/10 pb-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="font-heading text-[1.55rem] font-black tracking-tight text-[#111111] md:text-[1.75rem]">
                {heading}
              </h2>
              <span className="inline-flex w-fit items-center rounded-sm border border-[#111111] bg-[#fff1b8] px-3 py-1 text-[11px] font-black text-[#111111]">
                {resultsCount} {productsFoundLabel}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                  {heading}
                </h2>
                <p className="font-sans text-sm text-muted-foreground text-start">
                  {resultsCount} {productsFoundLabel}
                </p>
              </div>
              {sectionCtaHref ? (
                <Link
                  to={sectionCtaHref}
                  className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
                >
                  {sectionCtaText}
                  <span aria-hidden="true">&gt;</span>
                </Link>
              ) : null}
            </div>
          )}
        </div>
      )}

      {isKhemetLuxe && isShopPage && (
        <div className="mb-4 hidden sm:flex items-center justify-between" dir={theme.direction}>
          <span className="text-xs font-semibold text-[#8b7d75]">
            {theme.direction === 'rtl' ? 'عرض الكتالوج:' : 'Catalog view:'}
          </span>
          <div className="inline-flex items-center rounded-lg border border-[#e2d6ca] bg-white p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                viewMode === 'grid'
                  ? 'bg-[#201915] text-white shadow-sm'
                  : 'text-[#6f5e52] hover:text-[#201915]'
              }`}
              title={theme.direction === 'rtl' ? 'عرض شبكة' : 'Grid view'}
              aria-label={theme.direction === 'rtl' ? 'عرض شبكة' : 'Grid view'}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
              <span>{theme.direction === 'rtl' ? 'شبكة' : 'Grid'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-[#201915] text-white shadow-sm'
                  : 'text-[#6f5e52] hover:text-[#201915]'
              }`}
              title={theme.direction === 'rtl' ? 'عرض قائمة' : 'List view'}
              aria-label={theme.direction === 'rtl' ? 'عرض قائمة' : 'List view'}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="18" height="3.5" rx="1"/><rect x="3" y="10.25" width="18" height="3.5" rx="1"/><rect x="3" y="16.5" width="18" height="3.5" rx="1"/></svg>
              <span>{theme.direction === 'rtl' ? 'قائمة' : 'List'}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductGridHeader;
