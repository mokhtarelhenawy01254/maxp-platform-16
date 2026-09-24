import type { Product } from '../hooks/useProducts';
import { buildProxyImageUrl, getImageUrl } from '../../utils/imageUrl';

type ImageValue =
  | string
  | null
  | undefined
  | {
      url?: string | null;
      fullUrl?: string | null;
      src?: string | null;
      image?: string | null;
    };

type ProductLike = Partial<Product> & {
  mainImage?: ImageValue;
  image?: ImageValue;
};

interface OptimizedStorefrontImageOptions {
  width?: number;
  quality?: number;
  format?: 'webp' | 'avif';
}

interface ResponsiveStorefrontImageOptions extends OptimizedStorefrontImageOptions {
  widths?: number[];
  fallbackWidth?: number;
  sizes?: string;
}

export interface ResponsiveStorefrontImage {
  src: string;
  srcSet?: string;
  sizes?: string;
}

const DEFAULT_IMAGE_QUALITY = 78;
const DEFAULT_IMAGE_FORMAT = 'webp';
const DEFAULT_RESPONSIVE_FALLBACK_WIDTH = 1200;
const DEFAULT_RESPONSIVE_WIDTHS = [320, 480, 640, 800, 1200];
const OPTIMIZABLE_STOREFRONT_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const IMAGE_OBJECT_KEYS = ['fullUrl', 'url', 'src', 'image'] as const;
const STOREFRONT_STATIC_ASSET_VERSION = '20260503-khemet-webp-placeholders';
const VERSIONED_STOREFRONT_STATIC_ASSET_PREFIXES = ['/placeholders/luxury-shoes/'];
const PROXYABLE_STOREFRONT_REMOTE_IMAGE_PATTERNS = [
  /^https:\/\/images\.unsplash\.com\//i,
  /^https:\/\/lh3\.googleusercontent\.com\/aida-public\//i,
] as const;

const sanitizePositiveInteger = (value: number | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
};

const toUrlInstance = (imageUrl: string): { url: URL; isAbsolute: boolean } | null => {
  if (!imageUrl) {
    return null;
  }

  const isAbsolute = /^https?:\/\//i.test(imageUrl);
  const baseOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://storefront.local';

  try {
    return {
      url: new URL(imageUrl, baseOrigin),
      isAbsolute,
    };
  } catch {
    return null;
  }
};

const getStorefrontImageExtension = (pathname: string): string => {
  const normalizedPathname = pathname.toLowerCase();
  const extensionIndex = normalizedPathname.lastIndexOf('.');
  const slashIndex = normalizedPathname.lastIndexOf('/');

  return extensionIndex > slashIndex ? normalizedPathname.slice(extensionIndex) : '';
};

const isLocalOptimizableStorefrontImage = (parsed: { url: URL }): boolean =>
  parsed.url.pathname.toLowerCase().startsWith('/uploads/') &&
  OPTIMIZABLE_STOREFRONT_EXTENSIONS.has(getStorefrontImageExtension(parsed.url.pathname));

const isProxyableStorefrontRemoteImage = (parsed: {
  url: URL;
  isAbsolute: boolean;
}): boolean =>
  parsed.isAbsolute &&
  ((parsed.url.pathname.toLowerCase().startsWith('/wp-content/uploads/') &&
    OPTIMIZABLE_STOREFRONT_EXTENSIONS.has(getStorefrontImageExtension(parsed.url.pathname))) ||
    PROXYABLE_STOREFRONT_REMOTE_IMAGE_PATTERNS.some((pattern) =>
      pattern.test(parsed.url.toString()),
    ));

export const canOptimizeStorefrontImage = (imageUrl: string): boolean => {
  const parsed = toUrlInstance(imageUrl);
  if (!parsed) {
    return false;
  }

  return isLocalOptimizableStorefrontImage(parsed) || isProxyableStorefrontRemoteImage(parsed);
};

export const buildOptimizedStorefrontImageUrl = (
  imageUrl: string,
  options: OptimizedStorefrontImageOptions = {},
): string => {
  if (!imageUrl || !canOptimizeStorefrontImage(imageUrl)) {
    return imageUrl;
  }

  const parsed = toUrlInstance(imageUrl);
  if (!parsed) {
    return imageUrl;
  }

  const width = sanitizePositiveInteger(options.width, DEFAULT_RESPONSIVE_FALLBACK_WIDTH);
  const quality = sanitizePositiveInteger(options.quality, DEFAULT_IMAGE_QUALITY);
  const format = options.format || DEFAULT_IMAGE_FORMAT;

  if (isProxyableStorefrontRemoteImage(parsed)) {
    return buildProxyImageUrl(parsed.url.toString(), {
      width,
      quality,
      format,
    });
  }

  if (isLocalOptimizableStorefrontImage(parsed)) {
    const rawTarget = parsed.isAbsolute
      ? parsed.url.toString()
      : `${parsed.url.pathname}${parsed.url.search}${parsed.url.hash}`;

    let cleanTarget = rawTarget;
    try {
      const u = new URL(rawTarget, 'https://storefront.local');
      u.searchParams.delete('w');
      u.searchParams.delete('q');
      u.searchParams.delete('format');
      cleanTarget = parsed.isAbsolute
        ? u.toString()
        : `${u.pathname}${u.search}${u.hash}`;
    } catch {
      // fallback to rawTarget
    }

    return buildProxyImageUrl(cleanTarget, {
      width,
      quality,
      format,
    });
  }

  parsed.url.searchParams.set('format', format);
  parsed.url.searchParams.set('w', String(width));
  parsed.url.searchParams.set('q', String(quality));

  return parsed.isAbsolute
    ? parsed.url.toString()
    : `${parsed.url.pathname}${parsed.url.search}${parsed.url.hash}`;
};

export const buildVersionedStorefrontStaticAssetUrl = (imageUrl: string): string => {
  const parsed = toUrlInstance(imageUrl);
  if (!parsed) {
    return imageUrl;
  }

  const shouldVersion = VERSIONED_STOREFRONT_STATIC_ASSET_PREFIXES.some((prefix) =>
    parsed.url.pathname.toLowerCase().startsWith(prefix),
  );
  if (!shouldVersion) {
    return imageUrl;
  }

  if (parsed.url.pathname.toLowerCase().endsWith('.png')) {
    parsed.url.pathname = parsed.url.pathname.replace(/\.png$/i, '.webp');
  }
  parsed.url.searchParams.set('v', STOREFRONT_STATIC_ASSET_VERSION);

  return parsed.isAbsolute
    ? parsed.url.toString()
    : `${parsed.url.pathname}${parsed.url.search}${parsed.url.hash}`;
};

export const buildResponsiveStorefrontImage = (
  imageUrl: string,
  options: ResponsiveStorefrontImageOptions = {},
): ResponsiveStorefrontImage => {
  if (!imageUrl || !canOptimizeStorefrontImage(imageUrl)) {
    return { src: imageUrl || '' };
  }

  const uniqueWidths = Array.from(
    new Set(
      (options.widths || DEFAULT_RESPONSIVE_WIDTHS)
        .map((width) => sanitizePositiveInteger(width, DEFAULT_RESPONSIVE_FALLBACK_WIDTH))
        .sort((left, right) => left - right),
    ),
  );

  const fallbackWidth = sanitizePositiveInteger(
    options.fallbackWidth,
    uniqueWidths[uniqueWidths.length - 1] || DEFAULT_RESPONSIVE_FALLBACK_WIDTH,
  );
  const quality = sanitizePositiveInteger(options.quality, DEFAULT_IMAGE_QUALITY);
  const format = options.format || DEFAULT_IMAGE_FORMAT;

  return {
    src: buildOptimizedStorefrontImageUrl(imageUrl, {
      width: fallbackWidth,
      quality,
      format,
    }),
    srcSet: uniqueWidths
      .map((width) =>
        `${buildOptimizedStorefrontImageUrl(imageUrl, { width, quality, format })} ${width}w`,
      )
      .join(', '),
    sizes: options.sizes,
  };
};

const looksLikeJsonImageValue = (value: string): boolean => {
  const trimmed = value.trim();
  return (
    (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  );
};

const extractStorefrontImageEntries = (value: unknown): string[] => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractStorefrontImageEntries(item));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    if (looksLikeJsonImageValue(trimmed)) {
      try {
        return extractStorefrontImageEntries(JSON.parse(trimmed));
      } catch {
        return [trimmed];
      }
    }

    return [trimmed];
  }

  if (typeof value === 'object') {
    return IMAGE_OBJECT_KEYS.flatMap((key) =>
      extractStorefrontImageEntries(
        (value as Record<(typeof IMAGE_OBJECT_KEYS)[number], unknown>)[key],
      ),
    );
  }

  return [];
};

const getWooCommerceOrigin = (entries: string[]): string | null => {
  for (const entry of entries) {
    if (!/^https?:\/\//i.test(entry)) {
      continue;
    }

    try {
      const parsed = new URL(entry);
      if (parsed.pathname.startsWith('/wp-content/')) {
        return parsed.origin;
      }
    } catch {
      // Ignore malformed image candidates and continue to the next source.
    }
  }

  return null;
};

const isWooCommerceRelativeImagePath = (value: string): boolean =>
  /^\/?wp-content\//i.test(value.trim());

const resolveWooCommerceRelativeImagePath = (
  value: string,
  origin: string | null,
): string | null => {
  if (!isWooCommerceRelativeImagePath(value)) {
    return value;
  }

  if (!origin) {
    return null;
  }

  const path = value.trim().startsWith('/') ? value.trim() : `/${value.trim()}`;
  return `${origin}${path}`;
};

export const normalizeStorefrontImageValue = (value: ImageValue): string => {
  const imgPath = extractStorefrontImageEntries(value)[0] || '';

  if (!imgPath) return '';

  return getImageUrl(imgPath) || '';
};

export const buildStorefrontImageCandidates = (...sources: unknown[]): string[] => {
  const seen = new Set<string>();
  const candidates: string[] = [];
  const entries = sources.flatMap((source) => extractStorefrontImageEntries(source));
  const wooCommerceOrigin = getWooCommerceOrigin(entries);

  const appendCandidate = (value: unknown) => {
    if (typeof value !== 'string') {
      return;
    }

    const resolvedValue = resolveWooCommerceRelativeImagePath(value, wooCommerceOrigin);
    if (!resolvedValue) {
      return;
    }

    const normalizedValue = normalizeStorefrontImageValue(resolvedValue as ImageValue);
    if (!normalizedValue || seen.has(normalizedValue)) {
      return;
    }

    seen.add(normalizedValue);
    candidates.push(normalizedValue);
  };

  entries.forEach(appendCandidate);
  return candidates;
};

export const getProductImageCandidates = (product?: ProductLike | null): string[] => {
  return buildStorefrontImageCandidates(product?.images, product?.mainImage, product?.image);
};

export const getPrimaryProductImage = (product?: ProductLike | null): string =>
  getProductImageCandidates(product)[0] || '';

export const getCartItemImageCandidates = (item?: { imageUrl?: ImageValue } | null): string[] =>
  buildStorefrontImageCandidates(item?.imageUrl);
