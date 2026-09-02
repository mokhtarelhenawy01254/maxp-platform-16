import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { storefrontFetch } from "../../utils/storefrontApi";
import type { Product } from "../hooks/useProducts";
import { useCartStore } from "../store/useCartStore";
import { useStorefrontSettings } from "../hooks/useStorefrontSettings";
import {
  getStorefrontMarketplaceAppSettings,
  isStorefrontMarketplaceAppEnabled,
} from "../utils/marketplaceApps";
import { buildStorefrontPath } from "../utils/paths";
import { formatStorefrontCurrency } from "../utils/currency";
import StorefrontProductImage from "./StorefrontProductImage";
import { getProductImageCandidates, getPrimaryProductImage } from "../utils/productImages";
import { trackStorefrontAppUsage } from "../utils/appUsageTracking";
import { getProductVolumeDiscounts } from "../utils/volumeDiscounts";
import { useStorefrontTheme } from "../engine/ThemeProvider";
import { isMarketplaceThemePreview } from "../preview/previewContext";
import { isKhemetLuxeTheme } from "../utils/navigationGuards";

interface CartUpsellHostProps {
  open: boolean;
  layout?: "drawer" | "inline";
}

const dedupeProducts = (products: Product[]): Product[] => {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (!product?.id || seen.has(product.id)) {
      return false;
    }

    seen.add(product.id);
    return true;
  });
};

const excludeDuplicateProducts = (
  primary: Product[],
  secondary: Product[],
): Product[] => {
  if (primary.length === 0 || secondary.length === 0) {
    return secondary;
  }

  const primaryIds = new Set(primary.map((product) => product.id));
  return secondary.filter((product) => !primaryIds.has(product.id));
};

const resolveDirectionalCopy = ({
  value,
  englishFallback,
  arabicFallback,
  prefersArabicCopy,
}: {
  value: unknown;
  englishFallback: string;
  arabicFallback: string;
  prefersArabicCopy: boolean;
}) => {
  if (typeof value === "string" && value.trim()) {
    const trimmedValue = value.trim();
    if (prefersArabicCopy && trimmedValue === englishFallback) {
      return arabicFallback;
    }

    return trimmedValue;
  }

interface KhemetCinematicUpsellCardProps {
  product: Product;
  label: string;
  currency: string;
  prefersArabicCopy: boolean;
  chooseOptionsLabel: string;
  onQuickAdd: (product: Product) => void;
  onOpenProduct: (path: string) => void;
  productPath: string;
  isInline?: boolean;
}

const KhemetCinematicUpsellCard: React.FC<KhemetCinematicUpsellCardProps> = ({
  product,
  label,
  currency,
  prefersArabicCopy,
  onOpenProduct,
  productPath,
  isInline = false,
}) => {
  const addItem = useCartStore((state) => state.addItem);
  const setIsOpen = useCartStore((state) => state.setIsOpen);

  const availableVariants = product.productVariants?.length
    ? product.productVariants
    : product.variants || [];

  const availableSizes = useMemo(() => {
    return Array.from(
      new Set(
        availableVariants
          .map((v: any) => v.attributes?.["المقاس"] || v.attributeValues?.["المقاس"])
          .filter(Boolean),
      ),
    ) as string[];
  }, [availableVariants]);

  const [selectedSize, setSelectedSize] = useState<string | null>(
    availableSizes.length > 0 ? availableSizes[0] : null,
  );
  const [addedSuccess, setAddedSuccess] = useState(false);

  const matchedVariant = useMemo(() => {
    if (!selectedSize || availableVariants.length === 0) return null;
    return (
      availableVariants.find(
        (v: any) =>
          (v.attributes?.["المقاس"] || v.attributeValues?.["المقاس"]) === selectedSize,
      ) || null
    );
  }, [availableVariants, selectedSize]);

  const currentPrice = matchedVariant?.price
    ? Number(matchedVariant.price)
    : Number(product.price) || 0;

  const comparePrice =
    typeof matchedVariant?.compareAtPrice === "number" && matchedVariant.compareAtPrice > currentPrice
      ? matchedVariant.compareAtPrice
      : typeof product.comparePrice === "number" && product.comparePrice > currentPrice
      ? product.comparePrice
      : null;

  const discountAmount = comparePrice ? Math.round(comparePrice - currentPrice) : 0;

  const handle1TapAdd = (sizeOverride?: string) => {
    const sizeToUse = sizeOverride || selectedSize;
    let targetVariant = matchedVariant;
    if (sizeOverride && sizeOverride !== selectedSize) {
      targetVariant =
        availableVariants.find(
          (v: any) =>
            (v.attributes?.["المقاس"] || v.attributeValues?.["المقاس"]) === sizeOverride,
        ) || null;
    }

    const finalPrice = targetVariant?.price
      ? Number(targetVariant.price)
      : Number(product.price) || 0;
    const finalComparePrice =
      typeof targetVariant?.compareAtPrice === "number"
        ? targetVariant.compareAtPrice
        : typeof product.comparePrice === "number"
        ? product.comparePrice
        : undefined;

    addItem(
      {
        productId: product.id,
        variantId: targetVariant?.id || null,
        name: sizeToUse ? `${product.name} (مقاس ${sizeToUse})` : product.name,
        price: finalPrice,
        basePrice: finalPrice,
        comparePrice: finalComparePrice,
        quantity: 1,
        imageUrl: targetVariant?.image || getPrimaryProductImage(product),
        attributes: sizeToUse ? { "المقاس": sizeToUse } : undefined,
        volumeDiscounts: getProductVolumeDiscounts(product),
      },
      { openCart: !isInline },
    );

    if (!isInline) {
      setIsOpen(true);
    }

    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
    }, 2000);
  };

  return (
    <div className="group relative flex min-w-[16.5rem] max-w-[17.5rem] sm:min-w-[18.5rem] sm:max-w-[19.5rem] snap-center shrink-0 flex-col rounded-2xl border border-[#e7ddd0] bg-white p-3 shadow-[0_8px_24px_-12px_rgba(47,41,35,0.12)] hover:shadow-lg hover:border-[#173f31]/40 transition-all duration-300">
      {/* Hero Visual Container */}
      <div className="relative w-full h-40 sm:h-44 overflow-hidden rounded-xl bg-gradient-to-b from-[#fbf8f4] to-[#f4ebe1] border border-[#eadfcf]/70">
        <StorefrontProductImage
          candidates={getProductImageCandidates(product)}
          alt={product.name}
          requestedWidth={380}
          responsiveWidths={[240, 320, 380, 480]}
          responsiveSizes="320px"
          imageQuality={82}
          width="320"
          height="220"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          fallback={
            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-muted-foreground">
              {product.name?.[0] || "Swan"}
            </div>
          }
        />

        {/* Top Badges */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 pointer-events-none">
          <span className="rounded-full bg-[#173f31]/92 backdrop-blur-md px-2.5 py-0.5 text-[9px] font-black text-[#fff7eb] shadow-xs">
            {label}
          </span>
        </div>

        {discountAmount > 0 && (
          <div className="absolute top-2 left-2 pointer-events-none">
            <span className="rounded-full bg-[#e35335] px-2 py-0.5 text-[9px] font-black text-white shadow-xs">
              {prefersArabicCopy ? `وفر ${discountAmount} ج.م` : `Save ${discountAmount}`}
            </span>
          </div>
        )}
      </div>

      {/* Product Title & Pricing */}
      <div className="mt-2.5 min-w-0 text-right">
        <Link
          to={productPath}
          onClick={() => onOpenProduct(productPath)}
          className="block truncate text-xs sm:text-sm font-black text-[#2a2118] hover:text-[#173f31] transition-colors"
          title={product.name}
        >
          {product.name}
        </Link>

        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm sm:text-base font-black text-[#173f31]">
            {formatStorefrontCurrency(currentPrice, currency)}
          </span>
          {comparePrice && (
            <span className="text-xs text-[#a89987] line-through font-semibold">
              {formatStorefrontCurrency(comparePrice, currency)}
            </span>
          )}
          {discountAmount > 0 && (
            <span className="rounded-md bg-[#fdf0ec] px-1.5 py-0.2 text-[9px] font-bold text-[#e35335]">
              {prefersArabicCopy ? "عرض خاص" : "Deal"}
            </span>
          )}
        </div>
      </div>

      {/* 1-Tap Quick Size Selector */}
      {availableSizes.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-[#f4ebe1]">
          <div className="flex items-center justify-between text-[10px] font-bold text-[#7b6d58] mb-1.5">
            <span>{prefersArabicCopy ? "المقاس السريع:" : "Quick Size:"}</span>
            {selectedSize && (
              <span className="text-[#173f31] font-black">
                {prefersArabicCopy ? `مقاس ${selectedSize}` : `Size ${selectedSize}`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {availableSizes.map((size) => {
              const isSelected = selectedSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    setSelectedSize(size);
                    handle1TapAdd(size);
                  }}
                  className={`h-7.5 min-w-[2.2rem] px-2 rounded-lg text-[11px] font-black transition-all active:scale-90 flex items-center justify-center ${
                    isSelected
                      ? "bg-[#173f31] text-[#fff7eb] shadow-xs ring-1 ring-[#173f31]"
                      : "bg-[#f6eee5] hover:bg-[#ede1d3] text-[#4a352e] border border-[#d7c6b4]/50"
                  }`}
                  title={prefersArabicCopy ? `إضافة فورية بمقاس ${size}` : `1-Tap Add Size ${size}`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Primary 1-Tap CTA Action Button */}
      <div className="mt-2.5">
        <button
          type="button"
          onClick={() => handle1TapAdd()}
          className={`inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-black transition-all shadow-xs active:scale-[0.98] ${
            addedSuccess
              ? "bg-[#107048] text-white shadow-md"
              : "bg-[#173f31] text-[#fff7eb] hover:bg-[#204d3d]"
          }`}
        >
          {addedSuccess ? (
            <>
              <span>✓</span>
              <span>{prefersArabicCopy ? "تمت الإضافة للسلة!" : "Added to cart!"}</span>
            </>
          ) : (
            <>
              <span>+</span>
              <span>
                {availableSizes.length > 0
                  ? selectedSize
                    ? prefersArabicCopy
                      ? `أضيفي مقاس (${selectedSize}) للطلب`
                      : `Add size (${selectedSize})`
                    : prefersArabicCopy
                    ? "اختاري المقاس وأضيفي"
                    : "Choose size & add"
                  : prefersArabicCopy
                  ? "أضيفي للطلب الآن"
                  : "Add to order"}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

const CartUpsellHost: React.FC<CartUpsellHostProps> = ({
  open,
  layout = "drawer",
}) => {
  const location = useLocation();
  const { theme } = useStorefrontTheme();
  const { settings } = useStorefrontSettings();
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const setIsOpen = useCartStore((state) => state.setIsOpen);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [bundleProducts, setBundleProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const conversionEnabled = isStorefrontMarketplaceAppEnabled(
    settings,
    "conversion-suite",
  );
  const conversionSettings = getStorefrontMarketplaceAppSettings(
    settings,
    "conversion-suite",
  );
  const modules = (conversionSettings["modules"] as Record<string, any> | undefined) || {};
  const conversionUi =
    (conversionSettings["ui"] as Record<string, any> | undefined) || {};
  const conversionCopy =
    (conversionSettings["copy"] as Record<string, any> | undefined) || {};
  const sourceProductId = items[0]?.productId || null;
  const currency =
    settings?.storefront?.settings?.currency || settings?.company?.currency || "EGP";
  const prefersArabicCopy = theme.direction === "rtl";
  const isBiteRush = theme.id === "restaurant-demo";
  const isKhemetLuxe = isKhemetLuxeTheme(theme.id);
  const isInline = layout === "inline";
  const isMarketplacePreview = isMarketplaceThemePreview(location.search);
  const isKhemetDrawer = isKhemetLuxe && !isInline;
  const conversionActive = conversionEnabled || isBiteRush || isKhemetLuxe;
  const crossSellEnabled = Boolean(modules["crossSell"]) || isBiteRush || isKhemetLuxe;
  const boughtTogetherEnabled = Boolean(modules["boughtTogether"]) || isBiteRush || isKhemetLuxe;
  const upsellStyle = String(conversionUi["cartUpsellStyle"] || "stacked");
  const firstCartItem = items[0] || null;
  const firstCartItemName = String(firstCartItem?.name || "").trim();
  const firstCartItemUnitPrice = Number(
    firstCartItem?.basePrice ?? firstCartItem?.price ?? 0,
  );
  const canIncreaseFirstCartItem = Boolean(
    firstCartItem && !firstCartItem.quantityOffer?.groupId,
  );
  const shopPath = buildStorefrontPath(location.pathname, "/shop", location.search);
  const upsellBadge = resolveDirectionalCopy({
    value: conversionCopy["cartUpsellBadge"],
    englishFallback: "Upsell",
    arabicFallback: "ترشيحات ذكية",
    prefersArabicCopy,
  });
  const upsellTitle = resolveDirectionalCopy({
    value: conversionCopy["cartUpsellTitle"],
    englishFallback: "Continue building your order",
    arabicFallback: "كمّل طلبك باقتراحات مناسبة",
    prefersArabicCopy,
  });
  const upsellDescription = resolveDirectionalCopy({
    value: conversionCopy["cartUpsellDescription"],
    englishFallback:
      "These storefront suggestions are powered by the conversion app inside the cart drawer.",
    arabicFallback:
      "اقتراحات سريعة داخل السلة تساعدك على زيادة قيمة الطلب قبل الإتمام.",
    prefersArabicCopy,
  });
  const crossSellTitle = resolveDirectionalCopy({
    value: conversionCopy["crossSellTitle"],
    englishFallback: "Cross Sell",
    arabicFallback: "منتجات مكملة",
    prefersArabicCopy,
  });
  const crossSellDescription = resolveDirectionalCopy({
    value: conversionCopy["crossSellDescription"],
    englishFallback: "Add complementary picks",
    arabicFallback: "أضف اقتراحات تكمل المنتج الحالي",
    prefersArabicCopy,
  });
  const boughtTogetherTitle = resolveDirectionalCopy({
    value: conversionCopy["boughtTogetherTitle"],
    englishFallback: "Bought Together",
    arabicFallback: "يُشترى معه كثيرًا",
    prefersArabicCopy,
  });
  const boughtTogetherDescription = resolveDirectionalCopy({
    value: conversionCopy["boughtTogetherDescription"],
    englishFallback: "Popular pairings for this product",
    arabicFallback: "ترشيحات شائعة مع هذا المنتج",
    prefersArabicCopy,
  });
  const quickAddLabel = resolveDirectionalCopy({
    value: conversionCopy["quickAddLabel"],
    englishFallback: "Quick add",
    arabicFallback: "إضافة سريعة",
    prefersArabicCopy,
  });
  const chooseOptionsLabel = resolveDirectionalCopy({
    value: conversionCopy["chooseOptionsLabel"],
    englishFallback: "Choose options",
    arabicFallback: "اختر الخيارات",
    prefersArabicCopy,
  });
  const crossSellCardLabel = prefersArabicCopy ? "يكمل الطلب" : "Cross sell";
  const bundleCardLabel = prefersArabicCopy ? "الأكثر طلبًا معه" : "Bundle";
  const cartProductIds = useMemo(
    () => new Set(items.map((item) => item.productId)),
    [items],
  );

  useEffect(() => {
    if (!open || !conversionActive || !sourceProductId || (!crossSellEnabled && !boughtTogetherEnabled)) {
      setRelatedProducts([]);
      setBundleProducts([]);
      return;
    }

    let cancelled = false;

    const loadSuggestions = async () => {
      try {
        setLoading(true);

        if (isMarketplacePreview) {
          const { getMarketplacePreviewRecommendations } = await import(
            "../preview/marketplaceSampleData"
          );
          const previewRelated = getMarketplacePreviewRecommendations(sourceProductId, "related");
          const previewBundles = getMarketplacePreviewRecommendations(sourceProductId, "boughtTogether");

          if (previewRelated || previewBundles) {
            if (cancelled) {
              return;
            }

            const nextRelatedProducts = dedupeProducts(
              (previewRelated || []).filter(
                (product) => product?.id && !cartProductIds.has(product.id),
              ),
            );
            const nextBundleProducts = excludeDuplicateProducts(
              nextRelatedProducts,
              dedupeProducts(
                (previewBundles || []).filter(
                  (product) => product?.id && !cartProductIds.has(product.id),
                ),
              ),
            );

            setRelatedProducts(nextRelatedProducts);
            setBundleProducts(nextBundleProducts);
            return;
          }
        }

        const [relatedResponse, bundleResponse] = await Promise.all([
          crossSellEnabled
            ? storefrontFetch(`/products/${encodeURIComponent(sourceProductId)}/related`, {
                query: { limit: 4 },
              })
            : Promise.resolve({ data: [] }),
          boughtTogetherEnabled
            ? storefrontFetch(
                `/products/${encodeURIComponent(sourceProductId)}/frequently-bought-together`,
                { query: { limit: 4 } },
              )
            : Promise.resolve({ data: [] }),
        ]);

        if (cancelled) {
          return;
        }

        const filterAvailable = (products: Product[]) =>
          dedupeProducts(products).filter(
            (product) => product?.id && !cartProductIds.has(product.id),
          );

        const nextRelatedProducts = filterAvailable(
          Array.isArray(relatedResponse?.data) ? relatedResponse.data : [],
        );
        const nextBundleProducts = excludeDuplicateProducts(
          nextRelatedProducts,
          filterAvailable(
            Array.isArray(bundleResponse?.data) ? bundleResponse.data : [],
          ),
        );

        setRelatedProducts(nextRelatedProducts);
        setBundleProducts(nextBundleProducts);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load cart upsell suggestions:", error);
          setRelatedProducts([]);
          setBundleProducts([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSuggestions();

    return () => {
      cancelled = true;
    };
  }, [
    boughtTogetherEnabled,
    cartProductIds,
    conversionActive,
    crossSellEnabled,
    isMarketplacePreview,
    open,
    sourceProductId,
  ]);

  useEffect(() => {
    if (!open || loading || !sourceProductId) {
      return;
    }

    const totalSuggestions = relatedProducts.length + bundleProducts.length;
    if (totalSuggestions === 0) {
      return;
    }

    void trackStorefrontAppUsage({
      slug: "conversion-suite",
      feature: "cart_upsell_view",
        dedupeKey: `cart-upsell:${layout}:${sourceProductId}:${upsellStyle}`,
        metadata: {
          sourceProductId,
          relatedCount: relatedProducts.length,
          bundleCount: bundleProducts.length,
          layout,
          style: upsellStyle,
        },
    });
  }, [
    bundleProducts.length,
    loading,
    open,
    relatedProducts.length,
    sourceProductId,
    layout,
    upsellStyle,
  ]);

  const handleQuickAdd = (product: Product) => {
    void trackStorefrontAppUsage({
      slug: "conversion-suite",
      feature: "cart_upsell_quick_add",
      metadata: {
        sourceProductId: sourceProductId || undefined,
        productId: product.id,
      },
    });

    addItem(
      {
        productId: product.id,
        variantId: null,
        name: product.name,
        price: Number(product.price) || 0,
        basePrice: Number(product.price) || 0,
        comparePrice: typeof product.comparePrice === 'number' ? product.comparePrice : undefined,
        quantity: 1,
        imageUrl: getPrimaryProductImage(product),
        volumeDiscounts: getProductVolumeDiscounts(product),
      },
      { openCart: !isInline },
    );

    if (!isInline) {
      setIsOpen(true);
    }
  };

  const handleFallbackQuantityIncrease = () => {
    if (!firstCartItem || !canIncreaseFirstCartItem) {
      return;
    }

    const nextQuantity = Number(firstCartItem.quantity || 1) + 1;
    updateQuantity(firstCartItem.id, nextQuantity);
    setIsOpen(true);

    void trackStorefrontAppUsage({
      slug: "conversion-suite",
      feature: "cart_quantity_upsell_click",
      metadata: {
        sourceProductId: sourceProductId || undefined,
        cartItemId: firstCartItem.id,
        nextQuantity,
      },
    });
  };

  const compactDrawerSuggestions = useMemo(() => {
    const seen = new Set<string>();
    return [
      ...relatedProducts.map((product) => ({ product, label: crossSellCardLabel })),
      ...bundleProducts.map((product) => ({ product, label: bundleCardLabel })),
    ].filter(({ product }) => {
      if (!product?.id || seen.has(product.id)) {
        return false;
      }
      seen.add(product.id);
      return true;
    });
  }, [bundleCardLabel, bundleProducts, crossSellCardLabel, relatedProducts]);

  const renderProductCard = (product: Product, label: string) => {
    const hasVariants = Boolean(product.productVariants?.length || product.variants?.length);
    const variantSource = product.productVariants?.length
      ? product.productVariants
      : product.variants || [];
    const variantAxes = new Set(
      variantSource.flatMap((variant) =>
        Object.keys(variant?.attributes || variant?.attributeValues || {}),
      ),
    );
    const hasColorAxis = variantAxes.has("اللون");
    const hasSizeAxis = variantAxes.has("المقاس");
    const variantSelectionHint = hasColorAxis && hasSizeAxis
      ? "اختاري اللون والمقاس من صفحة المنتج"
      : hasColorAxis
        ? "اختاري اللون من صفحة المنتج"
        : hasSizeAxis
          ? "اختاري المقاس من صفحة المنتج"
          : "اختيارات متاحة من صفحة المنتج";
    const chooseOptionsCtaLabel = hasColorAxis && hasSizeAxis
      ? (prefersArabicCopy ? "اختاري اللون والمقاس" : "Choose color & size")
      : hasColorAxis
        ? (prefersArabicCopy ? "اختاري اللون" : "Choose color")
        : hasSizeAxis
          ? (prefersArabicCopy ? "اختاري المقاس" : "Choose size")
          : chooseOptionsLabel;
    const productPath = buildStorefrontPath(
      location.pathname,
      `/product/${product.slug || product.id}`,
      location.search,
    );
    const cardClassName = isBiteRush
      ? "rounded-[1.5rem] border border-[#f8c08c] bg-white/90 p-3 shadow-[0_18px_40px_-34px_rgba(247,115,22,0.3)]"
      : isKhemetLuxe
        ? "flex items-start gap-4 px-3 py-2"
      : isInline
        ? "rounded-[1.4rem] border border-border/70 bg-background/95 p-4 shadow-[0_22px_48px_-38px_rgba(15,23,42,0.35)]"
        : upsellStyle === "editorial"
          ? "rounded-[1.4rem] border border-border bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--secondary)/0.28))] p-3 shadow-sm"
          : upsellStyle === "compact"
            ? "rounded-xl border border-border bg-background p-2.5"
            : "rounded-2xl border border-border bg-background p-3";
    const imageClassName =
      isBiteRush
        ? "h-16 w-16 overflow-hidden rounded-[1rem] bg-[#fff1e2]"
        : isKhemetLuxe
          ? "h-24 w-24 shrink-0 overflow-hidden rounded-none bg-[#f8f7f6]"
        : isInline
          ? "h-20 w-20 overflow-hidden rounded-[1rem] border border-border/70 bg-muted"
          : upsellStyle === "compact"
            ? "h-14 w-14 overflow-hidden rounded-lg bg-muted"
            : "h-16 w-16 overflow-hidden rounded-xl bg-muted";
    const badgeClassName =
      isBiteRush
        ? "inline-flex rounded-full bg-[#111111] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white"
        : isKhemetLuxe
          ? "inline-flex rounded-full border border-[#dcc9a8] bg-[#fff7eb] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#725523]"
        : upsellStyle === "editorial"
        ? "inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-primary"
        : "inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-primary";

    if (isKhemetDrawer) {
      return (
        <KhemetCinematicUpsellCard
          key={`${label}-${product.id}`}
          product={product}
          label={label}
          currency={currency}
          prefersArabicCopy={prefersArabicCopy}
          chooseOptionsLabel={chooseOptionsLabel}
          onQuickAdd={handleQuickAdd}
          onOpenProduct={(p) => {
            setIsOpen(false);
          }}
          productPath={productPath}
          isInline={isInline}
        />
      );
    }

    return (
      <div
        key={`${label}-${product.id}`}
        className={cardClassName}
      >
        <div className="flex items-start gap-3">
          <div className={imageClassName}>
            <StorefrontProductImage
              candidates={getProductImageCandidates(product)}
              alt={product.name}
              requestedWidth={160}
              responsiveWidths={[96, 128, 160, 220]}
              responsiveSizes="80px"
              imageQuality={72}
              width="64"
              height="64"
              className={`h-full w-full ${isKhemetLuxe ? "object-cover" : "object-cover"}`}
              fallback={
                <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                  IMG
                </div>
              }
            />
          </div>

          <div className="min-w-0 flex-1">
            <span className={badgeClassName}>
              {label}
            </span>
            <h4 className={`mt-1.5 truncate text-sm font-bold ${isBiteRush ? "text-[#171717]" : isKhemetLuxe ? "font-heading text-base text-[#221a15]" : "text-foreground"}`}>
              {product.name}
            </h4>
            <p
              className={`mt-1 text-xs ${
                isBiteRush ? "text-[#8a4b1f]" : isKhemetLuxe ? "text-[#7b5a2f]" : "text-muted-foreground"
              }`}
            >
              {formatStorefrontCurrency(Number(product.price) || 0, currency)}
            </p>
            {isInline && !isKhemetLuxe ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {hasVariants
                  ? variantSelectionHint
                  : "إضافة مباشرة إلى السلة"}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-3">
          {hasVariants ? (
            <Link
              to={productPath}
              onClick={() => {
                if (!isInline) {
                  setIsOpen(false);
                }
              }}
            className={`inline-flex w-full items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold ${
                isBiteRush
                  ? "border border-[#171717] bg-white text-[#171717] hover:border-[#f97316] hover:text-[#f97316]"
                  : isKhemetLuxe
                    ? "border border-[#d6c39d] bg-white text-[#2d211e] hover:border-[#173f31] hover:text-[#173f31]"
                  : "border border-border text-foreground hover:bg-muted"
              }`}
            >
              {chooseOptionsCtaLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => handleQuickAdd(product)}
              className={`inline-flex w-full items-center justify-center rounded-xl px-3 py-2 text-sm font-bold hover:opacity-90 ${
                isBiteRush
                  ? "bg-[linear-gradient(135deg,#f97316_0%,#ef4444_100%)] text-white"
                  : isKhemetLuxe
                    ? "bg-[#173f31] text-[#fff7eb]"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {quickAddLabel}
            </button>
          )}
        </div>
      </div>
    );
  };

  if (
    !open ||
    !conversionActive ||
    (!crossSellEnabled && !boughtTogetherEnabled) ||
    !sourceProductId
  ) {
    return null;
  }

  const hasSuggestions = relatedProducts.length > 0 || bundleProducts.length > 0;
  const shouldRenderKhemetFallback =
    isKhemetDrawer && !loading && !hasSuggestions && Boolean(firstCartItem);

  if (!loading && !hasSuggestions && !shouldRenderKhemetFallback) {
    return null;
  }

  if (isKhemetDrawer) {
    const isFallbackRail = !loading && !hasSuggestions;

    return (
      <section
        data-testid={
          isFallbackRail
            ? "khemet-cart-conversion-nudges"
            : "khemet-cart-upsell-rail"
        }
        className="space-y-3 border-t border-[#eadfd0] pt-3"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-black text-[#2f2923]">
              {isFallbackRail
                ? prefersArabicCopy
                  ? "اقتراحات سريعة قبل التأكيد"
                  : "Smart add-ons before checkout"
                : prefersArabicCopy
                  ? "اقتراحات قريبة"
                  : "Related picks"}
            </h3>
            <p className="mt-0.5 text-[12px] leading-5 text-[#7b6d58]">
              {isFallbackRail
                ? prefersArabicCopy
                  ? "زودي الكمية أو كمّلي اختياراتك من غير ما تسيبي السلة."
                  : "Increase quantity or keep browsing without leaving the cart."
                : prefersArabicCopy
                  ? "إضافة خفيفة من نفس اللوك."
                  : "Small additions in the same look."}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#eef1ec] px-2.5 py-1 text-[10px] font-black text-[#1f4c3b]">
            {prefersArabicCopy ? "اختياري" : "Optional"}
          </span>
        </div>

        {loading ? (
          <div className="-mx-4 flex gap-3 overflow-hidden px-4 pb-2">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="h-[18rem] min-w-[16.5rem] max-w-[17.5rem] animate-pulse rounded-2xl border border-[#e7ddd0] bg-white/70"
              />
            ))}
          </div>
        ) : hasSuggestions ? (
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {compactDrawerSuggestions
              .slice(0, 4)
              .map(({ product, label }) => renderProductCard(product, label))}
          </div>
        ) : (
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-[16.5rem] max-w-[17.5rem] sm:min-w-[18.5rem] sm:max-w-[19.5rem] snap-center shrink-0 flex-col rounded-2xl border border-[#e7ddd0] bg-white/94 p-4 shadow-md">
              <span className="inline-flex self-start rounded-full bg-[#eef1ec] px-2.5 py-1 text-[10px] font-black text-[#1f4c3b]">
                {prefersArabicCopy ? "زيادة ذكية" : "Smart add"}
              </span>
              <h4 className="mt-2.5 text-sm font-black leading-snug text-[#2f2923]">
                {prefersArabicCopy ? "قطعة إضافية من نفس الاختيار" : "Add another of this pick"}
              </h4>
              <p className="mt-1.5 min-h-10 text-xs leading-5 text-[#7b6d58]">
                {prefersArabicCopy
                  ? "مناسبة لو محتاجة مقاس احتياطي أو هدية بنفس الستايل."
                  : "Helpful for a backup size or a gift in the same style."}
              </p>
              {firstCartItemName ? (
                <p dir="ltr" className="mt-1 truncate text-left text-xs font-semibold text-[#4a352e]">
                  {firstCartItemName} • {formatStorefrontCurrency(firstCartItemUnitPrice, currency)}
                </p>
              ) : null}
              <button
                type="button"
                onClick={handleFallbackQuantityIncrease}
                disabled={!canIncreaseFirstCartItem}
                className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-xl bg-[#173f31] px-3 text-xs font-black text-[#fff7eb] transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[#c8b8a6] disabled:text-[#fffaf4]"
              >
                {canIncreaseFirstCartItem
                  ? prefersArabicCopy
                    ? "زودي قطعة"
                    : "Add one more"
                  : prefersArabicCopy
                    ? "العرض محدد"
                    : "Offer locked"}
              </button>
            </div>

            <Link
              to={shopPath}
              onClick={() => setIsOpen(false)}
              className="flex min-w-[16.5rem] max-w-[17.5rem] sm:min-w-[18.5rem] sm:max-w-[19.5rem] snap-center shrink-0 flex-col rounded-2xl border border-[#e7ddd0] bg-[#fffaf4] p-4 shadow-md"
            >
              <span className="inline-flex self-start rounded-full bg-[#f2eadf] px-2.5 py-1 text-[10px] font-black text-[#725523]">
                {prefersArabicCopy ? "كمّلي اللوك" : "Keep browsing"}
              </span>
              <h4 className="mt-2.5 text-sm font-black leading-snug text-[#2f2923]">
                {prefersArabicCopy ? "اختاري لون أو موديل ثاني" : "Pick another color or model"}
              </h4>
              <p className="mt-1.5 min-h-10 text-xs leading-5 text-[#7b6d58]">
                {prefersArabicCopy
                  ? "افتحي الشوب ورجّعي للسلة في أي لحظة، اختياراتك محفوظة."
                  : "Open the shop and come back to the cart anytime."}
              </p>
              <span className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-xl border border-[#d7c6b4] bg-white px-3 text-xs font-black text-[#4a352e]">
                {prefersArabicCopy ? "افتحي الشوب" : "Open shop"}
              </span>
            </Link>
          </div>
        )}
      </section>
    );
  }

  return (
    <section
      className={`space-y-5 ${
        isInline
          ? "mt-6 rounded-[1.85rem] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--secondary)/0.18))] p-5 shadow-[0_30px_80px_-62px_rgba(15,23,42,0.38)]"
          : `border-t px-5 py-5 ${
              isBiteRush
                ? "border-[#f8c08c] bg-[linear-gradient(180deg,rgba(255,247,238,0.98),rgba(255,255,255,0.96))]"
                : isKhemetLuxe
                  ? "border-[#e7ddd0] bg-[linear-gradient(180deg,#fffaf4_0%,#f7ede2_100%)]"
                : upsellStyle === "editorial"
                  ? "border-border bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--secondary)/0.22))]"
                  : "border-border"
            }`
      }`}
    >
      <div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${
            isBiteRush
              ? "bg-[#111111] text-white"
              : isKhemetLuxe
                ? "border border-[#dcc9a8] bg-[#fff7eb] text-[#725523]"
              : upsellStyle === "editorial"
                ? "bg-primary/10 text-primary"
                : "bg-secondary text-primary"
          }`}
        >
          {upsellBadge}
        </span>
        <h3 className={`mt-2 text-base font-black ${isBiteRush ? "text-[#171717]" : isKhemetLuxe ? "text-[#2d211e]" : "text-foreground"}`}>
          {upsellTitle}
        </h3>
        <p className={`mt-1 text-sm ${isBiteRush ? "text-[#7c5a3b]" : isKhemetLuxe ? "text-[#7b5a2f]" : "text-muted-foreground"}`}>
          {upsellDescription}
        </p>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[1, 2].map((item) => (
            <div
              key={item}
              className={`h-24 animate-pulse rounded-2xl border ${
                isBiteRush ? "border-[#f8c08c] bg-[#fff1e2]" : "border-border bg-muted/40"
              }`}
            />
          ))}
        </div>
      ) : null}

      {!loading && relatedProducts.length > 0 ? (
        <div className="space-y-3">
          <div
            className={`${
              isInline
                ? "flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between"
                : "flex items-center justify-between"
            }`}
          >
            <h4 className={`text-sm font-black uppercase tracking-wide ${isBiteRush ? "text-[#171717]" : "text-foreground"}`}>
              {crossSellTitle}
            </h4>
            <span className={`text-xs ${isBiteRush ? "text-[#8a4b1f]" : "text-muted-foreground"}`}>
              {crossSellDescription}
            </span>
          </div>
          <div
            className={
              isInline
                ? "grid gap-3 md:grid-cols-2"
                : upsellStyle === "compact"
                  ? "grid gap-2 sm:grid-cols-2"
                  : "grid gap-3"
            }
          >
            {relatedProducts
              .slice(0, isInline ? 2 : 3)
              .map((product) => renderProductCard(product, crossSellCardLabel))}
          </div>
        </div>
      ) : null}

      {!loading && bundleProducts.length > 0 ? (
        <div className="space-y-3">
          <div
            className={`${
              isInline
                ? "flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between"
                : "flex items-center justify-between"
            }`}
          >
            <h4 className={`text-sm font-black uppercase tracking-wide ${isBiteRush ? "text-[#171717]" : "text-foreground"}`}>
              {boughtTogetherTitle}
            </h4>
            <span className={`text-xs ${isBiteRush ? "text-[#8a4b1f]" : "text-muted-foreground"}`}>
              {boughtTogetherDescription}
            </span>
          </div>
          <div
            className={
              isInline
                ? "grid gap-3 md:grid-cols-2"
                : upsellStyle === "compact"
                  ? "grid gap-2 sm:grid-cols-2"
                  : "grid gap-3"
            }
          >
            {bundleProducts
              .slice(0, isInline ? 2 : 3)
              .map((product) => renderProductCard(product, bundleCardLabel))}
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default CartUpsellHost;
