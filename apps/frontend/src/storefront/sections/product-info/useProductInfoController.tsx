import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { apiClient } from '../../../services/apiClient';
import VariantSelector from '../../components/VariantSelector';
import QuantitySelector from '../../components/QuantitySelector';
import Button from '../../components/Button';
import { useCartStore } from '../../store/useCartStore';
import { useProduct } from '../../hooks/useProduct';
import { useProductReviews } from '../../hooks/useProductReviews';
import { useStorefrontSettings } from '../../hooks/useStorefrontSettings';
import { useProductStructuredData } from '../../engine/ProductStructuredData';
import { formatStorefrontCurrency } from '../../utils/currency';
import { sanitizeStorefrontHtml } from '../../utils/html';
import { buildStorefrontPath } from '../../utils/paths';
import { isKhemetLuxeTheme as isKhemetLuxeThemeId } from '../../utils/navigationGuards';
import { getVariantAttributes } from '../../utils/variants';
import { useStorefrontTheme } from '../../engine/ThemeProvider';
import { useStorefrontFacebookTracking } from '../../hooks/useStorefrontFacebookTracking';
import { getStorefrontSectionComponentKey } from '../../engine/sectionComponentMap';
import {
  getStorefrontMarketplaceAppSettings,
  isStorefrontMarketplaceAppEnabled,
} from '../../utils/marketplaceApps';
import { usePdpSelectionStore } from '../../store/usePdpSelectionStore';
import { getActiveQuantityOffers } from '@/utils/quantityOffers';
import PdpQuickOrderPanel from '../PdpQuickOrderPanel';
import QuantityOffersSection from '../QuantityOffersSection';
import { Ruler } from 'lucide-react';

import type { ProductInfoProps, ProductInfoController } from './productInfoTypes';
import {
  isExternalHref,
  isProductInfoConversionModuleEnabled,
  shouldProductInfoAddToCartOpenCart,
  shouldProductInfoAddToCartOpenEmbeddedCheckout,
  parseDetailRows,
  parseMetadataArray,
  parseMetadataStringList,
  parseVariantSettings,
  resolveExternalProductConfig,
  STOREFRONT_BUYBOX_ID,
  PDP_CHECKOUT_SECTION_ID,
  STOREFRONT_PDP_CHECKOUT_OPEN_EVENT,
  calculateVolumeDiscountPricing,
  getProductVolumeDiscounts,
} from './productInfoHelpers';
import {
  ProductInfoSizeGuideDialog,
  ProductInfoShippingDialog,
  ProductInfoQuestionDialog,
} from './ProductInfoModals';

const CASHBACK_PREVIEW_CACHE = new Map<string, { cashback: number; currency: string }>();

export const useProductInfoController = ({
  section,
  settings: sectionSettings,
}: ProductInfoProps): ProductInfoController => {
  const { id } = useParams<{ id: string }>();
  const variant = section?.variant || 'standard';
  const location = useLocation();
  const { theme } = useStorefrontTheme();
  const effectiveId = id || (theme.id ? `preview:${theme.id}` : undefined);
  const { product, isLoading, error, refetch } = useProduct(effectiveId);
  const { reviews: reviewsForRating, averageRating: reviewsAverageRating } = useProductReviews(
    product?.id,
    { enabled: Boolean(product?.id) },
  );
  const { settings: storefrontSettings } = useStorefrontSettings();
  const { trackAddToCartEvent, trackViewContentEvent } = useStorefrontFacebookTracking();

  const isAirlume = theme.id === 'airlume-ai';
  const isNovaMobile = theme.id === 'nova-mobile';
  const isCairoStride = theme.id === 'cairo-stride';
  const isFakhama = theme.id === 'fakhama-elite';
  const isZenOrganic = theme.id === 'zen-organic';
  const isIntruderNft = theme.id === 'intruder-nft';
  const isMenShoesEg = theme.id === 'men-shoes-eg';
  const isBiteRush = theme.id === 'restaurant-demo';
  const isCutlineClub = theme.id === 'cutline-club';
  const isLegacyDefaultOld = theme.id === 'legacy-default-old';
  const isElessiPackTheme = theme.id?.startsWith('elessi-') === true;
  const isPcHubCommandSpecs = theme.id === 'pc-hub-eg' && variant === 'command-specs';
  const isWomenStyleLedger = theme.id === 'women-fashion-eg' && variant === 'style-ledger';
  const isWomenUtilityRail = theme.id === 'women-fashion-eg' && variant === 'utility-rail';
  const isStyleStoreUtilityRail = theme.id === 'style-store-eg' && variant === 'utility-rail';
  const isGracefulInfo = theme.id === 'soft-graceful';
  const isVelaFashionDirectBuybox =
    theme.id === 'vela-fashion-eg' && variant === 'fashion-direct-buybox';
  const isAtelierBuybox =
    (theme.id === 'rose-boutique-eg' || theme.id === 'baladi-market-eg') &&
    variant === 'atelier-buybox';
  const isButcherAtelier = theme.id === 'butcher-counter-eg';
  const isWomenProductInfoVariant = isWomenStyleLedger || isWomenUtilityRail;
  const isPerfumeScentBrief = theme.id === 'perfume-eg' && variant === 'scent-brief';
  const isElessiBagBuybox = variant === 'elessi-bag-buybox';
  const isElessiBuybox = variant === 'elessi-buybox';
  const isElessiSpecBuybox = variant === 'elessi-spec-buybox';
  const isElessiGarageBuybox = variant === 'elessi-garage-buybox';
  const isElessiGiftBuybox = variant === 'elessi-gift-buybox';
  const isElessiPetBuybox = variant === 'elessi-pet-buybox';
  const isElessiWatchBuybox = variant === 'elessi-watch-buybox';
  const isElessiCareBuybox = variant === 'elessi-care-buybox';
  const isElessiOrganicBuybox = variant === 'elessi-organic-buybox';
  const isElessiPlantBuybox = variant === 'elessi-plant-buybox';
  const isElessiBikeBuybox = variant === 'elessi-bike-buybox';
  const isElessiDigitalBuybox = variant === 'elessi-digital-buybox';
  const isRedlineAuto = theme.id === 'redline-auto';
  const isAnyElessiBuybox =
    isElessiBuybox ||
    isElessiSpecBuybox ||
    isElessiGarageBuybox ||
    isElessiGiftBuybox ||
    isElessiCareBuybox;

  const prefersArabicCopy =
    theme.direction === 'rtl' ||
    isZenOrganic ||
    isAirlume ||
    isCairoStride ||
    isFakhama;

  const usesCommerceHeaderLabel =
    isAnyElessiBuybox ||
    isElessiOrganicBuybox ||
    isElessiBagBuybox ||
    isElessiPlantBuybox ||
    isElessiBikeBuybox ||
    isElessiDigitalBuybox;

  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

  useEffect(() => {
    setSelectedAttributes({});
  }, [product?.id]);

  useEffect(() => {
    if (product?.productVariants?.length && Object.keys(selectedAttributes).length === 0) {
      const firstVariantAttributes = getVariantAttributes(product.productVariants[0]);
      if (Object.keys(firstVariantAttributes).length > 0) {
        setSelectedAttributes(firstVariantAttributes);
      }
    }
  }, [product?.productVariants, selectedAttributes]);
  const quantity = usePdpSelectionStore((state) => state.quantity);
  const setQuantity = usePdpSelectionStore((state) => state.setQuantity);
  const syncPdpSelection = usePdpSelectionStore((state) => state.syncSelection);
  const { addItem, isOpen: isCartOpen } = useCartStore();

  const [showStickyCta, setShowStickyCta] = useState(false);
  const [isShippingDialogOpen, setIsShippingDialogOpen] = useState(false);
  const [isSizeGuideDialogOpen, setIsSizeGuideDialogOpen] = useState(false);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [questionForm, setQuestionForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  const currency =
    storefrontSettings?.storefront?.settings?.currency ||
    storefrontSettings?.company?.currency ||
    'USD';

  useProductStructuredData({
    product,
    currency,
    reviews: reviewsForRating
      ? { count: reviewsForRating.length, avgRating: reviewsAverageRating }
      : undefined,
    storeName:
      storefrontSettings?.storefront?.settings?.storeName ||
      storefrontSettings?.company?.name ||
      theme?.header?.brandName ||
      theme?.name ||
      '',
  });

  const conversionSuiteEnabled = isStorefrontMarketplaceAppEnabled(
    storefrontSettings,
    'conversion-suite',
  );
  const conversionSuiteSettings = getStorefrontMarketplaceAppSettings(
    storefrontSettings,
    'conversion-suite',
  );
  const conversionModules =
    (conversionSuiteSettings['modules'] as Record<string, any> | undefined) || {};

  const isSoldCounterEnabled = isProductInfoConversionModuleEnabled(
    conversionSuiteEnabled,
    conversionModules,
    'soldCounter',
  );
  const isPurchaseFomoEnabled = isProductInfoConversionModuleEnabled(
    conversionSuiteEnabled,
    conversionModules,
    'purchaseFomo',
  );
  const isLowStockNoticeEnabled = isProductInfoConversionModuleEnabled(
    conversionSuiteEnabled,
    conversionModules,
    'lowStockNotice',
  );
  const isStickyAddToCartEnabled = isProductInfoConversionModuleEnabled(
    conversionSuiteEnabled,
    conversionModules,
    'stickyAddToCart',
  );

  const pdpSections = theme.pages.pdp?.sections || [];
  const embeddedPdpCheckoutSection = pdpSections.find((sectionEntry) => {
    const sectionType =
      typeof sectionEntry === 'string' ? sectionEntry : sectionEntry.type;
    const componentKey = getStorefrontSectionComponentKey(sectionType);
    return (
      sectionType === PDP_CHECKOUT_SECTION_ID ||
      componentKey === PDP_CHECKOUT_SECTION_ID
    );
  });
  const hasEmbeddedPdpCheckout = Boolean(embeddedPdpCheckoutSection);

  const isKhemetLuxeTheme = isKhemetLuxeThemeId(theme.id);
  const isKhemetLuxeV2Theme = theme.id === 'khemet-luxe-v2';
  const isKhemetInlineQuickOrderBuybox =
    isKhemetLuxeTheme && variant === 'elessi-care-buybox' && !isKhemetLuxeV2Theme;

  const productPageCheckoutEnabled =
    storefrontSettings?.storefrontSettings?.productPageShowCheckoutForm !== false;

  const supportsInlineQuickOrderPlacement =
    !isIntruderNft &&
    (theme.id === 'zen-organic' ||
      variant === 'standard' ||
      variant === 'accordion' ||
      variant === 'atelier-buybox' ||
      variant === 'boutique-ledger' ||
      variant === 'elessi-care-buybox' ||
      variant === 'scent-brief' ||
      variant === 'fashion-direct-buybox' ||
      variant === 'style-ledger' ||
      variant === 'utility-rail' ||
      variant === 'gear-loadout' ||
      variant === 'playful-story' ||
      variant === 'marketplace-bazaar');

  const forceInlineKhemetQuickOrder =
    isKhemetInlineQuickOrderBuybox && productPageCheckoutEnabled;

  const forceInlineMarketplaceQuickOrder =
    (variant === 'marketplace-bazaar' ||
      Boolean(theme?.id && theme.id.includes('marketplace-avenue'))) &&
    productPageCheckoutEnabled;

  const shouldRenderInlinePdpQuickOrder =
    forceInlineKhemetQuickOrder ||
    forceInlineMarketplaceQuickOrder ||
    (hasEmbeddedPdpCheckout && supportsInlineQuickOrderPlacement);

  const quantityOffersEnabled = isStorefrontMarketplaceAppEnabled(
    storefrontSettings,
    'quantity-offers-pro',
  );
  const quantityOffersSettings = getStorefrontMarketplaceAppSettings(
    storefrontSettings,
    'quantity-offers-pro',
  );
  const quantityOffersModules =
    (quantityOffersSettings['modules'] as Record<string, unknown> | undefined) || {};
  const explicitQuantityOffers = getActiveQuantityOffers(product?.metadata);
  const productVolumeDiscounts = getProductVolumeDiscounts(product);
  const hasConfiguredQuantityOffers =
    explicitQuantityOffers.length > 0 || productVolumeDiscounts.length > 0;

  const embeddedQuantityOffersSection = pdpSections.find((sectionEntry) => {
    const sectionType =
      typeof sectionEntry === 'string' ? sectionEntry : sectionEntry.type;
    const componentKey = getStorefrontSectionComponentKey(sectionType);
    return sectionType === 'quantity-offers' || componentKey === 'quantity-offers';
  });
  const embeddedQuantityOffersSectionConfig =
    embeddedQuantityOffersSection && typeof embeddedQuantityOffersSection !== 'string'
      ? embeddedQuantityOffersSection
      : undefined;
  const embeddedQuantityOffersSettings =
    embeddedQuantityOffersSectionConfig &&
    embeddedQuantityOffersSectionConfig.settings &&
    typeof embeddedQuantityOffersSectionConfig.settings === 'object'
      ? (embeddedQuantityOffersSectionConfig.settings as Record<string, unknown>)
      : undefined;

  const hideWhenSingleOffer = embeddedQuantityOffersSettings?.hideWhenSingleOffer === true;

  const canRenderQuantityOffers =
    quantityOffersEnabled &&
    quantityOffersModules['renderOnProductPage'] !== false &&
    hasConfiguredQuantityOffers &&
    (!hideWhenSingleOffer || explicitQuantityOffers.length > 1);

  const isMarketplaceBuybox = variant === 'marketplace-bazaar';

  const shouldRenderInlineQuantityOffers =
    canRenderQuantityOffers &&
    ((Boolean(embeddedQuantityOffersSection) &&
      embeddedQuantityOffersSettings?.placement === 'inline-buybox') ||
      (isMarketplaceBuybox &&
        (!embeddedQuantityOffersSection ||
          embeddedQuantityOffersSettings?.placement !== 'below-buybox')));

  const isPrimaryQuantityOffersDecision =
    shouldRenderInlineQuantityOffers &&
    embeddedQuantityOffersSettings?.decisionMode === 'primary';

  const inlinePdpQuickOrder = shouldRenderInlinePdpQuickOrder ? (
    <PdpQuickOrderPanel
      product={product}
      sectionSettings={undefined}
      isOpen={shouldRenderInlinePdpQuickOrder}
    />
  ) : null;

  const inlineQuantityOffers = shouldRenderInlineQuantityOffers ? (
    <QuantityOffersSection
      section={embeddedQuantityOffersSectionConfig}
      settings={embeddedQuantityOffersSettings}
      isOpen={shouldRenderInlineQuantityOffers}
    />
  ) : null;

  const homePath = buildStorefrontPath(location.pathname, '/', location.search);
  const shopPath = buildStorefrontPath(location.pathname, '/shop', location.search);
  const checkoutPath = buildStorefrontPath(location.pathname, '/checkout', location.search);

  // Variant matching
  const selectedVariant = useMemo(() => {
    const variants = product?.productVariants || [];
    if (!variants.length || Object.keys(selectedAttributes).length === 0) {
      return null;
    }

    const normAttr = (val: unknown) =>
      String(val || '')
        .trim()
        .toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/\s+/g, ' ');

    return (
      variants.find((v) => {
        const variantAttributes = getVariantAttributes(v);
        const variantEntries = Object.entries(variantAttributes);
        return (
          variantEntries.length === Object.keys(selectedAttributes).length &&
          variantEntries.every(
            ([key, value]) =>
              selectedAttributes[key] === value ||
              normAttr(selectedAttributes[key]) === normAttr(value),
          )
        );
      }) || null
    );
  }, [product?.productVariants, selectedAttributes]);

  const activePrice =
    typeof selectedVariant?.price === 'number' &&
    Number.isFinite(selectedVariant.price) &&
    selectedVariant.price > 0
      ? selectedVariant.price
      : typeof product?.price === 'number' && Number.isFinite(product.price)
        ? product.price
        : 0;

  const activeComparePrice = (() => {
    const candidates = [
      selectedVariant?.compareAtPrice,
      selectedVariant?.comparePrice,
      product?.compareAtPrice,
      product?.comparePrice,
    ];

    for (const candidate of candidates) {
      const numeric =
        typeof candidate === 'string' ? Number(candidate) : candidate;
      if (
        typeof numeric === 'number' &&
        Number.isFinite(numeric) &&
        numeric > 0
      ) {
        return numeric;
      }
    }

    return null;
  })();

  const displayPrice = formatStorefrontCurrency(activePrice, currency);
  const originalPrice =
    activeComparePrice && activeComparePrice > activePrice
      ? formatStorefrontCurrency(activeComparePrice, currency)
      : null;

  const discount =
    activeComparePrice && activeComparePrice > activePrice
      ? Math.round(((activeComparePrice - activePrice) / activeComparePrice) * 100)
      : null;

  const activeStock =
    typeof selectedVariant?.stock === 'number'
      ? selectedVariant.stock
      : typeof product?.stock === 'number'
        ? product.stock
        : 99;

  const isStrictlyOutOfStock = activeStock <= 0;
  const stockStatusLabel = isStrictlyOutOfStock
    ? prefersArabicCopy
      ? 'نفدت الكمية'
      : 'Out of Stock'
    : prefersArabicCopy
      ? 'متوفر في المخزون'
      : 'In Stock';

  const selectedOptionSummary = Object.values(selectedAttributes).filter(Boolean).join(' / ');
  const inventoryCountdownText = isStrictlyOutOfStock
    ? prefersArabicCopy
      ? 'غير متوفر للطلب الآن'
      : 'Currently unavailable'
    : prefersArabicCopy
      ? `متبقي ${activeStock} قطع فقط في المخزون`
      : `Only ${activeStock} items left in stock`;

  // Cashback preview
  const [cashbackPreview, setCashbackPreview] = useState<{
    cashback: number;
    currency: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCashbackPreview(null);
    if (!product) return undefined;

    const companyId = storefrontSettings?.company?.id;
    const categoryId = (product as { category?: { id?: string | number } })?.category?.id;
    const amount = Number(activePrice) * Number(quantity || 1);

    if (!companyId || !Number.isFinite(amount) || amount <= 0) return undefined;

    const params = new URLSearchParams({
      companyId: String(companyId),
      productId: String(product.id),
      categoryId: categoryId ? String(categoryId) : '',
      amount: String(amount),
    });
    const cacheKey = params.toString();

    const cached = CASHBACK_PREVIEW_CACHE.get(cacheKey);
    if (cached) {
      setCashbackPreview(cached);
      return undefined;
    }

    apiClient
      .get(`/loyalty/cashback-preview?${cacheKey}`)
      .then((response: any) => {
        if (cancelled) return;
        const payload = response?.data?.data ?? response?.data ?? {};
        if (!payload || payload.isDynamic === false) return;
        const cashback = Number(payload.cashback);
        if (!Number.isFinite(cashback) || cashback <= 0) return;
        const result = { cashback, currency: payload.currency || currency };
        CASHBACK_PREVIEW_CACHE.set(cacheKey, result);
        setCashbackPreview(result);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [product?.id, activePrice, quantity, storefrontSettings?.company?.id, currency]);

  // Sync PDP selection to store
  useEffect(() => {
    if (!product) {
      syncPdpSelection(null);
      return;
    }

    const selectedVolumeDiscounts =
      selectedVariant ? getProductVolumeDiscounts(selectedVariant, activePrice) : [];
    const activeVolumeDiscounts =
      selectedVolumeDiscounts.length > 0
        ? selectedVolumeDiscounts
        : getProductVolumeDiscounts(product, activePrice);

    syncPdpSelection({
      productId: product.id,
      productSlug: product.slug || id,
      productName: product.name,
      variantId: selectedVariant?.id ?? null,
      imageUrl: product.images?.[0] || '',
      unitPrice: activePrice,
      basePrice: activePrice,
      attributes: selectedAttributes,
      volumeDiscounts: activeVolumeDiscounts,
      requiresVariantSelection: Boolean(product.productVariants?.length),
      isSelectionReady: !product.productVariants?.length || Boolean(selectedVariant),
      stock: activeStock,
      allowBackorders: false,
      isOutOfStock: isStrictlyOutOfStock,
    });
  }, [
    activePrice,
    activeStock,
    id,
    isStrictlyOutOfStock,
    product,
    selectedAttributes,
    selectedVariant,
    syncPdpSelection,
  ]);

  // Actions
  const dispatchEmbeddedCheckoutOpen = () => {
    if (!product || !hasEmbeddedPdpCheckout) return;
    window.dispatchEvent(
      new CustomEvent(STOREFRONT_PDP_CHECKOUT_OPEN_EVENT, {
        detail: {
          productId: product.id,
          productKey: product.slug || id,
        },
      }),
    );
  };

  const handleAddToCart = async () => {
    if (!product) return;

    if (isStrictlyOutOfStock) {
      toast.error(
        prefersArabicCopy
          ? 'عذرًا، نفدت كمية هذا المنتج حاليًا وغير متاح للطلب.'
          : 'Sorry, this product is currently out of stock.',
      );
      return;
    }

    if (product.productVariants?.length && !selectedVariant) {
      toast.error(
        prefersArabicCopy
          ? 'يرجى اختيار المقاس واللون المتاح أولاً.'
          : 'Please select an available variant first.',
      );
      return;
    }

    const cartItemId = selectedVariant?.id
      ? `${product.id}-${selectedVariant.id}`
      : `${product.id}-${JSON.stringify(selectedAttributes)}`;

    const selectedVolumeDiscounts =
      selectedVariant ? getProductVolumeDiscounts(selectedVariant, activePrice) : [];
    const activeVolumeDiscounts =
      selectedVolumeDiscounts.length > 0
        ? selectedVolumeDiscounts
        : getProductVolumeDiscounts(product, activePrice);
    const quantityPricing = calculateVolumeDiscountPricing({
      unitPrice: activePrice,
      quantity,
      discounts: activeVolumeDiscounts,
    });

    addItem({
      id: cartItemId,
      productId: product.id,
      variantId: selectedVariant?.id,
      name: product.name,
      price: activePrice,
      basePrice: activePrice,
      quantity,
      image: product.images?.[0] || '',
      attributes: selectedAttributes,
      volumeDiscounts: activeVolumeDiscounts,
    });

    trackAddToCartEvent({
      productId: product.id,
      name: product.name,
      price: quantityPricing.effectiveUnitPrice,
      quantity,
      currency,
    });

    const shouldOpenCart = shouldProductInfoAddToCartOpenCart(theme.id, hasEmbeddedPdpCheckout);
    if (shouldOpenCart) {
      useCartStore.getState().setIsOpen(true);
    }

    const shouldOpenEmbedded = shouldProductInfoAddToCartOpenEmbeddedCheckout(
      theme.id,
      hasEmbeddedPdpCheckout,
    );
    if (shouldOpenEmbedded) {
      dispatchEmbeddedCheckoutOpen();
    }
  };

  const handleBuyNow = async () => {
    if (isStrictlyOutOfStock) {
      toast.error(
        prefersArabicCopy
          ? 'عذرًا، نفدت كمية هذا المنتج حاليًا وغير متاح للطلب.'
          : 'Sorry, this product is currently out of stock.',
      );
      return;
    }

    if (hasEmbeddedPdpCheckout) {
      if (product?.productVariants?.length && !selectedVariant) {
        toast.error(
          prefersArabicCopy
            ? 'يرجى اختيار المقاس واللون المتاح أولاً.'
            : 'Please select an available variant first.',
        );
        return;
      }
      dispatchEmbeddedCheckoutOpen();
      return;
    }

    await handleAddToCart();
    window.location.assign(checkoutPath);
  };

  const handleShareAction = async (platformId: string) => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = product?.name || '';

    if (platformId === 'copy') {
      try {
        await navigator.clipboard.writeText(url);
        toast.success(prefersArabicCopy ? 'تم نسخ الرابط!' : 'Link copied!');
      } catch {
        toast.error(prefersArabicCopy ? 'فشل نسخ الرابط' : 'Failed to copy');
      }
      return;
    }

    if (platformId === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} ${url}`)}`, '_blank');
      return;
    }

    if (platformId === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
      return;
    }

    if (platformId === 'twitter') {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
        '_blank',
      );
    }
  };

  // Parsed metadata & copy
  const specs = parseDetailRows(product?.['specs']);
  const shortDescription = typeof product?.['shortDescription'] === 'string' ? product['shortDescription'] : '';
  const descriptionPreviewText =
    shortDescription ||
    (prefersArabicCopy ? 'لا يوجد وصف متاح لهذا المنتج حالياً.' : 'No description available.');
  const safeDescription = sanitizeStorefrontHtml(product?.description || '');

  const breadcrumbHomeLabel = prefersArabicCopy ? 'الرئيسية' : 'Home';
  const breadcrumbShopLabel = prefersArabicCopy ? 'المتجر' : 'Shop';
  const productCategoryLabel = product?.category?.name || '';
  const productTagValues = parseMetadataStringList(product?.['tags']);

  const addToCartText = isStrictlyOutOfStock
    ? prefersArabicCopy
      ? 'نفدت الكمية'
      : 'Out of Stock'
    : sectionSettings?.addToCartText || (prefersArabicCopy ? 'أضف إلى السلة' : 'Add to Cart');

  const buyNowText = isStrictlyOutOfStock
    ? prefersArabicCopy
      ? 'غير متوفر'
      : 'Unavailable'
    : sectionSettings?.buyNowText || (prefersArabicCopy ? 'اشترِ الآن' : 'Buy now');

  const descriptionTitle =
    sectionSettings?.descriptionTitle || (prefersArabicCopy ? 'وصف المنتج' : 'Description');
  const shippingTitle =
    sectionSettings?.shippingTitle || (prefersArabicCopy ? 'الشحن والاسترجاع' : 'Shipping & Returns');
  const shippingText =
    sectionSettings?.shippingText ||
    (prefersArabicCopy
      ? 'يتم احتساب الشحن حسب المحافظة داخل صفحة الدفع، ويمكنك طلب الاستبدال أو الاسترجاع وفق سياسة المتجر بعد مراجعة الطلب.'
      : 'Free standard shipping on all orders over $50. Returns accepted within 30 days of delivery.');
  const shippingInteraction = sectionSettings?.shippingInteraction || 'accordion';
  const sizeGuideInteraction = sectionSettings?.sizeGuideInteraction || 'modal';
  const guaranteesTitle =
    sectionSettings?.guaranteesTitle || (prefersArabicCopy ? 'ثقة وضمان' : 'Trust & Guarantee');
  const guaranteesSubtitle =
    sectionSettings?.guaranteesSubtitle ||
    (prefersArabicCopy ? 'تسوق بأمان مع خيارات دفع موثوقة' : 'Shop with confidence');
  const guaranteeItems = parseMetadataArray(sectionSettings?.guaranteeItems);
  const guaranteeStyle = (sectionSettings?.guaranteeStyle as any) || 'minimal';
  const showGuarantees = sectionSettings?.showGuarantees !== false;

  const rawSizeGuideHref = sectionSettings?.sizeGuideLink || '';
  const isExternalSizeGuideHref = isExternalHref(rawSizeGuideHref);
  const sizeGuideText = sectionSettings?.sizeGuideText || (prefersArabicCopy ? 'دليل المقاسات' : 'Size guide');
  const canOpenSizeGuide = Boolean(rawSizeGuideHref || product?.['sizeGuide']);

  const variantSettings = parseVariantSettings(product?.metadata);
  const externalProductConfig = resolveExternalProductConfig(product as any);
  const externalOnlyProduct = externalProductConfig.externalOnly;
  const showExternalAffiliateCta = Boolean(externalProductConfig.url);

  const shouldRenderPrimaryBuyBox = !hasEmbeddedPdpCheckout || theme.id === 'khemet-luxe-eg';
  const shouldRenderStandaloneBuyBox = !hasEmbeddedPdpCheckout;

  const addToCartButtonClassName =
    'h-14 rounded-[0.95rem] bg-primary text-primary-foreground font-black uppercase tracking-wider text-sm transition-opacity hover:opacity-95';
  const buyNowButtonClassName =
    'h-14 rounded-[0.95rem] bg-[#78aa00] text-white font-black uppercase tracking-wider text-sm transition-colors hover:bg-[#6e9b00]';

  // Common UI blocks
  const commonHeader = (
    <div className="space-y-2">
      <nav className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Link to={homePath} className="transition-colors hover:text-foreground">
          {breadcrumbHomeLabel}
        </Link>
        <span>/</span>
        <Link to={shopPath} className="transition-colors hover:text-foreground">
          {breadcrumbShopLabel}
        </Link>
      </nav>
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight">
        {product?.name}
      </h1>
      {productCategoryLabel && (
        <span className="inline-flex rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-bold text-foreground">
          {productCategoryLabel}
        </span>
      )}
    </div>
  );

  const commonPrice = (
    <div className="flex flex-wrap items-baseline gap-3">
      <span className="text-3xl font-black text-foreground tabular-nums">
        {displayPrice}
      </span>
      {originalPrice && (
        <div className="flex items-center gap-2">
          <span className="text-lg text-muted-foreground line-through decoration-muted-foreground/40 tabular-nums">
            {originalPrice}
          </span>
          {discount && discount > 0 ? (
            <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
              {prefersArabicCopy ? `وفر ${discount}%` : `SAVE ${discount}%`}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );

  const commonVariantSelector =
    product?.productVariants && product.productVariants.length > 0 ? (
      <div id={STOREFRONT_BUYBOX_ID} className="space-y-4">
        {canOpenSizeGuide ? (
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {prefersArabicCopy ? 'المقاس واللون' : 'Size & Color'}
            </span>
            <button
              type="button"
              onClick={() => setIsSizeGuideDialogOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <Ruler className="h-3.5 w-3.5" />
              <span>{sizeGuideText}</span>
            </button>
          </div>
        ) : null}
        <VariantSelector
          variants={product.productVariants}
          selectedAttributes={selectedAttributes}
          onChange={setSelectedAttributes}
          variantSettings={variantSettings}
        />
      </div>
    ) : null;

  const commonActions = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <QuantitySelector value={quantity} onChange={setQuantity} />
        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            size="lg"
            className={addToCartButtonClassName}
            onClick={handleAddToCart}
          >
            {addToCartText}
          </Button>
          <button
            type="button"
            onClick={handleBuyNow}
            className={buyNowButtonClassName}
          >
            {buyNowText}
          </button>
        </div>
      </div>
    </div>
  );

  // Dialogs
  const sizeGuideDialog = (
    <ProductInfoSizeGuideDialog
      open={isSizeGuideDialogOpen}
      onOpenChange={setIsSizeGuideDialogOpen}
      direction={theme.direction}
      modalTitle={prefersArabicCopy ? 'دليل المقاسات' : 'Size Guide'}
      prefersArabicCopy={prefersArabicCopy}
      rows={[]}
      quickNote=""
      guideHref={rawSizeGuideHref}
      isExternalHref={isExternalHref}
      customSizeGuide={product?.['sizeGuide'] || null}
    />
  );

  const shippingPolicyDialog = (
    <ProductInfoShippingDialog
      open={isShippingDialogOpen}
      onOpenChange={setIsShippingDialogOpen}
      direction={theme.direction}
      modalTitle={shippingTitle}
      prefersArabicCopy={prefersArabicCopy}
      shippingTitle={shippingTitle}
      shippingBody={shippingText}
      shippingDetails={[]}
      returnsTitle={prefersArabicCopy ? 'سياسة الاستبدال والاسترجاع' : 'Returns & Exchanges'}
      returnsBody={
        prefersArabicCopy
          ? 'يمكنك معاينة المنتج والطلب مع المندوب والاستبدال خلال 14 يوماً.'
          : 'Items can be returned within 14 days of delivery.'
      }
      returnsDetails={[]}
    />
  );

  const questionDialog = (
    <ProductInfoQuestionDialog
      open={isQuestionDialogOpen}
      onOpenChange={setIsQuestionDialogOpen}
      direction={theme.direction}
      prefersArabicCopy={prefersArabicCopy}
      productName={product?.name || ''}
      displayPrice={displayPrice}
      selectedPrimaryImage={product?.images?.[0] || ''}
      questionForm={questionForm}
      onFieldChange={(field, val) => setQuestionForm((prev) => ({ ...prev, [field]: val }))}
      onSubmit={() => {
        toast.success(prefersArabicCopy ? 'تم إرسال استفسارك بنجاح!' : 'Inquiry sent successfully!');
        setIsQuestionDialogOpen(false);
      }}
    />
  );

  const renderExternalPurchaseCta = (layout: 'inline' | 'card' | 'block') => {
    if (!externalProductConfig.url) return null;
    return (
      <a
        href={externalProductConfig.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-14 w-full items-center justify-center rounded-[0.95rem] bg-primary px-5 text-sm font-black uppercase tracking-wider text-primary-foreground shadow transition-opacity hover:opacity-95"
      >
        {externalProductConfig.label || (prefersArabicCopy ? 'شراء من الموقع الشريك' : 'Buy on Partner Site')}
      </a>
    );
  };

  const renderAmazonBuyCta = () => renderExternalPurchaseCta('card');

  return {
    id,
    variant,
    theme,
    settings: sectionSettings,
    sectionSettings,
    isMarketplaceBazaar:
      variant === 'marketplace-bazaar' ||
      Boolean(theme?.id && theme.id.includes('marketplace-avenue')),
    product,
    isLoading,
    error,
    refetch,
    currency,
    homePath,
    shopPath,
    prefersArabicCopy,
    usesCommerceHeaderLabel,
    activePrice,
    activeComparePrice,
    displayPrice,
    originalPrice,
    discount,
    effectivePrice: activePrice,
    selectedVariant,
    selectedAttributes,
    setSelectedAttributes,
    variantSettings,
    isStrictlyOutOfStock,
    stockStatusLabel,
    selectedOptionSummary,
    inventoryCountdownText,
    quantity,
    setQuantity,
    handleAddToCart,
    handleBuyNow,
    handleShareAction,
    addToCartText,
    buyNowText,
    addToCartButtonClassName,
    buyNowButtonClassName,
    descriptionTitle,
    shippingTitle,
    shippingText,
    shippingInteraction,
    sizeGuideInteraction,
    guaranteesTitle,
    guaranteesSubtitle,
    guaranteeItems,
    guaranteeStyle,
    showGuarantees,
    canOpenSizeGuide,
    sizeGuideText,
    rawSizeGuideHref,
    isExternalSizeGuideHref,
    sizeGuideDialog,
    shippingPolicyDialog,
    questionDialog,
    openQuestionModal: () => setIsQuestionDialogOpen(true),
    openShippingModal: () => setIsShippingDialogOpen(true),
    openSizeGuideModal: () => setIsSizeGuideDialogOpen(true),
    isSoldCounterEnabled,
    isPurchaseFomoEnabled,
    isLowStockNoticeEnabled,
    isStickyAddToCartEnabled,
    showStickyCta,
    currentViewerCount: 12,
    recentSalesCount: 28,
    stockLevelCount: activeStock,
    saleCountdown: null,
    cashbackPreview,
    isAirlume,
    isNovaMobile,
    isCairoStride,
    isFakhama,
    isZenOrganic,
    isIntruderNft,
    isMenShoesEg,
    isBiteRush,
    isCutlineClub,
    isLegacyDefaultOld,
    isElessiPackTheme,
    isPcHubCommandSpecs,
    isWomenStyleLedger,
    isWomenUtilityRail,
    isStyleStoreUtilityRail,
    isGracefulInfo,
    isVelaFashionDirectBuybox,
    isAtelierBuybox,
    isButcherAtelier,
    isWomenProductInfoVariant,
    isPerfumeScentBrief,
    isElessiBagBuybox,
    isElessiBuybox,
    isElessiSpecBuybox,
    isElessiGarageBuybox,
    isElessiGiftBuybox,
    isElessiPetBuybox,
    isElessiWatchBuybox,
    isElessiCareBuybox,
    isElessiOrganicBuybox,
    isElessiPlantBuybox,
    isElessiBikeBuybox,
    isElessiDigitalBuybox,
    isRedlineAuto,
    isAnyElessiBuybox,
    isKhemetInlineQuickOrderBuybox,
    mergedInlinePdpQuickOrder: inlinePdpQuickOrder,
    inlineQuantityOffers,
    isPrimaryQuantityOffersDecision,
    externalProductConfig,
    externalOnlyProduct,
    showExternalAffiliateCta,
    renderExternalPurchaseCta,
    renderAmazonBuyCta,
    specs,
    shortDescription,
    descriptionPreviewText,
    safeDescription,
    breadcrumbHomeLabel,
    breadcrumbShopLabel,
    productCategoryLabel,
    productTagValues,
    reviewsAverageRating,
    reviewsCount: reviewsForRating.length,
    shouldRenderStandaloneBuyBox,
    shouldRenderPrimaryBuyBox,
    isCartOpen,
    hasEmbeddedPdpCheckout,
    commonVariantSelector,
    commonActions,
    commonHeader,
    commonPrice,
  };
};
