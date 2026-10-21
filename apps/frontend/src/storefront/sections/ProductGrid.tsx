import React, { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import GracefulSmartCard from '../components/GracefulSmartCard';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { useStorefrontSettings } from '../hooks/useStorefrontSettings';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import {
  clearCatalogFilters,
  getCatalogProductQuery,
} from '../utils/catalogFilters';
import {
  resolveCatalogCategoryBySlug,
  resolveCatalogCategoryByToken,
} from '../utils/catalogCategories';
import {
  extractShopStudioConfig,
  hasShopStudioConfig,
  resolveShopGridClassName,
  resolveShopProductCardTokens,
  resolveShopProductCardVariant,
} from '../../utils/shopPageStudioConfig';
import { resolveSectionVariant } from '../variants';
import { buildStorefrontPath } from '../utils/paths';
import { isKhemetLuxeTheme } from '../utils/navigationGuards';

interface ProductGridProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    title?: string;
    limit?: number;
    saleOnly?: boolean;
    emptyStateTitle?: string;
    emptyStateDescription?: string;
    clearButtonText?: string;
    defaultCategorySlug?: string;
    hideHeader?: boolean;
    ctaText?: string;
    ctaLink?: string;
    [key: string]: unknown;
  };
}

type ProductCardVariant = React.ComponentProps<typeof ProductCard>['variant'];
type ProductGridVariant =
  | 'standard'
  | 'minimal-card'
  | 'boutique-shelf'
  | 'boutique-rail'
  | 'retail-air-grid'
  | 'retail-direct-grid'
  | 'quick-view-fashion-grid'
  | 'fastly-offer-wall'
  | 'spec-rack'
  | 'elessi-bag-grid'
  | 'elessi-bag-shop-grid'
  | 'elessi-spotlight-grid'
  | 'elessi-listing-grid'
  | 'elessi-compact-shelf'
  | 'elessi-editorial-stack'
  | 'elessi-organic-market-grid'
  | 'elessi-organic-shop-grid'
  | 'butcher-cut-grid'
  | 'butcher-atelier-grid'
  | 'elessi-digital-launch-grid'
  | 'elessi-digital-catalog-grid'
  | 'elessi-plant-favorites'
  | 'elessi-plant-nursery-grid'
  | 'elessi-bike-grid'
  | 'elessi-bike-shop-grid'
  | 'overlay-card'
  | 'compact'
  | 'curated-rack'
  | 'fit-catalog'
  | 'deal-edit'
  | 'perfume-cabinet'
  | 'perfume-shelf'
  | 'luxury-card'
  | 'editorial-card'
  | 'glass-card'
  | 'list-card'
  | 'legacy-compact-listing'
  | 'carousel'
  | 'playful-toybox';

const PRODUCT_GRID_SECTION_FAMILY = 'ProductGrid';

const STUDIO_CARD_VARIANT_TO_GRID_VARIANT: Record<string, ProductGridVariant> = {
  default: 'standard',
  vogue: 'overlay-card',
  minimal: 'minimal-card',
  creative: 'compact',
  brutal: 'luxury-card',
  fashion: 'editorial-card',
  glass: 'glass-card',
  list: 'list-card',
};

const isShopIndexRoute = (pathname: string): boolean =>
  pathname.replace(/\/+$/, '').endsWith('/shop');

const isSaleIndexRoute = (pathname: string): boolean =>
  pathname.replace(/\/+$/, '').endsWith('/sale');

const normalizeGridVariant = (
  rawVariant: unknown,
  fallback: ProductGridVariant = 'standard',
): ProductGridVariant => {
  const value = String(rawVariant || '').trim().toLowerCase();

  if (!value) {
    return fallback;
  }

  return resolveSectionVariant<ProductGridVariant>(
    PRODUCT_GRID_SECTION_FAMILY,
    value,
    fallback,
  );
};

const resolveDefaultGridClass = (variant: ProductGridVariant): string => {
  if (variant === 'compact') {
    return 'grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5';
  }

  if (variant === 'curated-rack') {
    return 'grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4';
  }

  if (variant === 'fit-catalog') {
    return 'grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4';
  }

  if (variant === 'deal-edit') {
    return 'grid grid-cols-2 gap-3 lg:grid-cols-4';
  }

  if (variant === 'perfume-cabinet') {
    return 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3';
  }

  if (variant === 'perfume-shelf') {
    return 'grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4';
  }

  if (variant === 'minimal-card') {
    return 'grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 md:gap-8';
  }

  if (variant === 'boutique-shelf') {
    return 'grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-4';
  }

  if (variant === 'retail-air-grid') {
    return 'grid grid-cols-2 gap-4 md:gap-5 xl:grid-cols-4';
  }

  if (variant === 'retail-direct-grid') {
    return 'grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4';
  }

  if (variant === 'quick-view-fashion-grid') {
    return 'grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4';
  }

  if (variant === 'fastly-offer-wall') {
    return 'grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5';
  }

  if (variant === 'spec-rack') {
    return 'grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-4';
  }

  if (variant === 'elessi-bag-grid' || variant === 'elessi-bag-shop-grid') {
    return 'grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4';
  }

  if (variant === 'elessi-spotlight-grid') {
    return 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3';
  }

  if (variant === 'elessi-listing-grid') {
    return 'grid grid-cols-1 gap-5 xl:grid-cols-2';
  }

  if (variant === 'elessi-compact-shelf') {
    return 'grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4';
  }

  if (variant === 'elessi-editorial-stack') {
    return 'grid grid-cols-1 gap-6 xl:grid-cols-2';
  }

  if (variant === 'elessi-organic-market-grid') {
    return 'grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 xl:grid-cols-4';
  }

  if (variant === 'butcher-cut-grid') {
    return 'grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4';
  }

  if (variant === 'butcher-atelier-grid') {
    return 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4';
  }

  if (variant === 'elessi-organic-shop-grid') {
    return 'grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 xl:grid-cols-4';
  }

  if (variant === 'elessi-digital-launch-grid') {
    return 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3';
  }

  if (variant === 'elessi-digital-catalog-grid') {
    return 'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4';
  }

  if (variant === 'elessi-plant-favorites' || variant === 'elessi-plant-nursery-grid') {
    return 'grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4';
  }

  if (variant === 'elessi-bike-grid' || variant === 'elessi-bike-shop-grid') {
    return 'grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4';
  }

  if (variant === 'luxury-card') {
    return 'grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3';
  }

  if (variant === 'editorial-card') {
    return 'grid grid-cols-1 gap-6 xl:grid-cols-2';
  }

  if (variant === 'glass-card') {
    return 'grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4';
  }

  if (variant === 'list-card') {
    return 'grid grid-cols-1 gap-5';
  }

  if (variant === 'legacy-compact-listing') {
    return 'grid grid-cols-1 gap-4 xl:grid-cols-2';
  }

  if (variant === 'playful-toybox') {
    return 'grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4 [&>*:nth-child(even)]:translate-y-8 pb-12';
  }

  return 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
};

const resolveCardVariant = (
  variant: ProductGridVariant,
  studioVariant?: string,
): ProductCardVariant => {
  if (variant === 'overlay-card') return 'overlay';
  if (variant === 'minimal-card') return 'minimal';
  if (variant === 'boutique-shelf') return 'boutique-air';
  if (variant === 'boutique-rail') return 'editorial-bare';
  if (variant === 'retail-air-grid') return 'retail-air';
  if (variant === 'retail-direct-grid') return 'retail-direct';
  if (variant === 'quick-view-fashion-grid') return 'pastel-fashion';
  if (variant === 'fastly-offer-wall') return 'fastly-offer';
  if (variant === 'spec-rack') return 'retail-air';
  if (variant === 'elessi-bag-grid' || variant === 'elessi-bag-shop-grid') return 'carry-frame';
  if (variant === 'elessi-spotlight-grid') return 'luxury';
  if (variant === 'elessi-listing-grid') return 'list';
  if (variant === 'elessi-compact-shelf') return 'compact';
  if (variant === 'elessi-editorial-stack') return 'editorial';
  if (variant === 'butcher-cut-grid') return 'harvest-crate';
  if (variant === 'butcher-atelier-grid') return 'butcher-black-label';
  if (variant === 'elessi-organic-market-grid' || variant === 'elessi-organic-shop-grid') return 'harvest-crate';
  if (variant === 'elessi-digital-launch-grid' || variant === 'elessi-digital-catalog-grid') return 'signal-rack';
  if (variant === 'elessi-plant-favorites' || variant === 'elessi-plant-nursery-grid') return 'plant-bare';
  if (variant === 'elessi-bike-grid' || variant === 'elessi-bike-shop-grid') return 'pedal-frame';
  if (variant === 'compact') return 'compact';
  if (variant === 'curated-rack') return 'overlay';
  if (variant === 'fit-catalog') return 'compact';
  if (variant === 'deal-edit') return 'overlay';
  if (variant === 'perfume-cabinet') return 'luxury';
  if (variant === 'perfume-shelf') return 'luxury';
  if (variant === 'luxury-card') return 'luxury';
  if (variant === 'editorial-card') return 'editorial';
  if (variant === 'glass-card') return 'glass';
  if (variant === 'list-card') return 'list';
  if (variant === 'legacy-compact-listing') return 'list';
  if (variant === 'playful-toybox') return 'playful';

  const normalizedStudioVariant = String(studioVariant || '').trim().toLowerCase();
  if (normalizedStudioVariant === 'vogue') {
    return 'overlay';
  }
  if (normalizedStudioVariant === 'minimal') {
    return 'minimal';
  }
  if (normalizedStudioVariant === 'creative') {
    return 'compact';
  }
  if (normalizedStudioVariant === 'brutal') {
    return 'luxury';
  }
  if (normalizedStudioVariant === 'fashion') {
    return 'editorial';
  }
  if (normalizedStudioVariant === 'glass') {
    return 'glass';
  }
  if (normalizedStudioVariant === 'list') {
    return 'list';
  }

  return 'standard';
};

const ProductCardSkeleton = () => (
  <div className="h-full animate-pulse space-y-4 rounded-[var(--radius)] border border-border bg-card p-4">
    <div className="aspect-square rounded-md bg-muted" />
    <div className="space-y-2">
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="h-3 w-1/4 rounded bg-muted" />
      <div className="mt-2 h-9 w-full rounded bg-muted" />
    </div>
  </div>
);

type CardImagePriorityMode = 'default' | 'mobile-first';

const resolveCardImageLoading = (
  index: number,
  mode: CardImagePriorityMode = 'default',
): React.ComponentProps<typeof ProductCard>['imageLoading'] =>
  mode === 'mobile-first' ? (index < 2 ? 'eager' : 'lazy') : index < 4 ? 'eager' : 'lazy';

const resolveCardImageFetchPriority = (
  index: number,
  mode: CardImagePriorityMode = 'default',
): React.ComponentProps<typeof ProductCard>['imageFetchPriority'] =>
  mode === 'mobile-first'
    ? index === 0
      ? 'high'
      : index === 1
        ? 'auto'
        : 'low'
    : index < 2
      ? 'high'
      : index < 4
        ? 'auto'
        : 'low';

const ProductGrid: React.FC<ProductGridProps> = ({ section, settings }) => {
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
    (saleOnly ? (theme.direction === 'rtl' ? 'لا توجد منتجات مخفضة حالياً' : 'No Sale Products Right Now') : (theme.direction === 'rtl' ? 'لا توجد منتجات مطابقة' : 'No Matching Products'));
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
  const listCardVariant = viewMode === 'list' ? 'list' : null;
  const resolvedCardVariant: ProductCardVariant =
    listCardVariant ??
    (isKhemetLuxe &&
    isShopPage &&
    variant === 'editorial-card'
      ? 'editorial-bare'
      : cardVariant);
  const isHorizontalRail = variant === 'carousel' || variant === 'boutique-rail';
  const shopProductCardTokens = hasCustomShopStudio
    ? resolveShopProductCardTokens(shopStudioConfig)
    : {};
  const shopProductCardStyleOverrides = Object.keys(shopProductCardTokens).length > 0
    ? {
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
      } as React.CSSProperties
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

  const getVisiblePageNumbers = (current: number, total: number) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }
    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
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
              : resolveDefaultGridClass(variant);
  const resolvedGridClass = viewMode === 'list' && isKhemetLuxe && isShopPage ? 'flex flex-col gap-5' : gridClass;
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
      : variant === 'boutique-shelf'
      ? ''
      : variant === 'boutique-rail'
      ? ''
      : variant === 'retail-air-grid'
      ? ''
      : '';
  const stableCatalogMinHeightClassName =
    isKhemetLuxe && (isShopPage || isSalePage) ? 'min-h-[44rem] md:min-h-[42rem]' : '';
  const loadingSkeletonCount = 8;
  const emptyStateIcon = '\uD83D\uDD0D';
  const emptyStateClassName = `rounded-[var(--radius)] border-2 border-dashed border-border bg-muted/20 py-24 text-center ${isKhemetLuxe && isSalePage ? 'relative overflow-hidden' : ''}`;
  const emptyStateButtonClassName =
    'rounded-[var(--radius)] border border-primary px-6 py-2 font-medium text-primary transition-colors hover:bg-primary/5';

  if (isLoading) {
    if (isKhemetLuxe && isSalePage) {
      return (
        <section className={`w-full bg-background py-8 md:py-12 ${stableCatalogMinHeightClassName}`}>
          <div className="container px-0">
            <div className="mb-8 flex flex-col space-y-2">
              <div
                className="flex flex-col gap-3 opacity-0 sm:flex-row sm:items-end sm:justify-between"
                aria-hidden="true"
              >
                <div>
                  <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                    {heading}
                  </h2>
                  <p className="font-sans text-sm text-muted-foreground text-start">
                    {resultsCount} {productsFoundLabel}
                  </p>
                </div>
              </div>
            </div>
            <div className={emptyStateClassName} aria-busy="true">
              <div className="mb-6 text-5xl opacity-0" aria-hidden="true">
                {emptyStateIcon}
              </div>
              <h3 className="mb-2 text-xl font-bold text-foreground opacity-0" aria-hidden="true">
                {emptyStateTitle}
              </h3>
              <p
                className="mx-auto mb-8 max-w-xs text-muted-foreground opacity-0"
                aria-hidden="true"
              >
                {emptyStateDescription}
              </p>
              <button
                type="button"
                disabled
                className={`${emptyStateButtonClassName} opacity-0`}
                aria-hidden="true"
              >
                {clearButtonText}
              </button>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="mb-6 h-12 w-12 animate-pulse rounded-full bg-muted" />
                <div className="mb-3 h-6 w-56 max-w-[80%] animate-pulse rounded bg-muted" />
                <div className="mb-8 h-4 w-72 max-w-[80%] animate-pulse rounded bg-muted" />
                <div className="h-10 w-36 animate-pulse rounded-[var(--radius)] bg-muted" />
              </div>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className={`w-full bg-background py-8 md:py-12 ${stableCatalogMinHeightClassName}`}>
        <div className="container px-0">
          {!hideHeader ? (
            <div className="mb-8 h-8 w-48 animate-pulse rounded bg-muted" />
          ) : null}
          {isHorizontalRail ? (
            <div className="flex gap-4 overflow-hidden pb-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`shrink-0 ${carouselCardClass}`}>
                  <ProductCardSkeleton />
                </div>
              ))}
            </div>
          ) : (
            <div className={gridClass}>
              {Array.from({ length: loadingSkeletonCount }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="w-full bg-background py-16">
        <div className="container px-0">
          <div className="mx-auto max-w-md rounded-[var(--radius)] border-2 border-dashed border-destructive/30 bg-destructive/5 p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <span className="text-2xl font-bold text-destructive">!</span>
            </div>
            <h3 className="mb-2 text-lg font-bold text-foreground">Failed to Load Products</h3>
            <p className="mb-6 text-sm text-muted-foreground">{error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-[var(--radius)] bg-primary px-6 py-2 font-medium text-primary-foreground transition-transform hover:scale-105"
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (isButcherAtelierGrid) {
    const butcherSubtitle =
      typeof settings?.['subtitle'] === 'string' && settings['subtitle'].trim()
        ? settings['subtitle'].trim()
        : isShopPage
          ? 'كتالوج تقطيعات premium مصمم كلوحة قرار: صورة كبيرة، وزن واضح، وتجهيز قبل التأكيد.'
          : 'اختيارات سوداء الهوية تبرز القطعية والجودة بدل شبكة كروت متجر عادية.';
    const atelierStats = [
      activeCategoryLabel,
      activeSearchTerm ? `بحث: ${activeSearchTerm}` : '',
      activeFilterCount > 0 ? `${activeFilterCount} فلاتر` : 'Black label cuts',
    ].filter(Boolean);

    return (
      <section className="relative overflow-hidden bg-[#080706] py-12 text-[#f4ead8] md:py-16">
        <div className="pointer-events-none absolute inset-0 opacity-[0.24] [background-image:linear-gradient(90deg,rgba(255,255,255,0.06)_0_1px,transparent_1px_92px),linear-gradient(180deg,rgba(255,255,255,0.04)_0_1px,transparent_1px_72px)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(103,20,29,0.22),transparent)]" />
        <div className="container relative z-10 px-4 md:px-6">
          {!hideHeader ? (
            <div className="mb-8 border-y border-[#37312c] py-5 md:mb-10">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:items-end">
                <div className="space-y-3">
                  <span className="inline-flex border border-[#8b6b3e] bg-[#15110f] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] text-[#d7b674]">
                    {isShopPage ? 'CUT INDEX' : 'BLACK LABEL'}
                  </span>
                  <h2 className="font-heading text-[2.25rem] font-black leading-[1.02] text-[#fff7e8] md:text-[3.4rem]">
                    {heading}
                  </h2>
                </div>
                <div className="space-y-4 lg:border-s lg:border-[#37312c] lg:ps-6">
                  <p className="max-w-2xl text-sm leading-7 text-[#b7ab9c] md:text-base">
                    {butcherSubtitle}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="border border-[#8f1d2b] bg-[#5f1118] px-4 py-2 text-sm font-black text-[#fff4dc]">
                      {resultsCount} {productsFoundLabel}
                    </span>
                    {atelierStats.map((item) => (
                      <span
                        key={item}
                        className="border border-[#37312c] bg-[#15110f] px-4 py-2 text-sm font-bold text-[#d6cbbb]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {filteredProducts.length > 0 ? (
            <div className={gridClass}>
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  variant={resolvedCardVariant}
                  styleOverrides={shopProductCardStyleOverrides}
                  quickViewLabel={settings?.['quickViewLabel'] as string}
                  addToWishlistLabel={settings?.['addToWishlistLabel'] as string}
                  imageLoading={resolveGridCardImageLoading(index)}
                  imageFetchPriority={resolveGridCardImageFetchPriority(index)}
                />
              ))}
            </div>
          ) : (
            <div className="border border-[#37312c] bg-[#0b0908] px-6 py-20 text-center">
              <div className="mx-auto mb-5 h-px max-w-xs bg-[linear-gradient(90deg,transparent,#8b6b3e,transparent)]" />
              <h3 className="mb-3 font-heading text-2xl font-black text-[#fff7e8]">
                {emptyStateTitle}
              </h3>
              <p className="mx-auto mb-8 max-w-sm text-sm leading-7 text-[#b7ab9c]">
                {emptyStateDescription}
              </p>
              <button
                onClick={() => setSearchParams((prev) => clearCatalogFilters(prev))}
                className="border border-[#8f1d2b] bg-[#5f1118] px-6 py-3 text-sm font-black text-[#fff4dc] transition-colors hover:bg-[#7a131d]"
              >
                {clearButtonText}
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
      <section className={`w-full py-8 md:py-12 ${
      isBiteRush
        ? 'bg-[linear-gradient(180deg,#fff8f3_0%,#fff4ec_52%,#fffdfb_100%)]'
        : isAnyElessiBagGrid
          ? 'bg-[linear-gradient(180deg,#fffcf8_0%,#f7efe7_26%,#fffaf4_54%,#fffdf9_100%)]'
        : isButcherCutGrid
          ? 'bg-[linear-gradient(180deg,#fffaf4_0%,#f3eadf_26%,#fff8f2_58%,#fffdf9_100%)]'
        : isAnyElessiOrganicGrid
          ? 'bg-[linear-gradient(180deg,#fffdf9_0%,#f6efe4_24%,#fbf7f0_56%,#fffdf9_100%)]'
        : isElessiPlantFavorites || isElessiPlantNurseryGrid
          ? 'bg-[linear-gradient(180deg,#faf9f3_0%,#eef5ea_32%,#fbfaf5_72%,#ffffff_100%)]'
        : isElessiGrid
          ? 'bg-[linear-gradient(180deg,#fffdf9_0%,#f7efe5_24%,#fffaf4_52%,#fffdf9_100%)]'
        : variant === 'perfume-cabinet'
          ? 'bg-[linear-gradient(180deg,#fffdf9_0%,#f8efe6_32%,#fffdf9_100%)]'
        : variant === 'perfume-shelf'
          ? 'bg-[linear-gradient(180deg,#fffdf9_0%,#faf2ea_24%,#fffdf9_100%)]'
        : variant === 'curated-rack'
          ? 'bg-[linear-gradient(180deg,#fffdfb_0%,#fff7f3_22%,#fffdfb_100%)]'
          : variant === 'boutique-rail'
            ? 'bg-[linear-gradient(180deg,#fcf7f1_0%,#f6efe8_26%,#fdfaf6_100%)]'
          : variant === 'fit-catalog'
            ? 'bg-[linear-gradient(180deg,#fffdfb_0%,#fff8f4_18%,#fffdfb_100%)]'
          : variant === 'quick-view-fashion-grid'
            ? isVelaQuickViewFashionGrid
              ? 'bg-[#fcf8f6]'
              : 'bg-[linear-gradient(180deg,#fffdfb_0%,#fff6f1_22%,#fffdfb_100%)]'
          : variant === 'deal-edit'
          ? 'bg-[linear-gradient(180deg,#fffaf7_0%,#fff1ea_24%,#fffdfb_100%)]'
        : variant === 'spec-rack'
          ? 'bg-[linear-gradient(180deg,#fffdf8_0%,#f7f0dd_20%,#f8fafc_100%)]'
        : variant === 'retail-air-grid'
          ? 'bg-[#f4f6f8]'
        : isDistrictMarket
        ? 'bg-[linear-gradient(180deg,#fffdfb_0%,#fff6ef_26%,#fffdfb_100%)]'
        : isNovaMobile 
        ? "bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.05),transparent_40%),hsl(var(--background))]" 
        : "bg-background"
    } ${stableCatalogMinHeightClassName}`}>
      <div className={containerClassName}>
        {isShopPage && isZenOrganic ? (
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
          <div className="mb-4 flex items-center gap-2" dir={theme.direction}>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'grid'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
              {theme.direction === 'rtl' ? 'شبكة' : 'Grid'}
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'list'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="18" height="3.5" rx="1"/><rect x="3" y="10.25" width="18" height="3.5" rx="1"/><rect x="3" y="16.5" width="18" height="3.5" rx="1"/></svg>
              {theme.direction === 'rtl' ? 'قائمة' : 'List'}
            </button>
          </div>
        )}

        {filteredProducts.length > 0 ? (
          <>
            {isHorizontalRail ? (
            <div className={`flex snap-x snap-mandatory overflow-x-auto pb-4 [scrollbar-width:thin] ${variant === 'boutique-rail' ? 'gap-5 md:gap-6' : 'gap-4'}`}>
              {filteredProducts.map((product, index) => (
                <div
                  key={product.id}
                  className={`shrink-0 snap-start ${carouselCardClass}`}
                >
                  <ProductCard
                    product={product}
                    variant={resolvedCardVariant}
                    styleOverrides={shopProductCardStyleOverrides}
                    quickViewLabel={settings?.['quickViewLabel'] as string}
                    addToWishlistLabel={settings?.['addToWishlistLabel'] as string}
                    imageLoading={resolveGridCardImageLoading(index)}
                    imageFetchPriority={resolveGridCardImageFetchPriority(index)}
                  />
                </div>
              ))}
            </div>
          ) : isWomenCuratedRack ? (
            isShopPage || saleOnly ? (
              <div className={`grid gap-3 ${isShopPage ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-2 lg:grid-cols-4'}`}>
                {filteredProducts.slice(0, saleOnly ? 4 : 8).map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    variant="compact"
                    styleOverrides={shopProductCardStyleOverrides}
                    quickViewLabel={settings?.['quickViewLabel'] as string}
                    addToWishlistLabel={settings?.['addToWishlistLabel'] as string}
                    imageLoading={resolveGridCardImageLoading(index)}
                    imageFetchPriority={resolveGridCardImageFetchPriority(index)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
                {filteredProducts[0] ? (
                  <div className="min-h-full">
                    <ProductCard
                      product={filteredProducts[0]}
                      variant="editorial"
                      styleOverrides={shopProductCardStyleOverrides}
                      quickViewLabel={settings?.['quickViewLabel'] as string}
                      addToWishlistLabel={settings?.['addToWishlistLabel'] as string}
                    />
                  </div>
                ) : null}
                <div className="grid gap-3">
                  {filteredProducts.slice(1, 4).map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      variant="compact"
                      styleOverrides={shopProductCardStyleOverrides}
                      quickViewLabel={settings?.['quickViewLabel'] as string}
                      addToWishlistLabel={settings?.['addToWishlistLabel'] as string}
                      imageLoading={resolveGridCardImageLoading(index + 1)}
                      imageFetchPriority={resolveGridCardImageFetchPriority(index + 1)}
                    />
                  ))}
                </div>
              </div>
            )
          ) : isWomenFitCatalog ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  variant="compact"
                  styleOverrides={shopProductCardStyleOverrides}
                  quickViewLabel={settings?.['quickViewLabel'] as string}
                  addToWishlistLabel={settings?.['addToWishlistLabel'] as string}
                  imageLoading={resolveGridCardImageLoading(index)}
                  imageFetchPriority={resolveGridCardImageFetchPriority(index)}
                />
              ))}
            </div>
          ) : isWomenDealEdit ? (
            <div className="space-y-3">
              <div className="grid gap-3 lg:grid-cols-2">
                {filteredProducts.slice(0, 2).map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    variant="overlay"
                    styleOverrides={shopProductCardStyleOverrides}
                    quickViewLabel={settings?.['quickViewLabel'] as string}
                    addToWishlistLabel={settings?.['addToWishlistLabel'] as string}
                    imageLoading={resolveGridCardImageLoading(index)}
                    imageFetchPriority={resolveGridCardImageFetchPriority(index)}
                  />
                ))}
              </div>
              {filteredProducts.length > 2 ? (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {filteredProducts.slice(2, 6).map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      variant="compact"
                      styleOverrides={shopProductCardStyleOverrides}
                      quickViewLabel={settings?.['quickViewLabel'] as string}
                      addToWishlistLabel={settings?.['addToWishlistLabel'] as string}
                      imageLoading={resolveGridCardImageLoading(index + 2)}
                      imageFetchPriority={resolveGridCardImageFetchPriority(index + 2)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className={gridFrameClassName || undefined}>
              {variant === 'spec-rack' ? (
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full border border-[#d9dee5] bg-white px-3 py-1.5 text-xs font-bold text-[#1f242c]">
                    {activeCategoryLabel}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-[#eadfb8] bg-[#fff8e2] px-3 py-1.5 text-xs font-bold text-[#6d5b16]">
                    {activeSearchTerm ? `بحث مباشر: ${activeSearchTerm}` : 'جاهز للمقارنة السريعة'}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-[#d9dee5] bg-white px-3 py-1.5 text-xs font-semibold text-[#6b7280]">
                    {activeFilterCount > 0 ? 'فلترة مركزة' : 'الترتيب المقترح'}
                  </span>
                </div>
              ) : null}
              <div className={resolvedGridClass}>
                {filteredProducts.map((product, index) => (
                  isGracefulTheme ? (
                    <GracefulSmartCard
                      key={product.id}
                      product={product}
                      index={index}
                      quickViewLabel={settings?.['quickViewLabel'] as string}
                      addToWishlistLabel={settings?.['addToWishlistLabel'] as string}
                    />
                  ) : (
                    <ProductCard
                      key={product.id}
                      product={product}
                      variant={resolvedCardVariant}
                      styleOverrides={shopProductCardStyleOverrides}
                      quickViewLabel={settings?.['quickViewLabel'] as string}
                      addToWishlistLabel={settings?.['addToWishlistLabel'] as string}
                      imageLoading={resolveGridCardImageLoading(index)}
                      imageFetchPriority={resolveGridCardImageFetchPriority(index)}
                    />
                  )
                ))}
              </div>
            </div>
          )}

          {pagination.pages > 1 ? (
            <nav
              aria-label={theme.direction === 'rtl' ? 'صفحات المنتجات' : 'Products Pagination'}
              className="mt-10 border-t border-border/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4"
            >
              <p className="text-xs text-muted-foreground order-2 sm:order-1">
                {theme.direction === 'rtl'
                  ? `عرض ${(pagination.page - 1) * pagination.limit + 1} - ${Math.min(pagination.page * pagination.limit, pagination.total)} من أصل ${pagination.total} منتج`
                  : `Showing ${(pagination.page - 1) * pagination.limit + 1} - ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} products`}
              </p>
              <div className="flex items-center gap-1.5 order-1 sm:order-2">
                {pagination.page > 1 ? (
                  <Link
                    to={buildPageUrl(pagination.page - 1)}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                    aria-label={theme.direction === 'rtl' ? 'الصفحة السابقة' : 'Previous page'}
                  >
                    {theme.direction === 'rtl' ? 'السابق' : 'Prev'}
                  </Link>
                ) : (
                  <span
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground/50 cursor-not-allowed"
                    aria-hidden="true"
                  >
                    {theme.direction === 'rtl' ? 'السابق' : 'Prev'}
                  </span>
                )}

                {getVisiblePageNumbers(pagination.page, pagination.pages).map((p, idx) => {
                  if (p === '...') {
                    return (
                      <span
                        key={`ellipsis-${idx}`}
                        className="inline-flex min-h-[44px] min-w-[32px] items-center justify-center text-xs text-muted-foreground"
                      >
                        …
                      </span>
                    );
                  }
                  const pageNum = p as number;
                  const isCurrent = pageNum === pagination.page;
                  return (
                    <Link
                      key={pageNum}
                      to={buildPageUrl(pageNum)}
                      aria-current={isCurrent ? 'page' : undefined}
                      className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                        isCurrent
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'border-border bg-background text-foreground hover:bg-muted'
                      }`}
                    >
                      {pageNum}
                    </Link>
                  );
                })}

                {pagination.page < pagination.pages ? (
                  <Link
                    to={buildPageUrl(pagination.page + 1)}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                    aria-label={theme.direction === 'rtl' ? 'الصفحة التالية' : 'Next page'}
                  >
                    {theme.direction === 'rtl' ? 'التالي' : 'Next'}
                  </Link>
                ) : (
                  <span
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground/50 cursor-not-allowed"
                    aria-hidden="true"
                  >
                    {theme.direction === 'rtl' ? 'التالي' : 'Next'}
                  </span>
                )}
              </div>
            </nav>
          ) : null}
          </>
        ) : (
          <div className={emptyStateClassName}>
            <div className="mb-6 text-5xl opacity-30">{emptyStateIcon}</div>
            <h3 className="mb-2 text-xl font-bold text-foreground">{emptyStateTitle}</h3>
            <p className="mx-auto mb-8 max-w-xs text-muted-foreground">{emptyStateDescription}</p>
            <button
              onClick={() => setSearchParams((prev) => clearCatalogFilters(prev))}
              className={emptyStateButtonClassName}
            >
              {clearButtonText}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductGrid;
