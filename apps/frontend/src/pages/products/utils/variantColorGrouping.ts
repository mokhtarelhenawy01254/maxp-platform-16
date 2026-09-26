import { ProductAttribute, ProductVariant } from "../types";

export interface VariantGroupItem {
  variant: ProductVariant;
  index: number;
  secondaryLabel?: string;
}

export interface VariantColorGroup {
  id: string;
  name: string;
  attributeName?: string;
  items: VariantGroupItem[];
  currentImage?: string;
  savedAttributeImage?: string;
  hasMixedImages?: boolean;
  imagesCount: number;
}

// Common Arabic and English color terms to recognize in variant names
const COMMON_COLORS = new Set([
  "ابيض", "أبيض", "اسود", "أسود", "احمر", "أحمر", "ازرق", "أزرق", "اخضر", "أخضر",
  "اصفر", "أصفر", "رمادي", "كحلي", "بيج", "بني", "وردي", "بنفسجي", "برتقالي",
  "سماوي", "كافيه", "زيتي", "نبيتي", "هافان", "رصاصي", "موف", "خردلي", "تركواز",
  "زيتوني", "عنابي", "فضي", "ذهبي", "خمري", "ليموني", "فوشيا", "مارون", "سكري",
  "white", "black", "red", "blue", "green", "yellow", "gray", "grey", "navy",
  "beige", "brown", "pink", "purple", "orange", "cyan", "gold", "silver"
]);

/**
 * Checks if a string indicates a color attribute name
 */
export const isColorAttributeName = (nameOrSlug?: string): boolean => {
  if (!nameOrSlug) return false;
  const s = String(nameOrSlug).trim().toLowerCase();
  return (
    s.includes("color") ||
    s.includes("colour") ||
    s.includes("لون") ||
    s.includes("اللون")
  );
};

/**
 * Normalizes an Arabic string for matching (e.g. unifying Alef forms)
 */
export const normalizeArabicString = (str: string): string => {
  return String(str || "")
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
};

/**
 * Detects the best attribute to group by for color-based image management
 */
export const detectGroupingAttributes = (
  attributes: ProductAttribute[] = [],
  variants: ProductVariant[] = []
): { id: string; name: string; isColor: boolean }[] => {
  const result: { id: string; name: string; isColor: boolean }[] = [];
  const seenIds = new Set<string>();

  // 1. Inspect explicit attributes
  if (attributes && attributes.length > 0) {
    for (const attr of attributes) {
      if (attr.values && attr.values.length > 0) {
        const isColor = isColorAttributeName(attr.name) || isColorAttributeName(attr.slug);
        const id = attr.slug || attr.name;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          result.push({ id, name: attr.name, isColor });
        }
      }
    }
  }

  // 2. Inspect variant.attributeValues keys
  if (variants && variants.length > 0) {
    for (const v of variants) {
      if (v.attributeValues && typeof v.attributeValues === "object") {
        for (const key of Object.keys(v.attributeValues)) {
          if (!seenIds.has(key)) {
            seenIds.add(key);
            result.push({
              id: key,
              name: key,
              isColor: isColorAttributeName(key),
            });
          }
        }
      }
    }
  }

  // 3. Fallback: if no attributes found but variants exist with delimiters
  if (result.length === 0 && variants && variants.length > 0) {
    result.push({
      id: "detected_color",
      name: "اللون",
      isColor: true,
    });
  }

  // Sort so color attributes come first
  result.sort((a, b) => {
    if (a.isColor && !b.isColor) return -1;
    if (!a.isColor && b.isColor) return 1;
    return 0;
  });

  return result;
};

/**
 * Extracts the color or grouping value for a single variant
 */
export const extractVariantGroupValue = (
  variant: ProductVariant,
  attributeKey?: string,
  knownColorValues?: string[]
): { groupValue: string; secondaryLabel?: string } => {
  // Case 1: Matching via explicit attributeValues
  if (variant.attributeValues && typeof variant.attributeValues === "object") {
    // If specific attributeKey provided
    if (attributeKey && variant.attributeValues[attributeKey]) {
      const groupVal = String(variant.attributeValues[attributeKey]).trim();
      // Secondary label from other attribute keys
      const secondary = Object.entries(variant.attributeValues)
        .filter(([k]) => k !== attributeKey)
        .map(([, v]) => String(v).trim())
        .join(" / ");
      return { groupValue: groupVal, secondaryLabel: secondary || undefined };
    }

    // Try color keys
    for (const [k, v] of Object.entries(variant.attributeValues)) {
      if (isColorAttributeName(k)) {
        const secondary = Object.entries(variant.attributeValues)
          .filter(([otherKey]) => otherKey !== k)
          .map(([, val]) => String(val).trim())
          .join(" / ");
        return { groupValue: String(v).trim(), secondaryLabel: secondary || undefined };
      }
    }

    // Try known color values against all attributeValues
    if (knownColorValues && knownColorValues.length > 0) {
      const normalizedKnown = knownColorValues.map(normalizeArabicString);
      for (const [k, v] of Object.entries(variant.attributeValues)) {
        const valStr = String(v).trim();
        if (normalizedKnown.includes(normalizeArabicString(valStr))) {
          const secondary = Object.entries(variant.attributeValues)
            .filter(([otherKey]) => otherKey !== k)
            .map(([, otherVal]) => String(otherVal).trim())
            .join(" / ");
          return { groupValue: valStr, secondaryLabel: secondary || undefined };
        }
      }
    }
  }

  // Case 2: Parsing variant.name (e.g. "ابيض - 37", "أبيض / كبير", "White - M")
  const rawName = String(variant.name || "").trim();
  if (rawName) {
    const parts = rawName.split(/\s*[-/|,]\s*/).map((p) => p.trim()).filter(Boolean);

    if (parts.length > 1) {
      // Check if one of the parts matches a known color
      let colorPartIdx = -1;

      // Check against knownColorValues from attributes first
      if (knownColorValues && knownColorValues.length > 0) {
        const normalizedKnown = knownColorValues.map(normalizeArabicString);
        colorPartIdx = parts.findIndex((p) =>
          normalizedKnown.includes(normalizeArabicString(p))
        );
      }

      // Check against COMMON_COLORS dictionary
      if (colorPartIdx === -1) {
        colorPartIdx = parts.findIndex((p) =>
          COMMON_COLORS.has(normalizeArabicString(p))
        );
      }

      if (colorPartIdx !== -1) {
        const groupValue = parts[colorPartIdx];
        const secondary = parts.filter((_, idx) => idx !== colorPartIdx).join(" / ");
        return { groupValue, secondaryLabel: secondary || undefined };
      }

      // Default: First part is color / primary group, remainder is secondary (e.g. size)
      return {
        groupValue: parts[0],
        secondaryLabel: parts.slice(1).join(" / "),
      };
    } else if (parts.length === 1) {
      return { groupValue: parts[0] };
    }
  }

  return { groupValue: variant.type === "color" ? variant.name || "لون" : "افتراضي" };
};

/**
 * Resolves saved color image from variantSettings.attributeImages
 */
export const getSavedAttributeImage = (
  variantSettings: any,
  attributeNameOrSlug?: string,
  colorValue?: string
): string | undefined => {
  if (!variantSettings || !colorValue) return undefined;
  const attrImages = variantSettings.attributeImages;
  if (!attrImages || typeof attrImages !== "object") return undefined;

  const normalizedColor = normalizeArabicString(colorValue);

  // 1. Direct match on attributeNameOrSlug if provided
  if (attributeNameOrSlug) {
    for (const [attrKey, colorMap] of Object.entries(attrImages)) {
      if (!colorMap || typeof colorMap !== "object") continue;

      const isMatchingAttr =
        attrKey === attributeNameOrSlug ||
        normalizeArabicString(attrKey) === normalizeArabicString(attributeNameOrSlug) ||
        (isColorAttributeName(attrKey) && isColorAttributeName(attributeNameOrSlug));

      if (isMatchingAttr) {
        for (const [colName, imgUrl] of Object.entries(colorMap as Record<string, string>)) {
          if (normalizeArabicString(colName) === normalizedColor && imgUrl) {
            return imgUrl;
          }
        }
      }
    }
  }

  // 2. Fallback: Search all attributeImages entries for matching colorValue
  for (const [, colorMap] of Object.entries(attrImages)) {
    if (!colorMap || typeof colorMap !== "object") continue;
    for (const [colName, imgUrl] of Object.entries(colorMap as Record<string, string>)) {
      if (normalizeArabicString(colName) === normalizedColor && imgUrl) {
        return imgUrl;
      }
    }
  }

  return undefined;
};

/**
 * Groups variants by color (or specified attribute)
 */
export const groupVariantsByColor = (
  variants: ProductVariant[] = [],
  attributes: ProductAttribute[] = [],
  selectedAttributeKey?: string,
  variantSettings?: any
): VariantColorGroup[] => {
  if (!variants || variants.length === 0) return [];

  // Find known color values from attributes if available
  let knownColorValues: string[] = [];
  const colorAttr = attributes.find(
    (a) => isColorAttributeName(a.name) || isColorAttributeName(a.slug)
  );
  if (colorAttr && colorAttr.values) {
    knownColorValues = colorAttr.values;
  }

  const groupsMap = new Map<string, VariantColorGroup>();

  variants.forEach((variant, index) => {
    const { groupValue, secondaryLabel } = extractVariantGroupValue(
      variant,
      selectedAttributeKey,
      knownColorValues
    );

    const groupKey = normalizeArabicString(groupValue) || groupValue;

    if (!groupsMap.has(groupKey)) {
      groupsMap.set(groupKey, {
        id: groupKey,
        name: groupValue,
        attributeName: colorAttr?.name || "اللون",
        items: [],
        imagesCount: 0,
      });
    }

    const group = groupsMap.get(groupKey)!;
    group.items.push({
      variant,
      index,
      secondaryLabel,
    });

    const variantImg = variant.image || (variant.images && variant.images[0]);
    if (variantImg) {
      group.imagesCount += 1;
      if (!group.currentImage) {
        group.currentImage = variantImg;
      } else if (group.currentImage !== variantImg) {
        group.hasMixedImages = true;
      }
    }
  });

  // Cross-reference saved attribute images from variantSettings for each group
  if (variantSettings) {
    groupsMap.forEach((group) => {
      const savedImg = getSavedAttributeImage(
        variantSettings,
        group.attributeName,
        group.name
      );
      if (savedImg) {
        group.savedAttributeImage = savedImg;
        if (!group.currentImage) {
          group.currentImage = savedImg;
        }
      }
    });
  }

  return Array.from(groupsMap.values());
};

/**
 * Counts how many groups have a saved or current image that can be synced to all variants
 */
export const countSyncableColorImages = (groups: VariantColorGroup[]): number => {
  return groups.filter(
    (g) => Boolean(g.currentImage || g.savedAttributeImage) && g.imagesCount < g.items.length
  ).length;
};

