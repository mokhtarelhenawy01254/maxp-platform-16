export const PORTAL_PREFIXES = [
  "/parent",
  "/teacher",
  "/portal",
  "/academy/portal",
  "/academy/course",
  "/academy/my-courses",
  "/academy/student",
  "/doctor",
  "/patient",
  "/dental-portal",
  "/account",
  "/wholesale-portal",
  "/courier-portal",
  "/client-portal",
  "/agency/client-portal",
] as const;

export const PORTAL_AUTH_BYPASS_PATHS = [
  "/auth/customer-register",
] as const;

export const PUBLIC_REGISTRATION_AND_PROPOSAL_PREFIXES = [
  "/register/affiliate",
  "/register/merchant",
  "/affiliate-register",
  "/proposal",
  "/agency/proposal",
  "/portal/production",
] as const;

const PORTAL_STOREFRONT_EXCLUSION_PREFIXES = [
  "/academy",
  "/client-portal/shipping",
] as const;

export type PortalRole =
  | "parent"
  | "teacher"
  | "doctor"
  | "patient"
  | "dental"
  | "courier"
  | "student"
  | "customer"
  | "wholesale"
  | "client";

const normalizePathname = (pathname: string): string => {
  const normalized = String(pathname || "").trim();
  if (!normalized) {
    return "/";
  }
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
};

const matchesPathPrefix = (pathname: string, prefix: string): boolean =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export const isPortalPath = (pathname: string): boolean => {
  const normalized = normalizePathname(pathname);
  if (
    matchesPathPrefix(normalized, "/portal/production") ||
    matchesPathPrefix(normalized, "/client-portal/shipping")
  ) {
    return false;
  }
  if (
    normalized.startsWith("/academy/courses/") &&
    normalized.length > "/academy/courses/".length
  ) {
    return true;
  }
  return PORTAL_PREFIXES.some((prefix) => matchesPathPrefix(normalized, prefix));
};

export const isPortalAuthBypassPath = (pathname: string): boolean => {
  const normalized = normalizePathname(pathname);
  return PORTAL_AUTH_BYPASS_PATHS.some((prefix) =>
    matchesPathPrefix(normalized, prefix),
  );
};

export const isPortalOrRegistrationPath = (pathname: string): boolean => {
  const normalized = normalizePathname(pathname);
  return (
    isPortalPath(normalized) ||
    isPortalAuthBypassPath(normalized) ||
    PUBLIC_REGISTRATION_AND_PROPOSAL_PREFIXES.some((prefix) =>
      matchesPathPrefix(normalized, prefix),
    ) ||
    PORTAL_STOREFRONT_EXCLUSION_PREFIXES.some((prefix) =>
      matchesPathPrefix(normalized, prefix),
    )
  );
};

export const getPortalRoleFromPath = (pathname: string): PortalRole | null => {
  const normalized = normalizePathname(pathname);

  if (matchesPathPrefix(normalized, "/parent")) return "parent";
  if (matchesPathPrefix(normalized, "/teacher")) return "teacher";
  if (matchesPathPrefix(normalized, "/doctor")) return "doctor";
  if (matchesPathPrefix(normalized, "/patient")) return "patient";
  if (matchesPathPrefix(normalized, "/dental-portal")) return "dental";
  if (matchesPathPrefix(normalized, "/courier-portal")) return "courier";
  if (matchesPathPrefix(normalized, "/account")) return "customer";
  if (matchesPathPrefix(normalized, "/wholesale-portal")) return "wholesale";
  if (
    matchesPathPrefix(normalized, "/agency/client-portal") ||
    matchesPathPrefix(normalized, "/client-portal")
  ) {
    return "client";
  }

  // Public manufacturing order share links (/portal/production/:token) are not member LMS sessions.
  if (matchesPathPrefix(normalized, "/portal/production")) {
    return null;
  }
  if (matchesPathPrefix(normalized, "/portal")) {
    return "student";
  }

  // Public academy portal aliases (/academy/portal, /academy/course/*, /academy/my-courses, /academy/student/*).
  // ERP admin LMS pages (/academy, /academy/dashboard, /academy/courses, /academy/catalog, /academy/students, /academy/sources) return null.
  if (
    matchesPathPrefix(normalized, "/academy/portal") ||
    matchesPathPrefix(normalized, "/academy/course") ||
    matchesPathPrefix(normalized, "/academy/my-courses") ||
    matchesPathPrefix(normalized, "/academy/student")
  ) {
    return "student";
  }

  return null;
};

/**
 * Returns true when the current route runs an isolated portal/customer session
 * that must NOT inherit ERP staff credentials or ERP tenant headers (`X-Company-Id`).
 */
export const isIsolatedPortalContextPath = (pathname: string): boolean => {
  const normalized = normalizePathname(pathname);

  if (isPortalAuthBypassPath(normalized)) {
    return true;
  }

  if (matchesPathPrefix(normalized, "/portal/production")) {
    return true;
  }

  // ERP shipping-client dashboard is guarded by RoleProtectedRoute using ERP session auth.
  if (matchesPathPrefix(normalized, "/client-portal/shipping")) {
    return false;
  }

  return getPortalRoleFromPath(normalized) !== null;
};

const PORTAL_SW_SCOPES: ReadonlyArray<readonly [string, string]> = [
  ["/agency/client-portal", "/agency/client-portal/"],
  ["/parent", "/parent/"],
  ["/teacher", "/teacher/"],
  ["/doctor", "/doctor/"],
  ["/patient", "/patient/"],
  ["/dental-portal", "/dental-portal/"],
  ["/courier-portal", "/courier-portal/"],
  ["/account", "/account/"],
  ["/wholesale-portal", "/wholesale-portal/"],
  ["/client-portal", "/client-portal/"],
  ["/portal", "/portal/"],
  ["/academy/portal", "/academy/"],
  ["/academy/course", "/academy/"],
  ["/academy/courses", "/academy/"],
  ["/academy/my-courses", "/academy/"],
  ["/academy/student", "/academy/"],
];

export const getPortalSwScope = (pathname: string): string | null => {
  const normalized = normalizePathname(pathname);
  if (!isPortalPath(normalized)) {
    return null;
  }
  for (const [prefix, scope] of PORTAL_SW_SCOPES) {
    if (matchesPathPrefix(normalized, prefix)) {
      return scope;
    }
  }
  return null;
};

export const getPortalKeyFromPath = (pathname: string): string | null => {
  const normalized = normalizePathname(pathname);
  const role = getPortalRoleFromPath(normalized);
  if (role) return role;
  if (matchesPathPrefix(normalized, "/portal/production")) return "production";
  if (
    normalized.startsWith("/academy/courses/") &&
    normalized.length > "/academy/courses/".length
  ) {
    return "student";
  }
  return null;
};
