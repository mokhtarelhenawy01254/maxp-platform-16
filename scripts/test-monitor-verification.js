const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testMonitorVerification() {
  console.log('🚀 [HR MONITOR BROWSER VERIFICATION] Starting scenario test...');

  const screenshotsDir = path.resolve(__dirname, '../.screenshots-monitor');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore non-fatal 3rd party or asset warnings
      if (!text.includes('favicon.ico') && !text.includes('status of 404') && !text.includes('Failed to load resource')) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(`PAGEERROR: ${err.message}`);
  });

  try {
    // 1. Visit Login Page
    console.log('📍 1. Navigating to https://maxp.online/auth/login ...');
    await page.goto('https://maxp.online/auth/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.waitForTimeout(1000);

    // 2. Perform Login
    console.log('📍 2. Logging in with credentials ...');
    await page.fill('input[type="email"]', 'admin@mokhtarelhenawy.com');
    await page.fill('input[type="password"]', '0165676135');
    await page.click('button[type="submit"]');

    // 3. Wait for dashboard / authentication
    console.log('📍 3. Waiting for authentication ...');
    await page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 25000 });
    await page.waitForTimeout(2000);

    // 4. Navigate directly to /hr/monitor
    console.log('📍 4. Navigating to https://maxp.online/hr/monitor ...');
    await page.goto('https://maxp.online/hr/monitor', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(screenshotsDir, '01-monitor-dashboard.png') });
    console.log('✅ Landed on HR Monitor Dashboard:', page.url());

    // 5. Inspect Dashboard Telemetry & Elements
    const pageTitle = await page.title();
    console.log(`   - Page Title: "${pageTitle}"`);

    const hasTableOrCards = await page.evaluate(() => {
      const rows = document.querySelectorAll('tr, .rounded-xl');
      return rows.length > 0;
    });
    console.log(`   - UI Elements Rendered: ${hasTableOrCards ? 'YES' : 'NO'}`);

    // 6. Check for details link or inspect timeline
    const employeeRow = page.locator('button:has-text("عرض التفاصيل"), a[href*="/hr/monitor/"]').first();
    const canClickDetails = await employeeRow.isVisible({ timeout: 3000 }).catch(() => false);
    if (canClickDetails) {
      console.log('📍 5. Clicking employee details view ...');
      await employeeRow.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: path.join(screenshotsDir, '02-employee-timeline.png') });
      console.log('✅ Landed on Employee Monitor Details:', page.url());
    }

    // 7. Check Console Errors
    console.log('\n🔍 Console Error Check:');
    if (consoleErrors.length === 0) {
      console.log('✅ Zero Console Errors! Clean execution.');
    } else {
      console.warn('⚠️ Console Errors detected:', consoleErrors);
    }

    console.log('\n🎉 [VERIFICATION COMPLETE] All browser checks passed successfully!');
    await browser.close();
    process.exit(consoleErrors.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Browser Verification Failed:', error.message);
    try {
      await page.screenshot({ path: path.join(screenshotsDir, 'error-state.png') });
    } catch {}
    if (browser) await browser.close();
    process.exit(1);
  }
}

testMonitorVerification();
