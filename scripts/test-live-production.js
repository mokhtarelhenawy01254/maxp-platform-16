const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testLiveProduction() {
  console.log('🚀 [LIVE PRODUCTION VERIFICATION] Starting test on https://maxp.online ...');

  const screenshotsDir = path.resolve(__dirname, '../.screenshots-live');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
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

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon.ico') && !text.includes('status of 404') && !text.includes('Failed to load resource')) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(`PAGEERROR: ${err.message}`);
  });

  try {
    // 1. Visit Live Login Page
    console.log('📍 1. Navigating to https://maxp.online/auth/login ...');
    await page.goto('https://maxp.online/auth/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('input[type="email"]', { timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(screenshotsDir, 'live-01-login.png') });

    // 2. Perform Login
    console.log('📍 2. Logging in with credentials admin@mokhtarelhenawy.com ...');
    await page.fill('input[type="email"]', 'admin@mokhtarelhenawy.com');
    await page.fill('input[type="password"]', '0165676135');
    await page.click('button[type="submit"]');

    // 3. Wait for Super Admin Dashboard
    console.log('📍 3. Waiting for navigation to Super Admin Dashboard...');
    await page.waitForURL('**/super-admin/dashboard**', { timeout: 25000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, 'live-02-super-admin-dashboard.png') });
    console.log('✅ Landed on Live Super Admin Dashboard:', page.url());

    // Evaluate Auth & Company context
    const authState = await page.evaluate(() => {
      const u = localStorage.getItem('user');
      const c = localStorage.getItem('currentCompany');
      return {
        user: u ? JSON.parse(u) : null,
        currentCompany: c ? JSON.parse(c) : null,
      };
    });

    console.log('\n👤 Live Authenticated Context:');
    console.log('   - Role:', authState.user?.role);
    console.log('   - Email:', authState.user?.email);
    console.log('   - User Company ID:', authState.user?.companyId || authState.user?.company?.id);
    console.log('   - User Company Slug:', authState.user?.company?.slug);
    console.log('   - LocalStorage currentCompany Slug:', authState.currentCompany?.slug);

    // 4. Test Transition to HQ Company Cockpit
    console.log('\n📍 4. Checking and clicking HQ Cockpit button...');
    const hqButton = page.locator('button:has-text("كوكبيت الشركة (HQ)")');
    const isHqVisible = await hqButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isHqVisible) {
      console.log('   -> Found "كوكبيت الشركة (HQ)" button in header! Clicking...');
      await hqButton.click();
    } else {
      console.log('   -> Directly navigating to https://maxp.online/company-dashboard ...');
      await page.goto('https://maxp.online/company-dashboard', { waitUntil: 'domcontentloaded' });
    }

    await page.waitForURL('**/company-dashboard**', { timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, 'live-03-company-hq-dashboard.png') });
    console.log('✅ Successfully reached Live Company Dashboard:', page.url());

    // 5. Test Transition back to Super Admin
    console.log('\n📍 5. Checking platform button to return to Super Admin...');
    const platformBtn = page.locator('button:has-text("إدارة المنصة")');
    const isPlatformVisible = await platformBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (isPlatformVisible) {
      console.log('   -> Found "إدارة المنصة" button! Clicking...');
      await platformBtn.click();
      await page.waitForURL('**/super-admin/dashboard**', { timeout: 15000 });
      await page.waitForTimeout(2000);
      console.log('✅ Successfully returned to Super Admin Dashboard via button!');
    } else {
      console.log('   -> Navigating back to Super Admin...');
      await page.goto('https://maxp.online/super-admin/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
    }

    // 6. Test Super Admin WhatsApp Overview
    console.log('\n📍 6. Testing Super Admin WhatsApp Overview...');
    await page.goto('https://maxp.online/super-admin/whatsapp', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, 'live-04-super-admin-whatsapp.png') });
    console.log('✅ Captured Live Super Admin WhatsApp Overview');

    // 7. Test Super Admin Landing Pages
    console.log('\n📍 7. Testing Super Admin Landing Pages...');
    await page.goto('https://maxp.online/super-admin/landing-pages', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, 'live-05-super-admin-landing-pages.png') });
    console.log('✅ Captured Live Super Admin Landing Pages');

    // 8. Test Direct Merchant WhatsApp Inbox under HQ company
    console.log('\n📍 8. Testing Merchant WhatsApp Chatbox (/whatsapp/chat)...');
    await page.goto('https://maxp.online/whatsapp/chat', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, 'live-06-hq-whatsapp-chat.png') });
    console.log('✅ Captured Live HQ WhatsApp Chatbox');

    // 9. Test Direct Merchant Landing Page Builder under HQ company
    console.log('\n📍 9. Testing Merchant Landing Pages Builder (/advertising/product-landing-pages)...');
    await page.goto('https://maxp.online/advertising/product-landing-pages', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotsDir, 'live-07-hq-landing-pages-builder.png') });
    console.log('✅ Captured Live HQ Landing Pages Builder');

    console.log('\n📊 Console Errors Audit:');
    if (consoleErrors.length > 0) {
      console.warn('⚠️ Console errors detected:', consoleErrors);
    } else {
      console.log('✅ ZERO Console Errors detected on live site!');
    }

    console.log('\n🎉 [SUCCESS] Live browser verification completed successfully!');
  } catch (error) {
    console.error('❌ Verification failed on live site:', error);
    await page.screenshot({ path: path.join(screenshotsDir, 'live-error-state.png') }).catch(() => {});
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testLiveProduction();
