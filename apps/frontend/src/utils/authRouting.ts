const SYSTEM_ROLES = new Set([
  "SUPER_ADMIN",
  "Project Manager",
  "Team Lead",
  "Developer",
  "Tester",
]);

const isSystemUserRole = (role?: string | null): boolean =>
  Boolean(role && SYSTEM_ROLES.has(role));

interface PostAuthUser {
  role?: string | null;
  settings?: string | Record<string, unknown> | null;
}

const readDefaultPage = (settings: unknown): string | null => {
  if (!settings) return null;
  const parsed =
    typeof settings === "string" ? JSON.parse(settings) : settings;
  const page = (parsed as { defaultPage?: string } | null)?.defaultPage;
  return page && page !== "/apps" ? page : null;
};

export const getPostAuthDestination = (
  user?: PostAuthUser | null,
): string => {
  // Honor the user's saved default landing page (Profile / Users Management)
  try {
    const defaultPage = readDefaultPage(user?.settings);
    if (defaultPage) return defaultPage;
  } catch {
    // ignore malformed settings
  }

  // Fallback to locally cached default page (set by profile page / DefaultPageRedirect)
  try {
    const stored = localStorage.getItem("maxp-default-page");
    if (stored && stored !== "/apps") return stored;
  } catch {
    // ignore storage errors
  }

  if (user?.role === "MERCHANT") return "/merchant-portal";
  if (user?.role === "AFFILIATE") return "/affiliates/dashboard";
  if (isSystemUserRole(user?.role)) {
    const saved = localStorage.getItem("superAdmin_lastPath");
    if (saved?.startsWith("/super-admin/")) return saved;
    return "/super-admin/dev-dashboard";
  }
  return "/marketplace";
};
