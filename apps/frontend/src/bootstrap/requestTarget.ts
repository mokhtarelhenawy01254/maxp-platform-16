const PUBLIC_SUBDOMAIN_BYPASS_PREFIXES = [
  "/affiliate-register",
  "/dental-portal",
  "/portal",
  "/academy",
];

const PUBLIC_SUBDOMAIN_BYPASS_PATHS = new Set([
  "/register/affiliate",
  "/register/merchant",
]);

const normalizeHostname = (hostname: string): string =>
  String(hostname || "").trim().toLowerCase();

const normalizePathname = (pathname: string): string => {
  const normalized = String(pathname || "").trim();
  if (!normalized) {
    return "/";
  }

  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

const isPublicSubdomainBypassPath = (pathname: string): boolean =>
  PUBLIC_SUBDOMAIN_BYPASS_PATHS.has(pathname) ||
  PUBLIC_SUBDOMAIN_BYPASS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

const ADMIN_PRODUCT_PATH_PATTERN = /\/products\/(?:new|trash|reviews|import-|settings\/upsell)/;
const ADMIN_PRODUCT_EDIT_PATTERN = /\/products\/[^/]+\/edit$/;

export const shouldBootstrapStorefront = (
  hostnameInput: string,
  pathnameInput: string,
  searchInput: string = "",
): boolean => {
  const hostname = normalizeHostname(hostnameInput);
  const pathname = normalizePathname(pathnameInput);
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  const hasStorefrontPreviewParam =
    searchInput.includes("previewTheme=") ||
    searchInput.includes("storefrontSubdomain=");

  // Storefront detection on pure localhost is driven solely by subdomain
  // (tenant.localhost) or explicit preview query params (?previewTheme=...).
  // Admin routes such as /products/…, /settings/store/… or /cart MUST NOT
  // bootstrap the storefront rendering engine on localhost without preview query.
  if (isLocalhost && !hasStorefrontPreviewParam) {
    return false;
  }

  // Exclude admin product paths — these are NOT storefront routes
  if (
    ADMIN_PRODUCT_PATH_PATTERN.test(pathname) ||
    ADMIN_PRODUCT_EDIT_PATTERN.test(pathname)
  ) {
    return false;
  }

  // بوابة العميل وبوابة الطالب تُعرض من تطبيق المنصة حتى على subdomain المتجر
  if (
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/auth/customer-register" ||
    pathname.startsWith("/auth/customer-register/") ||
    pathname === "/portal" ||
    pathname.startsWith("/portal/") ||
    pathname === "/academy" ||
    pathname.startsWith("/academy/")
  ) {
    return false;
  }

  if (
    pathname === "/store" ||
    pathname.startsWith("/store/") ||
    pathname.startsWith("/product/") ||
    pathname.startsWith("/products/") ||
    pathname.startsWith("/shop/") ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/order-offer") ||
    pathname.startsWith("/thank-you") ||
    pathname.startsWith("/collections/") ||
    pathname.startsWith("/pages/")
  ) {
    return true;
  }

  if (isPublicSubdomainBypassPath(pathname)) {
    return false;
  }

  if (hasStorefrontPreviewParam) {
    return true;
  }

  if (hostname.endsWith(".localhost")) {
    return true;
  }

  const parts = hostname.split(".");
  return parts.length >= 3 && parts[0] !== "www";
};
