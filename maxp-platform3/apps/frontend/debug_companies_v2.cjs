const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    isRTL: true
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  try {
    console.log('Logging in...');
    await page.goto('http://localhost:3002/super-admin/login', { waitUntil: 'networkidle' });
    await page.fill('input[name="email"]', 'admin@superadmin.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    console.log('Navigating to Companies V2...');
    const response = await page.goto('http://localhost:3002/super-admin/companies-v2', { waitUntil: 'networkidle' });
    console.log('Status:', response.status());

    await page.waitForTimeout(5000);

    console.log('Taking screenshot...');
    await page.screenshot({ path: 'debug_page.png', fullPage: true });

  } catch (err) {
    console.error('Execution Error:', err);
  } finally {
    await browser.close();
  }
})();
