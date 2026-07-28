const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // Login
  console.log('=== Login ===');
  await page.goto('https://maxp.online/auth/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Fill login form (RTL - check correct selectors)
  const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="بريد"]');
  const passInput = await page.$('input[type="password"], input[name="password"]');
  
  if (!emailInput || !passInput) {
    // Try to find any input fields
    const allInputs = await page.$$('input');
    console.log('Found inputs:', allInputs.length);
    for (const inp of allInputs) {
      const type = await inp.getAttribute('type');
      const name = await inp.getAttribute('name');
      const placeholder = await inp.getAttribute('placeholder');
      console.log('  Input - type:', type, 'name:', name, 'placeholder:', placeholder);
    }
  }

  // Try common patterns
  try {
    await page.fill('input[type="email"]', 'alitast@max.com');
    await page.fill('input[type="password"]', '123456789');
    await page.click('button[type="submit"]');
  } catch(e) {
    // Try with name attributes
    await page.fill('input[name="email"]', 'alitast@max.com');
    await page.fill('input[name="password"]', '123456789');
    await page.click('button[type="submit"]');
  }

  await page.waitForTimeout(5000);
  console.log('After login URL:', page.url());

  // Take screenshot of what we see after login
  await page.screenshot({ path: 'C:\\Users\\Ahmed\\AppData\\Local\\Temp\\opencode\\after_login.png', fullPage: true });
  
  // Now visit the 4 pages
  const urls = [
    'https://maxp.online/marketplace',
    'https://maxp.online/marketplace/themes',
    'https://maxp.online/marketplace/bundles',
    'https://maxp.online/payments'
  ];

  for (const url of urls) {
    console.log('\n=== ' + url + ' ===');
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
      
      console.log('Current URL:', page.url());
      
      // Get page content
      const text = await page.evaluate(() => document.body?.innerText?.substring(0, 1500) || 'EMPTY');
      console.log('CONTENT:', text);
      
      // Screenshot
      const name = url.split('/').pop() || 'marketplace';
      await page.screenshot({ path: 'C:\\Users\\Ahmed\\AppData\\Local\\Temp\\opencode\\' + name + '.png', fullPage: true });
      
      // Check for errors
      const errorText = await page.evaluate(() => {
        const errs = document.querySelectorAll('[class*="error"], [role="alert"]');
        return Array.from(errs).map(e => e.textContent).join(' | ');
      });
      if (errorText) console.log('ERRORS:', errorText);
      
    } catch (err) {
      console.log('ERROR:', err.message);
    }
  }

  await browser.close();
  console.log('\nDONE - screenshots saved to temp/opencode/');
})();
