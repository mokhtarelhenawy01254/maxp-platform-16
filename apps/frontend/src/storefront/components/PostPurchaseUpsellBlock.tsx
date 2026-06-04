import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, ShoppingCart, Sparkles } from 'lucide-react';
import { storefrontFetch } from '../../utils/storefrontApi';
import { useProducts, type Product } from '../hooks/useProducts';
import { isMarketplaceThemePreview } from '../preview/previewContext';
import { useStorefrontSettings } from '../hooks/useStorefrontSettings';
import { useStorefrontFacebookTracking } from '../hooks/useStorefrontFacebookTracking';
import { useCartStore } from '../store/useCartStore';
import { trackConversionSuiteUsage } from '../utils/conversionSuiteTracking';
import { buildStorefrontPath } from '../utils/paths';
import { formatStorefrontCurrency } from '../utils/currency';
import {
  getStorefrontMarketplaceAppSettings,
  isStorefrontMarketplaceAppEnabled,
} from '../utils/marketplaceApps';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import StorefrontProductImage from './StorefrontProductImage';
import {
  buildStorefrontImageCandidates,
  getPrimaryProductImage,
  normalizeStorefrontImageValue,
} from '../utils/productImages';
import { getProductVolumeDiscounts } from '../utils/volumeDiscounts';
import { sanitizeProductCopy, truncateProductCopy } from '../utils/productCopy';

interface PurchaseTrackingItem {
  id: string;
  quantity: number;
  price: number;
}

interface PostPurchaseUpsellBlockProps {
  orderReference?: string;
  purchaseItems?: PurchaseTrackingItem[] | null;
  settings?: {
    variant?: string;
    title?: string;
    subtitle?: string;
    badge?: string;
    limit?: number | string;
    ctaLabel?: string;
    chooseOptionsLabel?: string;
    variantChoicesLabel?: string;
    emptyStateTitle?: string;
    [key: string]: unknown;
  };
}

const normalizePostPurchaseUpsellVariant = (
  value: unknown,
): 'standard' | 'boutique-afterglow' => {
  if (typeof value !== 'string') {
    return 'standard';
  }

  const normalizedValue = value.trim().toLowerCase();
  if (normalizedValue === 'boutique-afterglow') {
    return 'boutique-afterglow';
  }

  return 'standard';
};

type StorefrontProductPayload = Product & {
  images?: unknown;
  mainImage?: unknown;
  image?: unknown;
};

const parsePositiveNumber = (value: unknown, fallback: number) => {
  const parsedValue =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return Math.round(parsedValue);
};

const normalizeRecommendation = (product: StorefrontProductPayload): Product => ({
  ...product,
  mainImage: normalizeStorefrontImageValue(product.mainImage as any),
  images: buildStorefrontImageCandidates(
    product.images,
    product.mainImage,
    (product as Record<string, unknown>)['image'],
  ),
});

const dedupeRecommendations = (products: Product[]) => {
  const seenIds = new Set<string>();

  return products.filter((product) => {
    if (!product?.id || seenIds.has(product.id)) {
      return false;
    }

    seenIds.add(product.id);
    return true;
  });
};

const getPcHubRecommendationGridClassName = (itemCount: number) => {
  if (itemCount <= 1) {
    return 'mx-auto grid max-w-xl grid-cols-1 gap-4';
  }

  if (itemCount === 2) {
    return 'mx-auto grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2';
  }

  if (itemCount === 3) {
    return 'mx-auto grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3';
  }

  return 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4';
};

const PostPurchaseUpsellBlock: React.FC<PostPurchaseUpsellBlockProps> = ({
  orderReference,
  purchaseItems,
  settings,
}) => {
  const { settings: storefrontSettings } = useStorefrontSettings();
  const { theme } = useStorefrontTheme();
  const { addItem } = useCartStore();
  const { trackAddToCartEvent } = useStorefrontFacebookTracking();
  const location = useLocation();
  const navigate = useNavigate();
  const isMarketplacePreview = isMarketplaceThemePreview(location.search);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const conversionEnabled = isStorefrontMarketplaceAppEnabled(
    storefrontSettings,
    'conversion-suite',
  );
  const conversionSettings = getStorefrontMarketplaceAppSettings(
    storefrontSettings,
    'conversion-suite',
  );
  const modules = (conversionSettings['modules'] as Record<string, any> | undefined) || {};
  const copy = (conversionSettings['copy'] as Record<string, any> | undefined) || {};
  const postPurchaseUpsellEnabled =
    !conversionEnabled || modules['postPurchaseUpsell'] !== false;
  const prefersArabicCopy = theme.direction === 'rtl';
  const isPcHub = theme.id === 'pc-hub-eg';
  const variant = normalizePostPurchaseUpsellVariant(settings?.variant);
  const isBoutiqueAfterglow =
    variant === 'boutique-afterglow' || theme.id === 'rose-boutique-eg';

  const currency =
    storefrontSettings?.storefront?.settings?.currency ||
    storefrontSettings?.company?.currency ||
    'EGP';
  const limit = parsePositiveNumber(settings?.limit, 4);
  const purchasedProductIds = useMemo(
    () =>
      Array.from(
        new Set(
          (purchaseItems || [])
            .map((item) => String(item?.id || '').trim())
            .filter(Boolean),
        ),
      ),
    [purchaseItems],
  );
  const { products: fallbackProducts, isLoading: fallbackLoading, error } = useProducts({
    limit: Math.max(limit + 2, 6),
  });

  useEffect(() => {
    if (!postPurchaseUpsellEnabled || purchasedProductIds.length === 0) {
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
          const previewRecommendations = dedupeRecommendations(
            purchasedProductIds
              .slice(0, 3)
              .flatMap((productId) => [
                ...(getMarketplacePreviewRecommendations(productId, 'boughtTogether') || []),
                ...(getMarketplacePreviewRecommendations(productId, 'related') || []),
              ])
              .filter((product) => product?.id && !purchasedProductIds.includes(product.id)),
          ).slice(0, limit);

          if (previewRecommendations.length > 0) {
            if (!cancelled) {
              setRecommendedProducts(previewRecommendations);
            }
            return;
          }
        }

        const responses = await Promise.all(
          purchasedProductIds.slice(0, 3).map((productId) =>
            storefrontFetch(`/products/${encodeURIComponent(productId)}/upsell`, {
              query: { limit },
            }).catch(() => null),
          ),
        );

        if (cancelled) {
          return;
        }

        const recommendationMap = new Map<string, Product>();

        responses.forEach((response) => {
          const items = Array.isArray(response?.data) ? response.data : [];

          items.forEach((item: StorefrontProductPayload) => {
            const normalized = normalizeRecommendation(item);
            if (!normalized.id || purchasedProductIds.includes(normalized.id)) {
              return;
            }

            if (!recommendationMap.has(normalized.id)) {
              recommendationMap.set(normalized.id, normalized);
            }
          });
        });

        setRecommendedProducts(Array.from(recommendationMap.values()).slice(0, limit));
      } catch (fetchError) {
        if (!cancelled) {
          console.error('Failed to load post-purchase upsell recommendations:', fetchError);
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
  }, [isMarketplacePreview, limit, postPurchaseUpsellEnabled, purchasedProductIds]);

  const fallbackRecommendations = useMemo(
    () =>
      fallbackProducts
        .filter((product) => !purchasedProductIds.includes(product.id))
        .slice(0, limit),
    [fallbackProducts, limit, purchasedProductIds],
  );

  const displayProducts = recommendedProducts.length > 0 ? recommendedProducts : fallbackRecommendations;
  const recommendationSource = recommendedProducts.length > 0 ? 'upsell' : 'fallback';
  const shouldShowLoading =
    recommendationsLoading || (displayProducts.length === 0 && fallbackLoading);

  const heading =
    settings?.title ||
    String(
      copy['postPurchaseUpsellTitle'] ||
        (isPcHub
          ? (prefersArabicCopy ? 'إضافات تكمل التجهيزة' : 'Add-ons that complete the setup')
          : isBoutiqueAfterglow
            ? (prefersArabicCopy ? 'قطع تكمل الإطلالة' : 'Pieces that complete the look')
          : 'Complete your order with one more pick'),
    );
  const subtitle =
    settings?.subtitle ||
    String(
      copy['postPurchaseUpsellDescription'] ||
        (isPcHub
          ? (prefersArabicCopy
            ? 'شاشات وملحقات وترقيات أقرب لنفس قرار الشراء حتى تكمل الطلب من نفس الرحلة.'
            : 'Displays, accessories, and upgrades that stay aligned with the same buying decision.')
          : isBoutiqueAfterglow
            ? (prefersArabicCopy
              ? 'إكسسوارات وطبقات خفيفة تبقى قريبة من نفس الجو الهادئ للطلب الحالي.'
              : 'Light accessories and layers that stay close to the same calm boutique mood.')
          : 'Relevant add-ons based on what the customer just ordered, ready for one more conversion step.'),
    );
  const badge =
    settings?.badge ||
    String(
      copy['postPurchaseUpsellBadge'] ||
        (isPcHub
          ? (prefersArabicCopy ? 'ترشيحات ما بعد الاعتماد' : 'Post-order picks')
          : isBoutiqueAfterglow
            ? (prefersArabicCopy ? 'تنسيقات إضافية' : 'Styling add-ons')
          : 'Post-purchase upsell'),
    );
  const ctaLabel =
    settings?.ctaLabel ||
    String(
      copy['quickAddLabel'] ||
        (isPcHub
          ? (prefersArabicCopy ? 'أضف بسرعة' : 'Quick add')
          : isBoutiqueAfterglow
            ? (prefersArabicCopy ? 'أضيفيها للسلة' : 'Add to cart')
            : 'Add to cart'),
    );
  const chooseOptionsLabel =
    settings?.chooseOptionsLabel ||
    String(
      copy['chooseOptionsLabel'] ||
        (isPcHub
          ? (prefersArabicCopy ? 'راجع الخيارات' : 'Review options')
          : isBoutiqueAfterglow
            ? (prefersArabicCopy ? 'شاهدي التفاصيل' : 'View details')
            : 'Choose options'),
    );
  const variantChoicesLabel =
    settings?.variantChoicesLabel ||
    (isPcHub
      ? (prefersArabicCopy ? 'خيارات الجهاز' : 'Device options')
      : (prefersArabicCopy
        ? chooseOptionsLabel.includes('الحجم')
          ? 'أحجام متاحة'
          : 'مقاسات متاحة'
        : 'Available sizes'));
  const emptyStateTitle =
    settings?.emptyStateTitle ||
    (isPcHub
      ? (prefersArabicCopy ? 'لا توجد إضافات مناسبة لهذه التجهيزة الآن.' : 'No matching add-ons for this setup yet.')
      : isBoutiqueAfterglow
        ? (prefersArabicCopy ? 'لا توجد قطع مكملة مناسبة الآن.' : 'No matching finishing pieces right now.')
      : 'No upsell recommendations yet.');
  const quickAddLabel = isBoutiqueAfterglow
    ? (prefersArabicCopy ? 'إضافة سريعة' : 'Quick add')
    : prefersArabicCopy
      ? 'إضافة مباشرة'
      : 'Quick add';
  const fallbackTagLabel = isBoutiqueAfterglow
    ? (prefersArabicCopy ? 'اختيار من روزا' : 'Rosa pick')
    : prefersArabicCopy
      ? 'اقتراح مناسب'
      : 'Recommended';
  const emptyStateClassName = isPcHub
    ? 'rounded-[2rem] border border-dashed border-[#ddc97f] bg-[linear-gradient(180deg,#fffef8_0%,#fff6df_100%)] px-6 py-10 text-center shadow-[0_20px_55px_-44px_rgba(15,23,42,0.16)]'
    : isBoutiqueAfterglow
      ? 'rounded-[2rem] border border-dashed border-[#ead8cf] bg-[linear-gradient(180deg,#fffdfc_0%,#fff6f2_100%)] px-6 py-10 text-center shadow-[0_20px_55px_-44px_rgba(107,33,49,0.08)]'
    : 'rounded-[2rem] border border-dashed border-border bg-card/40 px-6 py-10 text-center';
  const emptyStateIconClassName = isPcHub
    ? 'mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#111827] text-[#f8d76a]'
    : isBoutiqueAfterglow
      ? 'mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#fff1ed] text-[#8f4d41]'
    : 'mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary';
  const sectionClassName = isPcHub
    ? 'space-y-6 rounded-[2.1rem] border border-[#e4d4a0] bg-[linear-gradient(180deg,#fffef9_0%,#fff6e1_100%)] p-6 text-start shadow-[0_28px_85px_-60px_rgba(15,23,42,0.28)] md:p-8'
    : isBoutiqueAfterglow
      ? 'space-y-6 rounded-[2.1rem] border border-[#ead8cf] bg-[linear-gradient(180deg,#fffefd_0%,#fff7f4_100%)] p-6 text-start shadow-[0_28px_85px_-60px_rgba(107,33,49,0.12)] md:p-8'
    : 'space-y-6 rounded-[2rem] border border-border/60 bg-card/50 p-6 text-start shadow-[0_25px_70px_-55px_rgba(15,23,42,0.55)] md:p-8';
  const headerBadgeClassName = isPcHub
    ? 'inline-flex items-center gap-2 rounded-full border border-[#111827]/10 bg-[#111827] px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-[#f8d76a]'
    : isBoutiqueAfterglow
      ? 'inline-flex items-center gap-2 rounded-full border border-[#ead8cf] bg-[#fff1ed] px-3.5 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-[#8f4d41]'
    : 'inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-primary';
  const skeletonCardClassName = isPcHub
    ? 'flex min-h-[32rem] flex-col overflow-hidden rounded-[1.6rem] border border-[#e7dbb4] bg-white p-4 shadow-[0_18px_55px_-42px_rgba(15,23,42,0.18)] animate-pulse'
    : isBoutiqueAfterglow
      ? 'flex min-h-[32rem] flex-col overflow-hidden rounded-[1.6rem] border border-[#ead8cf] bg-white p-4 shadow-[0_18px_55px_-42px_rgba(107,33,49,0.08)] animate-pulse'
    : 'flex min-h-[32rem] flex-col overflow-hidden rounded-[1.5rem] border border-border bg-background p-4 animate-pulse';
  const skeletonMediaClassName = isPcHub
    ? 'aspect-[4/4.2] rounded-[1.25rem] bg-[linear-gradient(180deg,#fff8dd_0%,#f3efe4_100%)]'
    : isBoutiqueAfterglow
      ? 'aspect-[4/4.6] rounded-[1.25rem] bg-[linear-gradient(180deg,#fff4ef_0%,#f6ede9_100%)]'
    : 'aspect-[4/3.9] rounded-[1.1rem] bg-muted';
  const cardClassName = isPcHub
    ? 'group flex h-full min-h-[32rem] flex-col overflow-hidden rounded-[1.55rem] border border-[#e7dbb4] bg-white shadow-[0_18px_55px_-42px_rgba(15,23,42,0.22)] transition-all duration-300 hover:-translate-y-1 hover:border-[#111827]/20 hover:shadow-[0_24px_62px_-36px_rgba(15,23,42,0.28)]'
    : isBoutiqueAfterglow
      ? 'group flex h-full min-h-[32rem] flex-col overflow-hidden rounded-[1.55rem] border border-[#ead8cf] bg-white shadow-[0_18px_55px_-42px_rgba(107,33,49,0.1)] transition-all duration-300 hover:-translate-y-1 hover:border-[#d5ab9b] hover:shadow-[0_24px_62px_-36px_rgba(107,33,49,0.14)]'
    : 'group flex h-full min-h-[32rem] flex-col overflow-hidden rounded-[1.35rem] border border-border/80 bg-background shadow-[0_18px_45px_-38px_rgba(15,23,42,0.4)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-[0_22px_55px_-34px_rgba(15,23,42,0.48)]';
  const mediaClassName = isPcHub
    ? 'relative aspect-[4/4.2] overflow-hidden border-b border-[#efe4c1] bg-[radial-gradient(circle_at_top,#fff2bf_0%,#fffbef_42%,#f5f2e9_100%)]'
    : isBoutiqueAfterglow
      ? 'relative aspect-[4/4.6] overflow-hidden border-b border-[#efe2dc] bg-[radial-gradient(circle_at_top,#fff2ee_0%,#fff8f5_50%,#f6f0ec_100%)]'
    : 'relative aspect-[4/3.9] overflow-hidden border-b border-border/60 bg-[linear-gradient(180deg,hsl(var(--secondary)/0.45),hsl(var(--background)))]';
  const imageClassName = isPcHub
    ? 'h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-[1.04]'
    : isBoutiqueAfterglow
      ? 'h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]'
    : 'h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]';
  const categoryChipClassName = isPcHub
    ? 'inline-flex rounded-full bg-[#111827] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#f8d76a] backdrop-blur'
    : isBoutiqueAfterglow
      ? 'inline-flex rounded-full bg-[#fff8f5] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#8f4d41] backdrop-blur'
    : 'inline-flex rounded-full bg-background/90 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-foreground backdrop-blur';
  const discountChipClassName = isPcHub
    ? 'inline-flex rounded-full border border-[#e6d18b] bg-white/92 px-2.5 py-1 text-xs font-black text-[#8a5a06] shadow-sm'
    : isBoutiqueAfterglow
      ? 'inline-flex rounded-full border border-[#f0c7ba] bg-white/92 px-2.5 py-1 text-xs font-black text-[#b06456] shadow-sm'
    : 'inline-flex rounded-full bg-accent px-2.5 py-1 text-xs font-black text-accent-foreground shadow-sm';
  const metaPrimaryChipClassName = isPcHub
    ? 'inline-flex rounded-full bg-[#fff3cf] px-2.5 py-1 font-bold text-[#111827]'
    : isBoutiqueAfterglow
      ? 'inline-flex rounded-full bg-[#fff1ed] px-2.5 py-1 font-bold text-[#6d3d48]'
    : 'inline-flex rounded-full bg-secondary px-2.5 py-1 font-bold text-secondary-foreground';
  const metaSecondaryChipClassName = isPcHub
    ? 'inline-flex rounded-full border border-[#e5d7a3] bg-white px-2.5 py-1 font-medium text-[#667085]'
    : isBoutiqueAfterglow
      ? 'inline-flex rounded-full border border-[#ead8cf] bg-white px-2.5 py-1 font-medium text-[#8f6d74]'
    : 'inline-flex rounded-full border border-border px-2.5 py-1 font-medium text-muted-foreground';
  const factChipClassName = isPcHub
    ? 'inline-flex rounded-full border border-[#efe1b3] bg-[#fffcf5] px-2.5 py-1 text-[11px] font-semibold text-[#475467]'
    : isBoutiqueAfterglow
      ? 'inline-flex rounded-full border border-[#ead8cf] bg-[#fffaf8] px-2.5 py-1 text-[11px] font-semibold text-[#72545b]'
    : 'inline-flex rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground';
  const ctaButtonClassName = isPcHub
    ? 'inline-flex flex-1 items-center justify-center gap-2 rounded-[1rem] bg-[#111827] px-4 py-3 text-sm font-black text-[#f8d76a] transition-colors hover:bg-[#0b1220]'
    : isBoutiqueAfterglow
      ? 'inline-flex flex-1 items-center justify-center gap-2 rounded-[1rem] bg-[#6d3d48] px-4 py-3 text-sm font-black text-white transition-colors hover:bg-[#8f4d41]'
    : 'inline-flex flex-1 items-center justify-center gap-2 rounded-[0.95rem] bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90';
  const arrowButtonClassName = isPcHub
    ? 'inline-flex h-11 w-11 items-center justify-center rounded-[1rem] border border-[#e2d399] bg-[#fff6db] text-[#111827] transition-colors group-hover:border-[#111827] group-hover:bg-[#111827] group-hover:text-[#f8d76a]'
    : isBoutiqueAfterglow
      ? 'inline-flex h-11 w-11 items-center justify-center rounded-[1rem] border border-[#ead8cf] bg-[#fff8f5] text-[#6d3d48] transition-colors group-hover:border-[#8f4d41] group-hover:bg-[#8f4d41] group-hover:text-white'
    : 'inline-flex h-11 w-11 items-center justify-center rounded-[1rem] border border-border bg-background text-foreground transition-colors group-hover:border-primary group-hover:text-primary';
  const recommendationGridClassName = isPcHub
    ? getPcHubRecommendationGridClassName(displayProducts.length || limit)
    : isBoutiqueAfterglow
      ? 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'
    : 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4';

  useEffect(() => {
    if (!orderReference || shouldShowLoading || displayProducts.length === 0) {
      return;
    }

    void trackConversionSuiteUsage(storefrontSettings, {
      feature: 'post_purchase_upsell_view',
      dedupeKey: `post-purchase-upsell:${orderReference}:${recommendationSource}`,
      metadata: {
        orderNumber: orderReference,
        source: recommendationSource,
        recommendationCount: displayProducts.length,
        purchaseProductCount: purchasedProductIds.length || undefined,
      },
    });
  }, [
    displayProducts.length,
    orderReference,
    purchasedProductIds.length,
    recommendationSource,
    shouldShowLoading,
    storefrontSettings,
  ]);

  if (error && displayProducts.length === 0) {
    return null;
  }

  if (!postPurchaseUpsellEnabled) {
    return null;
  }

  if (!shouldShowLoading && displayProducts.length === 0) {
    return (
      <section className={emptyStateClassName}>
        <div className={emptyStateIconClassName}>
          <Sparkles size={18} />
        </div>
        <h3 className="text-lg font-bold text-foreground">{emptyStateTitle}</h3>
      </section>
    );
  }

  return (
    <section className={sectionClassName}>
      <div className="space-y-3">
        <span className={headerBadgeClassName}>
          <Sparkles size={14} />
          {badge}
        </span>
        <div className="space-y-2">
          <h2 className="font-heading text-2xl font-black tracking-tight text-foreground md:text-3xl">
            {heading}
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            {subtitle}
          </p>
        </div>
      </div>

      {shouldShowLoading ? (
      <div className={recommendationGridClassName}>
        {Array.from({ length: limit }).map((_, index) => (
          <div
            key={`post-purchase-skeleton-${index}`}
            className={skeletonCardClassName}
          >
            <div className={skeletonMediaClassName} />
            <div className="mt-4 space-y-3">
              <div className="h-4 w-1/2 rounded bg-muted" />
              <div className="h-5 w-4/5 rounded bg-muted" />
                <div className="h-10 rounded-xl bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={recommendationGridClassName}>
          {displayProducts.map((product, index) => {
            const productRecord = product as Record<string, unknown>;
            const productPath = buildStorefrontPath(
              location.pathname,
              `/product/${product.slug || product.id}`,
              location.search,
            );
            const numericPrice =
              typeof product.price === 'string' ? parseFloat(product.price) : Number(product.price || 0);
            const numericComparePrice =
              typeof product.comparePrice === 'string'
                ? parseFloat(product.comparePrice)
                : Number(product.comparePrice || 0);
            const hasDiscount =
              Number.isFinite(numericComparePrice) && numericComparePrice > numericPrice;
            const hasVariantChoices = Boolean(product.productVariants?.length || product.variants?.length);
            const decisionBadge = String(
              (isBoutiqueAfterglow
                ? productRecord['editorialBadge']
                : productRecord['decisionBadge']) ||
                product.category?.name ||
                fallbackTagLabel,
            ).trim();
            const modelLabel = String(productRecord['modelLabel'] || '').trim();
            const commandFacts = Array.isArray(productRecord['commandFacts'])
              ? (productRecord['commandFacts'] as Array<Record<string, unknown>>)
                  .map((fact) => ({
                    label: String(fact?.label || '').trim(),
                    value: String(fact?.value || '').trim(),
                  }))
                  .filter((fact) => fact.label && fact.value)
                  .slice(0, 2)
              : [];
            const boutiqueFacts = Array.isArray(productRecord['boutiqueFacts'])
              ? (productRecord['boutiqueFacts'] as Array<Record<string, unknown>>)
                  .map((fact) => ({
                    label: String(fact?.label || '').trim(),
                    value: String(fact?.value || '').trim(),
                  }))
                  .filter((fact) => fact.label && fact.value)
                  .slice(0, 2)
              : [];
            const detailFacts = isBoutiqueAfterglow ? boutiqueFacts : commandFacts;
            const cardDescription =
              String(
                (isBoutiqueAfterglow ? productRecord['editorialNote'] : '') ||
                  product.description ||
              (isPcHub
                ? 'إضافة تكمل الجهاز أو المكتب من غير ما تطوّل قرار الشراء.'
                : isBoutiqueAfterglow
                  ? 'قطعة أخف تكمل الإطلالة من غير ما تكسر هدوء الاختيارات.'
                  : 'One more relevant product to increase the order value right after checkout.'),
              );

            const sanitizedCardDescription = truncateProductCopy(
              sanitizeProductCopy(cardDescription) || cardDescription,
              isBoutiqueAfterglow ? 150 : 132,
            );

            const handleProductClick = () => {
              if (!orderReference) {
                return;
              }

              void trackConversionSuiteUsage(storefrontSettings, {
                feature: 'post_purchase_upsell_click',
                metadata: {
                  orderNumber: orderReference,
                  productId: product.id,
                  index: index + 1,
                  source: recommendationSource,
                },
              });
            };

            const handleAddToCart = (event: React.MouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
              event.stopPropagation();

              if (!orderReference) {
                if (hasVariantChoices) {
                  navigate(productPath);
                } else {
                  addItem({
                    productId: product.id,
                    name: product.name,
                    price: numericPrice,
                    basePrice: numericPrice,
                    quantity: 1,
                    imageUrl: getPrimaryProductImage(product),
                    volumeDiscounts: getProductVolumeDiscounts(product),
                  });
                }
                return;
              }

              if (hasVariantChoices) {
                void trackConversionSuiteUsage(storefrontSettings, {
                  feature: 'post_purchase_upsell_click',
                  metadata: {
                    orderNumber: orderReference,
                    productId: product.id,
                    index: index + 1,
                    source: recommendationSource,
                    interactionType: 'choose_options',
                  },
                });
                navigate(productPath);
                return;
              }

              addItem({
                productId: product.id,
                name: product.name,
                price: numericPrice,
                basePrice: numericPrice,
                quantity: 1,
                imageUrl: getPrimaryProductImage(product),
                volumeDiscounts: getProductVolumeDiscounts(product),
              });

              trackAddToCartEvent({
                id: product.id,
                name: product.name,
                price: numericPrice,
                quantity: 1,
                category: product.category?.name,
              });

              void trackConversionSuiteUsage(storefrontSettings, {
                feature: 'post_purchase_upsell_add_to_cart',
                metadata: {
                  orderNumber: orderReference,
                  productId: product.id,
                  index: index + 1,
                  price: numericPrice,
                  source: recommendationSource,
                },
              });
            };

            return (
              <Link
                key={product.id}
                to={productPath}
                onClick={handleProductClick}
                className={cardClassName}
              >
                <div className={mediaClassName}>
                  <StorefrontProductImage
                    candidates={buildStorefrontImageCandidates(
                      product.images,
                      product["mainImage"],
                    )}
                    alt={product.name}
                    loading="lazy"
                    requestedWidth={420}
                    responsiveWidths={[240, 320, 420, 560]}
                    responsiveSizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 25vw"
                    imageQuality={72}
                    width="360"
                    height="420"
                    className={imageClassName}
                    fallback={(
                      <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,hsl(var(--background)),hsl(var(--muted))_68%)] px-4 text-center text-sm font-semibold text-foreground/80">
                        {product.name}
                      </div>
                    )}
                  />
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                    <span className={categoryChipClassName}>
                      {decisionBadge}
                    </span>
                    {hasDiscount ? (
                      <span className={discountChipClassName}>
                        -{Math.round(((numericComparePrice - numericPrice) / numericComparePrice) * 100)}%
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex h-full flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className={metaPrimaryChipClassName}>
                      {modelLabel || decisionBadge}
                    </span>
                    <span className={metaSecondaryChipClassName}>
                      {hasVariantChoices ? variantChoicesLabel : quickAddLabel}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="line-clamp-2 font-heading text-base font-black leading-7 text-foreground">
                      {product.name}
                    </h3>
                    <p className={`text-sm leading-6 text-muted-foreground ${isBoutiqueAfterglow ? 'line-clamp-2' : 'line-clamp-1'}`}>
                      {sanitizedCardDescription}
                    </p>
                  </div>

                  {detailFacts.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {detailFacts.map((fact) => (
                        <span key={`${product.id}-${fact.label}`} className={factChipClassName}>
                          {fact.label}: {fact.value}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-auto space-y-3">
                    <div dir="ltr" className="flex items-end gap-2 font-sans">
                      <span className={`text-[1.15rem] font-black ${isBoutiqueAfterglow ? 'text-[#6d3d48]' : 'text-primary'}`}>
                        {formatStorefrontCurrency(numericPrice, currency)}
                      </span>
                      {hasDiscount ? (
                        <span className="pb-0.5 text-sm text-muted-foreground line-through">
                          {formatStorefrontCurrency(numericComparePrice, currency)}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleAddToCart}
                        className={ctaButtonClassName}
                      >
                        <ShoppingCart size={16} />
                        {hasVariantChoices ? chooseOptionsLabel : ctaLabel}
                      </button>
                      <span className={arrowButtonClassName}>
                        <ArrowUpRight size={17} />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default PostPurchaseUpsellBlock;
