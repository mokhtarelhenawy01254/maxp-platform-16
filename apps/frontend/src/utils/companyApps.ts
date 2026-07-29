export const AFFILIATE_OPERATION_APP_SLUGS = new Set(["affiliate-pro"]);
export const MERCHANT_OPERATION_APP_SLUGS = new Set(["affiliate-pro"]);
export const ORDER_SOURCE_TRACKING_APP_SLUGS = new Set([
  "order-source-tracking",
]);
export const ORDER_CAMPAIGN_ATTRIBUTION_APP_SLUGS = new Set([
  "campaign-attribution",
]);
export const ORDER_CONFIRMATION_DISTRIBUTION_APP_SLUGS = new Set([
  "order-confirmation-distribution",
]);
export const AGENT_WORKSPACE_APP_SLUGS = new Set(["agent-workspace"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const normalizeCompanyAppSlug = (app: unknown) => {
  if (typeof app === "string") {
    return app.trim().toLowerCase();
  }

  if (!isRecord(app)) {
    return "";
  }

  if (typeof app.slug === "string") {
    return app.slug.trim().toLowerCase();
  }

  if (isRecord(app.app) && typeof app.app.slug === "string") {
    return app.app.slug.trim().toLowerCase();
  }

  return "";
};

export const getCurrentCompanyActiveApps = (user: unknown, company: unknown) => {
  const authUser = isRecord(user) ? user : null;
  const userCompanies = Array.isArray(authUser?.companies)
    ? authUser.companies
    : [];
  const currentUserCompany = userCompanies.find(
    (candidate) => isRecord(candidate) && candidate.isCurrent === true,
  );
  const userCompany = isRecord(authUser?.company) ? authUser.company : null;
  const contextCompany = isRecord(company) ? company : null;
  const candidates = [currentUserCompany, userCompany, contextCompany];
  const companyWithApps = candidates.find(
    (candidate) => isRecord(candidate) && Array.isArray(candidate.activeApps),
  );

  return isRecord(companyWithApps) && Array.isArray(companyWithApps.activeApps)
    ? companyWithApps.activeApps
    : [];
};

export const hasAnyCompanyAppSlug = (
  activeSlugs: Set<string>,
  expectedSlugs: Set<string>,
) => Array.from(expectedSlugs).some((slug) => activeSlugs.has(slug));
