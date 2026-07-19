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

  if (current.pathname !== target.pathname) {
    return false;
  }

  if (!target.search) {
    return true;
  }

  return current.search === target.search;
};
