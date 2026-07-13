/**
 * Shared product metadata parser used by ConversionStack, StickyAddToCartHost, and
 * other storefront components that need to resolve metadata from either a JSON string
 * or an already-parsed object.
 */

const isRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const parseProductMetadata = (value: unknown): Record<string, any> => {
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
