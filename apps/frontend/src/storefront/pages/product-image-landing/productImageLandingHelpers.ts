import type { Product, ProductVariant } from "../../hooks/useProducts";
import { formatMoney } from "../../utils/localeFormat";
import { isValidStorefrontPhone } from "../../utils/phoneValidation";
import {
  canonicalizeAttributeKey,
  getVariantAttributes,
} from "../../utils/variants";
import type { LandingSeoMeta } from "./productImageLandingTypes";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The seo column arrives as a JSON string (or object) — normalize it. */
export const parseLandingSeo = (value: unknown): LandingSeoMeta => {
  let parsed: unknown = value;
  if (typeof parsed === "string" && parsed.trim()) {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return {};
    }
  }
  if (!parsed || typeof parsed !== "object") return {};
  const record = parsed as Record<string, unknown>;
  const str = (key: string) =>
    typeof record[key] === "string" && record[key].trim()
      ? (record[key] as string).trim()
      : undefined;
  return {
    title: str("title"),
    description: str("description"),
    ogImage: str("ogImage"),
  };
};

export const getColorSwatch = (name: string): string | null => {
  if (!name) return null;
  const n = name.trim().toLowerCase();
  if (n.includes("أبيض") || n.includes("ابيض") || n === "white") return "#ffffff";
  if (n.includes("أسود") || n.includes("اسود") || n === "black") return "#111827";
  if (n.includes("بيج") || n.includes("كافيه") || n === "beige") return "#d4b996";
  if (n.includes("أحمر") || n.includes("احمر") || n === "red") return "#dc2626";
  if (n.includes("كحلي") || n.includes("أزرق") || n.includes("ازرق") || n === "navy" || n === "blue") return "#1e3a8a";
  if (n.includes("رمادي") || n.includes("رصاصي") || n === "gray") return "#64748b";
  if (n.includes("زيتي") || n.includes("أخضر") || n.includes("اخضر") || n === "green") return "#15803d";
  if (n.includes("هافان") || n.includes("بني") || n === "brown") return "#78350f";
  return null;
};

export const readVariantAttribute = (
  variant: ProductVariant,
  keys: string[],
): string => {
  const attributes = getVariantAttributes(variant);
  const normalizedKeys = keys.map((key) => canonicalizeAttributeKey(key).toLowerCase());
  const entry = Object.entries(attributes).find(([key]) => {
    const canonicalKey = canonicalizeAttributeKey(key).toLowerCase();
    return (
      normalizedKeys.includes(canonicalKey) ||
      normalizedKeys.includes(key.trim().toLowerCase())
    );
  });

  return entry?.[1]?.trim() || "";
};

export const getActiveVariants = (product?: Product | null): ProductVariant[] => {
  const variants = product?.productVariants || product?.variants || [];

  return Array.isArray(variants)
    ? variants.filter((variant) => variant?.["isActive"] !== false)
    : [];
};

export const uniqueValues = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

export const sortVariantValues = (values: string[]) =>
  [...values].sort((a, b) => {
    const left = Number(a);
    const right = Number(b);

    if (Number.isFinite(left) && Number.isFinite(right)) {
      return left - right;
    }

    return a.localeCompare(b, "ar");
  });

export const isValidEgyptianPhone = (value: string) =>
  isValidStorefrontPhone(value);

export const formatPrice = (value: number, currency: string): string =>
  formatMoney(value, {
    currency,
    symbol: currency === "EGP" ? "جنيه" : undefined,
    position: "after",
  });

export const cleanProductDescription = (value?: string | null, maxLength = 150): string => {
  const text = String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > maxLength
    ? `${text.slice(0, Math.max(0, maxLength - 3)).trim()}...`
    : text;
};

export const isVisuallyBlankCampaignSlice = (src: string): Promise<boolean> => {
  if (typeof window === "undefined" || !src.trim()) {
    return Promise.resolve(false);
  }

  const imageUrl = /^https?:\/\//i.test(src)
    ? src
    : new URL(src, window.location.origin).toString();

  return new Promise((resolve) => {
    const image = new window.Image();
    let isSettled = false;
    const finish = (value: boolean) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      window.clearTimeout(timeoutId);
      resolve(value);
    };
    const timeoutId = window.setTimeout(() => finish(false), 1200);

    image.crossOrigin = "anonymous";
    image.decoding = "async";

    image.onload = () => {
      try {
        const sampleWidth = Math.max(1, Math.min(48, image.naturalWidth || 48));
        const sampleHeight = Math.max(1, Math.min(48, image.naturalHeight || 48));
        const canvas = document.createElement("canvas");
        canvas.width = sampleWidth;
        canvas.height = sampleHeight;

        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          finish(false);
          return;
        }

        context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
        const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight);

        let visiblePixelCount = 0;
        let brightnessSum = 0;
        let minBrightness = 255;
        let maxBrightness = 0;

        for (let index = 0; index < data.length; index += 4) {
          const alpha = data[index + 3] || 0;
          if (alpha < 16) {
            continue;
          }

          const red = data[index] || 0;
          const green = data[index + 1] || 0;
          const blue = data[index + 2] || 0;
          const brightness = red * 0.2126 + green * 0.7152 + blue * 0.0722;

          visiblePixelCount += 1;
          brightnessSum += brightness;
          minBrightness = Math.min(minBrightness, brightness);
          maxBrightness = Math.max(maxBrightness, brightness);
        }

        if (visiblePixelCount === 0) {
          finish(true);
          return;
        }

        const averageBrightness = brightnessSum / visiblePixelCount;
        const brightnessRange = maxBrightness - minBrightness;
        finish(averageBrightness < 8 && brightnessRange < 8);
      } catch {
        finish(false);
      }
    };

    image.onerror = () => finish(true);
    image.src = imageUrl;
  });
};

export const getLandingBenefitCards = (
  product: Product | null,
  sizeOptions: string[],
  colorOptions: string[],
) => {
  const description = cleanProductDescription(product?.description);
  const cards = [
    description
      ? {
          title: "تفاصيل واضحة",
          text: description,
        }
      : null,
    sizeOptions.length > 1
      ? {
          title: "مقاسات متاحة",
          text: `من ${sizeOptions[0]} إلى ${sizeOptions[sizeOptions.length - 1]}`,
        }
      : null,
    colorOptions.length > 0
      ? {
          title: "ألوان للاختيار",
          text: colorOptions.slice(0, 3).join("، "),
        }
      : null,
    {
      title: "طلب سريع",
      text: "املأ البيانات وسيتم التواصل معك لتأكيد الطلب قبل الشحن.",
    },
  ].filter(Boolean) as Array<{ title: string; text: string }>;

  return cards.slice(0, 4);
};

export const normalizeLandingKey = (value?: string | null): string => {
  const decodedValue = (() => {
    try {
      return decodeURIComponent(value || "");
    } catch {
      return value || "";
    }
  })();

  return decodedValue.trim().toLowerCase();
};
