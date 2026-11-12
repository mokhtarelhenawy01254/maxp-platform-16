'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  FLAVORS,
  MAX_WWW_SIZE_BYTES,
  HARD_GATE_WWW_SIZE_BYTES,
  configureShell,
  getDirectorySizeBytes,
  verifyShell,
} = require('../scripts/configure-shell.cjs');

const ROOT_DIR = path.resolve(__dirname, '..');

test('all 4 flavors match exact appId, appName, and accentColor specs', () => {
  assert.deepEqual(Object.keys(FLAVORS), ['parent', 'portal', 'courier', 'customer']);

  assert.equal(FLAVORS.parent.appId, 'online.maxp.parent');
  assert.equal(FLAVORS.parent.appName, 'بوابة ولي الأمر - MaxP');
  assert.equal(FLAVORS.parent.accentColor, '#059669');

  assert.equal(FLAVORS.portal.appId, 'online.maxp.portal');
  assert.equal(FLAVORS.portal.appName, 'بوابات MaxP');
  assert.equal(FLAVORS.portal.accentColor, '#4f46e5');

  assert.equal(FLAVORS.courier.appId, 'online.maxp.courier');
  assert.equal(FLAVORS.courier.appName, 'مندوب ماكس بي');
  assert.equal(FLAVORS.courier.accentColor, '#0284c7');

  assert.equal(FLAVORS.customer.appId, 'online.maxp.customer');
  assert.equal(FLAVORS.customer.appName, 'ماكس بي للشحن والعملاء');
  assert.equal(FLAVORS.customer.accentColor, '#0f172a');
});

test('www/ bundle stays lightweight (< 80 KB target & < 150 KB hard gate) with zero dist/', () => {
  assert.equal(fs.existsSync(path.join(ROOT_DIR, 'dist')), false, 'dist/ must not exist');
  const size = getDirectorySizeBytes(path.join(ROOT_DIR, 'www'));
  assert.ok(size > 0, 'www/ must not be empty');
  assert.ok(size < MAX_WWW_SIZE_BYTES, `www/ size (${size} B) must be < ${MAX_WWW_SIZE_BYTES} B`);
  assert.ok(size < HARD_GATE_WWW_SIZE_BYTES, `www/ size (${size} B) must be < ${HARD_GATE_WWW_SIZE_BYTES} B`);
});

test('configureShell generates valid config for every flavor in isolated temp root', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'maxp-portal-shell-'));
  try {
    fs.mkdirSync(path.join(tempRoot, 'www'), { recursive: true });
    fs.writeFileSync(path.join(tempRoot, 'www', 'index.html'), '<html></html>', 'utf8');

    for (const key of Object.keys(FLAVORS)) {
      const result = configureShell(key, { rootDir: tempRoot });
      assert.equal(result.flavor, key);

      const rootCap = JSON.parse(fs.readFileSync(path.join(tempRoot, 'capacitor.config.json'), 'utf8'));
      const assetCap = JSON.parse(
        fs.readFileSync(path.join(tempRoot, 'android', 'app', 'src', 'main', 'assets', 'capacitor.config.json'), 'utf8'),
      );
      const shellCfg = JSON.parse(fs.readFileSync(path.join(tempRoot, 'www', 'shell-config.json'), 'utf8'));

      for (const cap of [rootCap, assetCap]) {
        assert.equal(cap.appId, FLAVORS[key].appId);
        assert.equal(cap.appName, FLAVORS[key].appName);
        assert.equal(cap.webDir, 'www');
        assert.equal(cap.server.url, undefined);
        assert.equal(cap.server.androidScheme, 'https');
        assert.equal(cap.server.errorPath, 'index.html');
        assert.deepEqual(cap.server.allowNavigation, ['maxp.online', '*.maxp.online']);
        assert.equal(cap.android.appendUserAgent, 'MaxP-Native-Android MaxP-Portal-Shell/1.0.0');
      }

      assert.equal(shellCfg.flavor, key);
      assert.equal(shellCfg.accentColor, FLAVORS[key].accentColor);
      assert.equal(fs.existsSync(path.join(tempRoot, 'android', 'app', 'src', 'main', 'assets', 'public', 'index.html')), true);
    }

    const withOverride = configureShell('courier', {
      rootDir: tempRoot,
      serverUrl: 'https://staging.maxp.online/courier-portal',
    });
    assert.equal(withOverride.capJson.server.url, 'https://staging.maxp.online/courier-portal');
    assert.throws(() => configureShell('invalid-flavor', { rootDir: tempRoot }), /Unknown flavor/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('verifyShell passes full static checks on apps/portal-mobile', () => {
  // Ensure default parent config is materialized first
  configureShell('parent', { rootDir: ROOT_DIR });
  const report = verifyShell({ rootDir: ROOT_DIR });
  assert.deepEqual(report.errors, []);
  assert.equal(report.ok, true);
});

test('package.json, capacitor.config.ts, AndroidManifest.xml, and www/app.js satisfy invariants', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  for (const dep of ['@capacitor/core', '@capacitor/android', '@capacitor/app', '@capacitor/preferences', '@capacitor/push-notifications']) {
    assert.ok(pkg.dependencies[dep], `Missing dependency ${dep}`);
  }
  assert.ok(pkg.devDependencies['@capacitor/cli'], 'Missing devDependency @capacitor/cli');

  const manifest = fs.readFileSync(
    path.join(ROOT_DIR, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'),
    'utf8',
  );
  assert.equal(manifest.includes('CALL_PHONE'), false);
  assert.equal(manifest.includes('READ_PHONE_STATE'), false);
  assert.equal(manifest.includes('SYSTEM_ALERT_WINDOW'), false);
  assert.equal(manifest.includes('android:autoVerify="true"'), true);

  const capTs = fs.readFileSync(path.join(ROOT_DIR, 'capacitor.config.ts'), 'utf8');
  assert.equal(capTs.includes("webDir: 'www'"), true);
  assert.equal(capTs.includes('MaxP-Native-Android'), true);

  const appJs = fs.readFileSync(path.join(ROOT_DIR, 'www', 'app.js'), 'utf8');
  assert.equal(appJs.includes('maxp_portal_tenant_v1'), true);
  assert.equal(appJs.includes('/api/v1/public/portal/lookup'), true);
  assert.equal(appJs.includes('appUrlOpen'), true);
  assert.equal(appJs.includes('getLaunchUrl'), true);
});

test('CLI configure and --verify work end-to-end', () => {
  const scriptPath = path.join(ROOT_DIR, 'scripts', 'configure-shell.cjs');
  const outConfig = execFileSync(process.execPath, [scriptPath, '--flavor=parent'], { encoding: 'utf8' });
  assert.match(outConfig, /Configured flavor="parent"/);

  const outVerify = execFileSync(process.execPath, [scriptPath, '--verify'], { encoding: 'utf8' });
  assert.match(outVerify, /\[verify:shell\] PASS/);
});
