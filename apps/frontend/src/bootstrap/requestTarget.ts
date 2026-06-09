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

export const shouldBootstrapStorefront = (
  hostnameInput: string,
  pathnameInput: string,
): boolean => {
  const hostname = normalizeHostname(hostnameInput);
  const pathname = normalizePathname(pathnameInput);
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

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

  if (isLocalhost) {
    return false;
  }

  if (hostname.endsWith(".localhost")) {
    return true;
  }

  const parts = hostname.split(".");
  return parts.length >= 3 && parts[0] !== "www";
};
