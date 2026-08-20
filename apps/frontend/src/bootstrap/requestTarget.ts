const PUBLIC_SUBDOMAIN_BYPASS_PREFIXES = [
  "/affiliate-register",
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
): boolean => {
  const hostname = normalizeHostname(hostnameInput);
  const pathname = normalizePathname(pathnameInput);
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

  // Storefront detection on pure localhost is driven solely by subdomain
  // (tenant.localhost), never by path alone. Admin routes such as
  // /products/…, /settings/store/… or /cart MUST NOT bootstrap the
  // storefront rendering engine on localhost.
  if (isLocalhost) {
    return false;
  }

  // Exclude admin product paths — these are NOT storefront routes
  if (
    ADMIN_PRODUCT_PATH_PATTERN.test(pathname) ||
    ADMIN_PRODUCT_EDIT_PATTERN.test(pathname)
  ) {
    return false;
  }

  // Exclude customer-portal paths — these are handled by the customer portal,
  // never by the storefront rendering engine.
  if (
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/auth/customer-register" ||
    pathname.startsWith("/auth/customer-register/")
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
    pathname.startsWith("/thank-you") ||
    pathname.startsWith("/collections/") ||
    pathname.startsWith("/pages/")
  ) {
    return true;
  }

  if (isPublicSubdomainBypassPath(pathname)) {
    return false;
  }

  if (hostname.endsWith(".localhost")) {
    return true;
  }

  const parts = hostname.split(".");
  return parts.length >= 3 && parts[0] !== "www";
};
