import { normalizeImagePath } from "../../../utils/imageUrl";
import type {
  ProductAttribute,
  ProductVariant,
  ProductVariantSettings,
} from "../types";

type VariantDisplayStyle =
  | "buttons"
  | "circles"
  | "dropdown"
  | "thumbnails"
  | "radio";

const isVariantDisplayStyle = (value: unknown): value is VariantDisplayStyle =>
  value === "buttons" ||
  value === "circles" ||
  value === "dropdown" ||
  value === "thumbnails" ||
  value === "radio";

const CANONICAL_ATTRIBUTE_LABELS: Record<string, string> = {
  color: "color",
  colors: "color",
  colour: "color",
  colours: "color",
  لون: "color",
  اللون: "color",
  الالوان: "color",
  الألوان: "color",
  الوان: "color",
  ألوان: "color",
  size: "size",
  sizes: "size",
  المقاس: "size",
  المقاسات: "size",
  الحجم: "size",
  الاحجام: "size",
  الأحجام: "size",
  material: "material",
  الخامة: "material",
  style: "style",
  الطراز: "style",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const canonicalizeAttributeKey = (value: unknown): string => {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }

  const normalized = trimmed.toLowerCase();
  return CANONICAL_ATTRIBUTE_LABELS[normalized] || normalized;
};

const parseVariantMetadata = (value: unknown): Record<string, unknown> => {
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

const normalizeColorValue = (value: unknown): string => {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }

  const threeDigitHex = trimmed.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (threeDigitHex) {
    const [, r, g, b] = threeDigitHex;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  if (/^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  if (/^(?:rgb|rgba|hsl|hsla)\(/i.test(trimmed)) {
    return trimmed;
  }

  if (/^(?:linear|radial)-gradient\(/i.test(trimmed)) {
    return trimmed;
  }

  return "";
};

export const hydrateVariantSettings = (
  value: unknown,
): ProductVariantSettings => {
  const parsedValue = parseVariantMetadata(value);
  const parsedStyles = parseVariantMetadata(parsedValue.styles);
  const parsedAttributeImages = parseVariantMetadata(parsedValue.attributeImages);
  const parsedAttributeColors = parseVariantMetadata(parsedValue.attributeColors);

  const styles = Object.entries(parsedStyles).reduce<
    ProductVariantSettings["styles"]
  >((acc, [key, style]) => {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey || !isVariantDisplayStyle(style)) {
      return acc;
    }

    acc[normalizedKey] = style;
    return acc;
  }, {});

  const attributeImages = Object.entries(parsedAttributeImages).reduce<
    ProductVariantSettings["attributeImages"]
  >((acc, [attributeName, images]) => {
    const normalizedAttributeName = String(attributeName || "").trim();
    if (!normalizedAttributeName || !isRecord(images)) {
      return acc;
    }

    const normalizedImages = Object.entries(images).reduce<Record<string, string>>(
      (imageAcc, [valueName, image]) => {
        const normalizedValueName = String(valueName || "").trim();
        const normalizedImage =
          normalizeImagePath(String(image || "")) || String(image || "").trim();

        if (normalizedValueName && normalizedImage) {
          imageAcc[normalizedValueName] = normalizedImage;
        }

        return imageAcc;
      },
      {},
    );

    if (Object.keys(normalizedImages).length > 0) {
      acc[normalizedAttributeName] = normalizedImages;
    }

    return acc;
  }, {});

  const attributeColors = Object.entries(parsedAttributeColors).reduce<
    NonNullable<ProductVariantSettings["attributeColors"]>
  >((acc, [attributeName, colors]) => {
    const normalizedAttributeName = String(attributeName || "").trim();
    if (!normalizedAttributeName || !isRecord(colors)) {
      return acc;
    }

    const normalizedColors = Object.entries(colors).reduce<Record<string, string>>(
      (colorAcc, [valueName, color]) => {
        const normalizedValueName = String(valueName || "").trim();
        const normalizedColor = normalizeColorValue(color);

        if (normalizedValueName && normalizedColor) {
          colorAcc[normalizedValueName] = normalizedColor;
        }

        return colorAcc;
      },
      {},
    );

    if (Object.keys(normalizedColors).length > 0) {
      acc[normalizedAttributeName] = normalizedColors;
    }

    return acc;
  }, {});

  return {
    styles,
    attributeImages,
    attributeColors,
  };
};

const parseVariantImages = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeImagePath(String(item || "")) || String(item || "").trim())
      .filter(Boolean);
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => normalizeImagePath(String(item || "")) || String(item || "").trim())
        .filter(Boolean);
    }
  } catch {
    return [normalizeImagePath(value) || value.trim()].filter(Boolean);
  }

  return [];
};

const getAttributeKeyCandidates = (attribute: ProductAttribute | string): string[] => {
  const rawValues =
    typeof attribute === "string"
      ? [attribute]
      : [attribute.name, attribute.slug, canonicalizeAttributeKey(attribute.name)];

  const seen = new Set<string>();
  rawValues.forEach((rawValue) => {
    const trimmed = String(rawValue || "").trim();
    if (!trimmed) {
      return;
    }

    seen.add(trimmed);
    seen.add(trimmed.toLowerCase());
    seen.add(canonicalizeAttributeKey(trimmed));
  });

  return Array.from(seen).filter(Boolean);
};

const findMatchingKey = (
  source: Record<string, unknown> | null | undefined,
  attribute: ProductAttribute | string,
): string | null => {
  if (!source) {
    return null;
  }

  const candidates = getAttributeKeyCandidates(attribute);
  const candidateSet = new Set(candidates.map((value) => canonicalizeAttributeKey(value)));

  return (
    Object.keys(source).find((key) => {
      const normalizedKey = canonicalizeAttributeKey(key);
      return candidateSet.has(normalizedKey);
    }) || null
  );
};

const getVariantPrimaryImage = (variant: ProductVariant): string => {
  const metadata = parseVariantMetadata(variant.metadata);
  const candidateImages = [
    variant.image,
    metadata.image,
    ...parseVariantImages(variant.images),
  ];

  for (const candidate of candidateImages) {
    const normalized = normalizeImagePath(String(candidate || "")) || String(candidate || "").trim();
    if (normalized) {
      return normalized;
    }
  }

  return "";
};

const getVariantAttributeValues = (variant: ProductVariant): Record<string, string> => {
  const normalizeAttributeEntries = (rawAttributes: unknown): Record<string, string> => {
    if (Array.isArray(rawAttributes)) {
      return rawAttributes.reduce<Record<string, string>>((acc, attribute) => {
        if (!isRecord(attribute)) {
          return acc;
        }

        const rawKey =
          attribute.name ??
          attribute.key ??
          attribute.attributeName ??
          attribute.attribute ??
          attribute.type;
        const rawValue =
          attribute.option ??
          attribute.value ??
          attribute.label ??
          attribute.displayValue;
        const normalizedKey = canonicalizeAttributeKey(rawKey);
        const normalizedValue = String(rawValue || "").trim();

        if (normalizedKey && normalizedValue) {
          acc[normalizedKey] = normalizedValue;
        }

        return acc;
      }, {});
    }

    if (!isRecord(rawAttributes)) {
      return {};
    }

    return Object.entries(rawAttributes).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        const normalizedKey = canonicalizeAttributeKey(key);
        const normalizedValue = String(value || "").trim();

        if (normalizedKey && normalizedValue) {
          acc[normalizedKey] = normalizedValue;
        }
        return acc;
      },
      {},
    );
  };

  if (isRecord(variant.attributeValues)) {
    return normalizeAttributeEntries(variant.attributeValues);
  }

  const metadata = parseVariantMetadata(variant.metadata);
  return normalizeAttributeEntries(metadata.attributeValues ?? metadata.attributes);
};

export const getVariantSettingKey = (
  source: Record<string, unknown> | null | undefined,
  attribute: ProductAttribute | string,
): string | null => findMatchingKey(source, attribute);

export const getVariantSettingStyle = (
  settings: ProductVariantSettings | null | undefined,
  attribute: ProductAttribute | string,
): VariantDisplayStyle | "" => {
  if (!settings?.styles) {
    return "";
  }

  const matchedKey = findMatchingKey(settings.styles, attribute);
  if (!matchedKey) {
    return "";
  }

  const styleValue = String(settings.styles[matchedKey] || "").trim();
  if (isVariantDisplayStyle(styleValue)) {
    return styleValue;
  }

  return "";
};

export const getVariantSettingImages = (
  settings: ProductVariantSettings | null | undefined,
  attribute: ProductAttribute | string,
): Record<string, string> => {
  if (!settings?.attributeImages) {
    return {};
  }

  const matchedKey = findMatchingKey(settings.attributeImages, attribute);
  const rawValue = matchedKey ? settings.attributeImages[matchedKey] : null;

  if (!isRecord(rawValue)) {
    return {};
  }

  return Object.entries(rawValue).reduce<Record<string, string>>((acc, [value, image]) => {
    const normalizedImage =
      normalizeImagePath(String(image || "")) || String(image || "").trim();
    if (normalizedImage) {
      acc[value] = normalizedImage;
    }
    return acc;
  }, {});
};

export const getVariantSettingColors = (
  settings: ProductVariantSettings | null | undefined,
  attribute: ProductAttribute | string,
): Record<string, string> => {
  if (!settings?.attributeColors) {
    return {};
  }

  const matchedKey = findMatchingKey(settings.attributeColors, attribute);
  const rawValue = matchedKey ? settings.attributeColors[matchedKey] : null;

  if (!isRecord(rawValue)) {
    return {};
  }

  return Object.entries(rawValue).reduce<Record<string, string>>(
    (acc, [value, color]) => {
      const normalizedColor = normalizeColorValue(color);
      if (normalizedColor) {
        acc[value] = normalizedColor;
      }
      return acc;
    },
    {},
  );
};

export const getVariantDisplaySupport = (
  attribute: ProductAttribute,
  settings: ProductVariantSettings | null | undefined,
  variants: ProductVariant[],
) => {
  const configuredImages = getVariantSettingImages(settings, attribute);
  const attributeKeyCandidates = new Set(
    getAttributeKeyCandidates(attribute).map((value) => canonicalizeAttributeKey(value)),
  );
  const variantImageValues = new Set<string>();

  variants.forEach((variant) => {
    const primaryImage = getVariantPrimaryImage(variant);
    if (!primaryImage) {
      return;
    }

    const attributeValues = getVariantAttributeValues(variant);
    Object.entries(attributeValues).forEach(([key, value]) => {
      if (!value) {
        return;
      }

      if (attributeKeyCandidates.has(canonicalizeAttributeKey(key))) {
        variantImageValues.add(value);
      }
    });
  });

  const configuredImageValues = new Set(
    Object.entries(configuredImages)
      .filter(([, image]) => Boolean(image))
      .map(([value]) => value),
  );

  const coveredValues = new Set<string>([
    ...configuredImageValues,
    ...variantImageValues,
  ]);

  const isColorAttribute = attributeKeyCandidates.has("color");
  const fallbackStyle: VariantDisplayStyle = isColorAttribute ? "circles" : "buttons";

  return {
    configuredImageCount: configuredImageValues.size,
    variantImageCount: variantImageValues.size,
    coveredValueCount: coveredValues.size,
    totalValues: attribute.values.length,
    fallbackStyle,
    isColorAttribute,
  };
};

export const normalizeVariantSettingsForSave = (
  settings: ProductVariantSettings | null | undefined,
  attributes: ProductAttribute[],
  variants: ProductVariant[],
): ProductVariantSettings => {
  const normalizedSettings: ProductVariantSettings = {
    styles: { ...(settings?.styles || {}) },
    attributeImages: { ...(settings?.attributeImages || {}) },
    attributeColors: { ...(settings?.attributeColors || {}) },
  };

  attributes
    .filter((attribute) => attribute.forVariations)
    .forEach((attribute) => {
      const currentStyle = getVariantSettingStyle(normalizedSettings, attribute);
      const targetColorKey = findMatchingKey(normalizedSettings.attributeColors, attribute);
      const support = getVariantDisplaySupport(attribute, normalizedSettings, variants);

      if (currentStyle !== "circles" || !support.isColorAttribute) {
        if (targetColorKey) {
          delete normalizedSettings.attributeColors?.[targetColorKey];
        }
      } else if (targetColorKey) {
        const configuredColors = getVariantSettingColors(normalizedSettings, attribute);
        const allowedValues = new Set(attribute.values.map((value) => value.trim()));
        const cleanedColors = Object.entries(configuredColors).reduce<
          Record<string, string>
        >((acc, [value, color]) => {
          if (allowedValues.has(value) && normalizeColorValue(color)) {
            acc[value] = normalizeColorValue(color);
          }
          return acc;
        }, {});

        if (Object.keys(cleanedColors).length > 0) {
          normalizedSettings.attributeColors![targetColorKey] = cleanedColors;
        } else {
          delete normalizedSettings.attributeColors?.[targetColorKey];
        }
      }

      if (currentStyle !== "thumbnails") {
        return;
      }

      if (support.coveredValueCount > 0) {
        return;
      }

      const targetKey =
        findMatchingKey(normalizedSettings.styles, attribute) || attribute.name;
      normalizedSettings.styles[targetKey] = support.fallbackStyle;
    });

  return normalizedSettings;
};
