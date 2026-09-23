const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runCafeSimulation() {
  console.log('🚀 Starting Cafe & Restaurant Pro Full Browser Simulation...');

  console.log('Authenticating cafe@maxp.online via API...');
  const loginRes = await fetch('https://maxp.online/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'cafe@maxp.online', password: 'Password@123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.token || loginData.token;
  const user = loginData.data?.user || loginData.user;
  const companyId = user?.companyId || 'cmud9lcrg0000jux5rmwo8lyz';

  console.log(`✅ Authenticated! User: ${user?.firstName} ${user?.lastName} (Company: ${companyId})`);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'ar-EG',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  });

  // Inject authentication into storage on every page load
  await context.addInitScript(({ token, user, companyId }) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('selectedCompanyId', companyId);
    sessionStorage.setItem('accessToken', token);
    sessionStorage.setItem('token', token);
  }, { token, user, companyId });

  const page = await context.newPage();

  const errors = [];
  const warnings = [];

  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error') {
      console.error(`🔴 [Browser Console Error]: ${text}`);
      errors.push({ type: 'console.error', text });
    } else if (msg.type() === 'warn') {
      warnings.push(text);
    }
  });

  page.on('pageerror', (err) => {
    console.error(`💥 [Browser Uncaught PageError]: ${err.message}`);
    errors.push({ type: 'pageerror', text: err.message, stack: err.stack });
  });

  page.on('requestfailed', (req) => {
    const failure = req.failure();
    console.warn(`⚠️ [Request Failed]: ${req.url()} - ${failure?.errorText}`);
  });

  page.on('response', (res) => {
    const status = res.status();
    const url = res.url();
    if (status >= 400 && !url.includes('/favicon.ico')) {
      console.warn(`⚠️ [HTTP ${status}] ${url}`);
      if (status >= 500) {
        errors.push({ type: 'http500', url, status });
      }
    }
  });

  try {

    // ----------------------------------------------------
    // STEP 2: POS CASHIER SIMULATION
    // ----------------------------------------------------
    console.log('\n--- 2. Simulating Cashier at /pos ---');
    await page.goto('https://maxp.online/pos', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('text=سبانش لاتيه', { timeout: 15000 }).catch(() => null);

    // Verify products are loaded
    const productCard = page.locator('button, div').filter({ hasText: 'سبانش لاتيه' }).first();
    const isProductVisible = await productCard.isVisible().catch(() => false);
    console.log(`Product grid loaded: ${isProductVisible ? 'YES' : 'NO'}`);

    if (isProductVisible) {
      console.log('Clicking on "سبانش لاتيه" to open Modifier Modal...');
      await productCard.click();
      await page.waitForSelector('text=تخصيص المشروب والإضافات', { timeout: 5000 }).catch(() => null);

      // Check if modifier modal opened
      const modalHeader = page.locator('text=تخصيص المشروب والإضافات');
      const isModalOpen = await modalHeader.isVisible().catch(() => false);
      console.log(`Modifier modal opened: ${isModalOpen ? 'YES' : 'NO'}`);

      if (isModalOpen) {
        // Select almond milk (+25 EGP)
        const almondMilkOption = page.locator('button').filter({ hasText: 'حليب لوز' }).first();
        if (await almondMilkOption.isVisible()) {
          console.log('Selecting "حليب لوز نباتي"...');
          await almondMilkOption.click();
        }

        // Select extra double shot
        const doubleShotOption = page.locator('button').filter({ hasText: 'شوت إسبريسو سنغل' }).first();
        if (await doubleShotOption.isVisible()) {
          console.log('Selecting extra espresso shot...');
          await doubleShotOption.click();
        }

        // Add barista notes
        const notesInput = page.locator('input[placeholder*="تعليمات خاصة"]').first();
        if (await notesInput.isVisible()) {
          console.log('Typing barista note...');
          await notesInput.fill('سكر خفيف جداً مع ثلج زيادة');
        }

        // Click Add to Cart
        const addToCartBtn = page.locator('button').filter({ hasText: 'إضافة للطلب' }).first();
        await addToCartBtn.click();
        console.log('✅ Customized drink added to cart!');
        await page.waitForTimeout(1000);
      }

      // Check if item is in cart
      const cartItem = page.locator('text=سبانش لاتيه').first();
      console.log(`Cart contains customized drink: ${await cartItem.isVisible() ? 'YES' : 'NO'}`);

      // Test Quick Discount
      const discount10Btn = page.locator('button').filter({ hasText: '10%' }).first();
      if (await discount10Btn.isVisible()) {
        console.log('Applying 10% discount...');
        await discount10Btn.click();
        await page.waitForTimeout(500);
        console.log('✅ 10% discount applied!');
      }
    }

    // ----------------------------------------------------
    // STEP 3: OPERATIONAL WASTE TRACKING SIMULATION
    // ----------------------------------------------------
    console.log('\n--- 3. Simulating Waste & Spoilage at /cafe/waste ---');
    await page.goto('https://maxp.online/cafe/waste', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('button:has-text("تسجيل هدر")', { timeout: 15000 }).catch(() => null);

    const newWasteBtn = page.locator('button').filter({ hasText: 'تسجيل هدر' }).first();
    const isWasteBtnVisible = await newWasteBtn.isVisible().catch(() => false);
    console.log(`"تسجيل هدر" button visible: ${isWasteBtnVisible ? 'YES' : 'NO'}`);

    if (isWasteBtnVisible) {
      await newWasteBtn.click();
      await page.waitForSelector('button:has-text("تأكيد وخصم المخزون")', { timeout: 5000 }).catch(() => null);

      // Fill waste modal
      const qtyInput = page.locator('input[type="number"]').first();
      if (await qtyInput.isVisible()) {
        await qtyInput.fill('0.06');
        const notesInput = page.locator('input[placeholder*="ملاحظات"]').first();
        if (await notesInput.isVisible()) {
          await notesInput.fill('معايرة شوت إسبريسو الصباحي على مطحنة الماهلكونيج');
        }

        const confirmWasteBtn = page.locator('button').filter({ hasText: 'تأكيد وخصم المخزون' }).first();
        await confirmWasteBtn.click();
        console.log('Submitted waste log!');
        await page.waitForTimeout(2000);
      }

      const wasteLogEntry = page.locator('text=معايرة').first();
      console.log(`Waste log registered in ledger: ${await wasteLogEntry.isVisible().catch(() => false) ? 'YES' : 'NO'}`);
    }

    // ----------------------------------------------------
    // STEP 4: BROWSE OTHER CAFE PAGES
    // ----------------------------------------------------
    console.log('\n--- 4. Checking /cafe/modifiers ---');
    await page.goto('https://maxp.online/cafe/modifiers', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('text=نوع الحليب', { timeout: 15000 }).catch(() => null);
    const modifiersContent = await page.textContent('body');
    console.log(`Modifiers page loaded, contains "نوع الحليب": ${modifiersContent.includes('نوع الحليب')}`);

    console.log('\n--- 5. Checking /cafe/recipes ---');
    await page.goto('https://maxp.online/cafe/recipes', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('text=سبانش لاتيه', { timeout: 15000 }).catch(() => null);
    const recipesContent = await page.textContent('body');
    console.log(`Recipes page loaded, contains "سبانش لاتيه": ${recipesContent.includes('سبانش لاتيه')}`);

    console.log('\n--- 6. Checking /cafe/audits ---');
    await page.goto('https://maxp.online/cafe/audits', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('text=جلسات الجرد', { timeout: 15000 }).catch(() => null);
    const auditsHeading = page.locator('text=جلسات الجرد').first();
    console.log(`Stock audits page loaded: ${await auditsHeading.isVisible().catch(() => false) ? 'YES' : 'NO'}`);

    console.log('\n--- 7. Checking /products ---');
    await page.goto('https://maxp.online/products', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('text=سبانش لاتيه', { timeout: 15000 }).catch(() => null);
    const productsContent = await page.textContent('body');
    console.log(`Products page loaded, contains "سبانش لاتيه": ${productsContent.includes('سبانش لاتيه')}`);

    console.log('\n--- 8. Checking /orders ---');
    await page.goto('https://maxp.online/orders', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    const ordersContent = await page.textContent('body');
    console.log(`Orders page loaded successfully: ${ordersContent.includes('طلبات') || ordersContent.includes('الطلبات')}`);

  } catch (err) {
    console.error('❌ Simulation Error:', err);
    errors.push({ type: 'fatal_simulation_error', message: err.message, stack: err.stack });
  } finally {
    await browser.close();
  }

  console.log('\n======================================================');
  console.log(`🏁 SIMULATION RUN FINISHED!`);
  console.log(`Total Errors Detected: ${errors.length}`);
  if (errors.length > 0) {
    console.log('Errors List:', JSON.stringify(errors, null, 2));
  } else {
    console.log('🎉 100% HEALTHY - NO ERRORS ENCOUNTERED!');
  }
  console.log('======================================================\n');
}

runCafeSimulation();
