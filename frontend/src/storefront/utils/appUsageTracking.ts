import { storefrontFetch } from "../../utils/storefrontApi";

type Primitive = string | number | boolean | null;
type MetadataValue = Primitive | Primitive[] | Record<string, Primitive>;

export interface TrackStorefrontAppUsageInput {
  slug: string;
  feature: string;
  quantity?: number;
  totalCost?: number;
  metadata?: Record<string, MetadataValue | undefined>;
  dedupeKey?: string | null;
}

const STORAGE_PREFIX = "sf-app-usage:";
const UNAVAILABLE_APP_PREFIX = "sf-app-unavailable:";
const MAX_METADATA_KEYS = 12;
const MAX_STRING_LENGTH = 200;

const hasWindow = typeof window !== "undefined";
const unavailableApps = new Set<string>();

const sanitizePrimitive = (value: unknown): Primitive | undefined => {
  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return value.slice(0, MAX_STRING_LENGTH);
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? Number(value.toFixed(2)) : undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return undefined;
};

const sanitizeMetadataValue = (
  value: MetadataValue | undefined,
): MetadataValue | undefined => {
  if (Array.isArray(value)) {
    const nextItems = value
      .slice(0, 8)
      .map((item) => sanitizePrimitive(item))
      .filter((item): item is Primitive => item !== undefined);

    return nextItems.length > 0 ? nextItems : undefined;
  }

  if (value && typeof value === "object") {
    const output: Record<string, Primitive> = {};

    Object.entries(value)
      .slice(0, MAX_METADATA_KEYS)
      .forEach(([key, nestedValue]) => {
        const sanitized = sanitizePrimitive(nestedValue);
        if (sanitized !== undefined) {
          output[key.slice(0, 48)] = sanitized;
        }
      });

    return Object.keys(output).length > 0 ? output : undefined;
  }

  return sanitizePrimitive(value);
};

const sanitizeMetadata = (
  metadata?: Record<string, MetadataValue | undefined>,
): Record<string, MetadataValue> | undefined => {
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }

  const output: Record<string, MetadataValue> = {};

  Object.entries(metadata)
    .slice(0, MAX_METADATA_KEYS)
    .forEach(([key, value]) => {
      const sanitized = sanitizeMetadataValue(value);
      if (sanitized !== undefined) {
        output[key.slice(0, 48)] = sanitized;
      }
    });

  return Object.keys(output).length > 0 ? output : undefined;
};

const hasSeenDedupeKey = (dedupeKey: string): boolean => {
  if (!hasWindow) {
    return false;
  }

  try {
    return window.sessionStorage.getItem(`${STORAGE_PREFIX}${dedupeKey}`) === "1";
  } catch {
    return false;
  }
};

const markDedupeKeySeen = (dedupeKey: string) => {
  if (!hasWindow) {
    return;
  }

  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${dedupeKey}`, "1");
  } catch {
    // Ignore storage failures in restricted environments.
  }
};

const isAppMarkedUnavailable = (slug: string): boolean => {
  if (unavailableApps.has(slug)) {
    return true;
  }

  if (!hasWindow) {
    return false;
  }

  try {
    const markedUnavailable =
      window.sessionStorage.getItem(`${UNAVAILABLE_APP_PREFIX}${slug}`) === "1";
    if (markedUnavailable) {
      unavailableApps.add(slug);
    }
    return markedUnavailable;
  } catch {
    return false;
  }
};

const markAppUnavailable = (slug: string) => {
  unavailableApps.add(slug);

  if (!hasWindow) {
    return;
  }

  try {
    window.sessionStorage.setItem(`${UNAVAILABLE_APP_PREFIX}${slug}`, "1");
  } catch {
    // Ignore storage failures in restricted environments.
  }
};

const isMarketplacePreview = (): boolean => {
  if (!hasWindow) {
    return false;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    return params.has("previewTheme") || params.get("previewSource") === "marketplace";
  } catch {
    return false;
  }
};

export const trackStorefrontAppUsage = async ({
  slug,
  feature,
  quantity = 1,
  totalCost = 0,
  metadata,
  dedupeKey,
}: TrackStorefrontAppUsageInput): Promise<boolean> => {
  const normalizedSlug = slug.trim();
  const normalizedFeature = feature.trim();
  const normalizedDedupeKey = dedupeKey?.trim() || "";

  if (!normalizedSlug || !normalizedFeature) {
    return false;
  }

  if (isMarketplacePreview()) {
    return false;
  }

  if (isAppMarkedUnavailable(normalizedSlug)) {
    return false;
  }

  if (normalizedDedupeKey && hasSeenDedupeKey(normalizedDedupeKey)) {
    return false;
  }

  try {
    const response = await storefrontFetch(
      `/storefront/apps/${encodeURIComponent(normalizedSlug)}/track`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feature: normalizedFeature,
          quantity: Number.isFinite(quantity) ? Math.max(1, Math.round(quantity)) : 1,
          totalCost:
            Number.isFinite(totalCost) && Number(totalCost) > 0
              ? Number(Number(totalCost).toFixed(2))
              : 0,
          metadata: sanitizeMetadata(metadata),
        }),
      },
    );

    if (
      response?.reason === "app-not-installed" ||
      response?.reason === "app-disabled"
    ) {
      markAppUnavailable(normalizedSlug);
    }

    if (normalizedDedupeKey && response?.tracked) {
      markDedupeKeySeen(normalizedDedupeKey);
    }

    return Boolean(response?.tracked);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.debug("Storefront app usage tracking failed:", error);
    }
    return false;
  }
};

export default trackStorefrontAppUsage;
