import type { QuantityOffer } from "../../utils/quantityOffers";
import { resolveQuantityOfferReferenceUnitPrice } from "../../utils/quantityOffers";
import type { Product, ProductVariant } from "../hooks/useProducts";
import type { CartItem } from "../store/useCartStore";
import type { PdpQuantityOfferSelection } from "../store/useQuantityOfferSelectionStore";
import { getPrimaryProductImage } from "./productImages";
import { getVariantAttributes } from "./variants";

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

const createBundleDiscount = (
  offerId: string,
  slotIndex: number,
  basePrice: number,
  discountedUnitPrice: number,
) => {
  const discountValue = Number(
    Math.max(0, basePrice - discountedUnitPrice).toFixed(2),
  );

  if (discountValue <= 0) {
    return [];
  }

  return [
    {
      id: `${offerId}-slot-${slotIndex + 1}`,
      minQuantity: 1,
      maxQuantity: 1,
      discountType: "fixed" as const,
      discountValue,
      isActive: true,
    },
  ];
};

export interface BuiltQuantityOfferCartItemsResult {
  items: CartItem[];
  subtotal: number;
}

interface BuildQuantityOfferCartItemsArgs {
  product: Product;
  quantityOfferSelection: PdpQuantityOfferSelection;
  bundleId?: string;
  treatSingleAsStandard?: boolean;
}

export const buildQuantityOfferCartItems = ({
  product,
  quantityOfferSelection,
  bundleId,
  treatSingleAsStandard = true,
}: BuildQuantityOfferCartItemsArgs): BuiltQuantityOfferCartItemsResult | null => {
  const effectiveBundleId =
    bundleId || `${product.id}-${quantityOfferSelection.offerId}-${Date.now()}`;
  const variants = product.productVariants || (product as any).variants || [];
  const hasVariants = variants.length > 0;
  const selections = Array.isArray(quantityOfferSelection.selections)
    ? quantityOfferSelection.selections
    : [];
  const attributesLabel = {
    "عرض الكمية": quantityOfferSelection.offerLabel,
  };

  if (!hasVariants) {
    const basePrice = resolveQuantityOfferReferenceUnitPrice(product);
    const isSingleStandard =
      treatSingleAsStandard && quantityOfferSelection.offerQuantity === 1;
    const item: CartItem = {
      id: `${effectiveBundleId}-single`,
      productId: product.id,
      variantId: null,
      name: product.name,
      price: quantityOfferSelection.unitPrice,
      basePrice,
      comparePrice: typeof product.comparePrice === 'number' ? product.comparePrice : undefined,
      quantity: quantityOfferSelection.offerQuantity,
      imageUrl: getPrimaryProductImage(product),
      attributes: isSingleStandard ? {} : attributesLabel,
      volumeDiscounts: isSingleStandard
        ? createBundleDiscount(
            quantityOfferSelection.offerId,
            0,
            basePrice,
            quantityOfferSelection.unitPrice,
          )
        : [
            {
              id: `${quantityOfferSelection.offerId}-bundle`,
              minQuantity: quantityOfferSelection.offerQuantity,
              maxQuantity: quantityOfferSelection.offerQuantity,
              discountType: "fixed",
              discountValue: Number(
                Math.max(0, basePrice - quantityOfferSelection.unitPrice).toFixed(2),
              ),
              isActive: true,
            },
          ],
      quantityOffer: isSingleStandard
        ? null
        : {
            groupId: effectiveBundleId,
            offerId: quantityOfferSelection.offerId,
            offerLabel: quantityOfferSelection.offerLabel,
            offerQuantity: quantityOfferSelection.offerQuantity,
            freeShipping: quantityOfferSelection.freeShipping,
          },
    };

    return {
      items: [item],
      subtotal: Number(
        (item.price * quantityOfferSelection.offerQuantity).toFixed(2),
      ),
    };
  }

  const items: CartItem[] = [];
  const selectionCount = Math.max(1, quantityOfferSelection.offerQuantity);

  for (let index = 0; index < selectionCount; index += 1) {
    const selectedAttributes = selections[index] || {};
    const selectedVariant = resolveVariantFromAttributes(variants, selectedAttributes);

    if (!selectedVariant) {
      return null;
    }

    const basePrice = resolveQuantityOfferReferenceUnitPrice(selectedVariant, product);
    const isSingleStandard =
      treatSingleAsStandard && quantityOfferSelection.offerQuantity === 1;

    const productColor =
      selectedAttributes.Color ||
      selectedAttributes["اللون"] ||
      selectedAttributes["لون"] ||
      selectedAttributes.color ||
      (selectedVariant as any).color ||
      undefined;
    const productSize =
      selectedAttributes.Size ||
      selectedAttributes["المقاس"] ||
      selectedAttributes["مقاس"] ||
      selectedAttributes.size ||
      (selectedVariant as any).size ||
      undefined;

    items.push({
      id: `${effectiveBundleId}-${index + 1}`,
      productId: product.id,
      variantId: selectedVariant.id,
      name: product.name,
      price: quantityOfferSelection.unitPrice,
      basePrice,
      comparePrice: typeof selectedVariant.comparePrice === 'number' ? selectedVariant.comparePrice : (typeof product.comparePrice === 'number' ? product.comparePrice : undefined),
      quantity: 1,
      imageUrl:
        (selectedVariant.image as string) || getPrimaryProductImage(product),
      productColor,
      productSize,
      attributes: isSingleStandard
        ? selectedAttributes
        : {
            ...selectedAttributes,
            ...attributesLabel,
          },
      volumeDiscounts: createBundleDiscount(
        quantityOfferSelection.offerId,
        index,
        basePrice,
        quantityOfferSelection.unitPrice,
      ),
      quantityOffer: isSingleStandard
        ? null
        : {
            groupId: effectiveBundleId,
            offerId: quantityOfferSelection.offerId,
            offerLabel: quantityOfferSelection.offerLabel,
            offerQuantity: quantityOfferSelection.offerQuantity,
            slotIndex: index + 1,
            freeShipping: quantityOfferSelection.freeShipping,
          },
    });
  }

  return {
    items,
    subtotal: Number(
      items.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2),
    ),
  };
};

export const ensureSinglePieceQuantityOffer = (
  offers: QuantityOffer[],
  unitPrice: number,
): QuantityOffer[] => {
  if (!offers || offers.length === 0) {
    return [];
  }

  const normalizedUnitPrice = Number(Math.max(0, unitPrice).toFixed(2));
  if (normalizedUnitPrice <= 0) {
    return offers;
  }

  const hasSingleOffer = offers.some((offer) => offer.quantity === 1);
  const nextOffers = hasSingleOffer
    ? offers.map((offer) =>
        offer.quantity === 1
          ? { ...offer, isDefault: true }
          : { ...offer, isDefault: false }
      )
    : [
        {
          id: "single-piece-offer",
          quantity: 1,
          unitPrice: normalizedUnitPrice,
          buyText: "",
          helperText: "",
          helperDescription: "",
          hideUnitPrice: false,
          enableFreeShipping: false,
          isDefault: true,
          isActive: true,
          sortOrder: 0,
        },
        ...offers.map((offer) => ({ ...offer, isDefault: false })),
      ];

  return nextOffers.sort((left, right) => {
    if ((left.sortOrder || 0) !== (right.sortOrder || 0)) {
      return (left.sortOrder || 0) - (right.sortOrder || 0);
    }

    return left.quantity - right.quantity;
  });
};

