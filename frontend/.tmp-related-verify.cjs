const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('console', msg => console.log('BROWSER_CONSOLE', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE_ERROR', err.message));
  page.on('response', res => { if (res.status() >= 400) console.log('BAD_RESPONSE', res.status(), res.url()); });
  const url = 'http://127.0.0.1:3013/store/product/khemet-luxe-eg-cloud-sneaker?companyId=company123&previewTheme=khemet-luxe-eg&previewSource=marketplace';
  const started = Date.now();
  console.log('STEP goto');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('STEP wait section');
  await page.waitForSelector('text=ممكن يعجبك كمان', { timeout: 30000 });
  const before = (await page.locator('h1').first().textContent() || '').trim();
  console.log('STEP before', before);
  const card = page.locator('a[href*="khemet-pearl-runner"]').first();
  console.log('STEP count', await card.count());
  console.log('STEP click');
  await card.click({ timeout: 15000 });
  console.log('STEP clicked URL', page.url());
  await page.waitForURL('**/store/product/khemet-pearl-runner**', { timeout: 30000 });
  console.log('STEP url matched', page.url());
  for (const ms of [0, 500, 1000, 2000, 4000, 8000]) {
    if (ms) await page.waitForTimeout(ms);
    const h1 = (await page.locator('h1').first().textContent().catch(() => '')) || '';
    console.log('STEP sample', ms, h1.trim());
  }
  const after = (await page.locator('h1').first().textContent() || '').trim();
  console.log(JSON.stringify({ ok: true, before, after, finalUrl: page.url(), elapsedMs: Date.now() - started }, null, 2));
  await browser.close();
})().catch(err => { console.error('SCRIPT_ERROR', err); process.exit(1); });
