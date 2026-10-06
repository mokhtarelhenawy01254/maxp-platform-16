import type { ProductVariant } from '../hooks/useProducts';

type RawVariantAttributes = Record<string, unknown> | string | null | undefined;
type RawVariantMetadata = Record<string, unknown> | string | null | undefined;

const CANONICAL_ATTRIBUTE_LABELS: Record<string, string> = {
  color: 'Color',
  colors: 'Color',
  colour: 'Color',
  colours: 'Color',
  لون: 'Color',
  '\u0627\u0644\u0644\u0648\u0646': 'Color',
  '\u0627\u0644\u0627\u0644\u0648\u0627\u0646': 'Color',
  '\u0627\u0644\u0623\u0644\u0648\u0627\u0646': 'Color',
  '\u0627\u0644\u0648\u0627\u0646': 'Color',
  '\u0623\u0644\u0648\u0627\u0646': 'Color',
  size: 'Size',
  sizes: 'Size',
  '\u0627\u0644\u0645\u0642\u0627\u0633': 'Size',
  '\u0627\u0644\u0645\u0642\u0627\u0633\u0627\u062a': 'Size',
  '\u0627\u0644\u062d\u062c\u0645': 'Size',
  '\u0627\u0644\u0627\u062d\u062c\u0627\u0645': 'Size',
  '\u0627\u0644\u0623\u062d\u062c\u0627\u0645': 'Size',
  shoe_size: 'Size',
  shoeSize: 'Size',
  'shoe-size': 'Size',
  '\u0645\u0642\u0627\u0633 \u0627\u0644\u062d\u0630\u0627\u0621': 'Size',
  material: 'Material',
  '\u0627\u0644\u062e\u0627\u0645\u0629': 'Material',
  style: 'Style',
  '\u0627\u0644\u0637\u0631\u0627\u0632': 'Style',
  'عدد القطع': 'Pieces',
  عدد_القطع: 'Pieces',
  'العدد': 'Pieces',
  'قطع': 'Pieces',
  pieces: 'Pieces',
  'pieces-count': 'Pieces',
  pieces_count: 'Pieces',
  'نوع الستارة': 'Type',
  'نوع_الستارة': 'Type',
  النوع: 'Type',
  نوع: 'Type',
  type: 'Type',
};

const ARABIC_ATTRIBUTE_LABELS: Record<string, string> = {
  Color: 'اللون',
  Size: 'المقاس',
  Material: 'الخامة',
  Style: 'الطراز',
  Pieces: 'عدد القطع',
  Type: 'النوع',
  Option: 'الخيار',
};

export function canonicalizeAttributeKey(key: string): string {
  const rawKey = String(key || '').trim();
  if (!rawKey) {
    return '';
  }

  if (CANONICAL_ATTRIBUTE_LABELS[rawKey]) {
    return CANONICAL_ATTRIBUTE_LABELS[rawKey];
  }

  const directLower = rawKey.toLowerCase();
  if (CANONICAL_ATTRIBUTE_LABELS[directLower]) {
    return CANONICAL_ATTRIBUTE_LABELS[directLower];
  }

  // Strip trailing/leading colons, underscores, dashes, tatweel, and normalize internal spaces
  // Handles keys like "اللون_:", "اللون :", "مقاس_الحذاء:" etc.
  const cleaned = directLower
    .replace(/[:_ـ\-]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  if (CANONICAL_ATTRIBUTE_LABELS[cleaned]) {
    return CANONICAL_ATTRIBUTE_LABELS[cleaned];
  }

  return rawKey.replace(/[:_ـ\-]+$/g, '').trim();
}

export function getVariantAttributeLabel(
  key: string,
  prefersArabicCopy = false,
): string {
  const canonicalKey = canonicalizeAttributeKey(key);
  if (!prefersArabicCopy) {
    return canonicalKey.replace(/[:_ـ\-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  if (ARABIC_ATTRIBUTE_LABELS[canonicalKey]) {
    return ARABIC_ATTRIBUTE_LABELS[canonicalKey];
  }

  const optionMatch = canonicalKey.match(/^Option\s+(\d+)$/i);
  if (optionMatch?.[1]) {
    return `الخيار ${optionMatch[1]}`;
  }

  return canonicalKey.replace(/[:_ـ\-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeVariantAttributes(
  rawAttributes: RawVariantAttributes,
): Record<string, string> {
  let parsedAttributes = rawAttributes;

  if (typeof parsedAttributes === 'string') {
    try {
      parsedAttributes = JSON.parse(parsedAttributes) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  if (Array.isArray(parsedAttributes)) {
    return parsedAttributes.reduce<Record<string, string>>((acc, attribute) => {
      if (!attribute || typeof attribute !== 'object' || Array.isArray(attribute)) {
        return acc;
      }

      const attributeObject = attribute as Record<string, unknown>;
      const rawKey =
        attributeObject.name ??
        attributeObject.key ??
        attributeObject.attributeName ??
        attributeObject.attribute ??
        attributeObject.type;
      const rawValue =
        attributeObject.option ??
        attributeObject.value ??
        attributeObject.label ??
        attributeObject.displayValue;
      const normalizedKey = canonicalizeAttributeKey(String(rawKey || ''));
      const normalizedValue =
        typeof rawValue === 'string'
          ? rawValue.trim()
          : typeof rawValue === 'number' || typeof rawValue === 'boolean'
            ? String(rawValue)
            : '';

      if (normalizedKey && normalizedValue) {
        acc[normalizedKey] = normalizedValue;
      }

      return acc;
    }, {});
  }

  if (!parsedAttributes || typeof parsedAttributes !== 'object') {
    return {};
  }

  return Object.entries(parsedAttributes).reduce<Record<string, string>>((acc, [key, value]) => {
    const normalizedKey = canonicalizeAttributeKey(key);
    if (!normalizedKey) {
      return acc;
    }

    if (typeof value === 'string') {
      const trimmedValue = value.trim();
      if (trimmedValue) {
        acc[normalizedKey] = trimmedValue;
      }
      return acc;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      acc[normalizedKey] = String(value);
    }

    return acc;
  }, {});
}

function parseVariantMetadata(
  rawMetadata: RawVariantMetadata,
): Record<string, string> {
  let parsedMetadata = rawMetadata;

  if (typeof parsedMetadata === 'string') {
    try {
      parsedMetadata = JSON.parse(parsedMetadata) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  if (Array.isArray(parsedMetadata)) {
    return normalizeVariantAttributes(parsedMetadata);
  }

  if (!parsedMetadata || typeof parsedMetadata !== 'object') {
    return {};
  }

  const nestedAttributes = normalizeVariantAttributes(
    (parsedMetadata as Record<string, unknown>).attributeValues ??
      (parsedMetadata as Record<string, unknown>).attributes,
  );
  if (Object.keys(nestedAttributes).length > 0) {
    return nestedAttributes;
  }

  const metadataObject = parsedMetadata as Record<string, unknown>;
  const directAttributes: Record<string, unknown> = {};

  [
    'color',
    'colors',
    'colour',
    'colours',
    'لون',
    '\u0627\u0644\u0644\u0648\u0646',
    '\u0627\u0644\u0627\u0644\u0648\u0627\u0646',
    '\u0627\u0644\u0623\u0644\u0648\u0627\u0646',
    '\u0627\u0644\u0648\u0627\u0646',
    '\u0623\u0644\u0648\u0627\u0646',
    'size',
    'sizes',
    '\u0627\u0644\u0645\u0642\u0627\u0633',
    '\u0627\u0644\u0645\u0642\u0627\u0633\u0627\u062a',
    '\u0627\u0644\u062d\u062c\u0645',
    '\u0627\u0644\u0627\u062d\u062c\u0627\u0645',
    '\u0627\u0644\u0623\u062d\u062c\u0627\u0645',
    'material',
    '\u0627\u0644\u062e\u0627\u0645\u0629',
    'style',
    '\u0627\u0644\u0637\u0631\u0627\u0632',
  ].forEach((key) => {
    if (metadataObject[key] !== undefined) {
      directAttributes[key] = metadataObject[key];
    }
  });

  return normalizeVariantAttributes(directAttributes);
}

function looksLikeSize(value: string): boolean {
  return /^(?:xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl|5xl|free|one size|onesize|universal|small|medium|large|extra large|\d{1,3}(?:\.\d+)?)$/i.test(
    value.trim(),
  );
}

function parseVariantName(
  name: string | undefined,
  variantType: unknown,
): Record<string, string> {
  const trimmedName = name?.trim();
  if (!trimmedName) {
    return {};
  }

  if (trimmedName.includes(':')) {
    const labeledAttributes = trimmedName
      .split(/\s*\|\s*|\s*,\s*/)
      .reduce<Record<string, string>>((acc, segment) => {
        const separatorIndex = segment.indexOf(':');
        if (separatorIndex <= 0) {
          return acc;
        }

        const key = canonicalizeAttributeKey(segment.slice(0, separatorIndex));
        const value = segment.slice(separatorIndex + 1).trim();
        if (key && value) {
          acc[key] = value;
        }

        return acc;
      }, {});

    if (Object.keys(labeledAttributes).length > 0) {
      return labeledAttributes;
    }
  }

  let parts = trimmedName
    .split(/\s*\/\s*|\s*\|\s*|\s+[–-]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 1 && /[–-]/.test(parts[0])) {
    const hyphenParts = parts[0]
      .split(/\s*[–-]\s*/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (
      hyphenParts.length === 2 &&
      looksLikeSize(hyphenParts[0]) !== looksLikeSize(hyphenParts[1])
    ) {
      parts = hyphenParts;
    }
  }

  if (parts.length === 0) {
    return {};
  }

  if (parts.length === 1) {
    if (looksLikeSize(parts[0]) || String(variantType).toLowerCase() === 'size') {
      return { Size: parts[0] };
    }

    if (String(variantType).toLowerCase() === 'color') {
      return { Color: parts[0] };
    }

    return { Option: parts[0] };
  }

  if (parts.length === 2) {
    const [first, second] = parts;
    if (looksLikeSize(first) && !looksLikeSize(second)) {
      return { Size: first, Color: second };
    }

    if (!looksLikeSize(first) && looksLikeSize(second)) {
      return { Color: first, Size: second };
    }

    if (String(variantType).toLowerCase() === 'size') {
      return { Size: first, 'Option 2': second };
    }

    return { Color: first, Size: second };
  }

  return parts.reduce<Record<string, string>>((acc, part, index) => {
    if (!acc.Color && !looksLikeSize(part)) {
      acc.Color = part;
      return acc;
    }

    if (!acc.Size && looksLikeSize(part)) {
      acc.Size = part;
      return acc;
    }

    acc[`Option ${index + 1}`] = part;
    return acc;
  }, {});
}

export function getVariantAttributes(
  variant: ProductVariant | null | undefined,
): Record<string, string> {
  const directAttributes = normalizeVariantAttributes(
    variant?.attributes ?? variant?.attributeValues,
  );
  const metadataAttributes = parseVariantMetadata(variant?.metadata);
  const baseAttributes =
    Object.keys(directAttributes).length > 0
      ? directAttributes
      : metadataAttributes;

  if (variant?.name) {
    const nameAttributes = parseVariantName(variant.name, variant.type);
    if (Object.keys(baseAttributes).length > 0) {
      if (Object.keys(nameAttributes).length > 0) {
        const reconciled = { ...baseAttributes };
        const nameParts = variant.name
          .split(/\s*[\/\-|–]\s*/)
          .map((p) => p.trim())
          .filter(Boolean);
        const entries = Object.entries(reconciled);
        entries.forEach(([key, val], idx) => {
          if (!nameParts.includes(val)) {
            if (nameParts.length === entries.length && nameParts[idx]) {
              reconciled[key] = nameParts[idx];
            } else if (nameAttributes[key] && nameParts.includes(nameAttributes[key])) {
              reconciled[key] = nameAttributes[key];
            }
          }
        });
        Object.entries(nameAttributes).forEach(([nKey, nVal]) => {
          if (!reconciled[nKey] && nameParts.includes(nVal)) {
            reconciled[nKey] = nVal;
          }
        });
        return reconciled;
      }
      return baseAttributes;
    }
    return nameAttributes;
  }

  if (Object.keys(baseAttributes).length > 0) {
    return baseAttributes;
  }

  return {};
}
