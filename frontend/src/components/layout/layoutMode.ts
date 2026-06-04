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
): boolean => {
  if (
    itemPath === "/super-admin/companies" &&
    (pathname === "/super-admin/companies-v2" ||
      pathname.startsWith("/super-admin/companies-v2/"))
  ) {
    return true;
  }

  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
};
