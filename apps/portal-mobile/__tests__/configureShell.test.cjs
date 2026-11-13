'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
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
  assert.equal(appJs.includes('/api/v1/app/version/android?app='), true);
  assert.equal(appJs.includes('checkAppUpdateNonBlocking'), true);
  assert.equal(appJs.includes('appUrlOpen'), true);
  assert.equal(appJs.includes('getLaunchUrl'), true);

  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'www', 'index.html'), 'utf8');
  assert.equal(indexHtml.includes('id="updateBanner"'), true);
  assert.equal(indexHtml.includes('id="updateDownloadLink"'), true);
  assert.equal(indexHtml.includes('id="updateDismissBtn"'), true);
});

function createMockElement(id) {
  const classes = new Set(
    id === 'updateBanner' || id === 'offlineBanner' || id === 'savedView' || id === 'statusMsg' || id === 'portalPickerWrap' || id === 'directPrimaryWrap'
      ? ['hidden']
      : [],
  );
  const attrs = {};
  const listeners = {};
  return {
    id,
    textContent: '',
    value: '',
    disabled: false,
    innerHTML: '',
    children: [],
    parentElement: { classList: { add() {}, remove() {} } },
    style: { setProperty() {} },
    classList: {
      add(c) { classes.add(c); },
      remove(c) { classes.delete(c); },
      contains(c) { return classes.has(c); },
    },
    setAttribute(k, v) { attrs[k] = String(v); },
    getAttribute(k) { return attrs[k]; },
    addEventListener(ev, fn) { (listeners[ev] ||= []).push(fn); },
    trigger(ev) { (listeners[ev] || []).forEach((fn) => fn({ preventDefault() {} })); },
    appendChild(child) { this.children.push(child); },
    focus() {},
  };
}

test('www/app.js non-blocking version banner shows on newer https release, dismisses, and ignores errors silently', async () => {
  const appJs = fs.readFileSync(path.join(ROOT_DIR, 'www', 'app.js'), 'utf8');
  const sizeBytes = getDirectorySizeBytes(path.join(ROOT_DIR, 'www'));
  assert.ok(sizeBytes < 80 * 1024, `www/ size (${sizeBytes} B) must stay < 80 KB`);

  async function runScenario(versionResponseImpl) {
    const ids = [
      'metaThemeColor', 'offlineBanner', 'retryBtn', 'updateBanner', 'updateTitle',
      'updateDownloadLink', 'updateDismissBtn', 'savedView', 'savedAvatar', 'savedCodeBadge',
      'savedTitle', 'savedSubtitle', 'openSavedBtn', 'switchTenantBtn', 'connectView',
      'flavorBadge', 'appTitle', 'appSubtitle', 'directPrimaryWrap', 'directPrimaryBtn',
      'lookupForm', 'lookupInput', 'lookupBtn', 'portalPickerWrap', 'portalPills',
      'statusMsg', 'resultsList', 'directFallbackBtn',
    ];
    const elements = Object.fromEntries(ids.map((id) => [id, createMockElement(id)]));
    const windowObj = {
      location: { search: '', replace() {} },
      localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
      addEventListener() {},
      Capacitor: null,
    };
    const sandbox = {
      window: windowObj,
      document: {
        title: '',
        documentElement: { style: { setProperty() {} } },
        getElementById(id) { return elements[id] || null; },
        createElement(tag) { return createMockElement(tag); },
      },
      navigator: { onLine: true },
      AbortController,
      URL,
      URLSearchParams,
      setTimeout,
      clearTimeout,
      encodeURIComponent,
      fetch: async (url) => {
        if (url === 'shell-config.json') {
          return {
            ok: true,
            json: async () => ({
              flavor: 'portal',
              appKey: 'portal',
              versionCode: 1,
              portals: [{ key: 'parent', label: 'ولي الأمر', loginPath: '/parent/login' }],
            }),
          };
        }
        if (String(url).includes('/api/v1/app/version/android?app=portal')) {
          return versionResponseImpl();
        }
        throw new Error('Unexpected fetch: ' + url);
      },
    };
    sandbox.window.window = sandbox.window;
    vm.runInNewContext(appJs, sandbox);
    await new Promise((r) => setTimeout(r, 30));
    return elements;
  }

  // Case 1: newer version with https:// URL shows banner and dismiss button hides it
  const el1 = await runScenario(async () => ({
    ok: true,
    json: async () => ({
      data: {
        latestVersionCode: 3,
        latestVersionName: '1.3.0',
        apkDownloadUrl: 'https://maxp.online/downloads/portal-v1.3.0.apk',
      },
    }),
  }));
  assert.equal(el1.updateBanner.classList.contains('hidden'), false);
  assert.equal(el1.updateTitle.textContent, 'تحديث متاح v1.3.0');
  assert.equal(el1.updateDownloadLink.getAttribute('href'), 'https://maxp.online/downloads/portal-v1.3.0.apk');
  el1.updateDismissBtn.trigger('click');
  assert.equal(el1.updateBanner.classList.contains('hidden'), true);

  // Case 2: network failure silently ignored without touching statusMsg
  const el2 = await runScenario(async () => {
    throw new Error('Network down');
  });
  assert.equal(el2.updateBanner.classList.contains('hidden'), true);
  assert.equal(el2.statusMsg.textContent, '');
  assert.equal(el2.statusMsg.classList.contains('hidden'), true);

  // Case 3: non-https URL rejected silently
  const el3 = await runScenario(async () => ({
    ok: true,
    json: async () => ({
      latestVersionCode: 5,
      latestVersionName: '2.0.0',
      apkDownloadUrl: 'http://insecure.example.com/app.apk',
    }),
  }));
  assert.equal(el3.updateBanner.classList.contains('hidden'), true);
});

test('CLI configure and --verify work end-to-end', () => {
  const scriptPath = path.join(ROOT_DIR, 'scripts', 'configure-shell.cjs');
  const outConfig = execFileSync(process.execPath, [scriptPath, '--flavor=parent'], { encoding: 'utf8' });
  assert.match(outConfig, /Configured flavor="parent"/);

  const outVerify = execFileSync(process.execPath, [scriptPath, '--verify'], { encoding: 'utf8' });
  assert.match(outVerify, /\[verify:shell\] PASS/);
});

test('verifyShell catches missing splash or mipmap resources', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'maxp-portal-res-'));
  try {
    fs.mkdirSync(path.join(tempRoot, 'www'), { recursive: true });
    for (const file of ['index.html', 'styles.css', 'app.js', 'icon.svg']) {
      fs.writeFileSync(path.join(tempRoot, 'www', file), 'ok', 'utf8');
    }
    configureShell('parent', { rootDir: tempRoot });
    const report = verifyShell({ rootDir: tempRoot });
    assert.equal(report.ok, false);
    assert.ok(report.errors.some((e) => e.includes('res/drawable/splash.png')));
    assert.ok(report.errors.some((e) => e.includes('res/mipmap-xxxhdpi/ic_launcher_foreground.png')));
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
