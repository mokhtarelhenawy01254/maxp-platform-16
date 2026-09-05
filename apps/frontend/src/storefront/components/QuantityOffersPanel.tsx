import React from "react";
import { toast } from "sonner";
import {
  getActiveQuantityOffers,
  getQuantityOfferTotalsFromReferencePrices,
  resolveQuantityOfferReferenceUnitPrice,
  type QuantityOffer,
} from "../../utils/quantityOffers";
import type { Product, ProductVariant } from "../hooks/useProducts";
import { formatStorefrontCurrency } from "../utils/currency";
import { getVariantAttributes } from "../utils/variants";
import { getProductVolumeDiscounts } from "../utils/volumeDiscounts";
import VariantSelector from "./VariantSelector";
import { useCartStore } from "../store/useCartStore";
import { useQuantityOfferSelectionStore } from "../store/useQuantityOfferSelectionStore";
import { getPrimaryProductImage } from "../utils/productImages";
import { trackStorefrontAppUsage } from "../utils/appUsageTracking";
import { PDP_CHECKOUT_SECTION_ID } from "../utils/pdpCheckout";
import {
  buildQuantityOfferCartItems,
  ensureSinglePieceQuantityOffer,
} from "../utils/quantityOfferCartItems";

interface QuantityOffersPanelProps {
  product: Product;
  currency: string;
  variant?: QuantityOffersVariant;
  variantSettings?: {
    styles?: Record<string, unknown> | null;
    attributeImages?: Record<string, unknown> | null;
    attributeColors?: Record<string, unknown> | null;
  } | null;
  seedAttributes?: Record<string, string>;
  settings?: {
    title?: string;
    subtitle?: string;
    addOfferLabel?: string;
    continueToFormLabel?: string;
    copyFirstSelectionLabel?: string;
    freeShippingLabel?: string;
    bestValueLabel?: string;
    decisionMode?: string;
    hideWhenSingleOffer?: boolean;
    hideVariantSelectors?: boolean;
  };
}

export type QuantityOffersVariant =
  | "stacked-cards"
  | "compact-buybox"
  | "single-offer-focus"
  | "look-builder"
  | "selection-rail";

const buildDefaultSelection = (
  variants: ProductVariant[],
  seedAttributes?: Record<string, string>,
) => {
  if (seedAttributes && Object.keys(seedAttributes).length > 0) {
    return { ...seedAttributes };
  }

  const firstVariant = variants[0];
  return firstVariant ? getVariantAttributes(firstVariant) : {};
};

const buildOfferSelections = (
  quantity: number,
  variants: ProductVariant[],
  seedAttributes?: Record<string, string>,
) => {
  const defaultSelection = buildDefaultSelection(variants, seedAttributes);
  return Array.from({ length: Math.max(1, quantity) }, () => ({
    ...defaultSelection,
  }));
};

const resolveVariantFromAttributes = (
  variants: ProductVariant[],
  attributes: Record<string, string>,
) => {
  if (!variants.length) {
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

const getOfferTrackingMetadata = ({
  product,
  offer,
  offerLabel,
  offerTotal,
  savings,
  hasVariants,
}: {
  product: Product;
  offer: QuantityOffer;
  offerLabel: string;
  offerTotal: number;
  savings: number;
  hasVariants: boolean;
}) => ({
  productId: String(product.id || ""),
  productName: String(product.name || ""),
  offerId: offer.id,
  offerLabel,
  offerQuantity: offer.quantity,
  unitPrice: Number(offer.unitPrice || 0),
  offerTotal,
  savings,
  freeShipping: Boolean(offer.enableFreeShipping),
  hasVariants,
});

const buildFallbackQuantityOffers = (product: Product | null | undefined) => {
  if (!product) {
    return [];
  }

  const referenceUnitPrice = resolveQuantityOfferReferenceUnitPrice(product);
  if (referenceUnitPrice <= 0) {
    return [];
  }

  return getProductVolumeDiscounts(product)
    .map((discount, index): QuantityOffer | null => {
      const quantity = Math.max(1, discount.minQuantity);
      const rawDiscountPerUnit =
        discount.discountType === "percentage"
          ? (referenceUnitPrice * discount.discountValue) / 100
          : discount.discountValue;
      const normalizedDiscountPerUnit = Math.min(
        referenceUnitPrice,
        Math.max(0, rawDiscountPerUnit),
      );
      const unitPrice = Number(
        Math.max(0, referenceUnitPrice - normalizedDiscountPerUnit).toFixed(2),
      );

      if (unitPrice <= 0) {
        return null;
      }

      return {
        id: String(discount.id || `volume-discount-offer-${index + 1}`),
        quantity,
        unitPrice,
        buyText: "",
        helperText: "",
        helperDescription: "",
        hideUnitPrice: false,
        enableFreeShipping: false,
        isDefault: index === 0,
        isActive: discount.isActive !== false,
        sortOrder: quantity,
      };
    })
    .filter((offer): offer is QuantityOffer => Boolean(offer));
};

const getSelectionRailOfferTitle = (offer: QuantityOffer) => {
  if (offer.quantity <= 1) {
    return "قطعة واحدة";
  }

  if (offer.quantity === 2) {
    return "قطعتان";
  }

  return `${offer.quantity} قطع`;
};

const QuantityOffersPanel: React.FC<QuantityOffersPanelProps> = ({
  product,
  currency,
  variant = "stacked-cards",
  variantSettings,
  seedAttributes,
  settings,
}) => {
  const addItem = useCartStore((state) => state.addItem);
  const syncQuantityOfferSelection = useQuantityOfferSelectionStore(
    (state) => state.syncSelection,
  );
  const resetQuantityOfferSelection = useQuantityOfferSelectionStore(
    (state) => state.resetSelection,
  );
  const offers = React.useMemo(() => {
    const explicitOffers = getActiveQuantityOffers(product?.metadata);
    const baseOffers =
      explicitOffers.length > 0 ? explicitOffers : buildFallbackQuantityOffers(product);
    const singlePieceUnitPrice = Number(
      product?.price ||
        product?.productVariants?.[0]?.price ||
        0,
    );
    return ensureSinglePieceQuantityOffer(baseOffers, singlePieceUnitPrice);
  }, [product]);
  const variants = React.useMemo(
    () => product.productVariants || [],
    [product.productVariants],
  );
  const hasVariants = variants.length > 0;
  const defaultOffer = React.useMemo(
    () => offers.find((offer) => offer.isDefault) || offers[0] || null,
    [offers],
  );
  const [selectedOfferId, setSelectedOfferId] = React.useState<string>(
    defaultOffer?.id || "",
  );
  const [offerSelections, setOfferSelections] = React.useState<
    Record<string, Record<string, string>[]>
  >({});

  const activeOffer = React.useMemo(
    () => offers.find((offer) => offer.id === selectedOfferId) || defaultOffer,
    [defaultOffer, offers, selectedOfferId],
  );

  React.useEffect(() => {
    if (defaultOffer?.id && !selectedOfferId) {
      setSelectedOfferId(defaultOffer.id);
    }
  }, [defaultOffer?.id, selectedOfferId]);

  React.useEffect(() => {
    if (!activeOffer) {
      return;
    }

    setOfferSelections((current) => {
      const existingSelections = current[activeOffer.id];
      if (Array.isArray(existingSelections) && existingSelections.length === activeOffer.quantity) {
        return current;
      }

      return {
        ...current,
        [activeOffer.id]: buildOfferSelections(
          activeOffer.quantity,
          variants,
          seedAttributes,
        ),
      };
    });
  }, [activeOffer, seedAttributes, variants]);

  const title = settings?.title || "عروض الكميات";
  const subtitle =
    settings?.subtitle ||
    "اختر العرض المناسب ثم حدّد اللون أو المقاس لكل قطعة من نفس المكان.";
  const addOfferLabel = settings?.addOfferLabel || "أضف العرض إلى السلة";
  const continueToFormLabel =
    settings?.continueToFormLabel || "متابعة الطلب";
  const copyFirstSelectionLabel =
    settings?.copyFirstSelectionLabel || "نسخ اختيار القطعة الأولى";
  const freeShippingLabel = settings?.freeShippingLabel || "شحن مجاني";
  const bestValueLabel = settings?.bestValueLabel || "الأكثر توفيرًا";
  const isPrimaryDecisionMode = settings?.decisionMode === "primary";
  const hideWhenSingleOffer = settings?.hideWhenSingleOffer === true;
  const hideVariantSelectors = settings?.hideVariantSelectors === true;
  const isLookBuilder = variant === "look-builder";
  const isSelectionRail = variant === "selection-rail";
  const shouldHidePrimaryContinueButton =
    isPrimaryDecisionMode && isSelectionRail;
  const isCompactLike =
    variant === "compact-buybox" || isLookBuilder || isSelectionRail;
  const panelShellClassName =
    isSelectionRail
      ? "space-y-2 border-t border-[#ead9d8] pt-2"
    : isLookBuilder
      ? "space-y-3 rounded-[1.7rem] border border-[#ead9d8] bg-[linear-gradient(180deg,#fffdfc_0%,#fff7f4_100%)] p-4 shadow-[0_30px_90px_-70px_rgba(107,33,49,0.16)]"
      : variant === "compact-buybox"
      ? "space-y-2.5 rounded-[1.2rem] border border-border bg-card/85 p-3 shadow-sm"
      : variant === "single-offer-focus"
        ? "space-y-4 rounded-[1.7rem] border border-primary/12 bg-card/90 p-4 shadow-[0_28px_80px_-58px_hsl(var(--primary)/0.35)]"
        : "space-y-4 rounded-[1.6rem] border border-border bg-card/70 p-4 shadow-sm";
  const headerKickerClassName =
    isCompactLike
      ? "hidden"
      : "text-[11px] font-black uppercase tracking-[0.22em] text-primary";
  const headerTitleClassName =
    isSelectionRail
      ? "text-[15px] font-black tracking-tight text-[#3f2432]"
    : isLookBuilder
      ? "text-lg font-black tracking-tight text-[#3f2432]"
      : variant === "compact-buybox"
      ? "text-base font-black text-foreground"
      : "text-xl font-black text-foreground";
  const headerSubtitleClassName =
    isSelectionRail
      ? "text-[11px] leading-5 text-[#8d6a66]"
    : isLookBuilder
      ? "text-[12px] leading-6 text-[#8d6a66]"
      : variant === "compact-buybox"
      ? "text-[11px] leading-5 text-muted-foreground"
      : "text-sm leading-6 text-muted-foreground";
  const offersWrapperClassName =
    isSelectionRail ? "space-y-2" : isCompactLike ? "space-y-2.5" : "space-y-3";
  const activeSelections = activeOffer ? offerSelections[activeOffer.id] || [] : [];
  const isActiveOfferSelectionReady = activeOffer
    ? !hasVariants ||
      (activeSelections.length === activeOffer.quantity &&
        activeSelections.every((selection) =>
          Boolean(resolveVariantFromAttributes(variants, selection || {})),
        ))
    : false;
  const getSelectionsForOffer = React.useCallback(
    (offer: QuantityOffer) => {
      const existingSelections = offerSelections[offer.id];
      if (
        Array.isArray(existingSelections) &&
        existingSelections.length === offer.quantity
      ) {
        return existingSelections;
      }

      return buildOfferSelections(offer.quantity, variants, seedAttributes);
    },
    [offerSelections, seedAttributes, variants],
  );

  const getReferenceUnitPricesForOffer = React.useCallback(
    (offer: QuantityOffer) => {
      if (!hasVariants) {
        const productReferencePrice = resolveQuantityOfferReferenceUnitPrice(product);
        return Array.from({ length: offer.quantity }, () => productReferencePrice);
      }

      const selections = getSelectionsForOffer(offer);
      return Array.from({ length: offer.quantity }, (_, index) => {
        const selectedVariant = resolveVariantFromAttributes(
          variants,
          selections[index] || {},
        );
        return resolveQuantityOfferReferenceUnitPrice(selectedVariant, product);
      });
    },
    [getSelectionsForOffer, hasVariants, product, variants],
  );

  const getOfferTotals = React.useCallback(
    (offer: QuantityOffer) =>
      getQuantityOfferTotalsFromReferencePrices(
        offer,
        getReferenceUnitPricesForOffer(offer),
      ),
    [getReferenceUnitPricesForOffer],
  );

  const bestSavings = offers.reduce(
    (maxSavings, offer) => Math.max(maxSavings, getOfferTotals(offer).savings),
    0,
  );

  React.useEffect(() => {
    if (!product?.id || !activeOffer) {
      resetQuantityOfferSelection(product?.id);
      return;
    }

    const activeTotals = getOfferTotals(activeOffer);
    const selectionsReady = !hasVariants
      ? true
      : activeSelections.length === activeOffer.quantity &&
        activeSelections.every((selection) =>
          Boolean(resolveVariantFromAttributes(variants, selection || {})),
        );
    const offerLabel =
      activeOffer.buyText ||
      `اشتري ${activeOffer.quantity} قطعة بـ${formatStorefrontCurrency(
        activeTotals.offerTotal,
        currency,
      )}`;

    syncQuantityOfferSelection({
      productId: String(product.id),
      offerId: activeOffer.id,
      offerLabel,
      offerQuantity: activeOffer.quantity,
      offerTotal: activeTotals.offerTotal,
      unitPrice: Number(activeOffer.unitPrice || 0),
      savings: activeTotals.savings,
      freeShipping: Boolean(activeOffer.enableFreeShipping),
      selections: activeSelections,
      isReady: selectionsReady,
    });
  }, [
    activeOffer,
    activeSelections,
    currency,
    getOfferTotals,
    hasVariants,
    product?.id,
    resetQuantityOfferSelection,
    syncQuantityOfferSelection,
    variants,
  ]);

  React.useEffect(
    () => () => {
      resetQuantityOfferSelection(String(product?.id || ""));
    },
    [product?.id, resetQuantityOfferSelection],
  );

  React.useEffect(() => {
    if (!product?.id || offers.length === 0) {
      return;
    }

    void trackStorefrontAppUsage({
      slug: "quantity-offers-pro",
      feature: "quantity_offer_panel_view",
      quantity: offers.length,
      metadata: {
        productId: String(product.id),
        productName: String(product.name || ""),
        offersCount: offers.length,
        hasVariants,
      },
      dedupeKey: `quantity-offers-panel:${product.id}:${offers.length}`,
    });
  }, [hasVariants, offers.length, product?.id, product?.name]);

  if (!product || offers.length === 0) {
    return null;
  }

  const updateSlotSelection = (
    offerId: string,
    slotIndex: number,
    nextAttributes: Record<string, string>,
  ) => {
    setOfferSelections((current) => {
      const currentSelections = current[offerId] || [];
      const nextSelections = currentSelections.map((selection, index) =>
        index === slotIndex ? nextAttributes : selection,
      );

      return {
        ...current,
        [offerId]: nextSelections,
      };
    });
  };

  const copyFirstSelection = () => {
    if (!activeOffer || activeSelections.length <= 1) {
      return;
    }

    const firstSelection = activeSelections[0];
    if (!firstSelection || Object.keys(firstSelection).length === 0) {
      return;
    }

    setOfferSelections((current) => ({
      ...current,
      [activeOffer.id]: Array.from({ length: activeOffer.quantity }, () => ({
        ...firstSelection,
      })),
    }));
  };

  const handleAddOfferToCart = () => {
    if (!activeOffer) {
      return;
    }
    const offerTotals = getOfferTotals(activeOffer);
    const offerLabel =
      activeOffer.buyText ||
      `اشتري ${activeOffer.quantity} قطعة بـ${formatStorefrontCurrency(
        offerTotals.offerTotal,
        currency,
      )} بدل ${formatStorefrontCurrency(offerTotals.originalTotal, currency)}`;

    const builtOfferItems = buildQuantityOfferCartItems({
      product,
      quantityOfferSelection: {
        productId: String(product.id),
        offerId: activeOffer.id,
        offerLabel,
        offerQuantity: activeOffer.quantity,
        offerTotal: offerTotals.offerTotal,
        unitPrice: Number(activeOffer.unitPrice || 0),
        savings: offerTotals.savings,
        freeShipping: Boolean(activeOffer.enableFreeShipping),
        selections: activeSelections,
        isReady: !hasVariants || activeSelections.every((selection) =>
          Boolean(resolveVariantFromAttributes(variants, selection || {})),
        ),
      },
    });

    if (!builtOfferItems) {
      toast.error(
        activeOffer.quantity > 1
          ? `يرجى استكمال اختيار كل قطعة أولًا`
          : `يرجى استكمال اختيار المنتج أولًا`,
      );
      return;
    }

    builtOfferItems.items.forEach((item, index) => {
      addItem(item, { openCart: index === builtOfferItems.items.length - 1 });
    });

    window.dispatchEvent(new Event("cartUpdated"));
    toast.success(`تمت إضافة عرض ${activeOffer.quantity} قطع إلى السلة`);
    void trackStorefrontAppUsage({
      slug: "quantity-offers-pro",
      feature: "quantity_offer_add_to_cart",
      quantity: activeOffer.quantity,
      totalCost: offerTotals.offerTotal,
      metadata: {
          ...getOfferTrackingMetadata({
            product,
            offer: activeOffer,
            offerLabel,
            offerTotal: offerTotals.offerTotal,
            savings: offerTotals.savings,
            hasVariants,
          }),
          mode:
            hasVariants && activeOffer.quantity > 1 ? "mix-and-match" : "single-line",
        },
      });
  };

  const handleContinueToOrder = () => {
    if (!isActiveOfferSelectionReady) {
      toast.error(
        activeOffer?.quantity && activeOffer.quantity > 1
          ? "يرجى استكمال اختيار كل قطعة أولًا"
          : "يرجى استكمال اختيار المنتج أولًا",
      );
      return;
    }

    document.getElementById(PDP_CHECKOUT_SECTION_ID)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    void trackStorefrontAppUsage({
      slug: "quantity-offers-pro",
      feature: "quantity_offer_continue_to_form",
      quantity: activeOffer?.quantity || 0,
      totalCost: activeOffer ? getOfferTotals(activeOffer).offerTotal : 0,
      metadata: activeOffer
        ? getOfferTrackingMetadata({
            product,
            offer: activeOffer,
            offerLabel:
              activeOffer.buyText ||
              `اشتري ${activeOffer.quantity} قطعة`,
            offerTotal: getOfferTotals(activeOffer).offerTotal,
            savings: getOfferTotals(activeOffer).savings,
            hasVariants,
          })
        : {
            productId: String(product.id || ""),
            productName: String(product.name || ""),
          },
    });
  };

  if (hideWhenSingleOffer && offers.length <= 1) {
    return null;
  }

  return (
    <section className={panelShellClassName}>
      <div className="space-y-1">
        {!isCompactLike ? (
          <p className={headerKickerClassName}>عروض الكميات</p>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <h3 className={headerTitleClassName}>{title}</h3>
          {isSelectionRail ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-700 border border-emerald-200/60">
              ✓ خصومات فورية
            </span>
          ) : null}
        </div>
        <p className={headerSubtitleClassName}>{subtitle}</p>
      </div>

      <div className={offersWrapperClassName}>
        {offers.map((offer) => {
          const isSelected = activeOffer?.id === offer.id;
          const referenceUnitPrices = getReferenceUnitPricesForOffer(offer);
          const referencePrice = referenceUnitPrices[0] || 0;
          const hasMixedReferencePrices =
            new Set(
              referenceUnitPrices.map((priceValue) => priceValue.toFixed(2)),
            ).size > 1;
          const totals = getOfferTotals(offer);
          const defaultBuyText =
            offer.buyText ||
            `اشتري ${offer.quantity} قطعة بـ${formatStorefrontCurrency(
              totals.offerTotal,
              currency,
            )} بدل ${formatStorefrontCurrency(
              totals.originalTotal,
              currency,
            )}`;
          const buyText = isSelectionRail
            ? (offer.buyText || getSelectionRailOfferTitle(offer))
            : defaultBuyText;
          const isBestValue = totals.savings > 0 && totals.savings === bestSavings;

          return (
            <div
              key={offer.id}
              className={`overflow-hidden rounded-[1.25rem] border transition-all duration-200 ${
                isSelected
                  ? variant === "single-offer-focus"
                    ? "border-primary/65 bg-background shadow-[0_28px_80px_-52px_hsl(var(--primary)/0.55)]"
                    : isSelectionRail
                    ? "border-[#8f5c44] bg-[linear-gradient(180deg,#fffdfb_0%,#fff9f6_100%)] shadow-sm ring-1 ring-[#8f5c44]/25"
                    : "border-primary/60 bg-background shadow-[0_24px_60px_-45px_hsl(var(--primary)/0.55)]"
                  : isSelectionRail
                  ? "border-[#e6ded9] bg-white/95 hover:border-[#c59a7a]/60 hover:bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                  : isLookBuilder
                  ? "border-[#ead9d8] bg-white/92 hover:border-[#d7b9bf]"
                  : variant === "compact-buybox"
                  ? "border-border bg-background/90 hover:border-primary/30"
                  : "border-border bg-background/70 hover:border-primary/30"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedOfferId(offer.id);
                  void trackStorefrontAppUsage({
                    slug: "quantity-offers-pro",
                    feature: "quantity_offer_select",
                    quantity: offer.quantity,
                    totalCost: totals.offerTotal,
                    metadata: getOfferTrackingMetadata({
                      product,
                      offer,
                      offerLabel: defaultBuyText,
                      offerTotal: totals.offerTotal,
                      savings: totals.savings,
                      hasVariants,
                    }),
                  });
                }}
                className={`flex w-full items-center justify-between gap-3 text-start transition-colors ${
                  isSelectionRail ? "px-3.5 py-3" : isCompactLike ? "p-3" : "p-4"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                      isSelected
                        ? isSelectionRail
                          ? "border-[#8f5c44] bg-[#8f5c44]"
                          : "border-primary bg-primary"
                        : "border-stone-300 bg-white"
                    }`}
                    aria-hidden="true"
                  >
                    {isSelected ? (
                      <span className="h-2 w-2 rounded-full bg-white" />
                    ) : null}
                  </span>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {offer.helperText ? (
                        <span className="inline-flex items-center rounded-md bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-black text-amber-800 border border-amber-500/20">
                          {offer.helperText}
                        </span>
                      ) : offer.quantity === 2 ? (
                        <span className="inline-flex items-center rounded-md bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-black text-amber-800 border border-amber-500/20">
                          ⭐ الأكثر طلباً
                        </span>
                      ) : offer.quantity >= 3 && totals.savings > 0 ? (
                        <span className="inline-flex items-center rounded-md bg-rose-500/15 px-2 py-0.5 text-[10.5px] font-black text-rose-700 border border-rose-500/20">
                          🔥 التوفير الأكبر
                        </span>
                      ) : null}

                      {totals.savings > 0 ? (
                        <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10.5px] font-black text-emerald-700 border border-emerald-500/25">
                          وفّر {formatStorefrontCurrency(totals.savings, currency)}
                        </span>
                      ) : null}

                      {offer.enableFreeShipping ? (
                        <span className="inline-flex items-center rounded-md bg-blue-500/15 px-2 py-0.5 text-[10.5px] font-black text-blue-700 border border-blue-500/20">
                          🚚 {freeShippingLabel}
                        </span>
                      ) : null}

                      {isBestValue && !offer.helperText && offer.quantity !== 2 && !(offer.quantity >= 3 && totals.savings > 0) ? (
                        <span className="inline-flex items-center rounded-md bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-black text-amber-700 border border-amber-500/20">
                          {bestValueLabel}
                        </span>
                      ) : null}
                    </div>

                    <p
                      className={`font-black tracking-tight text-foreground ${
                        isSelectionRail
                          ? "text-[14px] leading-5 text-[#2c1810]"
                          : isLookBuilder
                          ? "text-base leading-6"
                          : variant === "compact-buybox"
                          ? "text-sm leading-5"
                          : "text-base sm:text-lg"
                      }`}
                    >
                      {buyText}
                    </p>

                    {!offer.hideUnitPrice && offer.quantity > 1 ? (
                      <p className="text-[11px] text-muted-foreground font-medium">
                        سعر القطعة داخل العرض:{" "}
                        <span className="font-bold text-foreground">
                          {formatStorefrontCurrency(offer.unitPrice, currency)}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="shrink-0 text-end space-y-0.5">
                  <div className="flex items-baseline justify-end gap-1.5">
                    <span
                      className={`font-black text-foreground ${
                        isSelectionRail
                          ? "text-[15px] sm:text-base text-[#2c1810]"
                          : "text-base sm:text-lg"
                      }`}
                    >
                      {formatStorefrontCurrency(totals.offerTotal, currency)}
                    </span>
                  </div>
                  {totals.savings > 0 ? (
                    <div className="text-[11px] text-muted-foreground/75 line-through">
                      {hasMixedReferencePrices
                        ? formatStorefrontCurrency(totals.originalTotal, currency)
                        : formatStorefrontCurrency(totals.originalTotal, currency)}
                    </div>
                  ) : null}
                </div>
              </button>

              {isSelected ? (
                <div
                  className={`border-t border-[#f0e6e2] ${
                    isSelectionRail
                      ? "px-3.5 pb-3.5 pt-3"
                      : isCompactLike
                      ? "px-3 pb-3 pt-2.5"
                      : "px-4 pb-4 pt-4"
                  }`}
                >
                  {offer.helperDescription ? (
                    <p
                      className={`mb-3 text-sm leading-6 text-muted-foreground ${
                        isSelectionRail
                          ? "rounded-xl bg-[#8f5c44]/5 border border-[#8f5c44]/15 px-3 py-2 text-[12px] leading-5 text-[#6d4c4a]"
                          : "rounded-2xl bg-secondary/50 px-4 py-3"
                      }`}
                    >
                      {offer.helperDescription}
                    </p>
                  ) : null}

                  {hasVariants && !hideVariantSelectors ? (
                    <div className={isCompactLike ? "space-y-3" : "space-y-4"}>
                      {offer.quantity > 1 ? (
                        <div className={`flex items-center justify-between gap-2 flex-wrap rounded-xl bg-stone-50/80 border border-stone-200/70 px-3 py-2`}>
                          <p className={isSelectionRail ? "text-[11.5px] font-bold text-[#6d4c4a]" : isCompactLike ? "text-xs font-semibold text-foreground" : "text-sm font-semibold text-foreground"}>
                            حددي مقاس ولون كل قطعة:
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              copyFirstSelection();
                              void trackStorefrontAppUsage({
                                slug: "quantity-offers-pro",
                                feature: "quantity_offer_copy_first_selection",
                                quantity: offer.quantity,
                                metadata: getOfferTrackingMetadata({
                                  product,
                                  offer,
                                  offerLabel: defaultBuyText,
                                  offerTotal: totals.offerTotal,
                                  savings: totals.savings,
                                  hasVariants,
                                }),
                              });
                            }}
                            className={`inline-flex items-center gap-1 rounded-lg border border-[#8f5c44]/30 bg-white px-2.5 py-1 text-[11px] font-black text-[#8f5c44] shadow-2xs hover:bg-[#8f5c44]/5 transition active:scale-95`}
                          >
                            <span>⚡</span>
                            <span>{copyFirstSelectionLabel}</span>
                          </button>
                        </div>
                      ) : null}

                      {Array.from({ length: offer.quantity }).map((_, slotIndex) => (
                        <div
                          key={`${offer.id}-${slotIndex + 1}`}
                          className={`${
                            isSelectionRail
                              ? `${slotIndex === 0 ? "pt-0" : "border-t border-[#f0e6e2] pt-3"}`
                              : "border border-border bg-background"
                          } ${
                            isSelectionRail
                              ? "space-y-2 pb-1"
                              : isCompactLike
                              ? "rounded-[0.95rem] px-3 py-2.5"
                              : "rounded-[1.2rem] px-4 py-4"
                          }`}
                        >
                          {(() => {
                            const slotSelection = activeSelections[slotIndex] || {};
                            const slotVariant = resolveVariantFromAttributes(
                              variants,
                              slotSelection,
                            );
                            const slotStock =
                              variants.length > 0
                                ? typeof slotVariant?.stock === "number" &&
                                  Number.isFinite(slotVariant.stock)
                                  ? slotVariant.stock
                                  : null
                                : typeof product.stock === "number" &&
                                    Number.isFinite(product.stock)
                                  ? product.stock
                                  : null;

                            return (
                              <>
                                {offer.quantity > 1 ? (
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-1.5">
                                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#8f5c44]/10 text-[10px] font-black text-[#8f5c44]">
                                        {slotIndex + 1}
                                      </span>
                                      <h4 className={isSelectionRail ? "text-[12px] font-black text-[#3f2432]" : isCompactLike ? "text-xs font-black text-foreground" : "text-sm font-black text-foreground"}>
                                        القطعة {slotIndex + 1}
                                      </h4>
                                    </div>
                                    <span className="text-[10px] font-bold text-muted-foreground">
                                      {slotIndex + 1} من {offer.quantity}
                                    </span>
                                  </div>
                                ) : null}
                                <VariantSelector
                                  variants={variants}
                                  selectedAttributes={slotSelection}
                                  onChange={(nextAttributes) =>
                                    updateSlotSelection(offer.id, slotIndex, nextAttributes)
                                  }
                                  density={isCompactLike ? "compact" : "default"}
                                  layout={isSelectionRail ? "inline-compact" : "default"}
                                  variantSettings={variantSettings}
                                />
                                {isSelectionRail && slotVariant && slotStock !== null ? (
                                  <div className="flex justify-end">
                                    <span
                                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black ${
                                        slotStock <= 10
                                          ? "border-[#f2d6b1] bg-[#fff8ee] text-[#b25a14]"
                                          : "border-[#f0d7d2] bg-white text-[#6d4c4a]"
                                      }`}
                                    >
                                      {slotStock <= 10
                                        ? `المتبقي ${slotStock}`
                                        : "جاهز للتوصيل"}
                                    </span>
                                  </div>
                                ) : null}
                              </>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div
                    className={`mt-3 flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 ${
                      isSelectionRail
                        ? "bg-[#8f5c44]/5 border border-[#8f5c44]/15"
                        : isCompactLike
                        ? "bg-muted/40"
                        : "border border-border bg-muted/30 p-3"
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-foreground">
                        إجمالي الباقة:
                      </span>
                      <span className="text-[14px] font-black text-foreground">
                        {formatStorefrontCurrency(totals.offerTotal, currency)}
                      </span>
                      {totals.savings > 0 ? (
                        <span className="text-xs text-muted-foreground line-through">
                          {formatStorefrontCurrency(totals.originalTotal, currency)}
                        </span>
                      ) : null}
                    </div>
                    {totals.savings > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-800">
                        وفرت {formatStorefrontCurrency(totals.savings, currency)}
                      </span>
                    ) : null}
                  </div>

                  {!shouldHidePrimaryContinueButton ? (
                    <button
                      type="button"
                      onClick={
                        isPrimaryDecisionMode
                          ? handleContinueToOrder
                          : handleAddOfferToCart
                      }
                      disabled={isPrimaryDecisionMode && !isActiveOfferSelectionReady}
                      className={`mt-2.5 inline-flex items-center justify-center bg-primary font-black text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
                        isLookBuilder
                          ? "h-11 w-full rounded-[1rem] bg-[#3f2432] px-5 text-[13px] hover:bg-[#5a3247]"
                          : isSelectionRail
                          ? "h-10 w-full rounded-[0.95rem] bg-[#3f2432] px-4 text-[12px] hover:bg-[#5a3247]"
                          : variant === "compact-buybox"
                          ? "h-11 w-full rounded-[1rem] px-5 text-[13px]"
                          : "h-12 rounded-xl px-6 text-sm"
                      }`}
                    >
                      {isPrimaryDecisionMode ? continueToFormLabel : addOfferLabel}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default QuantityOffersPanel;
