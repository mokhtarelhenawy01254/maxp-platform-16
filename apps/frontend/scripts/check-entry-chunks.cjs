#!/usr/bin/env node
/* eslint-disable no-console */
// 🛡️ Entry-chunk purity guard.
//
// The HTML entry chunk must never statically import route chunks, and must
// stay small. A static edge entry → route-* forces the whole platform graph
// (HR, admin, WhatsApp, inbox, chart/export vendors, …) to download AND
// execute on every page load — including every public storefront visitor on
// <store>.maxp.online. This happened in Aug 2026: Rollup merged lazy-import
// re-export facades (and later whole pages) INTO the entry because Vite
// defaults app builds to preserveEntrySignatures: false, adding ~2.5MB to
// the storefront first load.
//
// Rules:
//  1. The entry chunk (the module <script> in dist/index.html) must not
//     statically import route-* chunks — except route-storefront-* and
//     route-auth-*, which are preloaded by design
//     (ADMIN_STARTUP_ROUTE_CHUNK_PATTERN in vite.config.ts).
//  1b. NO always-loaded chunk (any non-route-* chunk reachable from the
//     entry through the static import graph — entry, app-*, vendor-*, App,
//     AdminAppBootstrap, …) may statically import a route-* chunk. This
//     catches the Oct 2026 regression where the App chunk (loaded on every
//     page, public landings included) statically imported route-orders and
//     route-settings, dragging the whole admin graph (~3.5MB / 80 files)
//     onto every visitor's first load AFTER the entry purity check passed.
//  2. Size budget: a suddenly fat entry means Rollup started absorbing pages
//     into it again (its favourite hiding spot). Fail loudly instead of
//     shipping a slow storefront.
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '..', 'dist');
const ASSETS = path.join(DIST, 'assets');
const ENTRY_SCRIPT_RE = /<script[^>]+type="module"[^>]+src="\.?(\/assets\/[^"]+\.js)"/;
const SIZE_BUDGET_BYTES = 150 * 1024; // minified entry budget
const STATIC_IMPORT_RE = /from\s*["']\.\/([^"']+)["']/g;
const ALLOWED_ROUTE_CHUNK_PREFIXES = ['route-storefront-', 'route-auth-'];

const errors = [];

const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const entryMatch = html.match(ENTRY_SCRIPT_RE);
if (!entryMatch) {
  console.error('❌ Could not find the module entry <script> in dist/index.html.');
  process.exit(1);
}

const entryFile = entryMatch[1].replace(/^\//, '');
const entryPath = path.join(DIST, entryFile);
const source = fs.readFileSync(entryPath, 'utf8');

// Rule 1: no static imports of route chunks from the entry itself.
const targets = new Set();
let match;
while ((match = STATIC_IMPORT_RE.exec(source)) !== null) {
  targets.add(match[1]);
}

for (const target of targets) {
  if (!target.endsWith('.js')) continue; // css or other assets are fine
  const isRouteChunk = /^route-/.test(path.basename(target));
  const isAllowed = ALLOWED_ROUTE_CHUNK_PREFIXES.some((prefix) =>
    path.basename(target).startsWith(prefix),
  );
  if (isRouteChunk && !isAllowed) {
    errors.push(
      `  entry statically imports route chunk "${target}" — lazy-load it instead, or move the shared module out of the route chunk (see APP_SHARED_CORE / APP_I18N patterns in vite.config.ts).`,
    );
  }
}

// Rule 1b: the entry's transitive STATIC closure plus the shell chunks it
// reaches through dynamic import() edges (depth-capped at 2: entry →
// AdminAppBootstrap → App — the App chunk hosts the router and is loaded by
// AppRoot on every page) form the de-facto always-loaded set. None of them
// may statically import a route-* chunk (except the design-allowed
// prefixes). Route chunks themselves are neither audited nor expanded —
// they legitimately import each other, and their edges only load with
// their page. Deeper dynamic hops are page chunks (per-route), not
// always-loaded, so they are out of scope by design.
//
// This is exactly the Oct 2026 regression: the App chunk statically
// imported route-orders/route-settings AFTER the entry purity check passed.
const staticImportsOf = (code) => {
  const imports = new Set();
  const re = /from\s*["']\.\/([^"']+)["']/g;
  let m;
  while ((m = re.exec(code)) !== null) imports.add(m[1]);
  return imports;
};

const readChunk = (chunkFile) => {
  try {
    return fs.readFileSync(path.join(ASSETS, chunkFile), 'utf8');
  } catch {
    return null; // non-chunk asset referenced from CSS etc.
  }
};

const MAX_DYNAMIC_DEPTH = 2;
const isOpaqueChunk = (base) => /^(route-|storefront-)/.test(base);

const audited = new Set();
// queue items: [chunkFile, dynamicDepth]
const queue = [[path.basename(entryFile), 0]];
while (queue.length > 0) {
  const [chunk, depth] = queue.pop();
  if (audited.has(chunk) || isOpaqueChunk(chunk)) continue;
  audited.add(chunk);
  const code = readChunk(chunk);
  if (code === null) continue;
  for (const target of staticImportsOf(code)) {
    if (!target.endsWith('.js')) continue;
    queue.push([path.basename(target), depth]);
  }
  if (depth >= MAX_DYNAMIC_DEPTH) continue;
  const dynRe = /import\(\s*["']\.\/([^"']+)["']\s*\)/g;
  let m;
  while ((m = dynRe.exec(code)) !== null) {
    if (!m[1].endsWith('.js')) continue;
    queue.push([path.basename(m[1]), depth + 1]);
  }
}

for (const chunk of audited) {
  const code = readChunk(chunk);
  if (code === null) continue;
  for (const target of staticImportsOf(code)) {
    if (!target.endsWith('.js')) continue;
    const base = path.basename(target);
    const isRouteChunk = /^route-/.test(base);
    const isAllowed = ALLOWED_ROUTE_CHUNK_PREFIXES.some((prefix) =>
      base.startsWith(prefix),
    );
    if (isRouteChunk && !isAllowed) {
      errors.push(
        `  always-loaded chunk "${chunk}" statically imports route chunk "${target}" — every page (public landings included) downloads it. Make the edge lazy or move the shared module into a neutral app-* chunk (see APP_SHARED_CORE patterns in vite.config.ts).`,
      );
    }
  }
}

// Rule 2: size budget.
const sizeBytes = Buffer.byteLength(source);
if (sizeBytes > SIZE_BUDGET_BYTES) {
  errors.push(
    `  entry chunk is ${(sizeBytes / 1024).toFixed(0)}KB (budget ${(SIZE_BUDGET_BYTES / 1024).toFixed(0)}KB) — Rollup probably merged a page/component into the entry again. Inspect what dist/${entryFile} contains.`,
  );
}

if (errors.length > 0) {
  console.error(`❌ Entry chunk check failed (dist/${entryFile}):`);
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(
  `✅ Entry chunk is clean (${entryFile}, ${(sizeBytes / 1024).toFixed(0)}KB): no static route-chunk imports, within size budget.`,
);
