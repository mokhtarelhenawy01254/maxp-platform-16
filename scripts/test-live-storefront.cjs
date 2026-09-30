const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = path.resolve('docs/evidence/store-promotion');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('🚀 Launching Chrome for live storefront verification...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1280, height: 1100 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  try {
    const page = await browser.newPage();

    // 1. Visit Swan Homepage
    console.log('🌐 Navigating to https://swan.maxp.online ...');
    await page.goto('https://swan.maxp.online', { waitUntil: 'networkidle2', timeout: 35000 });
    await new Promise((r) => setTimeout(r, 4000));

    // Check Promotion Bar
    const homeBar = await page.evaluate(() => {
      const el = document.querySelector('[role="region"][aria-label="عرض المتجر الشامل"]') ||
                 document.querySelector('div[class*="from-slate-950"]');
      return el ? { exists: true, text: el.innerText.trim(), className: el.className } : { exists: false };
    });
    console.log('📍 Homepage StorePromotionBar:', homeBar);

    const homeScreenshot = path.join(EVIDENCE_DIR, 'swan_homepage.png');
    await page.screenshot({ path: homeScreenshot, fullPage: false });
    console.log('📸 Homepage screenshot saved to:', homeScreenshot);

    // 2. Visit Product Page: three-line
    console.log('🌐 Navigating to https://swan.maxp.online/product/three-line ...');
    await page.goto('https://swan.maxp.online/product/three-line', { waitUntil: 'networkidle2', timeout: 35000 });
    await new Promise((r) => setTimeout(r, 4000));

    // Check Product Page components
    const productPageDetails = await page.evaluate(() => {
      const promoBar = document.querySelector('[role="region"][aria-label="عرض المتجر الشامل"]') ||
                       document.querySelector('div[class*="from-slate-950"]');

      // Look for tiers card or quantity offers
      const tierButtons = Array.from(document.querySelectorAll('button[role="radio"]'))
        .map(b => b.innerText.trim());

      const cardHeaders = Array.from(document.querySelectorAll('h3, h4, h5, span'))
        .map(el => el.innerText.trim())
        .filter(t => t.includes('عروض الكمية') || t.includes('باقات توفير') || t.includes('وفر أكثر'));

      return {
        hasPromoBar: Boolean(promoBar),
        promoBarText: promoBar ? promoBar.innerText.trim() : null,
        tierButtons: tierButtons,
        cardHeaders: Array.from(new Set(cardHeaders)),
      };
    });

    console.log('📍 Product Page Details:', JSON.stringify(productPageDetails, null, 2));

    const productScreenshot = path.join(EVIDENCE_DIR, 'swan_product_page.png');
    await page.screenshot({ path: productScreenshot, fullPage: false });
    console.log('📸 Product page screenshot saved to:', productScreenshot);

    // 3. Click Tier 2 ('اشتري 2 والتانية بنص التمن') and verify interaction
    console.log('🖱️ Clicking Tier 2 option...');
    const tier2Clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button[role="radio"]'));
      const tier2 = buttons.find((b) => b.innerText.includes('اشتري 2'));
      if (tier2) {
        tier2.click();
        return true;
      }
      return false;
    });
    console.log('Tier 2 clicked:', tier2Clicked);
    await new Promise((r) => setTimeout(r, 2000));

    // Verify discount calculation in the order summary
    const orderFormState = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('*'))
        .filter((el) => el.children.length === 0 && Boolean(el.innerText))
        .map((el) => el.innerText.trim());

      const discountMatch = texts.filter((t) => t.includes('249.50') || t.includes('748.50') || t.includes('بنص التمن'));
      return {
        hasDiscountOrTotalMatch: discountMatch.length > 0,
        matches: Array.from(new Set(discountMatch)),
      };
    });
    console.log('📍 Quick Order State with Tier 2:', orderFormState);

    const tierSelectedScreenshot = path.join(EVIDENCE_DIR, 'swan_tier_selected.png');
    await page.screenshot({ path: tierSelectedScreenshot, fullPage: false });
    console.log('📸 Tier selected screenshot saved to:', tierSelectedScreenshot);

    console.log('✅ Live Storefront Verification Complete!');
  } catch (err) {
    console.error('❌ Verification Error:', err);
  } finally {
    await browser.close();
  }
}

run();
