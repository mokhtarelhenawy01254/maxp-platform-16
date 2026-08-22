const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Users\\MG\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(40000);

  // 1. Login
  await page.goto('https://maxp.online/auth/login', { waitUntil: 'networkidle0', timeout: 40000 });
  await page.waitForSelector('#email, input[name=email], input[type=email]', { timeout: 30000 });
  const emailSel = await page.$('#email') ? '#email' : (await page.$('input[name=email]') ? 'input[name=email]' : 'input[type=email]');
  const passSel = await page.$('#password') ? '#password' : 'input[type=password]';
  await page.fill(emailSel, 'swan@h2m.com');
  await page.fill(passSel, '0165676135');
  await page.click('button[type=submit]');
  await page.waitForTimeout(5000);
  console.log('URL after login:', page.url());
  await page.screenshot({ path: 'scratch_login.png', fullPage: false });

  // 2. Manual order page
  await page.goto('https://maxp.online/orders/manual', { waitUntil: 'networkidle0', timeout: 40000 });
  await page.waitForTimeout(4000);
  console.log('Manual order URL:', page.url());
  await page.screenshot({ path: 'scratch_manual_order.png', fullPage: true });

  // dump inputs on the manual order page
  const manualInfo = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map((el, i) => ({
      i,
      tag: el.tagName,
      type: el.type || '',
      placeholder: el.placeholder || '',
      value: el.value || '',
      name: el.name || '',
    }));
    const h3s = Array.from(document.querySelectorAll('h3')).map(h => h.textContent.trim());
    return { inputs, h3s };
  });
  console.log('MANUAL H3:', JSON.stringify(manualInfo.h3s));
  console.log('MANUAL INPUTS:', JSON.stringify(manualInfo.inputs));

  // Try to find phone input and type a number to see autofill behavior
  // find input with placeholder 01xxxxxxxxx
  const phoneInput = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('input')).find(i => (i.placeholder || '').includes('01x') || (i.placeholder||'').includes('01'));
    if (el) { el.focus(); return true; } return false;
  });
  console.log('found phone input:', phoneInput);

  await browser.close();
})().catch(e => { console.error('ERROR', e); process.exit(1); });
