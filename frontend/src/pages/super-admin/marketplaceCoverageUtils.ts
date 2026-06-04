import type {
  MarketplaceFeatureAuditEntry,
  MarketplaceFeatureMapEntry,
} from "../../config/marketplaceFeatureMap";

export type MarketplaceCoverageStatus =
  | "core"
  | "exact"
  | "fallback"
  | "missing"
  | "catalog-missing";

export type CoverageCompany = {
  id: string;
  name: string;
  email?: string | null;
  slug?: string | null;
  plan?: string | null;
  isActive?: boolean;
  activeAppSlugs?: string[];
};

export type CoverageFeatureEntry = MarketplaceFeatureAuditEntry & {
  coverageStatus: MarketplaceCoverageStatus;
  exactInstalled: boolean;
  fallbackInstalled: boolean;
  catalogExists: boolean;
};

export type CompanyCoverageSummary = {
  company: CoverageCompany;
  entries: CoverageFeatureEntry[];
  counts: {
    core: number;
    exact: number;
    fallback: number;
    missing: number;
    catalogMissing: number;
    productizable: number;
    risk: number;
  };
  missingExactAppSlugs: string[];
  fallbackExactAppSlugs: string[];
  coverageScore: number;
};

const normalizeSlug = (slug?: string | null): string =>
  String(slug || "").trim().toLowerCase();

const uniqueSlugs = (slugs: string[]): string[] =>
  Array.from(new Set(slugs.map(normalizeSlug).filter(Boolean)));

export const buildCompanyCoverage = (
  company: CoverageCompany,
  featureMap: MarketplaceFeatureMapEntry[],
  catalogAppSlugs: string[],
): CompanyCoverageSummary => {
  const activeSlugs = new Set(uniqueSlugs(company.activeAppSlugs || []));
  const catalogSlugs = new Set(uniqueSlugs(catalogAppSlugs));
  const missingExactAppSlugs: string[] = [];
  const fallbackExactAppSlugs: string[] = [];

  const entries: CoverageFeatureEntry[] = featureMap.map((entry) => {
    const appSlug = normalizeSlug(entry.appSlug);
    const legacyGate = normalizeSlug(entry.legacyGate);
    const exactInstalled = !!appSlug && activeSlugs.has(appSlug);
    const fallbackInstalled = !!legacyGate && activeSlugs.has(legacyGate);
    const appExists = !!appSlug && catalogSlugs.has(appSlug);
    const catalogExists = !appSlug || appExists;
    let coverageStatus: MarketplaceCoverageStatus = "missing";

    if (entry.status === "core") {
      coverageStatus = "core";
    } else if (!catalogExists) {
      coverageStatus = "catalog-missing";
    } else if (exactInstalled) {
      coverageStatus = "exact";
    } else if (fallbackInstalled) {
      coverageStatus = "fallback";
      if (appSlug) {
        fallbackExactAppSlugs.push(appSlug);
      }
    } else {
      coverageStatus = "missing";
      if (appSlug) {
        missingExactAppSlugs.push(appSlug);
      }
    }

    return {
      ...entry,
      effectiveStatus:
        coverageStatus === "core"
          ? "core"
          : coverageStatus === "catalog-missing" || coverageStatus === "missing"
            ? "missing-app"
            : coverageStatus === "fallback"
              ? "needs-granular-gate"
              : "covered",
      appExists,
      coverageStatus,
      exactInstalled,
      fallbackInstalled,
      catalogExists,
    };
  });

  const counts = entries.reduce<CompanyCoverageSummary["counts"]>(
    (summary, entry) => {
      if (entry.coverageStatus === "core") {
        summary.core += 1;
      } else {
        summary.productizable += 1;
      }

      if (entry.coverageStatus === "exact") summary.exact += 1;
      if (entry.coverageStatus === "fallback") summary.fallback += 1;
      if (entry.coverageStatus === "missing") summary.missing += 1;
      if (entry.coverageStatus === "catalog-missing") summary.catalogMissing += 1;

      return summary;
    },
    {
      core: 0,
      exact: 0,
      fallback: 0,
      missing: 0,
      catalogMissing: 0,
      productizable: 0,
      risk: 0,
    },
  );

  counts.risk = counts.fallback + counts.missing + counts.catalogMissing;
  const healthyCount = counts.exact + counts.fallback;
  const coverageScore =
    counts.productizable > 0
      ? Math.round((healthyCount / counts.productizable) * 100)
      : 100;

  return {
    company,
    entries,
    counts,
    missingExactAppSlugs: uniqueSlugs(missingExactAppSlugs),
    fallbackExactAppSlugs: uniqueSlugs(fallbackExactAppSlugs),
    coverageScore,
  };
};

export const buildMarketplaceCoverage = (
  companies: CoverageCompany[],
  featureMap: MarketplaceFeatureMapEntry[],
  catalogAppSlugs: string[],
): CompanyCoverageSummary[] =>
  companies.map((company) =>
    buildCompanyCoverage(company, featureMap, catalogAppSlugs),
  );
