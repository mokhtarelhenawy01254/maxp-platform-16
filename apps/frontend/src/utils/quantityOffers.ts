export interface QuantityOffer {
  id: string;
  quantity: number;
  unitPrice: number;
  buyText: string;
  helperText?: string;
  helperDescription?: string;
  hideUnitPrice?: boolean;
  enableFreeShipping?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
  sortOrder?: number;
}

type JsonRecord = Record<string, unknown>;
export interface QuantityOfferPriceSource {
  price?: unknown;
  comparePrice?: unknown;
}

const isRecord = (value: unknown): value is JsonRecord =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const toFiniteNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toOptionalFiniteNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseMetadataObject = (value: unknown): JsonRecord => {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value !== "string" || !value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

export const createQuantityOfferId = () =>
  `quantity-offer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createEmptyQuantityOffer = (
  quantity = 2,
  unitPrice = 0,
): QuantityOffer => ({
  id: createQuantityOfferId(),
  quantity: Math.max(1, quantity),
  unitPrice: Math.max(0, unitPrice),
  buyText: "",
  helperText: "",
  helperDescription: "",
  hideUnitPrice: false,
  enableFreeShipping: false,
  isDefault: false,
  isActive: true,
  sortOrder: quantity,
});

export const normalizeQuantityOffer = (
  rawOffer: unknown,
  index = 0,
): QuantityOffer | null => {
  if (!isRecord(rawOffer)) {
    return null;
  }

  const quantity = Math.max(1, Math.floor(toFiniteNumber(rawOffer.quantity, 0)));
  const unitPrice = Math.max(0, toFiniteNumber(rawOffer.unitPrice, 0));

  if (quantity <= 0 || unitPrice < 0) {
    return null;
  }

  return {
    id:
      typeof rawOffer.id === "string" && rawOffer.id.trim()
        ? rawOffer.id.trim()
        : `quantity-offer-${index + 1}`,
    quantity,
    unitPrice,
    buyText:
      typeof rawOffer.buyText === "string"
        ? rawOffer.buyText
        : "",
    helperText:
      typeof rawOffer.helperText === "string"
        ? rawOffer.helperText
        : "",
    helperDescription:
      typeof rawOffer.helperDescription === "string"
        ? rawOffer.helperDescription
        : "",
    hideUnitPrice: rawOffer.hideUnitPrice === true,
    enableFreeShipping: rawOffer.enableFreeShipping === true,
    isDefault: rawOffer.isDefault === true,
    isActive: rawOffer.isActive !== false,
    sortOrder: Math.max(
      0,
      Math.floor(
        toFiniteNumber(
          rawOffer.sortOrder,
          quantity + index,
        ),
      ),
    ),
  };
};

export const normalizeQuantityOffers = (value: unknown): QuantityOffer[] => {
  const rawOffers = Array.isArray(value)
    ? value
    : (() => {
        const metadata = parseMetadataObject(value);
        if (Array.isArray(metadata.quantityOffers)) {
          return metadata.quantityOffers;
        }

        if (Array.isArray(metadata.multiPackOffers)) {
          return metadata.multiPackOffers;
        }

        return [];
      })();

  const offers = rawOffers
    .map((offer, index) => normalizeQuantityOffer(offer, index))
    .filter((offer): offer is QuantityOffer => Boolean(offer))
    .sort((left, right) => {
      if ((left.sortOrder || 0) !== (right.sortOrder || 0)) {
        return (left.sortOrder || 0) - (right.sortOrder || 0);
      }

      return left.quantity - right.quantity;
    });

  const firstDefaultIndex = offers.findIndex((offer) => offer.isDefault);
  if (firstDefaultIndex === -1 && offers[0]) {
    offers[0] = { ...offers[0], isDefault: true };
  }

  return offers;
};

export const buildMetadataWithQuantityOffers = (
  rawMetadata: unknown,
  offers: QuantityOffer[],
) => {
  const metadata = parseMetadataObject(rawMetadata);
  return JSON.stringify({
    ...metadata,
    quantityOffers: normalizeQuantityOffers(offers),
  });
};

export const getQuantityOfferTotals = (
  offer: Pick<QuantityOffer, "quantity" | "unitPrice">,
  baseUnitPrice: number,
) =>
  getQuantityOfferTotalsFromReferencePrices(
    offer,
    Array.from(
      { length: Math.max(1, Math.floor(toFiniteNumber(offer.quantity, 1))) },
      () => baseUnitPrice,
    ),
  );

export const resolveQuantityOfferReferenceUnitPrice = (
  primarySource?: QuantityOfferPriceSource | null,
  fallbackSource?: QuantityOfferPriceSource | null,
) => {
  const candidates = [
    primarySource?.comparePrice,
    fallbackSource?.comparePrice,
    primarySource?.price,
    fallbackSource?.price,
  ];

  for (const candidate of candidates) {
    const numericValue = toOptionalFiniteNumber(candidate);
    if (numericValue !== null && numericValue > 0) {
      return Number(numericValue.toFixed(2));
    }
  }

  return 0;
};

export const getQuantityOfferTotalsFromReferencePrices = (
  offer: Pick<QuantityOffer, "quantity" | "unitPrice">,
  referenceUnitPrices: number[],
) => {
  const normalizedQuantity = Math.max(1, Math.floor(toFiniteNumber(offer.quantity, 1)));
  const normalizedOfferUnitPrice = Math.max(0, toFiniteNumber(offer.unitPrice, 0));
  const fallbackReferencePrice =
    referenceUnitPrices[referenceUnitPrices.length - 1] ?? 0;
  const normalizedReferencePrices = Array.from(
    { length: normalizedQuantity },
    (_, index) =>
      Math.max(
        0,
        toFiniteNumber(referenceUnitPrices[index] ?? fallbackReferencePrice, 0),
      ),
  );
  const originalTotal = Number(
    normalizedReferencePrices
      .reduce((total, currentValue) => total + currentValue, 0)
      .toFixed(2),
  );
  const offerTotal = Number((normalizedOfferUnitPrice * normalizedQuantity).toFixed(2));
  const savings = Number(Math.max(0, originalTotal - offerTotal).toFixed(2));

  return {
    originalTotal,
    offerTotal,
    savings,
  };
};

export const getDefaultQuantityOfferBuyText = (
  offer: Pick<QuantityOffer, "quantity" | "unitPrice">,
  baseUnitPrice: number,
  currency = "ج.م",
) => {
  const { originalTotal, offerTotal } = getQuantityOfferTotals(offer, baseUnitPrice);
  return `اشتري ${offer.quantity} قطعة بـ${offerTotal} بدل ${originalTotal} ${currency}`.trim();
};

export const getActiveQuantityOffers = (value: unknown) =>
  normalizeQuantityOffers(value).filter((offer) => offer.isActive !== false);
