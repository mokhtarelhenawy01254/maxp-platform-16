const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  console.log('🚀 Starting Playwright Browser Self-Verification for Post-Purchase Offer...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  const evidenceDir = path.resolve(__dirname, '../docs/evidence/post-purchase-offer');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  // ==========================================
  // SCENARIO 1: Mobile 390px (Swan Brand View)
  // ==========================================
  console.log('\n📱 Testing Mobile Viewport (390x844)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });

  const mobilePage = await mobileContext.newPage();
  const consoleErrors = [];
  mobilePage.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  const targetUrl = 'http://swan.localhost:3001/order-offer?orderId=ORD-501139-413';
  await mobilePage.goto(targetUrl, { waitUntil: 'networkidle' });

  // 1. Check FreeShippingBar is hidden
  const freeShippingBar = await mobilePage.$('.free-shipping-bar, [data-testid="free-shipping-bar"]');
  const freeShippingText = await mobilePage.evaluate(() => document.body.innerText.includes('للحصول على شحن مجاني'));
  console.log('  ✓ FreeShippingBar hidden on /order-offer:', !freeShippingText);

  // 2. Check no default variant selected initially
  const colorButtons = await mobilePage.$$('button:has-text("أبيض")');
  console.log(`  ✓ Found ${colorButtons.length} color buttons`);
  const initialSelectedColor = await mobilePage.$('button:has-text("أبيض").bg-emerald-500\\/10');
  console.log('  ✓ Initial selected color is null:', initialSelectedColor === null);

  // 3. Test Fortified CTA: Click CTA before selecting
  console.log('  🛡️ Testing Fortified CTA (click without selection)...');
  let acceptApiCalled = false;
  mobilePage.on('request', (req) => {
    if (req.url().includes('/accept-offer')) {
      acceptApiCalled = true;
    }
  });

  const ctaButton = await mobilePage.$('button:has-text("أيوه! ضيفي")');
  await ctaButton.click();
  await mobilePage.waitForTimeout(600);

  const toastText = await mobilePage.evaluate(() => {
    const toasts = Array.from(document.querySelectorAll('[data-sonner-toast], [role="status"]'));
    return toasts.map(t => t.textContent).join(' ');
  });
  console.log('  ✓ Toast message shown:', toastText.includes('اختاري اللون والمقاس الأول') ? 'YES ("اختاري اللون والمقاس الأول 🙏")' : toastText);
  console.log('  ✓ Accept API calls made:', acceptApiCalled ? 'FAILED (called)' : '0 (ZERO calls - SAFE)');

  // 4. Select Color "أبيض × أسود"
  console.log('  🎨 Selecting Color "أبيض × أسود"...');
  const blackColorBtn = await mobilePage.$('button:has-text("أبيض × أسود")');
  await blackColorBtn.click();
  await mobilePage.waitForTimeout(400);

  // Check checkmark icon rendered
  const colorHasCheckmark = await mobilePage.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('أبيض × أسود'));
    return btn && btn.querySelector('svg') !== null;
  });
  console.log('  ✓ Color button has emerald checkmark icon:', colorHasCheckmark);

  // 5. Select Size "39"
  console.log('  📏 Selecting Size "39"...');
  const size39Btn = await mobilePage.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '39');
  });
  await size39Btn.asElement().click();
  await mobilePage.waitForTimeout(400);

  // Check size 39 highlighted
  const size39Highlighted = await mobilePage.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '39');
    return btn && btn.className.includes('bg-emerald-600');
  });
  console.log('  ✓ Size 39 highlighted in solid emerald:', size39Highlighted);

  // Capture Mobile Screenshot
  const mobileScreenshotPath = path.join(evidenceDir, 'swan_offer_picker_after_mobile.png');
  await mobilePage.screenshot({ path: mobileScreenshotPath, fullPage: true });
  console.log(`  📸 Mobile screenshot saved to: ${mobileScreenshotPath}`);

  // ==========================================
  // SCENARIO 2: Desktop 1280px View
  // ==========================================
  console.log('\n💻 Testing Desktop Viewport (1280x800)...');
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });

  const desktopPage = await desktopContext.newPage();
  desktopPage.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await desktopPage.goto(targetUrl, { waitUntil: 'networkidle' });

  // Select color and size on desktop as well
  const deskColorBtn = await desktopPage.$('button:has-text("أبيض × أسود")');
  await deskColorBtn.click();
  await desktopPage.waitForTimeout(400);

  const deskSizeBtn = await desktopPage.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '39');
  });
  await deskSizeBtn.asElement().click();
  await desktopPage.waitForTimeout(400);

  const desktopScreenshotPath = path.join(evidenceDir, 'swan_offer_picker_after_desktop.png');
  await desktopPage.screenshot({ path: desktopScreenshotPath, fullPage: true });
  console.log(`  📸 Desktop screenshot saved to: ${desktopScreenshotPath}`);

  // ==========================================
  // Console Error Check
  // ==========================================
  console.log('\n🔍 Console Error Audit:');
  const nonBenignErrors = consoleErrors.filter(e => !e.includes('favicon'));
  if (nonBenignErrors.length === 0) {
    console.log('  ✅ ZERO CONSOLE ERRORS! Perfect cleanliness.');
  } else {
    console.warn('  ⚠️ Console errors detected:', nonBenignErrors);
  }

  await browser.close();
  console.log('\n✨ Browser Self-Verification & Evidence Capture Complete!');
}

run().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
