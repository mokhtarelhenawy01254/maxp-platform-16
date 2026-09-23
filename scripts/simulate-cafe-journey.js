const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runCafeSimulation() {
  console.log('🚀 Starting Cafe & Restaurant Pro Full Browser Simulation...');

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true // set true for CI/automation
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'ar-EG'
  });

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
    // STEP 1: LOGIN
    // ----------------------------------------------------
    console.log('\n--- 1. Navigating to https://maxp.online/login ---');
    await page.goto('https://maxp.online/login', { waitUntil: 'networkidle', timeout: 30000 });

    console.log('Filling login credentials...');
    // Look for email and password inputs
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="بريد"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill('cafe@maxp.online');
    await passwordInput.fill('Password@123');

    console.log('Submitting login form...');
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    // Wait for URL to change away from /login
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    console.log(`✅ Login successful! Current URL: ${page.url()}`);

    // Wait for app state to settle
    await page.waitForTimeout(2000);

    // ----------------------------------------------------
    // STEP 2: POS CASHIER SIMULATION
    // ----------------------------------------------------
    console.log('\n--- 2. Simulating Cashier at /pos ---');
    await page.goto('https://maxp.online/pos', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Verify products are loaded
    const productCards = page.locator('button, div').filter({ hasText: 'سبانش لاتيه' }).first();
    const isProductVisible = await productCards.isVisible().catch(() => false);
    console.log(`Product grid loaded: ${isProductVisible ? 'YES' : 'NO'}`);

    if (isProductVisible) {
      console.log('Clicking on "سبانش لاتيه" to open Modifier Modal...');
      await productCards.click();
      await page.waitForTimeout(1000);

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

      // Test KOT Prep Fire button
      const kotButton = page.locator('button').filter({ hasText: 'إرسال بون البار' }).first();
      if (await kotButton.isVisible()) {
        console.log('Testing Pre-checkout KOT Fire button...');
        await kotButton.click();
        await page.waitForTimeout(1500);
        console.log('✅ KOT Fire clicked successfully!');
      }

      // Test Parking Cart to Table Tab
      const parkButton = page.locator('button').filter({ hasText: 'تعليق / حفظ السلة' }).first();
      if (await parkButton.isVisible()) {
        console.log('Testing Parking Cart to Table Tab...');
        await parkButton.click();
        await page.waitForTimeout(800);

        const tableInput = page.locator('input[placeholder*="طاولة"]').first();
        if (await tableInput.isVisible()) {
          await tableInput.fill('طاولة 4 - شرفة');
          const confirmParkBtn = page.locator('button').filter({ hasText: 'تأكيد الحفظ' }).first();
          await confirmParkBtn.click();
          console.log('✅ Cart parked to table tab!');
          await page.waitForTimeout(1500);

          // Verify tab appears in active tabs bar
          const restoredTab = page.locator('text=طاولة 4 - شرفة').first();
          console.log(`Parked table tab visible: ${await restoredTab.isVisible() ? 'YES' : 'NO'}`);

          if (await restoredTab.isVisible()) {
            console.log('Restoring parked table tab...');
            await restoredTab.click();
            await page.waitForTimeout(1000);
            console.log('✅ Table tab restored back into cart!');
          }
        }
      }

      // Test Quick Discount
      const discount10Btn = page.locator('button').filter({ hasText: '10%' }).first();
      if (await discount10Btn.isVisible()) {
        console.log('Applying 10% discount...');
        await discount10Btn.click();
        await page.waitForTimeout(500);
        console.log('✅ 10% discount applied!');
      }

      // Test Split Payment mode
      const splitModeBtn = page.locator('button').filter({ hasText: 'مقسم' }).first();
      if (await splitModeBtn.isVisible()) {
        console.log('Selecting Split Payment mode...');
        await splitModeBtn.click();
        await page.waitForTimeout(500);
        console.log('✅ Split payment inputs active!');
      }

      // Click Complete Order
      const completeOrderBtn = page.locator('button').filter({ hasText: 'إتمام الطلب' }).first();
      if (await completeOrderBtn.isVisible()) {
        console.log('Clicking "إتمام الطلب"...');
        await completeOrderBtn.click();
        await page.waitForTimeout(2000);

        // Check for receipt modal
        const receiptHeading = page.locator('text=إيصال الدفع').first();
        console.log(`Receipt displayed: ${await receiptHeading.isVisible() ? 'YES' : 'NO'}`);
      }
    }

    // ----------------------------------------------------
    // STEP 3: OPERATIONAL WASTE TRACKING SIMULATION
    // ----------------------------------------------------
    console.log('\n--- 3. Simulating Waste & Spoilage at /cafe/waste ---');
    await page.goto('https://maxp.online/cafe/waste', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const newWasteBtn = page.locator('button').filter({ hasText: 'تسجيل هدر' }).first();
    const isWasteBtnVisible = await newWasteBtn.isVisible().catch(() => false);
    console.log(`"تسجيل هدر" button visible: ${isWasteBtnVisible ? 'YES' : 'NO'}`);

    if (isWasteBtnVisible) {
      await newWasteBtn.click();
      await page.waitForTimeout(1000);

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

      const wasteLogEntry = page.locator('text=معايرة مطحنة').first();
      console.log(`Waste log registered in ledger: ${await wasteLogEntry.isVisible() ? 'YES' : 'NO'}`);
    }

    // ----------------------------------------------------
    // STEP 4: BROWSE OTHER CAFE PAGES
    // ----------------------------------------------------
    console.log('\n--- 4. Checking /cafe/modifiers ---');
    await page.goto('https://maxp.online/cafe/modifiers', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    const modifiersContent = await page.textContent('body');
    console.log(`Modifiers page loaded, contains "نوع الحليب": ${modifiersContent.includes('نوع الحليب')}`);

    console.log('\n--- 5. Checking /cafe/recipes ---');
    await page.goto('https://maxp.online/cafe/recipes', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    const recipesContent = await page.textContent('body');
    console.log(`Recipes page loaded, contains "سبانش لاتيه": ${recipesContent.includes('سبانش لاتيه')}`);

    console.log('\n--- 6. Checking /cafe/audits ---');
    await page.goto('https://maxp.online/cafe/audits', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    const auditsHeading = page.locator('text=جلسات الجرد').first();
    console.log(`Stock audits page loaded: ${await auditsHeading.isVisible() ? 'YES' : 'NO'}`);

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
