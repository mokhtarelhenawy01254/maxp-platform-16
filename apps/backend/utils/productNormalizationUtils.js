const { safeJsonParse } = require('./jsonUtils');
const {
  sanitizeStoredAssetUrl,
  sanitizeImageCollection,
} = require('./productMediaUtils');
const { parseProductMetadata } = require('./productMetadataUtils');
const { getVolumeDiscountsFromMetadata } = require('./volumeDiscountUtils');

const CANONICAL_ATTRIBUTE_LABELS = {
  color: 'Color',
  colors: 'Color',
  colour: 'Color',
  colours: 'Color',
  '\u0644\u0648\u0646': 'Color',
  '\u0627\u0644\u0644\u0648\u0646': 'Color',
  '\u0627\u0644\u0627\u0644\u0648\u0627\u0646': 'Color',
  '\u0627\u0644\u0623\u0644\u0648\u0627\u0646': 'Color',
  '\u0627\u0644\u0648\u0627\u0646': 'Color',
  '\u0623\u0644\u0648\u0627\u0646': 'Color',
  size: 'Size',
  sizes: 'Size',
  shoe_size: 'Size',
  shoesize: 'Size',
  shoeSize: 'Size',
  '\u0627\u0644\u0645\u0642\u0627\u0633': 'Size',
  '\u0627\u0644\u0645\u0642\u0627\u0633\u0627\u062a': 'Size',
  '\u0627\u0644\u062d\u062c\u0645': 'Size',
  '\u0627\u0644\u0627\u062d\u062c\u0627\u0645': 'Size',
  '\u0627\u0644\u0623\u062d\u062c\u0627\u0645': 'Size',
  capacity: 'Capacity',
  capacities: 'Capacity',
  storage: 'Storage',
  memory: 'Storage',
  volume: 'Volume',
  bottle_size: 'Volume',
  bottleSize: 'Volume',
  scent: 'Scent',
  fragrance: 'Scent',
  aroma: 'Scent',
  concentration: 'Concentration',
  model: 'Model',
  version: 'Model',
  material: 'Material',
  '\u0627\u0644\u062e\u0627\u0645\u0629': 'Material',
  style: 'Style',
  '\u0627\u0644\u0637\u0631\u0627\u0632': 'Style',
  pack: 'Pack',
  package: 'Pack',
  weight: 'Weight',
  metal_color: 'Color',
  metalColor: 'Color',
  '\u0627\u0644\u0633\u0639\u0629': 'Capacity',
  '\u0627\u0644\u0633\u0639\u0629 \u0627\u0644\u062a\u062e\u0632\u064a\u0646\u064a\u0629': 'Storage',
  '\u0627\u0644\u0631\u0627\u0626\u062d\u0629': 'Scent',
  '\u0627\u0644\u0639\u0637\u0631': 'Scent',
  '\u0627\u0644\u062a\u0631\u0643\u064a\u0632': 'Concentration',
  '\u0627\u0644\u0645\u0648\u062f\u064a\u0644': 'Model',
  '\u0627\u0644\u0639\u0628\u0648\u0629': 'Pack',
  '\u0627\u0644\u0648\u0632\u0646': 'Weight',
};

function normalizeVariantAttributes(rawAttributes) {
  let parsedAttributes = rawAttributes;

  if (typeof parsedAttributes === 'string' && parsedAttributes.trim()) {
    parsedAttributes = safeJsonParse(parsedAttributes, {});
  }

  if (Array.isArray(parsedAttributes)) {
    return parsedAttributes.reduce((acc, attribute) => {
      if (!attribute || typeof attribute !== 'object') {
        return acc;
      }

      const rawKey = attribute.name ?? attribute.key ?? attribute.attributeName ?? attribute.attribute ?? attribute.type;
      const rawValue = attribute.option ?? attribute.value ?? attribute.label ?? attribute.displayValue;
      const normalizedKey = CANONICAL_ATTRIBUTE_LABELS[String(rawKey || '').trim().toLowerCase()] || String(rawKey || '').trim();
      const normalizedValue = typeof rawValue === 'string'
        ? rawValue.trim()
        : (typeof rawValue === 'number' || typeof rawValue === 'boolean' ? String(rawValue) : '');

      if (normalizedKey && normalizedValue) {
        acc[normalizedKey] = normalizedValue;
      }

      return acc;
    }, {});
  }

  if (!parsedAttributes || typeof parsedAttributes !== 'object') {
    return {};
  }

  return Object.entries(parsedAttributes).reduce((acc, [key, value]) => {
    const normalizedKey = CANONICAL_ATTRIBUTE_LABELS[String(key).trim().toLowerCase()] || String(key).trim();
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

function parseVariantMetadata(rawMetadata) {
  let parsedMetadata = rawMetadata;

  if (typeof parsedMetadata === 'string' && parsedMetadata.trim()) {
    parsedMetadata = safeJsonParse(parsedMetadata, {});
  }

  if (Array.isArray(parsedMetadata)) {
    return normalizeVariantAttributes(parsedMetadata);
  }

  if (!parsedMetadata || typeof parsedMetadata !== 'object') {
    return {};
  }

  const nestedAttributes = normalizeVariantAttributes(
    parsedMetadata.attributeValues ?? parsedMetadata.attributes,
  );
  if (Object.keys(nestedAttributes).length > 0) {
    return nestedAttributes;
  }

  const directAttributes = {};
  [
    'color',
    'colors',
    'colour',
    'colours',
    '\u0644\u0648\u0646',
    '\u0627\u0644\u0644\u0648\u0646',
    '\u0627\u0644\u0627\u0644\u0648\u0627\u0646',
    '\u0627\u0644\u0623\u0644\u0648\u0627\u0646',
    '\u0627\u0644\u0648\u0627\u0646',
    '\u0623\u0644\u0648\u0627\u0646',
    'size',
    'sizes',
    'shoe_size',
    'shoeSize',
    '\u0627\u0644\u0645\u0642\u0627\u0633',
    '\u0627\u0644\u0645\u0642\u0627\u0633\u0627\u062a',
    '\u0627\u0644\u062d\u062c\u0645',
    '\u0627\u0644\u0627\u062d\u062c\u0627\u0645',
    '\u0627\u0644\u0623\u062d\u062c\u0627\u0645',
    'capacity',
    'storage',
    'memory',
    'volume',
    'bottle_size',
    'scent',
    'fragrance',
    'concentration',
    'model',
    'version',
    'material',
    '\u0627\u0644\u062e\u0627\u0645\u0629',
    'style',
    '\u0627\u0644\u0637\u0631\u0627\u0632',
    'pack',
    'weight',
    'metal_color',
    '\u0627\u0644\u0633\u0639\u0629',
    '\u0627\u0644\u0633\u0639\u0629 \u0627\u0644\u062a\u062e\u0632\u064a\u0646\u064a\u0629',
    '\u0627\u0644\u0631\u0627\u0626\u062d\u0629',
    '\u0627\u0644\u062a\u0631\u0643\u064a\u0632',
    '\u0627\u0644\u0645\u0648\u062f\u064a\u0644',
    '\u0627\u0644\u0639\u0628\u0648\u0629',
    '\u0627\u0644\u0648\u0632\u0646',
  ].forEach((key) => {
    if (parsedMetadata[key] !== undefined) {
      directAttributes[key] = parsedMetadata[key];
    }
  });

  return normalizeVariantAttributes(directAttributes);
}

function looksLikeSize(value) {
  return /^(?:xxs|xs|s|m|l|xl|xxl|xxxl|2xl|3xl|4xl|5xl|free|one size|onesize|universal|small|medium|large|extra large|\d{1,3}(?:\.\d+)?)$/i.test(
    String(value || '').trim(),
  );
}

function parseVariantName(name, variantType) {
  const trimmedName = String(name || '').trim();
  const normalizedVariantType = CANONICAL_ATTRIBUTE_LABELS[String(variantType || '').trim().toLowerCase()]
    || String(variantType || '').trim();
  if (!trimmedName) {
    return {};
  }

  if (trimmedName.includes(':')) {
    const labeledAttributes = trimmedName
      .split(/\s*\|\s*|\s*,\s*/)
      .reduce((acc, segment) => {
        const separatorIndex = segment.indexOf(':');
        if (separatorIndex <= 0) {
          return acc;
        }

        const rawKey = segment.slice(0, separatorIndex).trim();
        const key = CANONICAL_ATTRIBUTE_LABELS[rawKey.toLowerCase()] || rawKey;
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

  const parts = trimmedName
    .split(/\s*[\/|–—]\s*|\s+[–-]\s*|\s*[-–]\s+|\s*-(?=\d)|(?<=\d)-\s*|(?<=[\u0600-\u06FF])\s*-\s*|\s*-\s*(?=[\u0600-\u06FF])/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return {};
  }

  if (parts.length === 1) {
    if (looksLikeSize(parts[0]) || normalizedVariantType === 'Size') {
      return { Size: parts[0] };
    }

    if (normalizedVariantType === 'Color') {
      return { Color: parts[0] };
    }

    if (normalizedVariantType && normalizedVariantType !== String(variantType || '').trim()) {
      return { [normalizedVariantType]: parts[0] };
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

    if (normalizedVariantType === 'Size') {
      return { Size: first, 'Option 2': second };
    }

    return { Color: first, Size: second };
  }

  return parts.reduce((acc, part, index) => {
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

function resolveVariantAttributes(variant) {
  const directAttributes = normalizeVariantAttributes(
    variant.attributes ?? variant.attributeValues,
  );
  if (Object.keys(directAttributes).length > 0) {
    return directAttributes;
  }

  const metadataAttributes = parseVariantMetadata(variant.metadata);
  if (Object.keys(metadataAttributes).length > 0) {
    return metadataAttributes;
  }

  return parseVariantName(variant.name, variant.type);
}

function resolveWooMediaOrigin(wooCommerceUrl) {
  if (typeof wooCommerceUrl !== 'string' || !wooCommerceUrl.trim()) {
    return null;
  }

  try {
    return new URL(wooCommerceUrl).origin;
  } catch {
    return null;
  }
}

function restoreWooMediaUrl(assetUrl, wooCommerceUrl) {
  if (typeof assetUrl !== 'string') {
    return assetUrl || null;
  }

  const trimmed = assetUrl.trim();
  if (!trimmed) {
    return null;
  }

  if (!trimmed.startsWith('/wp-content/uploads/')) {
    return trimmed;
  }

  const origin = resolveWooMediaOrigin(wooCommerceUrl);
  if (!origin) {
    return trimmed;
  }

  try {
    return new URL(trimmed, `${origin}/`).toString();
  } catch {
    return trimmed;
  }
}

function formatProductResponse(product) {
  const normalizedImages = Array.from(new Set(
    sanitizeImageCollection(product.images || [])
      .map((image) => restoreWooMediaUrl(image, product.wooCommerceUrl))
      .filter(Boolean),
  ));
  const normalizedMainImage = restoreWooMediaUrl(
    sanitizeStoredAssetUrl(product.mainImage),
    product.wooCommerceUrl,
  );
  const volumeDiscounts = getVolumeDiscountsFromMetadata(product.metadata, {
    activeOnly: true,
    basePrice: parseFloat(product.price) || 0,
  });
  
  const rawVariants = product.productVariants || product.variants || [];
  const variants = rawVariants.map((variant) => {
    const variantMetadata = safeJsonParse(variant.metadata, {});
    const attributes = resolveVariantAttributes(variant);
    const normalizedVariantImage = restoreWooMediaUrl(
      sanitizeStoredAssetUrl(variant.image || variantMetadata.image),
      product.wooCommerceUrl,
    );

    return {
      ...variant,
      attributes,
      attributeValues: attributes,
      image: normalizedVariantImage,
      price: variant.price ? parseFloat(variant.price) : null,
      comparePrice: variant.comparePrice ? parseFloat(variant.comparePrice) : null,
      cost: variant.cost ? parseFloat(variant.cost) : null,
    };
  });

  const finalMainImage = normalizedMainImage || normalizedImages[0] || null;

  const parsedMetadata = parseProductMetadata(product.metadata);
  const metaTitle =
    product.metaTitle ||
    parsedMetadata?.metaTitle ||
    parsedMetadata?.seo?.metaTitle ||
    parsedMetadata?.seo?.title ||
    null;
  const metaDescription =
    product.metaDescription ||
    parsedMetadata?.metaDescription ||
    parsedMetadata?.seo?.metaDescription ||
    parsedMetadata?.seo?.description ||
    null;

  let effectiveComparePrice = product.comparePrice ? parseFloat(product.comparePrice) : null;
  if (!effectiveComparePrice && variants && variants.length > 0) {
    const varCompares = variants.map(v => v.comparePrice).filter(cp => cp && cp > 0);
    if (varCompares.length > 0) {
      effectiveComparePrice = varCompares[0];
    }
  }

  let effectivePrice = parseFloat(product.price) || 0;
  if (!effectivePrice && variants && variants.length > 0) {
    const varPrices = variants.map(v => v.price).filter(p => p && p > 0);
    if (varPrices.length > 0) {
      effectivePrice = varPrices[0];
    }
  }

  return {
    ...product,
    metadata: parsedMetadata,
    metaTitle,
    metaDescription,
    price: effectivePrice,
    comparePrice: effectiveComparePrice,
    cost: product.cost ? parseFloat(product.cost) : null,
    weight: product.weight ? parseFloat(product.weight) : null,
    mainImage: finalMainImage,
    images: normalizedImages,
    volumeDiscounts,
    variants,
    productVariants: variants,
  };
}

module.exports = {
  formatProductResponse,
  resolveVariantAttributes,
  normalizeVariantAttributes,
  parseVariantMetadata,
  parseVariantName,
};
