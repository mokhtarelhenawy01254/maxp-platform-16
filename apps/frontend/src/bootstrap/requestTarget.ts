import { isPortalOrRegistrationPath } from "../config/portals";

const RESERVED_PLATFORM_SUBDOMAINS = new Set([
  "www",
  "app",
  "admin",
  "api",
  "dashboard",
  "dev",
  "staging",
  "mail",
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

const ADMIN_PRODUCT_PATH_PATTERN =
  /\/products\/(?:new|trash|reviews|import-|settings\/upsell)/;
const ADMIN_PRODUCT_EDIT_PATTERN = /\/products\/[^/]+\/edit$/;
const IPV4_HOSTNAME_PATTERN = /^\d+(?:\.\d+){3}$/;

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

  // Portals, customer registration, affiliate registration, and agency proposals
  // MUST execute inside the platform shell even when hosted on tenant subdomains
  // (*.maxp.online) or custom domains.
  if (
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname.startsWith("/auth/customer-register") ||
    isPortalOrRegistrationPath(pathname)
  ) {
    return false;
  }

  // Exclude admin product paths — these are NOT storefront routes
  if (
    ADMIN_PRODUCT_PATH_PATTERN.test(pathname) ||
    ADMIN_PRODUCT_EDIT_PATTERN.test(pathname)
  ) {
    return false;
  }

  // Storefront detection on pure localhost is driven solely by subdomain
  // (tenant.localhost) or explicit preview query params (?previewTheme=...).
  // Admin routes such as /products/…, /settings/store/… or /cart MUST NOT
  // bootstrap the storefront rendering engine on localhost without preview query.
  if (isLocalhost && !hasStorefrontPreviewParam) {
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

  if (hasStorefrontPreviewParam) {
    return true;
  }

  if (hostname.endsWith(".localhost")) {
    return true;
  }

  if (IPV4_HOSTNAME_PATTERN.test(hostname)) {
    return false;
  }

  const parts = hostname.split(".");
  const firstSegment = parts[0] ?? "";
  return parts.length >= 3 && !RESERVED_PLATFORM_SUBDOMAINS.has(firstSegment);
};
