/**
 * Store URL Utilities
 * Helper functions for building store URLs with subdomain support
 */

const LOCAL_BASE_DOMAIN_FALLBACK = "lvh.me:3000";

const isIpAddress = (hostname: string): boolean =>
  /^\d+\.\d+\.\d+\.\d+$/.test(hostname);

const isLocalLikeHost = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "0.0.0.0" ||
    normalized === "lvh.me" ||
    isIpAddress(normalized) ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".lvh.me") ||
    normalized.endsWith(".test")
  );
};

export const isLocalLikeDomain = (domainWithOptionalPort: string): boolean => {
  const hostOnly = (domainWithOptionalPort.split(":")[0] || "").toLowerCase();
  return isLocalLikeHost(hostOnly);
};

const getConfiguredLocalBaseDomain = (): string => {
  const configured = (import.meta.env.VITE_LOCAL_BASE_DOMAIN || "").trim();
  return configured || LOCAL_BASE_DOMAIN_FALLBACK;
};

/**
 * Get the base domain
 */
export const getBaseDomain = (): string => {
  if (typeof window === "undefined" || !window.location?.hostname) {
    return "maxp.online";
  }
  const hostname = window.location.hostname;
  const normalizedHostname = hostname.toLowerCase();

  // In local/dev, use configurable wildcard domain (default: lvh.me:3000)
  if (isLocalLikeHost(normalizedHostname)) {
    return getConfiguredLocalBaseDomain();
  }

  // In production-like hosts, derive base domain from current hostname
  const parts = normalizedHostname.split(".");
  if (parts.length >= 2) {
    return parts.slice(-2).join(".");
  }

  return normalizedHostname;
};

/**
 * Get current subdomain from URL
 */
export const getCurrentSubdomain = (): string | null => {
  const hostname = window.location.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    isIpAddress(hostname)
  ) {
    return null;
  }

  const parts = hostname.split(".");

  // Check if we have a subdomain (and not www)
  if (parts.length >= 3 && parts[0] !== "www") {
    return parts[0] || null;
  }

  return null;
};

/**
 * Check if we're on a subdomain
 */
export const isSubdomain = (): boolean => {
  return getCurrentSubdomain() !== null;
};

const normalizeStorePath = (path: string): string =>
  path.startsWith("/") ? path : `/${path}`;

/**
 * Build store URL with subdomain or custom domain
 * @param identifier - Store slug or company ID
 * @param path - Path (e.g., '/shop', '/product/123')
 * @param customDomain - Optional custom domain from company settings
 * @returns Full URL with subdomain or custom domain
 */
export const buildStoreUrl = (
  identifier: string,
  path: string = "/",
  customDomain?: string,
  companyId?: string | null,
): string => {
  const safeIdentifier = (identifier || "").trim().toLowerCase();
  const safeCompanyId = (companyId || "").trim();
  const baseDomain = getBaseDomain();
  const hasWin = typeof window !== "undefined";
  const protocol = isLocalLikeDomain(baseDomain)
    ? "http:"
    : hasWin && window.location?.protocol
      ? window.location.protocol
      : "https:";

  // حفظ companyId في localStorage عندما يكون متاحًا، وإلا استخدم identifier كحل أخير.
  if (hasWin && window.localStorage) {
    if (safeCompanyId) {
      localStorage.setItem("storefront_companyId", safeCompanyId);
    } else if (safeIdentifier) {
      localStorage.setItem("storefront_companyId", safeIdentifier);
    }
  }

  const cleanPath = normalizeStorePath(path);

  // إذا كان هناك custom domain، استخدمه
  if (customDomain && customDomain.trim().length > 0) {
    return `https://${customDomain}${cleanPath}`;
  }

  if (!safeIdentifier) {
    const origin = hasWin && window.location?.origin ? window.location.origin : "https://maxp.online";
    return `${origin}${cleanPath}`;
  }

  return `${protocol}//${safeIdentifier}.${baseDomain}${cleanPath}`;
};

/**
 * Build shop link (for navigation)
 * @param companyId - Company ID or slug (optional, will be saved to localStorage)
 * @returns URL for shop page
 */
export const buildShopLink = (companyId?: string): string => {
  // حفظ companyId في localStorage إذا كان موجوداً
  if (companyId) {
    localStorage.setItem("storefront_companyId", companyId);
  }

  // دائماً استخدم path بسيط بدون companyId في URL
  return "/shop";
};

/**
 * Build product link
 * @param productId - Product ID
 * @param companyId - Company ID (optional, will be saved to localStorage)
 * @returns URL for product details page
 */
export const buildProductLink = (
  productId: string,
  companyId?: string,
): string => {
  // حفظ companyId في localStorage إذا كان موجوداً
  if (companyId) {
    localStorage.setItem("storefront_companyId", companyId);
  }

  // دائماً استخدم path بسيط بدون companyId في URL
  return `/product/${productId}`;
};

/**
 * Build cart link
 * @param companyId - Company ID (optional, will be saved to localStorage)
 * @returns URL for cart page
 */
export const buildCartLink = (companyId?: string): string => {
  // حفظ companyId في localStorage إذا كان موجوداً
  if (companyId) {
    localStorage.setItem("storefront_companyId", companyId);
  }

  // دائماً استخدم path بسيط بدون companyId في URL
  return "/cart";
};

/**
 * Build checkout link
 * @param companyId - Company ID (optional, will be saved to localStorage)
 * @returns URL for checkout page
 */
export const buildCheckoutLink = (companyId?: string): string => {
  // حفظ companyId في localStorage إذا كان موجوداً
  if (companyId) {
    localStorage.setItem("storefront_companyId", companyId);
  }

  // دائماً استخدم path بسيط بدون companyId في URL
  return "/checkout";
};

/**
 * Get company identifier from URL
 * Checks subdomain first, then query parameter
 */
export const getCompanyIdentifier = (): string | null => {
  // Try subdomain first
  const subdomain = getCurrentSubdomain();
  if (subdomain) {
    return subdomain;
  }

  // Fallback to query parameter
  const params = new URLSearchParams(window.location.search);
  return params.get("companyId");
};

/**
 * Navigate to store (external navigation with full URL)
 * @param slug - Store slug
 * @param path - Optional path (default: '/shop')
 */
export const navigateToStore = (slug: string, path: string = "/shop"): void => {
  const url = buildStoreUrl(slug, path);

  // إذا كان URL كامل (يحتوي على protocol)، استخدم window.location
  if (url.startsWith("http")) {
    window.location.href = url;
  } else {
    // إذا كان path نسبي، استخدم navigation عادي
    window.location.href = url;
  }
};

/**
 * Get store URL for sharing
 * @param slug - Store slug or company ID
 * @param customDomain - Optional custom domain from company settings
 * @returns Full store URL
 */
export const getShareableStoreUrl = (
  slug: string,
  customDomain?: string,
): string => {
  const baseDomain = getBaseDomain();

  // إذا كان هناك custom domain، استخدمه
  if (customDomain && customDomain.trim().length > 0) {
    return `https://${customDomain}/shop`;
  }

  const protocol = isLocalLikeDomain(baseDomain) ? "http" : "https";
  return `${protocol}://${slug}.${baseDomain}/shop`;
};
