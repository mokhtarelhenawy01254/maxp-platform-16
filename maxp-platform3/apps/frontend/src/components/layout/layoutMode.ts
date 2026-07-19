export const shouldUseSuperAdminShell = (
  role?: string | null,
  pathname?: string | null,
): boolean => {
  if (role !== "SUPER_ADMIN" || !pathname) {
    return false;
  }

  return pathname === "/super-admin" || pathname.startsWith("/super-admin/");
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

  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
};
