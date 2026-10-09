const puppeteer = require('../apps/backend/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = path.resolve('docs/evidence/post-purchase-offer');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('🚀 Launching Chrome for live post-purchase offer verification...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1280, height: 1100 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  const errors = [];
  try {
    const page = await browser.newPage();

    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        console.error('❌ [PAGE ERROR]:', text);
        errors.push(text);
      } else {
        console.log(`[PAGE ${type.toUpperCase()}]:`, text);
      }
    });

    page.on('pageerror', (err) => {
      console.error('💥 [PAGE UNCAUGHT]:', err.message);
      errors.push(err.message);
    });

    // 1. Visit Swan Order Offer Page
    const testUrl = 'https://swan.maxp.online/order-offer?orderId=test-12345';
    console.log(`🌐 Navigating to ${testUrl} ...`);
    await page.goto(testUrl, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 4000));

    // Inspect Offer Page Elements
    const offerDetails = await page.evaluate(() => {
      const titleEl = document.querySelector('h1');
      const title = titleEl ? titleEl.innerText.trim() : null;

      const countdownEl = document.querySelector('.tabular-nums');
      const countdown = countdownEl ? countdownEl.innerText.trim() : null;

      // Variants
      const variantButtons = Array.from(document.querySelectorAll('button'))
        .map(b => b.innerText.trim())
        .filter(t => t.includes('37') || t.includes('38') || t.includes('39') || t.includes('40') || t.includes('41'));

      const allButtons = Array.from(document.querySelectorAll('button'))
        .map(b => b.innerText.trim());

      const bodyText = document.body.innerText;
      const hasSwanAura = bodyText.includes('Swan Aura');
      const hasPrice399 = bodyText.includes('399');
      const hasTimer = bodyText.includes('ينتهي هذا العرض');

      // Product image
      const imgs = Array.from(document.querySelectorAll('img')).map(i => i.src);

      return {
        title,
        hasSwanAura,
        hasPrice399,
        hasTimer,
        countdown,
        variantButtons,
        allButtons,
        imgs: imgs.slice(0, 5),
        currentUrl: window.location.href
      };
    });

    console.log('📍 Live Offer Details Extracted:', JSON.stringify(offerDetails, null, 2));

    const screenshotPath = path.join(EVIDENCE_DIR, 'swan_order_offer_live.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('📸 Full page screenshot saved to:', screenshotPath);

    // Assertions
    if (!offerDetails.hasSwanAura) {
      throw new Error('Swan Aura product name not found on page!');
    }
    if (!offerDetails.hasPrice399) {
      throw new Error('Offer price 399 not found on page!');
    }
    if (offerDetails.variantButtons.length === 0) {
      throw new Error('Variant buttons (sizes 37, 38, etc.) not found on page!');
    }

    console.log('✅ ALL VERIFICATIONS PASSED SUCCESSFULLY!');
    console.log(`Variants found: ${offerDetails.variantButtons.join(', ')}`);
    console.log(`Console errors count: ${errors.length}`);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
