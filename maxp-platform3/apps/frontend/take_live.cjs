const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const outDir = 'C:\\Users\\shrou\\.gemini\\antigravity\\brain\\baf65b26-c2c0-4858-ae03-de292b67d87c\\scratch';
const authData = JSON.parse(fs.readFileSync('e:\\max_p_new\\max_p_new\\inbox-auth.json', 'utf8'));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();

  // Go to app first
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });

  // Inject auth
  const lsItems = authData.origins[0].localStorage;
  const ssItems = authData.origins[0].sessionStorage;
  await page.evaluate((ls, ss) => {
    ls.forEach(i => localStorage.setItem(i.name, i.value));
    ss.forEach(i => sessionStorage.setItem(i.name, i.value));
  }, lsItems, ssItems);

  console.log('Auth injected. Navigating to facebook-inbox...');

  // Navigate to facebook inbox
  await page.goto('http://localhost:3000/facebook-inbox', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 5000));

  console.log('URL:', page.url());

  // Screenshot full page
  await page.screenshot({ path: path.join(outDir, 'inbox_live.png'), fullPage: false });
  console.log('Full screenshot saved');

  // Try to find and screenshot just the conversation list
  const listEl = await page.$('[class*="conversation"]') || await page.$('.flex-col') || await page.$('aside');
  if (listEl) {
    const box = await listEl.boundingBox();
    if (box) {
      await page.screenshot({
        path: path.join(outDir, 'inbox_list_zoom.png'),
        clip: { x: box.x, y: box.y, width: Math.min(box.width, 380), height: Math.min(box.height, 700) }
      });
      console.log('List zoom saved');
    }
  }

  await browser.close();
  console.log('Done!');
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
