import {
  collectStorefrontThemeLinkedPageReferences,
  getGeneratedStorefrontThemePages,
  getStorefrontThemePreset,
  STOREFRONT_THEME_PRESETS,
} from "../themes";

type ThemeAuditRow = {
  themeId: string;
  rawPageCount: number;
  normalizedPageCount: number;
  generatedPages: string[];
  supportedLinkedPages: string[];
  unsupportedLinkedRoutes: string[];
  missingAfterNormalization: string[];
};

const parseCsvArg = (value?: string | null): string[] =>
  value
    ? value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];

const getArgumentValue = (flag: string): string | null => {
  const flagIndex = process.argv.findIndex((entry) => entry === flag);
  if (flagIndex === -1) {
    return null;
  }

  return process.argv[flagIndex + 1] || null;
};

const hasFlag = (flag: string): boolean => process.argv.includes(flag);

const resolveThemeIds = (): string[] => {
  const requestedThemes = parseCsvArg(getArgumentValue("--themes"));
  const allThemeIds = Object.keys(STOREFRONT_THEME_PRESETS).sort();
  const availableThemeIds = new Set(allThemeIds);

  if (requestedThemes.length === 0) {
    return allThemeIds;
  }

  const unknownThemes = requestedThemes.filter((themeId) => !availableThemeIds.has(themeId));
  if (unknownThemes.length > 0) {
    throw new Error(`Unknown theme ids: ${unknownThemes.join(", ")}`);
  }

  return requestedThemes;
};

const uniq = (values: string[]): string[] => Array.from(new Set(values));

const auditTheme = (themeId: string): ThemeAuditRow => {
  const rawTheme = STOREFRONT_THEME_PRESETS[themeId]!;
  const normalizedTheme = getStorefrontThemePreset(themeId);
  const linkedPages = collectStorefrontThemeLinkedPageReferences(rawTheme);
  const supportedLinkedPages = uniq(
    linkedPages
      .filter((reference) => reference.supportedByDynamicPage)
      .map((reference) => reference.slug)
      .sort(),
  );
  const unsupportedLinkedRoutes = uniq(
    linkedPages
      .filter((reference) => !reference.supportedByDynamicPage)
      .map(
        (reference) =>
          `${reference.to} (${reference.label || reference.slug} via ${reference.source})`,
      )
      .sort(),
  );
  const generatedPages = Object.keys(getGeneratedStorefrontThemePages(rawTheme)).sort();
  const missingAfterNormalization = supportedLinkedPages.filter(
    (pageKey) => !normalizedTheme.pages[pageKey],
  );

  return {
    themeId,
    rawPageCount: Object.keys(rawTheme.pages).length,
    normalizedPageCount: Object.keys(normalizedTheme.pages).length,
    generatedPages,
    supportedLinkedPages,
    unsupportedLinkedRoutes,
    missingAfterNormalization,
  };
};

const main = () => {
  const themeIds = resolveThemeIds();
  const rows = themeIds.map(auditTheme);
  const generatedThemes = rows.filter((row) => row.generatedPages.length > 0);
  const generatedPageCount = rows.reduce(
    (total, row) => total + row.generatedPages.length,
    0,
  );
  const supportedLinkedPageCount = rows.reduce(
    (total, row) => total + row.supportedLinkedPages.length,
    0,
  );
  const unsupportedRouteCount = rows.reduce(
    (total, row) => total + row.unsupportedLinkedRoutes.length,
    0,
  );
  const missingCoverageRows = rows.filter(
    (row) => row.missingAfterNormalization.length > 0,
  );
  const showAllRows = hasFlag("--all");

  console.log(
    `Audited ${rows.length} storefront themes. ${generatedThemes.length} themes receive generated support pages (${generatedPageCount} pages total).`,
  );
  console.log(
    `Supported linked routes covered after normalization: ${supportedLinkedPageCount}/${supportedLinkedPageCount}.`,
  );

  if (unsupportedRouteCount > 0) {
    console.log(
      `Unsupported multi-segment routes still need router work: ${unsupportedRouteCount}.`,
    );
  } else {
    console.log("No unsupported multi-segment theme routes detected.");
  }

  rows
    .filter(
      (row) =>
        showAllRows ||
        row.generatedPages.length > 0 ||
        row.unsupportedLinkedRoutes.length > 0 ||
        row.missingAfterNormalization.length > 0,
    )
    .forEach((row) => {
      const status = row.missingAfterNormalization.length === 0 ? "PASS" : "FAIL";
      console.log(
        `[${status}] ${row.themeId} raw=${row.rawPageCount} normalized=${row.normalizedPageCount}`,
      );

      if (row.generatedPages.length > 0) {
        console.log(`  generated: ${row.generatedPages.join(", ")}`);
      }

      if (row.unsupportedLinkedRoutes.length > 0) {
        console.log(`  unsupported: ${row.unsupportedLinkedRoutes.join(" | ")}`);
      }

      if (row.missingAfterNormalization.length > 0) {
        console.log(`  missing: ${row.missingAfterNormalization.join(", ")}`);
      }
    });

  if (missingCoverageRows.length > 0) {
    console.error("\nStorefront theme audit found linked pages that still miss coverage:");
    missingCoverageRows.forEach((row) => {
      console.error(`- ${row.themeId}: ${row.missingAfterNormalization.join(", ")}`);
    });
    process.exit(1);
  }

  console.log("\nStorefront theme linked-page audit passed.");
};

main();
