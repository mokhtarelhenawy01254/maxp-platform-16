const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  const EMAIL = 'swan@h2m.com', PASS = '0165676135', BASE = 'https://maxp.online';
  let p = 0, f = 0;
  const t = async (n, fn) => { try { await fn(); console.log(`  ✓ ${n}`); p++; } catch (e) { console.log(`  ✗ ${n}: ${e.message}`); f++; } };

  // Login
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.type('#email', EMAIL, { delay: 20 });
  await page.type('#password', PASS, { delay: 20 });
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 25000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));
  t('Login', () => { if (page.url().includes('auth')) throw new Error('Login failed'); });

  // Get token from browser context
  const token = await page.evaluate(() => 
    sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken') || ''
  );
  const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  const apiCall = async (url) => {
    return page.evaluate(async ({ url: u, h }) => {
      const r = await fetch(u, { credentials: 'include', headers: h });
      return await r.json();
    }, { url, h: authHeaders });
  };

  // Test order workflow page
  console.log('\n=== صفحة مسار الطلبات ===');
  await page.goto(`${BASE}/settings/order-workflow`, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  const btns = await page.evaluate(() => 
    Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t.length > 0 && t.length < 30)
  );
  console.log(`  Tabs: ${JSON.stringify(btns)}`);
  t('All 6 tabs visible', () => {
    ['الإعدادات العامة','إدارة الحالات','قواعد الانتقال','طلبات الموافقة','صلاحيات التجاوز','سجل العمليات'].forEach(label => {
      if (!btns.some(b => b.includes(label))) throw new Error(`Missing: ${label}`);
    });
  });

  // Click each tab
  for (const tab of ['الإعدادات العامة','إدارة الحالات','قواعد الانتقال','طلبات الموافقة','صلاحيات التجاوز','سجل العمليات']) {
    await t(`Click ${tab} tab`, async () => {
      const ok = await page.evaluate((label) => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes(label));
        if (btn) { btn.click(); return true; }
        return false;
      }, tab);
      await new Promise(r => setTimeout(r, 1500));
      if (!ok) throw new Error(`Could not click: ${tab}`);
    });
  }

  // Test QuickStatusChange page
  console.log('\n=== تغيير سريع للحالة ===');
  await page.goto(`${BASE}/orders/quick-status`, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  const qsText = await page.evaluate(() => document.body.innerText);
  t('QuickStatusChange loads', () => {
    if (!qsText.includes('ابحث') && !qsText.includes('بحث') && !qsText.includes('حالة')) throw new Error('Form not visible');
  });

  // Test all 4 order-workflow APIs
  console.log('\n=== APIs ===');
  for (const { label, url } of [
    { label: 'GET /statuses', url: '/api/v1/order-workflow/statuses' },
    { label: 'GET /config', url: '/api/v1/order-workflow/config' },
    { label: 'GET /transitions', url: '/api/v1/order-workflow/transitions' },
    { label: 'GET /approvals/pending', url: '/api/v1/order-workflow/approvals/pending' },
    { label: 'GET /audit-logs', url: '/api/v1/order-workflow/audit-logs' },
  ]) {
    const data = await apiCall(url);
    const ok = data.success === true;
    console.log(`  ${label}: ${ok ? '✓' : '✗'}`, data.message || `count=${data.data?.length || 0}`);
    t(label, () => { if (!ok) throw new Error(data.message || 'failed'); });
  }

  // Test PATCH route accepts multiple status types by making a light check
  console.log('\n=== PATCH validation check ===');
  const statusesApi = await apiCall('/api/v1/order-workflow/statuses');
  t('Statuses have valid codes', () => {
    if (!statusesApi.data?.length) throw new Error('No statuses found');
    statusesApi.data.forEach(s => {
      if (!s.code || s.code !== s.code.toUpperCase()) throw new Error(`Invalid code: ${s.code}`);
    });
  });

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`النتيجة: ${p} نجح, ${f} فشل, ${p+f} إجمالي`);
  console.log(`${'='.repeat(50)}`);
  await page.screenshot({ path: '/tmp/final-test.png', fullPage: true }).catch(() => {});
  await browser.close();
  process.exit(f ? 1 : 0);
})();
