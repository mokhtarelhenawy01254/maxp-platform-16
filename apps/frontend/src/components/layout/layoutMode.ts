const checkRuntimeLegacy = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    if (
      typeof window.localStorage !== "undefined" &&
      window.localStorage !== null &&
      typeof window.localStorage.getItem === "function" &&
      window.localStorage.getItem("maxp_legacy_shell") === "1"
    ) {
      return true;
    }
  } catch {
    // Access to localStorage might be blocked in restricted contexts (e.g. private browsing, sandboxed iframe)
  }

  try {
    if (
      typeof window.location !== "undefined" &&
      window.location !== null &&
      window.location.search &&
      new URLSearchParams(window.location.search).get("legacyShell") === "1"
    ) {
      return true;
    }
  } catch {
    // Ignore search query parsing errors
  }

  return false;
};

const runtimeLegacy = checkRuntimeLegacy();

export const FEATURE_UNIFIED_SUPERADMIN_SHELL =
  !runtimeLegacy && import.meta.env["VITE_LEGACY_SUPERADMIN_SHELL"] !== "true";

export const shouldUseSuperAdminShell = (
  role?: string | null,
  pathname?: string | null,
): boolean => {
  if (FEATURE_UNIFIED_SUPERADMIN_SHELL) {
    return false;
  }

  if (role !== "SUPER_ADMIN" || !pathname) {
    return false;
  }

  return (
    pathname === "/super-admin" ||
    pathname.startsWith("/super-admin/") ||
    pathname === "/admin/support" ||
    pathname.startsWith("/admin/support") ||
    pathname.startsWith("/admin/ai-hub")
  );
};

export const matchesSuperAdminNavigationPath = (
  pathname: string,
  itemPath: string,
  search?: string,
): boolean => {
  const [itemPathname, itemSearch] = itemPath.split("?");
  if (itemSearch) {
    const itemParams = new URLSearchParams(itemSearch);
    const currentParams = new URLSearchParams(search ?? "");
    const pathnameMatch = pathname === itemPathname;
    const searchMatch = [...itemParams.entries()].every(
      ([k, v]) => currentParams.get(k) === v,
    );
    return pathnameMatch && searchMatch;
  }

  // Treat company details (/super-admin/companies/:companyId and /super-admin/companies-v2/:companyId)
  // as matching the companies management navigation item (/super-admin/companies-v2)
  if (
    itemPath === "/super-admin/companies-v2" &&
    (pathname === "/super-admin/companies" ||
      pathname === "/super-admin/companies-v2" ||
      pathname.startsWith("/super-admin/companies-v2/") ||
      (pathname.startsWith("/super-admin/companies/") &&
        !pathname.startsWith("/super-admin/companies-reports")))
  ) {
    return true;
  }

  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
};
