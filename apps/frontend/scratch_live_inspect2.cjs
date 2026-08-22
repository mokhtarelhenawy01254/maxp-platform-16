const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Users\\MG\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(40000);

  await page.goto('https://maxp.online/auth/login', { waitUntil: 'networkidle0', timeout: 40000 });
  await page.waitForSelector('#email, input[name=email], input[type=email]', { timeout: 30000 });
  const emailSel = await page.$('#email') ? '#email' : (await page.$('input[name=email]') ? 'input[name=email]' : 'input[type=email]');
  const passSel = await page.$('#password') ? '#password' : 'input[type=password]';
  await page.fill(emailSel, 'swan@h2m.com');
  await page.fill(passSel, '0165676135');
  await page.click('button[type=submit]');
  await page.waitForTimeout(6000);
  console.log('after login:', page.url());

  // capture sidebar links
  const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => a.getAttribute('href')).filter(h => h && h.includes('order')));
  console.log('ORDER LINKS:', JSON.stringify(links));

  // go to manual order
  await page.goto('https://maxp.online/orders/manual', { waitUntil: 'domcontentloaded', timeout: 40000 });
  await page.waitForTimeout(5000);
  console.log('manual url:', page.url());
  const body = await page.evaluate(() => document.body.innerText.slice(0, 1500));
  console.log('BODY START:', JSON.stringify(body));
  await page.screenshot({ path: 'scratch_manual_order2.png', fullPage: true });

  await browser.close();
})().catch(e => { console.error('ERROR', e); process.exit(1); });
