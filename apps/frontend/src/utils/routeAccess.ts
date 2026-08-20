/**
 * Central registry that maps protected frontend routes to the permissions
 * (or roles) required to view them. Used to validate post-auth destinations
 * BEFORE navigating (so users never land on a page they cannot open) and by
 * route guards for a consistent experience.
 */

export interface RouteAccessUser {
  role?: string | null;
  permissions?: string[];
}

const SUPER_ADMIN_ROLE = "SUPER_ADMIN";

const COMPANY_ROLES = new Set([
  "COMPANY_ADMIN",
  "OWNER",
  "MANAGER",
  "TEAM_LEADER",
  "MODERATOR",
  "EMPLOYEE",
  "ADMIN",
  "HR_MANAGER",
  // Legacy company role names that must NOT be treated as platform admins.
  "Team Lead",
  "Project Manager",
  "Developer",
  "Tester",
  "Agent",
  "AGENT",
]);

/** Exact path -> permissions (ALL required). More specific than prefix rules. */
const EXACT_ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/products/new": ["products.create"],
  "/products/import-easy-orders": ["products.create"],
  "/products/import-woocommerce": ["products.create"],
  "/customers/new": ["customers.create"],
};

/** Prefix -> permissions (ALL required to view the section). */
const PREFIX_ROUTE_PERMISSIONS: Array<{ prefix: string; permissions: string[] }> = [
  { prefix: "/customers", permissions: ["customers.view"] },
  { prefix: "/products", permissions: ["products.view"] },
  { prefix: "/orders/return-settings", permissions: ["orders.return-settings.view"] },
  { prefix: "/orders/returns", permissions: ["orders.returns.view"] },
  { prefix: "/roles", permissions: ["settings.roles.manage"] },
];

/** Prefix -> roles (special shells that only their role may open). */
const PREFIX_ROLE_GATES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/super-admin", roles: [SUPER_ADMIN_ROLE] },
  { prefix: "/affiliates", roles: ["AFFILIATE"] },
  { prefix: "/merchant-portal", roles: ["MERCHANT"] },
];

export const isCompanyRole = (role?: string | null): boolean =>
  Boolean(role && COMPANY_ROLES.has(role));

/**
 * True when the given path may be opened by the user. Unknown/unguarded app
 * paths return true (the page's own guard still enforces access on render);
 * known guarded paths are validated against the user's permissions/roles.
 */
export const isPathAllowedForUser = (
  path: string,
  user?: RouteAccessUser | null,
): boolean => {
  if (!user) return false;
  const role = user.role || "";
  if (role === SUPER_ADMIN_ROLE) return true;

  // Special shells: only the matching role may open them.
  const roleGate = PREFIX_ROLE_GATES.find(
    (g) => path === g.prefix || path.startsWith(`${g.prefix}/`),
  );
  if (roleGate) return roleGate.roles.includes(role);

  const exact = EXACT_ROUTE_PERMISSIONS[path];
  if (exact) {
    return exact.every((p) => (user.permissions || []).includes(p));
  }

  const prefixRule = PREFIX_ROUTE_PERMISSIONS.find((r) =>
    path.startsWith(r.prefix),
  );
  if (prefixRule) {
    return prefixRule.permissions.every((p) =>
      (user.permissions || []).includes(p),
    );
  }

  // Unguarded app route ΓÇö let the page-level guard decide on render.
  return true;
};
