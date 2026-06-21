const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const outDir = 'C:\\Users\\shrou\\.gemini\\antigravity\\brain\\baf65b26-c2c0-4858-ae03-de292b67d87c\\scratch';
const htmlContent = fs.readFileSync(path.join(outDir, 'compare.html'), 'utf8');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
    defaultViewport: { width: 780, height: 500 }
  });
  
  const page = await browser.newPage();
  page.on('console', m => console.log('PAGE LOG:', m.text()));
  
  // Use setContent with explicit wait
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  // Check body dimensions
  const dims = await page.evaluate(() => {
    const body = document.body;
    return {
      scrollHeight: body.scrollHeight,
      scrollWidth: body.scrollWidth,
      bg: window.getComputedStyle(body).backgroundColor,
      childCount: body.children.length,
      firstChild: body.children[0] ? body.children[0].tagName + ' ' + body.children[0].className : 'none'
    };
  });
  console.log('Body dims:', JSON.stringify(dims));
  
  await page.screenshot({ path: path.join(outDir, 'compare.png'), fullPage: true });
  console.log('Done');
  await browser.close();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
