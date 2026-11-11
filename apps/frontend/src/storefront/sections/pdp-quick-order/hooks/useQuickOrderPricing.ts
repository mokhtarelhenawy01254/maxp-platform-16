import { useMemo } from 'react';
import type { Product } from '../../../hooks/useProducts';
import {
  calculateVolumeDiscountPricing,
  type VolumeDiscountTier,
} from '../../../utils/volumeDiscounts';
import {
  getActiveStorePromotionFromCompany,
  calculateStorePromotionDiscount,
} from '../../../utils/storePromotion';
import { getStorefrontFreeShippingPromotion } from '../../../utils/marketplaceApps';
import { useMinimumOrderSettings } from '../../../hooks/useMinimumOrderSettings';
import type { CartItem } from '../../../store/useCartStore';
import { translateAttributeKey } from '../quickOrderHelpers';
import type { QuickOrderPaymentMethod } from '../quickOrderTypes';

export const useQuickOrderPricing = ({
  product,
  selection,
  quantity,
  quantityOfferSelection,
  storefrontSettings,
  shippingCost,
  paymentMethod,
  walletPaymentSettings,
  walletEnabled,
  prefersArabicCopy,
}: {
  product: Product & { imageUrl?: string; hasVariants: boolean };
  selection: any;
  quantity: number;
  quantityOfferSelection: any;
  storefrontSettings: any;
  shippingCost: number;
  paymentMethod: QuickOrderPaymentMethod;
  walletPaymentSettings: any;
  walletEnabled: boolean;
  prefersArabicCopy: boolean;
}) => {
  const currency =
    storefrontSettings?.storefront?.settings?.currency ||
    storefrontSettings?.company?.currency ||
    'EGP';

  const activeSelection =
    selection && selection.productId === product.id ? selection : null;

  const isOutOfStock = useMemo(() => {
    if (activeSelection?.isOutOfStock !== undefined) {
      return activeSelection.isOutOfStock;
    }
    const isBackorderAllowed =
      Boolean(product.allowBackorders) ||
      (product.metadata as any)?.allowBackorders === true ||
      product.trackInventory === false ||
      Boolean(product.isPreOrder);
    if (product.trackInventory === false || isBackorderAllowed) {
      return false;
    }
    const rawStock =
      typeof product.stock === 'number' && Number.isFinite(product.stock)
        ? product.stock
        : null;
    return typeof rawStock === 'number' && rawStock <= 0;
  }, [activeSelection?.isOutOfStock, product]);

  const activeQuantityOffer =
    quantityOfferSelection && quantityOfferSelection.productId === product.id
      ? quantityOfferSelection
      : null;
  const activeUnitPrice = activeSelection?.unitPrice ?? product.price;

  const activeAttributes = useMemo(
    () => activeSelection?.attributes || {},
    [activeSelection?.attributes],
  );

  const attributeSummary = useMemo(
    () =>
      Object.entries(activeAttributes || {})
        .filter(([, value]) => typeof value === 'string' && value.trim())
        .map(
          ([key, value]) =>
            `${translateAttributeKey(key, prefersArabicCopy)}: ${value}`,
        )
        .join(' - '),
    [activeAttributes, prefersArabicCopy],
  );

  const activeDiscounts = useMemo(
    () =>
      Array.isArray(activeSelection?.volumeDiscounts)
        ? (activeSelection.volumeDiscounts as VolumeDiscountTier[])
        : [],
    [activeSelection?.volumeDiscounts],
  );

  const pricing = useMemo(
    () =>
      calculateVolumeDiscountPricing({
        unitPrice: activeUnitPrice,
        quantity,
        discounts: activeDiscounts,
      }),
    [activeDiscounts, activeUnitPrice, quantity],
  );

  const requiresVariantSelection =
    product.hasVariants && Boolean(activeSelection?.requiresVariantSelection);
  const isSelectionReady =
    activeQuantityOffer
      ? Boolean(activeQuantityOffer.isReady)
      : !requiresVariantSelection || Boolean(activeSelection?.isSelectionReady);
  const resolvedSubtotal =
    activeQuantityOffer?.offerTotal ?? pricing.lineSubtotal;

  const walletDiscountEnabled = Boolean(walletPaymentSettings?.discountEnabled);
  const walletDiscountPercent = Math.max(
    0,
    Number(walletPaymentSettings?.discountPercent || 0),
  );
  const walletDiscountActive =
    walletDiscountEnabled &&
    walletDiscountPercent > 0 &&
    (paymentMethod === 'card' || (paymentMethod === 'wallet' && walletEnabled));
  const walletDiscount =
    walletDiscountActive
      ? (Number(resolvedSubtotal) || 0) * (walletDiscountPercent / 100)
      : 0;

  const storePromotion = useMemo(
    () => getActiveStorePromotionFromCompany(storefrontSettings?.company),
    [storefrontSettings?.company],
  );

  const storePromoDiscountResult = useMemo(() => {
    if (activeQuantityOffer || !storePromotion || !storePromotion.isActive) {
      return { discount: 0, tier: null };
    }
    const currentItems = [
      {
        productId: product.id,
        quantity,
        price: pricing.effectiveUnitPrice,
        comparePrice: product.comparePrice,
      },
    ];
    return calculateStorePromotionDiscount(currentItems, storePromotion);
  }, [activeQuantityOffer, storePromotion, product.id, quantity, pricing.effectiveUnitPrice, product.comparePrice]);

  const storePromoDiscount = storePromoDiscountResult.discount;
  const storePromoTier = storePromoDiscountResult.tier;

  const freeShippingPromotion = useMemo(
    () =>
      getStorefrontFreeShippingPromotion(
        storefrontSettings,
        resolvedSubtotal - storePromoDiscount,
      ),
    [storefrontSettings, resolvedSubtotal, storePromoDiscount],
  );
  const isFreeShippingEligible =
    Boolean(activeQuantityOffer?.enableFreeShipping) ||
    freeShippingPromotion.eligible;
  const effectiveShippingCost = isFreeShippingEligible ? 0 : shippingCost;

  const total = Math.max(
    0,
    resolvedSubtotal - storePromoDiscount + effectiveShippingCost - walletDiscount,
  );
  const minimumOrder = useMinimumOrderSettings(Math.max(0, resolvedSubtotal - storePromoDiscount), currency);

  const trackingItem = useMemo<CartItem | null>(() => {
    if (activeQuantityOffer) {
      return null;
    }

    if (!isSelectionReady) {
      return null;
    }

    const resolvedColor =
      activeAttributes.Color ||
      activeAttributes['اللون'] ||
      activeAttributes['لون'] ||
      activeAttributes.color ||
      undefined;
    const resolvedSize =
      activeAttributes.Size ||
      activeAttributes['المقاس'] ||
      activeAttributes['مقاس'] ||
      activeAttributes.size ||
      undefined;

    return {
      id:
        activeSelection?.variantId
          ? `${product.id}-${activeSelection.variantId}`
          : `${product.id}-${JSON.stringify(activeAttributes)}`,
      productId: product.id,
      variantId: activeSelection?.variantId ?? null,
      name: product.name,
      price: activeUnitPrice,
      basePrice: activeSelection?.basePrice ?? activeUnitPrice,
      comparePrice: typeof product.comparePrice === 'number' ? product.comparePrice : undefined,
      quantity,
      imageUrl: activeSelection?.imageUrl || product.imageUrl,
      productColor: resolvedColor,
      productSize: resolvedSize,
      attributes: activeAttributes,
      volumeDiscounts: activeDiscounts,
    };
  }, [
    activeAttributes,
    activeDiscounts,
    activeQuantityOffer,
    activeSelection?.basePrice,
    activeSelection?.imageUrl,
    activeSelection?.variantId,
    activeUnitPrice,
    isSelectionReady,
    product.id,
    product.imageUrl,
    product.name,
    product.comparePrice,
    quantity,
  ]);

  const quickOrderFingerprint = useMemo(() => {
    if (activeQuantityOffer) {
      return [
        product.id,
        activeQuantityOffer.offerId,
        activeQuantityOffer.offerQuantity,
        activeQuantityOffer.offerTotal,
        JSON.stringify(activeQuantityOffer.selections || []),
      ].join(':');
    }

    if (!trackingItem) {
      return '';
    }

    return [
      trackingItem.productId,
      trackingItem.variantId || 'base',
      trackingItem.quantity,
      trackingItem.price,
    ].join(':');
  }, [activeQuantityOffer, product.id, trackingItem]);

  return {
    currency,
    activeSelection,
    isOutOfStock,
    activeQuantityOffer,
    activeUnitPrice,
    activeAttributes,
    attributeSummary,
    activeDiscounts,
    pricing,
    isSelectionReady,
    resolvedSubtotal,
    walletDiscountEnabled,
    walletDiscountPercent,
    walletDiscountActive,
    walletDiscount,
    storePromotion,
    storePromoDiscount,
    storePromoTier,
    freeShippingPromotion,
    isFreeShippingEligible,
    effectiveShippingCost,
    total,
    minimumOrder,
    trackingItem,
    quickOrderFingerprint,
  };
};
