import { ProductMetadata, VariantMetadata } from "./types";

export const parseProductMetadata = (metadata: unknown): ProductMetadata => {
  if (!metadata) {
    return {};
  }

  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata) as ProductMetadata;
    } catch {
      return {};
    }
  }

  return metadata as ProductMetadata;
};

export const parseVariantMetadata = (metadata: unknown): VariantMetadata => {
  if (!metadata) {
    return {};
  }

  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata) as VariantMetadata;
    } catch {
      return {};
    }
  }

  return metadata as VariantMetadata;
};

export const normalizeAffiliateVisibility = (
  value: unknown
): "ALL" | "HIDDEN" | "SELECTED" => {
  const normalized = String(value || "ALL").toUpperCase();
  return normalized === "HIDDEN" || normalized === "SELECTED"
    ? normalized
    : "ALL";
};

export const normalizeAffiliateVisibilityIds = (...sources: unknown[]) => {
  const ids = sources.find((source) => Array.isArray(source));
  if (!Array.isArray(ids)) {
    return [];
  }

  return Array.from(
    new Set(
      ids
        .map((affiliateId) => String(affiliateId || "").trim())
        .filter(Boolean)
    )
  );
};

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } })
      .response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }

  return fallback;
};
