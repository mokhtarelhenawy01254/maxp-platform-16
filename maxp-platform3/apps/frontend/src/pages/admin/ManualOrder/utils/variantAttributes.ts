export interface VariantAttributeSource {
  name?: string;
  type?: string;
  color?: string;
  size?: string;
  metadata?: string | Record<string, any> | null;
  attributeValues?: Record<string, string> | null;
}

const COLOR_KEYS = ["اللون", "color", "pa_color", "لون"];
const SIZE_KEYS = ["المقاس", "size", "pa_size", "مقاس"];

const normalizeAttributeKey = (key: string) => key.trim().toLowerCase();

const hasValues = (
  value?: Record<string, string> | null,
): value is Record<string, string> => Boolean(value && Object.keys(value).length > 0);

const getMatchingAttributeValue = (
  attributes: Record<string, string>,
  candidates: string[],
) => {
  const candidateSet = new Set(candidates.map(normalizeAttributeKey));

  return Object.entries(attributes).find(([key]) =>
    candidateSet.has(normalizeAttributeKey(key)),
  )?.[1];
};

export const parseVariantAttributes = (
  variant: VariantAttributeSource,
): Record<string, string> => {
  if (hasValues(variant.attributeValues)) {
    return variant.attributeValues;
  }

  if (variant.metadata) {
    try {
      const metadata =
        typeof variant.metadata === "string"
          ? JSON.parse(variant.metadata)
          : variant.metadata;

      if (metadata.attributes && Array.isArray(metadata.attributes)) {
        const attrs: Record<string, string> = {};

        metadata.attributes.forEach((attr: any) => {
          if (attr.type === "color") {
            attrs["اللون"] = attr.option;
          } else if (attr.type === "size") {
            attrs["المقاس"] = attr.option;
          } else if (attr.type === "material") {
            attrs["المادة"] = attr.option;
          } else if (attr.type === "style") {
            attrs["النمط"] = attr.option;
          } else if (attr.option) {
            attrs[attr.name || "خاصية"] = attr.option;
          }
        });

        if (hasValues(attrs)) {
          return attrs;
        }
      }

      if (hasValues(metadata.attributeValues)) {
        return metadata.attributeValues;
      }
    } catch {
      // Ignore malformed metadata and continue with the fallback chain.
    }
  }

  if (variant.color || variant.size) {
    const attrs: Record<string, string> = {};

    if (variant.color) attrs["اللون"] = variant.color;
    if (variant.size) attrs["المقاس"] = variant.size;

    return attrs;
  }

  if (variant.name) {
    const pipePattern = /([^:]+):\s*([^|]+)/g;
    const attrs: Record<string, string> = {};
    let match: RegExpExecArray | null;

    while ((match = pipePattern.exec(variant.name)) !== null) {
      const key = match[1].trim();
      const value = match[2].trim();
      attrs[key] = value;
    }

    if (hasValues(attrs)) {
      return attrs;
    }

    const parts = variant.name.split(/\s*[-–]\s*/);
    if (parts.length >= 2) {
      return {
        اللون: parts[0].trim(),
        المقاس: parts[1].trim(),
      };
    }

    if (parts.length === 1 && variant.type) {
      const typeName =
        variant.type === "color"
          ? "اللون"
          : variant.type === "size"
            ? "المقاس"
            : variant.type;

      return { [typeName]: parts[0].trim() };
    }
  }

  return {};
};

export const extractVariantDisplayDetails = (
  variant?: VariantAttributeSource | null,
) => {
  if (!variant) {
    return {
      color: "",
      size: "",
      summary: "",
    };
  }

  const attributes = parseVariantAttributes(variant);
  const color =
    variant.color || getMatchingAttributeValue(attributes, COLOR_KEYS) || "";
  const size =
    variant.size || getMatchingAttributeValue(attributes, SIZE_KEYS) || "";
  const consumedKeys = new Set(
    [...COLOR_KEYS, ...SIZE_KEYS].map(normalizeAttributeKey),
  );

  const extras = Object.entries(attributes)
    .filter(
      ([key, value]) =>
        Boolean(value) && !consumedKeys.has(normalizeAttributeKey(key)),
    )
    .map(([key, value]) => `${key}: ${value}`);

  const baseSummary = [color, size].filter(Boolean).join(" / ");
  const summaryParts = [baseSummary, ...extras].filter(Boolean);

  return {
    color,
    size,
    summary:
      summaryParts.join(" | ") || String(variant.name || "").trim(),
  };
};
