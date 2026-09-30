const normalizeSidebarPath = (value: string) => {
  const [rawPathname = "/", rawSearch = ""] = value.split("?");
  const pathname = rawPathname.replace(/\/+$/, "") || "/";
  const search = rawSearch ? `?${rawSearch}` : "";

  return { pathname, search };
};

export const isSidebarPathActive = (
  currentPath: string,
  targetPath: string,
): boolean => {
  const current = normalizeSidebarPath(currentPath);
  const target = normalizeSidebarPath(targetPath);
  const taskStandalonePages = [
    "/tasks/projects",
    "/tasks/categories",
    "/tasks/integrations",
  ];

  if (
    target.pathname === "/tasks" &&
    current.pathname.startsWith("/tasks/") &&
    current.pathname !== "/tasks"
  ) {
    return !taskStandalonePages.some(
      (path) =>
        current.pathname === path || current.pathname.startsWith(`${path}/`),
    );
  }

  // Base dashboard paths that have distinct sibling sub-paths in the sidebar.
  // We do not want to highlight these parent paths when viewing their sub-paths.
  const baseDashboardPaths = [
    "/",
    "/settings",
    "/settings/store",
    "/hr",
    "/admin/booking",
    "/admin/education"
  ];

  const isBaseDashboard = baseDashboardPaths.includes(target.pathname);

  if (
    !isBaseDashboard &&
    current.pathname.startsWith(target.pathname + "/")
  ) {
    return true;
  }

  if (current.pathname !== target.pathname) {
    return false;
  }

  if (!target.search) {
    return true;
  }

  return current.search === target.search;
};
