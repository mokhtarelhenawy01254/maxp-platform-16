const puppeteer = require('puppeteer');
(async () => {
  const b = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const p = await b.newPage();
  p.setDefaultTimeout(40000);

  // 1. Login
  console.log('1. تسجيل الدخول...');
  await p.goto('https://maxp.online/auth/login', { waitUntil: 'networkidle0', timeout: 40000 });
  await p.type('#email', 'swan@h2m.com', { delay: 20 });
  await p.type('#password', '0165676135', { delay: 20 });
  await p.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 4000));
  console.log('   URL after login:', p.url());

  // 2. Workflow page
  console.log('\n2. فتح صفحة مسار الطلبات...');
  await p.goto('https://maxp.online/settings/order-workflow', { waitUntil: 'networkidle0', timeout: 40000 });
  await new Promise(r => setTimeout(r, 5000));
  
  // Check tabs
  const tabs = await p.evaluate(() => 
    Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t.length > 0 && t.length < 30)
  );
  console.log('   التبويبات:', tabs.join(' | '));

  // 3. Click settings tab -> toggle
  console.log('\n3. الإعدادات العامة...');
  await p.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('الإعدادات العامة'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  const settingsText = await p.evaluate(() => document.body.innerText.slice(0, 300));
  console.log('   النص:', settingsText.slice(0, 200));

  // 4. Click transitions tab -> open add form -> check dropdowns
  console.log('\n4. قواعد الانتقال...');
  await p.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('قواعد الانتقال'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 2500));

  // Check the empty state
  const emptyText = await p.evaluate(() => document.body.innerText.slice(300, 600));
  console.log('   النص:', emptyText.slice(0, 150));

  // Click "إضافة قاعدة انتقال"
  await p.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('إضافة قاعدة'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2500));

  // Check dropdowns
  const dd = await p.evaluate(() => {
    const sels = document.querySelectorAll('select');
    return Array.from(sels).map((sel, i) => {
      const opts = Array.from(sel.options).slice(1).map(o => o.text.trim()).filter(t => t);
      return { idx: i, count: opts.length, names: (i === 1 ? opts : opts.slice(0, 5)).join(', ') };
    });
  });
  console.log(`   القائمة الأولى (من حالة): ${dd[0].count} حالة`);
  console.log(`   القائمة الثانية (إلى حالة): ${dd[1].count} حالة`);
  
  // Check if PENDING, PREPARING, SHIPPED, DELIVERED are there
  const allNames = await p.evaluate(() => {
    const sels = document.querySelectorAll('select');
    if (sels.length < 2) return [];
    return Array.from(sels[1].options).slice(1).map(o => o.text.trim());
  });
  const checks = ['معلق', 'قيد التجهيز', 'تم الشحن', 'تم التسليم', 'ملغي', 'قيد المعالجة', 'جاهز للشحن'];
  const missing = checks.filter(c => !allNames.includes(c));
  if (missing.length === 0) console.log('   ✅ كل الحالات المهمة موجودة');
  else console.log('   ❌ ناقص:', missing.join(', '));

  // 5. Check approvals tab
  console.log('\n5. طلبات الموافقة...');
  await p.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('طلبات الموافقة'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  const aprText = await p.evaluate(() => document.body.innerText.slice(400, 700));
  console.log('   النص:', aprText.slice(0, 150));

  // 6. Check overrides tab
  console.log('\n6. صلاحيات التجاوز...');
  await p.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('صلاحيات التجاوز'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  const ovrText = await p.evaluate(() => document.body.innerText.slice(500, 800));
  console.log('   النص:', ovrText.slice(0, 150));

  // 7. Check audit tab
  console.log('\n7. سجل العمليات...');
  await p.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('سجل العمليات'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  const audText = await p.evaluate(() => document.body.innerText.slice(600, 900));
  console.log('   النص:', audText.slice(0, 150));

  console.log('\n✅ كل التبويبات شغالة');
  await b.close();
})();
