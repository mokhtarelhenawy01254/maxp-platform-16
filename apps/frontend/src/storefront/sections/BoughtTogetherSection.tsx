import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Check, PackagePlus, Plus, ShoppingBag } from 'lucide-react';
import { storefrontFetch } from '../../utils/storefrontApi';
import { useStorefrontSettings } from '../hooks/useStorefrontSettings';
import { useProduct } from '../hooks/useProduct';
import type { Product, ProductVariant } from '../hooks/useProducts';
import { isMarketplaceThemePreview } from '../preview/previewContext';
import {
  getThemePreviewProductRecommendations,
  resolveActiveThemePreviewDataset,
} from '../preview/themePreviewData';
import { useCartStore } from '../store/useCartStore';
import { usePdpSelectionStore } from '../store/usePdpSelectionStore';
import {
  getStorefrontMarketplaceAppSettings,
  isStorefrontMarketplaceAppEnabled,
} from '../utils/marketplaceApps';
import { buildStorefrontPath } from '../utils/paths';
import { formatStorefrontCurrency } from '../utils/currency';
import StorefrontProductImage from '../components/StorefrontProductImage';
import VariantSelector from '../components/VariantSelector';
import {
  getProductImageCandidates,
  getPrimaryProductImage,
} from '../utils/productImages';
import { trackStorefrontAppUsage } from '../utils/appUsageTracking';
import { getProductVolumeDiscounts } from '../utils/volumeDiscounts';
import { getVariantAttributes } from '../utils/variants';
import { resolveSectionVariant } from '../variants';
import { useStorefrontTheme } from '../engine/ThemeProvider';
import { resolveSectionContentAlign } from '../utils/contentAlignment';

interface BoughtTogetherSectionProps {
  section?: {
    variant?: string;
    [key: string]: unknown;
  };
  settings?: {
    title?: string;
    subtitle?: string;
    limit?: number | string;
    addBundleText?: string;
    totalLabel?: string;
    currentProductLabel?: string;
    recommendationLabel?: string;
    quickAddText?: string;
    chooseOptionsText?: string;
    bundleVariantHint?: string;
    contentAlign?: string;
    [key: string]: unknown;
  };
}

type BoughtTogetherVariant =
  | 'stacked'
  | 'compact'
  | 'editorial'
  | 'complete-look'
  | 'pairing-rail'
  | 'gift-pairings';

const BOUGHT_TOGETHER_SECTION_FAMILY = 'BoughtTogetherSection';

const parsePositiveNumber = (value: unknown, fallback: number) => {
  const numericValue =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback;
  }

  return Math.round(numericValue);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const parseProductMetadata = (value: unknown): Record<string, unknown> => {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const getProductVariants = (product: Product): ProductVariant[] =>
  product.productVariants || product.variants || [];

const hasVariants = (product: Product) => Boolean(getProductVariants(product).length);

const SIZE_ATTRIBUTE_KEYS = new Set(['size', 'sizes', 'الحجم', 'المقاس', 'المقاسات']);
const COLOR_ATTRIBUTE_KEYS = new Set([
  'color',
  'colors',
  'colour',
  'colours',
  'لون',
  'اللون',
  'الالوان',
  'الألوان',
  'الوان',
  'ألوان',
]);

const getVariantAttributeLabels = (
  product: Product,
  prefersArabicCopy: boolean,
): {
  shortLabel: string;
  selectionHint: string;
  firstSelectionError: string;
  completionErrorPrefix: string;
} => {
  const attributeKeys = Array.from(
    new Set(
      getProductVariants(product).flatMap((variant) =>
        Object.keys(getVariantAttributes(variant)).map((key) => key.trim().toLowerCase()),
      ),
    ),
  );
  const hasSize = attributeKeys.some((key) => SIZE_ATTRIBUTE_KEYS.has(key));
  const hasColor = attributeKeys.some((key) => COLOR_ATTRIBUTE_KEYS.has(key));

  if (prefersArabicCopy) {
    if (hasSize && !hasColor) {
      return {
        shortLabel: 'المقاس',
        selectionHint: 'اختاري المقاس لكل إضافة من نفس الكارت قبل إضافة الباقة.',
        firstSelectionError: 'اختَر المقاس أولًا',
        completionErrorPrefix: 'أكمل اختيار المقاس لـ',
      };
    }

    if (hasColor && !hasSize) {
      return {
        shortLabel: 'اللون',
        selectionHint: 'اختاري اللون لكل إضافة من نفس الكارت قبل إضافة الباقة.',
        firstSelectionError: 'اختَر اللون أولًا',
        completionErrorPrefix: 'أكمل اختيار اللون لـ',
      };
    }

    return {
      shortLabel: 'اللون أو المقاس',
      selectionHint: 'اختَر اللون أو المقاس لكل إضافة من نفس الكارت قبل إضافة الباقة.',
      firstSelectionError: 'اختَر اللون أو المقاس أولًا',
      completionErrorPrefix: 'أكمل اختيار اللون أو المقاس لـ',
    };
  }

  if (hasSize && !hasColor) {
    return {
      shortLabel: 'size',
      selectionHint: 'Choose the size for each add-on from the same card before adding the bundle.',
      firstSelectionError: 'Select the size first',
      completionErrorPrefix: 'Finish choosing the size for',
    };
  }

  if (hasColor && !hasSize) {
    return {
      shortLabel: 'color',
      selectionHint: 'Choose the color for each add-on from the same card before adding the bundle.',
      firstSelectionError: 'Select the color first',
      completionErrorPrefix: 'Finish choosing the color for',
    };
  }

  return {
    shortLabel: 'color or size',
    selectionHint: 'Choose the color or size for each add-on from the same card before adding the bundle.',
    firstSelectionError: 'Select the color or size first',
    completionErrorPrefix: 'Finish choosing the color or size for',
  };
};

const buildDefaultVariantSelection = (product: Product): Record<string, string> => {
  const firstVariant = getProductVariants(product)[0];
  return firstVariant ? getVariantAttributes(firstVariant) : {};
};

const resolveVariantFromAttributes = (
  variants: ProductVariant[],
  attributes: Record<string, string>,
) => {
  if (!variants.length || Object.keys(attributes).length === 0) {
    return null;
  }

  return (
    variants.find((variant) => {
      const variantAttributes = getVariantAttributes(variant);
      const variantEntries = Object.entries(variantAttributes);

      return (
        variantEntries.length === Object.keys(attributes).length &&
        variantEntries.every(([key, value]) => attributes[key] === value)
      );
    }) || null
  );
};

const parseVariantSettings = (
  product: Product,
): {
  styles?: Record<string, unknown> | null;
  attributeImages?: Record<string, unknown> | null;
  attributeColors?: Record<string, unknown> | null;
} | null => {
  const metadata = parseProductMetadata(product.metadata);
  const variantSettings = isRecord(metadata['variantSettings'])
    ? metadata['variantSettings']
    : {};

  const styles = isRecord(variantSettings['styles']) ? variantSettings['styles'] : null;
  const attributeImages = isRecord(variantSettings['attributeImages'])
    ? variantSettings['attributeImages']
    : null;
  const attributeColors = isRecord(variantSettings['attributeColors'])
    ? variantSettings['attributeColors']
    : null;

  if (!styles && !attributeImages && !attributeColors) {
    return null;
  }

  return {
    styles,
    attributeImages,
    attributeColors,
  };
};

const normalizeVariant = (
  value: unknown,
  fallback: BoughtTogetherVariant,
): BoughtTogetherVariant => {
  return resolveSectionVariant<BoughtTogetherVariant>(
    BOUGHT_TOGETHER_SECTION_FAMILY,
    value,
    fallback,
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

const getWrapperClassName = (variant: BoughtTogetherVariant) => {
  switch (variant) {
    case 'compact':
      return 'rounded-[1.2rem] border border-border bg-background py-10';
    case 'editorial':
      return 'rounded-[1.8rem] border border-border bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--secondary)/0.28))] py-12 shadow-[0_28px_90px_-60px_hsl(var(--primary)/0.35)]';
    case 'complete-look':
      return 'rounded-[2rem] border border-[#ead9d8] bg-[linear-gradient(180deg,#fffdfc_0%,#fff7f4_100%)] py-12 shadow-[0_30px_96px_-68px_rgba(107,33,49,0.18)]';
    case 'pairing-rail':
      return 'rounded-[1.7rem] border border-[#ead9d8] bg-[#fffdfb] py-10 shadow-[0_22px_70px_-62px_rgba(107,33,49,0.12)]';
    case 'gift-pairings':
      return 'rounded-[1.8rem] border border-[#eadfd7] bg-[linear-gradient(180deg,#fffdfa_0%,#fff8f4_100%)] py-10 shadow-[0_24px_72px_-60px_rgba(61,41,44,0.16)]';
    default:
      return 'rounded-[1.5rem] border border-border bg-card py-12';
  }
};

const getCardClassName = (
  variant: BoughtTogetherVariant,
  selected: boolean,
  disabled: boolean,
) => {
  const stateClassName = disabled
    ? 'opacity-75'
    : selected
      ? 'border-primary/45 shadow-[0_16px_40px_-24px_hsl(var(--primary)/0.25)] ring-1 ring-primary/25'
      : 'border-border/80 hover:border-primary/30';

  switch (variant) {
    case 'compact':
      return `rounded-2xl border bg-card p-3 sm:p-4 transition-all duration-300 ${stateClassName}`;
    case 'editorial':
      return `rounded-[1.5rem] border bg-card/95 p-3.5 sm:p-5 transition-all duration-300 ${stateClassName}`;
    case 'complete-look':
      return `rounded-[1.5rem] border bg-gradient-to-b from-card to-card/60 p-3.5 sm:p-5 shadow-[0_20px_50px_-36px_rgba(107,33,49,0.12)] transition-all duration-300 ${stateClassName}`;
    case 'pairing-rail':
      return `rounded-[1.35rem] border bg-card p-3 sm:p-4 shadow-[0_14px_36px_-34px_rgba(107,33,49,0.12)] transition-all duration-300 ${stateClassName}`;
    case 'gift-pairings':
      return `rounded-[1.4rem] border bg-gradient-to-b from-card to-card/60 p-3.5 sm:p-4 shadow-[0_16px_40px_-34px_rgba(61,41,44,0.14)] transition-all duration-300 ${stateClassName}`;
    default:
      return `rounded-[1.4rem] border bg-card p-3.5 sm:p-5 transition-all duration-300 ${stateClassName}`;
  }
};

const BoughtTogetherSkeleton: React.FC = () => (
  <section className="w-full border-t border-border bg-background py-12 md:py-16">
    <div className="container px-4 md:px-6">
      <div className="rounded-[1.5rem] border border-border bg-card p-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-4 w-28 rounded bg-muted" />
          <div className="h-8 w-72 rounded bg-muted" />
          <div className="h-4 w-96 max-w-full rounded bg-muted" />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`bundle-skeleton-${index}`}
              className="rounded-[1.25rem] border border-border bg-background p-4"
            >
              <div className="aspect-square rounded-xl bg-muted" />
              <div className="mt-4 space-y-2">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-4 w-2/3 rounded bg-muted" />
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-10 rounded-xl bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

const BoughtTogetherSection: React.FC<BoughtTogetherSectionProps> = ({
  section,
  settings,
}) => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { settings: storefrontSettings } = useStorefrontSettings();
  const { theme } = useStorefrontTheme();
  const { product, isLoading: productLoading } = useProduct(id);
  const previewDataset = useMemo(
    () => resolveActiveThemePreviewDataset(location.search),
    [location.search],
  );
  const isMarketplacePreview = useMemo(
    () => isMarketplaceThemePreview(location.search),
    [location.search],
  );
  const addItem = useCartStore((state) => state.addItem);
  const currentPdpSelection = usePdpSelectionStore(
    (state) => state.selection,
    (a, b) => {
      if (a === b) return true;
      if (!a || !b) return false;
      return (
        a.productId === b.productId &&
        a.variantId === b.variantId &&
        a.unitPrice === b.unitPrice &&
        a.isSelectionReady === b.isSelectionReady &&
        a.imageUrl === b.imageUrl
      );
    },
  );
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedAttributesByProduct, setSelectedAttributesByProduct] = useState<
    Record<string, Record<string, string>>
  >({});

  const conversionEnabled = isStorefrontMarketplaceAppEnabled(
    storefrontSettings,
    'conversion-suite',
  );
  const conversionSettings = getStorefrontMarketplaceAppSettings(
    storefrontSettings,
    'conversion-suite',
  );
  const modules = (conversionSettings['modules'] as Record<string, any> | undefined) || {};
  const ui = (conversionSettings['ui'] as Record<string, any> | undefined) || {};
  const copy = (conversionSettings['copy'] as Record<string, any> | undefined) || {};
  const boughtTogetherEnabled = conversionEnabled && modules['boughtTogether'] !== false;
  const limit = parsePositiveNumber(settings?.limit, 3);
  const currency =
    storefrontSettings?.storefront?.settings?.currency ||
    storefrontSettings?.company?.currency ||
    'EGP';
  const prefersArabicCopy = theme.direction === 'rtl';
  const isPcHubTheme = theme.id === 'pc-hub-eg';
  const isWomenFashionTheme = theme.id === 'women-fashion-eg';
  const isSoleaFemmeTheme = theme.id === 'solea-femme';
  const productBundleTitle =
    typeof product?.['bundleTitle'] === 'string' && product['bundleTitle'].trim()
      ? product['bundleTitle'].trim()
      : undefined;
  const productBundleSubtitle =
    typeof product?.['bundleSubtitle'] === 'string' && product['bundleSubtitle'].trim()
      ? product['bundleSubtitle'].trim()
      : undefined;
  const sectionVariant = normalizeVariant(
    section?.variant,
    normalizeVariant(ui['boughtTogetherStyle'], 'stacked'),
  );
  const isContentCentered =
    resolveSectionContentAlign(settings?.contentAlign) === 'center';
  const title = resolveDirectionalCopy({
    value: (isPcHubTheme ? productBundleTitle : undefined) ?? settings?.title ?? copy['boughtTogetherTitle'],
    englishFallback: 'Frequently bought together',
    arabicFallback: 'يُشترى معه كثيرًا',
    prefersArabicCopy,
    legacyEnglishValues: ['Complete the setup'],
  });
  const subtitle = resolveDirectionalCopy({
    value:
      (isPcHubTheme ? productBundleSubtitle : undefined) ??
      settings?.subtitle ??
      copy['boughtTogetherDescription'],
    englishFallback: 'Curated add-ons that pair naturally with this product.',
    arabicFallback: 'اقتراحات مختارة بعناية لتكمل هذا المنتج وتزيد قيمة الطلب.',
    prefersArabicCopy,
    legacyEnglishValues: [
      'Popular pairings for this product',
      'Fast accessories and matching picks to add in the same flow.',
    ],
  });
  const addBundleText = resolveDirectionalCopy({
    value: settings?.addBundleText ?? copy['bundleAddLabel'],
    englishFallback: 'Add selected bundle',
    arabicFallback: 'أضف الباقة المحددة',
    prefersArabicCopy,
  });
  const totalLabel = resolveDirectionalCopy({
    value: settings?.totalLabel ?? copy['bundleTotalLabel'],
    englishFallback: 'Bundle total',
    arabicFallback: 'إجمالي الباقة',
    prefersArabicCopy,
  });
  const currentProductLabel = resolveDirectionalCopy({
    value: settings?.currentProductLabel ?? copy['bundleCurrentLabel'],
    englishFallback: 'Current product',
    arabicFallback: 'المنتج الحالي',
    prefersArabicCopy,
  });
  const recommendationLabel = resolveDirectionalCopy({
    value: settings?.recommendationLabel ?? copy['bundleRecommendationLabel'],
    englishFallback: 'Recommended add-on',
    arabicFallback: 'اقتراح مكمل',
    prefersArabicCopy,
  });
  const quickAddText = resolveDirectionalCopy({
    value: settings?.quickAddText ?? copy['quickAddLabel'],
    englishFallback: 'Quick add',
    arabicFallback: 'إضافة سريعة',
    prefersArabicCopy,
  });
  const bundleVariantHint = resolveDirectionalCopy({
    value: settings?.bundleVariantHint ?? copy['bundleVariantHint'],
    englishFallback:
      'Choose the color or size for each add-on from the same card before adding the bundle.',
    arabicFallback:
      'اختاري المقاس أو اللون للإضافات المحددة قبل إضافة الباقة.',
    prefersArabicCopy,
    legacyEnglishValues: [
      'Products with variants still need to be configured from their own product page.',
      'Choose the color or size for each add-on from the same card before adding the bundle.',
    ],
  });

  useEffect(() => {
    if (!boughtTogetherEnabled || !product?.id) {
      setRecommendations([]);
      setSelectedIds(new Set());
      setSelectedAttributesByProduct({});
      return;
    }

    if (previewDataset) {
      setLoading(false);
      setRecommendations(
        getThemePreviewProductRecommendations(
          previewDataset,
          product.id,
          'bundle',
          limit,
        ),
      );
      return;
    }

    let cancelled = false;

    const loadRecommendations = async () => {
      try {
        setLoading(true);

        if (isMarketplacePreview) {
          const { getMarketplacePreviewRecommendations } = await import(
            '../preview/marketplaceSampleData'
          );
          const marketplacePreviewRecommendations =
            getMarketplacePreviewRecommendations(product.id, 'boughtTogether');

          if (marketplacePreviewRecommendations) {
            if (!cancelled) {
              setRecommendations(
                marketplacePreviewRecommendations.slice(0, limit),
              );
              setLoading(false);
            }
            return;
          }
        }

        const response = await storefrontFetch(
          `/products/${encodeURIComponent(product.id)}/frequently-bought-together`,
          {
            query: { limit },
          },
        );

        if (cancelled) {
          return;
        }

        const nextRecommendations = Array.isArray(response?.data) ? response.data : [];
        setRecommendations(nextRecommendations);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load bought-together recommendations:', error);
          setRecommendations([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadRecommendations();

    return () => {
      cancelled = true;
    };
  }, [
    boughtTogetherEnabled,
    isMarketplacePreview,
    limit,
    previewDataset,
    product?.id,
  ]);

  useEffect(() => {
    const nextSelected = new Set(
      recommendations
        .filter((item) => !hasVariants(item))
        .slice(0, Math.min(2, recommendations.length))
        .map((item) => item.id),
    );
    setSelectedIds(nextSelected);
  }, [recommendations]);

  useEffect(() => {
    setSelectedAttributesByProduct((current) => {
      const next: Record<string, Record<string, string>> = {};
      let changed = false;

      recommendations.forEach((item) => {
        if (!hasVariants(item)) {
          return;
        }

        const existingSelection = current[item.id];
        const nextSelection =
          existingSelection && Object.keys(existingSelection).length > 0
            ? existingSelection
            : buildDefaultVariantSelection(item);

        next[item.id] = nextSelection;

        if (
          !existingSelection ||
          JSON.stringify(existingSelection) !== JSON.stringify(nextSelection)
        ) {
          changed = true;
        }
      });

      if (Object.keys(current).length !== Object.keys(next).length) {
        changed = true;
      }

      return changed ? next : current;
    });
  }, [recommendations]);

  useEffect(() => {
    if (!product?.id || loading || recommendations.length === 0) {
      return;
    }

    void trackStorefrontAppUsage({
      slug: 'conversion-suite',
      feature: 'bought_together_view',
      dedupeKey: `bought-together:${product.id}:${sectionVariant}`,
      metadata: {
        productId: product.id,
        recommendationCount: recommendations.length,
        variant: sectionVariant,
      },
    });
  }, [loading, product?.id, recommendations.length, sectionVariant]);

  const selectableRecommendations = useMemo(
    () => recommendations,
    [recommendations],
  );
  const selectedRecommendations = useMemo(
    () => recommendations.filter((item) => selectedIds.has(item.id)),
    [recommendations, selectedIds],
  );
  const selectedRecommendationVariants = useMemo(
    () =>
      recommendations.reduce<Record<string, ProductVariant | null>>((acc, item) => {
        if (!hasVariants(item)) {
          return acc;
        }

        acc[item.id] = resolveVariantFromAttributes(
          getProductVariants(item),
          selectedAttributesByProduct[item.id] || {},
        );
        return acc;
      }, {}),
    [recommendations, selectedAttributesByProduct],
  );
  const selectedCountText = prefersArabicCopy
    ? `1 + ${selectedRecommendations.length} عنصر محدد`
    : `1 + ${selectedRecommendations.length} items selected`;
  const includedText = prefersArabicCopy
    ? 'يتم تضمين هذا المنتج تلقائيًا عند إضافة الباقة.'
    : 'Included automatically when you add the bundle.';
  const selectedStateText = prefersArabicCopy ? 'محدد في الباقة' : 'Selected';
  const selectStateText = prefersArabicCopy ? 'أضف للباقة' : 'Add to bundle';
  const bundleSummaryText = prefersArabicCopy
    ? `تشمل الباقة المنتج الحالي + ${selectedRecommendations.length} إضافة`
    : `Bundle includes the current product + ${selectedRecommendations.length} add-ons`;
  const bundleHelpText = prefersArabicCopy
    ? 'اختر الإضافات التي تريدها، ثم أضف الباقة بالكامل بخطوة واحدة.'
    : 'Select the add-ons you want, then add the bundle in one step.';
  const hasCurrentPdpSelection =
    Boolean(product?.id) && currentPdpSelection?.productId === product?.id;
  const currentProductSelectionReady =
    !product || !getProductVariants(product).length ||
    (hasCurrentPdpSelection && Boolean(currentPdpSelection?.isSelectionReady));
  const bundleTotal = useMemo(() => {
    const currentPrice =
      hasCurrentPdpSelection
        ? Number(currentPdpSelection?.unitPrice) || Number(product?.price) || 0
        : Number(product?.price) || 0;
    return (
      currentPrice +
      selectedRecommendations.reduce((total, item) => {
        const selectedVariant = selectedRecommendationVariants[item.id];
        const itemPrice =
          typeof selectedVariant?.price === 'number' && Number.isFinite(selectedVariant.price)
            ? selectedVariant.price
            : Number(item.price) || 0;

        return total + itemPrice;
      }, 0)
    );
  }, [
    hasCurrentPdpSelection,
    currentPdpSelection?.unitPrice,
    product?.id,
    product?.price,
    selectedRecommendationVariants,
    selectedRecommendations,
  ]);
  const bundleItems = useMemo(
    () => (product ? [product, ...recommendations] : recommendations),
    [product, recommendations],
  );
  const bundleGridClassName = useMemo(() => {
    const baseMobile =
      'mt-6 sm:mt-8 flex overflow-x-auto pb-4 pt-1 px-1 sm:p-0 sm:overflow-visible snap-x snap-mandatory gap-3.5 sm:gap-5 scrollbar-none';
    if (bundleItems.length <= 1) {
      return 'mt-6 sm:mt-8 mx-auto grid max-w-sm grid-cols-1 gap-4';
    }
    if (bundleItems.length === 2) {
      return `${baseMobile} max-w-2xl mx-auto sm:grid sm:grid-cols-2`;
    }
    if (bundleItems.length === 3) {
      return `${baseMobile} max-w-5xl mx-auto sm:grid sm:grid-cols-2 lg:grid-cols-3`;
    }
    return `${baseMobile} sm:grid sm:grid-cols-2 lg:grid-cols-4`;
  }, [bundleItems.length]);

  const handleToggleSelection = (item: Product) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  };

  const getSelectedRecommendationVariant = (item: Product) =>
    selectedRecommendationVariants[item.id] || null;

  const getRecommendationPrice = (item: Product) => {
    const selectedVariant = getSelectedRecommendationVariant(item);
    return typeof selectedVariant?.price === 'number' && Number.isFinite(selectedVariant.price)
      ? selectedVariant.price
      : Number(item.price) || 0;
  };

  const getRecommendationAttributes = (item: Product) =>
    selectedAttributesByProduct[item.id] || buildDefaultVariantSelection(item);

  const getRecommendationImage = (item: Product) => {
    const selectedVariant = getSelectedRecommendationVariant(item);
    return (
      getProductImageCandidates(selectedVariant as Partial<Product> | null | undefined)[0] ||
      getPrimaryProductImage(item)
    );
  };

  const getRecommendationImageCandidates = (item: Product) => {
    const selectedVariant = getSelectedRecommendationVariant(item);
    const variantCandidates = getProductImageCandidates(
      selectedVariant as Partial<Product> | null | undefined,
    );

    return variantCandidates.length > 0
      ? variantCandidates
      : getProductImageCandidates(item);
  };

  const updateRecommendationAttributes = (
    itemId: string,
    nextAttributes: Record<string, string>,
  ) => {
    setSelectedAttributesByProduct((current) => ({
      ...current,
      [itemId]: nextAttributes,
    }));
  };

  const buildRecommendationCartItem = (item: Product) => {
    const selectedVariant = getSelectedRecommendationVariant(item);
    const recommendationPrice = getRecommendationPrice(item);
    const recommendationAttributes = hasVariants(item)
      ? getRecommendationAttributes(item)
      : {};
    const selectedVariantDiscounts =
      selectedVariant ? getProductVolumeDiscounts(selectedVariant) : [];

    return {
      productId: item.id,
      variantId: selectedVariant?.id ?? null,
      name: item.name,
      price: recommendationPrice,
      basePrice: recommendationPrice,
      comparePrice: typeof item.comparePrice === 'number' ? item.comparePrice : undefined,
      quantity: 1,
      imageUrl: getRecommendationImage(item),
      attributes: recommendationAttributes,
      volumeDiscounts:
        selectedVariantDiscounts.length > 0
          ? selectedVariantDiscounts
          : getProductVolumeDiscounts(item),
    };
  };

  const buildCurrentProductCartItem = () => {
    if (!product) {
      return null;
    }

    if (hasCurrentPdpSelection) {
      const liveSelection = currentPdpSelection;
      return {
        productId: product.id,
        variantId: liveSelection?.variantId ?? null,
        name: product.name,
        price: Number(liveSelection?.unitPrice) || Number(product.price) || 0,
        basePrice:
          Number(liveSelection?.basePrice) ||
          Number(liveSelection?.unitPrice) ||
          Number(product.price) ||
          0,
        comparePrice: typeof product.comparePrice === 'number' ? product.comparePrice : undefined,
        quantity: 1,
        imageUrl: liveSelection?.imageUrl || getPrimaryProductImage(product),
        attributes: liveSelection?.attributes || {},
        volumeDiscounts:
          Array.isArray(liveSelection?.volumeDiscounts) &&
          liveSelection.volumeDiscounts.length > 0
            ? liveSelection.volumeDiscounts
            : getProductVolumeDiscounts(product),
      };
    }

    return {
      productId: product.id,
      variantId: null,
      name: product.name,
      price: Number(product.price) || 0,
      basePrice: Number(product.price) || 0,
      quantity: 1,
      imageUrl: getPrimaryProductImage(product),
      attributes: {},
      volumeDiscounts: getProductVolumeDiscounts(product),
    };
  };

  const handleQuickAdd = (item: Product) => {
    if (hasVariants(item) && !getSelectedRecommendationVariant(item)) {
      const attributeLabels = getVariantAttributeLabels(item, prefersArabicCopy);
      toast.error(
        prefersArabicCopy
          ? `${attributeLabels.firstSelectionError} لـ ${item.name}.`
          : `${attributeLabels.firstSelectionError} for ${item.name}.`,
      );
      return;
    }

    void trackStorefrontAppUsage({
      slug: 'conversion-suite',
      feature: 'bought_together_quick_add',
      metadata: {
        productId: item.id,
        sourceProductId: product?.id,
        variantId: getSelectedRecommendationVariant(item)?.id || null,
      },
    });

    addItem(buildRecommendationCartItem(item));
    setIsOpen(true);
  };

  const handleAddBundle = () => {
    if (!product || selectedRecommendations.length === 0) {
      return;
    }

    if (!currentProductSelectionReady) {
      toast.error(
        prefersArabicCopy
          ? 'اختَر نسخة المنتج الأساسي أولًا قبل إضافة الباقة.'
          : 'Select the main product variant before adding the bundle.',
      );
      return;
    }

    const incompleteRecommendation = selectedRecommendations.find(
      (item) => hasVariants(item) && !getSelectedRecommendationVariant(item),
    );
    if (incompleteRecommendation) {
      const attributeLabels = getVariantAttributeLabels(
        incompleteRecommendation,
        prefersArabicCopy,
      );
      toast.error(
        prefersArabicCopy
          ? `${attributeLabels.completionErrorPrefix} ${incompleteRecommendation.name} أولًا.`
          : `${attributeLabels.completionErrorPrefix} ${incompleteRecommendation.name} first.`,
      );
      return;
    }

    void trackStorefrontAppUsage({
      slug: 'conversion-suite',
      feature: 'bought_together_bundle_add',
      quantity: selectedRecommendations.length,
      metadata: {
        productId: product.id,
        selectedAddOns: selectedRecommendations.length,
        selectedVariantAddOns: selectedRecommendations.filter((item) => hasVariants(item)).length,
      },
    });

    const currentProductCartItem = buildCurrentProductCartItem();
    if (!currentProductCartItem) {
      return;
    }

    addItem(currentProductCartItem, { openCart: false });

    selectedRecommendations.forEach((item, index) => {
      addItem(buildRecommendationCartItem(item), {
        openCart: index === selectedRecommendations.length - 1,
      });
    });
  };

  if (!boughtTogetherEnabled) {
    return null;
  }

  if (productLoading || loading) {
    return <BoughtTogetherSkeleton />;
  }

  if (!product || recommendations.length === 0) {
    return null;
  }

  const wrapperClassName = getWrapperClassName(sectionVariant);
  const isCompleteLook = sectionVariant === 'complete-look';
  const isPairingRail = sectionVariant === 'pairing-rail';
  const isGiftPairings = sectionVariant === 'gift-pairings';
  const isCompactPairingRail =
    isPairingRail && (isWomenFashionTheme || isSoleaFemmeTheme);
  const eyebrowText = isSoleaFemmeTheme
    ? prefersArabicCopy
      ? 'تنسيق Solea'
      : 'Solea pairing'
    : prefersArabicCopy
      ? 'يُشترى معًا'
      : 'Bought Together';
  const compactBundleHintText = isSoleaFemmeTheme
    ? prefersArabicCopy
      ? 'حددي الموديل ثم اختاري المقاس أو اللون.'
      : 'Select the style, then choose the size or color.'
    : prefersArabicCopy
      ? 'حددي الإضافة ثم اختاري اللون أو المقاس.'
      : 'Select the add-on, then choose color or size.';
  const effectiveBundleGridClassName = isCompactPairingRail
    ? bundleGridClassName.replace('mt-6 sm:mt-8', 'mt-4 sm:mt-6').replaceAll('gap-5', 'gap-3.5')
    : bundleGridClassName;

  return (
    <section
      className={`w-full border-t border-border bg-background ${
        isCompactPairingRail ? 'py-8 md:py-12' : 'py-10 md:py-16'
      }`}
    >
      <div className="container px-3.5 sm:px-6">
        <div className={wrapperClassName}>
          <div className={isCompactPairingRail ? 'px-3.5 sm:px-5 md:px-6' : 'px-4 sm:px-6 md:px-8'}>
            <div className={`flex flex-col ${isCompactPairingRail ? 'gap-3' : 'gap-4'} ${isContentCentered ? 'items-center text-center' : 'lg:flex-row lg:items-end lg:justify-between'}`}>
              <div className={`${isCompactPairingRail ? 'space-y-1.5' : 'space-y-2'} ${isContentCentered ? 'mx-auto max-w-3xl text-center' : ''}`}>
                <span className={`inline-flex rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary ${isContentCentered ? 'mx-auto' : ''}`}>
                  {eyebrowText}
                </span>
                <div className={isCompactPairingRail ? 'space-y-1.5' : 'space-y-2'}>
                  <h2
                    className={`font-heading font-black tracking-tight text-foreground ${
                      isCompactPairingRail ? 'text-[1.35rem] sm:text-2xl' : 'text-xl sm:text-2xl lg:text-3xl'
                    }`}
                  >
                    {title}
                  </h2>
                  <p
                    className={`text-muted-foreground ${isCompactPairingRail ? 'line-clamp-2 text-[12px] leading-6 sm:line-clamp-none sm:text-sm md:text-base' : 'text-xs sm:text-sm leading-6 md:text-base'} ${isContentCentered ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}
                  >
                    {subtitle}
                  </p>
                </div>
              </div>

              <div className={`rounded-2xl border ${isCompactPairingRail ? 'w-full px-3.5 py-2.5 sm:w-auto sm:px-4 sm:py-3' : 'w-full sm:w-auto px-4 py-3'} ${isGiftPairings ? 'border-[#eadfd7] bg-card shadow-[0_20px_50px_-44px_rgba(61,41,44,0.12)]' : isCompleteLook ? 'border-[#edd8d5] bg-card shadow-[0_20px_50px_-44px_rgba(107,33,49,0.14)]' : 'border-border/80 bg-card'} ${isContentCentered ? 'text-center' : ''}`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {totalLabel}
                </p>
                <p className={`mt-0.5 font-black text-primary ${isCompactPairingRail ? 'text-xl sm:text-2xl' : 'text-2xl'}`}>
                  {formatStorefrontCurrency(bundleTotal, currency)}
                </p>
                <p className={`mt-0.5 text-muted-foreground ${isCompactPairingRail ? 'text-[11px] leading-5' : 'text-xs'}`}>
                  {selectedCountText}
                </p>
              </div>
            </div>

            <div className={effectiveBundleGridClassName}>
              {bundleItems.map((item, index) => {
                const isCurrentProduct = item.id === product.id;
                const isVariantProduct = hasVariants(item);
                const isSelected = isCurrentProduct || selectedIds.has(item.id);
                const itemVariants = getProductVariants(item);
                const selectedVariant = getSelectedRecommendationVariant(item);
                const selectedAttributes = getRecommendationAttributes(item);
                const selectedVariantSummary = Object.values(selectedAttributes)
                  .map((value) => String(value || '').trim())
                  .filter(Boolean)
                  .join(' • ');
                const variantAttributeLabels = getVariantAttributeLabels(
                  item,
                  prefersArabicCopy,
                );
                const recommendationVariantSettings = !isCurrentProduct
                  ? parseVariantSettings(item)
                  : null;
                const productPath = buildStorefrontPath(
                  location.pathname,
                  `/product/${item.slug || item.id}`,
                  location.search,
                );

                return (
                  <div
                    key={item.id}
                    className={`w-[78vw] max-w-[285px] shrink-0 snap-start sm:w-auto sm:max-w-none sm:shrink flex flex-col justify-between ${getCardClassName(
                      sectionVariant,
                      isSelected,
                      false,
                    )}`}
                  >
                    <div className="flex flex-col h-full">
                      {/* Product Image Box */}
                      <div className="relative w-full aspect-[4/5] overflow-hidden rounded-xl sm:rounded-2xl border border-border/50 bg-muted/40 group">
                        <StorefrontProductImage
                          candidates={getRecommendationImageCandidates(item)}
                          alt={item.name}
                          width="420"
                          height="525"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          fallback={
                            <div className="flex w-full h-full items-center justify-center text-xs text-muted-foreground">
                              IMG
                            </div>
                          }
                        />

                        {/* Top Badge */}
                        <span
                          className={`absolute top-2.5 start-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-sm backdrop-blur-md ${
                            isCurrentProduct
                              ? 'bg-foreground text-background'
                              : isGiftPairings
                                ? 'bg-white/95 text-[#8b623e] dark:bg-card/90 dark:text-[#d4a373]'
                                : isCompleteLook || isPairingRail
                                  ? 'bg-white/95 text-[#8b3d33] dark:bg-card/90 dark:text-[#e07a5f]'
                                  : 'bg-background/90 text-foreground'
                          }`}
                        >
                          {isCurrentProduct ? currentProductLabel : recommendationLabel}
                        </span>

                        {/* Checkbox Toggle Button for Recommendations */}
                        {!isCurrentProduct ? (
                          <button
                            type="button"
                            onClick={() => handleToggleSelection(item)}
                            className={`absolute top-2.5 end-2.5 inline-flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition-all duration-200 ${
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground scale-105'
                                : 'border-border/80 bg-background/90 text-muted-foreground hover:text-foreground hover:border-primary/50 backdrop-blur-sm'
                            }`}
                            aria-pressed={isSelected}
                            aria-label={
                              isSelected
                                ? prefersArabicCopy
                                  ? `إزالة ${item.name} من الباقة`
                                  : `Remove ${item.name} from bundle`
                                : prefersArabicCopy
                                  ? `إضافة ${item.name} إلى الباقة`
                                  : `Add ${item.name} to bundle`
                            }
                          >
                            <Check size={16} strokeWidth={2.5} />
                          </button>
                        ) : null}
                      </div>

                      {/* Content Area */}
                      <div className="mt-3.5 flex flex-col flex-1 justify-between gap-3 min-w-0">
                        <div className="space-y-1.5 min-w-0">
                          <Link
                            to={productPath}
                            className="line-clamp-2 text-sm sm:text-base font-bold text-foreground hover:text-primary transition-colors leading-snug"
                            title={item.name}
                          >
                            {item.name}
                          </Link>

                          <div className="flex items-baseline gap-2 pt-0.5">
                            <span className="text-base sm:text-lg font-extrabold text-primary">
                              {formatStorefrontCurrency(
                                isVariantProduct ? getRecommendationPrice(item) : Number(item.price) || 0,
                                currency,
                              )}
                            </span>
                            {Number(item.compareAtPrice || item.comparePrice) > Number(item.price) && (
                              <span className="text-xs text-muted-foreground line-through">
                                {formatStorefrontCurrency(Number(item.compareAtPrice || item.comparePrice), currency)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Variants & Actions */}
                        {isCurrentProduct ? (
                          <div className="space-y-2 pt-1">
                            <div className="rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-center text-xs font-semibold text-muted-foreground leading-5">
                              {includedText}
                            </div>
                          </div>
                        ) : isVariantProduct ? (
                          <div className="space-y-2.5 pt-1 min-w-0">
                            {isSelected ? (
                              <div className="space-y-2 rounded-xl border border-border/60 bg-secondary/20 p-2.5">
                                <VariantSelector
                                  variants={itemVariants}
                                  selectedAttributes={selectedAttributes}
                                  onChange={(nextAttributes) =>
                                    updateRecommendationAttributes(item.id, nextAttributes)
                                  }
                                  density="compact"
                                  variantSettings={recommendationVariantSettings}
                                />
                                <p className="text-[11px] leading-5 text-muted-foreground">
                                  {selectedVariant ? (
                                    <span className="inline-flex items-center gap-1 font-medium text-foreground/85">
                                      <span>{prefersArabicCopy ? 'النسخة المحددة:' : 'Selected:'}</span>
                                      <span className="font-bold text-primary">{selectedVariantSummary}</span>
                                    </span>
                                  ) : (
                                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                                      {variantAttributeLabels.selectionHint || (prefersArabicCopy ? 'يرجى اختيار المقاس أو اللون' : 'Please choose size or color')}
                                    </span>
                                  )}
                                </p>
                              </div>
                            ) : (
                              <p className="text-[11px] text-muted-foreground/80 py-0.5">
                                {prefersArabicCopy ? 'متوفر بعدة مقاسات وألوان' : 'Available in multiple options'}
                              </p>
                            )}

                            <div className="flex flex-col gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleToggleSelection(item)}
                                className={`inline-flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                                  isSelected
                                    ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
                                    : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted'
                                }`}
                              >
                                {isSelected ? (
                                  <>
                                    <Check size={14} strokeWidth={2.5} />
                                    <span>{selectedStateText}</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus size={14} strokeWidth={2.5} />
                                    <span>{selectStateText}</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleQuickAdd(item)}
                                disabled={!selectedVariant}
                                className="inline-flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors py-1 disabled:opacity-40 disabled:hover:text-muted-foreground"
                              >
                                <ShoppingBag size={12} />
                                <span>{quickAddText}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5 pt-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleSelection(item)}
                              className={`inline-flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                                isSelected
                                  ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
                                  : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted'
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check size={14} strokeWidth={2.5} />
                                  <span>{selectedStateText}</span>
                                </>
                              ) : (
                                <>
                                  <Plus size={14} strokeWidth={2.5} />
                                  <span>{selectStateText}</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleQuickAdd(item)}
                              className="inline-flex w-full items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors py-1"
                            >
                              <ShoppingBag size={12} />
                              <span>{quickAddText}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Bundle Summary & CTA Bar */}
            <div
              className={`flex flex-col rounded-2xl border ${
                isCompactPairingRail ? 'mt-6 gap-3.5 p-4' : 'mt-8 gap-4 p-4 sm:p-6'
              } ${
                isGiftPairings
                  ? 'border-[#eadfd7] bg-gradient-to-r from-card via-card/90 to-card shadow-[0_16px_40px_-32px_rgba(61,41,44,0.12)]'
                  : isCompleteLook
                    ? 'border-[#edd8d5] bg-gradient-to-r from-card via-card/90 to-card shadow-[0_20px_50px_-36px_rgba(107,33,49,0.12)]'
                    : 'border-border/80 bg-card shadow-sm'
              } ${
                isContentCentered ? 'items-center text-center' : 'md:flex-row md:items-center md:justify-between'
              }`}
            >
              <div className={`space-y-1.5 ${isContentCentered ? 'text-center' : ''}`}>
                <div
                  className={`inline-flex items-center gap-2 text-sm sm:text-base font-bold text-foreground ${
                    isContentCentered ? 'justify-center' : ''
                  }`}
                >
                  <PackagePlus size={18} className="text-primary shrink-0" />
                  <span>{bundleSummaryText}</span>
                </div>
                <p
                  className={
                    isCompactPairingRail
                      ? 'text-xs text-muted-foreground'
                      : 'text-xs sm:text-sm text-muted-foreground'
                  }
                >
                  {selectableRecommendations.length > 0 ? bundleHelpText : bundleVariantHint}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <div className="text-start sm:text-end sm:px-3">
                  <span className="text-[11px] font-semibold text-muted-foreground block uppercase tracking-wider">
                    {totalLabel}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-primary">
                    {formatStorefrontCurrency(bundleTotal, currency)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAddBundle}
                  disabled={selectedRecommendations.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm sm:text-base font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
                >
                  <ShoppingBag size={18} />
                  <span>{addBundleText}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BoughtTogetherSection;
