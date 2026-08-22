#!/usr/bin/env node
/* eslint-disable no-console */
// Gate: every icon imported from @heroicons/react must exist in the installed
// package version. Catches v1-era names (e.g. Loader2Icon) or lucide-only
// names (e.g. PackageSearchIcon) at build-gate time instead of failing the
// vite build ~5 minutes later on CI.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STYLES = ['outline', 'solid', 'mini', 'micro'];

function readExports(style) {
  const esmIndex = path.join(ROOT, 'node_modules', '@heroicons', 'react', '24', style, 'esm', 'index.js');
  const plainIndex = path.join(ROOT, 'node_modules', '@heroicons', 'react', '24', style, 'index.js');
  for (const candidate of [esmIndex, plainIndex]) {
    if (!fs.existsSync(candidate)) continue;
    const source = fs.readFileSync(candidate, 'utf8');
    return new Set([...source.matchAll(/export\s*\{[^}]*?as\s+(\w+)[^}]*\}/g)].map(m => m[1]));
  }
  return null;
}

const availableByStyle = {};
let anyIndexFound = false;
for (const style of STYLES) {
  const exports = readExports(style);
  if (exports) {
    availableByStyle[style] = exports;
    anyIndexFound = true;
  }
}
if (!anyIndexFound) {
  console.error('❌ check-heroicons: could not read any @heroicons/react index file — is the package installed?');
  process.exit(1);
}

function collectFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const importRe = /import\s*(?:type\s+)?\{([^}]*)\}\s*from\s*['"]@heroicons\/react(?:\/24\/(outline|solid|mini|micro))?['"]/g;
const errors = [];
let filesChecked = 0;

for (const file of collectFiles(path.join(ROOT, 'src'))) {
  const source = fs.readFileSync(file, 'utf8');
  let m;
  let hasMatch = false;
  while ((m = importRe.exec(source)) !== null) {
    hasMatch = true;
    const style = m[2] || 'outline';
    const available = availableByStyle[style];
    if (!available) continue; // style index missing — npm install issue, not a code error
    for (const part of m[1].split(',')) {
      const original = part.trim().split(/\s+as\s+/)[0].trim();
      if (!original || original === 'type') continue;
      if (!available.has(original)) {
        const rel = path.relative(ROOT, file);
        errors.push(`${rel}: "${original}" is not exported by @heroicons/react/24/${style}`);
      }
    }
  }
  if (hasMatch) filesChecked++;
}

if (errors.length > 0) {
  console.error(`❌ ${errors.length} invalid @heroicons import(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error('Fix: use a name that exists in the installed version (heroicons v2 renamed v1 icons, e.g. Loader2Icon → ArrowPathIcon).');
  process.exit(1);
}

console.log(`✅ All @heroicons/react imports valid across ${filesChecked} files`);
