const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const PRODUCT_PAGE_CHECKOUT_OVERRIDE_KEY =
  "productPageCheckoutOverrideEnabled";

export const parseProductPageCheckoutMetadata = (
  value: unknown,
): Record<string, unknown> => {
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

export const getProductPageCheckoutOverrideEnabled = (
  metadata: unknown,
): boolean =>
  parseProductPageCheckoutMetadata(metadata)[
    PRODUCT_PAGE_CHECKOUT_OVERRIDE_KEY
  ] === true;

export const isProductPageCheckoutEnabledForProduct = (
  product: { metadata?: unknown } | null | undefined,
  storefrontSettings:
    | {
        storefrontSettings?: {
          productPageShowCheckoutForm?: boolean | null;
        } | null;
      }
    | null
    | undefined,
): boolean => {
  const globalEnabled =
    storefrontSettings?.storefrontSettings?.productPageShowCheckoutForm !==
    false;

  if (globalEnabled) {
    return true;
  }

  return getProductPageCheckoutOverrideEnabled(product?.metadata);
};
