import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Check, PackagePlus } from 'lucide-react';
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
    ? 'opacity-80'
    : selected
      ? 'border-primary/35 shadow-[0_20px_60px_-45px_hsl(var(--primary)/0.5)]'
      : 'border-border';

  switch (variant) {
    case 'compact':
      return `rounded-xl border bg-background p-3 ${stateClassName}`;
    case 'editorial':
      return `rounded-[1.4rem] border bg-background/90 p-4 ${stateClassName}`;
    case 'complete-look':
      return `rounded-[1.6rem] border bg-[linear-gradient(180deg,#ffffff_0%,#fff8f6_100%)] p-4 shadow-[0_24px_80px_-62px_rgba(107,33,49,0.14)] ${stateClassName}`;
    case 'pairing-rail':
      return `rounded-[1.25rem] border bg-white p-3 shadow-[0_14px_36px_-34px_rgba(107,33,49,0.12)] ${stateClassName}`;
    case 'gift-pairings':
      return `rounded-[1.35rem] border bg-[linear-gradient(180deg,#ffffff_0%,#fffaf6_100%)] p-3 shadow-[0_16px_40px_-34px_rgba(61,41,44,0.14)] ${stateClassName}`;
    default:
      return `rounded-[1.25rem] border bg-background p-4 ${stateClassName}`;
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
  const setIsOpen = useCartStore((state) => state.setIsOpen);
  const currentPdpSelection = usePdpSelectionStore((state) => state.selection);
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
      'اختَر اللون أو المقاس لكل إضافة من نفس الكارت قبل إضافة الباقة.',
    prefersArabicCopy,
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
  const selectedStateText = prefersArabicCopy ? 'محدد' : 'Selected';
  const selectStateText = prefersArabicCopy ? 'اختيار' : 'Select';
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
  const bundleGridClassName =
    bundleItems.length <= 1
      ? 'mt-8 mx-auto grid max-w-md grid-cols-1 gap-4'
      : bundleItems.length === 2
        ? 'mt-8 mx-auto grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2'
        : bundleItems.length === 3
          ? 'mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'
          : 'mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4';

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
      return {
        productId: product.id,
        variantId: currentPdpSelection?.variantId ?? null,
        name: product.name,
        price: Number(currentPdpSelection?.unitPrice) || Number(product.price) || 0,
        basePrice:
          Number(currentPdpSelection?.basePrice) ||
          Number(currentPdpSelection?.unitPrice) ||
          Number(product.price) ||
          0,
        quantity: 1,
        imageUrl: currentPdpSelection?.imageUrl || getPrimaryProductImage(product),
        attributes: currentPdpSelection?.attributes || {},
        volumeDiscounts:
          Array.isArray(currentPdpSelection?.volumeDiscounts) &&
          currentPdpSelection.volumeDiscounts.length > 0
            ? currentPdpSelection.volumeDiscounts
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
    ? bundleGridClassName.replace('mt-8', 'mt-5').replaceAll('gap-4', 'gap-3')
    : bundleGridClassName;

  return (
    <section
      className={`w-full border-t border-border bg-background ${
        isCompactPairingRail ? 'py-8 md:py-12' : 'py-12 md:py-16'
      }`}
    >
      <div className="container px-4 md:px-6">
        <div className={wrapperClassName}>
          <div className={isCompactPairingRail ? 'px-3.5 sm:px-4 md:px-6' : 'px-4 md:px-6'}>
            <div className={`flex flex-col ${isCompactPairingRail ? 'gap-3' : 'gap-4'} ${isContentCentered ? 'items-center text-center' : 'lg:flex-row lg:items-end lg:justify-between'}`}>
              <div className={`${isCompactPairingRail ? 'space-y-1.5' : 'space-y-2'} ${isContentCentered ? 'mx-auto max-w-3xl text-center' : ''}`}>
                <span className={`inline-flex rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-primary ${isContentCentered ? 'mx-auto' : ''}`}>
                  {eyebrowText}
                </span>
                <div className={isCompactPairingRail ? 'space-y-1.5' : 'space-y-2'}>
                  <h2
                    className={`font-heading font-black tracking-tight text-foreground ${
                      isCompactPairingRail ? 'text-[1.35rem] sm:text-2xl' : 'text-2xl'
                    }`}
                  >
                    {title}
                  </h2>
                  <p
                    className={`text-muted-foreground ${isCompactPairingRail ? 'line-clamp-2 text-[12px] leading-6 sm:line-clamp-none sm:text-sm md:text-base' : 'text-sm leading-7 md:text-base'} ${isContentCentered ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}
                  >
                    {subtitle}
                  </p>
                </div>
              </div>

              <div className={`rounded-[1.1rem] border ${isCompactPairingRail ? 'w-full px-3.5 py-2.5 sm:w-auto sm:px-4 sm:py-3' : 'px-4 py-3'} ${isGiftPairings ? 'border-[#eadfd7] bg-white/92 shadow-[0_20px_50px_-44px_rgba(61,41,44,0.12)]' : isCompleteLook ? 'border-[#f0d7d2] bg-white/92 shadow-[0_20px_50px_-44px_rgba(107,33,49,0.14)]' : 'border-border bg-background/80'} ${isContentCentered ? 'text-center' : ''}`}>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {totalLabel}
                </p>
                <p className={`mt-1 font-black text-foreground ${isCompactPairingRail ? 'text-xl sm:text-2xl' : 'text-2xl'}`}>
                  {formatStorefrontCurrency(bundleTotal, currency)}
                </p>
                <p className={`mt-1 text-muted-foreground ${isCompactPairingRail ? 'text-[11px] leading-5' : 'text-xs'}`}>
                  {selectedCountText}
                </p>
              </div>
            </div>

            <div className={effectiveBundleGridClassName}>
              {bundleItems.map((item) => {
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
                    className={getCardClassName(
                      sectionVariant,
                      isSelected,
                      false,
                    )}
                  >
                    <div className={isCompactPairingRail ? 'grid grid-cols-[4.75rem_minmax(0,1fr)] gap-2.5 items-start sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-3' : isCompleteLook || isPairingRail || isGiftPairings ? 'grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 items-start' : ''}>
                      <div className={`relative overflow-hidden rounded-[1rem] border ${isGiftPairings ? 'border-[#eadfd7] bg-[#fffaf6]' : isCompleteLook || isPairingRail ? 'border-[#f2dfdc] bg-[#fff7f5]' : 'border-border bg-muted'}`}>
                        <StorefrontProductImage
                          candidates={getRecommendationImageCandidates(item)}
                          alt={item.name}
                          width="420"
                          height="420"
                          className={isCompleteLook || isPairingRail || isGiftPairings ? 'aspect-[4/5] w-full object-cover' : 'aspect-square w-full object-cover'}
                          fallback={
                            <div className={`flex w-full items-center justify-center text-xs text-muted-foreground ${isCompleteLook || isPairingRail || isGiftPairings ? 'aspect-[4/5]' : 'aspect-square'}`}>
                              IMG
                            </div>
                          }
                        />

                        <span className={`absolute left-2 top-2 inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${isGiftPairings ? 'bg-white/92 text-[#8b623e]' : isCompleteLook || isPairingRail ? 'bg-white/92 text-[#8b3d33]' : 'bg-background/90 text-foreground'}`}>
                          {isCurrentProduct ? currentProductLabel : recommendationLabel}
                        </span>

                        {!isCurrentProduct ? (
                          <button
                            type="button"
                            onClick={() => handleToggleSelection(item)}
                            className={`absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background/90 text-foreground hover:border-primary/35'
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
                            <Check size={15} />
                          </button>
                        ) : null}
                      </div>

                      <div className={isCompactPairingRail ? 'min-w-0 space-y-1.5 sm:space-y-2' : isCompleteLook || isPairingRail || isGiftPairings ? 'space-y-2 min-w-0' : 'mt-4 space-y-3'}>
                      <div>
                        <Link
                          to={productPath}
                          className={isCompactPairingRail ? 'line-clamp-2 text-sm font-bold text-foreground hover:text-primary sm:text-base' : 'line-clamp-2 text-base font-bold text-foreground hover:text-primary'}
                        >
                          {item.name}
                        </Link>
                        <p className={isCompactPairingRail ? 'mt-1.5 text-sm font-semibold text-primary' : 'mt-2 text-sm font-semibold text-primary'}>
                          {formatStorefrontCurrency(
                            isVariantProduct ? getRecommendationPrice(item) : Number(item.price) || 0,
                            currency,
                          )}
                        </p>
                      </div>

                      {isCurrentProduct ? (
                        <div className={`rounded-xl border border-border bg-secondary/40 px-3 py-2 text-muted-foreground ${isCompleteLook || isPairingRail || isGiftPairings ? 'text-xs leading-5' : 'text-sm'}`}>
                          {includedText}
                        </div>
                      ) : isVariantProduct ? (
                        <div className={isCompleteLook || isPairingRail || isGiftPairings ? 'space-y-2' : 'space-y-3'}>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleSelection(item)}
                              className={`inline-flex flex-1 items-center justify-center rounded-xl border px-3 ${isCompleteLook || isPairingRail || isGiftPairings ? 'py-2 text-xs' : 'py-2 text-sm'} font-semibold transition-colors ${
                                isSelected
                                  ? 'border-primary/25 bg-primary/10 text-primary'
                                  : 'border-border text-foreground hover:bg-muted'
                              }`}
                            >
                              {isSelected ? selectedStateText : selectStateText}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdd(item)}
                              disabled={!selectedVariant}
                              className={`inline-flex items-center justify-center rounded-xl bg-primary px-3 ${isCompleteLook || isPairingRail || isGiftPairings ? 'py-2 text-xs' : 'py-2 text-sm'} font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              {quickAddText}
                            </button>
                          </div>

                          {isSelected ? (
                            <div
                              className={
                                isGiftPairings
                                  ? 'space-y-2 border-t border-[#efe4dd] pt-2'
                                  : isPairingRail
                                  ? 'space-y-2 border-t border-[#efe4e2] pt-2'
                                  : `space-y-3 rounded-[1rem] border border-border bg-secondary/20 ${isCompleteLook ? 'p-2.5' : 'p-3'}`
                              }
                            >
                              <VariantSelector
                                variants={itemVariants}
                                selectedAttributes={selectedAttributes}
                                onChange={(nextAttributes) =>
                                  updateRecommendationAttributes(item.id, nextAttributes)
                                }
                                density="compact"
                                variantSettings={recommendationVariantSettings}
                              />

                              <p className="text-xs leading-6 text-muted-foreground">
                                {selectedVariant
                                  ? prefersArabicCopy
                                    ? `النسخة المحددة: ${selectedVariantSummary}`
                                    : `Selected variant: ${selectedVariantSummary}`
                                  : isCompactPairingRail
                                    ? compactBundleHintText
                                    : settings?.bundleVariantHint || bundleVariantHint || variantAttributeLabels.selectionHint}
                              </p>
                            </div>
                          ) : (
                            <p className="text-xs leading-6 text-muted-foreground">
                              {isCompactPairingRail
                                ? compactBundleHintText
                                : settings?.bundleVariantHint || bundleVariantHint || variantAttributeLabels.selectionHint}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleSelection(item)}
                            className={`inline-flex flex-1 items-center justify-center rounded-xl border px-3 ${isCompleteLook || isPairingRail || isGiftPairings ? 'py-2 text-xs' : 'py-2 text-sm'} font-semibold transition-colors ${
                              isSelected
                                ? 'border-primary/25 bg-primary/10 text-primary'
                                : 'border-border text-foreground hover:bg-muted'
                            }`}
                          >
                            {isSelected ? selectedStateText : selectStateText}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAdd(item)}
                            className={`inline-flex items-center justify-center rounded-xl bg-primary px-3 ${isCompleteLook || isPairingRail || isGiftPairings ? 'py-2 text-xs' : 'py-2 text-sm'} font-bold text-primary-foreground hover:opacity-90`}
                          >
                            {quickAddText}
                          </button>
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={`flex flex-col rounded-[1.25rem] border ${isCompactPairingRail ? 'mt-5 gap-3 p-3 sm:p-4' : 'mt-8 gap-4 p-4'} ${isGiftPairings ? 'border-[#eadfd7] bg-white/92' : 'border-border bg-background/85'} ${isContentCentered ? 'items-center text-center' : 'md:flex-row md:items-center md:justify-between'}`}>
              <div className={`space-y-1 ${isContentCentered ? 'text-center' : ''}`}>
                <div className={`inline-flex items-center gap-2 text-sm font-semibold text-foreground ${isContentCentered ? 'justify-center' : ''}`}>
                  <PackagePlus size={16} className="text-primary" />
                  <span>{bundleSummaryText}</span>
                </div>
                <p className={isCompactPairingRail ? 'text-[12px] leading-6 text-muted-foreground' : 'text-sm text-muted-foreground'}>
                  {selectableRecommendations.length > 0
                    ? bundleHelpText
                    : bundleVariantHint}
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddBundle}
                disabled={selectedRecommendations.length === 0}
                className={`inline-flex items-center justify-center rounded-[1rem] bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${isCompactPairingRail ? 'w-full sm:w-auto' : ''}`}
              >
                {addBundleText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BoughtTogetherSection;
