const playwright = require('playwright');

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Capture ALL console output
  page.on('console', msg => {
    console.log('[' + msg.type() + '] ' + msg.text());
  });
  page.on('pageerror', err => {
    console.log('PAGE_ERROR:', err.message);
    console.log('STACK:', err.stack?.substring(0, 500));
  });

  // Login
  await page.goto('https://maxp.online/auth/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  
  // Fill login - try different selectors
  try {
    // The form might use different selectors, let's try filling the first two inputs
    const inputs = await page.$$('input');
    if (inputs.length >= 2) {
      await inputs[0].fill('alitast@max.com');
      await inputs[1].fill('123456789');
    }
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text.includes('╪»╪«┘ê┘ä') || text.includes('Login') || text.includes('╪¬╪│╪¼┘è┘ä')) {
        await btn.click();
        break;
      }
    }
  } catch(e) {
    console.log('Login fill error:', e.message);
  }
  
  await page.waitForTimeout(5000);
  console.log('Logged in, URL:', page.url());

  // Now check marketplace
  console.log('\n=== MARKETPLACE ===');
  await page.goto('https://maxp.online/marketplace', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  
  // Check what's visible in the main content area
  const mainContent = await page.evaluate(() => {
    const main = document.querySelector('main') || document.querySelector('[class*="content"]') || document.querySelector('#root > div > div:last-child');
    return main ? (main.innerText?.substring(0, 500) || 'EMPTY') : 'NO MAIN FOUND';
  });
  console.log('MAIN CONTENT:', mainContent);
  
  // Check for any visible errors on the page
  const visibleErrors = await page.evaluate(() => {
    const all = document.querySelectorAll('*');
    const errors = [];
    for (const el of all) {
      if (el.children.length === 0 && el.textContent?.trim()) {
        const t = el.textContent.trim();
        if (t.includes('Error') || t.includes('error') || t.includes('undefined') || t.includes('null') || t.includes('Failed')) {
          errors.push(t.substring(0, 200));
        }
      }
    }
    return errors.slice(0, 10);
  });
  if (visibleErrors.length) {
    console.log('VISIBLE ERRORS:', visibleErrors.join(' | '));
  }

  // Check React root
  const rootHtml = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root ? root.innerHTML.substring(0, 2000) : 'NO ROOT';
  });
  console.log('ROOT HTML (first 2K):', rootHtml);

  await browser.close();
  console.log('\nDONE');
})();
