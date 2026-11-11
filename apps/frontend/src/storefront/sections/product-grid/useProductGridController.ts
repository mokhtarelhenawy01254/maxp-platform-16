import React, { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import ProductCard from '../../components/ProductCard';
import { useCategories } from '../../hooks/useCategories';
import { useProducts } from '../../hooks/useProducts';
import { useStorefrontSettings } from '../../hooks/useStorefrontSettings';
import { useStorefrontTheme } from '../../engine/ThemeProvider';
import { getCatalogProductQuery } from '../../utils/catalogFilters';
import {
  resolveCatalogCategoryBySlug,
  resolveCatalogCategoryByToken,
} from '../../utils/catalogCategories';
import {
  extractShopStudioConfig,
  hasShopStudioConfig,
  resolveShopGridClassName,
  resolveShopProductCardTokens,
  resolveShopProductCardVariant,
} from '../../../utils/shopPageStudioConfig';
import { buildStorefrontPath } from '../../utils/paths';
import { isKhemetLuxeTheme } from '../../utils/navigationGuards';
import {
  type CardImagePriorityMode,
  type ProductCardVariant,
  type ProductGridProps,
  STUDIO_CARD_VARIANT_TO_GRID_VARIANT,
} from './gridTypes';
import {
  isSaleIndexRoute,
  isShopIndexRoute,
  normalizeGridVariant,
  resolveCardImageFetchPriority,
  resolveCardImageLoading,
  resolveCardVariant,
  resolveDefaultGridClass,
} from './gridHelpers';

export const useProductGridController = ({ section, settings }: ProductGridProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const location = useLocation();
  const { categories, isLoading: isLoadingCategories } = useCategories();
  const { settings: storefrontSettings } = useStorefrontSettings();
  const { theme } = useStorefrontTheme();

  const rawCategoryToken = searchParams.get('category') || undefined;
  const requestedCategory = resolveCatalogCategoryByToken(categories, rawCategoryToken);
  const defaultCategory = resolveCatalogCategoryBySlug(
    categories,
    typeof settings?.defaultCategorySlug === 'string'
      ? settings.defaultCategorySlug
      : undefined,
  );
  const categoryId =
    requestedCategory?.id ||
    (rawCategoryToken && !isLoadingCategories ? rawCategoryToken : undefined) ||
    (!rawCategoryToken ? defaultCategory?.id : undefined);

  const resolvedCategoryName =
    requestedCategory?.name ||
    categories.find((category) => category.id === categoryId)?.name ||
    (!rawCategoryToken ? defaultCategory?.name : undefined) ||
    undefined;

  const shouldWaitForCategoryToken =
    Boolean(rawCategoryToken) && isLoadingCategories && !requestedCategory;

  const productQuery = {
    ...getCatalogProductQuery(searchParams),
    category: categoryId,
  };

  const productLimit =
    typeof settings?.limit === 'number' && settings.limit > 0 ? settings.limit : 12;
  const saleOnly = settings?.saleOnly === true;

  const includeProductIdsSetting = settings?.['includeProductIds'];
  const includedProductIds = Array.isArray(includeProductIdsSetting)
    ? includeProductIdsSetting
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    : [];

  const excludeProductIdsSetting = settings?.['excludeProductIds'];
  const excludedProductIds = Array.isArray(excludeProductIdsSetting)
    ? excludeProductIdsSetting
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    : [];

  const queryLimit =
    includedProductIds.length > 0
      ? Math.max(productLimit, includedProductIds.length, 24)
      : productLimit;

  const includedProductIdSet = new Set(includedProductIds);
  const excludedProductIdSet = new Set(excludedProductIds);
  const hideHeader = settings?.hideHeader === true;

  const sectionEyebrow =
    typeof settings?.eyebrow === 'string' && settings.eyebrow.trim()
      ? settings.eyebrow.trim()
      : '';
  const sectionCtaText =
    typeof settings?.ctaText === 'string' && settings.ctaText.trim()
      ? settings.ctaText.trim()
      : '';
  const sectionCtaLink =
    typeof settings?.ctaLink === 'string' && settings.ctaLink.trim()
      ? settings.ctaLink.trim()
      : '';
  const sectionCtaHref = sectionCtaLink
    ? buildStorefrontPath(
        location.pathname,
        sectionCtaLink.startsWith('/') ? sectionCtaLink : `/${sectionCtaLink}`,
        location.search,
      )
    : '';

  const heading =
    (typeof settings?.title === 'string' && settings.title.trim()
      ? settings.title.trim()
      : '') ||
    (categoryId
      ? resolvedCategoryName || (theme.direction === 'rtl' ? 'مجموعة الفئات' : 'Category Collection')
      : theme.direction === 'rtl'
        ? 'جميع المنتجات'
        : 'All Products');

  const emptyStateTitle =
    settings?.emptyStateTitle ||
    (saleOnly
      ? (theme.direction === 'rtl' ? 'لا توجد منتجات مخفضة حالياً' : 'No Sale Products Right Now')
      : (theme.direction === 'rtl' ? 'لا توجد منتجات مطابقة' : 'No Matching Products'));

  const emptyStateDescription =
    settings?.emptyStateDescription ||
    (saleOnly
      ? (theme.direction === 'rtl' ? "لم نتمكن من العثور على منتجات مخفضة تطابق العرض الحالي." : "We couldn't find discounted products matching the current view.")
      : (theme.direction === 'rtl' ? "لم نتمكن من العثور على أي منتجات تطابق اختيار الفئة الحالي." : "We couldn't find any products matching your current category selection."));

  const clearButtonText = settings?.clearButtonText || (theme.direction === 'rtl' ? 'عرض جميع المنتجات' : 'View All Products');

  const { products, pagination, isLoading, error } = useProducts(
    {
      limit: queryLimit,
      ...productQuery,
    },
    undefined,
    { enabled: !shouldWaitForCategoryToken },
  );

  const isShopPage = isShopIndexRoute(location.pathname);
  const isSalePage = isSaleIndexRoute(location.pathname);
  const isWomenFashion = theme.id === 'women-fashion-eg';
  const isZenOrganic = theme.id === 'zen-organic';
  const isNovaMobile = theme.id === 'nova-mobile';
  const isBiteRush = theme.id === 'restaurant-demo';
  const isDistrictMarket = theme.id === 'district-market';
  const isPerfumeEg = theme.id === 'perfume-eg';
  const isVelaFashion = theme.id === 'vela-fashion-eg';
  const isFastlyTheme = theme.id === 'fastly-eg';
  const isGracefulTheme = theme.id === 'soft-graceful';
  const isMarketplaceAvenue =
    theme.id === 'marketplace-avenue' ||
    theme.id === 'marketplace-avenue-ar' ||
    Boolean(theme.id?.startsWith('marketplace-avenue'));
  const isKhemetLuxe = isKhemetLuxeTheme(theme.id);

  const hasCustomShopStudio =
    isShopPage && hasShopStudioConfig(storefrontSettings?.storefront);
  const shopStudioConfig = hasCustomShopStudio
    ? extractShopStudioConfig(storefrontSettings?.storefront)
    : null;
  const studioProductCardVariant = hasCustomShopStudio
    ? resolveShopProductCardVariant(shopStudioConfig)
    : 'default';
  const studioGridVariant = hasCustomShopStudio
    ? STUDIO_CARD_VARIANT_TO_GRID_VARIANT[studioProductCardVariant] || 'standard'
    : 'standard';

  const variant = normalizeGridVariant(settings?.variant || section?.variant, studioGridVariant);

  const isElessiBagGrid = variant === 'elessi-bag-grid';
  const isElessiBagShopGrid = variant === 'elessi-bag-shop-grid';
  const isElessiSpotlightGrid = variant === 'elessi-spotlight-grid';
  const isElessiListingGrid = variant === 'elessi-listing-grid';
  const isElessiCompactShelf = variant === 'elessi-compact-shelf';
  const isElessiEditorialStack = variant === 'elessi-editorial-stack';
  const isElessiOrganicMarketGrid = variant === 'elessi-organic-market-grid';
  const isElessiOrganicShopGrid = variant === 'elessi-organic-shop-grid';
  const isElessiDigitalLaunchGrid = variant === 'elessi-digital-launch-grid';
  const isElessiDigitalCatalogGrid = variant === 'elessi-digital-catalog-grid';
  const isElessiPlantFavorites = variant === 'elessi-plant-favorites';
  const isElessiPlantNurseryGrid = variant === 'elessi-plant-nursery-grid';
  const isElessiBikeGrid = variant === 'elessi-bike-grid';
  const isElessiBikeShopGrid = variant === 'elessi-bike-shop-grid';
  const isButcherCutGrid = variant === 'butcher-cut-grid';
  const isButcherAtelierGrid = variant === 'butcher-atelier-grid';

  const isAnyElessiBagGrid = isElessiBagGrid || isElessiBagShopGrid;
  const isAnyElessiBikeGrid = isElessiBikeGrid || isElessiBikeShopGrid;
  const isAnyElessiOrganicGrid = isElessiOrganicMarketGrid || isElessiOrganicShopGrid;
  const isAnyElessiDigitalGrid = isElessiDigitalLaunchGrid || isElessiDigitalCatalogGrid;
  const isElessiGrid =
    isElessiSpotlightGrid ||
    isElessiListingGrid ||
    isElessiCompactShelf ||
    isElessiEditorialStack;

  const isWomenCuratedRack = isWomenFashion && variant === 'curated-rack';
  const isWomenFitCatalog = isWomenFashion && variant === 'fit-catalog';
  const isWomenDealEdit = isWomenFashion && variant === 'deal-edit';
  const isVelaQuickViewFashionGrid = isVelaFashion && variant === 'quick-view-fashion-grid';
  const isFastlyOfferWall = isFastlyTheme && variant === 'fastly-offer-wall';
  const isPerfumeCabinet = isPerfumeEg && variant === 'perfume-cabinet';
  const isPerfumeShelf = isPerfumeEg && variant === 'perfume-shelf';

  const cardImagePriorityMode: CardImagePriorityMode =
    isWomenCuratedRack || isWomenFitCatalog || isWomenDealEdit || (isKhemetLuxe && (isShopPage || isSalePage))
      ? 'mobile-first'
      : 'default';

  const resolveGridCardImageLoading = (index: number) =>
    resolveCardImageLoading(index, cardImagePriorityMode);
  const resolveGridCardImageFetchPriority = (index: number) =>
    resolveCardImageFetchPriority(index, cardImagePriorityMode);

  const saleFilteredProducts = saleOnly
    ? products.filter((product) => {
        const currentPrice =
          typeof product.price === 'string' ? parseFloat(product.price) : product.price;
        const comparePrice =
          typeof product.comparePrice === 'string'
            ? parseFloat(product.comparePrice)
            : product.comparePrice;
        const normalizedCurrentPrice =
          typeof currentPrice === 'number' && Number.isFinite(currentPrice)
            ? currentPrice
            : null;

        return (
          typeof comparePrice === 'number' &&
          Number.isFinite(comparePrice) &&
          normalizedCurrentPrice !== null &&
          comparePrice > normalizedCurrentPrice
        );
      })
    : products;

  const filteredProducts = saleFilteredProducts
    .filter((product) => {
      const identityCandidates = [product.id, product.slug]
        .map((value) => String(value || '').trim())
        .filter(Boolean);

      if (
        includedProductIdSet.size > 0 &&
        !identityCandidates.some((candidate) => includedProductIdSet.has(candidate))
      ) {
        return false;
      }

      if (
        excludedProductIdSet.size > 0 &&
        identityCandidates.some((candidate) => excludedProductIdSet.has(candidate))
      ) {
        return false;
      }

      return true;
    })
    .sort((left, right) => {
      if (includedProductIds.length === 0) {
        return 0;
      }

      const leftOrder = includedProductIds.findIndex(
        (value) => value === left.id || value === left.slug,
      );
      const rightOrder = includedProductIds.findIndex(
        (value) => value === right.id || value === right.slug,
      );

      const normalizedLeftOrder = leftOrder === -1 ? Number.MAX_SAFE_INTEGER : leftOrder;
      const normalizedRightOrder = rightOrder === -1 ? Number.MAX_SAFE_INTEGER : rightOrder;

      return normalizedLeftOrder - normalizedRightOrder;
    });

  const resultsCount = filteredProducts.length;

  const cardVariant =
    hasCustomShopStudio && shopStudioConfig?.layout.type === 'list' && variant === 'standard'
      ? 'list'
      : resolveCardVariant(variant, studioProductCardVariant);

  const listCardVariant = viewMode === 'list' ? (isMarketplaceAvenue ? 'marketplace-row' : 'list') : null;
  const resolvedCardVariant: ProductCardVariant =
    listCardVariant ??
    (isMarketplaceAvenue && isShopPage
      ? 'marketplace-tile'
      : isKhemetLuxe &&
        isShopPage &&
        variant === 'editorial-card'
        ? 'editorial-bare'
        : cardVariant);

  const isHorizontalRail = variant === 'carousel' || variant === 'boutique-rail';

  const shopProductCardTokens = hasCustomShopStudio
    ? resolveShopProductCardTokens(shopStudioConfig)
    : {};

  const shopProductCardStyleOverrides = Object.keys(shopProductCardTokens).length > 0
    ? ({
        ...(shopProductCardTokens.borderRadius
          ? { ['--product-card-radius' as const]: shopProductCardTokens.borderRadius }
          : {}),
        ...(shopProductCardTokens.boxShadow
          ? { ['--product-card-shadow' as const]: shopProductCardTokens.boxShadow }
          : {}),
        ...(shopProductCardTokens.hoverShadow
          ? { ['--product-card-hover-shadow' as const]: shopProductCardTokens.hoverShadow }
          : {}),
        ...(shopProductCardTokens.badgeRadius
          ? { ['--product-card-badge-radius' as const]: shopProductCardTokens.badgeRadius }
          : {}),
        ...(shopProductCardTokens.buttonRadius
          ? { ['--product-card-button-radius' as const]: shopProductCardTokens.buttonRadius }
          : {}),
        ...(shopProductCardTokens.surfaceOpacity
          ? { ['--product-card-surface-opacity' as const]: shopProductCardTokens.surfaceOpacity }
          : {}),
      } as React.CSSProperties)
    : undefined;

  const buildPageUrl = (pageNumber: number) => {
    const nextParams = new URLSearchParams(location.search);
    if (pageNumber <= 1) {
      nextParams.delete('page');
    } else {
      nextParams.set('page', String(pageNumber));
    }
    const query = nextParams.toString();
    return `${location.pathname}${query ? `?${query}` : ''}`;
  };

  const gridClass =
    hasCustomShopStudio && !isHorizontalRail
      ? resolveShopGridClassName(shopStudioConfig)
      : isGracefulTheme
        ? 'grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4'
      : variant === 'curated-rack'
        ? isShopPage
          ? 'grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4'
          : 'grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4'
      : isPerfumeShelf
        ? isShopPage || saleOnly
          ? 'grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4'
          : 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3'
      : isAnyElessiBagGrid
        ? 'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4'
      : isButcherAtelierGrid
        ? 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 [&>*:first-child]:md:col-span-2 [&>*:first-child]:xl:col-span-2'
      : isButcherCutGrid
        ? 'grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4'
      : isAnyElessiOrganicGrid
        ? 'grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 xl:grid-cols-4'
      : isAnyElessiDigitalGrid
        ? isElessiDigitalLaunchGrid
          ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3'
          : 'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4'
      : isElessiPlantFavorites || isElessiPlantNurseryGrid
        ? 'grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 xl:grid-cols-4'
      : isDistrictMarket && variant === 'compact'
        ? isShopPage
          ? 'grid grid-cols-2 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
          : 'grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4'
        : isDistrictMarket && variant === 'list-card'
          ? 'grid grid-cols-1 gap-6'
          : isZenOrganic && isShopPage
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-12 gap-x-8'
            : isKhemetLuxe && variant === 'boutique-shelf' && isShopPage
              ? 'grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4'
              : isMarketplaceAvenue && isShopPage
                ? 'grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 md:gap-5'
                : resolveDefaultGridClass(variant);

  const resolvedGridClass =
    viewMode === 'list'
      ? (isKhemetLuxe && isShopPage ? 'flex flex-col gap-5' : 'flex flex-col gap-3 w-full')
      : gridClass;

  const carouselCardClass =
    variant === 'compact'
      ? 'w-[250px] md:w-[270px]'
      : variant === 'curated-rack'
        ? 'w-[280px] md:w-[320px]'
      : variant === 'boutique-rail'
        ? 'w-[280px] md:w-[320px]'
      : variant === 'perfume-cabinet'
        ? 'w-[300px] md:w-[340px]'
      : variant === 'perfume-shelf'
        ? 'w-[280px] md:w-[320px]'
      : variant === 'quick-view-fashion-grid'
        ? 'w-[260px] md:w-[300px]'
      : variant === 'overlay-card'
        ? 'w-[280px] md:w-[320px]'
        : variant === 'luxury-card'
          ? 'w-[300px] md:w-[340px]'
          : variant === 'editorial-card'
            ? 'w-[340px] md:w-[420px]'
            : variant === 'glass-card'
              ? 'w-[280px] md:w-[320px]'
              : variant === 'list-card'
                ? 'w-[360px] md:w-[520px]'
                : variant === 'playful-toybox'
                  ? 'w-[280px] md:w-[320px]'
                  : 'w-[270px] md:w-[300px]';

  const productsFoundLabel =
    (settings as any)?.productsFoundLabel ||
    (theme.direction === 'rtl' ? 'منتجات تم العثور عليها' : 'products found');

  const hasPriceFilter = Boolean(
    searchParams.get('priceRange') ||
      searchParams.get('minPrice') ||
      searchParams.get('maxPrice'),
  );
  const hasSortFilter = Boolean(
    searchParams.get('sort') ||
      searchParams.get('sortBy') ||
      searchParams.get('sortOrder'),
  );
  const activeFilterCount = [
    searchParams.get('search') ? 1 : 0,
    searchParams.get('category') ? 1 : 0,
    hasPriceFilter ? 1 : 0,
    hasSortFilter ? 1 : 0,
  ].reduce((total, value) => total + value, 0);

  const districtMarketSubtitle =
    typeof settings?.['subtitle'] === 'string' && settings['subtitle'].trim()
      ? settings['subtitle'].trim()
      : isShopPage
        ? 'صور أوضح، مقارنة أسرع، ومساحة أهدأ تساعد العميل على الحسم من أول زيارة.'
        : 'منتجات مرتبة داخل بطاقات أهدأ حتى يظل إحساس المتجر ثابتًا بعد أول click.';

  const retailAirEyebrow =
    typeof settings?.['eyebrow'] === 'string'
      ? settings['eyebrow'].trim()
      : 'Recommendation Shelf';
  const boutiqueShelfEyebrow =
    typeof settings?.['eyebrow'] === 'string'
      ? settings['eyebrow'].trim()
      : '';
  const boutiqueShelfSubtitle =
    typeof settings?.['subtitle'] === 'string'
      ? settings['subtitle'].trim()
      : isShopPage
        ? 'شبكة أخف وصور أهدأ ومساحة أكثر للقطعة نفسها بدل طبقات البيع المباشر الثقيلة.'
        : 'منتجات معروضة بإيقاع أهدأ ومساحة بيضاء أكبر حتى تحتفظ الصفحة بروح البوتيك الكلاسيكي.';
  const boutiqueRailEyebrow =
    typeof settings?.['eyebrow'] === 'string'
      ? settings['eyebrow'].trim()
      : 'الأكثر مبيعًا';
  const boutiqueRailSubtitle =
    typeof settings?.['subtitle'] === 'string'
      ? settings['subtitle'].trim()
      : 'اختيارات مميزة تُعرض كريل تحريري هادئ يترك الصورة والخامة والسعر يتصدرون المشهد بدون أزرار وكروت تقليدية.';
  const retailAirSubtitle =
    typeof settings?.['subtitle'] === 'string'
      ? settings['subtitle'].trim()
      : 'شبكة أخف تعرض المنتجات الأساسية بطريقة أقرب للماركت بليس، مع قلب للمفضلة وإضافة سريعة من نفس الكارت.';
  const showRetailAirResultsMeta = settings?.['showResultsMeta'] !== false;

  const activeCategoryId = searchParams.get('category');
  const activeCategory = resolveCatalogCategoryByToken(categories, activeCategoryId);
  const activeCategoryLabel =
    activeCategoryId
      ? activeCategory?.name ||
        (theme.direction === 'rtl' ? 'قسم مخصص' : 'Selected Category')
      : theme.direction === 'rtl'
        ? 'كل الأقسام'
        : 'All Categories';
  const activeSearchTerm = searchParams.get('search') || '';

  const specRackSubtitle =
    typeof settings?.['subtitle'] === 'string' && settings['subtitle'].trim()
      ? settings['subtitle'].trim()
      : isShopPage
        ? 'بطاقات أخف وصور أوضح ومسار أقصر للمقارنة بين اللابتوبات والتجميعات والإكسسوارات قبل الحسم.'
        : 'شبكة أقرب لقرار الشراء السريع بدل عرض قائمة تقليدي.';
  const specRackEyebrow =
    typeof settings?.['eyebrow'] === 'string' ? settings['eyebrow'].trim() : 'رف المقارنة';

  const containerClassName =
    isBiteRush || isAnyElessiBagGrid || isAnyElessiOrganicGrid || isButcherCutGrid || isButcherAtelierGrid || isElessiPlantFavorites || isElessiPlantNurseryGrid || variant === 'boutique-rail'
      ? 'container px-4 md:px-6'
      : isShopPage || isSalePage
        ? 'w-full px-0'
        : 'container px-0';

  const gridFrameClassName =
    isWomenCuratedRack || isWomenFitCatalog || isWomenDealEdit
      ? ''
      : isAnyElessiBagGrid
      ? ''
      : isAnyElessiOrganicGrid
      ? ''
      : isButcherAtelierGrid
      ? ''
      : isButcherCutGrid
      ? ''
      : isElessiPlantFavorites || isElessiPlantNurseryGrid
      ? ''
      : isElessiGrid
      ? 'rounded-[1.9rem] border border-[#ead8ca] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,243,236,0.98))] p-4 shadow-[0_30px_88px_-60px_rgba(91,57,40,0.18)] md:p-5'
      : isPerfumeCabinet || isPerfumeShelf
      ? 'rounded-[1.8rem] border border-[#eadfd6] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(251,246,241,0.98))] p-4 shadow-[0_28px_82px_-60px_rgba(61,41,44,0.18)] md:p-5'
      : variant === 'curated-rack'
      ? 'rounded-[1.65rem] border border-[#ead8cf] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,247,242,0.98))] p-4 shadow-[0_26px_80px_-58px_rgba(76,42,44,0.2)] md:p-5'
      : isDistrictMarket && variant !== 'carousel'
      ? isShopPage
        ? 'rounded-[1.8rem] border border-[#eddcd0] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,248,242,0.96))] p-4 shadow-[0_26px_80px_-56px_rgba(61,37,25,0.24)] md:p-5'
        : variant === 'list-card'
          ? 'rounded-[1.8rem] border border-[#eddcd0] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,249,244,0.98))] p-3 shadow-[0_24px_72px_-58px_rgba(61,37,25,0.2)] md:p-4'
          : ''
      : variant === 'legacy-compact-listing'
      ? 'border-0 bg-transparent p-0 shadow-none'
      : variant === 'spec-rack'
      ? 'rounded-[1.8rem] border border-[#dfe4ea] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,242,222,0.95))] p-4 shadow-[0_30px_90px_-58px_rgba(31,36,44,0.22)] md:p-5'
      : '';

  const stableCatalogMinHeightClassName =
    isKhemetLuxe && (isShopPage || isSalePage) ? 'min-h-[44rem] md:min-h-[42rem]' : '';
  const emptyStateIcon = '\uD83D\uDD0D';
  const emptyStateClassName = `rounded-[var(--radius)] border-2 border-dashed border-border bg-muted/20 py-24 text-center ${isKhemetLuxe && isSalePage ? 'relative overflow-hidden' : ''}`;
  const emptyStateButtonClassName =
    'rounded-[var(--radius)] border border-primary px-6 py-2 font-medium text-primary transition-colors hover:bg-primary/5';

  return {
    section,
    settings,
    searchParams,
    setSearchParams,
    viewMode,
    setViewMode,
    location,
    theme,

    // Data
    products,
    filteredProducts,
    resultsCount,
    pagination,
    isLoading,
    error,
    buildPageUrl,
    categories,
    activeCategory,

    // Titles & Texts
    heading,
    sectionEyebrow,
    sectionCtaText,
    sectionCtaHref,
    hideHeader,
    emptyStateTitle,
    emptyStateDescription,
    clearButtonText,
    emptyStateIcon,
    productsFoundLabel,

    // Derived theme flags
    isShopPage,
    isSalePage,
    saleOnly,
    isMarketplaceAvenue,
    isKhemetLuxe,
    isWomenFashion,
    isWomenCuratedRack,
    isWomenFitCatalog,
    isWomenDealEdit,
    isZenOrganic,
    isNovaMobile,
    isBiteRush,
    isDistrictMarket,
    isPerfumeEg,
    isVelaFashion,
    isFastlyTheme,
    isGracefulTheme,
    isButcherAtelierGrid,
    isButcherCutGrid,
    isElessiBagShopGrid,
    isAnyElessiBagGrid,
    isAnyElessiOrganicGrid,
    isElessiDigitalCatalogGrid,
    isAnyElessiDigitalGrid,
    isElessiBikeShopGrid,
    isAnyElessiBikeGrid,
    isElessiSpotlightGrid,
    isElessiListingGrid,
    isElessiCompactShelf,
    isElessiEditorialStack,
    isElessiGrid,
    isElessiPlantFavorites,
    isElessiPlantNurseryGrid,
    isPerfumeCabinet,
    isPerfumeShelf,
    isFastlyOfferWall,
    isVelaQuickViewFashionGrid,

    // Layout & Classes
    variant,
    resolvedCardVariant,
    isHorizontalRail,
    gridClass,
    resolvedGridClass,
    carouselCardClass,
    gridFrameClassName,
    containerClassName,
    stableCatalogMinHeightClassName,
    emptyStateClassName,
    emptyStateButtonClassName,
    shopProductCardStyleOverrides,

    // Image priority resolvers
    resolveGridCardImageLoading,
    resolveGridCardImageFetchPriority,

    // Meta labels
    districtMarketSubtitle,
    retailAirEyebrow,
    retailAirSubtitle,
    boutiqueShelfEyebrow,
    boutiqueShelfSubtitle,
    boutiqueRailEyebrow,
    boutiqueRailSubtitle,
    specRackEyebrow,
    specRackSubtitle,
    activeCategoryLabel,
    activeSearchTerm,
    activeFilterCount,
    showRetailAirResultsMeta,
  };
};

export type ProductGridController = ReturnType<typeof useProductGridController>;
