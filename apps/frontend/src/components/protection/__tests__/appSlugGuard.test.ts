import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { APP_SLUG_ALIASES, getCandidateSlugs, resolveCanonicalSlug } from "../appSlugAliases";
import marketplaceAppSlugs from "../../../data/marketplaceAppSlugs.json";
import { STORE_APP_SLUGS } from "../../../utils/storeShortcut";

export interface SlugOccurrence {
  line: number;
  raw: string;
  slugs: string[];
}

export function extractRequiredAppSlugsFromAppTsx(appTsxPath: string): SlugOccurrence[] {
  const content = fs.readFileSync(appTsxPath, "utf-8");
  const lines = content.split("\n");

  // Determine SHIPPING_APP_ACCESS_SLUGS from App.tsx
  const shippingSlugs: string[] = [
    "internal-courier-fleet",
    "order-shipping-turbo",
    "order-shipping-hub",
    "order-shipping-bosta",
    "order-shipping-qpexpress",
    "order-shipping",
    "order-core",
    "commerce-advanced",
    ...STORE_APP_SLUGS,
  ];

  const occurrences: SlugOccurrence[] = [];
  const regex = /requiredAppSlugs=\{([^}]+)\}/;

  lines.forEach((lineText, idx) => {
    const match = regex.exec(lineText);
    if (match) {
      const raw = match[1].trim();
      let slugs: string[] = [];
      if (raw === "SHIPPING_APP_ACCESS_SLUGS") {
        slugs = shippingSlugs;
      } else {
        const strMatches = [...raw.matchAll(/['"]([^'"]+)['"]/g)];
        slugs = strMatches.map((m) => m[1].trim());
      }
      occurrences.push({
        line: idx + 1,
        raw,
        slugs,
      });
    }
  });

  return occurrences;
}

export function validateSlug(
  slug: string,
  catalogSet: Set<string>,
  aliasMap: Record<string, string[]>
): { isValid: boolean; status: "in_db" | "has_alias" | "dead" } {
  const normalized = slug.trim().toLowerCase();
  if (catalogSet.has(normalized)) {
    return { isValid: true, status: "in_db" };
  }
  if (normalized in aliasMap) {
    return { isValid: true, status: "has_alias" };
  }
  return { isValid: false, status: "dead" };
}

describe("App Slug CI Guard: requiredAppSlugs integrity", () => {
  const catalogSet = new Set<string>((marketplaceAppSlugs as string[]).map((s) => s.trim().toLowerCase()));
  const appTsxPath = path.resolve(__dirname, "../../../App.tsx");
  const occurrences = extractRequiredAppSlugsFromAppTsx(appTsxPath);

  it("loads marketplaceAppSlugs and ensures non-empty catalog", () => {
    expect(catalogSet.size).toBeGreaterThan(200);
    expect(catalogSet.has("break-even")).toBe(true);
    expect(catalogSet.has("monthly-pnl")).toBe(true);
    expect(catalogSet.has("marketing-agency-pro")).toBe(true);
  });

  it("verifies every single requiredAppSlugs in App.tsx exists in marketplace_apps or has registered alias", () => {
    expect(occurrences.length).toBeGreaterThan(50);

    const invalidOccurrences: Array<{ line: number; invalidSlugs: string[]; raw: string }> = [];

    for (const occ of occurrences) {
      const deadSlugs = occ.slugs.filter((s) => {
        const { isValid } = validateSlug(s, catalogSet, APP_SLUG_ALIASES);
        return !isValid;
      });

      if (deadSlugs.length > 0) {
        invalidOccurrences.push({
          line: occ.line,
          invalidSlugs: deadSlugs,
          raw: occ.raw,
        });
      }
    }

    if (invalidOccurrences.length > 0) {
      const report = invalidOccurrences
        .map((o) => `Line ${o.line}: [${o.invalidSlugs.join(", ")}] in condition: ${o.raw}`)
        .join("\n");
      throw new Error(`Found ${invalidOccurrences.length} invalid requiredAppSlugs in App.tsx:\n${report}`);
    }

    expect(invalidOccurrences).toHaveLength(0);
  });

  it("verifies the 8 legacy fake slugs are registered in APP_SLUG_ALIASES and map to valid catalog apps", () => {
    const legacyFakeSlugs = [
      "project-break-even-calculator",
      "monthly-pnl-calculator",
      "agency-system",
      "booking-appointments",
      "accounting-app",
      "manufacturing-app",
      "cat-app-manufacturing",
      "youtube-publish",
    ];

    for (const fakeSlug of legacyFakeSlugs) {
      expect(APP_SLUG_ALIASES).toHaveProperty(fakeSlug);
      const candidates = getCandidateSlugs(fakeSlug);
      const hasValidTarget = candidates.some((c) => catalogSet.has(c));
      expect(hasValidTarget).toBe(true);

      const canonical = resolveCanonicalSlug(fakeSlug);
      expect(catalogSet.has(canonical)).toBe(true);
    }
  });

  it("fails validation if an unknown or unregistered slug is introduced (swap simulation)", () => {
    const fakeTestSlug = "non-existent-dummy-calculator";
    const res = validateSlug(fakeTestSlug, catalogSet, APP_SLUG_ALIASES);
    expect(res.isValid).toBe(false);
    expect(res.status).toBe("dead");
  });
});
