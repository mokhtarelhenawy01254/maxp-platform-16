export function isInternalCourierAppActive(
  user?: {
    role?: string;
    company?: { activeApps?: any[] };
    companies?: Array<{ isCurrent?: boolean; activeApps?: any[] }>;
    activeApps?: any[];
  } | null,
): boolean {
  if (user?.role === "SUPER_ADMIN") return true;
  const currentCompany =
    user?.companies?.find((c) => c.isCurrent) || user?.company;
  const activeApps = Array.isArray(currentCompany?.activeApps)
    ? currentCompany.activeApps
    : Array.isArray(user?.company?.activeApps)
      ? user.company.activeApps
      : Array.isArray(user?.activeApps)
        ? user.activeApps
        : [];

  const allowedSlugs = ["internal-courier-fleet"];
  return allowedSlugs.some((slug) => {
    const target = slug.toLowerCase();
    return activeApps.some((a) => {
      if (typeof a === "string") return a.trim().toLowerCase() === target;
      if (a && typeof a === "object") {
        const obj = a as { slug?: string; app?: { slug?: string } };
        if (obj.slug?.trim().toLowerCase() === target) return true;
        if (obj.app?.slug?.trim().toLowerCase() === target) return true;
      }
      return false;
    });
  });
}
