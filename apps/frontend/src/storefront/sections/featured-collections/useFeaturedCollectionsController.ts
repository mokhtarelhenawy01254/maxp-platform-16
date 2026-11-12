import React from 'react';
import { useLocation } from 'react-router-dom';
import { useCategories } from '../../hooks/useCategories';
import { useStorefrontTheme } from '../../engine/ThemeProvider';
import { resolvePreviewThemeId } from '../../preview/previewContext';
import { resolveActiveThemePreviewDataset } from '../../preview/themePreviewData';
import { buildStorefrontPath } from '../../utils/paths';
import { isStorefrontDemoImage } from '../../utils/productImages';
import {
  FeaturedCollectionsProps,
  normalizeFeaturedCollectionsVariant,
  PreviewProductImageSource,
  CollectionCardSeed,
} from './types';
import {
  FALLBACK_COLLECTIONS,
  SMART_BAZAAR_FALLBACK_COLLECTIONS,
  IMAGE_FALLBACKS,
  SMART_BAZAAR_IMAGE_FALLBACKS,
  shouldPreferRuntimeFeaturedCollections,
  parseManualCollections,
  resolveCollectionDescription,
  resolveCollectionImage,
  resolveFeaturedCollectionCards,
  prepareCollectionCardImage,
} from './featuredCollectionsHelpers';

export const useFeaturedCollectionsController = (
  section?: FeaturedCollectionsProps['section'],
  settings?: FeaturedCollectionsProps['settings'],
) => {
  const { theme } = useStorefrontTheme();
  const { categories, isLoading } = useCategories();
  const location = useLocation();

  const previewDataset = React.useMemo(
    () => resolveActiveThemePreviewDataset(location.search),
    [location.search],
  );

  const previewThemeId = React.useMemo(
    () => resolvePreviewThemeId(location.search),
    [location.search],
  );

  const [marketplacePreviewProducts, setMarketplacePreviewProducts] =
    React.useState<PreviewProductImageSource[]>([]);

  React.useEffect(() => {
    if (previewDataset?.products?.length || !previewThemeId) {
      setMarketplacePreviewProducts([]);
      return;
    }

    let cancelled = false;

    void import('../../preview/marketplaceSampleData').then(
      ({ getMarketplacePreviewProducts }) => {
        if (cancelled) {
          return;
        }

        setMarketplacePreviewProducts(
          getMarketplacePreviewProducts({ limit: 120 }, previewThemeId)?.data ||
            [],
        );
      },
    );

    return () => {
      cancelled = true;
    };
  }, [previewDataset, previewThemeId]);

  const previewProducts = React.useMemo<PreviewProductImageSource[]>(() => {
    if (previewDataset?.products?.length) {
      return previewDataset.products;
    }

    return marketplacePreviewProducts;
  }, [marketplacePreviewProducts, previewDataset]);

  const themeId = theme?.id || '';
  const isWomenFashion = themeId === 'women-fashion-eg';
  const isSoleaFemme = themeId === 'solea-femme';
  const isFakhama = themeId === 'fakhama-elite';
  const isSmartBazaar = themeId === 'smart-bazaar';
  const isDistrictMarket = themeId === 'district-market';
  const isPerfumeEg = themeId === 'perfume-eg';
  const isKidsPlay = themeId === 'kids-play';
  const isNovaMobile = themeId === 'nova-mobile';
  const isBiteRush = themeId === 'restaurant-demo';
  const isCafeDemo = themeId === 'cafe-demo';
  const isVelaFashion = themeId === 'vela-fashion-eg';
  const isAtelierNova = themeId === 'atelier-nova';

  const variant = normalizeFeaturedCollectionsVariant(settings?.variant || section?.variant);

  const isElessiVariant =
    variant === 'elessi-bag-categories' ||
    variant === 'elessi-merch-panels' ||
    variant === 'elessi-pill-shelf' ||
    variant === 'elessi-story-cards' ||
    variant === 'elessi-plant-categories' ||
    variant === 'elessi-utility-cards' ||
    variant === 'elessi-organic-routes' ||
    variant === 'elessi-digital-departments' ||
    variant === 'elessi-bike-panels';

  const fallbackCollections = isSmartBazaar
    ? SMART_BAZAAR_FALLBACK_COLLECTIONS
    : FALLBACK_COLLECTIONS;

  const imageFallbacks = isSmartBazaar
    ? SMART_BAZAAR_IMAGE_FALLBACKS
    : IMAGE_FALLBACKS;

  const title =
    settings?.title ||
    (isCafeDemo
      ? 'تسوق حسب المزاج'
      : isSmartBazaar
        ? 'أقسام مرتبة مثل المتجر الحقيقي'
        : 'تسوقي حسب التصنيف');

  const subtitle =
    settings?.subtitle ||
    (isCafeDemo
      ? 'ابدأ من الحبوب أو المشروبات الباردة أو أدوات التحضير عشان توصل للركنة المناسبة بسرعة.'
      : isKidsPlay || variant === 'floating-bubbles'
        ? 'ابدأ من نوع اللعب أو المرحلة العمرية لتصل للعبة المناسبة بسرعة ووضوح.'
        : isSmartBazaar
          ? 'كل قسم يجمع منتجات متقاربة وأسعار أوضح حتى يشعر الزائر أنه يتصفح متجرًا فعليًا لا مجرد تقسيمات عامة.'
          : 'اختيارات سريعة تساعدك على الوصول لنوع الحذاء المناسب أسرع.');

  const hideBadge = settings?.['hideBadge'] === true;
  const hideSubtitle = settings?.['hideSubtitle'] === true;
  const hideSectionCta = settings?.['hideCta'] === true;
  const hideCardDescriptions = settings?.['hideCardDescriptions'] === true;
  const hideCardCtas = settings?.['hideCardCtas'] === true;

  const limit =
    typeof settings?.limit === 'number' && settings.limit > 0
      ? settings.limit
      : 6;

  const ctaText =
    settings?.ctaText || (isSmartBazaar ? 'كل الأقسام' : 'عرض كل التصنيفات');

  const ctaLink =
    typeof settings?.ctaLink === 'string' ? settings.ctaLink.trim() : '';

  const collections =
    categories.length > 0
      ? categories.slice(0, limit)
      : fallbackCollections.slice(0, limit);

  const manualCollections = parseManualCollections(settings?.['collections']);

  const hasOnlyDemoManualCollections =
    manualCollections.length > 0 &&
    manualCollections.every((c) => !c.image || isStorefrontDemoImage(c.image));

  const preferRuntimeCategories = shouldPreferRuntimeFeaturedCollections({
    themeId,
    variant,
    settingsPreferRuntimeCategories: settings?.preferRuntimeCategories,
  });

  const shouldUseManualCollections =
    manualCollections.length > 0 &&
    !hasOnlyDemoManualCollections &&
    !(preferRuntimeCategories && categories.length > 0);

  const preferPreviewProductImagery = previewProducts.length > 0;

  const ctaHref = ctaLink
    ? buildStorefrontPath(
        location.pathname,
        ctaLink.startsWith('/') ? ctaLink : `/${ctaLink}`,
        location.search,
      )
    : '';

  const buildCategoryHref = (categoryId: string) => {
    const baseHref = buildStorefrontPath(
      location.pathname,
      '/shop',
      location.search,
    );

    if (typeof window === 'undefined') {
      return `${baseHref}${baseHref.includes('?') ? '&' : '?'}category=${encodeURIComponent(categoryId)}`;
    }

    const target = new URL(baseHref, window.location.origin);
    target.searchParams.set('category', categoryId);
    return `${target.pathname}${target.search}${target.hash}`;
  };

  const collectionSeeds: CollectionCardSeed[] =
    shouldUseManualCollections
      ? manualCollections.slice(0, limit).map((collection, index) => ({
          id:
            collection.id?.trim() ||
            collection.slug?.trim() ||
            `manual-${index}`,
          name:
            collection.title?.trim() ||
            collection.name?.trim() ||
            fallbackCollections[index % fallbackCollections.length]!.name,
          slug: collection.slug?.trim() || collection.id?.trim() || undefined,
          description:
            collection.subtitle?.trim() ||
            collection.description?.trim() ||
            fallbackCollections[index % fallbackCollections.length]!
              .description,
          image: collection.image?.trim() || undefined,
          href: buildStorefrontPath(
            location.pathname,
            collection.link?.trim()
              ? collection.link.trim().startsWith('/')
                ? collection.link.trim()
                : `/${collection.link.trim()}`
              : '/collections',
            location.search,
          ),
        }))
      : collections.map((collection, index) => ({
          id: collection.id,
          name: collection.name,
          slug: collection.slug,
          description: resolveCollectionDescription(
            collection,
            index,
            fallbackCollections,
            shouldUseManualCollections ? manualCollections : undefined,
          ),
          image: resolveCollectionImage(collection, index, { isSmartBazaar }),
          href: buildCategoryHref(collection.id),
        }));

  const collectionCards = resolveFeaturedCollectionCards({
    seeds: collectionSeeds,
    categories,
    previewProducts,
    imageFallbacks,
    preferPreviewProductImagery,
  }).map((collection) => ({
    ...collection,
    image: prepareCollectionCardImage(collection.image),
  }));

  const compactCatalogPills =
    variant === 'catalog-pills' && settings?.['hideHeader'] === true;

  return {
    theme,
    categories,
    isLoading,
    location,
    previewProducts,
    isWomenFashion,
    isSoleaFemme,
    isFakhama,
    isSmartBazaar,
    isDistrictMarket,
    isPerfumeEg,
    isKidsPlay,
    isNovaMobile,
    isBiteRush,
    isCafeDemo,
    isVelaFashion,
    isAtelierNova,
    variant,
    isElessiVariant,
    fallbackCollections,
    imageFallbacks,
    title,
    subtitle,
    hideBadge,
    hideSubtitle,
    hideSectionCta,
    hideCardDescriptions,
    hideCardCtas,
    limit,
    ctaText,
    ctaLink,
    ctaHref,
    collections,
    manualCollections,
    shouldUseManualCollections,
    collectionSeeds,
    collectionCards,
    compactCatalogPills,
    buildCategoryHref,
  };
};

export type FeaturedCollectionsController = ReturnType<
  typeof useFeaturedCollectionsController
>;
