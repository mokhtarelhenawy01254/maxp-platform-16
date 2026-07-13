import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { storefrontFetch } from '../../utils/storefrontApi';
import ProductCard from '../components/ProductCard';
import StorefrontProductImage from '../components/StorefrontProductImage';
import { useProduct } from '../hooks/useProduct';
import { useProducts, type Product } from '../hooks/useProducts';
import { useStorefrontSettings } from '../hooks/useStorefrontSettings';
import { isMarketplaceThemePreview } from '../preview/previewContext';
import {
  getThemePreviewProductRecommendations,
  resolveActiveThemePreviewDataset,
} from '../preview/themePreviewData';
import {
  getStorefrontMarketplaceAppSettings,
  isStorefrontMarketplaceAppEnabled,
} from '../utils/marketplaceApps';
import { trackStorefrontAppUsage } from '../utils/appUsageTracking';
import { buildStorefrontPath } from '../utils/paths';
import {
  buildStorefrontImageCandidates,
  normalizeStorefrontImageValue,
} from '../utils/productImages';

import { formatStorefrontCurrency } from '../utils/currency';
import { resolveSectionContentAlign } from '../utils/contentAlignment';
import { resolveSectionVariant } from '../variants';
import { useDeferredSectionActivation } from '../hooks/useDeferredSectionActivation';
import { useStorefrontTheme } from '../engine/ThemeProvider';

const InlineStars: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex items-center gap-0.5 text-[#a06f37]">
    {[1, 2, 3, 4, 5].map((star) => (
      <svg
        key={star}
        viewBox="0 0 24 24"
        className={`h-3.5 w-3.5 ${star <= Math.round(rating) ? 'fill-current' : 'fill-none text-[#d5c4b9]'}`}
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <path d="M12 2 15.09 8.26 22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21.02 7 14.14 2 9.27l6.91-1.01L12 2Z" />
      </svg>
    ))}
  </div>
);

interface RelatedProductsProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    title?: string;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
    limit?: number | string;
    mobileLimit?: number | string;
    contentAlign?: string;
    [key: string]: unknown;
  };
}

type StorefrontProductPayload = Product & {
  images?: unknown;
  mainImage?: unknown;
};

type RelatedProductsVariant =
  | 'standard'
  | 'compact'
  | 'editorial'
  | 'glass'
  | 'list'
  | 'luxury'
  | 'minimal'
  | 'playful'
  | 'overlay'
  | 'elessi-merch-rail'
  | 'elessi-complete-set'
  | 'elessi-discovery-strip'
  | 'elessi-organic-related'
  | 'elessi-digital-related'
  | 'elessi-plant-related'
  | 'elessi-bike-related'
  | 'closet-pairings'
  | 'scent-circle'
  | 'command-alternatives'
  | 'fastly-offer-wall';

const RELATED_PRODUCTS_SECTION_FAMILY = 'RelatedProducts';

const DEFAULT_TITLE = 'منتجات قد تعجبك';
const DEFAULT_SUBTITLE = 'اختيارات إضافية قريبة من نفس الذوق لتسهيل إكمال الطلب.';

const parsePositiveNumber = (value: unknown, fallback: number) => {
  const numericValue =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback;
  }

  return Math.round(numericValue);
};

const normalizeRecommendation = (product: StorefrontProductPayload): Product => ({
  ...product,
  mainImage: normalizeStorefrontImageValue(product.mainImage),
  images: buildStorefrontImageCandidates(
    product.images,
    product.mainImage,
    (product as Record<string, unknown>)['image'],
  ),
});

const normalizeRelatedProductsVariant = (
  rawVariant?: string,
): RelatedProductsVariant => {
  return resolveSectionVariant<RelatedProductsVariant>(
    RELATED_PRODUCTS_SECTION_FAMILY,
    rawVariant,
    'standard',
  );
};

const resolveDirectionalCopy = ({
  value,
  englishFallback,
  arabicFallback,
  prefersArabicCopy,
  legacyEnglishValues = [],
}: {
  value: unknown;
  englishFallback: string;
  arabicFallback: string;
  prefersArabicCopy: boolean;
  legacyEnglishValues?: string[];
}) => {
  if (typeof value === 'string' && value.trim()) {
    const trimmedValue = value.trim();
    if (
      prefersArabicCopy &&
      (trimmedValue === englishFallback || legacyEnglishValues.includes(trimmedValue))
    ) {
      return arabicFallback;
    }

    return trimmedValue;
  }

  return prefersArabicCopy ? arabicFallback : englishFallback;
};

const getRelatedGridClassName = (
  variant: RelatedProductsVariant | React.ComponentProps<typeof ProductCard>['variant'],
  cardCount: number,
) => {
  if (variant === 'list') {
    return 'grid grid-cols-1 gap-5';
  }

  if (variant === 'fastly-offer-wall' || variant === 'fastly-offer') {
    if (cardCount <= 1) {
      return 'mx-auto grid max-w-sm grid-cols-1 gap-3';
    }

    if (cardCount === 2) {
      return 'mx-auto grid max-w-5xl grid-cols-2 gap-3';
    }

    return 'grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4';
  }

  if (variant === 'closet-pairings') {
    if (cardCount <= 1) {
      return 'mx-auto grid max-w-md grid-cols-1 gap-5';
    }

    if (cardCount === 2) {
      return 'mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2';
    }

    return 'grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3';
  }

  if (variant === 'scent-circle') {
    if (cardCount <= 1) {
      return 'mx-auto grid max-w-md grid-cols-1 gap-5';
    }

    if (cardCount === 2) {
      return 'mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2';
    }

    return 'grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3';
  }

  if (variant === 'command-alternatives') {
    if (cardCount <= 1) {
      return 'mx-auto grid max-w-md grid-cols-1 gap-5';
    }

    if (cardCount === 2) {
      return 'mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2';
    }

    return 'grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4';
  }

  if (variant === 'elessi-merch-rail') {
    return cardCount <= 2
      ? 'mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2'
      : 'grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3';
  }

  if (variant === 'elessi-complete-set') {
    return cardCount <= 2
      ? 'mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2'
      : 'grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4';
  }

  if (variant === 'elessi-discovery-strip') {
    return cardCount <= 2
      ? 'mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2'
      : 'grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3';
  }

  if (variant === 'elessi-organic-related') {
    return cardCount <= 2
      ? 'mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2'
      : 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4';
  }

  if (variant === 'elessi-digital-related') {
    return cardCount <= 2
      ? 'mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2'
      : 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4';
  }

  if (variant === 'elessi-plant-related') {
    return cardCount <= 2
      ? 'mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2'
      : 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4';
  }

  if (variant === 'elessi-bike-related') {
    return cardCount <= 2
      ? 'mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2'
      : 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4';
  }

  if (cardCount <= 1) {
    return 'mx-auto grid max-w-sm grid-cols-1 gap-6';
  }

  if (cardCount === 2) {
    return variant === 'editorial'
      ? 'mx-auto grid max-w-5xl grid-cols-1 gap-6 xl:grid-cols-2'
      : 'mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2';
  }

  if (variant === 'editorial') {
    return 'grid grid-cols-1 gap-6 xl:grid-cols-2';
  }

  if (variant === 'luxury' || cardCount === 3) {
    return 'grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3';
  }

  return 'grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4';
};

const resolveRelatedProductsVariant = (
  rawVariant?: string,
): React.ComponentProps<typeof ProductCard>['variant'] => {
  const variant = normalizeRelatedProductsVariant(rawVariant);
  if (variant === 'closet-pairings') {
    return 'editorial';
  }

  if (variant === 'scent-circle') {
    return 'luxury';
  }

  if (variant === 'command-alternatives') {
    return 'retail-air';
  }

  if (variant === 'fastly-offer-wall') {
    return 'fastly-offer';
  }

  if (variant === 'elessi-merch-rail') {
    return 'luxury';
  }

  if (variant === 'elessi-complete-set') {
    return 'compact';
  }

  if (variant === 'elessi-discovery-strip') {
    return 'editorial';
  }

  if (variant === 'elessi-organic-related') {
    return 'harvest-crate';
  }

  if (variant === 'elessi-digital-related') {
    return 'signal-rack';
  }

  if (variant === 'elessi-plant-related') {
    return 'standard';
  }

  if (variant === 'elessi-bike-related') {
    return 'pedal-frame';
  }

  return variant;
};

const RelatedProducts: React.FC<RelatedProductsProps> = ({ section, settings }) => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { settings: storefrontSettings } = useStorefrontSettings();
  const { theme } = useStorefrontTheme();
  const limit = parsePositiveNumber(settings?.limit, 4);
  const mobileLimit = parsePositiveNumber(settings?.mobileLimit, limit);
  const sectionVariant = normalizeRelatedProductsVariant(section?.variant);
  const cardVariant = resolveRelatedProductsVariant(sectionVariant) ?? 'standard';
  const isElessiCompleteSet = sectionVariant === 'elessi-complete-set';
  const { isActive, sectionRef } = useDeferredSectionActivation({
    idleTimeout: isElessiCompleteSet ? 3500 : 10000,
    rootMargin: isElessiCompleteSet ? '1800px 0px' : '420px 0px',
  });
  const { product, isLoading: productLoading } = useProduct(id);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const previewDataset = useMemo(
    () => resolveActiveThemePreviewDataset(location.search),
    [location.search],
  );
  const isMarketplacePreview = useMemo(
    () => isMarketplaceThemePreview(location.search),
    [location.search],
  );
  const { products, isLoading, error } = useProducts({
    limit: limit + 1,
    category: product?.categoryId,
  }, undefined, {
    enabled: isActive && Boolean(product?.categoryId),
  });

  const conversionEnabled = isStorefrontMarketplaceAppEnabled(
    storefrontSettings,
    'conversion-suite',
  );
  const conversionSettings = getStorefrontMarketplaceAppSettings(
    storefrontSettings,
    'conversion-suite',
  );
  const modules = (conversionSettings['modules'] as Record<string, unknown> | undefined) || {};
  const copy = (conversionSettings['copy'] as Record<string, unknown> | undefined) || {};
  const crossSellEnabled = conversionEnabled && modules['crossSell'] !== false;
  const prefersArabicCopy = theme.direction === 'rtl';
  const isWomenFashionTheme = theme.id === 'women-fashion-eg';
  const isContentCentered =
    resolveSectionContentAlign(settings?.contentAlign) === 'center';

  useEffect(() => {
    if (!isActive || !product?.id) {
      setRecommendedProducts([]);
      setRecommendationsLoading(false);
      return;
    }

    const themePreviewRecommendations = previewDataset
      ? getThemePreviewProductRecommendations(
          previewDataset,
          product.id,
          'related',
          limit,
        )
      : [];
    if (themePreviewRecommendations.length > 0) {
      setRecommendationsLoading(false);
      setRecommendedProducts(themePreviewRecommendations.slice(0, limit));
      return;
    }

    if (!crossSellEnabled && !isMarketplacePreview) {
      setRecommendedProducts([]);
      setRecommendationsLoading(false);
      return;
    }

    let cancelled = false;

    const loadRecommendations = async () => {
      try {
        setRecommendationsLoading(true);
        if (isMarketplacePreview) {
          const { getMarketplacePreviewRecommendations } = await import(
            '../preview/marketplaceSampleData'
          );
          const marketplacePreviewRecommendations =
            getMarketplacePreviewRecommendations(product.id, 'related');

          if (marketplacePreviewRecommendations?.length) {
            if (!cancelled) {
              setRecommendedProducts(
                marketplacePreviewRecommendations.slice(0, limit),
              );
              setRecommendationsLoading(false);
            }
            return;
          }
        }

        const response = await storefrontFetch(
          `/products/${encodeURIComponent(product.id)}/related`,
          {
            query: { limit },
          },
        );

        if (cancelled) {
          return;
        }

        const nextProducts = Array.isArray(response?.data)
          ? response.data.map((item: StorefrontProductPayload) => normalizeRecommendation(item))
          : [];
        setRecommendedProducts(nextProducts);
      } catch (fetchError) {
        if (!cancelled) {
          console.error('Failed to load related product recommendations:', fetchError);
          setRecommendedProducts([]);
        }
      } finally {
        if (!cancelled) {
          setRecommendationsLoading(false);
        }
      }
    };

    void loadRecommendations();

    return () => {
      cancelled = true;
    };
  }, [
    crossSellEnabled,
    isActive,
    isMarketplacePreview,
    limit,
    previewDataset,
    product?.id,
  ]);

  const fallbackProducts = useMemo(
    () =>
      products
        .filter((item) => item.id !== product?.id && item.slug !== product?.slug)
        .slice(0, limit),
    [limit, product?.id, product?.slug, products],
  );

  const apiRecommendations = useMemo(
    () =>
      recommendedProducts
        .filter((item) => item.id !== product?.id && item.slug !== product?.slug)
        .slice(0, limit),
    [limit, product?.id, product?.slug, recommendedProducts],
  );

  const relatedProducts = apiRecommendations.length > 0 ? apiRecommendations : fallbackProducts;
  const title = resolveDirectionalCopy({
    value: settings?.title ?? (crossSellEnabled ? copy['crossSellTitle'] : undefined),
    englishFallback: 'You may also want',
    arabicFallback: DEFAULT_TITLE,
    prefersArabicCopy,
    legacyEnglishValues: ['Cross Sell'],
  });
  const subtitle = resolveDirectionalCopy({
    value: settings?.subtitle ?? (crossSellEnabled ? copy['crossSellDescription'] : undefined),
    englishFallback: 'Add complementary picks',
    arabicFallback: DEFAULT_SUBTITLE,
    prefersArabicCopy,
    legacyEnglishValues: [
      'A focused set of complementary picks that keeps the product page clean.',
    ],
  });
  const ctaText = typeof settings?.ctaText === 'string' ? settings.ctaText.trim() : '';
  const ctaLink = typeof settings?.ctaLink === 'string' ? settings.ctaLink.trim() : '';
  const shouldShowLoading =
    !isActive ||
    productLoading ||
    recommendationsLoading ||
    (relatedProducts.length === 0 && isLoading);
  const relatedGridClass = getRelatedGridClassName(
    cardVariant,
    shouldShowLoading ? limit : relatedProducts.length,
  );
  const isElessiMerchRail = sectionVariant === 'elessi-merch-rail';
  const isElessiDiscoveryStrip = sectionVariant === 'elessi-discovery-strip';
  const isElessiOrganicRelated = sectionVariant === 'elessi-organic-related';
  const isElessiDigitalRelated = sectionVariant === 'elessi-digital-related';
  const isElessiPlantRelated = sectionVariant === 'elessi-plant-related';
  const isElessiBikeRelated = sectionVariant === 'elessi-bike-related';
  const isClosetPairings = sectionVariant === 'closet-pairings';
  const isScentCircle = sectionVariant === 'scent-circle';
  const isCommandAlternatives = sectionVariant === 'command-alternatives';
  const isFastlyOfferWallRelated = sectionVariant === 'fastly-offer-wall';
  const isWomenFashionClosetPairings = isWomenFashionTheme && isClosetPairings;
  const effectiveCardVariant = isWomenFashionClosetPairings ? 'compact' : cardVariant;
  const effectiveRelatedGridClass = isWomenFashionClosetPairings
    ? relatedGridClass.replaceAll('gap-5', 'gap-3')
    : relatedGridClass;
  const fastlyCtaPath =
    isFastlyOfferWallRelated && ctaText && ctaLink
      ? buildStorefrontPath(location.pathname, ctaLink, location.search)
      : null;
  const currentProductFacts = Array.isArray(product?.['commandFacts'])
    ? (product['commandFacts'] as Array<{ label?: string; value?: string }>).slice(0, 3)
    : [];
  const commandHeaderTitle =
    isCommandAlternatives && typeof product?.['bundleTitle'] === 'string' && product['bundleTitle'].trim()
      ? product['bundleTitle'].trim()
      : title;
  const commandHeaderSubtitle =
    isCommandAlternatives &&
    typeof product?.['bundleSubtitle'] === 'string' &&
    product['bundleSubtitle'].trim()
      ? product['bundleSubtitle'].trim()
      : subtitle;
  const companySettings =
    storefrontSettings &&
    typeof storefrontSettings === 'object' &&
    'company' in storefrontSettings &&
    storefrontSettings.company &&
    typeof storefrontSettings.company === 'object'
      ? (storefrontSettings.company as Record<string, unknown>)
      : undefined;
  const currency =
    typeof companySettings?.currency === 'string' && companySettings.currency.trim()
      ? companySettings.currency
      : 'EGP';
  const elessiCompleteSetGridClass =
    shouldShowLoading || relatedProducts.length > 2
      ? 'grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4'
      : 'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-2';

  const renderElessiCompleteSetCard = (relatedProduct: Product) => {
    const productPath = buildStorefrontPath(
      location.pathname,
      `/product/${relatedProduct.slug || relatedProduct.id}`,
      location.search,
    );
    const imageCandidates = buildStorefrontImageCandidates(
      relatedProduct.images,
      relatedProduct.mainImage,
      (relatedProduct as Record<string, unknown>)['image'],
    );
    const numericPrice =
      typeof relatedProduct.price === 'string'
        ? Number(relatedProduct.price)
        : Number(relatedProduct.price);
    const numericComparePrice =
      typeof relatedProduct.comparePrice === 'string'
        ? Number(relatedProduct.comparePrice)
        : Number(relatedProduct.comparePrice);
    const hasComparePrice =
      Number.isFinite(numericComparePrice) &&
      Number.isFinite(numericPrice) &&
      numericComparePrice > numericPrice;
    const formattedPrice = Number.isFinite(numericPrice)
      ? formatStorefrontCurrency(numericPrice, currency)
      : '';
    const formattedComparePrice = hasComparePrice
      ? formatStorefrontCurrency(numericComparePrice, currency)
      : '';
    const cardTags = Array.isArray(relatedProduct.tags)
      ? relatedProduct.tags
          .map((item) => String(item || '').trim())
          .filter(Boolean)
          .slice(0, 2)
      : [];
    const rawVariants = (relatedProduct as Record<string, unknown>)['variants'];
    const hasVariantChoices = Boolean(
      relatedProduct.productVariants?.length ||
        (Array.isArray(rawVariants) ? rawVariants.length : 0),
    );

    return (
      <Link
        key={relatedProduct.id}
        to={productPath}
        reloadDocument
        className="group block space-y-3 text-[#2d211e] transition-transform duration-300 hover:-translate-y-1"
      >
        <div className="relative overflow-hidden bg-[#f3ece6]">
          {formattedComparePrice ? (
            <span className="absolute start-3 top-3 z-20 inline-flex rounded-full border border-white/70 bg-white/92 px-2.5 py-1 text-[10px] font-black tracking-[0.16em] text-[#8f5c44]">
              {prefersArabicCopy ? 'عرض' : 'Sale'}
            </span>
          ) : null}
          <div className="aspect-square overflow-hidden">
            <StorefrontProductImage
              candidates={imageCandidates}
              alt={relatedProduct.name}
              loading="lazy"
              requestedWidth={360}
              responsiveWidths={[200, 280, 360, 420]}
              responsiveSizes="(max-width: 767px) 46vw, (max-width: 1279px) 24vw, 18vw"
              imageQuality={72}
              width="520"
              height="520"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              fallback={
                <div className="flex h-full w-full items-center justify-center bg-[#ece4dd] px-4 text-center text-sm font-semibold text-[#8f7b73]">
                  {relatedProduct.name}
                </div>
              }
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8f5c44]">
              {relatedProduct.category?.name || (prefersArabicCopy ? 'منتج مرتبط' : 'Related item')}
            </p>
            <h3 className="line-clamp-2 text-[15px] font-black leading-6 text-[#2d211e]">
              {relatedProduct.name}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {typeof relatedProduct.rating === 'number' ? (
              <>
                <InlineStars rating={relatedProduct.rating} />
                <span className="text-xs font-bold text-[#6f5a54]">
                  {relatedProduct.rating.toFixed(1)}
                </span>
              </>
            ) : null}
            {relatedProduct.reviewCount ? (
              <span className="text-xs text-[#8f7b73]">
                {prefersArabicCopy
                  ? `${relatedProduct.reviewCount.toLocaleString('en-US')} تقييم`
                  : `${relatedProduct.reviewCount.toLocaleString('en-US')} reviews`}
              </span>
            ) : null}
          </div>

          <div dir="ltr" className="flex items-center gap-2 font-sans">
            {formattedComparePrice ? (
              <span className="text-sm text-[#b29e92] line-through">{formattedComparePrice}</span>
            ) : null}
            <span className="text-base font-black text-[#7b5a2f]">{formattedPrice}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {cardTags.map((tag) => (
              <span
                key={`${relatedProduct.id}-${tag}`}
                className="rounded-full border border-[#ead8ca] bg-[#fffaf6] px-2.5 py-1 text-[10px] font-bold text-[#6f5a54]"
              >
                {tag}
              </span>
            ))}
            <span className="text-[11px] font-bold text-[#8f5c44]">
              {hasVariantChoices
                ? prefersArabicCopy
                  ? 'اختاري المقاس'
                  : 'Choose options'
                : prefersArabicCopy
                  ? 'شوفي التفاصيل'
                  : 'View details'}
            </span>
          </div>
        </div>
      </Link>
    );
  };

  useEffect(() => {
    if (!crossSellEnabled || !product?.id || shouldShowLoading || relatedProducts.length === 0) {
      return;
    }

    void trackStorefrontAppUsage({
      slug: 'conversion-suite',
      feature: 'cross_sell_section_view',
      dedupeKey: `cross-sell:${product.id}:${apiRecommendations.length > 0 ? 'api' : 'fallback'}`,
      metadata: {
        productId: product.id,
        recommendationCount: relatedProducts.length,
        source: apiRecommendations.length > 0 ? 'api' : 'fallback',
      },
    });
  }, [
    apiRecommendations.length,
    crossSellEnabled,
    product?.id,
    relatedProducts.length,
    shouldShowLoading,
  ]);

  if (error || (!shouldShowLoading && relatedProducts.length === 0)) {
    return null;
  }

  return (
    <section
      ref={sectionRef as React.RefObject<HTMLElement>}
      className={`w-full border-t ${isElessiCompleteSet ? 'min-h-[44rem] md:min-h-[45rem]' : ''} ${isWomenFashionClosetPairings ? 'py-8 md:py-12' : 'py-12 md:py-16'} ${
        isElessiOrganicRelated
          ? 'border-[#eadfcd] bg-[linear-gradient(180deg,#fffefb_0%,#f8f1e8_42%,#ffffff_100%)]'
        : isElessiCompleteSet
          ? 'border-[#ead8ca] bg-[#fffdfa]'
        : isElessiDigitalRelated
          ? 'border-[#e4e9f0] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fc_40%,#ffffff_100%)]'
        : isElessiPlantRelated
          ? 'border-[#d8e6d8] bg-[linear-gradient(180deg,#fbfaf5_0%,#eef5ea_38%,#ffffff_100%)]'
        : isElessiBikeRelated
          ? 'border-[#e3e7eb] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fb_42%,#ffffff_100%)]'
        : isElessiMerchRail || isElessiDiscoveryStrip
          ? 'border-[#ead8ca] bg-[linear-gradient(180deg,#fffdfa_0%,#f8efe6_44%,#ffffff_100%)]'
        : isScentCircle
          ? 'border-[#eadfd7] bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f4_44%,#ffffff_100%)]'
          : isClosetPairings
          ? 'border-[#ead9d8] bg-[linear-gradient(180deg,#fffaf9_0%,#fffdfc_46%,#ffffff_100%)]'
          : isCommandAlternatives
          ? 'border-[#dce4ef] bg-[linear-gradient(180deg,#fffdf7_0%,#f7f9fd_38%,#ffffff_100%)]'
          : 'border-border bg-background'
      }`}
    >
      <div className="container px-4 md:px-6">
        {isFastlyOfferWallRelated ? (
          <div className="mb-6 border-b border-[#111111] pb-4">
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-heading text-2xl font-black tracking-tight text-[#111111]">
                {title}
              </h2>
              {fastlyCtaPath ? (
                <Link
                  to={fastlyCtaPath}
                  className="text-lg font-semibold text-[#111111] transition-colors hover:text-[#555555]"
                >
                  {ctaText}
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <div
            className={`${isWomenFashionClosetPairings ? 'mb-5 space-y-1.5 sm:mb-8 sm:space-y-2' : 'mb-8 space-y-2'} ${
              isContentCentered ? 'mx-auto max-w-3xl text-center' : ''
            } ${
              isElessiOrganicRelated
                ? 'border-b border-[#eadfcd] pb-5'
              : isElessiDigitalRelated
                ? 'border-b border-[#e4e9f0] pb-5'
              : isElessiPlantRelated
                ? 'border-b border-[#d8e6d8] pb-5'
              : isElessiBikeRelated
                  ? 'border-b border-[#e3e7eb] pb-5'
                : isElessiCompleteSet
                ? 'border-b border-[#ead8ca] pb-5'
                : isElessiMerchRail || isElessiDiscoveryStrip
                ? 'rounded-[1.8rem] border border-[#ead8ca] bg-white/92 px-5 py-5 shadow-[0_24px_70px_-58px_rgba(91,57,40,0.14)]'
                : isScentCircle
                ? 'rounded-[1.8rem] border border-[#eadfd7] bg-white/90 px-5 py-5 shadow-[0_24px_70px_-58px_rgba(61,41,44,0.14)]'
                : isClosetPairings
                ? isWomenFashionClosetPairings
                  ? 'rounded-[1.35rem] border border-[#ead9d8] bg-white/88 px-4 py-4 shadow-[0_18px_50px_-44px_rgba(107,33,49,0.14)] sm:rounded-[1.8rem] sm:px-5 sm:py-5'
                  : 'rounded-[1.8rem] border border-[#ead9d8] bg-white/88 px-5 py-5 shadow-[0_24px_70px_-58px_rgba(107,33,49,0.18)]'
                : isCommandAlternatives
                ? 'rounded-[1.9rem] border border-[#dce4ef] bg-[linear-gradient(180deg,#ffffff_0%,#f9fafc_100%)] px-5 py-5 shadow-[0_24px_70px_-58px_rgba(15,23,42,0.16)]'
                : ''
            }`}
          >
            {isElessiOrganicRelated ? (
              <span
                className={`inline-flex w-fit items-center gap-2 rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-black tracking-[0.2em] text-[#8a6546] ${
                  isContentCentered ? 'mx-auto' : ''
                }`}
              >
                <span className="inline-flex h-2 w-2 rounded-full bg-[#d39c4d]" />
                من نفس الحصاد
              </span>
            ) : isElessiPlantRelated ? (
              <span
                className={`inline-flex w-fit items-center gap-2 rounded-full border border-[#d8e6d8] bg-white px-3 py-1 text-[11px] font-black tracking-[0.2em] text-[#6b8a74] ${
                  isContentCentered ? 'mx-auto' : ''
                }`}
              >
                <span className="inline-flex h-2 w-2 rounded-full bg-[#6b8a74]" />
                Grow together
              </span>
            ) : isElessiBikeRelated ? (
              <span
                className={`inline-flex w-fit items-center gap-2 rounded-full border border-[#d9dee4] bg-[#f8fafb] px-3 py-1 text-[11px] font-black tracking-[0.2em] text-[#516170] ${
                  isContentCentered ? 'mx-auto' : ''
                }`}
              >
                <span className="inline-flex h-2 w-2 rounded-full bg-[#d97706]" />
                Ride essentials
              </span>
            ) : isElessiMerchRail ? (
              <span
                className={`inline-flex w-fit items-center gap-2 rounded-full border border-[#ead8ca] bg-[#fff7f1] px-3 py-1 text-[11px] font-black tracking-[0.2em] text-[#8f5c44] ${
                  isContentCentered ? 'mx-auto' : ''
                }`}
              >
                <span className="inline-flex h-2 w-2 rounded-full bg-[#8f5c44]" />
                {prefersArabicCopy ? 'اختيارات تكمل الطلب' : 'Complete your order'}
              </span>
            ) : isElessiCompleteSet ? (
              <span
                className={`inline-flex w-fit items-center gap-2 rounded-full border border-[#ead8ca] bg-[#fff7f1] px-3 py-1 text-[11px] font-black tracking-[0.2em] text-[#8f5c44] ${
                  isContentCentered ? 'mx-auto' : ''
                }`}
              >
                <span className="inline-flex h-2 w-2 rounded-full bg-[#8f5c44]" />
                {prefersArabicCopy ? 'مجموعة متناسقة' : 'Complete set'}
              </span>
            ) : isElessiDiscoveryStrip ? (
              <span
                className={`inline-flex w-fit items-center gap-2 rounded-full border border-[#ead8ca] bg-[#fff7f1] px-3 py-1 text-[11px] font-black tracking-[0.2em] text-[#8f5c44] ${
                  isContentCentered ? 'mx-auto' : ''
                }`}
              >
                <span className="inline-flex h-2 w-2 rounded-full bg-[#8f5c44]" />
                {prefersArabicCopy ? 'اكتشافات قريبة' : 'More to discover'}
              </span>
            ) : isScentCircle ? (
              <span
                className={`inline-flex w-fit items-center gap-2 rounded-full border border-[#eadfd7] bg-[#fff8f2] px-3 py-1 text-[11px] font-black tracking-[0.2em] text-[#8b623e] ${
                  isContentCentered ? 'mx-auto' : ''
                }`}
              >
                <span className="inline-flex h-2 w-2 rounded-full bg-[#8b623e]" />
                روائح قريبة
              </span>
            ) : isClosetPairings ? (
              <span
                className={`inline-flex w-fit items-center gap-2 rounded-full border border-[#f3c8c1] bg-[#fff3ef] px-3 py-1 text-[11px] font-black tracking-[0.2em] text-[#8b3d33] ${
                  isContentCentered ? 'mx-auto' : ''
                }`}
              >
                <span className="inline-flex h-2 w-2 rounded-full bg-[#ea580c]" />
                تنسيق قريب
              </span>
            ) : isCommandAlternatives ? (
              <span
                className={`inline-flex w-fit items-center gap-2 rounded-full border border-[#f4d067] bg-[#101828] px-3 py-1 text-[11px] font-black tracking-[0.2em] text-[#fff3bf] ${
                  isContentCentered ? 'mx-auto' : ''
                }`}
              >
                <span className="inline-flex h-2 w-2 rounded-full bg-[#f7b500]" />
                بدائل القرار
              </span>
            ) : null}
            <h2 className={`font-heading text-2xl font-black tracking-tight ${
              isElessiOrganicRelated
                ? 'text-[#2d3b27]'
              : isElessiPlantRelated
                ? 'text-[#203528]'
              : isElessiMerchRail || isElessiCompleteSet || isElessiDiscoveryStrip
                ? 'text-[#2d211e]'
                : 'text-foreground'
            } ${isWomenFashionClosetPairings ? 'text-[1.35rem] sm:text-2xl' : ''}`}>
              {isCommandAlternatives ? commandHeaderTitle : title}
            </h2>
            <p className={`${isWomenFashionClosetPairings ? 'line-clamp-2 text-[12px] leading-6 sm:line-clamp-none sm:text-sm md:text-base' : 'text-sm leading-7 md:text-base'} ${
              isElessiOrganicRelated
                ? 'text-[#67705e]'
              : isElessiPlantRelated
                ? 'text-[#56715e]'
              : isElessiMerchRail || isElessiCompleteSet || isElessiDiscoveryStrip
                ? 'text-[#6f5a54]'
                : 'text-muted-foreground'
            } ${isContentCentered ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}>
              {isCommandAlternatives ? commandHeaderSubtitle : subtitle}
            </p>
            {isElessiOrganicRelated ? (
              <div
                className={`flex flex-wrap gap-2 pt-1 ${
                  isContentCentered ? 'justify-center' : ''
                }`}
              >
                <span className="rounded-full border border-[#eadfcd] bg-[#fff8ef] px-3 py-1 text-xs font-bold text-[#6c5b49]">
                  صناديق مكملة
                </span>
                <span className="rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-xs font-bold text-[#6c5b49]">
                  إضافات مطبخ
                </span>
              </div>
            ) : isElessiPlantRelated ? (
              <div
                className={`flex flex-wrap gap-2 pt-1 ${
                  isContentCentered ? 'justify-center' : ''
                }`}
              >
                <span className="rounded-full border border-[#d8e6d8] bg-[#f7fbf6] px-3 py-1 text-xs font-bold text-[#56715e]">
                  أصص وإضافات
                </span>
                <span className="rounded-full border border-[#d8e6d8] bg-white px-3 py-1 text-xs font-bold text-[#56715e]">
                  نباتات مكملة
                </span>
              </div>
            ) : isElessiMerchRail || isElessiCompleteSet || isElessiDiscoveryStrip ? (
              <div
                className={`flex flex-wrap gap-2 pt-1 ${
                  isContentCentered ? 'justify-center' : ''
                }`}
              >
                <span className="rounded-full border border-[#ead8ca] bg-[#fff7f1] px-3 py-1 text-xs font-bold text-[#7a5d60]">
                  {isElessiCompleteSet ? 'سلة مكملة' : 'اختيارات قريبة'}
                </span>
                <span className="rounded-full border border-[#ead8ca] bg-white px-3 py-1 text-xs font-bold text-[#7a5d60]">
                  {isElessiDiscoveryStrip ? 'تصفح دافئ' : 'قرار أسرع'}
                </span>
              </div>
            ) : isScentCircle ? (
              <div
                className={`flex flex-wrap gap-2 pt-1 ${
                  isContentCentered ? 'justify-center' : ''
                }`}
              >
                <span className="rounded-full border border-[#eadfd7] bg-[#fff8f2] px-3 py-1 text-xs font-bold text-[#7a5d60]">
                  أحجام قريبة
                </span>
                <span className="rounded-full border border-[#eadfd7] bg-white px-3 py-1 text-xs font-bold text-[#7a5d60]">
                  اختيارات أصلية واضحة
                </span>
              </div>
            ) : isClosetPairings ? (
              <div
                className={`flex flex-wrap gap-2 pt-1 ${
                  isContentCentered ? 'justify-center' : ''
                }`}
              >
                <span className="rounded-full border border-[#ead9d8] bg-[#fff8f6] px-3 py-1 text-xs font-bold text-[#7a4a46]">
                  بدائل لنفس الإحساس
                </span>
                <span className="hidden rounded-full border border-[#ead9d8] bg-white px-3 py-1 text-xs font-bold text-[#7a4a46] sm:inline-flex">
                  تبديل سريع قبل الحسم
                </span>
              </div>
            ) : isCommandAlternatives ? (
              <div
                className={`flex flex-wrap gap-2 pt-1 ${
                  isContentCentered ? 'justify-center' : ''
                }`}
              >
                {currentProductFacts.length > 0
                  ? currentProductFacts.map((fact, index) => (
                      <span
                        key={`${fact.label || 'fact'}-${index}`}
                        className="rounded-full border border-[#dce4ef] bg-white px-3 py-1 text-xs font-bold text-[#475569]"
                      >
                        <span className="text-[#94a3b8]">{fact.label}</span>
                        {' : '}
                        <span className="text-[#0f172a]">{fact.value}</span>
                      </span>
                    ))
                  : (
                    <>
                      <span className="rounded-full border border-[#dce4ef] bg-white px-3 py-1 text-xs font-bold text-[#475569]">
                        بدائل ضمن نفس الفئة
                      </span>
                      <span className="rounded-full border border-[#dce4ef] bg-white px-3 py-1 text-xs font-bold text-[#475569]">
                        مقارنة أسرع قبل الحسم
                      </span>
                    </>
                  )}
              </div>
            ) : null}
          </div>
        )}

        {shouldShowLoading ? (
          <div className={isElessiCompleteSet ? elessiCompleteSetGridClass : effectiveRelatedGridClass}>
            {Array.from({ length: limit }).map((_, index) => (
              <div
                key={`related-skeleton-${index}`}
                className={`h-full overflow-hidden rounded-[var(--radius)] border p-4 animate-pulse ${
                    isScentCircle
                      ? 'border-[#eadfd7] bg-white'
                      : isClosetPairings
                      ? 'border-[#ead9d8] bg-white'
                      : isCommandAlternatives
                      ? 'border-[#dce4ef] bg-white'
                      : 'border-border bg-card'
                }`}
              >
                <div className="aspect-square rounded-md bg-muted" />
                <div className="mt-4 space-y-3">
                  <div className="h-4 w-2/3 rounded bg-muted" />
                  <div className="h-4 w-1/3 rounded bg-muted" />
                  <div className="h-10 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : isElessiCompleteSet ? (
          <div className={elessiCompleteSetGridClass}>
            {relatedProducts.map((relatedProduct, index) => (
              <div
                key={relatedProduct.id}
                className={index >= mobileLimit ? 'hidden sm:block' : ''}
              >
                {renderElessiCompleteSetCard(relatedProduct)}
              </div>
            ))}
          </div>
        ) : (
          <div className={effectiveRelatedGridClass}>
            {relatedProducts.map((relatedProduct, index) => (
              <div
                key={relatedProduct.id}
                className={[
                  index >= mobileLimit ? 'hidden sm:block' : '',
                  isCommandAlternatives ? 'space-y-3' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {isCommandAlternatives ? (
                  <div className="rounded-[1.35rem] border border-[#dce4ef] bg-white px-3.5 py-3 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.22)]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center rounded-full border border-[#f4d067] bg-[#fff9de] px-2.5 py-1 text-[10px] font-black tracking-[0.18em] text-[#8b623e]">
                        {typeof relatedProduct['decisionBadge'] === 'string' && relatedProduct['decisionBadge'].trim()
                          ? relatedProduct['decisionBadge']
                          : 'بديل قريب'}
                      </span>
                      <span className="text-[10px] font-bold tracking-[0.18em] text-[#64748b]">
                        {typeof relatedProduct['modelLabel'] === 'string' && relatedProduct['modelLabel'].trim()
                          ? relatedProduct['modelLabel']
                          : relatedProduct.category?.name || 'PC HUB'}
                      </span>
                    </div>
                    {Array.isArray(relatedProduct['commandFacts']) &&
                    relatedProduct['commandFacts'].length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(relatedProduct['commandFacts'] as Array<{ label?: string; value?: string }>)
                          .slice(0, 2)
                          .map((fact, factIndex) => (
                            <span
                              key={`${fact.label || 'fact'}-${factIndex}`}
                              className="rounded-full border border-[#eef2f7] bg-[#f8fafc] px-2.5 py-1 text-[11px] font-semibold text-[#475569]"
                            >
                              {fact.value || fact.label}
                            </span>
                          ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <ProductCard
                  product={relatedProduct}
                  variant={effectiveCardVariant}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default RelatedProducts;
