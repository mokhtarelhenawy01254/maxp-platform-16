import React, { CSSProperties, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { useWishlistStore } from '../store/useWishlistStore';
import { Product } from '../hooks/useProducts';
import { useStorefrontSettings } from '../hooks/useStorefrontSettings';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { ShoppingCart, Heart, Eye, Plus, Sparkles, ArrowUpRight, Star, Zap } from 'lucide-react';
import { toast } from 'sonner';
import QuickViewModal from './QuickViewModal';
import StorefrontProductImage from './StorefrontProductImage';
import { formatStorefrontCurrency } from '../utils/currency';
import { buildStorefrontPath } from '../utils/paths';
import { useStorefrontFacebookTracking } from '../hooks/useStorefrontFacebookTracking';
import { isPharmacyThemeId } from '../utils/pharmacyThemes';
import {
  getPrimaryProductImage,
  getProductImageCandidates,
} from '../utils/productImages';
import { getProductVolumeDiscounts } from '../utils/volumeDiscounts';
import { sanitizeProductCopy, truncateProductCopy } from '../utils/productCopy';
import {
  navigateStorefrontDocument,
  shouldStorefrontForceDocumentNavigation,
} from '../utils/navigationGuards';
import { useQueryClient } from '@tanstack/react-query';
import {
  fetchStorefrontProduct,
  getStorefrontProductQueryKey,
} from '../hooks/useProduct';

interface ProductCardProps {
  product: Product;
  variant?: 'standard' | 'minimal' | 'overlay' | 'compact' | 'luxury' | 'editorial' | 'glass' | 'list' | 'playful' | 'retail-air' | 'retail-direct' | 'pastel-fashion' | 'fastly-offer' | 'boutique-air' | 'editorial-bare' | 'plant-bare' | 'harvest-crate' | 'butcher-black-label' | 'carry-frame' | 'pedal-frame' | 'signal-rack';
  styleOverrides?: CSSProperties;
  quickViewLabel?: string;
  addToWishlistLabel?: string;
  imageLoading?: 'lazy' | 'eager';
  imageFetchPriority?: 'high' | 'low' | 'auto';
}

const normalizeColorString = (str: string) =>
  String(str || "")
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ");

const resolveNamedColorSwatch = (value: string) => {
  const normalizedValue = normalizeColorString(value);

  if (!normalizedValue) return "#f6ddd7";
  if (normalizedValue.includes("اسود") || normalizedValue.includes("black")) return "#2f232d";
  if (normalizedValue.includes("ابيض") || normalizedValue.includes("white")) return "#fff8f6";
  if (normalizedValue.includes("اوف") || normalizedValue.includes("off")) return "#f7efe8";
  if (normalizedValue.includes("عنابي") || normalizedValue.includes("burgundy")) return "#7d3d4b";
  if (normalizedValue.includes("وردي") || normalizedValue.includes("pink")) return "#eaa3ae";
  if (normalizedValue.includes("بيج") || normalizedValue.includes("beige")) return "#d6b59a";
  if (normalizedValue.includes("بني") || normalizedValue.includes("brown")) return "#8b5e52";
  if (normalizedValue.includes("ازرق") || normalizedValue.includes("blue")) return "#7f9cc7";
  if (normalizedValue.includes("اخضر") || normalizedValue.includes("green")) return "#8cab8a";

  return "#f2d5cf";
};

const translateZenCategoryLabel = (value: string): string => {
  const normalizedValue = value.trim().toLowerCase();

  switch (normalizedValue) {
    case 'plants':
    case 'plant':
      return 'نباتات';
    case 'pots':
    case 'pot':
    case 'planters':
      return 'أواني';
    case 'seeds':
    case 'seed':
      return 'بذور';
    case 'care':
    case 'plant care':
      return 'عناية بالنبات';
    case 'decor':
    case 'home decor':
      return 'ديكور طبيعي';
    case 'gifts':
    case 'gift':
      return 'هدايا طبيعية';
    case 'skincare':
      return 'عناية طبيعية';
    default:
      return value;
  }
};

const translateRtlRetailCategoryLabel = (value: string): string => {
  const normalizedValue = value.trim().toLowerCase();

  switch (normalizedValue) {
    case 'footwear':
    case 'shoes':
    case 'shoe':
      return 'أحذية';
    case 'sneakers':
    case 'sneaker':
      return 'سنيكرز';
    case 'heels':
    case 'heel':
    case 'pumps':
    case 'pump':
      return 'كعب';
    case 'sandals':
    case 'sandal':
      return 'صنادل';
    case 'boots':
    case 'boot':
      return 'بوت';
    case 'flats':
    case 'flat':
    case 'loafers':
    case 'loafer':
      return 'لوفر وفلات';
    case 'accessories':
    case 'accessory':
      return 'اكسسوارات';
    case "women's clothing":
    case 'womens clothing':
      return 'ملابس نسائية';
    case "men's clothing":
    case 'mens clothing':
      return 'ملابس رجالية';
    default:
      return value;
  }
};

const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  variant = 'standard',
  styleOverrides,
  quickViewLabel,
  addToWishlistLabel,
  imageLoading,
  imageFetchPriority,
}) => {
  const { id, name, price, slug } = product;
  const { addItem } = useCartStore();
  const { toggleItem, hasItem } = useWishlistStore();
  const { settings } = useStorefrontSettings();
  const { trackAddToCartEvent } = useStorefrontFacebookTracking();
  const { theme } = useStorefrontTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const isAirlume = theme.id === 'airlume-ai';
  const isSoleaFemme = theme.id === 'solea-femme';
  const isFakhama = theme.id === 'fakhama-elite';
  const isDistrictMarket = theme.id === 'district-market';
  const isPerfumeEg = theme.id === 'perfume-eg';
  const isVelaFashion = theme.id === 'vela-fashion-eg';
  const isFastlyTheme = theme.id === 'fastly-eg';
  const isZenOrganic = theme.id === 'zen-organic';
  const isBiteRush = theme.id === 'restaurant-demo';
  const isCafeDemo = theme.id === 'cafe-demo';
  const isClosetOs = theme.id === 'closet-os';
  const isElegantLuxe = theme.id === 'elegant-luxe';
  const isKhemetLuxe = theme.id === 'khemet-luxe-eg';
  const isButcherCounter = theme.id === 'butcher-counter-eg';
  const isPharmacy = isPharmacyThemeId(theme.id);
  const isRedLine = theme.id === 'redline-auto';
  const storefrontSettings = settings?.storefront?.settings;
  const shouldForceDocumentNavigation = shouldStorefrontForceDocumentNavigation(
    theme.id,
    true,
  );

  const features = settings?.storefront?.storefrontFeatures || {
    quickViewEnabled: true,
    wishlistEnabled: true,
    comparisonEnabled: false,
    gridAddToCartIcon: false,
    gridDiscountBanner: false,
  };

  const currency =
    settings?.storefront?.settings?.currency ||
    settings?.company?.currency ||
    'EGP';
  const productRouteBase = isVelaFashion ? '/products' : '/product';
  const productPath = buildStorefrontPath(
    location.pathname,
    `${productRouteBase}/${slug || id}`,
    location.search,
  );
  const queryClient = useQueryClient();
  const prefetchTarget = slug || id;

  const handlePrefetch = React.useCallback(() => {
    if (!prefetchTarget) return;

    const queryKey = getStorefrontProductQueryKey(prefetchTarget);
    if (!queryClient.getQueryData(queryKey) && product) {
      queryClient.setQueryData(queryKey, product);
    }
    void queryClient.prefetchQuery({
      queryKey,
      queryFn: () => fetchStorefrontProduct(prefetchTarget),
      staleTime: 60 * 1000,
    });
  }, [queryClient, prefetchTarget, product]);
  const isRtl = theme?.direction === 'rtl';
  const hasVariantChoices = Boolean(product.productVariants?.length);
  const stockQuantity =
    typeof product.stock === 'number'
      ? product.stock
      : typeof product.inventory === 'number'
        ? product.inventory
        : typeof product.quantity === 'number'
          ? product.quantity
          : null;
  const isBackorderAllowed =
    product.allowBackorders === true ||
    (product.metadata as any)?.allowBackorders === true ||
    product.trackInventory === false ||
    Boolean(product.isPreOrder);
  const isStockTracked = product.trackInventory !== false;

  const hasInStockVariant = hasVariantChoices
    ? (product.productVariants || []).some(
        (v) =>
          v.trackInventory === false ||
          v.allowBackorders === true ||
          (v.metadata as any)?.allowBackorders === true ||
          (typeof v.stock === 'number' ? v.stock > 0 : true),
      )
    : true;

  const isStrictlyOutOfStock = hasVariantChoices
    ? !hasInStockVariant && !isBackorderAllowed
    : isStockTracked &&
      stockQuantity !== null &&
      stockQuantity <= 0 &&
      !isBackorderAllowed;

  const isLowStock =
    !isStrictlyOutOfStock &&
    stockQuantity !== null &&
    stockQuantity > 0 &&
    stockQuantity <= 5;

  const openProductPath = () => {
    if (shouldForceDocumentNavigation) {
      navigateStorefrontDocument(productPath);
      return;
    }

    navigate(productPath);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isStrictlyOutOfStock) {
      toast.error(
        isRtl
          ? 'عذرًا، نفدت كمية هذا المنتج حاليًا.'
          : 'Sorry, this product is currently out of stock.',
      );
      return;
    }

    if (hasVariantChoices) {
      setIsQuickViewOpen(true);
      return;
    }

    addItem({
      productId: id,
      name,
      price: typeof price === 'string' ? parseFloat(price) : price,
      basePrice: typeof price === 'string' ? parseFloat(price) : price,
      comparePrice: typeof numericComparePrice === 'number' ? numericComparePrice : undefined,
      quantity: 1,
      imageUrl: getPrimaryProductImage(product),
      volumeDiscounts: getProductVolumeDiscounts(product),
    });

    trackAddToCartEvent({
      id,
      name,
      price: typeof price === 'string' ? parseFloat(price) : price,
      quantity: 1,
      category: product.category?.name,
    });
  };

  const handleQuickBuy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isStrictlyOutOfStock) {
      toast.error(
        isRtl
          ? 'عذرًا، نفدت كمية هذا المنتج حاليًا.'
          : 'Sorry, this product is currently out of stock.',
      );
      return;
    }

    if (hasVariantChoices) {
      setIsQuickViewOpen(true);
      return;
    }

    addItem(
      {
        productId: id,
        name,
        price: typeof price === 'string' ? parseFloat(price) : price,
        basePrice: typeof price === 'string' ? parseFloat(price) : price,
        comparePrice: typeof numericComparePrice === 'number' ? numericComparePrice : undefined,
        quantity: 1,
        imageUrl: getPrimaryProductImage(product),
        volumeDiscounts: getProductVolumeDiscounts(product),
      },
      { openCart: false },
    );

    trackAddToCartEvent({
      id,
      name,
      price: typeof price === 'string' ? parseFloat(price) : price,
      quantity: 1,
      category: product.category?.name,
    });

    const targetCheckoutPath = buildStorefrontPath(location.pathname, '/checkout', location.search);
    if (shouldForceDocumentNavigation) {
      navigateStorefrontDocument(targetCheckoutPath);
      return;
    }

    navigate(targetCheckoutPath);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickViewOpen(true);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleItem(id);
  };

  const isWishlisted = hasItem(id);

  const formattedPrice = formatStorefrontCurrency(
    typeof price === 'string' ? parseFloat(price) : price,
    currency,
  );
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  const numericComparePrice =
    typeof product.comparePrice === 'string'
      ? parseFloat(product.comparePrice)
      : product.comparePrice;
  const hasDiscount =
    typeof numericComparePrice === 'number' &&
    Number.isFinite(numericComparePrice) &&
    numericComparePrice > numericPrice;
  const discountPercentage =
    hasDiscount && typeof numericComparePrice === 'number'
      ? Math.round(((numericComparePrice - numericPrice) / numericComparePrice) * 100)
      : null;
  const formattedComparePrice =
    hasDiscount && typeof numericComparePrice === 'number'
      ? formatStorefrontCurrency(numericComparePrice, currency)
      : null;
  const ratingValue = (() => {
    const directRating =
      typeof product.rating === 'number'
        ? product.rating
        : typeof product.rating === 'string'
          ? parseFloat(product.rating)
          : typeof product.reviewSummary?.averageRating === 'number'
            ? product.reviewSummary.averageRating
            : typeof product.reviewAverage === 'number'
              ? product.reviewAverage
              : null;
    return typeof directRating === 'number' && Number.isFinite(directRating)
      ? directRating
      : null;
  })();
  const reviewCount = (() => {
    const directCount =
      typeof product.reviewCount === 'number'
        ? product.reviewCount
        : typeof product.reviewsCount === 'number'
          ? product.reviewsCount
          : typeof product.ratingCount === 'number'
            ? product.ratingCount
            : typeof product.reviewSummary?.totalReviews === 'number'
              ? product.reviewSummary.totalReviews
              : null;
    return typeof directCount === 'number' && Number.isFinite(directCount)
      ? directCount
      : null;
  })();

  const savingsAmount =
    hasDiscount && typeof numericComparePrice === 'number'
      ? numericComparePrice - numericPrice
      : null;
  const formattedSavings =
    savingsAmount && savingsAmount > 0
      ? formatStorefrontCurrency(savingsAmount, currency)
      : null;

  const imageCandidates = getProductImageCandidates(product);
  const prefersArabicCopy =
    isRtl ||
    isRedLine ||
    isZenOrganic ||
    isAirlume ||
    isFakhama ||
    isButcherCounter;
  const productCategorySlug = String(
    product.category?.slug ||
      product.categoryId ||
      product.category?.name ||
      '',
  )
    .trim()
    .toLowerCase();
  const isVelaAccessoryDrivenCard =
    isVelaFashion &&
    ['bags', 'accessories'].includes(productCategorySlug);
  const categoryLabel =
    typeof product.category?.name === 'string' && product.category.name.trim()
      ? isZenOrganic
        ? translateZenCategoryLabel(product.category.name.trim())
        : isRtl
          ? translateRtlRetailCategoryLabel(product.category.name.trim())
        : product.category.name.trim()
      : typeof product.categoryId === 'string' && product.categoryId.trim()
        ? isZenOrganic
          ? translateZenCategoryLabel(product.categoryId.trim())
          : isRtl
            ? translateRtlRetailCategoryLabel(product.categoryId.trim())
          : product.categoryId.trim()
        : isSoleaFemme
            ? 'اختيار Solea'
            : isAirlume
              ? 'Airlume Select'
              : isZenOrganic
                ? 'اختيار طبيعي'
                : isRtl
                  ? 'اختيار مميز'
                  : 'Featured Item';
  const finalQuickViewLabel = quickViewLabel || (isRtl ? 'نظرة سريعة' : 'Quick View');
  const finalWishlistLabel = addToWishlistLabel || (isRtl ? 'أضف للمفضلة' : 'Add to Wishlist');
  const detailLabel =
    isBiteRush
      ? 'شاهد الوجبة'
      : isCafeDemo
      ? 'شاهد التفاصيل'
      : isPharmacy
      ? 'شاهد التفاصيل'
      : isButcherCounter
      ? 'تجهيز القطعية'
      : isSoleaFemme || isFakhama
      ? 'شاهدي التفاصيل'
      : isAirlume || isZenOrganic || isRtl
        ? 'شاهد التفاصيل'
        : 'View details';
  const actionLabel = isStrictlyOutOfStock
    ? (isRtl ? 'نفدت الكمية' : 'Sold out')
    : isVelaFashion
    ? 'Add to cart'
    : hasVariantChoices
      ? isBiteRush
        ? 'اختر الإضافات'
        : isCafeDemo
        ? 'اختر الخيارات'
        : isPharmacy
        ? 'اختر التفاصيل'
        : isButcherCounter
        ? 'تجهيز الطلب'
        : isPerfumeEg
        ? 'اختاري الحجم'
        : isSoleaFemme || isFakhama
        ? 'اختاري المقاس'
        : isAirlume
          ? 'اختر الخيارات'
          : isZenOrganic
            ? 'اختَر الخيار'
            : isRtl
              ? 'اختر الخيارات'
              : 'Choose options'
      : isBiteRush
        ? 'أضف للطلب'
        : isCafeDemo
        ? 'أضف للسلة'
        : isPharmacy
        ? 'أضف للسلة'
        : isButcherCounter
        ? 'احجز القطعة'
        : isSoleaFemme || isFakhama
        ? 'أضيفي للسلة'
        : isAirlume || isZenOrganic
          ? 'أضف للسلة'
          : isRtl
            ? 'أضف للسلة'
            : 'Add to cart';
  const resolvedImageLoading =
    imageLoading ||
    (isVelaFashion &&
    (variant === 'retail-direct' || variant === 'pastel-fashion' || variant === 'standard' || variant === 'minimal')
      ? 'eager'
      : 'lazy');
  const resolvedImageFetchPriority =
    imageFetchPriority ||
    (resolvedImageLoading === 'eager' ? 'high' : undefined);
  const productDescription = sanitizeProductCopy(product.description);
  const shopperSummary = productDescription
    ? truncateProductCopy(productDescription, 118)
    : hasDiscount
      ? isRtl
        ? 'عرض محدود على هذه القطعة مع سعر أوضح قبل اتخاذ قرار الشراء.'
        : 'Limited-time savings on this item with a clearer price before checkout.'
      : isRtl
        ? 'تفاصيل مختصرة تساعدك على المقارنة السريعة قبل فتح صفحة المنتج.'
        : 'Quick details that help you compare before opening the full product page.';
  const listSummary = productDescription
    ? truncateProductCopy(productDescription, 96)
    : hasDiscount
      ? isRtl
        ? `عرض مباشر مع خصم ${discountPercentage}% على قطعة مطلوبة.`
        : `Limited-time offer with ${discountPercentage}% off on a popular item.`
      : isRtl
        ? 'ملخص سريع يساعدك على مقارنة السعر والتفاصيل قبل الدخول للمنتج.'
        : 'A quick summary to compare price and details before opening the product.';
  const luxuryTopBadge =
    isElegantLuxe
      ? String(product['editorialBadge'] || 'اختيار الصالون')
      : isPerfumeEg
        ? 'زجاجة أصلية'
        : 'Signature';
  const luxuryAssistLabel = isElegantLuxe
    ? 'منسق للدار'
    : isPerfumeEg
      ? 'حجم واضح'
      : 'Curated';
  const luxurySummary = isElegantLuxe
    ? shopperSummary
    : isPerfumeEg
      ? shopperSummary
      : hasDiscount
        ? `قطعة مميزة بخصم ${discountPercentage}% مع حضور بصري أقوى للمنتجات الفاخرة.`
        : 'صياغة أنيقة لعرض المنتجات premium داخل القوالب ذات الطابع الراقي.';
  const cutlineClubRailCode =
    String(slug || id || '')
      .replace(/[^a-z0-9]/gi, '')
      .slice(-6)
      .toUpperCase() || 'CLUB05';
  const cutlineClubPosterTag = hasDiscount && discountPercentage
    ? `DROP ${discountPercentage}%`
    : hasVariantChoices
      ? 'SET READY'
      : 'POSTER MODE';
  const cutlineClubListSummary = productDescription
    ? truncateProductCopy(productDescription, 110)
    : hasDiscount && discountPercentage
      ? isRtl
        ? `خصم ${discountPercentage}% على قطعة جاهزة للدخول في اللوك بسرعة من غير لف طويل.`
        : `${discountPercentage}% off on a ready piece built for a fast styling decision.`
      : hasVariantChoices
        ? isRtl
          ? 'راجع المقاس واللون بسرعة ثم كمّل باقي اللوك من نفس الريل.'
          : 'Check the fit fast, then build the rest of the look from the same rail.'
        : isRtl
          ? 'قطعة مباشرة وواضحة للفرز السريع داخل ريل الشارع.'
          : 'A direct, easy-to-scan piece inside the street rail.';
  const closetOsSlotLabel = hasVariantChoices
    ? isRtl
      ? 'خانة قابلة للتبديل'
      : 'Flexible slot'
    : isRtl
      ? 'أساس متكرر'
      : 'Repeat core';
  const closetOsCareLabel = hasDiscount && discountPercentage
    ? isRtl
      ? `وفر ${discountPercentage}%`
      : `Save ${discountPercentage}%`
    : isRtl
      ? 'غسيل بارد'
      : 'Wash cold';
  const closetOsPlannerSummary = productDescription
    ? truncateProductCopy(productDescription, 102)
    : hasVariantChoices
      ? isRtl
        ? 'راجع اللون والمقاس ثم حرك القطعة داخل أيام الأسبوع بسهولة.'
        : 'Check the fit and move the piece across the week with ease.'
      : isRtl
        ? 'قطعة هادئة تخدم أكثر من يوم من غير ما تفقد وضوحها.'
        : 'A calm piece built to work across more than one day.';
  const carryColorOptions = (() => {
    const seen = new Set<string>();
    const options: string[] = [];

    (product.productVariants || []).forEach((productVariant) => {
      const attrValues = (productVariant as any).attributeValues;
      const rawColor =
        productVariant.attributes?.['اللون'] ||
        productVariant.attributes?.color ||
        productVariant.attributes?.Color ||
        attrValues?.['اللون'] ||
        attrValues?.color ||
        attrValues?.Color ||
        productVariant.name ||
        '';

      const colorStr = String(rawColor).trim();
      if (!colorStr) return;

      const parts = colorStr.split(/\s*[-/|,]\s*/).map((p) => p.trim()).filter(Boolean);
      let detectedColor = colorStr;
      if (parts.length > 1) {
        const knownColors = ['ابيض', 'اسود', 'بيج', 'احمر', 'ازرق', 'اخضر', 'بني', 'رمادي', 'وردي', 'كحلي', 'اوف', 'عنابي', 'white', 'black', 'beige', 'red', 'blue', 'green', 'brown', 'gray', 'grey', 'pink', 'navy'];
        const found = parts.find((p) => {
          const norm = normalizeColorString(p);
          return knownColors.some((kc) => norm.includes(kc));
        });
        if (found) {
          detectedColor = found;
        } else if (!/^\d+$/.test(parts[0])) {
          detectedColor = parts[0];
        }
      }

      const norm = normalizeColorString(detectedColor);
      if (norm && !seen.has(norm)) {
        seen.add(norm);
        options.push(detectedColor);
      }
    });

    return options.slice(0, 3);
  })();
  const carrySizeOptions = Array.from(
    new Set(
      (product.productVariants || [])
        .map((productVariant) =>
          String(
            productVariant.attributes?.['الحجم'] ||
              productVariant.attributes?.['المقاس'] ||
              productVariant.attributes?.size ||
              productVariant.attributes?.Size ||
              '',
          ).trim(),
        )
        .filter(Boolean),
    ),
  ).slice(0, 2);
  const carryCardSummary = productDescription
    ? truncateProductCopy(productDescription, 86)
    : hasVariantChoices
      ? isRtl
        ? 'اختاري اللون أو الحجم ثم أضيفي القطعة الأنسب لحركتك اليومية أو السفر.'
        : 'Choose the right color or size, then add the piece that fits daily carry or travel.'
      : hasDiscount && discountPercentage
        ? isRtl
          ? `وفر ${discountPercentage}% على قطعة عملية جاهزة للدخول في السلة بسرعة.`
          : `Save ${discountPercentage}% on a practical piece ready to drop into cart.`
        : isRtl
          ? 'قطعة عملية بصور أوضح وخيارات أسرع قبل فتح صفحة المنتج.'
          : 'A practical piece with clearer imagery and faster decisions before opening the PDP.';
  const featuredBadgeLabel = isRtl ? 'اختيار مميز' : 'Featured';
  const editorialEyebrow = useMemo(() => {
    if (hasDiscount && discountPercentage) {
      return isAirlume || isZenOrganic || isRtl
        ? `وفر ${discountPercentage}%`
        : `Save ${discountPercentage}%`;
    }
    if (hasVariantChoices) {
      return isPerfumeEg
        ? 'أحجام متاحة'
        : isAirlume || isZenOrganic || isRtl
          ? 'خيارات متعددة'
          : 'Multiple options';
    }
    return isPerfumeEg
      ? 'اختيار موصى به'
      : isAirlume || isRtl
        ? 'اختيار اليوم'
        : isZenOrganic
          ? 'اختيار طبيعي'
          : 'Curated pick';
  }, [discountPercentage, hasDiscount, hasVariantChoices, isAirlume, isPerfumeEg, isRtl, isZenOrganic]);

  const renderImageFallback = (className = '') => (
    <div
      className={`flex h-full w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_top,hsl(var(--background)),hsl(var(--muted))_68%)] px-4 text-center ${className}`}
    >
      <span className="inline-flex rounded-full border border-primary/10 bg-background/85 px-3 py-1 text-[11px] font-bold text-muted-foreground backdrop-blur">
        {categoryLabel}
      </span>
      <span className="mt-3 line-clamp-2 text-sm font-semibold text-foreground/85">
        {name}
      </span>
    </div>
  );

  const FloatingIcons = ({ forceVisible = false }: { forceVisible?: boolean }) => (
    <div className={`absolute top-2 end-2 z-10 flex flex-col gap-2 transition-all duration-300 ${forceVisible || isHovered ? 'opacity-100 translate-x-0' : 'opacity-100 translate-x-0 md:opacity-0 md:translate-x-4 md:rtl:-translate-x-4'}`}>
      {features.wishlistEnabled && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleItem(id);
          }}
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-95 ${
            isWishlisted
              ? isAirlume || isSoleaFemme
                ? 'bg-primary text-primary-foreground'
                : 'bg-rose-500 text-white'
              : isAirlume
                ? 'border border-white/70 bg-white/88 text-foreground hover:border-primary/30 hover:bg-background hover:text-primary'
                : isSoleaFemme
                  ? 'bg-background/92 text-foreground hover:bg-primary hover:text-primary-foreground'
                  : 'bg-white text-gray-900 shadow-md hover:text-rose-500'
          }`}
          title={finalWishlistLabel}
          aria-label={finalWishlistLabel}
        >
          <Heart size={18} fill={isWishlisted ? 'currentColor' : 'none'} />
        </button>
      )}
      {features.quickViewEnabled && (
        <button
          onClick={handleQuickView}
          className={`flex h-10 w-10 items-center justify-center rounded-full shadow-sm transition-all duration-300 hover:scale-110 active:scale-95 ${
            isAirlume
              ? 'border border-white/70 bg-white/88 text-foreground hover:border-primary/30 hover:bg-background hover:text-primary'
              : isSoleaFemme
                ? 'bg-background/92 text-foreground hover:bg-primary hover:text-primary-foreground'
                : 'bg-white text-gray-900 shadow-md hover:text-primary'
          }`}
          title={finalQuickViewLabel}
          aria-label={finalQuickViewLabel}
        >
          <Eye size={18} />
        </button>
      )}
    </div>
  );

  const productCardStyles = (overrides: CSSProperties = {}): CSSProperties => ({
    borderRadius: 'var(--product-card-radius, var(--radius))',
    boxShadow: isHovered
      ? 'var(--product-card-hover-shadow, var(--product-card-shadow))'
      : 'var(--product-card-shadow)',
    backgroundColor: 'hsl(var(--card) / var(--product-card-surface-opacity, 1))',
    ...styleOverrides,
    ...overrides,
  });

  const productCardBadgeStyles: CSSProperties = {
    borderRadius: 'var(--product-card-badge-radius, 999px)',
  };

  const DiscountBadge = ({
    className = '',
    showSavings = false,
  }: {
    className?: string;
    showSavings?: boolean;
  }) => {
    if (isStrictlyOutOfStock) {
      return (
        <span
          style={productCardBadgeStyles}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black shadow-sm bg-rose-600/95 text-white ${className}`}
        >
          {isRtl ? 'نفدت الكمية' : 'Sold out'}
        </span>
      );
    }

    if (!discountPercentage) return null;

    const shouldShowMonetarySavings =
      showSavings || (formattedSavings && (isRtl || prefersArabicCopy));

    return (
      <span
        style={productCardBadgeStyles}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black shadow-sm ${
          isZenOrganic
            ? 'bg-[#88a876] text-white'
            : isAirlume
              ? 'border border-white/70 bg-white/92 text-slate-950'
              : 'bg-rose-600 text-white shadow-rose-500/20'
        } ${className}`}
      >
        {shouldShowMonetarySavings && formattedSavings
          ? isRtl
            ? `وفر ${formattedSavings}`
            : `Save ${formattedSavings}`
          : isZenOrganic
            ? `وفر ${discountPercentage}%`
            : `-${discountPercentage}%`}
      </span>
    );
  };

  const UrgencyBadge = ({ className = '' }: { className?: string }) => {
    if (!isLowStock || !stockQuantity) return null;

    return (
      <span
        style={productCardBadgeStyles}
        className={`inline-flex items-center gap-1 rounded-full bg-amber-500/95 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-sm animate-pulse ${className}`}
      >
        <span>🔥</span>
        <span>{isRtl ? `باقي ${stockQuantity} فقط!` : `Only ${stockQuantity} left!`}</span>
      </span>
    );
  };

  const CardShell = ({ children, className, style }: { children: React.ReactNode; className: string; style?: CSSProperties }) => (
    <Link
      to={productPath}
      reloadDocument={shouldForceDocumentNavigation}
      onMouseEnter={() => {
        setIsHovered(true);
        handlePrefetch();
      }}
      onTouchStart={handlePrefetch}
      onMouseLeave={() => setIsHovered(false)}
      className={className}
      style={{ ...productCardStyles(style), touchAction: 'manipulation' }}
    >
      {children}
    </Link>
  );

  if (isRedLine) {
    return (
      <>
        <CardShell className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white text-card-foreground shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_16px_36px_-12px_rgba(0,0,0,0.12)]">
          {/* Top Image Zone */}
          <div className="relative aspect-square w-full overflow-hidden bg-[#fafafa] p-3 sm:p-4 flex items-center justify-center border-b border-neutral-100">
            {discountPercentage ? (
              <span className="absolute start-3 top-3 z-20 inline-flex items-center gap-1 rounded-full bg-neutral-950 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm tabular-nums tracking-tight">
                -{discountPercentage}%
              </span>
            ) : null}

            {features.wishlistEnabled ? (
              <button
                onClick={handleWishlist}
                className={`absolute end-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200/80 bg-white/95 text-neutral-400 shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:text-rose-600 hover:border-rose-200 active:scale-95 ${
                  isWishlisted ? 'text-rose-600 border-rose-200' : ''
                }`}
                title={finalWishlistLabel}
                aria-label={finalWishlistLabel}
              >
                <Heart size={14} className={isWishlisted ? 'fill-current' : ''} />
              </button>
            ) : null}

            <div className="flex h-full w-full items-center justify-center">
              <StorefrontProductImage
                candidates={imageCandidates}
                alt={name}
                loading={resolvedImageLoading}
                fetchpriority={resolvedImageFetchPriority}
                requestedWidth={520}
                responsiveWidths={[240, 320, 420, 520]}
                responsiveSizes="(max-width: 767px) 68vw, (max-width: 1279px) 28vw, 20vw"
                imageQuality={85}
                width="520"
                height="520"
                className="h-full w-full object-contain mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-105"
                fallback={renderImageFallback('rounded-xl bg-neutral-100')}
              />
            </div>

            {/* Micro badge: OEM precision fit */}
            <div className="absolute bottom-2.5 start-3 z-20 inline-flex items-center gap-1.5 rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-neutral-800 shadow-sm backdrop-blur-sm border border-neutral-200/70">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
              <span>{prefersArabicCopy ? 'تفصيل فابريقة بالمللي' : 'Custom OEM Fit'}</span>
            </div>
          </div>

          {/* Card Body */}
          <div className="flex flex-1 flex-col p-3.5 sm:p-4 text-start">
            {/* Category & Trust indicator */}
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-semibold text-rose-600 uppercase tracking-wide">
                {categoryLabel || (prefersArabicCopy ? 'إكسسوارات سيارات' : 'Car Accessories')}
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                {prefersArabicCopy ? 'معاينة قبل الدفع' : 'Inspect before pay'}
              </span>
            </div>

            {/* Product Title */}
            <h3 className="mt-1.5 line-clamp-2 text-sm sm:text-[15px] font-bold leading-snug text-neutral-900 transition-colors group-hover:text-rose-600 font-heading">
              {name}
            </h3>

            {/* Rating if available */}
            {(ratingValue || reviewCount) ? (
              <div className="mt-1.5 flex items-center gap-1 text-[#f4c94d]">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={`redline-star-${index}`}
                    size={11}
                    fill={ratingValue && index < Math.round(ratingValue) ? 'currentColor' : 'none'}
                  />
                ))}
                {reviewCount ? (
                  <span className="ms-1 text-[11px] font-semibold tabular-nums text-neutral-500">
                    ({reviewCount})
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* Price Row */}
            <div className="mt-auto pt-3 border-t border-neutral-100 flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2 tabular-nums">
                <span className="text-base sm:text-lg font-extrabold text-neutral-950">
                  {formattedPrice}
                </span>
                {formattedComparePrice ? (
                  <span className="text-xs sm:text-sm text-neutral-400 line-through">
                    {formattedComparePrice}
                  </span>
                ) : null}
              </div>
              {savingsAmount && savingsAmount > 0 ? (
                <span className="text-[11px] font-bold text-rose-600 tabular-nums">
                  {prefersArabicCopy ? `وفّر ${formattedSavings}` : `Save ${formattedSavings}`}
                </span>
              ) : null}
            </div>

            {/* Action Buttons: Unified High-Converting Cockpit */}
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleAddToCart}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-950 py-2.5 px-3 text-xs sm:text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-neutral-800 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-rose-500"
                title={actionLabel}
                aria-label={actionLabel}
              >
                <ShoppingCart size={15} className="text-neutral-300" />
                <span>
                  {hasVariantChoices
                    ? (prefersArabicCopy ? 'تحديد السيارة والطلب' : 'Select Car & Order')
                    : (prefersArabicCopy ? 'أضف للسلة' : 'Add to Cart')}
                </span>
              </button>

              <button
                onClick={handleQuickBuy}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-700 transition-all duration-200 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-rose-500"
                title={prefersArabicCopy ? 'طلب سريع فوري' : 'Instant Checkout'}
                aria-label={prefersArabicCopy ? 'طلب سريع فوري' : 'Instant Checkout'}
              >
                <Zap size={16} />
              </button>
            </div>
          </div>
        </CardShell>

        <QuickViewModal
          product={product}
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          currency={currency}
          addToCartLabel={storefrontSettings?.['addToCartLabel']}
          viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
        />
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <CardShell
          className={`group flex h-full flex-col overflow-hidden transition-all duration-300 ${
            isDistrictMarket
              ? 'rounded-[1.3rem] border border-[#ecdcd0] bg-[linear-gradient(180deg,#fffdfa,#fff8f2)] shadow-[0_22px_54px_-40px_rgba(58,34,23,0.28)] hover:-translate-y-1 hover:shadow-[0_30px_72px_-38px_rgba(58,34,23,0.34)]'
              : 'rounded-[1.1rem] border border-border/80 bg-card/95 shadow-sm hover:-translate-y-1 hover:shadow-lg'
          }`}
        >
          <div className={isDistrictMarket ? 'px-3 pt-3' : ''}>
            <div
              className={`relative overflow-hidden ${
                isDistrictMarket
                  ? 'aspect-[4/4.05] rounded-[1rem] border border-[#ead9cc] bg-[linear-gradient(180deg,#fffbf7,#f3e6d9)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]'
                  : 'bg-muted'
              } ${isDistrictMarket ? '' : 'aspect-[4/4.6]'} `}
            >
              <StorefrontProductImage
                candidates={imageCandidates}
                alt={name}
                loading={resolvedImageLoading}
                fetchpriority={resolvedImageFetchPriority}
                requestedWidth={560}
                responsiveWidths={[240, 320, 480, 640]}
                responsiveSizes="(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 20vw"
                imageQuality={72}
                width="320"
                height="360"
                className={`h-full w-full transition-transform duration-500 group-hover:scale-[1.04] ${
                  isDistrictMarket
                    ? 'object-cover'
                    : 'object-cover'
                }`}
                fallback={renderImageFallback()}
              />
              {isDistrictMarket ? (
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(66,42,30,0.08))]" />
              ) : null}
              <div className="absolute start-3 top-3 flex flex-wrap gap-2">
                <DiscountBadge />
                {isZenOrganic && !discountPercentage ? (
                  <span className="inline-flex rounded-full bg-[#1a3328] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                    جديد
                  </span>
                ) : null}
              </div>
              {!isDistrictMarket ? <FloatingIcons /> : null}
            </div>
          </div>

          <div className={`flex flex-1 flex-col gap-3 ${isDistrictMarket ? 'p-4 pt-3.5' : 'p-3.5'}`}>
            <div className="space-y-1.5">
              <span
                className={`inline-flex text-[11px] font-bold uppercase tracking-[0.18em] ${
                  isDistrictMarket ? 'text-[#8c6956]' : 'text-muted-foreground'
                }`}
              >
                {categoryLabel}
              </span>
              <h3 className="line-clamp-2 text-sm font-bold leading-6 text-foreground">
                {name}
              </h3>
              <div dir="ltr" className="flex items-center gap-2 font-sans text-sm">
                <p className="font-bold text-primary">{formattedPrice}</p>
                {formattedComparePrice ? (
                  <p className="text-xs text-muted-foreground line-through">{formattedComparePrice}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-auto flex items-center gap-2">
              <button
                onClick={handleAddToCart}
                className={`inline-flex flex-1 items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold transition-colors ${
                  isDistrictMarket
                    ? 'rounded-[1rem] bg-[linear-gradient(135deg,#ee742f,#d95d1c)] text-white shadow-[0_18px_44px_-28px_rgba(217,93,28,0.62)] hover:brightness-105'
                    : 'rounded-[0.9rem] bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                <ShoppingCart size={15} />
                {actionLabel}
              </button>
              {features.quickViewEnabled && !isDistrictMarket ? (
                <button
                  onClick={handleQuickView}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-border bg-background text-foreground transition-colors hover:border-primary hover:text-primary"
                  title={finalQuickViewLabel}
                  aria-label={finalQuickViewLabel}
                >
                  <Eye size={16} />
                </button>
              ) : null}
            </div>
          </div>
        </CardShell>
        <QuickViewModal 
          product={product} 
          isOpen={isQuickViewOpen} 
          onClose={() => setIsQuickViewOpen(false)} 
          currency={currency}
          addToCartLabel={storefrontSettings?.['addToCartLabel']}
          viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
        />
      </>
    );
  }

  if (variant === 'luxury') {
    return (
      <>
        <CardShell
          className={`group flex h-full flex-col overflow-hidden rounded-[1.35rem] border bg-card transition-all duration-500 hover:-translate-y-1.5 ${
            isFakhama
              ? 'border-primary/15 shadow-[0_22px_60px_-38px_rgba(0,0,0,0.35)] hover:shadow-[0_30px_70px_-34px_rgba(0,0,0,0.4)]'
              : 'border-border shadow-[0_18px_55px_-40px_rgba(0,0,0,0.28)] hover:shadow-[0_24px_64px_-36px_rgba(0,0,0,0.34)]'
          }`}
        >
          <div className="relative overflow-hidden bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)))] p-3">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1rem] border border-white/40 bg-muted">
              <StorefrontProductImage
                candidates={imageCandidates}
                alt={name}
                loading="lazy"
                width="420"
                height="520"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                fallback={renderImageFallback()}
              />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                <span className="inline-flex rounded-full border border-white/40 bg-background/85 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-foreground backdrop-blur">
                  {luxuryTopBadge}
                </span>
                <DiscountBadge />
              </div>
              <FloatingIcons forceVisible={isHovered} />
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-4 p-5 pt-4">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                  {categoryLabel}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                  <Sparkles size={12} /> {luxuryAssistLabel}
                </span>
              </div>
              <h3 className="line-clamp-2 font-heading text-lg font-black leading-7 text-foreground">
                {name}
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                {luxurySummary}
              </p>
            </div>

            <div className="flex items-end justify-between gap-4 border-t border-border/80 pt-4">
              <div dir="ltr" className="space-y-1 font-sans">
                <p className="text-lg font-black text-primary">{formattedPrice}</p>
                {formattedComparePrice ? (
                  <p className="text-xs text-muted-foreground line-through">{formattedComparePrice}</p>
                ) : null}
              </div>
              <button
                onClick={handleAddToCart}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/92"
              >
                <ShoppingCart size={16} />
                {actionLabel}
              </button>
            </div>
          </div>
        </CardShell>
        <QuickViewModal 
          product={product} 
          isOpen={isQuickViewOpen} 
          onClose={() => setIsQuickViewOpen(false)} 
          currency={currency}
          addToCartLabel={storefrontSettings?.['addToCartLabel']}
          viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
        />
      </>
    );
  }

  if (variant === 'editorial') {
    return (
      <>
        <CardShell
          className={`group grid h-full overflow-hidden rounded-[1.5rem] border md:grid-cols-[1.15fr_0.85fr] ${
            isAirlume
              ? 'border-primary/10 bg-[linear-gradient(145deg,hsl(var(--background))_0%,hsl(var(--secondary)/0.22)_100%)] shadow-[0_28px_90px_-56px_hsl(var(--primary)/0.58)] transition-all duration-500 hover:-translate-y-1'
              : 'border-border bg-card'
          }`}
        >
          <div className={`relative min-h-[280px] overflow-hidden ${isAirlume ? 'bg-[radial-gradient(circle_at_top,hsl(var(--background)),hsl(var(--secondary))_78%)]' : 'bg-muted'}`}>
            <StorefrontProductImage
              candidates={imageCandidates}
              alt={name}
              loading="lazy"
              width="520"
              height="620"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              fallback={renderImageFallback()}
            />
            <div className={`absolute inset-0 ${isAirlume ? 'bg-[linear-gradient(180deg,rgba(15,23,42,0.03)_0%,rgba(15,23,42,0.18)_42%,rgba(15,23,42,0.52)_100%)]' : 'bg-gradient-to-t from-black/20 via-transparent to-transparent'}`} />
            <div className="absolute start-4 top-4 flex flex-wrap gap-2">
              <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] backdrop-blur ${isAirlume ? 'border border-white/60 bg-white/88 text-slate-950 shadow-sm' : 'bg-white/90 text-foreground'}`}>
                {isAirlume ? 'Airlume Edit' : featuredBadgeLabel}
              </span>
              <DiscountBadge />
            </div>
            <FloatingIcons />
          </div>

          <div className={`flex flex-col justify-between gap-5 p-5 md:p-6 ${isAirlume ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.55),rgba(255,255,255,0.86))]' : ''}`}>
            <div className="space-y-3">
              <span className="inline-flex text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                {editorialEyebrow}
              </span>
              <h3 className="line-clamp-3 font-heading text-2xl font-black leading-tight text-foreground">
                {name}
              </h3>
              <p className="text-sm leading-7 text-muted-foreground">
                {shopperSummary}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted-foreground">
                <span className={`rounded-full px-3 py-1 ${isAirlume ? 'border border-primary/10 bg-white/90 text-foreground shadow-sm' : 'bg-secondary'}`}>{categoryLabel}</span>
                {hasVariantChoices ? <span className={`rounded-full px-3 py-1 ${isAirlume ? 'border border-primary/10 bg-white/90 text-foreground shadow-sm' : 'bg-secondary'}`}>{isAirlume || isRtl ? 'خيارات متاحة' : 'Options available'}</span> : null}
              </div>
            </div>

            <div className="space-y-4">
              <div dir="ltr" className="flex items-end gap-3 font-sans">
                <p className="text-2xl font-black text-primary">{formattedPrice}</p>
                {formattedComparePrice ? (
                  <p className="pb-1 text-sm text-muted-foreground line-through">{formattedComparePrice}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleAddToCart}
                  className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-colors ${
                    isAirlume
                      ? 'bg-[linear-gradient(135deg,#0f172a_0%,hsl(var(--primary))_55%,#60a5fa_100%)] text-white shadow-[0_24px_70px_-36px_hsl(var(--primary)/0.65)] hover:opacity-95'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  <ShoppingCart size={16} />
                  {actionLabel}
                </button>
                <button
                  onClick={handleQuickView}
                  className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-colors ${
                    isAirlume
                      ? 'border border-primary/12 bg-white/88 text-foreground shadow-sm hover:border-primary/30 hover:text-primary'
                      : 'border border-border text-foreground hover:border-primary hover:text-primary'
                  }`}
                >
                  <ArrowUpRight size={16} />
                  {detailLabel}
                </button>
              </div>
            </div>
          </div>
        </CardShell>
        <QuickViewModal 
          product={product} 
          isOpen={isQuickViewOpen} 
          onClose={() => setIsQuickViewOpen(false)} 
          currency={currency}
          addToCartLabel={storefrontSettings?.['addToCartLabel']}
          viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
        />
      </>
    );
  }

  if (variant === 'butcher-black-label') {
    const butcherWeightOptions = Array.from(
      new Set(
        (product.productVariants || [])
          .map((v) =>
            String(
              v.attributes?.['الوزن'] ||
                v.attributes?.weight ||
                v.attributes?.Weight ||
                v.name ||
                '',
            ).trim(),
          )
          .filter(Boolean),
      ),
    ).slice(0, 3);
    const butcherCutType =
      typeof product.category?.name === 'string' && product.category.name.trim()
        ? product.category.name.trim()
        : 'Prime Cut';
    const butcherCookingMethod = hasDiscount ? 'Grilled' : hasVariantChoices ? 'Slow Cook' : 'Versatile';
    const butcherFreshBadge = prefersArabicCopy ? 'طازج يومياً' : 'DAILY FRESH';

    return (
      <>
        <CardShell
          className="group flex h-full flex-col overflow-hidden border border-[#3f0c0d]/20 bg-[#3f0c0d] transition-all duration-700 hover:-translate-y-1 hover:border-[#c5a059]/40 hover:shadow-[0_40px_100px_-40px_rgba(63,12,13,0.6)]"
          style={{ borderRadius: '1.5rem' }}
        >
          {/* Image */}
          <div className="relative aspect-[4/5] overflow-hidden bg-[#1a0506]">
            <StorefrontProductImage
              candidates={imageCandidates}
              alt={name}
              loading={resolvedImageLoading}
              fetchpriority={resolvedImageFetchPriority}
              requestedWidth={560}
              responsiveWidths={[240, 320, 480, 640]}
              responsiveSizes="(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 25vw"
              imageQuality={85}
              width="400"
              height="500"
              className="h-full w-full object-cover opacity-90 transition-all duration-1000 group-hover:scale-105 group-hover:opacity-100"
              fallback={renderImageFallback('bg-[#2a0809]')}
            />
            {/* Gradient Overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#3f0c0d] via-transparent to-transparent opacity-60" />

            {/* Badges */}
            <div className="absolute left-3 top-3 flex flex-wrap gap-2">
              <span className="rounded-sm bg-[#c5a059] px-2 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#3f0c0d] shadow-lg">
                {butcherFreshBadge}
              </span>
            </div>

            <div className="absolute right-3 top-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/40 text-[#c5a059] backdrop-blur-md">
                 <Sparkles size={14} />
              </div>
            </div>

            {/* Price Floating */}
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
               <div className="space-y-1">
                 <p className="text-xl font-black text-[#c5a059]">{formattedPrice}</p>
                 {formattedComparePrice && (
                   <p className="text-xs text-white/40 line-through">{formattedComparePrice}</p>
                 )}
               </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="flex flex-1 flex-col gap-4 p-5">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059]/60">
                {butcherCutType}
              </span>
              <h3 className="font-heading text-lg font-black leading-tight text-white group-hover:text-[#c5a059] transition-colors">
                {name}
              </h3>
            </div>

            <div className="flex flex-wrap gap-2">
               {butcherWeightOptions.map(w => (
                 <span key={w} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-bold text-white/60">
                   {w}
                 </span>
               ))}
            </div>

            {/* CTA Button */}
            <div className="pt-2">
              <button
                onClick={handleAddToCart}
                className="group/btn relative h-12 w-full overflow-hidden rounded-xl border border-[#c5a059]/30 bg-transparent text-[10px] font-black uppercase tracking-[0.25em] text-[#c5a059] transition-all hover:bg-[#c5a059] hover:text-[#3f0c0d]"
              >
                <span className="relative z-10">{actionLabel}</span>
                <div className="absolute inset-0 -translate-x-full bg-white/10 transition-transform group-hover/btn:translate-x-0" />
              </button>
            </div>
          </div>
        </CardShell>

        <QuickViewModal
          product={product}
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          currency={currency}
          addToCartLabel={storefrontSettings?.['addToCartLabel']}
          viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
        />
      </>
    );
  }

  if (variant === 'glass') {
    return (
      <>
        <CardShell className="group relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-white/20 bg-white/10 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.45)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-white/35 hover:bg-white/15">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.04))]" />
          <div className="relative aspect-[4/4.7] overflow-hidden border-b border-white/15 bg-white/10">
            <StorefrontProductImage
              candidates={imageCandidates}
              alt={name}
              loading="lazy"
              width="360"
              height="420"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              fallback={renderImageFallback()}
            />
            <div className="absolute start-3 top-3 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full border border-white/35 bg-white/20 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-white backdrop-blur">
                {featuredBadgeLabel}
              </span>
              <DiscountBadge className="border border-white/20 bg-white/85 text-slate-900" />
            </div>
            <FloatingIcons forceVisible={isHovered} />
          </div>

          <div className="relative flex flex-1 flex-col gap-3 p-4 text-foreground">
            <div className="space-y-2">
              <span className="inline-flex text-[11px] font-bold uppercase tracking-[0.22em] text-foreground/65">
                {categoryLabel}
              </span>
              <h3 className="line-clamp-2 font-heading text-lg font-black leading-7 text-foreground">
                {name}
              </h3>
              <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                {shopperSummary}
              </p>
            </div>

            <div className="mt-auto flex items-end justify-between gap-3">
              <div dir="ltr" className="space-y-1 font-sans">
                <p className="text-lg font-black text-foreground">{formattedPrice}</p>
                {formattedComparePrice ? (
                  <p className="text-xs text-muted-foreground line-through">{formattedComparePrice}</p>
                ) : null}
              </div>
              <button
                onClick={handleAddToCart}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/85 px-4 py-2.5 text-sm font-bold text-slate-900 transition-all hover:bg-white"
              >
                <ShoppingCart size={16} />
                {actionLabel}
              </button>
            </div>
          </div>
        </CardShell>
        <QuickViewModal 
          product={product} 
          isOpen={isQuickViewOpen} 
          onClose={() => setIsQuickViewOpen(false)} 
          currency={currency}
          addToCartLabel={storefrontSettings?.['addToCartLabel']}
          viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
        />
      </>
    );
  }

  if (variant === 'list') {
    return (
      <>
        <CardShell className="group grid h-full overflow-hidden rounded-[1.2rem] border border-border bg-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="relative h-full min-h-[220px] overflow-hidden bg-muted">
            <StorefrontProductImage
              candidates={imageCandidates}
              alt={name}
              loading="lazy"
              width="320"
              height="320"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              fallback={renderImageFallback()}
            />
            <div className="absolute start-3 top-3 flex flex-wrap gap-2">
              <DiscountBadge />
            </div>
          </div>

          <div className="flex flex-col gap-4 p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <span className="inline-flex text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {categoryLabel}
                </span>
                <h3 className="line-clamp-2 font-heading text-xl font-black leading-tight text-foreground">
                  {name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {features.wishlistEnabled ? (
                  <button
                    onClick={handleWishlist}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                      isWishlisted
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-foreground hover:border-primary hover:text-primary'
                    }`}
                    title={finalWishlistLabel}
                    aria-label={finalWishlistLabel}
                  >
                    <Heart size={16} className={isWishlisted ? "fill-current" : ""} />
                  </button>
                ) : null}
                {features.quickViewEnabled ? (
                  <button
                    onClick={handleQuickView}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-primary hover:text-primary"
                    title={finalQuickViewLabel}
                    aria-label={finalQuickViewLabel}
                  >
                    <Eye size={16} />
                  </button>
                ) : null}
              </div>
            </div>

            <p className="text-sm leading-7 text-muted-foreground">
              {listSummary}
            </p>

            <div className="mt-auto flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div dir="ltr" className="space-y-1 font-sans">
                <p className="text-xl font-black text-primary">{formattedPrice}</p>
                {formattedComparePrice ? (
                  <p className="text-sm text-muted-foreground line-through">{formattedComparePrice}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleAddToCart}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <ShoppingCart size={16} />
                  {actionLabel}
                </button>
                <button
                  onClick={handleQuickView}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-bold text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Eye size={16} />
                  {detailLabel}
                </button>
              </div>
            </div>
          </div>
        </CardShell>
        <QuickViewModal 
          product={product} 
          isOpen={isQuickViewOpen} 
          onClose={() => setIsQuickViewOpen(false)} 
          currency={currency}
          addToCartLabel={storefrontSettings?.['addToCartLabel']}
          viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
        />
      </>
    );
  }

  if (variant === 'playful') {
    return (
      <>
        <CardShell className="group relative flex h-full flex-col overflow-hidden rounded-[2.5rem] border-4 border-white bg-white/80 p-4 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-rotate-2 hover:scale-105 hover:shadow-2xl dark:border-slate-800 dark:bg-slate-900/80">
          <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-secondary/30">
            <StorefrontProductImage
              candidates={imageCandidates}
              alt={name}
              loading="lazy"
              width="400"
              height="400"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              fallback={renderImageFallback()}
            />
            <div className="absolute start-3 top-3 flex flex-wrap gap-2 z-20">
              <DiscountBadge className="rounded-2xl border-2 border-white shadow-md bg-yellow-400 text-black font-black" />
            </div>
            
            {/* Sticker Decorations */}
            <div className="absolute -top-1 -right-1 z-20 h-12 w-12 rotate-12 drop-shadow-md">
              <svg viewBox="0 0 100 100" className="h-full w-full fill-pink-400">
                <path d="M50 0 L61 35 L98 35 L68 57 L79 91 L50 70 L21 91 L32 57 L2 35 L39 35 Z" />
              </svg>
            </div>
            <div className="absolute -bottom-2 -left-2 z-20 h-10 w-10 -rotate-12 drop-shadow-md">
              <svg viewBox="0 0 100 100" className="h-full w-full fill-sky-400">
                <circle cx="50" cy="50" r="45" />
                <path d="M30 65 Q50 85 70 65" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" />
                <circle cx="35" cy="40" r="5" fill="white" />
                <circle cx="65" cy="40" r="5" fill="white" />
              </svg>
            </div>

            <FloatingIcons />
          </div>

          <div className="flex flex-1 flex-col items-center gap-3 p-4 text-center">
            <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
              {categoryLabel}
            </span>
            <h3 className="line-clamp-2 font-heading text-lg font-black leading-tight text-foreground">
              {name}
            </h3>
            <div dir="ltr" className="flex items-center gap-2 font-sans">
              <p className="text-xl font-black text-primary">{formattedPrice}</p>
              {formattedComparePrice ? (
                <p className="text-sm text-muted-foreground line-through opacity-50">{formattedComparePrice}</p>
              ) : null}
            </div>
            <button
              onClick={handleAddToCart}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-black text-primary-foreground shadow-lg transition-all hover:bg-primary/90 active:scale-95"
            >
              <Plus size={18} />
              {actionLabel}
            </button>
          </div>
        </CardShell>
        <QuickViewModal 
          product={product} 
          isOpen={isQuickViewOpen} 
          onClose={() => setIsQuickViewOpen(false)} 
          currency={currency}
          addToCartLabel={storefrontSettings?.['addToCartLabel']}
          viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
        />
      </>
    );
  }

  if (variant === 'retail-air') {
    return (
      <>
        <CardShell className="group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-[#e8ebf0] bg-white p-3 text-card-foreground shadow-[0_18px_42px_-28px_rgba(15,23,42,0.14)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_54px_-28px_rgba(15,23,42,0.18)] sm:rounded-[1.55rem] sm:p-4">
          <div className="absolute end-3 top-3 z-20 sm:end-4 sm:top-4">
            {features.wishlistEnabled ? (
              <button
                onClick={handleWishlist}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#dbe1ea] bg-white text-[#6b7280] shadow-sm transition-all hover:scale-105 hover:border-[#f59e0b] hover:text-[#ef4444] sm:h-9 sm:w-9 ${
                  isWishlisted ? 'border-[#ef4444] bg-[#fff1f2] text-[#ef4444]' : ''
                }`}
                title={finalWishlistLabel}
                aria-label={finalWishlistLabel}
              >
                <Heart size={16} className={isWishlisted ? 'fill-current' : ''} />
              </button>
            ) : null}
          </div>

          <div className="mb-3 rounded-[1rem] bg-[#f6f7fb] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:mb-4 sm:rounded-[1.2rem] sm:p-4">
            <div className="relative aspect-square overflow-hidden rounded-[0.95rem] sm:rounded-[1rem]">
              <StorefrontProductImage
                candidates={imageCandidates}
                alt={name}
                loading="lazy"
                width="400"
                height="400"
                className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-[1.04] sm:p-3"
                fallback={renderImageFallback('rounded-[1rem] bg-[#eef2f7]')}
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col">
            <span className="mb-1.5 text-[10px] font-medium text-[#6b7280] sm:mb-2 sm:text-[11px]">
              {categoryLabel}
            </span>
            <h3 className="line-clamp-2 text-[0.94rem] font-medium leading-6 text-[#111827] sm:text-[1.02rem] sm:leading-7">
              {name}
            </h3>

            {ratingValue || reviewCount ? (
              <div className="mt-2.5 flex items-center gap-1 text-xs sm:mt-3 sm:text-sm">
                <div className="flex items-center gap-0.5 text-[#f59e0b]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={`star-${index}`}
                      size={12}
                      fill={ratingValue && index < Math.round(ratingValue) ? 'currentColor' : 'none'}
                    />
                  ))}
                </div>
                {reviewCount ? (
                  <span className="font-sans text-[11px] text-[#6b7280] sm:text-xs">
                    {isRtl
                      ? `${reviewCount.toLocaleString('en-US')} تقييم`
                      : `${reviewCount.toLocaleString('en-US')} reviews`}
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="mt-auto flex items-end justify-between gap-2.5 pt-4 sm:gap-3 sm:pt-5">
              <div dir="ltr" className="space-y-1 font-sans">
                <p className="text-[1.15rem] font-semibold tracking-[-0.03em] text-[#111827] sm:text-[1.55rem]">
                  {formattedPrice}
                </p>
                {formattedComparePrice ? (
                  <p className="text-xs font-light text-[#9ca3af] line-through sm:text-sm">
                    {formattedComparePrice}
                  </p>
                ) : null}
              </div>

              <button
                onClick={handleAddToCart}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#facc15] text-[#111827] shadow-[0_16px_30px_-18px_rgba(250,204,21,0.75)] transition-all hover:scale-105 hover:bg-[#f5c000] sm:h-11 sm:w-11"
                title={actionLabel}
                aria-label={actionLabel}
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        </CardShell>

        <QuickViewModal
          product={product}
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          currency={currency}
          addToCartLabel={storefrontSettings?.['addToCartLabel']}
          viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
        />
      </>
    );
  }

  if (variant === 'retail-direct') {
    return (
      <>
        <CardShell
          className="group relative flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-[#121212] bg-[#fffdf8] p-3 text-card-foreground shadow-[0_20px_44px_-30px_rgba(18,18,18,0.22)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_58px_-28px_rgba(18,18,18,0.26)] sm:rounded-[1.45rem] sm:p-4"
        >
          <div className="absolute end-3 top-3 z-20">
            {features.wishlistEnabled ? (
              <button
                onClick={handleWishlist}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#1f1f1f] bg-white text-[#1f1f1f] shadow-sm transition-all hover:scale-105 hover:bg-[#fff1e5] hover:text-[#c15d12] ${
                  isWishlisted ? 'border-[#c15d12] bg-[#fff1e5] text-[#c15d12]' : ''
                }`}
                title={finalWishlistLabel}
                aria-label={finalWishlistLabel}
              >
                <Heart size={15} className={isWishlisted ? 'fill-current' : ''} />
              </button>
            ) : null}
          </div>

          <div className="mb-3 overflow-hidden rounded-[1rem] border border-[#121212] bg-white">
            <div
              className="relative aspect-square overflow-hidden bg-[#f7f0e6]"
            >
              <StorefrontProductImage
                candidates={imageCandidates}
                alt={name}
                loading={resolvedImageLoading}
                fetchpriority={resolvedImageFetchPriority}
                width="400"
                height="400"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                fallback={renderImageFallback('rounded-[1rem] bg-[#f3eadf]')}
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-2">
            <span className="text-[11px] font-semibold text-[#73573e]">
              {categoryLabel}
            </span>
            <h3 className="line-clamp-2 font-heading text-[1rem] font-black leading-6 text-[#171717]">
              {name}
            </h3>

            {(ratingValue || reviewCount) ? (
              <div className="flex items-center gap-1 text-xs">
                <div className="flex items-center gap-0.5 text-[#f59e0b]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={`retail-direct-star-${index}`}
                      size={12}
                      fill={ratingValue && index < Math.round(ratingValue) ? 'currentColor' : 'none'}
                    />
                  ))}
                </div>
                {reviewCount ? (
                  <span className="font-sans text-[11px] text-[#5f5a54]">
                    {isRtl
                      ? `${reviewCount.toLocaleString('en-US')} تقييم`
                      : `${reviewCount.toLocaleString('en-US')} reviews`}
                  </span>
                ) : null}
              </div>
            ) : null}

            <div dir="ltr" className="mt-auto flex items-center gap-2 font-sans">
              <div className="space-y-1">
                <p className="text-[1.2rem] font-black tracking-[-0.03em] text-[#121212]">
                  {formattedPrice}
                </p>
                {formattedComparePrice ? (
                  <p className="text-xs text-[#6d655f] line-through">
                    {formattedComparePrice}
                  </p>
                ) : null}
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              className="mt-2 inline-flex min-h-[42px] w-full items-center justify-center rounded-full border border-[#121212] bg-[#121212] px-4 py-2 text-sm font-black text-white transition-colors hover:bg-[#2a2a2a]"
            >
              {actionLabel}
            </button>
          </div>
        </CardShell>

        <QuickViewModal
          product={product}
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          currency={currency}
          addToCartLabel={storefrontSettings?.['addToCartLabel']}
          viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
        />
      </>
    );
  }

  if (variant === 'fastly-offer') {
    const displayNumericPrice = Number.isFinite(numericPrice)
      ? numericPrice.toLocaleString('en-US')
      : formattedPrice;

    return (
      <>
        <CardShell className="group relative flex h-full flex-col overflow-hidden rounded-[0.55rem] border-2 border-[#111111] bg-white text-card-foreground shadow-none transition-all duration-200 hover:-translate-y-0.5">
          <div className="relative border-b-2 border-[#111111] bg-white p-2.5">
            {features.wishlistEnabled && !isFastlyTheme ? (
              <button
                onClick={handleWishlist}
                className={`absolute end-2.5 top-2.5 z-20 inline-flex h-9 w-9 items-center justify-center rounded-[0.45rem] border-2 border-[#111111] bg-white text-[#111111] transition-colors hover:bg-[#111111] hover:text-white ${
                  isWishlisted ? 'bg-[#111111] text-white' : ''
                }`}
                title={finalWishlistLabel}
                aria-label={finalWishlistLabel}
              >
                <Heart size={15} className={isWishlisted ? 'fill-current' : ''} />
              </button>
            ) : null}

            <div className="aspect-square overflow-hidden bg-white">
              <StorefrontProductImage
                candidates={imageCandidates}
                alt={name}
                loading={resolvedImageLoading}
                fetchpriority={resolvedImageFetchPriority}
                width="400"
                height="400"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                fallback={renderImageFallback('bg-[#f5f5f5]')}
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 p-3">
            <h3 className="line-clamp-3 min-h-[4.5rem] font-body text-[0.95rem] font-bold leading-6 text-[#111111]">
              {name}
            </h3>

            <p dir="ltr" className="mt-auto font-sans text-[1.45rem] font-black leading-none text-[#cf1620]">
              {displayNumericPrice}
            </p>

            {isFastlyTheme ? (
              <div className="flex items-center gap-2">
                {features.wishlistEnabled ? (
                  <button
                    onClick={handleWishlist}
                    className={`inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[0.45rem] border-2 border-[#111111] bg-white text-[#111111] transition-colors hover:bg-[#111111] hover:text-white ${
                      isWishlisted ? "bg-[#111111] text-white" : ""
                    }`}
                    title={finalWishlistLabel}
                    aria-label={finalWishlistLabel}
                  >
                    <Heart size={15} className={isWishlisted ? "fill-current" : ""} />
                  </button>
                ) : null}
                <button
                  onClick={handleAddToCart}
                  className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-[0.45rem] border-2 border-[#111111] bg-white px-4 py-2 text-sm font-bold text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
                  title={actionLabel}
                  aria-label={actionLabel}
                >
                  <span>{actionLabel}</span>
                  <ShoppingCart size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                className="inline-flex min-h-[42px] w-full items-center justify-center rounded-[0.45rem] border-2 border-[#111111] bg-white px-4 py-2 text-sm font-bold text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
              >
                {actionLabel}
              </button>
            )}
          </div>
        </CardShell>

        <QuickViewModal
          product={product}
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          currency={currency}
          addToCartLabel={storefrontSettings?.['addToCartLabel']}
          viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
        />
      </>
    );
  }

  if (variant === 'pastel-fashion') {
    return (
      <>
        <CardShell className="group relative flex h-full flex-col overflow-hidden rounded-[1.15rem] border border-[#ead8d0] bg-white p-3 text-card-foreground shadow-[0_18px_40px_-34px_rgba(86,58,58,0.16)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_56px_-34px_rgba(86,58,58,0.22)]">
          <div className="absolute start-3 top-3 z-20 flex items-center gap-2">
            {discountPercentage ? (
              <span className="inline-flex min-w-[2.2rem] items-center justify-center rounded-full bg-[#ef6d5b] px-2.5 py-1 text-[10px] font-black text-white shadow-[0_14px_28px_-20px_rgba(239,109,91,0.62)]">
                %{discountPercentage}
              </span>
            ) : null}
          </div>

          <div
            className={`relative overflow-hidden rounded-[1rem] border border-[#efe2dc] ${
              isVelaAccessoryDrivenCard ? 'bg-[#fff8f4]' : 'bg-[#f8ede8]'
            }`}
          >
            {!isVelaFashion ? (
              <div className="absolute inset-y-3 end-3 z-20 flex flex-col gap-2">
                {features.quickViewEnabled ? (
                  <button
                    onClick={handleQuickView}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/92 text-[#2f232d] shadow-[0_12px_24px_-18px_rgba(47,35,45,0.24)] transition-colors hover:text-[#ef6d5b]"
                    title={finalQuickViewLabel}
                    aria-label={finalQuickViewLabel}
                  >
                    <Eye size={14} />
                  </button>
                ) : null}
                <button
                  onClick={handleAddToCart}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#2f232d] text-white shadow-[0_12px_24px_-18px_rgba(47,35,45,0.34)] transition-colors hover:bg-[#4b363f]"
                  title={actionLabel}
                  aria-label={actionLabel}
                >
                  <ShoppingCart size={14} />
                </button>
                {features.wishlistEnabled ? (
                  <button
                    onClick={handleWishlist}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/92 text-[#6f5a60] shadow-[0_12px_24px_-18px_rgba(86,58,58,0.22)] transition-colors hover:text-[#ef6d5b] ${
                      isWishlisted ? 'text-[#ef6d5b]' : ''
                    }`}
                    title={finalWishlistLabel}
                    aria-label={finalWishlistLabel}
                  >
                    <Heart size={14} className={isWishlisted ? 'fill-current' : ''} />
                  </button>
                ) : null}
              </div>
            ) : null}

            <div
              className={`relative aspect-[4/5] overflow-hidden ${
                isVelaAccessoryDrivenCard ? 'p-4' : 'p-3'
              }`}
            >
              <StorefrontProductImage
                candidates={imageCandidates}
                alt={name}
                loading={resolvedImageLoading}
                fetchpriority={resolvedImageFetchPriority}
                width="420"
                height="520"
                className={`h-full w-full rounded-[0.85rem] transition-transform duration-500 group-hover:scale-[1.03] ${
                  isVelaAccessoryDrivenCard
                    ? 'object-contain bg-[#fff8f4] p-3'
                    : 'object-cover'
                }`}
                fallback={renderImageFallback(
                  `rounded-[0.85rem] ${
                    isVelaAccessoryDrivenCard ? 'bg-[#fff8f4]' : 'bg-[#f3e3dd]'
                  }`,
                )}
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 px-1 pb-1 pt-3">
            <span
              className={
                isVelaFashion
                  ? 'text-[11px] font-semibold text-[#8b6f72]'
                  : 'text-[10px] font-black uppercase tracking-[0.22em] text-[#a07b73]'
              }
            >
              {categoryLabel}
            </span>
            <h3 className="line-clamp-2 font-heading text-[1rem] font-black leading-6 text-[#2f232d]">
              {name}
            </h3>

            <div dir="ltr" className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-sans">
              <p className="text-[1.2rem] font-black tracking-[-0.03em] text-[#2f232d]">
                {formattedPrice}
              </p>
              {formattedComparePrice ? (
                <p className="text-xs font-bold text-[#8b7a7d] line-through">
                  {formattedComparePrice}
                </p>
              ) : null}
            </div>

            {carryColorOptions.length || carrySizeOptions.length ? (
              <div className="space-y-2.5">
                {carrySizeOptions.length ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {carrySizeOptions.slice(0, 4).map((sizeOption, index) => (
                      <span
                        key={`${sizeOption}-${index}`}
                        className="inline-flex min-w-[2rem] items-center justify-center rounded-full border border-[#e4d2cb] bg-[#fff8f4] px-2.5 py-1 text-[10px] font-black text-[#3d2a2f]"
                      >
                        {sizeOption}
                      </span>
                    ))}
                  </div>
                ) : null}

                {carryColorOptions.length ? (
                  <div className="flex items-center gap-1.5">
                    {carryColorOptions.slice(0, 4).map((option, index) => (
                      <span
                        key={`${option}-${index}`}
                        className="inline-flex h-4 w-4 rounded-full border border-white shadow-[0_0_0_1px_rgba(234,216,208,0.95)]"
                        style={{ backgroundColor: resolveNamedColorSwatch(option) }}
                        title={option}
                        aria-label={option}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <button
              onClick={handleAddToCart}
              className={
                isVelaFashion
                  ? 'mt-auto inline-flex min-h-[42px] w-full items-center justify-center rounded-full border border-[#171717] bg-[#171717] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2d2d2d]'
                  : 'mt-auto inline-flex min-h-[40px] w-full items-center justify-center rounded-full bg-[#2f232d] px-4 py-2 text-sm font-black text-white transition-colors hover:bg-[#45323d]'
              }
            >
              {actionLabel}
            </button>
          </div>
        </CardShell>

        <QuickViewModal
          product={product}
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          currency={currency}
          addToCartLabel={storefrontSettings?.['addToCartLabel']}
          viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
        />
      </>
    );
  }

  if (variant === 'plant-bare') {
    const sizeOptions = (product.productVariants || [])
      .map((productVariant) =>
        String(
          productVariant.attributes?.['الحجم'] ||
            productVariant.attributes?.['المقاس'] ||
            productVariant.attributes?.size ||
            productVariant.attributes?.Size ||
            productVariant.name ||
            '',
        ).trim(),
      )
      .filter(Boolean)
      .slice(0, 2);

    return (
      <>
        <CardShell
          className="group relative flex h-full flex-col items-stretch bg-transparent p-0 text-card-foreground transition-transform duration-300 hover:-translate-y-0.5"
          style={{ backgroundColor: 'transparent', boxShadow: 'none' }}
        >
          {discountPercentage ? (
            <span className="absolute start-0 top-0 z-20 inline-flex rounded-full bg-[#84b815] px-2.5 py-1 text-[10px] font-black text-white shadow-[0_12px_24px_-18px_rgba(118,178,13,0.72)]">
              -{discountPercentage}%
            </span>
          ) : null}

          {features.wishlistEnabled ? (
            <button
              onClick={handleWishlist}
              className={`absolute end-0 top-0 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#95a08f] shadow-[0_10px_24px_-18px_rgba(32,53,40,0.24)] transition-all hover:scale-105 hover:text-[#203528] ${
                isWishlisted ? 'text-[#e15b67]' : ''
              }`}
              title={finalWishlistLabel}
              aria-label={finalWishlistLabel}
            >
              <Heart size={15} className={isWishlisted ? 'fill-current' : ''} />
            </button>
          ) : null}

          <div className="mb-5 flex aspect-square items-center justify-center overflow-hidden bg-white">
            <StorefrontProductImage
              candidates={imageCandidates}
              alt={name}
              loading={resolvedImageLoading}
              fetchpriority={resolvedImageFetchPriority}
              width="520"
              height="520"
              className="h-full w-full object-contain p-4 transition-transform duration-700 group-hover:scale-[1.03]"
              fallback={renderImageFallback('bg-white')}
            />
          </div>

          <div className="flex flex-1 flex-col items-center text-center">
            <h3 className="line-clamp-2 font-heading text-[1.02rem] font-bold leading-7 text-[#203528]">
              {name}
            </h3>

            <div dir="ltr" className="mt-2 flex items-center gap-2 font-sans">
              {formattedComparePrice ? (
                <span className="text-sm text-[#adb4a8] line-through">
                  {formattedComparePrice}
                </span>
              ) : null}
              <span className="text-[1.05rem] font-bold text-[#203528]">
                {formattedPrice}
              </span>
            </div>

            {sizeOptions.length ? (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {sizeOptions.map((sizeOption, index) => (
                  <span
                    key={`${sizeOption}-${index}`}
                    className="inline-flex min-w-[2rem] items-center justify-center rounded-[0.35rem] border border-[#d7dfd2] px-2 py-1 text-[11px] font-medium text-[#73806f]"
                  >
                    {sizeOption}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-4 flex w-full items-center justify-between gap-3">
              <button
                onClick={handleAddToCart}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#7db40e] text-white shadow-[0_16px_28px_-18px_rgba(125,180,14,0.72)] transition-colors hover:bg-[#6ca10a]"
                title={actionLabel}
                aria-label={actionLabel}
              >
                <Plus size={16} />
              </button>
              <span className="text-[11px] font-medium tracking-[0.1em] text-[#9aa292]">
                {categoryLabel}
              </span>
            </div>
          </div>
        </CardShell>

        <QuickViewModal
          product={product}
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          currency={currency}
          addToCartLabel={storefrontSettings?.['addToCartLabel']}
          viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
        />
      </>
    );
  }

  if (variant === 'harvest-crate') {
    const harvestSizeOptions = Array.from(
      new Set(
        (product.productVariants || [])
          .map((productVariant) =>
            String(
              productVariant.attributes?.['الحجم'] ||
                productVariant.attributes?.['العبوة'] ||
                productVariant.attributes?.size ||
                productVariant.attributes?.Size ||
                productVariant.name ||
                '',
            ).trim(),
          )
          .filter(Boolean),
      ),
    ).slice(0, 2);
    const harvestTags = (Array.isArray(product.tags) ? product.tags : [])
      .map((tag) => String(tag || '').trim())
      .filter(Boolean)
      .slice(0, 2);
    const harvestSummary = productDescription
      ? truncateProductCopy(productDescription, 84)
      : hasVariantChoices
        ? isRtl
          ? 'اختر حجم الصندوق أو العبوة ثم أضف الطلب اليومي بسرعة.'
          : 'Choose the box or pack size, then add your recurring order quickly.'
        : hasDiscount && discountPercentage
          ? isRtl
            ? `وفر ${discountPercentage}% على اختيار طازج جاهز للدخول في السلة.`
            : `Save ${discountPercentage}% on a fresh pick ready for cart.`
          : isRtl
            ? 'اختيار يومي واضح السعر والحجم قبل فتح صفحة المنتج.'
            : 'A fresh daily pick with price and size clarity before opening the PDP.';

    return (
      <>
        <CardShell className="group relative flex h-full flex-col bg-transparent p-0 text-card-foreground transition-transform duration-300 hover:-translate-y-0.5">
          <div className="relative flex h-full flex-col overflow-hidden border border-[#e8dfd3] bg-white shadow-[0_20px_52px_-40px_rgba(45,59,39,0.12)] transition-shadow duration-300 group-hover:shadow-[0_28px_66px_-38px_rgba(45,59,39,0.18)]">
            {discountPercentage ? (
              <span className="absolute start-3 top-3 z-20 inline-flex items-center rounded-full bg-[#2d3b27] px-3 py-1 text-[10px] font-black tracking-[0.16em] text-white shadow-[0_14px_34px_-24px_rgba(45,59,39,0.56)]">
                -{discountPercentage}%
              </span>
            ) : null}

            {features.wishlistEnabled ? (
              <button
                onClick={handleWishlist}
                className={`absolute end-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e8dfd3] bg-white/96 text-[#7c766d] shadow-[0_14px_28px_-24px_rgba(45,59,39,0.16)] transition-colors hover:text-[#2d3b27] ${
                  isWishlisted ? 'text-[#d45463]' : ''
                }`}
                title={finalWishlistLabel}
                aria-label={finalWishlistLabel}
              >
                <Heart size={14} className={isWishlisted ? 'fill-current' : ''} />
              </button>
            ) : null}

            <div className="border-b border-[#efe6da] bg-[#fbf7f0] p-5">
              <div className="aspect-[4/4.1] overflow-hidden">
                <StorefrontProductImage
                  candidates={imageCandidates}
                  alt={name}
                  loading={resolvedImageLoading}
                  fetchpriority={resolvedImageFetchPriority}
                  width="520"
                  height="540"
                  className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-[1.03]"
                  fallback={renderImageFallback('bg-[#fbf7f0]')}
                />
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="space-y-2">
                <span className="inline-flex w-fit text-[10px] font-black uppercase tracking-[0.22em] text-[#8b7d6d]">
                  {categoryLabel}
                </span>
                <h3 className="line-clamp-2 font-heading text-[1.08rem] font-black leading-7 text-[#2d3b27]">
                  {name}
                </h3>
                <p className="line-clamp-2 text-sm leading-6 text-[#67705e]">
                  {harvestSummary}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {(harvestSizeOptions.length
                  ? harvestSizeOptions
                  : harvestTags.length
                    ? harvestTags
                    : [hasVariantChoices ? (isRtl ? 'عبوات متعددة' : 'Multiple packs') : isRtl ? 'جاهز للطلب' : 'Ready to order']
                ).map((item, index) => (
                  <span
                    key={`${item}-${index}`}
                    className="inline-flex items-center rounded-full border border-[#e8dfd3] bg-[#fffaf4] px-3 py-1 text-[11px] font-bold text-[#5f5a50]"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div dir="ltr" className="mt-auto flex items-center gap-2 font-sans">
                <span className="text-[1.05rem] font-black text-[#2d3b27]">
                  {formattedPrice}
                </span>
                {formattedComparePrice ? (
                  <span className="text-sm text-[#a79f94] line-through">
                    {formattedComparePrice}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleAddToCart}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-[#2d3b27] px-4 text-sm font-black text-white transition-colors hover:bg-[#202a1c]"
                  title={actionLabel}
                  aria-label={actionLabel}
                >
                  {actionLabel}
                </button>
                {features.quickViewEnabled ? (
                  <button
                    onClick={handleQuickView}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e8dfd3] bg-white text-[#6c5b49] transition-colors hover:border-[#d39c4d] hover:text-[#8c5d1e]"
                    title={finalQuickViewLabel}
                    aria-label={finalQuickViewLabel}
                  >
                    <Eye size={16} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </CardShell>

        <QuickViewModal
          product={product}
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          currency={currency}
          addToCartLabel={storefrontSettings?.['addToCartLabel']}
          viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
        />
      </>
    );
  }

  if (variant === 'butcher-black-label') {
    const cutOptions = Array.from(
      new Set(
        (product.productVariants || [])
          .map((productVariant) =>
            String(
              productVariant.attributes?.['الوزن'] ||
                productVariant.attributes?.['التقطيع'] ||
                productVariant.attributes?.['التجهيز'] ||
                productVariant.attributes?.weight ||
                productVariant.attributes?.cut ||
                productVariant.name ||
                '',
            ).trim(),
          )
          .filter(Boolean),
      ),
    ).slice(0, 3);
    const cutTags = (Array.isArray(product.tags) ? product.tags : [])
      .map((tag) => String(tag || '').trim())
      .filter(Boolean)
      .slice(0, 3);
    const blackLabelSummary = productDescription
      ? truncateProductCopy(productDescription, 96)
      : hasVariantChoices
        ? isRtl
          ? 'اختار الوزن أو القطعية، وسيتم تأكيد التجهيز قبل خروج الطلب.'
          : 'Choose the cut or weight, then confirm prep before dispatch.'
        : isRtl
          ? 'قطعية مختارة بتجهيز واضح وسعر ظاهر قبل صفحة المنتج.'
          : 'A selected cut with clear prep and visible pricing.';
    const specTags = cutOptions.length
      ? cutOptions
      : cutTags.length
        ? cutTags
        : [isRtl ? 'Black label' : 'Black label'];

    return (
      <>
        <article
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="group relative flex h-full flex-col bg-transparent p-0 text-card-foreground"
          style={productCardStyles()}
        >
          <div className="relative flex h-full flex-col overflow-hidden border border-[#37312c] bg-[#0b0908] text-[#f4ead8] shadow-[0_24px_70px_-52px_rgba(0,0,0,0.86)] transition duration-500 hover:border-[#8b6b3e] hover:shadow-[0_36px_90px_-58px_rgba(104,20,26,0.62)]">
            <div className="pointer-events-none absolute inset-0 opacity-[0.2] [background-image:linear-gradient(135deg,rgba(255,255,255,0.07)_0_1px,transparent_1px_18px),linear-gradient(90deg,rgba(139,107,62,0.08)_0_1px,transparent_1px_80px)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#b99154,transparent)]" />

            {discountPercentage ? (
              <span className="absolute start-0 top-0 z-20 border-b border-e border-[#b99154] bg-[#5f1118] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#fff1d4]">
                -{discountPercentage}%
              </span>
            ) : null}

            {features.wishlistEnabled ? (
              <button
                onClick={handleWishlist}
                className={`absolute end-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center border border-[#4a4138] bg-[#0b0908]/88 text-[#b5aa9b] backdrop-blur transition-colors hover:border-[#b99154] hover:text-[#f4ead8] ${
                  isWishlisted ? 'border-[#8f1d2b] text-[#d24858]' : ''
                }`}
                title={finalWishlistLabel}
                aria-label={finalWishlistLabel}
              >
                <Heart size={15} className={isWishlisted ? 'fill-current' : ''} />
              </button>
            ) : null}

            <Link
              to={productPath}
              onMouseEnter={handlePrefetch}
              onTouchStart={handlePrefetch}
              onClick={(event) => {
                if (shouldForceDocumentNavigation) {
                  event.preventDefault();
                  navigateStorefrontDocument(productPath);
                }
              }}
              className="relative block overflow-hidden border-b border-[#37312c] bg-[#15110f]"
            >
              <div className="aspect-[4/4.7] overflow-hidden">
                <StorefrontProductImage
                  candidates={imageCandidates}
                  alt={name}
                  loading={resolvedImageLoading}
                  fetchpriority={resolvedImageFetchPriority}
                  width="560"
                  height="660"
                  requestedWidth={640}
                  imageQuality={78}
                  preferOriginal
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.045] group-hover:grayscale-[8%]"
                  fallback={renderImageFallback('bg-[#15110f]')}
                />
              </div>
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,7,6,0.02)_0%,rgba(9,7,6,0.08)_45%,rgba(9,7,6,0.72)_100%)]" />
              <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3">
                <span className="max-w-[62%] border border-white/14 bg-black/35 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#d7b674] backdrop-blur">
                  {categoryLabel}
                </span>
                <span className="border border-[#b99154]/36 bg-[#0b0908]/84 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#f4ead8]">
                  Premium cut
                </span>
              </div>
            </Link>

            <div className="relative z-10 flex flex-1 flex-col gap-4 p-4 md:p-5">
              <div className="space-y-3">
                <Link
                  to={productPath}
                  onMouseEnter={handlePrefetch}
                  onTouchStart={handlePrefetch}
                  onClick={(event) => {
                    if (shouldForceDocumentNavigation) {
                      event.preventDefault();
                      navigateStorefrontDocument(productPath);
                    }
                  }}
                  className="block"
                >
                  <h3 className="line-clamp-2 font-heading text-[1.15rem] font-black leading-7 text-[#fff7e8] transition-colors group-hover:text-[#d7b674] md:text-[1.25rem]">
                    {name}
                  </h3>
                </Link>
                <p className="line-clamp-2 text-sm leading-6 text-[#b7ab9c]">
                  {blackLabelSummary}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {specTags.slice(0, 4).map((item, index) => (
                  <span
                    key={`${item}-${index}`}
                    className="min-h-[2.35rem] border border-[#37312c] bg-[#15110f] px-3 py-2 text-[11px] font-bold leading-4 text-[#d6cbbb]"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-auto border-t border-[#37312c] pt-4">
                <div dir="ltr" className="mb-3 flex items-end gap-2 font-sans">
                  <span className="text-[1.18rem] font-black text-[#f4ead8]">
                    {formattedPrice}
                  </span>
                  {formattedComparePrice ? (
                    <span className="text-sm text-[#7c7168] line-through">
                      {formattedComparePrice}
                    </span>
                  ) : null}
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_3rem] gap-2">
                  <button
                    onClick={handleAddToCart}
                    className="inline-flex min-h-[3rem] items-center justify-center border border-[#8f1d2b] bg-[#7a131d] px-4 text-sm font-black text-[#fff4dc] transition-colors hover:bg-[#9a1d2a]"
                    title={actionLabel}
                    aria-label={actionLabel}
                  >
                    {actionLabel}
                  </button>
                  {features.quickViewEnabled ? (
                    <button
                      onClick={handleQuickView}
                      className="inline-flex min-h-[3rem] items-center justify-center border border-[#4a4138] bg-[#15110f] text-[#d7b674] transition-colors hover:border-[#b99154] hover:text-[#fff4dc]"
                      title={finalQuickViewLabel}
                      aria-label={finalQuickViewLabel}
                    >
                      <Eye size={17} />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </article>

        <QuickViewModal
          product={product}
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          currency={currency}
          addToCartLabel={storefrontSettings?.['addToCartLabel']}
          viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
        />
      </>
    );
  }

  if (variant === 'carry-frame') {
    return (
      <>
        <CardShell className="group relative flex h-full flex-col bg-transparent p-0 text-card-foreground transition-transform duration-300 hover:-translate-y-1">
          <div className="relative overflow-hidden rounded-[1.35rem] border border-[#eadfd4] bg-[linear-gradient(180deg,#f9f1ea,#f3e8de)] shadow-[0_24px_60px_-48px_rgba(61,37,25,0.26)] transition-shadow duration-300 group-hover:shadow-[0_30px_72px_-46px_rgba(61,37,25,0.32)]">
            {discountPercentage ? (
              <span className="absolute start-3 top-3 z-20 inline-flex items-center rounded-full bg-[#241815] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-[0_14px_34px_-24px_rgba(36,24,21,0.7)]">
                -{discountPercentage}%
              </span>
            ) : null}

            {features.wishlistEnabled ? (
              <button
                onClick={handleWishlist}
                className={`absolute end-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#eadfd4] bg-white/96 text-[#8a6b5c] shadow-[0_14px_28px_-24px_rgba(61,37,25,0.28)] transition-colors hover:text-[#241815] ${
                  isWishlisted ? 'text-[#d45463]' : ''
                }`}
                title={finalWishlistLabel}
                aria-label={finalWishlistLabel}
              >
                <Heart size={14} className={isWishlisted ? 'fill-current' : ''} />
              </button>
            ) : null}

            <div className="aspect-[4/5] overflow-hidden p-4 sm:p-5">
              <StorefrontProductImage
                candidates={imageCandidates}
                alt={name}
                loading={resolvedImageLoading}
                fetchpriority={resolvedImageFetchPriority}
                width="520"
                height="640"
                className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.04]"
                fallback={renderImageFallback('rounded-[1rem] bg-[#efe2d7]')}
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 px-1 pt-4">
            <div className="space-y-2">
              <span className="inline-flex w-fit text-[10px] font-black uppercase tracking-[0.24em] text-[#9a7666]">
                {categoryLabel}
              </span>
              <h3 className="line-clamp-2 font-heading text-[1.08rem] font-black leading-7 text-[#241815]">
                {name}
              </h3>
              <p className="line-clamp-2 text-sm leading-6 text-[#6f5a50]">
                {carryCardSummary}
              </p>
            </div>

            <div dir="ltr" className="flex items-center gap-2 font-sans">
              <span className="text-[1.02rem] font-black text-[#241815]">
                {formattedPrice}
              </span>
              {formattedComparePrice ? (
                <span className="text-sm text-[#af9b90] line-through">
                  {formattedComparePrice}
                </span>
              ) : null}
            </div>

            {carryColorOptions.length > 0 || carrySizeOptions.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {carryColorOptions.map((option, index) => (
                  <span
                    key={`${option}-${index}`}
                    className="inline-flex items-center rounded-full border border-[#eadfd4] bg-white px-3 py-1 text-[11px] font-bold text-[#6f5a50]"
                  >
                    {option}
                  </span>
                ))}
                {carrySizeOptions.map((option, index) => (
                  <span
                    key={`${option}-${index}`}
                    className="inline-flex min-w-[2.25rem] items-center justify-center rounded-full border border-[#eadfd4] bg-[#fff8f2] px-3 py-1 text-[11px] font-bold text-[#8f5d47]"
                  >
                    {option}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-auto flex items-center gap-2 pt-2">
              <button
                onClick={handleAddToCart}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-[#241815] px-4 text-sm font-black text-white transition-colors hover:bg-[#3a2a25]"
                title={actionLabel}
                aria-label={actionLabel}
              >
                {actionLabel}
              </button>
              {features.quickViewEnabled ? (
                <button
                  onClick={handleQuickView}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#eadfd4] bg-white text-[#6f5a50] transition-colors hover:border-[#c9ab95] hover:text-[#241815]"
                  title={finalQuickViewLabel}
                  aria-label={finalQuickViewLabel}
                >
                  <Eye size={16} />
                </button>
              ) : null}
            </div>
          </div>
        </CardShell>

        <QuickViewModal
          product={product}
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          currency={currency}
          addToCartLabel={storefrontSettings?.['addToCartLabel']}
          viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
        />
      </>
    );
  }

  if (variant === 'pedal-frame') {
    const pedalFitOptions = (product.productVariants || [])
      .map((productVariant) =>
        String(
          productVariant.attributes?.['المقاس'] ||
            productVariant.attributes?.['الحجم'] ||
            productVariant.attributes?.['العجلة'] ||
            productVariant.attributes?.size ||
            productVariant.attributes?.Size ||
            productVariant.name ||
            '',
        ).trim(),
      )
      .filter(Boolean)
      .slice(0, 2);

    return (
      <>
        <CardShell className="group relative flex h-full flex-col bg-transparent p-0 text-card-foreground transition-transform duration-300 hover:-translate-y-0.5">
          <div className="relative flex h-full flex-col overflow-hidden border border-[#e3e7eb] bg-white shadow-[0_18px_42px_-34px_rgba(18,34,48,0.12)] transition-shadow duration-300 group-hover:shadow-[0_26px_58px_-32px_rgba(18,34,48,0.18)]">
            {discountPercentage ? (
              <span className="absolute start-3 top-3 z-20 inline-flex items-center rounded-full bg-[#1d2a33] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-[0_14px_34px_-24px_rgba(18,34,48,0.56)]">
                -{discountPercentage}%
              </span>
            ) : null}

            {features.wishlistEnabled ? (
              <button
                onClick={handleWishlist}
                className={`absolute end-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e3e7eb] bg-white/96 text-[#6d7b87] shadow-[0_14px_28px_-24px_rgba(18,34,48,0.18)] transition-colors hover:text-[#1d2a33] ${
                  isWishlisted ? 'text-[#d45463]' : ''
                }`}
                title={finalWishlistLabel}
                aria-label={finalWishlistLabel}
              >
                <Heart size={14} className={isWishlisted ? 'fill-current' : ''} />
              </button>
            ) : null}

            <div className="border-b border-[#edf1f4] bg-[#f7f9fb] p-5">
              <div className="aspect-[4/4.2] overflow-hidden">
                <StorefrontProductImage
                  candidates={imageCandidates}
                  alt={name}
                  loading={resolvedImageLoading}
                  fetchpriority={resolvedImageFetchPriority}
                  width="520"
                  height="560"
                  className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-[1.03]"
                  fallback={renderImageFallback('bg-[#f7f9fb]')}
                />
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="space-y-2">
                <span className="inline-flex w-fit text-[10px] font-black uppercase tracking-[0.22em] text-[#7d8894]">
                  {categoryLabel}
                </span>
                <h3 className="line-clamp-2 font-heading text-[1.06rem] font-black leading-7 text-[#1d2a33]">
                  {name}
                </h3>
                <p className="line-clamp-2 text-sm leading-6 text-[#60717f]">
                  {carryCardSummary}
                </p>
              </div>

              {(ratingValue || reviewCount) ? (
                <div className="flex items-center gap-1.5 text-[#f4b74a]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={`pedal-star-${index}`}
                      size={11}
                      fill={ratingValue && index < Math.round(ratingValue) ? 'currentColor' : 'none'}
                    />
                  ))}
                  {reviewCount ? (
                    <span className="ms-1 text-[10px] font-medium text-[#8a97a2]">
                      ({reviewCount})
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {(pedalFitOptions.length
                  ? pedalFitOptions
                  : [hasVariantChoices ? (isRtl ? 'مقاسات متعددة' : 'Multi sizes') : isRtl ? 'جاهز للرحلة' : 'Ready to ride']
                ).map((item, index) => (
                  <span
                    key={`${item}-${index}`}
                    className="inline-flex items-center border border-[#e3e7eb] bg-[#f8fafb] px-3 py-1 text-[11px] font-bold text-[#516170]"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div dir="ltr" className="mt-auto flex items-center gap-2 font-sans">
                <span className="text-[1.02rem] font-black text-[#1d2a33]">
                  {formattedPrice}
                </span>
                {formattedComparePrice ? (
                  <span className="text-sm text-[#9aa6af] line-through">
                    {formattedComparePrice}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleAddToCart}
                  className="inline-flex h-11 flex-1 items-center justify-center bg-[#1d2a33] px-4 text-sm font-black text-white transition-colors hover:bg-[#121d24]"
                  title={actionLabel}
                  aria-label={actionLabel}
                >
                  {actionLabel}
                </button>
                {features.quickViewEnabled ? (
                  <button
                    onClick={handleQuickView}
                    className="inline-flex h-11 w-11 items-center justify-center border border-[#d9dee4] bg-white text-[#516170] transition-colors hover:border-[#d97706] hover:text-[#b45309]"
                    title={finalQuickViewLabel}
                    aria-label={finalQuickViewLabel}
                  >
                    <Eye size={16} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </CardShell>

        <QuickViewModal
          product={product}
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          currency={currency}
          addToCartLabel={storefrontSettings?.['addToCartLabel']}
          viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
        />
      </>
    );
  }

  if (variant === 'signal-rack') {
    const signalFacts = (
      Array.isArray(product.commandFacts)
        ? (product.commandFacts as Array<{ label?: string; value?: string }>)
            .map((fact) => String(fact?.value || '').trim())
            .filter(Boolean)
        : []
    ).slice(0, 2);
    const signalOptions = Array.from(
      new Set(
        (product.productVariants || [])
          .flatMap((productVariant) => Object.values(productVariant.attributes || {}))
          .map((value) => String(value || '').trim())
          .filter(Boolean),
      ),
    ).slice(0, 2);
    const signalTags = signalFacts.length
      ? signalFacts
      : signalOptions.length
        ? signalOptions
        : [hasVariantChoices ? (isRtl ? 'خيارات متعددة' : 'Multiple options') : isRtl ? 'جاهز للطلب' : 'Ready to order'];

    return (
      <>
        <CardShell className="group relative flex h-full flex-col bg-transparent p-0 text-card-foreground transition-transform duration-300 hover:-translate-y-0.5">
          <div className="relative flex h-full flex-col overflow-hidden border border-[#e4e9f0] bg-white shadow-[0_20px_46px_-36px_rgba(15,23,42,0.14)] transition-shadow duration-300 group-hover:shadow-[0_28px_64px_-34px_rgba(15,23,42,0.18)]">
            {discountPercentage ? (
              <span className="absolute start-3 top-3 z-20 inline-flex items-center bg-[#161c26] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-[0_14px_34px_-24px_rgba(15,23,42,0.46)]">
                -{discountPercentage}%
              </span>
            ) : null}

            {features.wishlistEnabled ? (
              <button
                onClick={handleWishlist}
                className={`absolute end-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center border border-[#dce3ec] bg-white/96 text-[#607184] shadow-[0_14px_28px_-24px_rgba(15,23,42,0.14)] transition-colors hover:text-[#161c26] ${
                  isWishlisted ? 'text-[#d45463]' : ''
                }`}
                title={finalWishlistLabel}
                aria-label={finalWishlistLabel}
              >
                <Heart size={14} className={isWishlisted ? 'fill-current' : ''} />
              </button>
            ) : null}

            <div className="border-b border-[#edf1f6] bg-[linear-gradient(180deg,#fbfcfe_0%,#f4f7fb_100%)] p-5">
              <div className="aspect-[4/3.2] overflow-hidden">
                <StorefrontProductImage
                  candidates={imageCandidates}
                  alt={name}
                  loading={resolvedImageLoading}
                  fetchpriority={resolvedImageFetchPriority}
                  width="560"
                  height="420"
                  className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-[1.03]"
                  fallback={renderImageFallback('bg-[#f7f9fc]')}
                />
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="space-y-2">
                <span className="inline-flex w-fit text-[10px] font-black uppercase tracking-[0.22em] text-[#7a8595]">
                  {categoryLabel}
                </span>
                <h3 className="line-clamp-2 font-heading text-[1.06rem] font-black leading-7 text-[#161c26]">
                  {name}
                </h3>
                <p className="line-clamp-2 text-sm leading-6 text-[#536172]">
                  {carryCardSummary}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {signalTags.map((item, index) => (
                  <span
                    key={`${item}-${index}`}
                    className="inline-flex items-center gap-2 border border-[#e4e9f0] bg-[#fbfcfe] px-3 py-1 text-[11px] font-bold text-[#516170]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
                    {item}
                  </span>
                ))}
              </div>

              {(ratingValue || reviewCount) ? (
                <div className="flex items-center gap-1.5 text-[#f4b74a]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={`signal-star-${index}`}
                      size={11}
                      fill={ratingValue && index < Math.round(ratingValue) ? 'currentColor' : 'none'}
                    />
                  ))}
                  {reviewCount ? (
                    <span className="ms-1 text-[10px] font-medium text-[#8a97a2]">
                      ({reviewCount})
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div dir="ltr" className="mt-auto flex items-center gap-2 font-sans">
                <span className="text-[1.02rem] font-black text-[#161c26]">
                  {formattedPrice}
                </span>
                {formattedComparePrice ? (
                  <span className="text-sm text-[#9aa6af] line-through">
                    {formattedComparePrice}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleAddToCart}
                  className="inline-flex h-11 flex-1 items-center justify-center bg-[#161c26] px-4 text-sm font-black text-white transition-colors hover:bg-[#0d1219]"
                  title={actionLabel}
                  aria-label={actionLabel}
                >
                  {actionLabel}
                </button>
                {features.quickViewEnabled ? (
                  <button
                    onClick={handleQuickView}
                    className="inline-flex h-11 w-11 items-center justify-center border border-[#dce3ec] bg-white text-[#607184] transition-colors hover:border-[#f59e0b] hover:text-[#b45309]"
                    title={finalQuickViewLabel}
                    aria-label={finalQuickViewLabel}
                  >
                    <Eye size={16} />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </CardShell>

        <QuickViewModal
          product={product}
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          currency={currency}
          addToCartLabel={storefrontSettings?.['addToCartLabel']}
          viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
        />
      </>
    );
  }

  if (variant === 'boutique-air') {
    return (
      <>
        <CardShell className="group relative flex h-full flex-col overflow-hidden rounded-[0.45rem] bg-transparent p-0 text-card-foreground transition-transform duration-300 hover:-translate-y-0.5">
          <div className="relative mb-4 overflow-hidden rounded-[0.45rem] border border-[#efe4df] bg-[#f8f4f1] shadow-[0_18px_42px_-38px_rgba(59,33,28,0.12)]">
            {discountPercentage ? (
              <span className="absolute start-3 top-3 z-20 inline-flex min-w-[1.7rem] items-center justify-center rounded-full bg-[#f15f66] px-2 py-0.5 text-[10px] font-bold text-white shadow-[0_10px_22px_-18px_rgba(241,95,102,0.9)]">
                {discountPercentage}%
              </span>
            ) : null}

            {features.wishlistEnabled ? (
              <button
                onClick={handleWishlist}
                className={`absolute end-3 top-3 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#ece2dc] bg-white/96 text-[#9b8881] shadow-[0_14px_28px_-24px_rgba(59,33,28,0.22)] transition-colors hover:text-[#201915] ${
                  isWishlisted ? 'text-[#d45463]' : ''
                }`}
                title={finalWishlistLabel}
                aria-label={finalWishlistLabel}
              >
                <Heart size={14} className={isWishlisted ? 'fill-current' : ''} />
              </button>
            ) : null}

            <div className="aspect-square overflow-hidden p-4 md:p-5">
              <StorefrontProductImage
                candidates={imageCandidates}
                alt={name}
                loading={imageLoading || 'lazy'}
                fetchpriority={imageFetchPriority}
                responsiveWidths={[240, 320, 420, 520]}
                responsiveSizes="(max-width: 767px) 68vw, (max-width: 1279px) 28vw, 20vw"
                imageQuality={72}
                width="420"
                height="420"
                className="h-full w-full object-contain object-center transition-transform duration-500 group-hover:scale-[1.02]"
                fallback={renderImageFallback('rounded-[0.35rem] bg-[#eee5e0]')}
              />
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center text-center">
            <h3 className="line-clamp-2 font-heading text-[1.02rem] font-semibold leading-7 text-[#241c19]">
              {name}
            </h3>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
              <div dir="ltr" className="flex items-center gap-2 font-sans">
                {formattedComparePrice ? (
                  <span className="text-[#b9aca6] line-through">
                    {formattedComparePrice}
                  </span>
                ) : null}
                <span className="text-[0.98rem] font-semibold text-[#df6670]">
                  {formattedPrice}
                </span>
              </div>
            </div>

            {(ratingValue || reviewCount) ? (
              <div className="mt-2 flex items-center justify-center gap-1 text-[#f4c94d]">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={`boutique-star-${index}`}
                    size={11}
                    fill={ratingValue && index < Math.round(ratingValue) ? 'currentColor' : 'none'}
                  />
                ))}
                {reviewCount ? (
                  <span className="ms-1 text-[10px] font-medium text-[#b49c94]">
                    ({reviewCount})
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="mt-3.5 flex w-full flex-col gap-1.5 px-1 sm:px-2">
              <button
                onClick={handleAddToCart}
                className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#201915] hover:bg-[#352a23] text-white px-3 py-2 text-xs font-bold shadow-sm transition-all active:scale-95"
                title={actionLabel}
                aria-label={actionLabel}
              >
                <ShoppingCart size={14} />
                <span>{hasVariantChoices ? (isRtl ? 'اختيار المقاس / أضف' : 'Select Size') : (isRtl ? 'أضف للسلة' : 'Add to Cart')}</span>
              </button>
              <button
                onClick={handleQuickBuy}
                className="flex w-full items-center justify-center gap-1 rounded-full border border-amber-500/40 bg-amber-50 hover:bg-amber-100 text-amber-900 px-3 py-1.5 text-[11px] font-bold shadow-sm transition-all active:scale-95"
                title={isRtl ? 'طلب سريع' : 'Fast Order'}
                aria-label={isRtl ? 'طلب سريع' : 'Fast Order'}
              >
                <Zap size={13} className="fill-amber-500 text-amber-500" />
                <span>{isRtl ? 'طلب سريع' : 'Quick Order'}</span>
              </button>
            </div>

            <span className="mt-3 text-[10px] font-medium tracking-[0.14em] text-[#9b8d88]">
              {categoryLabel}
            </span>
          </div>
        </CardShell>

        <QuickViewModal
          product={product}
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          currency={currency}
          addToCartLabel={storefrontSettings?.['addToCartLabel']}
          viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
        />
      </>
    );
  }

  if (variant === 'editorial-bare') {
    if (isKhemetLuxe) {
      const sanitizedName = name.replace(/—/g, '·');
      return (
        <>
          <CardShell className="group relative flex h-full flex-col bg-transparent p-0 text-card-foreground transition-transform duration-200 hover:-translate-y-0.5">
            {discountPercentage ? (
              <span className="absolute start-3 top-3 z-20 inline-flex rounded-full bg-[#090b0e] border border-white/15 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm tabular-nums font-mono">
                -{discountPercentage}%
              </span>
            ) : null}

            <div className="overflow-hidden bg-[#f8f7f6] rounded-sm">
              <div className="aspect-square overflow-hidden">
                <StorefrontProductImage
                  candidates={imageCandidates}
                  alt={sanitizedName}
                  loading={resolvedImageLoading}
                  fetchpriority={resolvedImageFetchPriority}
                  requestedWidth={520}
                  responsiveWidths={[240, 320, 420, 520]}
                  responsiveSizes="(max-width: 767px) 68vw, (max-width: 1279px) 28vw, 20vw"
                  imageQuality={80}
                  width="520"
                  height="520"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  fallback={renderImageFallback('bg-[#f8f7f6]')}
                />
              </div>
            </div>

            <div className="flex flex-1 flex-col px-3.5 pb-3 pt-3.5 text-start">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                {categoryLabel}
              </span>
              <h3 className="mt-1 line-clamp-1 font-heading text-[0.95rem] font-bold leading-6 text-[#121214]">
                {sanitizedName}
              </h3>
              <div dir="ltr" className="mt-2 flex items-baseline gap-2 font-sans leading-tight">
                {formattedComparePrice ? (
                  <span className="text-xs text-neutral-400 line-through tabular-nums font-mono">
                    {formattedComparePrice}
                  </span>
                ) : null}
                <span className="text-[1.05rem] font-bold text-[#090b0e] tabular-nums font-mono tracking-tight">
                  {formattedPrice}
                </span>
              </div>

              <div className="mt-3 flex w-full flex-col gap-1.5 pt-1">
                <button
                  onClick={handleAddToCart}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#090b0e] hover:bg-black text-white px-3.5 py-2 text-xs font-semibold shadow-sm transition-transform duration-150 active:scale-[0.97]"
                  title={actionLabel}
                  aria-label={actionLabel}
                >
                  <ShoppingCart size={13} />
                  <span>{hasVariantChoices ? (isRtl ? 'اختيار المقاس' : 'Select Size') : (isRtl ? 'أضف للسلة' : 'Add to Cart')}</span>
                </button>
                <button
                  onClick={handleQuickBuy}
                  className="flex w-full items-center justify-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 px-3 py-1.5 text-[11px] font-semibold transition-transform duration-150 active:scale-[0.97]"
                  title={isRtl ? 'طلب سريع' : 'Fast Order'}
                  aria-label={isRtl ? 'طلب سريع' : 'Fast Order'}
                >
                  <Zap size={12} className="text-amber-600 fill-amber-500" />
                  <span>{isRtl ? 'طلب سريع' : 'Quick Order'}</span>
                </button>
              </div>
            </div>
          </CardShell>

          <QuickViewModal
            product={product}
            isOpen={isQuickViewOpen}
            onClose={() => setIsQuickViewOpen(false)}
            currency={currency}
            addToCartLabel={storefrontSettings?.['addToCartLabel']}
            viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
          />
        </>
      );
    }

    return (
      <>
        <CardShell className="group relative flex h-full flex-col bg-transparent p-0 text-card-foreground transition-transform duration-300 hover:-translate-y-0.5">
          {discountPercentage ? (
            <span className="absolute start-3 top-3 z-20 inline-flex min-w-[2rem] items-center justify-center rounded-full border border-white/40 bg-[#1d3025]/88 px-2.5 py-1 text-[10px] font-black tracking-[0.16em] text-[#f6e2a6] shadow-[0_18px_34px_-24px_rgba(14,24,18,0.62)] backdrop-blur">
              -{discountPercentage}%
            </span>
          ) : null}

          <div className="relative overflow-hidden bg-[#f2eeea]">
            <div className="aspect-square overflow-hidden">
              <StorefrontProductImage
                candidates={imageCandidates}
                alt={name}
                loading={resolvedImageLoading}
                fetchpriority={resolvedImageFetchPriority}
                width="520"
                height="520"
                className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.03]"
                fallback={renderImageFallback('bg-[#ebe5df]')}
              />
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(17,24,20,0.12))]" />
          </div>

          <div className="flex flex-1 flex-col items-center px-2 pb-1 pt-5 text-center">
            <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#8a7767]">
              {categoryLabel}
            </span>
            <h3 className="mt-2 line-clamp-2 font-heading text-[1.05rem] font-semibold leading-7 text-[#1d1917]">
              {name}
            </h3>

            <div dir="ltr" className="mt-3 flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 font-sans leading-tight">
              {formattedComparePrice ? (
                <span className="shrink-0 text-sm text-[#b6a79d] line-through">
                  {formattedComparePrice}
                </span>
              ) : null}
              <span className="min-w-0 text-[1rem] font-semibold text-[#7b5a2f]">
                {formattedPrice}
              </span>
            </div>
          </div>
        </CardShell>

        <QuickViewModal
          product={product}
          isOpen={isQuickViewOpen}
          onClose={() => setIsQuickViewOpen(false)}
          currency={currency}
          addToCartLabel={storefrontSettings?.['addToCartLabel']}
          viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
        />
      </>
    );
  }

  if (variant === 'minimal') {
    if (isClosetOs) {
      return (
        <>
          <CardShell className="group flex flex-col overflow-hidden rounded-[1.7rem] border border-[#d8cfbf] bg-[#fffbf4] p-3 shadow-[0_24px_64px_-44px_rgba(34,49,45,0.24)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_32px_78px_-42px_rgba(34,49,45,0.28)]">
            <div className="relative mb-4 aspect-[3/4] overflow-hidden rounded-[1.35rem] border border-[#d8cfbf] bg-[linear-gradient(180deg,#f3ebdd,#e7e0d2)]">
              <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 p-3">
                <span className="inline-flex rounded-full border border-[#c8beb0] bg-[#fff9f1]/92 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#22312d] shadow-sm">
                  {closetOsSlotLabel}
                </span>
                {discountPercentage ? (
                  <span className="inline-flex rounded-full bg-[#6f8e79] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[0_16px_36px_-24px_rgba(111,142,121,0.62)]">
                    -{discountPercentage}%
                  </span>
                ) : null}
              </div>

              <StorefrontProductImage
                candidates={imageCandidates}
                alt={name}
                loading="lazy"
                width="300"
                height="400"
                className="h-full w-full object-cover mix-blend-multiply transition-transform duration-700 group-hover:scale-105"
                fallback={renderImageFallback()}
              />

              <div className="absolute inset-x-3 bottom-3 z-20 flex items-center justify-between gap-2 rounded-[1.15rem] border border-white/40 bg-white/82 px-3 py-2 backdrop-blur">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#22312d]">
                  {categoryLabel}
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#6a756f]">
                  {closetOsCareLabel}
                </span>
              </div>

              <FloatingIcons />
            </div>

            <div className="flex flex-1 flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex rounded-full border border-[#d8cfbf] bg-[#f4ecde] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#4e5f59]">
                  {hasVariantChoices ? (isRtl ? 'مقاسات/ألوان' : 'Size + color') : (isRtl ? 'قرار سريع' : 'Quick pick')}
                </span>
                <span className="inline-flex rounded-full border border-[#d8cfbf] bg-[#fffbf4] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#4e5f59]">
                  {isRtl ? 'خطة الأسبوع' : 'Week plan'}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="font-heading text-[1.08rem] font-black leading-7 text-[#22312d]">
                  {name}
                </h3>
                <p className="text-sm leading-7 text-[#5b6762]">
                  {closetOsPlannerSummary}
                </p>
              </div>

              <div className="mt-auto flex flex-col gap-3">
                <div className="flex items-end justify-between gap-3">
                  <div dir="ltr" className="space-y-1 font-sans">
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#6a756f]">
                      {isRtl ? 'سعر الخزانة' : 'Closet price'}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-black text-[#22312d]">{formattedPrice}</p>
                      {formattedComparePrice ? (
                        <p className="text-sm text-[#7f8a84] line-through">{formattedComparePrice}</p>
                      ) : null}
                    </div>
                  </div>
                  {features.wishlistEnabled ? (
                    <button
                      onClick={handleWishlist}
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
                        isWishlisted
                          ? 'border-[#6f8e79] bg-[#6f8e79] text-white'
                          : 'border-[#d8cfbf] bg-[#fffbf4] text-[#22312d] hover:border-[#6f8e79] hover:text-[#6f8e79]'
                      }`}
                      title={finalWishlistLabel}
                      aria-label={finalWishlistLabel}
                    >
                      <Heart size={16} className={isWishlisted ? 'fill-current' : ''} />
                    </button>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleAddToCart}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#22312d] px-5 py-3 text-sm font-black text-[#fff8ee] shadow-[0_18px_44px_-26px_rgba(34,49,45,0.46)] transition-all hover:-translate-y-0.5 hover:bg-[#2a3a35]"
                  >
                    <ShoppingCart size={16} />
                    {actionLabel}
                  </button>
                  {features.quickViewEnabled ? (
                    <button
                      onClick={handleQuickView}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d8cfbf] bg-[#fffbf4] px-5 py-3 text-sm font-bold text-[#22312d] transition-colors hover:border-[#6f8e79] hover:text-[#6f8e79]"
                    >
                      <Eye size={16} />
                      {detailLabel}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </CardShell>
          <QuickViewModal 
            product={product} 
            isOpen={isQuickViewOpen} 
            onClose={() => setIsQuickViewOpen(false)} 
            currency={currency}
            addToCartLabel={storefrontSettings?.['addToCartLabel']}
            viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
          />
        </>
      );
    }

    return (
      <>
        <CardShell className={`group flex flex-col ${
          isAirlume
            ? 'rounded-[1.6rem] border border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.82))] p-3 shadow-[0_28px_90px_-58px_hsl(var(--primary)/0.58)] transition-all hover:-translate-y-1'
            : isSoleaFemme
              ? 'rounded-[1.5rem] border border-primary/10 bg-card/90 p-3 shadow-[0_24px_80px_-52px_hsl(var(--primary)/0.85)] transition-all hover:-translate-y-1'
              : ''
        }`}>
          <div className={`relative mb-4 aspect-[3/4] overflow-hidden ${
            isAirlume
              ? 'rounded-[1.35rem] bg-[linear-gradient(180deg,hsl(var(--secondary)/0.75),hsl(var(--muted)))]'
              : isSoleaFemme
                ? 'rounded-[1.2rem] bg-[linear-gradient(180deg,hsl(var(--secondary)),hsl(var(--muted)))]'
                : 'rounded-[calc(var(--radius)-2px)] bg-muted'
          }`}>
            <StorefrontProductImage
              candidates={imageCandidates}
              alt={name}
              loading="lazy"
              width="300"
              height="400"
              className="h-full w-full object-cover mix-blend-multiply transition-transform duration-700 group-hover:scale-105"
              fallback={renderImageFallback()}
            />
            {isSoleaFemme || isAirlume ? (
              <>
                <div className={`absolute inset-0 ${isAirlume ? 'bg-[linear-gradient(180deg,transparent_38%,rgba(15,23,42,0.28)_100%)]' : 'bg-[linear-gradient(180deg,transparent_45%,rgba(24,20,16,0.14)_100%)]'}`} />
                <span className={`absolute end-3 bottom-3 inline-flex rounded-full px-3 py-1 text-[11px] font-bold backdrop-blur ${isAirlume ? 'border border-white/70 bg-white/88 text-slate-950 shadow-sm' : 'bg-background/90 text-foreground'}`}>
                  {categoryLabel}
                </span>
              </>
            ) : null}
            {features.gridDiscountBanner && discountPercentage ? (
              <span className="absolute start-3 top-3 inline-flex rounded-full bg-accent px-2.5 py-1 text-xs font-black text-accent-foreground shadow-sm">
                -{discountPercentage}%
              </span>
            ) : null}
            <FloatingIcons />
          </div>
          <div className="flex flex-col space-y-1">
            <h3 className={`font-sans text-foreground underline-offset-4 decoration-muted-foreground/30 ${
              isAirlume
                ? 'text-base font-black leading-6 group-hover:decoration-primary/35 group-hover:underline'
                : isSoleaFemme
                  ? 'text-base font-black group-hover:decoration-primary/35 group-hover:underline'
                  : 'font-medium group-hover:underline'
            }`}>
              {name}
            </h3>
            <div dir="ltr" className="flex items-center gap-2 font-sans text-sm">
              <p className={`font-semibold ${isAirlume || isSoleaFemme ? 'text-primary' : 'text-foreground'}`}>{formattedPrice}</p>
              {formattedComparePrice ? (
                <p className="text-muted-foreground line-through">{formattedComparePrice}</p>
              ) : null}
            </div>
            {isSoleaFemme || isAirlume ? (
              <span className={`pt-1 text-xs font-bold uppercase tracking-[0.2em] ${isAirlume ? 'text-primary/80' : 'text-muted-foreground'}`}>
                {detailLabel}
              </span>
            ) : null}
          </div>
        </CardShell>
        <QuickViewModal 
          product={product} 
          isOpen={isQuickViewOpen} 
          onClose={() => setIsQuickViewOpen(false)} 
          currency={currency}
          addToCartLabel={storefrontSettings?.['addToCartLabel']}
          viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
        />
      </>
    );
  }

  if (variant === 'overlay') {
    return (
      <>
        <CardShell
          className={`group relative flex h-full flex-col overflow-hidden aspect-[4/5] ${
            isAirlume
              ? 'rounded-[1.9rem] border border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(239,246,255,0.6))] shadow-[0_34px_95px_-58px_hsl(var(--primary)/0.62)]'
              : isSoleaFemme
              ? 'rounded-[1.7rem] border border-primary/10 bg-card shadow-[0_32px_95px_-55px_hsl(var(--primary)/0.85)]'
              : 'rounded-[var(--radius)] border border-border bg-card'
          }`}
        >
          <StorefrontProductImage
            candidates={imageCandidates}
            alt={name}
            loading="lazy"
            width="400"
            height="500"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
            fallback={renderImageFallback('absolute inset-0')}
          />
          {features.gridDiscountBanner && discountPercentage ? (
            <span className="absolute start-4 top-4 z-10 inline-flex rounded-full bg-accent px-3 py-1 text-xs font-black text-accent-foreground shadow-sm">
              -{discountPercentage}%
            </span>
          ) : null}

          <FloatingIcons />

          <div
            className={`absolute inset-0 transition-opacity duration-300 ${
              isAirlume
                ? 'bg-[linear-gradient(180deg,rgba(15,23,42,0.04)_0%,rgba(15,23,42,0.2)_44%,rgba(15,23,42,0.88)_100%)] opacity-100'
                : isSoleaFemme
                ? 'bg-[linear-gradient(180deg,rgba(24,20,16,0.08)_10%,rgba(24,20,16,0.75)_100%)] opacity-100'
                : 'bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100'
            }`}
          />

          <div className={`absolute bottom-0 start-0 end-0 flex flex-col items-start gap-2 p-6 text-white transition-all duration-300 ${
            isAirlume || isSoleaFemme
              ? 'translate-y-0 opacity-100'
              : 'translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
          }`}>
            {isSoleaFemme || isAirlume ? (
              <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black tracking-[0.2em] uppercase backdrop-blur ${isAirlume ? 'border-white/30 bg-white/92 text-slate-950 shadow-sm' : 'border-white/20 bg-white/10 text-white/85'}`}>
                {categoryLabel}
              </span>
            ) : null}
            <h3 className="font-heading text-xl font-semibold leading-tight text-white drop-shadow-md">{name}</h3>
            <div dir="ltr" className="flex items-center gap-2 font-sans">
              <p className="font-medium text-white/95">{formattedPrice}</p>
              {formattedComparePrice ? (
                <p className="text-sm text-white/70 line-through">{formattedComparePrice}</p>
              ) : null}
            </div>
            <button
                onClick={handleAddToCart}
                className={`mt-2 flex w-full items-center justify-center gap-2 rounded-[var(--button-radius,0.375rem)] py-2.5 text-sm font-semibold transition-colors ${
                  isAirlume
                    ? 'rounded-full bg-[linear-gradient(135deg,#0f172a_0%,hsl(var(--primary))_60%,#60a5fa_100%)] text-white shadow-[0_24px_70px_-34px_hsl(var(--primary)/0.65)] hover:opacity-95'
                    : isSoleaFemme
                    ? 'bg-white text-black shadow-lg hover:bg-white/92'
                    : 'bg-white text-black hover:bg-white/90'
                }`}
            >
              <ShoppingCart size={16} />
              {actionLabel}
            </button>
          </div>
        </CardShell>
        <QuickViewModal 
          product={product} 
          isOpen={isQuickViewOpen} 
          onClose={() => setIsQuickViewOpen(false)} 
          currency={currency}
          addToCartLabel={storefrontSettings?.['addToCartLabel']}
          viewFullDetailsLabel={storefrontSettings?.['viewFullDetailsLabel']}
        />
      </>
    );
  }

  return (
    <>
      <CardShell
        className={`group relative flex flex-col overflow-hidden text-card-foreground transition-all duration-300 ${
          isAirlume
            ? 'rounded-[1.7rem] border border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,246,255,0.86))] shadow-[0_30px_90px_-56px_hsl(var(--primary)/0.58)] hover:-translate-y-1 hover:shadow-[0_38px_110px_-54px_hsl(var(--primary)/0.62)]'
            : isSoleaFemme
            ? 'rounded-[1.6rem] border border-primary/10 bg-card shadow-[0_28px_90px_-58px_hsl(var(--primary)/0.88)] hover:-translate-y-1 hover:shadow-[0_34px_95px_-52px_hsl(var(--primary)/0.92)]'
            : isFakhama
              ? 'rounded-[var(--radius)] border border-border bg-card shadow-md transition-all duration-500 hover:border-accent hover:shadow-2xl hover:shadow-primary/5 group-hover:-translate-y-1.5'
              : 'rounded-[var(--radius)] border border-border bg-card hover:shadow-lg'
        }`}
      >
        <div className={`relative overflow-hidden ${
          isAirlume
            ? 'aspect-[4/5] bg-[linear-gradient(180deg,hsl(var(--secondary)),hsl(var(--muted)))]'
            : isSoleaFemme
              ? 'aspect-[4/5] bg-[linear-gradient(180deg,hsl(var(--secondary)),hsl(var(--muted)))]'
              : 'aspect-square bg-muted'
        }`}>
          <StorefrontProductImage
            candidates={imageCandidates}
            alt={name}
            loading={resolvedImageLoading}
            fetchpriority={resolvedImageFetchPriority}
            width="400"
            height="400"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            fallback={renderImageFallback()}
          />
          <div className="absolute start-3 top-3 z-10 flex flex-wrap gap-1.5">
            <DiscountBadge />
            <UrgencyBadge />
            {isZenOrganic && !discountPercentage ? (
              <span className="inline-flex rounded-full bg-[#1a3328] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                جديد
              </span>
            ) : null}
          </div>
          {isZenOrganic && (
            <div className={`absolute inset-0 flex items-center justify-center gap-3 bg-black/5 opacity-0 transition-opacity duration-300 ${isHovered ? 'opacity-100' : ''}`}>
              <button
                onClick={handleAddToCart}
                className="h-11 w-11 rounded-full bg-white text-[#1a3328] shadow-xl transition-all hover:scale-110 hover:bg-[#88a876] hover:text-white"
                title={actionLabel}
              >
                <ShoppingCart size={18} className="mx-auto" />
              </button>
              <button
                onClick={handleQuickView}
                className="h-11 w-11 rounded-full bg-white text-[#1a3328] shadow-xl transition-all hover:scale-110 hover:bg-[#1a3328] hover:text-white"
                title="عرض سريع"
              >
                <Eye size={18} className="mx-auto" />
              </button>
            </div>
          )}
          {isAirlume || isSoleaFemme || isFakhama ? (
            <>
              <div className={`absolute inset-x-0 bottom-0 h-28 ${
                isAirlume
                  ? 'bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.24))]'
                  : isFakhama
                    ? 'bg-gradient-to-t from-black/20 via-black/5 to-transparent'
                    : 'bg-[linear-gradient(180deg,transparent,rgba(24,20,16,0.18))]'
              }`} />
              <span className={`absolute bottom-3 start-3 inline-flex rounded-full border px-3 py-1 text-[11px] font-bold backdrop-blur transition-transform duration-500 group-hover:scale-110 ${
                isAirlume
                  ? 'border-white/60 bg-white/90 text-slate-950 shadow-sm'
                  : isFakhama
                    ? 'border-white/30 bg-primary text-primary-foreground'
                    : 'border-white/30 bg-background/88 text-foreground'
              }`}>
                {categoryLabel}
              </span>
            </>
          ) : null}
          <FloatingIcons />
        </div>

        <div className={`flex flex-grow flex-col space-y-2 p-4 ${isAirlume || isSoleaFemme ? 'md:p-5' : ''}`}>
          <div className="flex items-start justify-between gap-3">
            <h3 className={`font-heading text-base leading-tight ${
              isAirlume || isSoleaFemme ? 'line-clamp-2 font-black' : 'truncate font-semibold'
            }`}>
              {name}
            </h3>
            {isAirlume && hasDiscount ? (
              <span className="shrink-0 rounded-full border border-primary/10 bg-white px-2.5 py-1 text-[11px] font-black text-primary shadow-sm">
                Sale
              </span>
            ) : isSoleaFemme && hasDiscount ? (
              <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                Edit
              </span>
            ) : null}
            {isZenOrganic && (
              <span className="mt-1 inline-flex rounded-full bg-[#f1f3ee] px-2.5 py-1 text-[11px] font-bold text-[#688059]">
                {hasVariantChoices ? 'أكثر من خيار' : 'اختيار يومي هادئ'}
              </span>
            )}
          </div>

          {(ratingValue || reviewCount) ? (
            <div className="flex items-center gap-1 text-[#f59e0b]">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={`std-star-${index}`}
                    size={11}
                    fill={ratingValue && index < Math.round(ratingValue) ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
              {reviewCount ? (
                <span className="font-sans text-[11px] text-muted-foreground">
                  ({reviewCount})
                </span>
              ) : null}
            </div>
          ) : null}

          <div dir="ltr" className="flex items-center gap-2 font-sans">
            <p className={`text-sm font-bold ${isZenOrganic ? 'text-[#1a3328]' : 'text-primary'}`}>{formattedPrice}</p>
            {formattedComparePrice ? (
              <p className="text-xs text-muted-foreground line-through decoration-1">{formattedComparePrice}</p>
            ) : null}
          </div>
          {isAirlume ? (
            <p className="text-xs leading-6 text-muted-foreground">
              {hasDiscount ? `توفير ${discountPercentage}% على القطعة مع عرض بصري أقوى وقرار أسرع.` : 'عرض أنظف للمنتجات الأساسية داخل واجهات البيع الحديثة.'}
            </p>
          ) : isSoleaFemme ? (
            <p className="text-xs leading-5 text-muted-foreground">
              {hasDiscount ? `توفير ${discountPercentage}% على هذا الموديل لفترة محدودة.` : 'اختيار ناعم يناسب الشغل والخروجات اليومية.'}
            </p>
          ) : isZenOrganic ? (
            <span className="pt-1 text-xs font-bold uppercase tracking-[0.2em] text-[#688059]">
              {detailLabel}
            </span>
          ) : null}

          <div className="mt-auto pt-2">
            {features.gridAddToCartIcon ? (
              <button
                onClick={handleAddToCart}
                className="absolute bottom-4 end-4 z-10 rounded-full bg-primary p-3 text-primary-foreground shadow-md transition-all duration-300 translate-y-0 opacity-100 md:translate-y-4 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100"
                title={actionLabel}
              >
                <Plus size={20} />
              </button>
            ) : (
              <div className="relative z-10 flex flex-col sm:flex-row items-center gap-1.5 w-full mt-1">
                <button
                  onClick={handleAddToCart}
                  className="flex flex-1 w-full items-center justify-center gap-1.5 rounded-[var(--button-radius,0.375rem)] py-2 px-3 text-xs font-bold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-all active:scale-95"
                  title={actionLabel}
                >
                  <ShoppingCart size={14} />
                  <span>{hasVariantChoices ? (isRtl ? 'اختر المقاس / أضف' : 'Select Size') : (isRtl ? 'أضف للسلة' : 'Add to Cart')}</span>
                </button>
                <button
                  onClick={handleQuickBuy}
                  className="flex w-full sm:w-auto items-center justify-center gap-1 rounded-[var(--button-radius,0.375rem)] py-2 px-2.5 text-[11px] font-bold border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-300 hover:bg-amber-500/20 transition-all active:scale-95 shrink-0"
                  title={isRtl ? 'طلب سريع' : 'Fast Order'}
                >
                  <Zap size={13} className="fill-amber-500 text-amber-500" />
                  <span>{isRtl ? 'طلب سريع' : 'Buy Now'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </CardShell>

      <QuickViewModal
        product={product}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        currency={currency}
      />
    </>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
