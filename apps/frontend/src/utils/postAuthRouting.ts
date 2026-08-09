/**
 * Single source of truth for "where does the user land after login / register".
 *
 * Precedence:
 *   1. session resume path (state.from — freshest intent, validated)
 *   2. last app page visited before logout (validated)
 *   3. saved default page (user.settings.defaultPage, then localStorage)
 *   4. role-based fallback
 *
 * Also tracks the "last page before logout" per user+company.
 */

import {
  isPathAllowedForUser,
  isCompanyRole,
  type RouteAccessUser,
} from "./routeAccess";
import {
  isMerchantPrivatePathAllowed,
  isAffiliatePrivatePathAllowed,
} from "./merchantAccess";

export interface PostAuthUser extends RouteAccessUser {
  id?: string;
  companyId?: string | null;
  company?: { id?: string | null } | null;
  settings?: string | Record<string, unknown> | null;
}

const SYSTEM_ROLES = new Set(["SUPER_ADMIN"]);

const isSystemUserRole = (role?: string | null): boolean =>
  Boolean(role && SYSTEM_ROLES.has(role));

const readDefaultPage = (settings: unknown): string | null => {
  if (!settings) return null;
  const parsed =
    typeof settings === "string" ? JSON.parse(settings) : settings;
  const page = (parsed as { defaultPage?: string } | null)?.defaultPage;
  return page && page !== "/apps" ? page : null;
};

/** Paths that are public / auth / checkout and must never be a post-auth landing. */
const NON_APP_PATH_PREFIXES = [
  "/auth/",
  "/register/",
  "/affiliate-register",
  "/payment/",
  "/checkout/",
  "/apply/",
  "/for-merchants",
  "/lp/",
  "/theme-demo/",
  "/store",
  "/cafe-demo",
  "/book/",
  "/company-links/",
  "/test-public",
];

export const isAllowedPostAuthPath = (path: string | null | undefined): boolean => {
  if (!path || !path.startsWith("/")) return false;
  if (path === "/") return false;
  if (NON_APP_PATH_PREFIXES.some((p) => path === p || path.startsWith(p))) {
    return false;
  }
  return true;
};

const getLastPathKey = (user?: PostAuthUser | null): string => {
  const companyId = user?.companyId || user?.company?.id;
  const suffix = [user?.id, companyId].filter(Boolean).join(":");
  return suffix ? `maxp_lastPath:${suffix}` : "maxp_lastPath";
};

export const saveLastPath = (
  user: PostAuthUser | null | undefined,
  pathname: string,
): void => {
  if (!user?.id || !isAllowedPostAuthPath(pathname)) return;
  // System roles (SUPER_ADMIN) must only resume their own dashboard surface,
  // never company pages like /apps that are technically allowed but not the
  // intended landing after login.
  if (isSystemUserRole(user?.role) && !pathname.startsWith("/super-admin/")) {
    return;
  }
  try {
    localStorage.setItem(getLastPathKey(user), pathname);
  } catch {
    // storage unavailable — ignore
  }
};

export const getLastPath = (user?: PostAuthUser | null): string | null => {
  if (!user?.id) return null;
  try {
    return localStorage.getItem(getLastPathKey(user));
  } catch {
    return null;
  }
};

const isResumePathAllowed = (
  path: string,
  user?: PostAuthUser | null,
): boolean => {
  if (!isAllowedPostAuthPath(path)) return false;
  // System roles (SUPER_ADMIN) may only resume their own dashboard surface.
  if (isSystemUserRole(user?.role) && !path.startsWith("/super-admin/")) {
    return false;
  }
  if (!isPathAllowedForUser(path, user)) return false;

  // Merchant / affiliate shells must stay inside their allowed surface.
  if (user?.role === "MERCHANT" && !isMerchantPrivatePathAllowed(path)) {
    return false;
  }
  if (user?.role === "AFFILIATE" && !isAffiliatePrivatePathAllowed(path)) {
    return false;
  }
  return true;
};

export const resolvePostAuthDestination = (
  user?: PostAuthUser | null,
  stateFromPath?: string | null,
): string => {
  // 1) Session resume (freshest intent — redirected from a protected page).
  if (stateFromPath && isResumePathAllowed(stateFromPath, user)) {
    return stateFromPath;
  }

  // 2) Last app page before logout.
  const lastPath = getLastPath(user);
  if (lastPath && isResumePathAllowed(lastPath, user)) {
    return lastPath;
  }

  // 3) Saved default landing page.
  try {
    const defaultPage = readDefaultPage(user?.settings);
    if (defaultPage) return defaultPage;
  } catch {
    // ignore malformed settings
  }
  try {
    const stored = localStorage.getItem("maxp-default-page");
    if (stored && stored !== "/apps") return stored;
  } catch {
    // ignore storage errors
  }

  // 4) Role-based fallback.
  if (user?.role === "MERCHANT") return "/merchant-portal";
  if (user?.role === "AFFILIATE") return "/affiliates/dashboard";
  if (isSystemUserRole(user?.role)) {
    try {
      const saved = localStorage.getItem("superAdmin_lastPath");
      if (saved?.startsWith("/super-admin/")) return saved;
    } catch {
      // ignore
    }
    return "/super-admin/dev-dashboard";
  }
  if (isCompanyRole(user?.role)) return "/apps";
  return "/marketplace";
};

/** Backward-compatible wrapper used by existing callers. */
export const getPostAuthDestination = (
  user?: PostAuthUser | null,
): string => resolvePostAuthDestination(user);
