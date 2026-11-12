#!/usr/bin/env node
/**
 * Post-deploy guard: the manifest actually served on maxp.online must never be
 * older than the version in apps/desktop/package.json. If a site deploy wipes
 * the updater manifest again, this fails the deploy (or the release) loudly.
 *
 * Usage:
 *   node scripts/guard-desktop-published-version.js --url https://maxp.online/downloads/latest.yml \
 *     --expect 1.0.102 [--retries 6] [--delay 5000]
 */

const https = require('https');
const http = require('http');

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i === -1 ? dflt : process.argv[i + 1];
}
const url = arg('url', 'https://maxp.online/downloads/latest.yml');
const expect = String(arg('expect', '')).trim();
const retries = parseInt(arg('retries', '1'), 10);
const delay = parseInt(arg('delay', '5000'), 10);

function parseVersion(v) {
  return String(v || '')
    .trim()
    .replace(/^v/i, '')
    .split('.')
    .map((p) => parseInt(p, 10) || 0);
}
function cmp(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

function fetchOnce(target, redirects = 0) {
  return new Promise((resolve, reject) => {
    const mod = target.startsWith('http://') ? http : https;
    const req = mod.get(
      target,
      { timeout: 20000, headers: { 'User-Agent': 'MaxP-CI-ManifestGuard/1.0', 'Cache-Control': 'no-cache' } },
      (res) => {
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 3) {
          res.resume();
          return resolve(fetchOnce(new URL(res.headers.location, target).toString(), redirects + 1));
        }
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

(async () => {
  let lastErr = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetchOnce(url);
      if (res.status !== 200) throw new Error(`HTTP ${res.status} from ${url}`);
      const m = res.body.match(/^version:\s*['"]?([^'"\r\n]+?)['"]?\s*$/m);
      const published = m ? m[1].trim() : '';
      if (!published) throw new Error(`no version: line in ${url}`);
      if (expect && cmp(published, expect) < 0) {
        console.error(
          `❌ POST-DEPLOY GUARD FAILED: published manifest version ${published} is older than repo version ${expect} (${url}). ` +
            'The website deploy wiped or shadowed the desktop update manifest.'
        );
        process.exit(1);
      }
      console.log(`✅ Published manifest OK: version ${published} (repo ${expect || 'n/a'}) at ${url}`);
      process.exit(0);
    } catch (e) {
      lastErr = e;
      console.error(`⚠️ attempt ${attempt}/${retries} failed: ${e.message}`);
      if (attempt < retries) await new Promise((r) => setTimeout(r, delay));
    }
  }
  console.error(`❌ POST-DEPLOY GUARD FAILED: could not verify ${url}: ${lastErr && lastErr.message}`);
  process.exit(1);
})();
