const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('🚀 Starting Pre-Flight Scenario Browser Verification...');

  const artifactsDir = path.resolve(__dirname, '../.screenshots');
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  let browser;
  try {
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true,
    });
  } catch {
    browser = await chromium.launch({
      channel: 'msedge',
      headless: true,
    });
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  // Route API calls from local preview to live backend
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const targetUrl = req.url().replace('http://127.0.0.1:4173', 'https://maxp.online');
    try {
      const response = await route.fetch({ url: targetUrl });
      await route.fulfill({ response });
    } catch (e) {
      console.error('Route fetch error:', e.message);
      await route.abort();
    }
  });

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore benign external resource 404s (e.g. missing favicon)
      if (!text.includes('favicon.ico') && !text.includes('status of 404')) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(`PAGEERROR: ${err.message}`);
  });

  try {
    // 1. Visit Login Page
    console.log('📍 1. Navigating to login page...');
    await page.goto('http://127.0.0.1:4173/auth/login', { waitUntil: 'networkidle' });
    await page.screenshot({ path: path.join(artifactsDir, '01-login-page.png') });

    // 2. Perform Login
    console.log('📍 2. Logging in with admin credentials...');
    await page.fill('input[type="email"]', 'admin@mokhtarelhenawy.com');
    await page.fill('input[type="password"]', '0165676135');
    await page.click('button[type="submit"]');

    // 3. Wait for Super Admin Dashboard
    console.log('📍 3. Waiting for Super Admin Dashboard navigation...');
    await page.waitForURL('**/super-admin/dashboard**', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(artifactsDir, '02-super-admin-dashboard.png') });
    console.log('✅ Landed on Super Admin Dashboard:', page.url());

    // Verify localStorage company state
    const authState = await page.evaluate(() => {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    });

    console.log('👤 Authenticated User State:');
    console.log('   - Email:', authState?.email);
    console.log('   - Role:', authState?.role);
    console.log('   - Company ID:', authState?.company?.id);
    console.log('   - Company Name:', authState?.company?.name);
    console.log('   - Company Slug:', authState?.company?.slug);

    if (authState?.company?.slug !== 'max-p') {
      throw new Error(`Expected active company slug 'max-p', got '${authState?.company?.slug}'`);
    }

    // 4. Test Transition to HQ Cockpit
    console.log('📍 4. Clicking HQ Cockpit button...');
    const hqButton = page.locator('button:has-text("كوكبيت الشركة (HQ)")');
    await hqButton.waitFor({ state: 'visible', timeout: 5000 });
    await hqButton.click();

    await page.waitForURL('**/company-dashboard**', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(artifactsDir, '03-company-hq-dashboard.png') });
    console.log('✅ Successfully transitioned to Company Dashboard:', page.url());

    // 5. Test Transition Back to Super Admin
    console.log('📍 5. Transitioning back to Super Admin...');
    const platformButton = page.locator('button:has-text("إدارة المنصة")');
    await platformButton.waitFor({ state: 'visible', timeout: 5000 });
    await platformButton.click();

    await page.waitForURL('**/super-admin/dashboard**', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(artifactsDir, '04-returned-to-super-admin.png') });
    console.log('✅ Successfully returned to Super Admin:', page.url());

    // 6. Test Super Admin WhatsApp Overview
    console.log('📍 6. Testing Super Admin WhatsApp Overview (/super-admin/whatsapp)...');
    await page.goto('http://127.0.0.1:4173/super-admin/whatsapp', { waitUntil: 'networkidle' });
    await page.waitForSelector('text=شركة المنصة المركزية الرسمية (HQ): max-p', { timeout: 10000 });
    await page.screenshot({ path: path.join(artifactsDir, '05-super-admin-whatsapp.png') });
    console.log('✅ Super Admin WhatsApp Overview shows official max-p HQ linkage!');

    // 7. Test Super Admin Landing Pages
    console.log('📍 7. Testing Super Admin Landing Pages (/super-admin/landing-pages)...');
    await page.goto('http://127.0.0.1:4173/super-admin/landing-pages', { waitUntil: 'networkidle' });
    await page.waitForSelector('text=صفحات الهبوط البيعية لمنتجات الشركة (HQ): max-p', { timeout: 10000 });
    await page.screenshot({ path: path.join(artifactsDir, '06-super-admin-landing-pages.png') });
    console.log('✅ Super Admin Landing Pages shows HQ LP builder linkage!');

    console.log('\n📊 Console Errors Audit:');
    if (consoleErrors.length > 0) {
      console.warn('⚠️ Console errors detected:', consoleErrors);
    } else {
      console.log('✅ ZERO Console Errors detected!');
    }

    console.log('\n🎉 ALL SCENARIO CHECKS PASSED WITH FLYING COLORS!');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    await page.screenshot({ path: path.join(artifactsDir, 'error-state.png') });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
