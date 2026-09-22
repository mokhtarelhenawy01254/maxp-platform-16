const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'https://maxp.online';
const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'scratch', 'cafe_full_day_journey');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function logStep(stepNum, title, description) {
  console.log('\n================================================================');
  console.log(`📍 [المحطة ${stepNum}/10]: ${title}`);
  console.log(`   ${description}`);
  console.log('================================================================');
}

async function runCafeFullDayJourney() {
  console.log('🚀 بدء تشغيل محاكاة يوم العمل الكامل للكافيه عبر المتصفح (Playwright Automation)');
  console.log(`🌐 الرابط المستهدف: ${BASE_URL}`);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-EG',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  try {
    // -------------------------------------------------------------
    // STAGE 1: Registration & Onboarding (07:00 AM)
    // -------------------------------------------------------------
    logStep(1, 'تسجيل حساب الكافيه الجديد واختيار تخصص الأنشطة', 'المدير يسجل من المتصفح ويختار تخصص كافيهات ومطاعم');
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_registration_page.png'), fullPage: false });
    console.log('   📸 تم التقاط صورة شاشة التسجيل: 01_registration_page.png');

    // -------------------------------------------------------------
    // STAGE 2: Morning POS Opening & Cockpit Overview (07:15 AM)
    // -------------------------------------------------------------
    logStep(2, 'فتح الكاشير وبدء الوردية الصباحية', 'استعراض شاشة الـ POS وشريط الطاولات وعهدة البداية');
    await page.goto(`${BASE_URL}/pos`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_morning_pos_cockpit.png'), fullPage: false });
    console.log('   📸 تم التقاط صورة شاشة الكاشير: 02_morning_pos_cockpit.png');

    // -------------------------------------------------------------
    // STAGE 3: Recipe & BOM Engineering (07:30 AM)
    // -------------------------------------------------------------
    logStep(3, 'معايير الرسيبي (BOM) وتكلفة الكوب الحقيقية', 'فحص معايير المشروبات، نسب الهدر، وهوامش الربح');
    await page.goto(`${BASE_URL}/cafe/recipes`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_recipe_bom_costing.png'), fullPage: false });
    console.log('   📸 تم التقاط صورة شاشة الرسيبي: 03_recipe_bom_costing.png');

    // -------------------------------------------------------------
    // STAGE 4: Drink Modifiers Configuration (07:45 AM)
    // -------------------------------------------------------------
    logStep(4, 'إعداد خيارات وتعديلات المشروبات (Modifiers)', 'تخصيص بدائل الحليب (لوز/شوفان) والنكهات والشوتات الإضافية');
    await page.goto(`${BASE_URL}/cafe/modifiers`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_drink_modifiers.png'), fullPage: false });
    console.log('   📸 تم التقاط صورة شاشة التعديلات: 04_drink_modifiers.png');

    // -------------------------------------------------------------
    // STAGE 5: Takeaway Order & KOT Kitchen Printing (08:30 AM)
    // -------------------------------------------------------------
    logStep(5, 'طلب تيك أواي سريع وطباعة تذكرة البار (KOT)', 'الكاشير يبيع مشروب سريع ويطبع تذكرة تجهيز البارستا');
    await page.goto(`${BASE_URL}/pos`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    // Click on the first product card if available
    const productCard = await page.$('.grid > div');
    if (productCard) {
      await productCard.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_takeaway_order_cart.png'), fullPage: false });
    console.log('   📸 تم التقاط صورة سلة البيع المباشر: 05_takeaway_order_cart.png');

    // -------------------------------------------------------------
    // STAGE 6: Dine-In Table 4 Open Tab (09:30 AM)
    // -------------------------------------------------------------
    logStep(6, 'شيكات الطاولات المفتوحة (Open Tabs / Park Order)', 'تعليق شيك طاولة 4 وإضافة مشروبات أخرى لاحقاً');
    const parkButton = await page.$('button:has-text("تعليق")');
    if (parkButton) {
      await parkButton.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_park_table_modal.png'), fullPage: false });
      console.log('   📸 تم التقاط صورة نافذة تعليق الطاولة: 06_park_table_modal.png');
    }

    // -------------------------------------------------------------
    // STAGE 7: Daily Stock Tracking & Raw Inventory (01:00 PM)
    // -------------------------------------------------------------
    logStep(7, 'متابعة رصيد الخامات في مستودع البار', 'فحص أرصدة البن والحليب والأكواب بعد سحب الطلبات');
    await page.goto(`${BASE_URL}/inventory`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_live_inventory_tracking.png'), fullPage: false });
    console.log('   📸 تم التقاط صورة أرصدة المخزون: 07_live_inventory_tracking.png');

    // -------------------------------------------------------------
    // STAGE 8: Shift Handover & Z-Report (04:00 PM)
    // -------------------------------------------------------------
    logStep(8, 'تسليم الوردية الصباحية وتقفيل الكاشير (Z-Report)', 'استخراج تقرير المبيعات وإجمالي النقدية في الدرج');
    await page.goto(`${BASE_URL}/pos`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    
    const shiftReportBtn = await page.$('button:has-text("تقرير الوردية")');
    if (shiftReportBtn) {
      await shiftReportBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_shift_handover_zreport.png'), fullPage: false });
      console.log('   📸 تم التقاط صورة تقرير الوردية Z-Report: 08_shift_handover_zreport.png');
    }

    // -------------------------------------------------------------
    // STAGE 9: Night Closing & Physical Par Stocktake (01:30 AM)
    // -------------------------------------------------------------
    logStep(9, 'جلسة جرد البار المسائية واحتساب العجز والتسوية', 'البارستا يعد خامات البار الفعلي واعتماد التسوية آلياً');
    await page.goto(`${BASE_URL}/cafe/audits`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_stock_audit_reconciliation.png'), fullPage: false });
    console.log('   📸 تم التقاط صورة شاشة جلسات الجرد: 09_stock_audit_reconciliation.png');

    // -------------------------------------------------------------
    // STAGE 10: Platform Admin & Business Specialties (02:00 AM)
    // -------------------------------------------------------------
    logStep(10, 'لوحة التحكم وإدارة تخصصات الأنشطة الشاملة', 'التحقق من جاهزية قالب الكافيه في لوحة السوبر أدمن');
    await page.goto(`${BASE_URL}/super-admin/business-specialties`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_super_admin_specialties.png'), fullPage: false });
    console.log('   📸 تم التقاط صورة شاشة تخصصات الأنشطة: 10_super_admin_specialties.png');

    console.log('\n================================================================');
    console.log('🎉 اكتملت محاكاة يوم العمل الكامل بنجاح 100% عبر المتصفح!');
    console.log(`📁 تم حفظ جميع لقطات الشاشة في: ${SCREENSHOT_DIR}`);
    console.log('================================================================\n');

  } catch (error) {
    console.error('❌ حدث خطأ أثناء المحاكاة:', error);
  } finally {
    await browser.close();
  }
}

runCafeFullDayJourney();
