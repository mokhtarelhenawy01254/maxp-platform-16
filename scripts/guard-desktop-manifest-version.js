#!/usr/bin/env node
/**
 * CI Guard: the latest.yml produced by electron-builder must declare the same
 * version as apps/desktop/package.json. A stale manifest is exactly what made
 * the desktop app report "another version" and never update.
 *
 * Usage:
 *   node scripts/guard-desktop-manifest-version.js [--manifest <path>] [--package <path>]
 */

const fs = require('fs');
const path = require('path');

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i === -1 ? dflt : process.argv[i + 1];
}

const root = path.resolve(__dirname, '..');
const manifestPath = path.resolve(root, arg('manifest', 'apps/desktop/release/latest.yml'));
const packagePath = path.resolve(root, arg('package', 'apps/desktop/package.json'));

function fail(msg) {
  console.error('❌ CI GUARD FAILED: ' + msg);
  process.exit(1);
}

if (!fs.existsSync(packagePath)) fail(`package.json not found: ${packagePath}`);

let packageVersion = '';
try {
  packageVersion = String(JSON.parse(fs.readFileSync(packagePath, 'utf8')).version || '').trim();
} catch (e) {
  fail(`cannot parse ${packagePath}: ${e.message}`);
}
if (!packageVersion) fail(`no version field in ${packagePath}`);

if (!fs.existsSync(manifestPath)) {
  fail(`update manifest not found: ${manifestPath} — electron-builder did not generate latest.yml`);
}

const raw = fs.readFileSync(manifestPath, 'utf8');
const match = raw.match(/^version:\s*['"]?([^'"\r\n]+?)['"]?\s*$/m);
const manifestVersion = match ? match[1].trim() : '';

if (!manifestVersion) fail(`no "version:" line in ${manifestPath}`);

if (manifestVersion !== packageVersion) {
  fail(
    `latest.yml version (${manifestVersion}) != apps/desktop/package.json version (${packageVersion}). ` +
      'Bump apps/desktop/package.json (or rebuild the installer) so the published manifest matches the repo.'
  );
}

if (!/^files:/m.test(raw)) {
  fail(`latest.yml has no "files:" section (${manifestPath}) — updater metadata is incomplete`);
}

console.log(`✅ Manifest guard passed: latest.yml version ${manifestVersion} == package.json version ${packageVersion}`);
