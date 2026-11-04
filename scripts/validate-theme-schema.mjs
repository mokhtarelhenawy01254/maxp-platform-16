#!/usr/bin/env node
/**
 * Storefront theme — strict JSON-Schema gate (task 120-day01).
 *
 *   node scripts/validate-theme-schema.mjs apps/frontend/src/storefront/themes/<slug>.json
 *   node scripts/validate-theme-schema.mjs --all
 *
 * The task brief spells the gate as `npx ajv validate -s schemas/theme.schema.json -d <file>`.
 * `ajv-cli` is not installed in this repo (and CI must not download tools at run time), so this
 * wrapper runs the SAME `ajv` library that ships in apps/frontend/node_modules against the same
 * schema file. Output is compatible with a human reading and with `--json`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCHEMA_PATH = path.join(ROOT, 'schemas/theme.schema.json');
const THEMES_DIR = path.join(ROOT, 'apps/frontend/src/storefront/themes');

const requireFromApp = createRequire(path.join(ROOT, 'apps/frontend/package.json'));
const Ajv = requireFromApp('ajv');

const ajv = new Ajv({ allErrors: true, strict: false });
const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
const validate = ajv.compile(schema);

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
  console.error('usage: node scripts/validate-theme-schema.mjs <theme.json> [...] | --all [--json]');
  process.exit(2);
}

const results = [];
for (const file of targets) {
  const name = path.basename(file);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    results.push({ file: name, ok: false, errors: [{ path: '', message: `invalid JSON: ${error.message}` }] });
    continue;
  }

  if (Array.isArray(data)) {
    // themes-manifest.json lives in the same folder but is the catalog manifest, not a theme.
    results.push({ file: name, ok: true, skipped: 'manifest' });
    continue;
  }

  const ok = validate(data);
  results.push({
    file: name,
    ok: Boolean(ok),
    errors: ok
      ? []
      : (validate.errors || []).map((error) => ({
          path: error.dataPath || '/',
          message: `${error.message}${error.params ? ' ' + JSON.stringify(error.params) : ''}`,
        })),
  });
}

if (asJson) {
  console.log(JSON.stringify({ results, failed: results.filter((r) => !r.ok).length }, null, 2));
} else {
  for (const result of results) {
    if (result.ok) {
      console.log(result.skipped ? `SKIP ${result.file} (${result.skipped})` : `PASS ${result.file}`);
      continue;
    }
    console.log(`FAIL ${result.file}`);
    result.errors.slice(0, 12).forEach((error) => console.log(`  - ${error.path} ${error.message}`));
  }
}

const failed = results.filter((result) => !result.ok);
if (failed.length > 0) {
  console.error(`\n${failed.length} of ${results.length} theme(s) failed the schema gate.`);
  process.exit(1);
}
