const fs = require('fs');
const path = require('path');
const express = require('express');
const { getSharedPrismaClientAsync } = require('../services/sharedDatabase');
const redisCacheService = require('../services/redisCacheService');
const {
  applyVolumeDiscount,
  getVolumeDiscountsFromMetadata,
} = require('../utils/volumeDiscountUtils');
const {
  extractSubdomainMiddleware,
  requireCompany,
} = require('../middleware/subdomainMiddleware');
const {
  findConvertedPresentationBySlug,
} = require('../utils/presentationConversion');
const { buildAffiliateUrl } = require('../services/amazonAffiliateService');

const router = express.Router();
const ALLOWED_SORT_FIELDS = new Set(['createdAt', 'updatedAt', 'name', 'price']);
const LOCAL_UPLOAD_CACHE_TTL_MS = 5 * 60 * 1000;
const localUploadAvailabilityCache = new Map();
const DEFAULT_ACTIVE_CART_WINDOW_HOURS = 24;
const DEFAULT_RECENT_PURCHASE_WINDOW_HOURS = 48;
const DEFAULT_WAITLIST_FALLBACK_LIMIT = 18;
const DEFAULT_UPSELL_PRICE_RANGE_PERCENT = 20;
const PRODUCT_LIST_DESCRIPTION_LIMIT = 280;
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
  '\u0627\u0644\u0645\u0642\u0627\u0633': 'Size',
  '\u0627\u0644\u0645\u0642\u0627\u0633\u0627\u062a': 'Size',
  '\u0627\u0644\u062d\u062c\u0645': 'Size',
  '\u0627\u0644\u0627\u062d\u062c\u0627\u0645': 'Size',
  '\u0627\u0644\u0623\u062d\u062c\u0627\u0645': 'Size',
  material: 'Material',
  '\u0627\u0644\u062e\u0627\u0645\u0629': 'Material',
  style: 'Style',
  '\u0627\u0644\u0637\u0631\u0627\u0632': 'Style',
};

const PUBLIC_CATEGORY_SELECT = Object.freeze({
  id: true,
  name: true,
  slug: true,
  image: true,
  sortOrder: true,
});

const PUBLIC_PRODUCT_VARIANT_SELECT = Object.freeze({
  id: true,
  productId: true,
  name: true,
  type: true,
  sku: true,
  price: true,
  comparePrice: true,
  images: true,
  stock: true,
  trackInventory: true,
  isActive: true,
  sortOrder: true,
  metadata: true,
});

const PUBLIC_PRODUCT_SELECT = Object.freeze({
  id: true,
  name: true,
  description: true,
  sku: true,
  price: true,
  comparePrice: true,
  images: true,
  mainImage: true,
  stock: true,
  trackInventory: true,
  weight: true,
  dimensions: true,
  categoryId: true,
  isActive: true,
  isFeatured: true,
  tags: true,
  metadata: true,
  companyId: true,
  createdAt: true,
  updatedAt: true,
  slug: true,
  wooCommerceId: true,
  wooCommerceUrl: true,
  enableCheckoutForm: true,
  showAddToCartButton: true,
  saleStartDate: true,
  saleEndDate: true,
  sizeGuide: true,
  isPreOrder: true,
  preOrderDate: true,
  preOrderMessage: true,
  showFakeStock: true,
  category: {
    select: PUBLIC_CATEGORY_SELECT,
  },
  productVariants: {
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: PUBLIC_PRODUCT_VARIANT_SELECT,
  },
});

async function getPrisma() {
  return getSharedPrismaClientAsync();
}

function withPublicActiveProductFilter(where = {}) {
  return {
    ...where,
    deletedAt: null,
  };
}

function buildProductLookupOrConditions(rawIdentifier) {
  if (!rawIdentifier || typeof rawIdentifier !== 'string') {
    return [];
  }
  const trimmed = rawIdentifier.trim();
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    // ignore
  }

  const conditions = [{ slug: trimmed }];
  if (decoded !== trimmed) {
    conditions.push({ slug: decoded });
  }

  if (trimmed.length > 20) {
    conditions.unshift({ id: trimmed });
  }
  if (decoded.length > 20 && decoded !== trimmed) {
    conditions.unshift({ id: decoded });
  }

  return conditions;
}

/**
 * يحمّل بيانات المنتج الأصلي لمنتج محوّل (تحويل مكرر لعرض تقديمي) ويرجّعها
 * كـ JSON مباشرة بدل الـ 301 (الـ CDN بيعيد توجيه الـ redirect لصفحة HTML
 * فبيتكسّر الـ SPA fetch). الـ frontend بياخد redirectedFrom ويعمل redirect بنفسه.
 */
async function loadConvertedProductPayload(prisma, companyId, slugOrId, req) {
  let resolved = await findConvertedPresentationBySlug(prisma, companyId, slugOrId);
  if (!resolved && typeof slugOrId === 'string') {
    try {
      const decoded = decodeURIComponent(slugOrId);
      if (decoded !== slugOrId) {
        resolved = await findConvertedPresentationBySlug(prisma, companyId, decoded);
      }
    } catch {}
  }
  if (!resolved) {
    return null;
  }

  const { presentation, targetProduct } = resolved;

  const target = await prisma.product.findFirst({
    where: {
      id: targetProduct.id,
      companyId,
      deletedAt: null,
      isActive: true,
    },
    select: PUBLIC_PRODUCT_SELECT,
  });

  if (!target) {
    return null;
  }

  const demandSignals = await getProductDemandSignals(prisma, {
    companyId,
    productId: target.id,
  });

  const affiliatePricing = req
    ? await resolveAffiliateProductPricing(prisma, req, target.id)
    : null;

  const presImages = presentation.images ? JSON.parse(presentation.images) : [];
  const formatted = formatProductResponse({
    ...target,
    ...demandSignals,
    images: presImages.length > 0 ? JSON.stringify(presImages) : target.images,
    mainImage: presentation.mainImage || target.mainImage,
    name: presentation.title || target.name,
    description: presentation.description || target.description,
  });

  const result = affiliatePricing ? applyAffiliatePricing(formatted, affiliatePricing) : formatted;

  result.canonicalSlug = target.slug;
  result.presentation = {
    id: presentation.id,
    name: presentation.name,
    slug: presentation.slug,
  };

  return {
    success: true,
    data: result,
  };
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseMaybeNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function truncateProductDescription(value, limit = PRODUCT_LIST_DESCRIPTION_LIMIT) {
  if (typeof value !== 'string') {
    return value || '';
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(limit - 1, 0)).trimEnd()}…`;
}

function clampNumber(value, min, max, fallback) {
  const parsed = parseMaybeNumber(value);
  if (parsed === null) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function parseJsonRecord(rawValue) {
  if (isRecord(rawValue)) {
    return rawValue;
  }

  if (typeof rawValue !== 'string' || !rawValue.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue);
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function coerceCartItemsToArray(rawItems) {
  if (!rawItems) return [];
  if (Array.isArray(rawItems)) return rawItems;

  if (typeof rawItems === 'string') {
    try {
      const parsed = JSON.parse(rawItems);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.items)) return parsed.items;
    } catch (_) {
      return [];
    }
  }

  if (typeof rawItems === 'object' && Array.isArray(rawItems.items)) {
    return rawItems.items;
  }

  return [];
}

function doesCartItemMatchProduct(item, productId) {
  const rawIdentifiers = [
    item?.productId,
    item?.id,
    item?.product?.id,
  ];

  return rawIdentifiers.some((identifier) => {
    const normalizedIdentifier = String(identifier || '').trim();
    if (!normalizedIdentifier) {
      return false;
    }

    return (
      normalizedIdentifier === productId ||
      normalizedIdentifier.startsWith(`${productId}-`)
    );
  });
}

function countProductQuantityInItems(rawItems, productId) {
  return coerceCartItemsToArray(rawItems).reduce((total, item) => {
    if (!doesCartItemMatchProduct(item, productId)) {
      return total;
    }

    const quantity = Math.max(1, parseMaybeNumber(item?.quantity) || 1);
    return total + quantity;
  }, 0);
}

async function getConversionSuiteSocialProofSettings(prisma, companyId) {
  const defaults = {
    activeCartWindowHours: DEFAULT_ACTIVE_CART_WINDOW_HOURS,
    recentPurchaseWindowHours: DEFAULT_RECENT_PURCHASE_WINDOW_HOURS,
    waitlistFallbackLimit: DEFAULT_WAITLIST_FALLBACK_LIMIT,
  };

  if (!companyId) {
    return defaults;
  }

  const companyApp = await prisma.companyApp.findFirst({
    where: {
      companyId,
      status: { in: ['TRIAL', 'ACTIVE'] },
      app: {
        slug: 'conversion-suite',
      },
    },
    select: {
      settings: true,
    },
  });

  const settings = parseJsonRecord(companyApp?.settings);
  const thresholds = isRecord(settings.thresholds) ? settings.thresholds : {};

  return {
    activeCartWindowHours: clampNumber(
      thresholds.purchaseFomoCartWindowHours,
      1,
      168,
      defaults.activeCartWindowHours,
    ),
    recentPurchaseWindowHours: clampNumber(
      thresholds.purchaseFomoRecentPurchaseWindowHours,
      1,
      720,
      defaults.recentPurchaseWindowHours,
    ),
    waitlistFallbackLimit: clampNumber(
      thresholds.purchaseFomoWaitlistFallbackLimit,
      1,
      99,
      defaults.waitlistFallbackLimit,
    ),
  };
}

function getLocalUploadCacheEntry(assetPath) {
  const cached = localUploadAvailabilityCache.get(assetPath);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    localUploadAvailabilityCache.delete(assetPath);
    return null;
  }

  return cached.exists;
}

function setLocalUploadCacheEntry(assetPath, exists) {
  localUploadAvailabilityCache.set(assetPath, {
    exists,
    expiresAt: Date.now() + LOCAL_UPLOAD_CACHE_TTL_MS,
  });

  if (localUploadAvailabilityCache.size > 2048) {
    const oldestKey = localUploadAvailabilityCache.keys().next().value;
    if (oldestKey) {
      localUploadAvailabilityCache.delete(oldestKey);
    }
  }
}

function isLocalUploadAssetPath(assetPath) {
  return typeof assetPath === 'string' && assetPath.startsWith('/uploads/');
}

function resolveUploadAssetCandidates(assetPath) {
  const relativeUploadPath = assetPath.split('?')[0].replace(/^\/+/, '');
  return [
    path.join(__dirname, '..', relativeUploadPath),
    path.join(__dirname, '..', '..', relativeUploadPath),
  ];
}

function isAvailablePublicAsset(assetPath) {
  if (!assetPath) {
    return false;
  }

  if (!isLocalUploadAssetPath(assetPath)) {
    return true;
  }

  const cached = getLocalUploadCacheEntry(assetPath);
  if (typeof cached === 'boolean') {
    return cached;
  }

  const exists = resolveUploadAssetCandidates(assetPath).some((candidatePath) =>
    fs.existsSync(candidatePath),
  );
  setLocalUploadCacheEntry(assetPath, exists);

  return exists;
}

function normalizePublicAssetUrl(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('/uploads/')) {
    return trimmed;
  }

  if (trimmed.startsWith('/wp-content/uploads/')) {
    return trimmed;
  }

  if (trimmed.startsWith('uploads/')) {
    return `/${trimmed}`;
  }

  if (trimmed.startsWith('wp-content/uploads/')) {
    return `/${trimmed}`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      const normalizedPath = parsed.pathname.startsWith('/')
        ? parsed.pathname
        : `/${parsed.pathname}`;

      if (normalizedPath.startsWith('/wp-content/uploads/')) {
        if (parsed.protocol === 'http:') {
          parsed.protocol = 'https:';
        }
        return parsed.toString();
      }

      if (normalizedPath.startsWith('/uploads/')) {
        return `${normalizedPath}${parsed.search || ''}`;
      }

      if (parsed.protocol === 'http:') {
        parsed.protocol = 'https:';
        return parsed.toString();
      }

      return parsed.toString();
    } catch {
      return trimmed.replace(/^http:\/\//i, 'https://');
    }
  }

  return trimmed;
}

function sanitizePublicAssetUrl(value) {
  const normalizedValue = normalizePublicAssetUrl(value);
  if (!normalizedValue) {
    return null;
  }

  if (isAvailablePublicAsset(normalizedValue)) {
    return normalizedValue;
  }

  // Fallback to a product placeholder for missing local uploads so storefront cards still render
  if (isLocalUploadAssetPath(normalizedValue)) {
    return "/placeholders/product-image.svg";
  }

  return null;
}

function normalizeProductImages(product) {
  const processImage = (img) => {
    if (typeof img === 'string') return sanitizePublicAssetUrl(img);
    if (img && typeof img === 'object' && (img.url || img.fullUrl)) {
      return sanitizePublicAssetUrl(img.fullUrl || img.url);
    }
    return null;
  };

  if (Array.isArray(product.images)) {
    return product.images.map(processImage).filter(Boolean);
  }

  if (typeof product.images === 'string' && product.images.trim()) {
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed)) {
        return parsed.map(processImage).filter(Boolean);
      }
    } catch {
      return [sanitizePublicAssetUrl(product.images)].filter(Boolean);
    }
  }

  const normalizedMainImage = sanitizePublicAssetUrl(product.mainImage);
  if (normalizedMainImage) {
    return [normalizedMainImage];
  }

  return [];
}

function normalizeVariantAttributes(rawAttributes) {
  let parsedAttributes = rawAttributes;

  if (typeof parsedAttributes === 'string' && parsedAttributes.trim()) {
    try {
      parsedAttributes = JSON.parse(parsedAttributes);
    } catch {
      return {};
    }
  }

  if (Array.isArray(parsedAttributes)) {
    return parsedAttributes.reduce((acc, attribute) => {
      if (!attribute || typeof attribute !== 'object' || Array.isArray(attribute)) {
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

function parseVariantMetadata(rawMetadata) {
  let parsedMetadata = rawMetadata;

  if (typeof parsedMetadata === 'string' && parsedMetadata.trim()) {
    try {
      parsedMetadata = JSON.parse(parsedMetadata);
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
    .split(/\s*\/\s*|\s*\|\s*|\s+[–-]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return {};
  }

  if (parts.length === 1) {
    if (looksLikeSize(parts[0]) || String(variantType || '').toLowerCase() === 'size') {
      return { Size: parts[0] };
    }

    if (String(variantType || '').toLowerCase() === 'color') {
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

    if (String(variantType || '').toLowerCase() === 'size') {
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
  const metadataAttributes = parseVariantMetadata(variant.metadata);
  const baseAttributes =
    Object.keys(directAttributes).length > 0
      ? directAttributes
      : metadataAttributes;

  if (variant.name) {
    const nameAttributes = parseVariantName(variant.name, variant.type);
    if (Object.keys(baseAttributes).length > 0) {
      if (Object.keys(nameAttributes).length > 0) {
        const reconciled = { ...baseAttributes };
        const nameParts = variant.name.split(/\s*[\/\-|–]\s*/).map((p) => p.trim());
        for (const [key, val] of Object.entries(reconciled)) {
          if (!nameParts.includes(val) && nameAttributes[key] && nameParts.includes(nameAttributes[key])) {
            reconciled[key] = nameAttributes[key];
          }
        }
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

function formatPublicVariantResponse(variant, wooCommerceUrl) {
  const variantMetadata = parseJsonRecord(variant.metadata);
  const attributes = resolveVariantAttributes(variant);
  const firstVariantImage =
    (Array.isArray(variant.images) ? variant.images[0] : null) ||
    (typeof variant.images === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(variant.images);
            return Array.isArray(parsed) ? parsed[0] : null;
          } catch {
            return null;
          }
        })()
      : null);
  const normalizedVariantImage = restoreWooMediaUrl(
    sanitizePublicAssetUrl(variant.image || variantMetadata.image || firstVariantImage),
    wooCommerceUrl,
  );

  return {
    id: variant.id,
    productId: variant.productId,
    name: variant.name,
    type: variant.type,
    sku: variant.sku,
    price: variant.price ? parseFloat(variant.price) : null,
    comparePrice: variant.comparePrice ? parseFloat(variant.comparePrice) : null,
    images: variant.images,
    stock: variant.stock,
    trackInventory: variant.trackInventory,
    isActive: variant.isActive,
    sortOrder: variant.sortOrder,
    allowBackorders: Boolean(variant.allowBackorders || variantMetadata.allowBackorders),
    attributes,
    attributeValues: attributes,
    image: normalizedVariantImage,
  };
}

function formatPublicCategoryResponse(category) {
  if (!category) {
    return null;
  }

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    image: category.image,
    sortOrder: category.sortOrder,
  };
}

function formatProductResponse(product, options = {}) {
  const isSummary = options.summary === true;
  const normalizedImages = Array.from(new Set(
    normalizeProductImages(product)
      .map((image) => restoreWooMediaUrl(image, product.wooCommerceUrl))
      .filter(Boolean),
  ));
  const normalizedMainImage = restoreWooMediaUrl(
    sanitizePublicAssetUrl(product.mainImage),
    product.wooCommerceUrl,
  );
  const volumeDiscounts = getVolumeDiscountsFromMetadata(product.metadata, {
    activeOnly: true,
    basePrice: parseFloat(product.price) || 0,
  });
  const variants = (product.productVariants || []).map((variant) =>
    formatPublicVariantResponse(variant, product.wooCommerceUrl),
  );
  const description = isSummary
    ? truncateProductDescription(product.description)
    : (product.description || '');
  const productMetadata = parseJsonRecord(product.metadata);
  const allowBackorders = Boolean(product.allowBackorders || productMetadata.allowBackorders);

  const response = {
    id: product.id,
    name: product.name,
    description,
    sku: product.sku,
    price: parseFloat(product.price) || 0,
    comparePrice: product.comparePrice ? parseFloat(product.comparePrice) : null,
    weight: product.weight ? parseFloat(product.weight) : null,
    dimensions: product.dimensions,
    categoryId: product.categoryId,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    stock: product.stock,
    trackInventory: product.trackInventory,
    allowBackorders,
    tags: product.tags,
    companyId: product.companyId,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    slug: product.slug,
    wooCommerceId: product.wooCommerceId,
    wooCommerceUrl: product.wooCommerceUrl,
    enableCheckoutForm: product.enableCheckoutForm,
    showAddToCartButton: product.showAddToCartButton,
    saleStartDate: product.saleStartDate,
    saleEndDate: product.saleEndDate,
    sizeGuide: product.sizeGuide,
    isPreOrder: product.isPreOrder,
    preOrderDate: product.preOrderDate,
    preOrderMessage: product.preOrderMessage,
    showFakeStock: product.showFakeStock,
    category: formatPublicCategoryResponse(product.category),
    mainImage: normalizedMainImage || normalizedImages[0] || null,
    images: normalizedImages,
    volumeDiscounts,
    variants,
    productVariants: variants,
  };

  if (product.amazonBuyUrl) {
    response.isAmazonProduct = true;
    response.amazonBuyUrl = product.amazonBuyUrl;
  }

  if (!isSummary) {
    response.metadata = product.metadata;
  } else if (product.metadata) {
    const parsedMeta = parseJsonRecord(product.metadata);
    response.metadata = {
      quantityOffers: parsedMeta.quantityOffers || [],
      variantSettings: parsedMeta.variantSettings || {},
    };
  }

  return response;
}

function getAffiliateCodeFromRequest(req) {
  const rawCode = req.query?.ref || req.query?.affiliate || req.cookies?.affiliateCode;
  return typeof rawCode === 'string' ? rawCode.trim() : '';
}

async function resolveAffiliateProductPricing(prisma, req, productId) {
  const affiliateCode = getAffiliateCodeFromRequest(req);
  const companyId = req.companyId;

  if (!affiliateCode || !companyId || !productId) {
    return null;
  }

  const affiliate = await prisma.affiliate.findFirst({
    where: {
      affiliateCode,
      companyId,
      status: 'ACTIVE',
      commissionType: 'MARKUP',
    },
    select: {
      id: true,
      affiliateCode: true,
      affiliate_products: {
        where: {
          productId,
          isActive: true,
        },
        select: {
          basePrice: true,
          markup: true,
          finalPrice: true,
        },
        take: 1,
      },
    },
  });

  const affiliateProduct = affiliate?.affiliate_products?.[0];
  if (!affiliateProduct) {
    return null;
  }

  return {
    affiliateId: affiliate.id,
    affiliateCode: affiliate.affiliateCode,
    type: 'MARKUP',
    basePrice: Number(affiliateProduct.basePrice),
    markup: Number(affiliateProduct.markup),
    finalPrice: Number(affiliateProduct.finalPrice),
  };
}

async function resolveAffiliateProductPricingMap(prisma, req, productIds = []) {
  const affiliateCode = getAffiliateCodeFromRequest(req);
  const companyId = req.companyId;
  const uniqueProductIds = Array.from(new Set(productIds.filter(Boolean)));

  if (!affiliateCode || !companyId || uniqueProductIds.length === 0) {
    return new Map();
  }

  const affiliate = await prisma.affiliate.findFirst({
    where: {
      affiliateCode,
      companyId,
      status: 'ACTIVE',
      commissionType: 'MARKUP',
    },
    select: {
      id: true,
      affiliateCode: true,
      affiliate_products: {
        where: {
          productId: { in: uniqueProductIds },
          isActive: true,
        },
        select: {
          productId: true,
          basePrice: true,
          markup: true,
          finalPrice: true,
        },
      },
    },
  });

  const pricingMap = new Map();
  for (const affiliateProduct of affiliate?.affiliate_products || []) {
    pricingMap.set(affiliateProduct.productId, {
      affiliateId: affiliate.id,
      affiliateCode: affiliate.affiliateCode,
      type: 'MARKUP',
      basePrice: Number(affiliateProduct.basePrice),
      markup: Number(affiliateProduct.markup),
      finalPrice: Number(affiliateProduct.finalPrice),
    });
  }

  return pricingMap;
}

function applyAffiliatePricing(response, affiliatePricing) {
  if (!affiliatePricing || !Number.isFinite(affiliatePricing.finalPrice)) {
    return response;
  }

  return {
    ...response,
    price: affiliatePricing.finalPrice,
    affiliatePricing,
  };
}

async function getProductDemandSignals(prisma, { companyId, productId }) {
  const cacheKey = `product_demand_signals:${productId}`;
  try {
    const cached = await redisCacheService.get(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (err) {
    console.error('⚠️ [REDIS] error fetching product demand signals:', err);
  }

  const socialProofSettings = await getConversionSuiteSocialProofSettings(prisma, companyId);
  const activeCartWindowStart = new Date(
    Date.now() - socialProofSettings.activeCartWindowHours * 60 * 60 * 1000,
  );
  const recentPurchaseWindowStart = new Date(
    Date.now() - socialProofSettings.recentPurchaseWindowHours * 60 * 60 * 1000,
  );

  const [salesAggregate, backInStockRequests, activeGuestCarts, recentGuestOrders] = await Promise.all([
    prisma.orderItem.aggregate({
      where: {
        productId,
      },
      _sum: {
        quantity: true,
      },
      _count: {
        id: true,
      },
    }),
    prisma.backInStockNotification.count({
      where: {
        companyId,
        productId,
        isNotified: false,
      },
    }),
    prisma.guestCart.findMany({
      where: {
        companyId,
        items: {
          contains: productId,
        },
        expiresAt: {
          gt: new Date(),
        },
        OR: [
          { updatedAt: { gte: activeCartWindowStart } },
          { checkoutUpdatedAt: { gte: activeCartWindowStart } },
          { checkoutStartedAt: { gte: activeCartWindowStart } },
        ],
      },
      select: {
        cartId: true,
        items: true,
      },
    }),
    prisma.guestOrder.findMany({
      where: {
        companyId,
        items: {
          contains: productId,
        },
        createdAt: {
          gte: recentPurchaseWindowStart,
        },
        NOT: {
          status: 'DUPLICATE_ORDER',
        },
      },
      select: {
        id: true,
        items: true,
      },
    }),
  ]);

  const soldCount = Number(salesAggregate?._sum?.quantity || 0);
  const orderCount = Number(salesAggregate?._count?.id || 0);
  let activeCartCount = 0;
  let activeCartUnits = 0;
  activeGuestCarts.forEach((cart) => {
    const quantity = countProductQuantityInItems(cart.items, productId);
    if (quantity <= 0) {
      return;
    }

    activeCartCount += 1;
    activeCartUnits += quantity;
  });

  let recentOrderCount = 0;
  let recentOrderUnits = 0;
  recentGuestOrders.forEach((order) => {
    const quantity = countProductQuantityInItems(order.items, productId);
    if (quantity <= 0) {
      return;
    }

    recentOrderCount += 1;
    recentOrderUnits += quantity;
  });

  const recentPurchases = recentOrderCount;
  const purchaseFomoSource =
    activeCartCount > 0
      ? 'active_carts'
      : recentOrderCount > 0
        ? 'recent_orders'
        : backInStockRequests > 0
          ? 'waitlist'
          : null;
  const purchaseFomoCount =
    purchaseFomoSource === 'active_carts'
      ? activeCartCount
      : purchaseFomoSource === 'recent_orders'
        ? recentOrderCount
        : purchaseFomoSource === 'waitlist'
          ? Math.min(backInStockRequests, socialProofSettings.waitlistFallbackLimit)
          : 0;

  const result = {
    soldCount,
    orderCount,
    backInStockRequests,
    activeCartCount,
    activeCartUnits,
    recentOrderCount,
    recentOrderUnits,
    socialProof: {
      soldCount,
      orderCount,
      recentPurchases,
      backInStockRequests,
      activeCartCount,
      activeCartUnits,
      recentOrderCount,
      recentOrderUnits,
      purchaseFomoCount,
      purchaseFomoSource,
      activeCartWindowHours: socialProofSettings.activeCartWindowHours,
      recentPurchaseWindowHours: socialProofSettings.recentPurchaseWindowHours,
      waitlistFallbackLimit: socialProofSettings.waitlistFallbackLimit,
    },
  };

  try {
    await redisCacheService.set(cacheKey, result, 300); // Cache for 5 minutes
  } catch (err) {
    console.error('⚠️ [REDIS] error setting product demand signals cache:', err);
  }

  return result;
}

const RECOMMENDATION_REFERENCE_KEYS = Object.freeze({
  related: [
    'relatedProducts',
    'relatedIds',
    'crossSellProducts',
    'crossSellIds',
    'upsellProducts',
    'upsellIds',
  ],
  boughtTogether: [
    'crossSellProducts',
    'crossSellIds',
    'relatedProducts',
    'relatedIds',
    'upsellProducts',
    'upsellIds',
  ],
  upsell: [
    'upsellProducts',
    'upsellIds',
    'crossSellProducts',
    'crossSellIds',
    'relatedProducts',
    'relatedIds',
  ],
});

const RECOMMENDATION_PRODUCT_SELECT = PUBLIC_PRODUCT_SELECT;

function dedupeStringValues(values) {
  const seen = new Set();
  return values.reduce((list, value) => {
    const normalizedValue = String(value || '').trim();
    if (!normalizedValue || seen.has(normalizedValue)) {
      return list;
    }

    seen.add(normalizedValue);
    list.push(normalizedValue);
    return list;
  }, []);
}

function normalizeRecommendationIdentifiers(rawValue) {
  const collectedValues = [];
  const seen = new Set();

  const appendValue = (value) => {
    if (Array.isArray(value)) {
      value.forEach(appendValue);
      return;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const normalizedValue = String(value).trim();
      if (!normalizedValue || seen.has(normalizedValue)) {
        return;
      }

      seen.add(normalizedValue);
      collectedValues.push(normalizedValue);
      return;
    }

    if (isRecord(value)) {
      ['productId', 'id', 'slug', 'wooCommerceId', 'externalId'].forEach((key) => {
        if (value[key] !== undefined && value[key] !== null) {
          appendValue(value[key]);
        }
      });
    }
  };

  appendValue(rawValue);
  return collectedValues;
}

function collectRecommendationIdentifiers(metadata, strategy) {
  const keys =
    RECOMMENDATION_REFERENCE_KEYS[strategy] ||
    RECOMMENDATION_REFERENCE_KEYS.related;
  const seen = new Set();
  const orderedIdentifiers = [];

  keys.forEach((key) => {
    normalizeRecommendationIdentifiers(metadata[key]).forEach((identifier) => {
      if (seen.has(identifier)) {
        return;
      }

      seen.add(identifier);
      orderedIdentifiers.push(identifier);
    });
  });

  return orderedIdentifiers;
}

async function getConversionSuiteRecommendationSettings(prisma, companyId) {
  const defaults = {
    upsellPriceRangePercent: DEFAULT_UPSELL_PRICE_RANGE_PERCENT,
  };

  if (!companyId) {
    return defaults;
  }

  const companyApp = await prisma.companyApp.findFirst({
    where: {
      companyId,
      status: { in: ['TRIAL', 'ACTIVE'] },
      app: {
        slug: 'conversion-suite',
      },
    },
    select: {
      settings: true,
    },
  });

  const settings = parseJsonRecord(companyApp?.settings);
  const thresholds = isRecord(settings.thresholds) ? settings.thresholds : {};

  return {
    upsellPriceRangePercent: clampNumber(
      thresholds.upsellPriceRangePercent,
      0,
      300,
      defaults.upsellPriceRangePercent,
    ),
  };
}

async function fetchProductsByIdentifiers(prisma, {
  companyId,
  identifiers,
  excludeIds = [],
  limit,
}) {
  const orderedIdentifiers = dedupeStringValues(identifiers || []);
  if (orderedIdentifiers.length === 0 || limit <= 0) {
    return [];
  }

  const normalizedExcludeIds = dedupeStringValues(excludeIds);
  const where = withPublicActiveProductFilter({
    companyId,
    isActive: true,
    isHidden: false,
    OR: [
      { id: { in: orderedIdentifiers } },
      { slug: { in: orderedIdentifiers } },
      { wooCommerceId: { in: orderedIdentifiers } },
    ],
    ...(normalizedExcludeIds.length > 0
      ? { id: { notIn: normalizedExcludeIds } }
      : {}),
  });

  const products = await prisma.product.findMany({
    where,
    select: RECOMMENDATION_PRODUCT_SELECT,
    take: Math.max(limit, orderedIdentifiers.length),
  });

  const productLookup = new Map();
  products.forEach((product) => {
    productLookup.set(product.id, product);
    if (product.slug) {
      productLookup.set(product.slug, product);
    }
    if (product.wooCommerceId) {
      productLookup.set(String(product.wooCommerceId), product);
    }
  });

  const orderedProducts = [];
  const seenProductIds = new Set(normalizedExcludeIds);

  orderedIdentifiers.forEach((identifier) => {
    if (orderedProducts.length >= limit) {
      return;
    }

    const product = productLookup.get(identifier);
    if (!product || seenProductIds.has(product.id)) {
      return;
    }

    seenProductIds.add(product.id);
    orderedProducts.push(product);
  });

  return orderedProducts;
}

async function fetchCategoryFallbackRecommendations(prisma, {
  companyId,
  sourceProduct,
  excludeIds = [],
  limit,
  strategy = 'related',
  upsellPriceRangePercent = DEFAULT_UPSELL_PRICE_RANGE_PERCENT,
}) {
  if (!sourceProduct?.categoryId || limit <= 0) {
    return [];
  }

  const baseExcludeIds = dedupeStringValues([sourceProduct.id, ...excludeIds]);
  const baseWhere = withPublicActiveProductFilter({
    companyId,
    categoryId: sourceProduct.categoryId,
    isActive: true,
    isHidden: false,
    ...(baseExcludeIds.length > 0 ? { id: { notIn: baseExcludeIds } } : {}),
  });

  if (strategy !== 'upsell') {
    return prisma.product.findMany({
      where: baseWhere,
      select: RECOMMENDATION_PRODUCT_SELECT,
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }

  const currentPrice = Number(sourceProduct.price || 0);
  const minimumUpsellPrice =
    currentPrice > 0
      ? currentPrice * (1 + upsellPriceRangePercent / 100)
      : null;

  const premiumMatches = await prisma.product.findMany({
    where: {
      ...baseWhere,
      ...(minimumUpsellPrice ? { price: { gte: minimumUpsellPrice } } : {}),
    },
    select: RECOMMENDATION_PRODUCT_SELECT,
    orderBy: [{ price: 'asc' }, { isFeatured: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });

  if (premiumMatches.length >= limit) {
    return premiumMatches;
  }

  const premiumIds = premiumMatches.map((product) => product.id);
  const nextExcludeIds = dedupeStringValues([...baseExcludeIds, ...premiumIds]);
  const higherPriceMatches = await prisma.product.findMany({
    where: withPublicActiveProductFilter({
      companyId,
      categoryId: sourceProduct.categoryId,
      isActive: true,
      isHidden: false,
      ...(currentPrice > 0 ? { price: { gt: currentPrice } } : {}),
      ...(nextExcludeIds.length > 0 ? { id: { notIn: nextExcludeIds } } : {}),
    }),
    select: RECOMMENDATION_PRODUCT_SELECT,
    orderBy: [{ price: 'asc' }, { isFeatured: 'desc' }, { createdAt: 'desc' }],
    take: Math.max(limit - premiumMatches.length, 0),
  });

  const collected = [...premiumMatches, ...higherPriceMatches];
  if (collected.length >= limit) {
    return collected.slice(0, limit);
  }

  const fallbackExcludeIds = dedupeStringValues([
    ...nextExcludeIds,
    ...higherPriceMatches.map((product) => product.id),
  ]);
  const genericMatches = await prisma.product.findMany({
    where: withPublicActiveProductFilter({
      companyId,
      categoryId: sourceProduct.categoryId,
      isActive: true,
      isHidden: false,
      
      ...(fallbackExcludeIds.length > 0
        ? { id: { notIn: fallbackExcludeIds } }
        : {}),
    }),
    select: RECOMMENDATION_PRODUCT_SELECT,
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    take: Math.max(limit - collected.length, 0),
  });

  return [...collected, ...genericMatches].slice(0, limit);
}

async function getRecommendedProducts({
  companyId,
  productId,
  limit,
  strategy = 'related',
}) {
  const prisma = await getPrisma();
  const product = await prisma.product.findFirst({
    where: withPublicActiveProductFilter({
      OR: buildProductLookupOrConditions(productId),
      companyId,
    }),
    select: {
      id: true,
      slug: true,
      categoryId: true,
      metadata: true,
      price: true,
      wooCommerceId: true,
    },
  });

  if (!product) {
    return [];
  }

  const metadata = parseJsonRecord(product.metadata);
  const recommendationIdentifiers = collectRecommendationIdentifiers(metadata, strategy);
  const manualRecommendations = await fetchProductsByIdentifiers(prisma, {
    companyId,
    identifiers: recommendationIdentifiers,
    excludeIds: [product.id],
    limit,
  });

  const remainingSlots = Math.max(limit - manualRecommendations.length, 0);
  if (remainingSlots <= 0) {
    return manualRecommendations;
  }

  const recommendationSettings =
    strategy === 'upsell'
      ? await getConversionSuiteRecommendationSettings(prisma, companyId)
      : { upsellPriceRangePercent: DEFAULT_UPSELL_PRICE_RANGE_PERCENT };

  const fallbackRecommendations = await fetchCategoryFallbackRecommendations(prisma, {
    companyId,
    sourceProduct: product,
    excludeIds: [product.id, ...manualRecommendations.map((item) => item.id)],
    limit: remainingSlots,
    strategy,
    upsellPriceRangePercent: recommendationSettings.upsellPriceRangePercent,
  });

  return [...manualRecommendations, ...fallbackRecommendations].slice(0, limit);
}

router.use(extractSubdomainMiddleware);
router.use(requireCompany);

router.get('/', async (req, res) => {
  try {
    const companyId = req.companyId;
    const {
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      category,
      search,
      minPrice,
      maxPrice,
    } = req.query;

    const normalizedSortField = ALLOWED_SORT_FIELDS.has(String(sortBy))
      ? String(sortBy)
      : 'createdAt';
    const normalizedSortOrder = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';
    const take = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 60);
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (currentPage - 1) * take;

    const where = withPublicActiveProductFilter({
      companyId,
      isActive: true,
      isHidden: false,
    });

    // 🚀 Fast Redis Cache check for public storefront product browsing
    const isCacheable = !search && !req.query.ref && !req.query.affiliate && !req.cookies?.affiliateCode;
    const cacheKey = isCacheable
      ? `public_products:${companyId}:${category || 'all'}:${currentPage}:${take}:${normalizedSortField}:${normalizedSortOrder}:${minPrice || '0'}:${maxPrice || '0'}`
      : null;

    if (cacheKey) {
      try {
        const cached = await redisCacheService.get(cacheKey);
        if (cached) {
          res.set('Cache-Control', 'public, no-cache, must-revalidate');
          return res.json(cached);
        }
      } catch (cacheErr) {
        console.warn('⚠️ [REDIS] public products cache lookup failed:', cacheErr?.message);
      }
    }

    if (category && category !== 'all') {
      where.categoryId = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (minPrice || maxPrice) {
      const parsedMin = parseFloat(minPrice);
      const parsedMax = parseFloat(maxPrice);
      const validMin = Number.isFinite(parsedMin);
      const validMax = Number.isFinite(parsedMax);
      if (validMin || validMax) {
        where.price = {};
        if (validMin) where.price.gte = parsedMin;
        if (validMax) where.price.lte = parsedMax;
      }
    }

    const prisma = await getPrisma();
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: PUBLIC_PRODUCT_SELECT,
        orderBy: {
          [normalizedSortField]: normalizedSortOrder,
        },
        skip,
        take,
      }),
      prisma.product.count({ where }),
    ]);
    const affiliatePricingMap = await resolveAffiliateProductPricingMap(
      prisma,
      req,
      products.map((product) => product.id),
    );

    const responseData = {
      success: true,
      data: products.map((product) =>
        applyAffiliatePricing(
          formatProductResponse(product, { summary: true }),
          affiliatePricingMap.get(product.id),
        ),
      ),
      pagination: {
        total,
        page: currentPage,
        limit: take,
        pages: Math.ceil(total / take),
      },
    };

    if (cacheKey) {
      try {
        await redisCacheService.set(cacheKey, responseData, 60); // 60s TTL
      } catch (cacheSetErr) {
        // non-blocking redis cache set error
      }
    }

    res.set('Cache-Control', 'public, no-cache, must-revalidate');
    res.json(responseData);
  } catch (error) {
    console.error('❌ [PUBLIC-PRODUCTS] GET / error:', error);
    // التفاصيل التقنية (رسائل Prisma وشكل الـ query) للسيرفر فقط — مش للعميل العام
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب المنتجات',
    });
  }
});

router.get('/categories', async (req, res) => {
  try {
    const cacheKey = `public_categories:${req.companyId}`;
    try {
      const cached = await redisCacheService.get(cacheKey);
      if (cached) {
        res.set('Cache-Control', 'public, max-age=120, s-maxage=300, stale-while-revalidate=600');
        return res.json(cached);
      }
    } catch (e) {}

    const prisma = await getPrisma();
    const categories = await prisma.category.findMany({
      where: {
        companyId: req.companyId,
        isActive: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    const responseData = {
      success: true,
      data: categories,
    };

    try {
      await redisCacheService.set(cacheKey, responseData, 300);
    } catch (e) {}

    res.set('Cache-Control', 'public, max-age=120, s-maxage=300, stale-while-revalidate=600');
    res.json(responseData);
  } catch (error) {
    console.error('❌ [PUBLIC-PRODUCTS] GET /categories error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/:id/related', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 4, 1), 12);
    const related = await getRecommendedProducts({
      companyId: req.companyId,
      productId: req.params.id,
      limit,
      strategy: 'related',
    });

    res.json({
      success: true,
      data: related.map((product) =>
        formatProductResponse(product, { summary: true }),
      ),
    });
  } catch (error) {
    console.error('❌ [PUBLIC-PRODUCTS] GET /:id/related error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/:id/frequently-bought-together', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 3, 1), 8);
    const recommendations = await getRecommendedProducts({
      companyId: req.companyId,
      productId: req.params.id,
      limit,
      strategy: 'boughtTogether',
    });

    res.json({
      success: true,
      data: recommendations.map((product) =>
        formatProductResponse(product, { summary: true }),
      ),
    });
  } catch (error) {
    console.error('❌ [PUBLIC-PRODUCTS] GET /:id/frequently-bought-together error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/:id/upsell', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 4, 1), 8);
    const recommendations = await getRecommendedProducts({
      companyId: req.companyId,
      productId: req.params.id,
      limit,
      strategy: 'upsell',
    });

    res.json({
      success: true,
      data: recommendations.map((product) =>
        formatProductResponse(product, { summary: true }),
      ),
    });
  } catch (error) {
    console.error('❌ [PUBLIC-PRODUCTS] GET /:id/upsell error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/:id/volume-discounts', async (req, res) => {
  try {
    const { id } = req.params;
    const orConditions = buildProductLookupOrConditions(id);

    const prisma = await getPrisma();
    const product = await prisma.product.findFirst({
      where: withPublicActiveProductFilter({
        OR: orConditions,
        companyId: req.companyId,
        isActive: true,
      }),
      select: {
        id: true,
        price: true,
        metadata: true,
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود',
      });
    }

    const discounts = getVolumeDiscountsFromMetadata(product.metadata, {
      activeOnly: true,
      basePrice: parseFloat(product.price) || 0,
    });
    const quantity = Math.max(parseInt(req.query.quantity, 10) || 1, 1);
    const pricing = applyVolumeDiscount({
      unitPrice: Number(product.price) || 0,
      quantity,
      discounts,
    });

    return res.json({
      success: true,
      data: discounts,
      summary: {
        quantity,
        baseUnitPrice: pricing.baseUnitPrice,
        effectiveUnitPrice: pricing.effectiveUnitPrice,
        lineSubtotal: pricing.lineSubtotal,
        totalDiscount: pricing.totalDiscount,
        appliedDiscount: pricing.appliedDiscount,
      },
    });
  } catch (error) {
    console.error('❌ [PUBLIC-PRODUCTS] GET /:id/volume-discounts error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/:id/:presentationSlug', async (req, res) => {
  try {
    const { id, presentationSlug } = req.params;
    const isPreview =
      req.query.preview === '1' || req.query.productPreview === '1';
    const orConditions = buildProductLookupOrConditions(id);

    const prisma = await getPrisma();
    const product = await prisma.product.findFirst({
      where: withPublicActiveProductFilter({
        OR: orConditions,
        companyId: req.companyId,
        ...(isPreview ? {} : { isActive: true }),
      }),
      select: {
        ...PUBLIC_PRODUCT_SELECT,
        productPresentations: {
          where: {
            slug: presentationSlug,
            ...(isPreview ? {} : { isActive: true }),
          },
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
            mainImage: true,
            title: true,
            description: true,
            metadata: true,
          },
        },
      },
    });

    if (!product) {
      const converted = await loadConvertedProductPayload(
        prisma,
        req.companyId,
        presentationSlug,
        req,
      );
      if (converted) {
        converted.data.redirectedFrom = presentationSlug;
        return res.json(converted);
      }
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود',
      });
    }

    const presentation = product.productPresentations?.[0];
    if (!presentation) {
      // الرابط القديم لمنتج تم تحويله إلى عرض تقديمي — نرجّع بيانات المنتج
      // الأصلي كـ JSON والـ frontend يعمل redirect بنفسه.
      const converted = await loadConvertedProductPayload(
        prisma,
        req.companyId,
        presentationSlug,
        req,
      );
      if (converted) {
        converted.data.redirectedFrom = presentationSlug;
        return res.json(converted);
      }
      return res.status(404).json({
        success: false,
        error: 'العرض التقديمي غير موجود',
      });
    }

    const demandSignals = await getProductDemandSignals(prisma, {
      companyId: req.companyId,
      productId: product.id,
    });
    const affiliatePricing = await resolveAffiliateProductPricing(prisma, req, product.id);

    const presImages = presentation.images ? JSON.parse(presentation.images) : [];
    const formattedProduct = formatProductResponse({
      ...product,
      ...demandSignals,
      images: presImages.length > 0 ? JSON.stringify(presImages) : product.images,
      mainImage: presentation.mainImage || product.mainImage,
      name: presentation.title || product.name,
      description: presentation.description || product.description,
    });

    const result = applyAffiliatePricing(formattedProduct, affiliatePricing);
    result.presentation = {
      id: presentation.id,
      name: presentation.name,
      slug: presentation.slug,
    };
    result.canonicalSlug = product.slug;

    if (isPreview) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    } else {
      res.set('Cache-Control', 'public, no-cache, must-revalidate');
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('❌ [PUBLIC-PRODUCTS] GET /:id/:presentationSlug error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const isPreview =
      req.query.preview === '1' || req.query.productPreview === '1';
    const orConditions = buildProductLookupOrConditions(id);

    const prisma = await getPrisma();
    const product = await prisma.product.findFirst({
      where: withPublicActiveProductFilter({
        OR: orConditions,
        companyId: req.companyId,
        ...(isPreview ? {} : { isActive: true }),
      }),
      select: PUBLIC_PRODUCT_SELECT,
    });

    if (!product) {
      // منتج محذوف/محوّل (تحويل منتج مكرر إلى عرض تقديمي) — نرجّع بيانات
      // المنتج الأصلي كـ JSON والـ frontend يعمل redirect بنفسه (الـ 301
      // بيتحول لصفحة HTML على الـ CDN وبيعطّل الـ SPA fetch).
      const converted = await loadConvertedProductPayload(
        prisma,
        req.companyId,
        id,
        req,
      );
      if (converted) {
        converted.data.redirectedFrom = id;
        return res.json(converted);
      }
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود',
      });
    }

    const demandSignals = await getProductDemandSignals(prisma, {
      companyId: req.companyId,
      productId: product.id,
    });
    const affiliatePricing = await resolveAffiliateProductPricing(prisma, req, product.id);
    const amazonLink = await prisma.amazonAffiliateProduct.findFirst({
      where: { productId: product.id },
    });
    let amazonBuyUrl = null;
    if (amazonLink) {
      const amazonSettings = await prisma.amazonAffiliateSettings.findUnique({
        where: { companyId: req.companyId },
      });
      amazonBuyUrl = buildAffiliateUrl({
        asin: amazonLink.asin,
        associateTag: amazonSettings?.associateTag,
        marketplace: amazonLink.marketplace,
      });
    }
    const formattedProduct = formatProductResponse({
      ...product,
      ...demandSignals,
      amazonBuyUrl,
    });

    if (isPreview) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    } else {
      res.set('Cache-Control', 'public, no-cache, must-revalidate');
    }
    res.json({
      success: true,
      data: applyAffiliatePricing(formattedProduct, affiliatePricing),
    });
  } catch (error) {
    console.error('❌ [PUBLIC-PRODUCTS] GET /:id error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
