type MerchantRedirectInput = {
  isAuthenticated: boolean;
  isLoading: boolean;
  isPublicRoute: boolean;
  pathname: string;
  role?: string | null;
};

type AffiliateRedirectInput = MerchantRedirectInput;

const MERCHANT_ALLOWED_PRIVATE_PATHS = new Set([
  "/merchant-portal",
  "/merchant-portal/commissions",
  "/merchant-portal/products",
  "/merchant-portal/orders",
  "/profile",
]);
const MERCHANT_BLOCKED_PRODUCT_PATHS = new Set([
  "/products/trash",
  "/products/import-easy-orders",
  "/products/import-woocommerce",
]);
const MERCHANT_BLOCKED_ORDER_PATHS = new Set([
  "/orders/workspace",
  "/orders/confirmations",
  "/orders/preparation",
  "/orders/incomplete",
  "/orders/analytics",
  "/orders/woocommerce-sync",
  "/orders/turbo-records",
  "/orders/whatsapp-notifications",
  "/orders/invoices",
  "/orders/manual",
  "/orders/stats",
]);
const AFFILIATE_ALLOWED_PRIVATE_PREFIXES = [
  "/affiliates/dashboard",
  "/affiliates/register",
  "/affiliates/products",
  "/affiliates/products/visibility",
  "/affiliates/orders",
  "/affiliates/customers",
  "/affiliates/referrals",
  "/affiliates/commission",
  "/profile",
];

export const isMerchantRole = (role?: string | null): boolean =>
  role === "MERCHANT";

export const isAffiliateRole = (role?: string | null): boolean =>
  role === "AFFILIATE";

export const isMerchantPrivatePathAllowed = (pathname: string): boolean => {
  if (MERCHANT_ALLOWED_PRIVATE_PATHS.has(pathname)) {
    return true;
  }

  if (
    pathname === "/products" ||
    pathname === "/products/new" ||
    (!MERCHANT_BLOCKED_PRODUCT_PATHS.has(pathname) &&
      /^\/products\/[^/]+(?:\/edit)?$/.test(pathname))
  ) {
    return true;
  }

  if (pathname === "/orders") {
    return true;
  }

  if (
    !MERCHANT_BLOCKED_ORDER_PATHS.has(pathname) &&
    /^\/orders\/[^/]+$/.test(pathname)
  ) {
    return true;
  }

  return pathname === "/inventory";
};

export const isAffiliatePrivatePathAllowed = (pathname: string): boolean =>
  AFFILIATE_ALLOWED_PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

export const shouldRedirectMerchantToPortal = ({
  isAuthenticated,
  isLoading,
  isPublicRoute,
  pathname,
  role,
}: MerchantRedirectInput): boolean =>
  !isLoading &&
  isAuthenticated &&
  isMerchantRole(role) &&
  !isPublicRoute &&
  !isMerchantPrivatePathAllowed(pathname);

export const shouldRedirectAffiliateToDashboard = ({
  isAuthenticated,
  isLoading,
  isPublicRoute,
  pathname,
  role,
}: AffiliateRedirectInput): boolean =>
  !isLoading &&
  isAuthenticated &&
  isAffiliateRole(role) &&
  !isPublicRoute &&
  !isAffiliatePrivatePathAllowed(pathname);
