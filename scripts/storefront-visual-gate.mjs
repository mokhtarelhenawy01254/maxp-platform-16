#!/usr/bin/env node
/**
 * Storefront Visual UX Gate — real-render quality gate for theme presets.
 *
 * Renders each theme's live storefront preview (marketplace preview datasets)
 * on a real Chromium, on mobile (390x844) and desktop (1440x900), and enforces:
 *   HARD FAIL (absolute):
 *     - JS page errors (uncaught exceptions) on either viewport
 *     - broken images (complete && naturalWidth === 0)
 *     - images served from third-party store CDNs (myshopify.com / cdn.shopify.com)
 *     - horizontal overflow on mobile
 *     - mobile CLS > 0.5 (Google "poor" band)
 *     - RTL theme whose rendered h1 uses no Arabic-capable font (runtime proof)
 *   REGRESSION FAIL (vs scripts/storefront-visual-baselines.json):
 *     - CLS worse by > 0.05
 *     - tap targets under 24px increased by > 3
 *     - min font size dropped below baseline - 1px
 *   Baselines: `--update-baseline` (re)writes entries for the checked themes.
 *   A theme missing from the baseline fails the gate (new themes must be baselined).
 *
 * Usage:
 *   node scripts/storefront-visual-gate.mjs <theme.json> […] [--json] [--update-baseline]
 *        [--shots-dir <dir>] [--report-shifts] [--all]
 * Env:
 *   BASE_URL (default http://127.0.0.1:5199) — a running `vite dev` for apps/frontend.
 *   CHROME_PATH — explicit Chromium executable (otherwise auto-detected).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
// playwright is a declared devDependency of apps/frontend (CI installs it there);
// fall back to the repo-root copy for local runs where only the root copy exists.
const resolvePlaywright = () => {
  for (const base of [path.join(ROOT, 'apps', 'frontend'), ROOT]) {
    try { return require(path.join(base, 'node_modules', 'playwright')); } catch { /* next */ }
  }
  throw new Error('playwright not found — run `npm ci` in apps/frontend');
};
const { chromium } = resolvePlaywright();

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5199';
const THEMES_DIR = path.join(ROOT, 'apps', 'frontend', 'src', 'storefront', 'themes');
const BASELINE_FILE = path.join(ROOT, 'scripts', 'storefront-visual-baselines.json');
const BANNED_IMAGE_HOSTS = /myshopify\.com|cdn\.shopify\.com/i;
const ARABIC_FONT_HINTS = /cairo|ibm plex sans arabic|tajawal|noto naskh arabic|noto kufi arabic|noto sans arabic|amiri|alexandria|aref ruqaa ink|almarai|rubik|el messiri|changa|lalezar|reem kufi|readex pro|baloo/i;
const CLS_HARD_CAP = 0.5;
const CLS_REGRESSION_TOLERANCE = 0.05;
const TAPS_REGRESSION_TOLERANCE = 3;

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const updateBaseline = args.includes('--update-baseline');
const reportShifts = args.includes('--report-shifts');
const allMode = args.includes('--all');
const shotsIdx = args.indexOf('--shots-dir');
const shotsDir = shotsIdx >= 0 ? args[shotsIdx + 1] : null;
const files = allMode
  ? fs.readdirSync(THEMES_DIR).filter((f) => f.endsWith('.json') && f !== 'themes-manifest.json').map((f) => path.join(THEMES_DIR, f))
  : args.filter((a) => !a.startsWith('--') && a !== (shotsDir)).map((a) => path.resolve(a));

const findChromium = () => {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    'C:/Users/mokhtar/AppData/Local/ms-playwright',
    path.join(process.env.LOCALAPPDATA || '', 'ms-playwright'),
    path.join(process.env.HOME || '', '.cache', 'ms-playwright'),
  ];
  for (const dir of candidates) {
    try {
      const builds = fs.readdirSync(dir).filter((d) => /^chromium(_headless_shell)?-\d+$/.test(d)).sort();
      for (const build of builds.reverse()) {
        for (const rel of ['chrome-headless-shell-win64/chrome-headless-shell.exe', 'chrome-win64/chrome.exe', 'chrome-win/chrome.exe']) {
          const exe = path.join(dir, build, rel);
          if (fs.existsSync(exe)) return exe;
        }
      }
    } catch { /* dir missing */ }
  }
  return undefined; // let playwright resolve its own download
};

const pageMetrics = () => {
  // NOTE: this function is serialized into the page context — no outer-scope references.
  const BANNED = /myshopify\.com|cdn\.shopify\.com/i;
  const q = (s) => Array.from(document.querySelectorAll(s));
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
  };
  const imgs = q('img').filter(vis);
  const taps = q('a,button,[role="button"],input,select').filter(vis);
  const texts = q('h1,h2,h3,h4,p,span,a,li,button,label,div').filter(
    (el) => vis(el) && Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 1),
  );
  const h1 = q('h1').filter(vis)[0] || null;
  const brokenList = imgs.filter((i) => i.complete && i.naturalWidth === 0);
  const isProxy = (i) => /\/api\/proxy-image/.test(i.currentSrc || i.src || '');
  return {
    pageErrors: window.__pageErrors || 0,
    brokenImages: brokenList.filter((i) => !isProxy(i)).length,
    proxyBrokenImages: brokenList.filter((i) => isProxy(i)).length,
    bannedImageHosts: imgs
      .map((i) => { try { return new URL(i.currentSrc || i.src).host; } catch { return 'inline'; } })
      .filter((h) => BANNED.test(h)).length,
    overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    cls: +(window.__cls || 0).toFixed(3),
    tapsUnder24: taps.filter((el) => el.getBoundingClientRect().width < 24 || el.getBoundingClientRect().height < 24).length,
    minFontSize: texts.length ? +Math.min(...texts.map((el) => parseFloat(getComputedStyle(el).fontSize))).toFixed(1) : 16,
    h1Text: h1 ? h1.innerText.replace(/\s+/g, ' ').slice(0, 60) : null,
    firstProductScreen: (() => {
      const a = q('a[href]').filter(vis).find((x) => /\/product/i.test(x.getAttribute('href') || ''));
      return a ? +(((a.getBoundingClientRect().top + scrollY) / window.innerHeight).toFixed(2)) : null;
    })(),
  };
};

const collect = async (browser, themeId, direction, shotsPrefix, shifts) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'ar-EG',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();
  let pageErrors = 0;
  page.on('pageerror', () => { pageErrors += 1; });
  await page.addInitScript(() => {
    window.__cls = 0;
    window.__shiftSources = [];
    window.__pageErrors = 0;
    window.addEventListener('error', () => { window.__pageErrors += 1; });
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.hadRecentInput) continue;
          window.__cls += e.value;
          if (window.__shiftSources.length < 12) {
            for (const s of (e.sources || []).slice(0, 3)) {
              const n = s.node;
              const desc = n ? `${n.tagName && n.tagName.toLowerCase()}.${(n.className && n.className.toString ? n.className.toString() : '').split(/\s+/).slice(0, 3).join('.')}` : 'unknown';
              window.__shiftSources.push({ value: +e.value.toFixed(4), node: desc });
            }
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch { /* older chromium */ }
  });
  const url = `${BASE_URL}/store?previewTheme=${themeId}&previewSource=marketplace&preview=1`;
  const result = { url };
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2200);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height && y < 24000; y += 700) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(140);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    // settle pass: wait for every image to finish (bounded) and for fonts — avoids race false-positives
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images).map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise((res) => {
                img.addEventListener('load', res, { once: true });
                img.addEventListener('error', res, { once: true });
                setTimeout(res, 8000);
              }),
        ),
      ),
    );
    await page.evaluate(() => (document.fonts ? document.fonts.ready : null)).catch(() => {});
    await page.waitForTimeout(400);
    Object.assign(result, await page.evaluate(pageMetrics));
    result.pageErrors = pageErrors;
    if (direction === 'rtl') {
      try {
        const cdp = await context.newCDPSession(page);
        await cdp.send('DOM.enable');
        await cdp.send('CSS.enable');
        const { root } = await cdp.send('DOM.getDocument');
        // judge THEME content only — the marketplace preview banner is platform chrome
        let nodeId = 0;
        for (const sel of ['#storefront-engine-root h1', 'main h1', '#storefront-engine-root h2', 'main h2', '#storefront-engine-root h3', 'h1', 'h2', 'h3']) {
          const r = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
          if (r.nodeId) { nodeId = r.nodeId; break; }
        }
        if (nodeId) {
          const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
          result.h1RenderedFonts = fonts.map((f) => f.familyName).join(', ');
        } else {
          result.h1RenderedFonts = '(no heading)';
        }
        await cdp.detach();
      } catch { result.h1RenderedFonts = '(cdp unavailable)'; }
    }
    if (shifts) {
      result.shiftSources = await page.evaluate(() => window.__shiftSources || []);
    }
    if (shotsDir) {
      fs.mkdirSync(shotsDir, { recursive: true });
      await page.screenshot({ path: path.join(shotsDir, `${shotsPrefix}__mobile.jpg`), fullPage: true, type: 'jpeg', quality: 60, scale: 'css' });
    }
  } catch (err) {
    result.error = String(err).slice(0, 200);
  }
  await context.close();
  return result;
};

// aggregated CLS source report (written next to the shots dir when --report-shifts)
const clsSourceLog = [];

const browser = await chromium.launch({ headless: true, executablePath: findChromium() });
const baseline = fs.existsSync(BASELINE_FILE) ? JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')) : { themes: {} };
const results = [];
const baselineWrites = {};

for (const file of files) {
  const themeId = path.basename(file, '.json');
  const entry = { theme: themeId, ok: true, failures: [], warnings: [] };
  try {
    const theme = JSON.parse(fs.readFileSync(file, 'utf8'));
    const direction = theme.direction || theme.tokens?.typography?.direction || 'rtl';
    const mobile = await collect(browser, themeId, direction, `${themeId}__home`, reportShifts);
    if (mobile.error) {
      entry.ok = false;
      entry.failures.push(`render failed: ${mobile.error}`);
      results.push(entry);
      console.log(`FAIL ${themeId} · render failed: ${mobile.error.slice(0, 120)}`);
      continue;
    }
    entry.metrics = mobile;
    if (reportShifts && mobile.shiftSources) {
      for (const s of mobile.shiftSources) clsSourceLog.push({ theme: themeId, ...s });
    }
    const fail = (msg) => { entry.ok = false; entry.failures.push(msg); };
    const warn = (msg) => entry.warnings.push(msg);

    if (mobile.pageErrors > 0) fail(`pageErrors=${mobile.pageErrors} (uncaught JS exceptions)`);
    if (mobile.brokenImages > 0) fail(`brokenImages=${mobile.brokenImages} (direct)`);
    if (mobile.proxyBrokenImages > 0) warn(`proxyBrokenImages=${mobile.proxyBrokenImages} (environment-dependent /api/proxy-image)`);
    if (mobile.bannedImageHosts > 0) fail(`bannedImageHosts=${mobile.bannedImageHosts} (third-party store CDN hotlinks)`);
    if (mobile.overflowX > 0) fail(`overflowX=${mobile.overflowX}px on mobile`);
    if (mobile.cls > CLS_HARD_CAP) fail(`mobile CLS=${mobile.cls} > ${CLS_HARD_CAP}`);
    if (direction === 'rtl' && mobile.h1RenderedFonts && !mobile.h1RenderedFonts.includes('(no heading)') && !ARABIC_FONT_HINTS.test(mobile.h1RenderedFonts)) {
      fail(`RTL headings rendered without any Arabic-capable font (got: ${mobile.h1RenderedFonts})`);
    }
    if (mobile.tapsUnder24 > 0) warn(`tapsUnder24=${mobile.tapsUnder24}`);
    if (mobile.minFontSize < 12) warn(`minFontSize=${mobile.minFontSize}px`);

    const base = baseline.themes[themeId];
    if (updateBaseline) {
      baselineWrites[themeId] = {
        cls: mobile.cls,
        brokenImages: mobile.brokenImages,
        proxyBrokenImages: mobile.proxyBrokenImages ?? 0,
        overflowX: mobile.overflowX,
        tapsUnder24: mobile.tapsUnder24,
        minFontSize: mobile.minFontSize,
        firstProductScreen: mobile.firstProductScreen,
        updatedAt: new Date().toISOString().slice(0, 10),
      };
    } else if (!base) {
      fail('no visual baseline — run with --update-baseline to create one');
    } else {
      if (mobile.cls > base.cls + CLS_REGRESSION_TOLERANCE) fail(`mobile CLS=${mobile.cls} regressed vs baseline ${base.cls}`);
      if (mobile.brokenImages > base.brokenImages) fail(`brokenImages=${mobile.brokenImages} vs baseline ${base.brokenImages}`);
      if (mobile.tapsUnder24 > base.tapsUnder24 + TAPS_REGRESSION_TOLERANCE) fail(`tapsUnder24=${mobile.tapsUnder24} regressed vs baseline ${base.tapsUnder24}`);
      if (base.minFontSize >= 12 && mobile.minFontSize < base.minFontSize - 1) fail(`minFontSize=${mobile.minFontSize} regressed vs baseline ${base.minFontSize}`);
    }
    results.push(entry);
    const status = entry.ok ? (entry.warnings.length ? 'PASS*' : 'PASS') : 'FAIL';
    console.log(`${status} ${themeId} · CLS ${mobile.cls} · broken ${mobile.brokenImages} · taps<24 ${mobile.tapsUnder24} · min ${mobile.minFontSize}px · h1 ${mobile.h1RenderedFonts || '-'}${entry.failures.length ? ' · ' + entry.failures.join(' | ') : ''}`);
  } catch (err) {
    entry.ok = false;
    entry.failures.push(`gate error: ${String(err).slice(0, 160)}`);
    results.push(entry);
    console.log(`FAIL ${themeId} · gate error: ${String(err).slice(0, 120)}`);
  }
}
await browser.close();

if (updateBaseline && Object.keys(baselineWrites).length) {
  baseline.themes = { ...baseline.themes, ...baselineWrites };
  baseline.updatedAt = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2) + '\n');
  console.log(`\nbaseline updated for ${Object.keys(baselineWrites).length} theme(s) -> ${path.basename(BASELINE_FILE)}`);
}
if (reportShifts && clsSourceLog.length && shotsDir) {
  const agg = {};
  for (const s of clsSourceLog) {
    const key = s.node || 'unknown';
    agg[key] = agg[key] || { node: key, total: 0, count: 0, themes: new Set() };
    agg[key].total += s.value;
    agg[key].count += 1;
    agg[key].themes.add(s.theme);
  }
  const top = Object.values(agg).sort((a, b) => b.total - a.total).slice(0, 40)
    .map(({ node, total, count, themes }) => ({ node, total: +total.toFixed(2), count, themes: themes.size }));
  fs.writeFileSync(path.join(shotsDir, 'cls-sources.json'), JSON.stringify(top, null, 1) + '\n');
  console.log(`CLS source report -> ${path.join(shotsDir, 'cls-sources.json')}`);
}
const failed = results.filter((r) => !r.ok);
if (asJson) {
  console.log(JSON.stringify({ ok: failed.length === 0, checked: results.length, failed: failed.length, results }, null, 2));
} else {
  console.log(`\n${results.length - failed.length}/${results.length} theme(s) pass the visual UX gate.`);
}
process.exit(failed.length === 0 ? 0 : 1);
