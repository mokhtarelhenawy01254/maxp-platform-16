#!/usr/bin/env node
/**
 * Storefront theme — performance + hygiene budget (task 120-day01).
 *
 *   node scripts/check-storefront-theme-budget.mjs --all
 *   node scripts/check-storefront-theme-budget.mjs <theme.json> [...] [--json]
 *
 * Budgets are deliberately objective so "the template is light" is a number, not an opinion:
 *   - gzip size of the theme JSON           <= 8 KB   (the four day-01 templates sit at 2.1–2.3 KB)
 *   - pages                                 >= 4      (home/shop/pdp/cart are mandatory)
 *   - sections per page                     <= 20     (a page that needs 20+ sections is a page with no story)
 *   - external asset hosts                  = 0       (no cdn.shopify.com / *.wp.com / envato etc.)
 *   - competitor brand names in id/slug      = 0       (IP hygiene; only checked on the files you pass)
 *
 * It cannot measure LCP — that needs a rendered page. Lighthouse stays a deploy-time check (see
 * the report); this gate is the part CI can fail fast on for every template.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const THEMES_DIR = path.join(ROOT, 'apps/frontend/src/storefront/themes');

const BUDGETS = {
  gzipKb: 8,
  minPages: 4,
  maxSectionsPerPage: 20,
};

const EXTERNAL_HOSTS = [
  'cdn.shopify.com',
  'myshopify.com',
  'wp.com',
  'wordpress.org',
  'envato.com',
  's3.amazonaws.com',
];

// Only third-party theme brands, never platform names.
const BRAND_TOKENS = [
  'dawn',
  'woodmart',
  'flatsome',
  'astra',
  'oceanwp',
  'generatepress',
  'storefront-theme',
  'shopify',
  'salla',
  'zid',
  'hyper',
  'elessi',
  'fastly',
];

const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const all = process.argv.includes('--all');
const asJson = process.argv.includes('--json');

const targets = all
  ? fs
      .readdirSync(THEMES_DIR)
      .filter((name) => name.endsWith('.json'))
      .map((name) => path.join(THEMES_DIR, name))
  : args.map((file) => path.resolve(file));

if (targets.length === 0) {
  console.error('usage: node scripts/check-storefront-theme-budget.mjs <theme.json> [...] | --all [--json]');
  process.exit(2);
}

const results = [];

for (const file of targets) {
  const name = path.basename(file);
  const raw = fs.readFileSync(file);
  const errors = [];

  let theme;
  try {
    theme = JSON.parse(raw.toString('utf8'));
  } catch (error) {
    results.push({ file: name, ok: false, errors: [`invalid JSON: ${error.message}`] });
    continue;
  }

  if (Array.isArray(theme)) {
    results.push({ file: name, ok: true, skipped: 'manifest' });
    continue;
  }

  const gzipKb = zlib.gzipSync(raw, { level: 9 }).length / 1024;
  if (gzipKb > BUDGETS.gzipKb) {
    errors.push(`gzip ${gzipKb.toFixed(2)}KB > ${BUDGETS.gzipKb}KB budget`);
  }

  const pages = theme.pages || {};
  const pageCount = Object.keys(pages).length;
  if (pageCount < BUDGETS.minPages) {
    errors.push(`${pageCount} pages < ${BUDGETS.minPages} required`);
  }

  let sections = 0;
  for (const [pageKey, pageConfig] of Object.entries(pages)) {
    const list = Array.isArray(pageConfig?.sections) ? pageConfig.sections : [];
    sections += list.length;
    if (list.length > BUDGETS.maxSectionsPerPage) {
      errors.push(`page "${pageKey}" has ${list.length} sections > ${BUDGETS.maxSectionsPerPage}`);
    }
  }

  const text = raw.toString('utf8');
  const external = EXTERNAL_HOSTS.filter((host) => text.includes(host));
  if (external.length > 0) {
    errors.push(`external asset host(s): ${external.join(', ')}`);
  }

  const idText = String(theme.id || name).toLowerCase();
  const brands = BRAND_TOKENS.filter((token) => idText.includes(token));
  if (brands.length > 0) {
    errors.push(`competitor brand token in id: ${brands.join(', ')}`);
  }

  results.push({
    file: name,
    ok: errors.length === 0,
    errors,
    gzipKb: Number(gzipKb.toFixed(2)),
    pages: pageCount,
    sections,
  });
}

if (asJson) {
  console.log(JSON.stringify({ budgets: BUDGETS, results, failed: results.filter((r) => !r.ok).length }, null, 2));
} else {
  for (const result of results) {
    if (result.ok) {
      console.log(result.skipped ? `SKIP ${result.file} (${result.skipped})` : `PASS ${result.file} · ${result.gzipKb}KB gzip · ${result.pages} pages · ${result.sections} sections`);
      continue;
    }
    console.log(`FAIL ${result.file}`);
    result.errors.forEach((error) => console.log(`  - ${error}`));
  }
}

const failed = results.filter((result) => !result.ok);
if (failed.length > 0) {
  console.error(`\n${failed.length} of ${results.length} theme(s) failed the budget gate.`);
  process.exit(1);
}
