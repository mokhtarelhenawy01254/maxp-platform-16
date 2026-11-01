#!/usr/bin/env node
/**
 * Guard: Prevent installer manifests or binaries from existing in apps/frontend/public.
 * If manifests like latest.yml or latest-android.json are placed in public/,
 * Vite builds them into dist/ and poisons the independent /var/www/maxp-downloads store.
 */

const fs = require('fs');
const path = require('path');

const publicDir = path.resolve(__dirname, '../apps/frontend/public');

if (!fs.existsSync(publicDir)) {
  console.log('✅ apps/frontend/public does not exist, guard passed.');
  process.exit(0);
}

const FORBIDDEN_PATTERNS = [
  /^latest.*\.ya?ml$/i,
  /^latest.*\.json$/i,
  /\.exe$/i,
  /\.apk$/i,
  /\.blockmap$/i,
];

const FORBIDDEN_DIRS = ['download', 'downloads'];

const violations = [];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(publicDir, fullPath);

    if (entry.isDirectory()) {
      if (FORBIDDEN_DIRS.includes(entry.name.toLowerCase())) {
        violations.push(`Forbidden directory found in public/: ${relPath}`);
      }
      scanDir(fullPath);
    } else if (entry.isFile()) {
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(entry.name)) {
          violations.push(`Forbidden manifest/binary found in public/: ${relPath}`);
          break;
        }
      }
    }
  }
}

scanDir(publicDir);

if (violations.length > 0) {
  console.error('❌ CI GUARD FAILED: Forbidden download manifests or binaries detected in apps/frontend/public!');
  console.error('   Manifests must only be hosted directly in /var/www/maxp-downloads outside frontend dist.');
  violations.forEach((v) => console.error(`   - ${v}`));
  process.exit(1);
}

console.log('✅ Guard passed: No forbidden download manifests or binaries in apps/frontend/public.');
process.exit(0);
