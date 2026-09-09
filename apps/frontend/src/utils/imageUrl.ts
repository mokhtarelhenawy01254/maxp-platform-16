import { envConfig } from "../config/environment";

const IMAGE_OBJECT_KEYS = ["fullUrl", "url", "src", "image"] as const;
const DEFAULT_UPLOAD_IMAGE_FORMAT = "webp";
const DEFAULT_UPLOAD_IMAGE_QUALITY = 78;
const DEFAULT_UPLOAD_IMAGE_WIDTH = 1200;
const OPTIMIZABLE_UPLOAD_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".avif",
]);
const PROXYABLE_REMOTE_IMAGE_PATTERNS = [
  /^https:\/\/(?:[^/]+\.)?fbcdn\.net\//i,
  /^https:\/\/platform-lookaside\.fbsbx\.com\//i,
  /^https:\/\/files\.easy-orders\.net\//i,
  /^https:\/\/images\.unsplash\.com\//i,
  /^https:\/\/lh3\.googleusercontent\.com\/aida-public\//i,
  /^https:\/\/(?:www\.)?mokhtarelhenawy\.online\//i,
  /^https?:\/\/[^/]+\/wp-content\/uploads\//i,
  /^https:\/\/pps\.whatsapp\.net\//i,
] as const;

interface OptimizedUploadImageOptions {
  width?: number;
  quality?: number;
  format?: "webp";
}

interface ResponsiveUploadImageOptions extends OptimizedUploadImageOptions {
  widths?: number[];
  fallbackWidth?: number;
  sizes?: string;
}

interface ProxyImageOptions {
  messageId?: string | null;
  customerId?: string | null;
  width?: number;
  quality?: number;
  format?: "webp";
}

export interface ResponsiveUploadImage {
  src: string;
  srcSet?: string;
  sizes?: string;
}

const extractImageEntries = (value: unknown): string[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractImageEntries(item));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    const looksLikeJson =
      (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'));

    if (looksLikeJson) {
      try {
        return extractImageEntries(JSON.parse(trimmed));
      } catch {
        return [trimmed];
      }
    }

    return [trimmed];
  }

  if (typeof value === "object") {
    return IMAGE_OBJECT_KEYS.flatMap((key) =>
      extractImageEntries(
        (value as Record<(typeof IMAGE_OBJECT_KEYS)[number], unknown>)[key],
      ),
    );
  }

  return [];
};

const stripApiSuffix = (value: string): string =>
  value.replace(/\/api(?:\/v1)?\/?$/i, "");

const sanitizePositiveInteger = (
  value: number | undefined,
  fallback: number,
): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
};

const toImageUrlInstance = (
  imageUrl: string,
): { url: URL; isAbsolute: boolean } | null => {
  if (!imageUrl) return null;

  const isAbsolute = /^https?:\/\//i.test(imageUrl);
  const baseOrigin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://app.local";

  try {
    return {
      url: new URL(imageUrl, baseOrigin),
      isAbsolute,
    };
  } catch {
    return null;
  }
};

export const canOptimizeUploadImage = (imageUrl: string): boolean => {
  const parsed = toImageUrlInstance(imageUrl);
  if (!parsed) return false;

  const pathname = parsed.url.pathname.toLowerCase();
  const extensionIndex = pathname.lastIndexOf(".");
  const slashIndex = pathname.lastIndexOf("/");
  const extension =
    extensionIndex > slashIndex ? pathname.slice(extensionIndex) : "";

  return (
    pathname.startsWith("/uploads/") &&
    OPTIMIZABLE_UPLOAD_IMAGE_EXTENSIONS.has(extension)
  );
};

export const buildOptimizedUploadImageUrl = (
  imageUrl: string,
  options: OptimizedUploadImageOptions = {},
): string => {
  if (!imageUrl || !canOptimizeUploadImage(imageUrl)) {
    return imageUrl;
  }

  const parsed = toImageUrlInstance(imageUrl);
  if (!parsed) {
    return imageUrl;
  }

  const width = sanitizePositiveInteger(
    options.width,
    DEFAULT_UPLOAD_IMAGE_WIDTH,
  );
  const quality = sanitizePositiveInteger(
    options.quality,
    DEFAULT_UPLOAD_IMAGE_QUALITY,
  );
  const format = options.format || DEFAULT_UPLOAD_IMAGE_FORMAT;

  parsed.url.searchParams.set("format", format);
  parsed.url.searchParams.set("w", String(width));
  parsed.url.searchParams.set("q", String(quality));

  return parsed.isAbsolute
    ? parsed.url.toString()
    : `${parsed.url.pathname}${parsed.url.search}${parsed.url.hash}`;
};

export const buildResponsiveUploadImage = (
  imageUrl: string,
  options: ResponsiveUploadImageOptions = {},
): ResponsiveUploadImage => {
  if (!imageUrl || !canOptimizeUploadImage(imageUrl)) {
    return { src: imageUrl || "" };
  }

  const uniqueWidths = Array.from(
    new Set(
      (options.widths || [320, 480, 640, 800, 1200])
        .map((width) =>
          sanitizePositiveInteger(width, DEFAULT_UPLOAD_IMAGE_WIDTH),
        )
        .sort((left, right) => left - right),
    ),
  );
  const fallbackWidth = sanitizePositiveInteger(
    options.fallbackWidth,
    uniqueWidths[uniqueWidths.length - 1] || DEFAULT_UPLOAD_IMAGE_WIDTH,
  );
  const quality = sanitizePositiveInteger(
    options.quality,
    DEFAULT_UPLOAD_IMAGE_QUALITY,
  );
  const format = options.format || DEFAULT_UPLOAD_IMAGE_FORMAT;

  return {
    src: buildOptimizedUploadImageUrl(imageUrl, {
      width: fallbackWidth,
      quality,
      format,
    }),
    srcSet: uniqueWidths
      .map(
        (width) =>
          `${buildOptimizedUploadImageUrl(imageUrl, {
            width,
            quality,
            format,
          })} ${width}w`,
      )
      .join(", "),
    sizes: options.sizes,
  };
};

const getProxyImageBaseUrl = (): string => {
  if (
    envConfig.apiUrl.startsWith("http://") ||
    envConfig.apiUrl.startsWith("https://")
  ) {
    return `${stripApiSuffix(envConfig.apiUrl)}/api/proxy-image`;
  }

  return "/api/proxy-image";
};

export const shouldProxyRemoteImageUrl = (
  imageUrl: string | null | undefined,
): boolean => {
  if (typeof imageUrl !== "string" || !imageUrl.trim()) {
    return false;
  }

  return PROXYABLE_REMOTE_IMAGE_PATTERNS.some((pattern) =>
    pattern.test(imageUrl.trim()),
  );
};

export const buildProxyImageUrl = (
  imageUrl: string | null | undefined,
  options?: ProxyImageOptions,
): string => {
  const params = new URLSearchParams();

  if (imageUrl && imageUrl.trim()) {
    params.set("url", imageUrl.trim());
  }

  if (options?.messageId) {
    params.set("messageId", options.messageId);
  }

  if (options?.customerId) {
    params.set("customerId", options.customerId);
  }

  if (options?.width) {
    params.set("w", String(sanitizePositiveInteger(options.width, options.width)));
  }

  if (options?.quality) {
    params.set("q", String(sanitizePositiveInteger(options.quality, options.quality)));
  }

  if (options?.format) {
    params.set("format", options.format);
  }

  const query = params.toString();
  return query ? `${getProxyImageBaseUrl()}?${query}` : "";
};

/**
 * بناء URL كامل للصور من المسار النسبي
 * @param relativePath - المسار النسبي للصورة (مثل: /uploads/companies/logo.png)
 * @returns URL كامل للصورة
 */
export const getImageUrl = (
  relativePath: string | null | undefined,
): string | null => {
  // التحقق من أن المسار نص
  if (typeof relativePath !== "string") return null;
  const trimmedPath = relativePath.trim();
  if (!trimmedPath) return null;

  if (
    trimmedPath.startsWith("data:") ||
    trimmedPath.startsWith("blob:")
  ) {
    return trimmedPath;
  }

  // Public theme assets should stay on the storefront origin.
  if (
    trimmedPath.startsWith("/assets/") ||
    trimmedPath.startsWith("assets/")
  ) {
    return trimmedPath.startsWith("/") ? trimmedPath : `/${trimmedPath}`;
  }

  // إذا كان المسار كامل بالفعل (يبدأ بـ http أو https)
  if (
    trimmedPath.startsWith("http://") ||
    trimmedPath.startsWith("https://")
  ) {
    const hasWindow = typeof window !== "undefined";
    const currentHost = hasWindow ? window.location.host : "";
    const isInternalUrl =
      trimmedPath.startsWith(envConfig.backendUrl) ||
      (currentHost ? trimmedPath.includes(currentHost) : false);

    // الصور الخارجية عبر https: إذا كانت من CDNs معروفة (مثل fbcdn) نمررها عبر البروكسي
    // لتجنب أخطاء 403 من مانع الروابط المباشرة. باقي المواقع الخارجية تمر مباشرة.
    if (!isInternalUrl && trimmedPath.startsWith("https://")) {
      // التحقق من أن الرابط يحتاج بروكسي (fbcdn, fbsbx, إلخ)
      if (shouldProxyRemoteImageUrl(trimmedPath)) {
        return buildProxyImageUrl(trimmedPath);
      }
      return trimmedPath;
    }

    // ترقية http إلى https إن أمكن لتجنب Mixed Content
    if (
      trimmedPath.startsWith("http://") &&
      hasWindow &&
      window.location.protocol === "https:"
    ) {
      return trimmedPath.replace("http://", "https://");
    }

    if (!isInternalUrl) {
      return trimmedPath;
    }

    return trimmedPath;
  }

  // إزالة الـ slash الأولى إذا كانت موجودة لتجنب التكرار
  const cleanPath = trimmedPath.startsWith("/")
    ? trimmedPath.substring(1)
    : trimmedPath;

  // بناء URL كامل مع معلمة تحديث للـ uploads لتجاوز كاش Cloudflare القديم
  const fullUrl = `${envConfig.backendUrl}/${cleanPath}`;
  if (cleanPath.startsWith("uploads/") && !cleanPath.includes("?")) {
    return `${fullUrl}?v=2`;
  }

  return fullUrl;
};

export const getInboxMessageMediaUrl = (
  messageId: string | null | undefined,
  rawUrl: string | null | undefined,
): string => {
  const normalized = getImageUrl(rawUrl);

  if (normalized && shouldProxyRemoteImageUrl(normalized)) {
    return buildProxyImageUrl(normalized, { messageId });
  }

  if (!normalized && messageId) {
    return buildProxyImageUrl(null, { messageId });
  }

  if (normalized && normalized.includes("/uploads/") && !normalized.includes("?")) {
    return `${normalized}?v=2`;
  }

  return normalized || rawUrl || "";
};

export const getInboxCustomerAvatarUrl = (
  customerId: string | null | undefined,
  rawUrl: string | null | undefined,
): string => {
  const normalized = getImageUrl(rawUrl);

  if (customerId) {
    if (!normalized || shouldProxyRemoteImageUrl(normalized)) {
      return buildProxyImageUrl(normalized, { customerId });
    }
  }

  return normalized || "";
};

export const getInboxExternalImageUrl = (
  rawUrl: string | null | undefined,
  options?: {
    messageId?: string | null;
    customerId?: string | null;
  },
): string => {
  const normalized = getImageUrl(rawUrl);

  if (normalized && shouldProxyRemoteImageUrl(normalized)) {
    return buildProxyImageUrl(normalized, options);
  }

  if (!normalized && (options?.messageId || options?.customerId)) {
    return buildProxyImageUrl(rawUrl, options);
  }

  return normalized || rawUrl || "";
};

export const getImageCandidates = (...values: unknown[]): string[] => {
  const seen = new Set<string>();
  const candidates: string[] = [];

  values.forEach((value) => {
    extractImageEntries(value).forEach((entry) => {
      const normalized = getImageUrl(entry);
      if (!normalized || seen.has(normalized)) return;

      seen.add(normalized);
      candidates.push(normalized);
    });
  });

  return candidates;
};

export const getPrimaryImageUrl = (...values: unknown[]): string => {
  return getImageCandidates(...values)[0] || "";
};

/**
 * تطبيع مسار الصورة (تحويل fullUrl إلى مسار نسبي عند توفر /uploads)
 * @param value - URL أو مسار نسبي
 * @returns مسار نسبي أو URL كما هو
 */
export const normalizeImagePath = (
  value: string | null | undefined,
): string | null => {
  if (!value || typeof value !== "string") return null;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const parsed = new URL(value);
      if (parsed.pathname.includes("/uploads/")) {
        return parsed.pathname.startsWith("/")
          ? parsed.pathname
          : `/${parsed.pathname}`;
      }
    } catch {
      return value;
    }
    return value;
  }

  if (value.startsWith("uploads/")) return `/${value}`;
  return value;
};

/**
 * بناء URL للوجو الشركة
 * @param logoPath - مسار اللوجو
 * @returns URL كامل أو null
 */
export const getCompanyLogoUrl = (
  logoPath: string | null | undefined,
): string | null => {
  return getImageUrl(logoPath);
};

/**
 * بناء URL لصورة المنتج
 * @param imagePath - مسار الصورة
 * @returns URL كامل أو null
 */
export const getProductImageUrl = (
  imagePath: string | null | undefined,
): string | null => {
  return getImageUrl(imagePath);
};

/**
 * بناء URL لصورة المستخدم
 * @param avatarPath - مسار الصورة الشخصية
 * @returns URL كامل أو null
 */
export const getUserAvatarUrl = (
  avatarPath: string | null | undefined,
): string | null => {
  return getImageUrl(avatarPath);
};
