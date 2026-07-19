import { DEFAULT_STOREFRONT_THEME_ID } from "../storefront/themes";
import { StorefrontThemeCatalogItem } from "../storefront/themes/catalog";
import {
  getStorefrontContentOverridesFromDesignTokens,
  serializeStorefrontContentOverrides,
} from "../storefront/utils/contentOverrides";
import {
  getStorefrontPageOverridesFromDesignTokens,
  serializeStorefrontPageOverrides,
} from "../storefront/utils/pageOverrides";

/**
 * Resolve the active storefront theme ID from settings.
 * Checks `settings.themeId`, then `settings.designTokens.themeId`, then falls back to default.
 */
type StorefrontThemeSettingsLike = {
  themeId?: string | null;
  designTokens?: Record<string, unknown> | null;
};

export const resolveStorefrontThemeId = (
  settings?: StorefrontThemeSettingsLike | null,
): string => {
  const directThemeId =
    typeof settings?.themeId === "string" ? settings.themeId.trim() : "";
  const designTokens = settings?.designTokens;
  const tokenThemeId =
    designTokens &&
    typeof designTokens === "object" &&
    typeof (designTokens as { themeId?: unknown }).themeId === "string"
      ? String((designTokens as { themeId?: string }).themeId).trim()
      : "";

  return directThemeId || tokenThemeId || DEFAULT_STOREFRONT_THEME_ID;
};

/**
 * Create a serialized signature of the storefront content overrides.
 * Used to detect unsaved content changes.
 */
export const getStorefrontContentSignature = (
  settings?: { designTokens?: unknown } | null,
): string =>
  serializeStorefrontContentOverrides(
    getStorefrontContentOverridesFromDesignTokens(settings?.designTokens),
  );

/**
 * Create a serialized signature of the storefront page overrides.
 * Used to detect unsaved page-level changes.
 */
export const getStorefrontPageSignature = (
  settings?: { designTokens?: unknown } | null,
): string =>
  serializeStorefrontPageOverrides(
    getStorefrontPageOverridesFromDesignTokens(settings?.designTokens),
  );

/**
 * Extract a user-friendly error message from an API error response.
 */
export const getErrorMessage = (error: unknown, fallback: string): string => {
  const maybeMessage =
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { message?: unknown } } }).response
      ?.data?.message === "string"
      ? String(
          (error as { response?: { data?: { message?: string } } }).response
            ?.data?.message,
        )
      : "";

  return maybeMessage.trim() || fallback;
};

/**
 * Safely cast an unknown value to a partial design tokens draft object.
 */
export const asDesignTokensDraft = <T extends Record<string, unknown>>(
  value: unknown,
): Partial<T> =>
  value && typeof value === "object" ? (value as Partial<T>) : ({} as Partial<T>);

/**
 * Extract section type from a section definition (string or { type }).
 */
export const getSectionType = (section: unknown): string =>
  typeof section === "string"
    ? section
    : typeof (section as { type?: unknown })?.type === "string"
      ? String((section as { type?: unknown }).type)
      : "";

/**
 * Format theme pricing for display.
 */
export const formatStorefrontThemePrice = (item: StorefrontThemeCatalogItem) => {
  const oneTimePrice = item.monthlyPrice > 0 ? item.monthlyPrice : item.yearlyPrice;

  if (item.isOwned) return "ممتلك";
  if (item.pricingModel === "FREE" || oneTimePrice <= 0) return "مجاني";
  return `${oneTimePrice} ${item.currency || "USD"}`;
};

/**
 * Format theme dates (e.g. trial expiration).
 */
export const formatStorefrontThemeDate = (value?: string | null) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return value;
  }
};
