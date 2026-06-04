const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { safeJsonParse } = require('./jsonUtils');
const { parseProductMetadata } = require('./productMetadataUtils');

const LOCAL_UPLOAD_CACHE_TTL_MS = 5 * 60 * 1000;
const localUploadAvailabilityCache = new Map();

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

function extractAssetValue(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  return value.fullUrl || value.url || value.src || value.image || null;
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

function stripAssetQuery(assetPath) {
  if (typeof assetPath !== 'string') {
    return '';
  }

  return assetPath.split('?')[0].split('#')[0];
}

function stripDuplicateCopySuffix(baseName) {
  if (typeof baseName !== 'string' || !baseName) {
    return '';
  }

  return baseName.replace(
    /(?:-copy-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})+$/i,
    '',
  );
}

function resolveExistingLocalUploadPath(assetPath) {
  if (!isLocalUploadAssetPath(assetPath)) {
    return null;
  }

  const normalizedAssetPath = stripAssetQuery(assetPath);
  return resolveUploadAssetCandidates(normalizedAssetPath).find((candidatePath) =>
    fs.existsSync(candidatePath),
  ) || null;
}

function isAvailableStoredAsset(assetPath) {
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

function normalizeStoredAssetUrl(value) {
  const rawValue = extractAssetValue(value);
  if (typeof rawValue !== 'string') {
    return null;
  }

  const trimmed = rawValue.trim();
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

      // Preserve external WordPress media URLs so the frontend can proxy them
      // against the original WooCommerce/WordPress host instead of our backend.
      if (normalizedPath.startsWith('/wp-content/uploads/')) {
        return parsed.toString();
      }

      if (normalizedPath.startsWith('/uploads/')) {
        return `${normalizedPath}${parsed.search || ''}`;
      }

      return parsed.toString();
    } catch {
      return trimmed;
    }
  }

  return trimmed;
}

function sanitizeStoredAssetUrl(value) {
  const normalizedValue = normalizeStoredAssetUrl(value);
  if (!normalizedValue) {
    return null;
  }

  return isAvailableStoredAsset(normalizedValue) ? normalizedValue : null;
}

function normalizeImageCollection(value, options = {}) {
  const { dropUnavailableLocalUploads = false } = options;

  if (value === undefined || value === null || value === '') {
    return [];
  }

  let items = [];

  if (Array.isArray(value)) {
    items = value;
  } else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    const parsed = safeJsonParse(trimmed, undefined);
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (parsed && typeof parsed === 'object') {
      items = [parsed];
    } else {
      items = [trimmed];
    }
  } else if (typeof value === 'object') {
    items = [value];
  }

  const normalizedImages = [];
  const seen = new Set();

  items.forEach((item) => {
    const normalizedValue = normalizeStoredAssetUrl(item);
    if (!normalizedValue) {
      return;
    }

    if (dropUnavailableLocalUploads && !isAvailableStoredAsset(normalizedValue)) {
      return;
    }

    if (seen.has(normalizedValue)) {
      return;
    }

    seen.add(normalizedValue);
    normalizedImages.push(normalizedValue);
  });

  return normalizedImages;
}

function sanitizeImageCollection(value) {
  return normalizeImageCollection(value, { dropUnavailableLocalUploads: true });
}

function cloneStoredAssetUrl(value, options = {}) {
  const normalizedValue = normalizeStoredAssetUrl(value);
  if (!normalizedValue) {
    return null;
  }

  if (!isLocalUploadAssetPath(normalizedValue)) {
    return normalizedValue;
  }

  const cacheKey = stripAssetQuery(normalizedValue);
  const cloneCache = options.cloneCache;
  if (cloneCache instanceof Map && cloneCache.has(cacheKey)) {
    return cloneCache.get(cacheKey);
  }

  const sourcePath = resolveExistingLocalUploadPath(normalizedValue);
  if (!sourcePath) {
    return null;
  }

  const relativeUploadPath = cacheKey.replace(/^\/+/, '');
  const relativeUploadDir = path.posix.dirname(relativeUploadPath);
  const extension = path.extname(sourcePath);
  const baseName = path.basename(sourcePath, extension);
  const normalizedBaseName = stripDuplicateCopySuffix(baseName) || baseName;
  const clonedFilename = `${normalizedBaseName}-copy-${randomUUID()}${extension}`;
  const clonedRelativePath = path.posix.join(relativeUploadDir, clonedFilename);
  const clonedAbsolutePath = path.join(__dirname, '..', clonedRelativePath);

  fs.mkdirSync(path.dirname(clonedAbsolutePath), { recursive: true });
  fs.copyFileSync(sourcePath, clonedAbsolutePath);

  const clonedAssetUrl = `/${clonedRelativePath}`;
  if (cloneCache instanceof Map) {
    cloneCache.set(cacheKey, clonedAssetUrl);
  }

  return clonedAssetUrl;
}

function cloneImageCollection(value, options = {}) {
  return sanitizeImageCollection(value)
    .map((item) => cloneStoredAssetUrl(item, options))
    .filter(Boolean);
}

function cloneMetadataMedia(value, options = {}) {
  if (value === undefined || value === null || value === '') {
    return value;
  }

  const parsedValue = typeof value === 'string' ? safeJsonParse(value, value) : value;

  if (typeof parsedValue === 'string') {
    return cloneStoredAssetUrl(parsedValue, options) || parsedValue;
  }

  if (Array.isArray(parsedValue)) {
    return parsedValue.map((item) => cloneMetadataMedia(item, options));
  }

  if (!parsedValue || typeof parsedValue !== 'object') {
    return parsedValue;
  }

  return Object.entries(parsedValue).reduce((acc, [key, nestedValue]) => {
    acc[key] = cloneMetadataMedia(nestedValue, options);
    return acc;
  }, {});
}

function mergeUniqueImages(...collections) {
  const merged = [];
  const seen = new Set();

  collections.flat().forEach((item) => {
    if (!item || seen.has(item)) {
      return;
    }

    seen.add(item);
    merged.push(item);
  });

  return merged;
}

function resolveProductMediaState({
  currentImages,
  currentMainImage,
  nextImages,
  nextMainImage,
}) {
  const imagesProvided = nextImages !== undefined;
  const mainImageProvided = nextMainImage !== undefined;

  const baseImages = imagesProvided
    ? sanitizeImageCollection(nextImages)
    : sanitizeImageCollection(currentImages);

  let resolvedMainImage = null;

  if (mainImageProvided) {
    resolvedMainImage = sanitizeStoredAssetUrl(nextMainImage);
  } else if (imagesProvided) {
    const existingMainImage = sanitizeStoredAssetUrl(currentMainImage);
    resolvedMainImage = existingMainImage && baseImages.includes(existingMainImage)
      ? existingMainImage
      : null;
  } else {
    resolvedMainImage = sanitizeStoredAssetUrl(currentMainImage);
  }

  const images = mergeUniqueImages(
    resolvedMainImage ? [resolvedMainImage] : [],
    baseImages,
  );

  if (!resolvedMainImage) {
    resolvedMainImage = images[0] || null;
  }

  return {
    images,
    mainImage: resolvedMainImage,
  };
}

function sanitizeMetadataMedia(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  const parsedValue = parseProductMetadata(value);
  if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
    return value;
  }

  const sanitizedMetadata = { ...parsedValue };
  const variantSettings = sanitizedMetadata.variantSettings;

  if (!variantSettings || typeof variantSettings !== 'object' || Array.isArray(variantSettings)) {
    return sanitizedMetadata;
  }

  const attributeImages = variantSettings.attributeImages;
  if (!attributeImages || typeof attributeImages !== 'object' || Array.isArray(attributeImages)) {
    return sanitizedMetadata;
  }

  const sanitizeAttributeImagesMap = (input) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return {};
    }

    return Object.entries(input).reduce((acc, [key, imageValue]) => {
      const sanitizedValue = sanitizeStoredAssetUrl(imageValue);
      if (sanitizedValue) {
        acc[key] = sanitizedValue;
        return acc;
      }

      if (imageValue && typeof imageValue === 'object' && !Array.isArray(imageValue)) {
        const nestedImages = sanitizeAttributeImagesMap(imageValue);
        if (Object.keys(nestedImages).length > 0) {
          acc[key] = nestedImages;
        }
      }

      return acc;
    }, {});
  };

  const sanitizedAttributeImages = sanitizeAttributeImagesMap(attributeImages);

  sanitizedMetadata.variantSettings = { ...variantSettings };

  if (Object.keys(sanitizedAttributeImages).length > 0) {
    sanitizedMetadata.variantSettings.attributeImages = sanitizedAttributeImages;
  } else {
    delete sanitizedMetadata.variantSettings.attributeImages;
  }

  return sanitizedMetadata;
}

function serializeJsonField(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
}

module.exports = {
  isAvailableStoredAsset,
  isLocalUploadAssetPath,
  cloneStoredAssetUrl,
  cloneImageCollection,
  cloneMetadataMedia,
  mergeUniqueImages,
  normalizeImageCollection,
  normalizeStoredAssetUrl,
  resolveProductMediaState,
  sanitizeImageCollection,
  sanitizeMetadataMedia,
  sanitizeStoredAssetUrl,
  serializeJsonField,
};
