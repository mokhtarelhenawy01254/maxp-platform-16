const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    isRTL: true
  });
  const page = await context.newPage();

  try {
    console.log('Logging in...');
    await page.goto('http://localhost:3002/super-admin/login', { waitUntil: 'networkidle' });
    await page.fill('input[name="email"]', 'admin@superadmin.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    console.log('Navigating to Companies V2...');
    await page.goto('http://localhost:3002/super-admin/companies-v2', { waitUntil: 'networkidle' });

    // Expand the group to make sure we see everything
    console.log('Waiting for content...');
    await page.waitForTimeout(3000);

    console.log('Taking screenshot...');
    await page.screenshot({ path: 'density_verify.png', fullPage: true });
    console.log('Screenshot saved to density_verify.png');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
  }
})();
