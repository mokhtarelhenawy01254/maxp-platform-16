const SYSTEM_ROLES = new Set([
  "SUPER_ADMIN",
  "Project Manager",
  "Team Lead",
  "Developer",
  "Tester",
]);

const isSystemUserRole = (role?: string | null): boolean =>
  Boolean(role && SYSTEM_ROLES.has(role));

export const getPostAuthDestination = (user?: { role?: string | null } | null): string => {
  if (user?.role === "MERCHANT") return "/merchant-portal";
  if (user?.role === "AFFILIATE") return "/affiliates/dashboard";
  if (isSystemUserRole(user?.role)) {
    const saved = localStorage.getItem("superAdmin_lastPath");
    if (saved?.startsWith("/super-admin/")) return saved;
    return "/super-admin/dev-dashboard";
  }
  return "/marketplace";
};
