const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 390, height: 844 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  const page = await browser.newPage();
  await page.goto('https://swan.maxp.online/product/three-line', { waitUntil: 'domcontentloaded', timeout: 35000 });

  // Wait for React to hydrate and replace skeleton
  console.log('⏳ Waiting for React hydration...');
  await page.waitForFunction(() => !document.querySelector('.storefront-loading') && document.querySelector('button[role="radio"]'), { timeout: 25000 });

  const result = await page.evaluate(() => {
    const promo = document.querySelector('[role="region"][aria-label="عرض المتجر الشامل"]');
    const radioButtons = Array.from(document.querySelectorAll('button[role="radio"]')).map((b) => b.innerText.trim());
    return {
      promoBarText: promo ? promo.innerText.trim() : null,
      tiers: radioButtons,
    };
  });

  console.log('📱 MOBILE LIVE STOREFRONT VERIFICATION:', JSON.stringify(result, null, 2));

  // Take screenshot of mobile promo bar directly
  const promoEl = await page.$('[role="region"][aria-label="عرض المتجر الشامل"]');
  if (promoEl) {
    await promoEl.screenshot({ path: 'docs/evidence/store-promotion/mobile_verified_promobar.png' });
    console.log('📸 Saved: docs/evidence/store-promotion/mobile_verified_promobar.png');
  }

  // Take screenshot of mobile tiers card directly
  const tierCard = await page.$('div.rounded-2xl.border-rose-200\\/90, div[class*="from-rose-50"]');
  if (tierCard) {
    await tierCard.screenshot({ path: 'docs/evidence/store-promotion/mobile_verified_tierscard.png' });
    console.log('📸 Saved: docs/evidence/store-promotion/mobile_verified_tierscard.png');
  }

  await browser.close();
})();
