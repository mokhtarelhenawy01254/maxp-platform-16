#!/usr/bin/env tsx
/**
 * Storefront theme — section gate.
 *
 * Task 120-day01 requires this file to exist so every template can be checked against the
 * live section manifest and the component registry before it ships:
 *
 *   npx tsx scripts/validate-theme-sections.ts apps/frontend/src/storefront/themes/<slug>.json
 *
 * Checks, per page and per section entry:
 *   1. the section type is declared in STOREFRONT_SECTION_MANIFEST
 *   2. the manifest entry maps to a component key (engine/sectionComponentMap)
 *   3. the section is allowed on that page
 *   4. the variant (if any) is declared for that section
 *
 * Exit code 0 = clean, 1 = at least one error. `--all` checks every theme JSON in the
 * presets directory; `--json` prints a machine-readable report.
 */
import fs from 'node:fs';
import path from 'node:path';

import {
  STOREFRONT_SECTION_MANIFEST,
  isStorefrontSectionAllowedOnPage,
  isStorefrontSectionVariantAllowed,
} from '../apps/frontend/src/storefront/sections/manifest';

type SectionEntry = string | { type?: string; variant?: string; settings?: { variant?: string } };

type ThemeFile = {
  id?: string;
  pages?: Record<string, { sections?: SectionEntry[] } | undefined>;
};

type Issue = { level: 'error' | 'warning'; page: string; section: string; message: string };

const THEMES_DIR = path.resolve(__dirname, '../apps/frontend/src/storefront/themes');

const getSectionType = (entry: SectionEntry): string =>
  typeof entry === 'string' ? entry.trim() : String(entry?.type || '').trim();

const getSectionVariant = (entry: SectionEntry): string | null => {
  if (typeof entry === 'string') return null;
  if (entry?.variant && String(entry.variant).trim()) return String(entry.variant).trim();
  const nested = entry?.settings?.variant;
  return nested && String(nested).trim() ? String(nested).trim() : null;
};

const validateThemeFile = (filePath: string): { themeId: string; issues: Issue[]; sections: number } => {
  const raw = fs.readFileSync(filePath, 'utf8');
  let theme: ThemeFile;
  try {
    theme = JSON.parse(raw) as ThemeFile;
  } catch (error) {
    return {
      themeId: path.basename(filePath, '.json'),
      issues: [
        {
          level: 'error',
          page: '-',
          section: '-',
          message: `invalid JSON: ${(error as Error).message}`,
        },
      ],
      sections: 0,
    };
  }

  if (Array.isArray(theme)) {
    // themes-manifest.json lives in the same folder but is the catalog manifest, not a theme.
    return { themeId: path.basename(filePath, '.json'), issues: [], sections: 0 };
  }

  const issues: Issue[] = [];
  const pages = theme.pages || {};
  let sectionCount = 0;

  for (const [pageKey, pageConfig] of Object.entries(pages)) {
    const sections = pageConfig?.sections;
    if (!Array.isArray(sections) || sections.length === 0) {
      issues.push({
        level: 'error',
        page: pageKey,
        section: '-',
        message: 'page has no sections',
      });
      continue;
    }

    for (const entry of sections) {
      sectionCount += 1;
      const type = getSectionType(entry);

      if (!type) {
        issues.push({ level: 'error', page: pageKey, section: '-', message: 'section entry has no type' });
        continue;
      }

      if (!(type in STOREFRONT_SECTION_MANIFEST)) {
        issues.push({
          level: 'error',
          page: pageKey,
          section: type,
          message: 'not declared in STOREFRONT_SECTION_MANIFEST',
        });
        continue;
      }

      // The component key is what ComponentRegistry resolves; an empty key means the
      // section renders nothing. Read it from the manifest entry (importing
      // engine/sectionComponentMap here would create a manifest <-> map cycle).
      const componentKey = String(
        (STOREFRONT_SECTION_MANIFEST as Record<string, { component?: string }>)[type]?.component || '',
      ).trim();
      if (!componentKey) {
        issues.push({
          level: 'error',
          page: pageKey,
          section: type,
          message: 'declared in the manifest but has no component key',
        });
      }

      if (!isStorefrontSectionAllowedOnPage(type, pageKey)) {
        issues.push({
          level: 'error',
          page: pageKey,
          section: type,
          message: 'not allowed on this page',
        });
      }

      const variant = getSectionVariant(entry);
      if (variant && !isStorefrontSectionVariantAllowed(type, variant)) {
        issues.push({
          level: 'error',
          page: pageKey,
          section: type,
          message: `variant "${variant}" is not declared for this section`,
        });
      }
    }
  }

  return { themeId: theme.id || path.basename(filePath, '.json'), issues, sections: sectionCount };
};

const main = () => {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const all = args.includes('--all');
  const files = args.filter((arg) => !arg.startsWith('--'));

  const targets = all
    ? fs
        .readdirSync(THEMES_DIR)
        .filter((name) => name.endsWith('.json') && name !== 'themes-manifest.json')
        .map((name) => path.join(THEMES_DIR, name))
    : files.map((file) => path.resolve(file));

  if (targets.length === 0) {
    console.error('usage: npx tsx scripts/validate-theme-sections.ts <theme.json> [...] | --all');
    process.exit(2);
  }

  const results = targets.map(validateThemeFile);
  const failed = results.filter((result) => result.issues.some((issue) => issue.level === 'error'));

  if (asJson) {
    console.log(JSON.stringify({ results, failed: failed.length }, null, 2));
  } else {
    results.forEach((result) => {
      const errors = result.issues.filter((issue) => issue.level === 'error');
      if (errors.length === 0) {
        console.log(`PASS ${result.themeId} (${result.sections} sections)`);
        return;
      }
      console.log(`FAIL ${result.themeId}`);
      errors.forEach((issue) => console.log(`  - [${issue.page}] ${issue.section}: ${issue.message}`));
    });
  }

  if (failed.length > 0) {
    console.error(`\n${failed.length} of ${results.length} theme(s) failed the section gate.`);
    process.exit(1);
  }
};

main();
