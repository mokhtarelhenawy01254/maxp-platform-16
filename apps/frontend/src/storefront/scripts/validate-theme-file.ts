import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { STOREFRONT_SECTION_COMPONENT_MAP } from '../engine/sectionComponentMap';
import {
  isStorefrontSectionKnown,
  isStorefrontSectionVariantAllowed,
} from '../sections/manifest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const THEMES_DIR = path.resolve(__dirname, '../themes');

// ============================================================================
// Constants & Prohibited Items
// ============================================================================

export const MANDATORY_ROOT_KEYS = [
  'id',
  'name',
  'direction',
  'tokens',
  'header',
  'footer',
  'pages',
] as const;

export const MANDATORY_PAGE_KEYS = [
  'home',
  'shop',
  'pdp',
  'cart',
  'checkout',
] as const;

export const MANDATORY_COLOR_TOKENS = [
  'primary',
  'secondary',
  'accent',
  'background',
  'foreground',
] as const;

export const PROHIBITED_BRANDS = [
  'shopify',
  'wordpress',
  'woocommerce',
  'salla',
  'zid',
  'easyorders',
] as const;

export const PROHIBITED_ASSET_DOMAINS = [
  'cdn.shopify.com',
  'myshopify.com',
  'wordpress.com',
  'wp.com',
  'salla.sa',
  'zid.store',
] as const;

// ============================================================================
// Types
// ============================================================================

export interface StorefrontThemeDraft {
  id?: string;
  name?: string;
  direction?: string;
  tokens?: {
    colors?: Record<string, string>;
    typography?: Record<string, string>;
    shape?: Record<string, string>;
    [key: string]: unknown;
  };
  header?: {
    brandName?: string;
    [key: string]: unknown;
  };
  footer?: {
    copyrightText?: string;
    [key: string]: unknown;
  };
  pages?: Record<
    string,
    {
      sections?: Array<
        | string
        | {
            type?: string;
            variant?: string;
            title?: string;
            settings?: Record<string, unknown>;
            [key: string]: unknown;
          }
      >;
      [key: string]: unknown;
    }
  >;
  [key: string]: unknown;
}

export interface ThemeValidationReport {
  filePath: string;
  themeId: string;
  themeName: string;
  direction: string;
  passed: boolean;
  durationMs: number;
  schemaCheck: {
    passed: boolean;
    details: string[];
    errors: string[];
  };
  sectionCheck: {
    passed: boolean;
    totalSections: number;
    details: string[];
    errors: string[];
  };
  brandCheck: {
    passed: boolean;
    details: string[];
    errors: string[];
  };
  assetCheck: {
    passed: boolean;
    details: string[];
    errors: string[];
  };
  duplicateCheck: {
    passed: boolean;
    fingerprint: string;
    details: string[];
    warnings: string[];
  };
  allErrors: string[];
  allWarnings: string[];
}

// ============================================================================
// Helpers
// ============================================================================

const isNonEmptyString = (val: unknown): val is string =>
  typeof val === 'string' && val.trim().length > 0;

const isObjectRecord = (val: unknown): val is Record<string, unknown> =>
  Boolean(val) && typeof val === 'object' && !Array.isArray(val);

function isSectionInRegistry(sectionType: string): boolean {
  if (!sectionType) return false;
  return (
    Boolean((STOREFRONT_SECTION_COMPONENT_MAP as Record<string, string>)[sectionType]) ||
    isStorefrontSectionKnown(sectionType)
  );
}

function isVariantAllowed(sectionType: string, variant: string): boolean {
  if (!variant || variant === 'default' || variant === 'standard') {
    return true;
  }

  if (isStorefrontSectionVariantAllowed(sectionType, variant)) {
    return true;
  }

  // Also check against mapped component if sectionType is an alias
  const mappedComponent = (STOREFRONT_SECTION_COMPONENT_MAP as Record<string, string>)[
    sectionType
  ];
  if (mappedComponent && mappedComponent !== sectionType) {
    if (isStorefrontSectionVariantAllowed(mappedComponent, variant)) {
      return true;
    }
  }

  return false;
}

export function computeStructuralFingerprint(theme: StorefrontThemeDraft): {
  hash: string;
  signature: string;
} {
  const extractSectionTypes = (sections: unknown[] = []): string[] => {
    if (!Array.isArray(sections)) return [];
    return sections.map((sec) => {
      if (typeof sec === 'string') return sec.trim();
      if (isObjectRecord(sec) && typeof sec['type'] === 'string') {
        return (sec['type'] as string).trim();
      }
      return 'unknown';
    });
  };

  const homePages = theme['pages'];
  const homeSections = homePages ? homePages['home']?.['sections'] : undefined;
  const shopSections = homePages ? homePages['shop']?.['sections'] : undefined;

  const homeSeq = extractSectionTypes(homeSections as unknown[]).join('>');
  const shopSeq = extractSectionTypes(shopSections as unknown[]).join('>');
  const signature = `home:[${homeSeq}]|shop:[${shopSeq}]`;
  const hash = crypto.createHash('sha256').update(signature).digest('hex').slice(0, 12);

  return { hash, signature };
}

// ============================================================================
// Core Validation Function
// ============================================================================

export function validateThemeObject(
  rawTheme: unknown,
  filePath: string,
  existingFingerprints?: Map<string, { themeId: string; filePath: string }>,
): ThemeValidationReport {
  const startTime = Date.now();
  const theme = (isObjectRecord(rawTheme) ? rawTheme : {}) as StorefrontThemeDraft;

  const report: ThemeValidationReport = {
    filePath,
    themeId: isNonEmptyString(theme['id']) ? (theme['id'] as string) : 'unknown',
    themeName: isNonEmptyString(theme['name'])
      ? (theme['name'] as string)
      : 'Unknown Theme',
    direction: isNonEmptyString(theme['direction'])
      ? (theme['direction'] as string)
      : 'unknown',
    passed: true,
    durationMs: 0,
    schemaCheck: { passed: true, details: [], errors: [] },
    sectionCheck: { passed: true, totalSections: 0, details: [], errors: [] },
    brandCheck: { passed: true, details: [], errors: [] },
    assetCheck: { passed: true, details: [], errors: [] },
    duplicateCheck: { passed: true, fingerprint: '', details: [], warnings: [] },
    allErrors: [],
    allWarnings: [],
  };

  // --------------------------------------------------------------------------
  // Check 1: Structural Schema Validation
  // --------------------------------------------------------------------------
  if (!isObjectRecord(rawTheme)) {
    report.schemaCheck.passed = false;
    report.schemaCheck.errors.push('Theme root must be a valid JSON object.');
  } else {
    // 1a: Mandatory root keys
    const missingRootKeys = MANDATORY_ROOT_KEYS.filter((k) => !(k in theme));
    if (missingRootKeys.length > 0) {
      report.schemaCheck.passed = false;
      report.schemaCheck.errors.push(
        `Missing mandatory root key(s): ${missingRootKeys.map((k) => `"${k}"`).join(', ')}`,
      );
    } else {
      report.schemaCheck.details.push(
        `All mandatory root keys present (${MANDATORY_ROOT_KEYS.join(', ')})`,
      );
    }

    // 1b: Direction validation
    const dir = theme['direction'];
    if (dir !== 'ltr' && dir !== 'rtl') {
      report.schemaCheck.passed = false;
      report.schemaCheck.errors.push(
        `Direction must be "ltr" or "rtl", received "${String(dir)}"`,
      );
    } else {
      report.schemaCheck.details.push(`Direction is valid ("${dir}")`);
    }

    // 1c: Color tokens
    const tokens = theme['tokens'];
    const colors = tokens && isObjectRecord(tokens) ? (tokens['colors'] as Record<string, unknown>) : null;
    if (!colors || !isObjectRecord(colors)) {
      report.schemaCheck.passed = false;
      report.schemaCheck.errors.push(
        'Missing "tokens.colors" object in theme definition.',
      );
    } else {
      const missingColors = MANDATORY_COLOR_TOKENS.filter(
        (c) => !isNonEmptyString(colors[c]),
      );
      if (missingColors.length > 0) {
        report.schemaCheck.passed = false;
        report.schemaCheck.errors.push(
          `Missing mandatory color token(s) in tokens.colors: ${missingColors.map((c) => `"${c}"`).join(', ')}`,
        );
      } else {
        report.schemaCheck.details.push(
          `Mandatory color tokens present (${MANDATORY_COLOR_TOKENS.join(', ')})`,
        );
      }
    }

    // 1d: Mandatory pages
    const pages = theme['pages'];
    if (!pages || !isObjectRecord(pages)) {
      report.schemaCheck.passed = false;
      report.schemaCheck.errors.push('Missing "pages" object in theme definition.');
    } else {
      const missingPages = MANDATORY_PAGE_KEYS.filter(
        (p) => !isObjectRecord((pages as Record<string, unknown>)[p]),
      );
      if (missingPages.length > 0) {
        report.schemaCheck.passed = false;
        report.schemaCheck.errors.push(
          `Missing mandatory page(s) in pages: ${missingPages.map((p) => `"${p}"`).join(', ')}`,
        );
      } else {
        report.schemaCheck.details.push(
          `Mandatory pages present (${MANDATORY_PAGE_KEYS.join(', ')})`,
        );
      }
    }
  }

  // --------------------------------------------------------------------------
  // Check 2: Section Existence & Component Registry
  // --------------------------------------------------------------------------
  const pagesRecord = theme['pages'];
  if (pagesRecord && isObjectRecord(pagesRecord)) {
    let totalSections = 0;
    const pageKeys = Object.keys(pagesRecord);

    for (const pageKey of pageKeys) {
      const pageConfig = (pagesRecord as Record<string, unknown>)[pageKey];
      if (!isObjectRecord(pageConfig)) continue;

      const sections = pageConfig['sections'];
      if (!Array.isArray(sections)) {
        report.sectionCheck.passed = false;
        report.sectionCheck.errors.push(
          `Page "${pageKey}" must define a "sections" array.`,
        );
        continue;
      }

      if (MANDATORY_PAGE_KEYS.includes(pageKey as any) && sections.length === 0) {
        report.sectionCheck.passed = false;
        report.sectionCheck.errors.push(
          `Mandatory page "${pageKey}" must define at least one section.`,
        );
        continue;
      }

      let pageSectionsValid = true;

      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        totalSections++;

        let secType = '';
        let secVariant: string | null = null;

        if (isNonEmptyString(sec)) {
          secType = sec.trim();
        } else if (isObjectRecord(sec) && isNonEmptyString(sec['type'])) {
          secType = (sec['type'] as string).trim();
          if (isNonEmptyString(sec['variant'])) {
            secVariant = (sec['variant'] as string).trim();
          } else if (
            isObjectRecord(sec['settings']) &&
            isNonEmptyString((sec['settings'] as Record<string, unknown>)['variant'])
          ) {
            secVariant = (
              (sec['settings'] as Record<string, unknown>)['variant'] as string
            ).trim();
          }
        } else {
          pageSectionsValid = false;
          report.sectionCheck.passed = false;
          report.sectionCheck.errors.push(
            `Page "${pageKey}" section[${i}] has invalid section structure.`,
          );
          continue;
        }

        // Verify section existence in ComponentRegistry / sectionComponentMap
        if (!isSectionInRegistry(secType)) {
          pageSectionsValid = false;
          report.sectionCheck.passed = false;
          report.sectionCheck.errors.push(
            `Page "${pageKey}" contains unknown section "${secType}" (not registered in ComponentRegistry / sectionComponentMap).`,
          );
          continue;
        }

        // Verify variant if provided
        if (secVariant && !isVariantAllowed(secType, secVariant)) {
          pageSectionsValid = false;
          report.sectionCheck.passed = false;
          report.sectionCheck.errors.push(
            `Page "${pageKey}" section "${secType}" uses unsupported variant "${secVariant}".`,
          );
        }
      }

      if (pageSectionsValid) {
        report.sectionCheck.details.push(
          `Page "${pageKey}" (${sections.length} section${sections.length === 1 ? '' : 's'}): registered & variants verified`,
        );
      }
    }

    report.sectionCheck.totalSections = totalSections;
  }

  // --------------------------------------------------------------------------
  // Check 3: Zero Brand Name Violations
  // --------------------------------------------------------------------------
  const checkBrand = (value: unknown, location: string) => {
    if (typeof value !== 'string') return;
    const lower = value.toLowerCase();
    for (const brand of PROHIBITED_BRANDS) {
      if (lower.includes(brand)) {
        report.brandCheck.passed = false;
        report.brandCheck.errors.push(
          `Prohibited competitor brand "${brand}" found in ${location}: "${value}"`,
        );
      }
    }
  };

  checkBrand(theme['id'], 'theme.id');
  checkBrand(theme['name'], 'theme.name');

  const header = theme['header'];
  if (isObjectRecord(header) && header['brandName']) {
    checkBrand(header['brandName'], 'header.brandName');
  }

  if (pagesRecord && isObjectRecord(pagesRecord)) {
    for (const [pageSlug, pageConfig] of Object.entries(pagesRecord)) {
      checkBrand(pageSlug, `page slug "${pageSlug}"`);
      if (isObjectRecord(pageConfig) && Array.isArray(pageConfig['sections'])) {
        pageConfig['sections'].forEach((sec: unknown, idx: number) => {
          if (isObjectRecord(sec)) {
            if (sec['title']) checkBrand(sec['title'], `page "${pageSlug}" section[${idx}] title`);
            const settings = sec['settings'];
            if (isObjectRecord(settings)) {
              if (settings['title']) {
                checkBrand(
                  settings['title'],
                  `page "${pageSlug}" section[${idx}] (${(sec['type'] as string) || 'unknown'}) settings.title`,
                );
              }
              if (settings['heading']) {
                checkBrand(
                  settings['heading'],
                  `page "${pageSlug}" section[${idx}] settings.heading`,
                );
              }
              if (settings['eyebrow']) {
                checkBrand(
                  settings['eyebrow'],
                  `page "${pageSlug}" section[${idx}] settings.eyebrow`,
                );
              }
              if (settings['subtitle']) {
                checkBrand(
                  settings['subtitle'],
                  `page "${pageSlug}" section[${idx}] settings.subtitle`,
                );
              }
              if (settings['badge']) {
                checkBrand(
                  settings['badge'],
                  `page "${pageSlug}" section[${idx}] settings.badge`,
                );
              }
              if (settings['brandName']) {
                checkBrand(
                  settings['brandName'],
                  `page "${pageSlug}" section[${idx}] settings.brandName`,
                );
              }
            }
          }
        });
      }
    }
  }

  if (report.brandCheck.passed) {
    report.brandCheck.details.push(
      `Zero prohibited competitor brands detected (${PROHIBITED_BRANDS.join(', ')})`,
    );
  }

  // --------------------------------------------------------------------------
  // Check 4: Zero External Asset Hotlinks
  // --------------------------------------------------------------------------
  function scanForHotlinks(val: unknown, currentPath: string) {
    if (typeof val === 'string') {
      const lower = val.toLowerCase();
      for (const domain of PROHIBITED_ASSET_DOMAINS) {
        if (lower.includes(domain)) {
          report.assetCheck.passed = false;
          const snippet = val.length > 80 ? `${val.slice(0, 80)}...` : val;
          report.assetCheck.errors.push(
            `Prohibited external hotlink to "${domain}" in ${currentPath}: "${snippet}"`,
          );
        }
      }
    } else if (Array.isArray(val)) {
      val.forEach((item, index) => scanForHotlinks(item, `${currentPath}[${index}]`));
    } else if (isObjectRecord(val)) {
      for (const [k, v] of Object.entries(val)) {
        scanForHotlinks(v, currentPath ? `${currentPath}.${k}` : k);
      }
    }
  }

  scanForHotlinks(theme, 'root');

  if (report.assetCheck.passed) {
    report.assetCheck.details.push(
      `Zero prohibited external CDN hotlinks detected (${PROHIBITED_ASSET_DOMAINS.join(', ')})`,
    );
  }

  // --------------------------------------------------------------------------
  // Check 5: Structural Anti-Duplicate / Fingerprint Warning
  // --------------------------------------------------------------------------
  const { hash } = computeStructuralFingerprint(theme);
  report.duplicateCheck.fingerprint = hash;

  if (existingFingerprints) {
    const existing = existingFingerprints.get(hash);
    if (
      existing &&
      existing.themeId !== theme['id'] &&
      path.resolve(existing.filePath) !== path.resolve(filePath)
    ) {
      report.duplicateCheck.warnings.push(
        `Structural clone detected! Exact sequence of home and shop sections matches existing theme "${existing.themeId}" (${path.basename(existing.filePath)}). Fingerprint: ${hash}`,
      );
    }
  }

  if (report.duplicateCheck.warnings.length === 0) {
    report.duplicateCheck.details.push(
      `Unique structural fingerprint (${hash}) - No 1:1 structural clones found`,
    );
  }

  // --------------------------------------------------------------------------
  // Aggregate Results
  // --------------------------------------------------------------------------
  report.allErrors = [
    ...report.schemaCheck.errors,
    ...report.sectionCheck.errors,
    ...report.brandCheck.errors,
    ...report.assetCheck.errors,
  ];

  report.allWarnings = [...report.duplicateCheck.warnings];
  report.passed = report.allErrors.length === 0;
  report.durationMs = Date.now() - startTime;

  return report;
}

// ============================================================================
// Load Existing Theme Fingerprints
// ============================================================================

export function loadExistingThemeFingerprints(
  themesDir: string = THEMES_DIR,
): Map<string, { themeId: string; filePath: string }> {
  const map = new Map<string, { themeId: string; filePath: string }>();

  if (!fs.existsSync(themesDir)) return map;

  const files = fs
    .readdirSync(themesDir)
    .filter(
      (f) =>
        f.endsWith('.json') &&
        !f.endsWith('-manifest.json') &&
        f !== 'themes-manifest.json',
    );

  for (const file of files) {
    const fullPath = path.join(themesDir, file);
    try {
      const raw = fs.readFileSync(fullPath, 'utf8');
      const json = JSON.parse(raw) as Record<string, unknown>;
      if (json && isObjectRecord(json)) {
        const { hash } = computeStructuralFingerprint(json as StorefrontThemeDraft);
        if (!map.has(hash)) {
          map.set(hash, {
            themeId: (json['id'] as string) || path.basename(file, '.json'),
            filePath: fullPath,
          });
        }
      }
    } catch {
      // Ignore unparseable files during fingerprint scanning
    }
  }

  return map;
}

// ============================================================================
// File Validation Entrypoint
// ============================================================================

export function validateThemeFile(
  targetPath: string,
  existingFingerprints?: Map<string, { themeId: string; filePath: string }>,
): ThemeValidationReport {
  const startTime = Date.now();

  if (!fs.existsSync(targetPath)) {
    return {
      filePath: targetPath,
      themeId: 'unknown',
      themeName: 'Unknown',
      direction: 'unknown',
      passed: false,
      durationMs: Date.now() - startTime,
      schemaCheck: {
        passed: false,
        details: [],
        errors: [`File not found: "${targetPath}"`],
      },
      sectionCheck: { passed: false, totalSections: 0, details: [], errors: [] },
      brandCheck: { passed: false, details: [], errors: [] },
      assetCheck: { passed: false, details: [], errors: [] },
      duplicateCheck: { passed: false, fingerprint: '', details: [], warnings: [] },
      allErrors: [`File not found: "${targetPath}"`],
      allWarnings: [],
    };
  }

  let theme: unknown;
  try {
    const raw = fs.readFileSync(targetPath, 'utf8');
    theme = JSON.parse(raw);
  } catch (err) {
    const errorMsg = `Invalid JSON in "${targetPath}": ${err instanceof Error ? err.message : String(err)}`;
    return {
      filePath: targetPath,
      themeId: 'unknown',
      themeName: 'Unknown',
      direction: 'unknown',
      passed: false,
      durationMs: Date.now() - startTime,
      schemaCheck: {
        passed: false,
        details: [],
        errors: [errorMsg],
      },
      sectionCheck: { passed: false, totalSections: 0, details: [], errors: [] },
      brandCheck: { passed: false, details: [], errors: [] },
      assetCheck: { passed: false, details: [], errors: [] },
      duplicateCheck: { passed: false, fingerprint: '', details: [], warnings: [] },
      allErrors: [errorMsg],
      allWarnings: [],
    };
  }

  const fingerprints = existingFingerprints ?? loadExistingThemeFingerprints();
  return validateThemeObject(theme, targetPath, fingerprints);
}

// ============================================================================
// CLI Presentation & Runner
// ============================================================================

function printDetailedReport(report: ThemeValidationReport): void {
  console.log('======================================================================');
  console.log('  MaxP Storefront Theme Quality & Anti-Slop Validator');
  console.log('======================================================================');
  console.log(`File:      ${report.filePath}`);
  console.log(
    `Theme:     ${report.themeName} (id: "${report.themeId}", direction: "${report.direction}")`,
  );
  console.log('');

  // 1. Schema
  console.log(`[1/5] Structural Schema:`);
  report.schemaCheck.details.forEach((d) => console.log(`  ✔ ${d}`));
  report.schemaCheck.errors.forEach((e) => console.log(`  ✖ ${e}`));
  console.log('');

  // 2. Sections
  console.log(
    `[2/5] Section Existence & Component Registry (${report.sectionCheck.totalSections} sections total):`,
  );
  report.sectionCheck.details.forEach((d) => console.log(`  ✔ ${d}`));
  report.sectionCheck.errors.forEach((e) => console.log(`  ✖ ${e}`));
  console.log('');

  // 3. Brands
  console.log(`[3/5] Zero Brand Name Violations:`);
  report.brandCheck.details.forEach((d) => console.log(`  ✔ ${d}`));
  report.brandCheck.errors.forEach((e) => console.log(`  ✖ ${e}`));
  console.log('');

  // 4. Assets
  console.log(`[4/5] Zero External Asset Hotlinks:`);
  report.assetCheck.details.forEach((d) => console.log(`  ✔ ${d}`));
  report.assetCheck.errors.forEach((e) => console.log(`  ✖ ${e}`));
  console.log('');

  // 5. Duplicates
  console.log(
    `[5/5] Structural Anti-Duplicate Fingerprint (${report.duplicateCheck.fingerprint}):`,
  );
  report.duplicateCheck.details.forEach((d) => console.log(`  ✔ ${d}`));
  report.duplicateCheck.warnings.forEach((w) => console.log(`  ⚠️  ${w}`));
  console.log('');

  // Summary
  console.log('----------------------------------------------------------------------');
  if (report.passed) {
    console.log(
      `RESULT: PASS [5/5 check groups passed | 0 errors | ${report.allWarnings.length} warning(s)]`,
    );
  } else {
    console.log(
      `RESULT: FAIL [${report.allErrors.length} error(s) | ${report.allWarnings.length} warning(s)]`,
    );
  }
  console.log(`Execution Time: ${report.durationMs}ms`);
  console.log('======================================================================');
}

function resolveTargetFile(targetArg: string): string | null {
  const searchPaths = [
    path.resolve(process.cwd(), targetArg),
    path.resolve(THEMES_DIR, targetArg),
    path.resolve(THEMES_DIR, targetArg.endsWith('.json') ? targetArg : `${targetArg}.json`),
    path.resolve(
      process.cwd(),
      'src/storefront/themes',
      targetArg.endsWith('.json') ? targetArg : `${targetArg}.json`,
    ),
    path.resolve(
      process.cwd(),
      'apps/frontend/src/storefront/themes',
      targetArg.endsWith('.json') ? targetArg : `${targetArg}.json`,
    ),
  ];

  for (const p of searchPaths) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return p;
    }
  }
  return null;
}

export function main(): void {
  const args = process.argv.slice(2);
  const targetArg = args.find((a) => !a.startsWith('--'));

  const fingerprints = loadExistingThemeFingerprints(THEMES_DIR);

  if (targetArg && !args.includes('--all')) {
    const resolvedPath = resolveTargetFile(targetArg);
    if (!resolvedPath) {
      console.error(
        `Error: Could not find theme file matching "${targetArg}". Checked paths in ${THEMES_DIR}.`,
      );
      process.exit(1);
    }

    const report = validateThemeFile(resolvedPath, fingerprints);
    printDetailedReport(report);

    if (!report.passed) {
      process.exit(1);
    }
    return;
  }

  // All Themes Mode
  console.log('======================================================================');
  console.log('  MaxP Storefront Theme Quality & Anti-Slop Batch Validator');
  console.log('======================================================================');
  console.log(`Scanning all theme JSON files in: ${THEMES_DIR}`);
  console.log('');

  const files = fs
    .readdirSync(THEMES_DIR)
    .filter(
      (f) =>
        f.endsWith('.json') &&
        !f.endsWith('-manifest.json') &&
        f !== 'themes-manifest.json',
    )
    .sort();

  let passCount = 0;
  let failCount = 0;
  const failedReports: ThemeValidationReport[] = [];

  const batchStart = Date.now();

  for (const file of files) {
    const fullPath = path.join(THEMES_DIR, file);
    const report = validateThemeFile(fullPath, fingerprints);

    if (report.passed) {
      passCount++;
      const warnTag =
        report.allWarnings.length > 0 ? ` [⚠️  ${report.allWarnings.length} warning]` : '';
      console.log(
        `PASS  ${report.themeId.padEnd(26)} (${report.sectionCheck.totalSections} sections, fp: ${report.duplicateCheck.fingerprint})${warnTag}`,
      );
    } else {
      failCount++;
      failedReports.push(report);
      console.log(`FAIL  ${report.themeId.padEnd(26)} (${report.allErrors.length} errors)`);
    }
  }

  const batchDuration = Date.now() - batchStart;

  console.log('');
  console.log('----------------------------------------------------------------------');
  console.log(
    `Batch Summary: ${files.length} themes validated in ${batchDuration}ms (PASS: ${passCount}, FAIL: ${failCount})`,
  );
  console.log('----------------------------------------------------------------------');

  if (failedReports.length > 0) {
    console.log('\nFailure Details:');
    for (const r of failedReports) {
      console.log(`\n• Theme "${r.themeId}" (${r.filePath}):`);
      r.allErrors.forEach((e) => console.log(`    ✖ ${e}`));
    }
    console.log('\n======================================================================');
    process.exit(1);
  }

  console.log('======================================================================');
}

// Only execute CLI runner when invoked directly
const isDirectCli =
  process.argv[1] &&
  (process.argv[1].endsWith('validate-theme-file.ts') ||
    process.argv[1].endsWith('validate-theme-file.js'));

if (isDirectCli) {
  main();
}
