const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DEFAULT_FORMAT = 'webp';
const DEFAULT_QUALITY = 78;
const DEFAULT_WIDTH = 1200;
const MIN_WIDTH = 64;
const MAX_WIDTH = 2400;
const MIN_QUALITY = 40;
const MAX_QUALITY = 90;

const OPTIMIZABLE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.avif',
]);

const SUPPORTED_FORMATS = new Set(['webp', 'avif']);

const clampInteger = (value, min, max) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.min(Math.max(parsed, min), max);
};

const isOptimizableUploadImage = (sourceFilePath) => {
  if (typeof sourceFilePath !== 'string' || !sourceFilePath.trim()) {
    return false;
  }

  const extension = path.extname(sourceFilePath).toLowerCase();
  return OPTIMIZABLE_EXTENSIONS.has(extension);
};

const parseUploadOptimizationQuery = (query = {}, acceptHeader = '', sourceFilePath = '') => {
  const hasTransformHint = ['w', 'width', 'q', 'quality', 'format', 'fm'].some((key) => {
    const value = query?.[key];
    return value !== undefined && value !== null && value !== '';
  });

  const ext = sourceFilePath ? path.extname(sourceFilePath).toLowerCase() : '';
  const canAutoWebp =
    (ext === '.jpg' || ext === '.jpeg' || ext === '.png') &&
    typeof acceptHeader === 'string' &&
    acceptHeader.includes('image/webp');

  if (!hasTransformHint && !canAutoWebp) {
    return null;
  }

  const requestedFormat = String(
    query.format || query.fm || (canAutoWebp ? 'webp' : DEFAULT_FORMAT)
  ).trim().toLowerCase();
  const width = clampInteger(query.w ?? query.width, MIN_WIDTH, MAX_WIDTH) ?? DEFAULT_WIDTH;
  const quality = clampInteger(query.q ?? query.quality, MIN_QUALITY, MAX_QUALITY) ?? DEFAULT_QUALITY;

  return {
    width,
    quality,
    format: SUPPORTED_FORMATS.has(requestedFormat) ? requestedFormat : DEFAULT_FORMAT,
  };
};

const buildOptimizedVariantPath = (sourceFilePath, options) => {
  const sourceDir = path.dirname(sourceFilePath);
  const sourceExtension = path.extname(sourceFilePath);
  const sourceBaseName = path.basename(sourceFilePath, sourceExtension);
  const sourceExtensionToken = sourceExtension.replace(/^\./, '').toLowerCase() || 'file';
  const variantDir = path.join(sourceDir, '.variants');
  const variantFilename =
    `${sourceBaseName}__src-${sourceExtensionToken}_w${options.width}_q${options.quality}.${options.format}`;

  return path.join(variantDir, variantFilename);
};

const isVariantFresh = (sourceFilePath, variantFilePath) => {
  try {
    const sourceStats = fs.statSync(sourceFilePath);
    const variantStats = fs.statSync(variantFilePath);
    return variantStats.mtimeMs >= sourceStats.mtimeMs;
  } catch {
    return false;
  }
};

const writeOptimizedVariant = async (sourceFilePath, variantFilePath, options) => {
  fs.mkdirSync(path.dirname(variantFilePath), { recursive: true });

  const tempFilePath = `${variantFilePath}.tmp-${process.pid}-${Date.now()}`;

    try {
    const pipeline = sharp(sourceFilePath, { sequentialRead: true })
      .rotate()
      .resize(options.width, null, {
        fit: 'inside',
        withoutEnlargement: true,
      });

    switch (options.format) {
      case 'avif':
        pipeline.avif({
          quality: Math.min(options.quality, 62),
          effort: 4,
          chromaSubsampling: '4:2:0',
        });
        break;
      case 'webp':
      default:
        pipeline.webp({
          quality: options.quality,
          effort: 4,
          smartSubsample: true,
        });
        break;
    }

    await pipeline.toFile(tempFilePath);
    pipeline.destroy();

    try {
      fs.renameSync(tempFilePath, variantFilePath);
    } catch (error) {
      if (!fs.existsSync(variantFilePath)) {
        throw error;
      }
    }
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
};

const resolveOptimizedUploadVariant = async ({
  sourceFilePath,
  query,
  acceptHeader,
}) => {
  const options = parseUploadOptimizationQuery(query, acceptHeader, sourceFilePath);
  if (!options || !isOptimizableUploadImage(sourceFilePath)) {
    return null;
  }

  const variantFilePath = buildOptimizedVariantPath(sourceFilePath, options);

  if (!isVariantFresh(sourceFilePath, variantFilePath)) {
    await writeOptimizedVariant(sourceFilePath, variantFilePath, options);
  }

  const contentType =
    options.format === 'avif' ? 'image/avif' : 'image/webp';

  return {
    filePath: variantFilePath,
    cacheControl: 'public, max-age=31536000, immutable',
    contentType,
  };
};

const COMMON_PREGEN_VARIANTS = [
  { width: 160, quality: 75, format: 'webp' }, // Thumbnail for table rows, cart items, mini cards
  { width: 320, quality: 75, format: 'webp' }, // Small mobile cards
  { width: 420, quality: 75, format: 'webp' }, // Catalog preload target
  { width: 560, quality: 76, format: 'webp' }, // Default Storefront product image
  { width: 720, quality: 78, format: 'webp' }, // Mobile hero / large card
  { width: 960, quality: 80, format: 'webp' }, // Desktop PDP hero / zoom
];

const pregenerateCommonUploadVariants = async (sourceFilePath) => {
  if (!isOptimizableUploadImage(sourceFilePath) || !fs.existsSync(sourceFilePath)) {
    return [];
  }

  const generated = [];
  for (const variant of COMMON_PREGEN_VARIANTS) {
    try {
      const variantFilePath = buildOptimizedVariantPath(sourceFilePath, variant);
      if (!isVariantFresh(sourceFilePath, variantFilePath)) {
        await writeOptimizedVariant(sourceFilePath, variantFilePath, variant);
      }
      generated.push(variantFilePath);
    } catch (error) {
      console.warn(
        `[IMAGE_OPTIMIZER] Failed to pregenerate ${variant.width}w for ${path.basename(sourceFilePath)}:`,
        error.message,
      );
    }
  }

  return generated;
};

module.exports = {
  COMMON_PREGEN_VARIANTS,
  DEFAULT_FORMAT,
  DEFAULT_QUALITY,
  DEFAULT_WIDTH,
  buildOptimizedVariantPath,
  isOptimizableUploadImage,
  parseUploadOptimizationQuery,
  pregenerateCommonUploadVariants,
  resolveOptimizedUploadVariant,
};
