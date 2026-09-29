const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = path.resolve('docs/evidence/store-promotion');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  const page = await browser.newPage();
  await page.goto('https://swan.maxp.online/product/three-line', { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForSelector('h1', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 4000));

  // Scroll 400px down to show the tiers card
  await page.evaluate(() => {
    window.scrollTo(0, 420);
  });
  await new Promise((r) => setTimeout(r, 1000));

  const desktopScrolled = path.join(EVIDENCE_DIR, 'desktop_scrolled_to_tiers.png');
  await page.screenshot({ path: desktopScrolled });
  console.log('📸 Saved:', desktopScrolled);

  // Mobile iPhone 14 (390x844) scrolled
  await page.setViewport({ width: 390, height: 844, isMobile: true });
  await page.goto('https://swan.maxp.online/product/three-line', { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForSelector('h1', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 4000));

  const mobileTop = path.join(EVIDENCE_DIR, 'mobile_top_with_bar.png');
  await page.screenshot({ path: mobileTop });
  console.log('📸 Saved:', mobileTop);

  // Scroll mobile down to tiers card
  await page.evaluate(() => {
    window.scrollTo(0, 600);
  });
  await new Promise((r) => setTimeout(r, 1000));

  const mobileScrolled = path.join(EVIDENCE_DIR, 'mobile_scrolled_to_tiers.png');
  await page.screenshot({ path: mobileScrolled });
  console.log('📸 Saved:', mobileScrolled);

  await browser.close();
}

run();
