#!/usr/bin/env node
/**
 * Arabic-first typography gate for RTL storefront themes.
 *
 * Why: a heading stack that STARTS with a Latin-only face (Playfair Display,
 * Cormorant Garamond, Noto Serif, …) never renders Arabic glyphs — the browser
 * silently falls through to the next Arabic-capable family in the stack, so the
 * theme's intended display identity does not exist for Arabic headings (the
 * platform's primary language). Verified live via CDP: themes led by
 * "Playfair Display" rendered h1 glyphs in Cairo/Times New Roman.
 *
 * Rule: every RTL theme's tokens.typography.headingFont must have an
 * Arabic-capable family in the FIRST position. bodyFont must contain an
 * Arabic-capable family somewhere in the stack.
 *
 * Usage: node scripts/validate-theme-fonts.mjs <theme.json> [...] | --all [--json]
 */
import fs from 'node:fs';
import path from 'node:path';

const THEMES_DIR = path.resolve('apps/frontend/src/storefront/themes');
// families confirmed to ship Arabic glyphs on Google Fonts
const ARABIC_CAPABLE = new Set([
  'cairo', 'tajawal', 'ibm plex sans arabic', 'almarai', 'alexandria', 'noto kufi arabic', 'noto sans arabic',
  'noto naskh arabic', 'amiri', 'aref ruqaa ink', 'rubik', 'readex pro', 'el messiri', 'changa', 'lalezar',
  'reem kufi', 'baloo bhaijaan 2',
]);
const LTR_IDS = new Set(); // direction: "ltr" themes are exempt (checked per file)

const parseArgs = process.argv.slice(2);
const asJson = parseArgs.includes('--json');
const allMode = parseArgs.includes('--all');
const files = allMode
  ? fs.readdirSync(THEMES_DIR).filter((f) => f.endsWith('.json') && f !== 'themes-manifest.json').map((f) => path.join(THEMES_DIR, f))
  : parseArgs.filter((a) => !a.startsWith('--')).map((a) => path.resolve(a));

const families = (stack) =>
  String(stack || '')
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, '').toLowerCase())
    .filter(Boolean);

const results = [];
for (const file of files) {
  const id = path.basename(file, '.json');
  const entry = { theme: id, file, ok: true, errors: [] };
  try {
    const theme = JSON.parse(fs.readFileSync(file, 'utf8'));
    const dir = theme.direction || theme.tokens?.typography?.direction || 'rtl';
    if (dir === 'ltr' || LTR_IDS.has(id)) {
      entry.skipped = 'ltr';
      results.push(entry);
      continue;
    }
    const typography = theme.tokens?.typography || {};
    const heading = families(typography.headingFont);
    const body = families(typography.bodyFont);
    if (heading.length === 0) {
      entry.ok = false;
      entry.errors.push('tokens.typography.headingFont is missing');
    } else if (!ARABIC_CAPABLE.has(heading[0])) {
      entry.ok = false;
      entry.errors.push(
        `heading stack leads with "${heading[0]}" which has no Arabic glyphs — put an Arabic-capable family first (got: ${heading.join(', ')})`,
      );
    }
    if (!body.some((f) => ARABIC_CAPABLE.has(f))) {
      entry.ok = false;
      entry.errors.push(`body stack has no Arabic-capable family (got: ${body.join(', ')})`);
    }
  } catch (err) {
    entry.ok = false;
    entry.errors.push(`unreadable: ${err.message}`);
  }
  results.push(entry);
}

const failed = results.filter((r) => !r.ok);
if (asJson) {
  console.log(JSON.stringify({ ok: failed.length === 0, checked: results.length, failed: failed.length, results }, null, 2));
} else {
  for (const r of results) {
    if (r.ok) console.log(`PASS ${r.theme}`);
    else for (const e of r.errors) console.log(`FAIL ${r.theme} — ${e}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} theme(s) pass the Arabic-first typography gate.`);
}
process.exit(failed.length === 0 ? 0 : 1);
