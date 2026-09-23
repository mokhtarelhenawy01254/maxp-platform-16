const { chromium } = require('playwright');

async function auditConsole() {
  console.log('🔍 Starting Comprehensive Browser Console Audit across Cafe & Platform Pages...');

  // 1. API Login
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

  // Inject session into storage
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

  const pagesToTest = [
    { name: 'Dashboard (لوحة التحكم)', url: 'https://maxp.online/company-dashboard' },
    { name: 'POS Cashier (نقطة البيع)', url: 'https://maxp.online/pos' },
    { name: 'Cafe Waste Tracking (تتبع الهدر والعيار)', url: 'https://maxp.online/cafe/waste' },
    { name: 'Cafe Modifiers (إدارة الإضافات وبدائل الحليب)', url: 'https://maxp.online/cafe/modifiers' },
    { name: 'Cafe Recipes BOM (هندسة الوصفات والمكونات)', url: 'https://maxp.online/cafe/recipes' },
    { name: 'Cafe Stock Audits (جلسات الجرد الفعلي)', url: 'https://maxp.online/cafe/audits' },
    { name: 'Products & Inventory (المنتجات والمخزون)', url: 'https://maxp.online/products' },
    { name: 'Orders (شاشة الطلبات)', url: 'https://maxp.online/orders' },
    { name: 'Treasury & Expenses (الخزنة والمصروفات)', url: 'https://maxp.online/treasury-expenses' }
  ];

  const results = [];

  for (const target of pagesToTest) {
    console.log(`\n======================================================`);
    console.log(`🌐 Testing: ${target.name} -> ${target.url}`);
    console.log(`======================================================`);

    const pageErrors = [];
    const pageWarnings = [];
    const httpFailures = [];

    const onConsole = (msg) => {
      const text = msg.text();
      // Ignore benign 3rd party ad/analytics block noise if present
      if (text.includes('ERR_BLOCKED_BY_CLIENT') || text.includes('clarity') || text.includes('facebook.net')) return;
      if (msg.type() === 'error') {
        pageErrors.push(text);
        console.error(`  🔴 [Console Error]: ${text}`);
      } else if (msg.type() === 'warn') {
        pageWarnings.push(text);
      }
    };

    const onPageError = (err) => {
      pageErrors.push(err.message);
      console.error(`  💥 [Page Crash / Uncaught]: ${err.message}`);
    };

    const onResponse = (res) => {
      const status = res.status();
      const url = res.url();
      if (status >= 400 && !url.includes('/favicon.ico') && !url.includes('clarity.ms') && !url.includes('facebook')) {
        httpFailures.push({ status, url });
        console.warn(`  ⚠️ [HTTP ${status}]: ${url}`);
      }
    };

    page.on('console', onConsole);
    page.on('pageerror', onPageError);
    page.on('response', onResponse);

    try {
      await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      // Give React SPA time to fetch data and render
      await page.waitForTimeout(3000);

      results.push({
        name: target.name,
        url: target.url,
        status: pageErrors.length === 0 && httpFailures.filter(f => f.status >= 500).length === 0 ? 'HEALTHY' : 'HAS_ISSUES',
        errorsCount: pageErrors.length,
        errors: pageErrors,
        httpFailures: httpFailures
      });
    } catch (navErr) {
      console.error(`  ❌ Navigation Failed: ${navErr.message}`);
      results.push({
        name: target.name,
        url: target.url,
        status: 'FAILED',
        errorsCount: 1,
        errors: [navErr.message],
        httpFailures: []
      });
    } finally {
      page.off('console', onConsole);
      page.off('pageerror', onPageError);
      page.off('response', onResponse);
    }
  }

  await browser.close();

  console.log('\n\n======================================================');
  console.log('📊 FINAL AUDIT SUMMARY REPORT');
  console.log('======================================================');
  console.table(results.map(r => ({
    Page: r.name,
    Status: r.status,
    Errors: r.errorsCount,
    HttpFailures: r.httpFailures.length
  })));

  const totalErrors = results.reduce((acc, r) => acc + r.errorsCount, 0);
  console.log(`\nTotal Errors Across All Tested Pages: ${totalErrors}`);

  if (totalErrors > 0) {
    console.log('\nDetailed Errors Found:');
    results.filter(r => r.errorsCount > 0).forEach(r => {
      console.log(`\n--- ${r.name} ---`);
      r.errors.forEach(e => console.log(`  • ${e}`));
      r.httpFailures.forEach(h => console.log(`  • [HTTP ${h.status}] ${h.url}`));
    });
  } else {
    console.log('🎉 100% HEALTHY - ALL TESTED PAGES HAVE ZERO CONSOLE ERRORS!');
  }
}

auditConsole().catch(err => {
  console.error('Fatal audit runner error:', err);
  process.exit(1);
});
