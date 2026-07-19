const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Basic JWT for a local user we saw earlier: emp21+...
// Or we can just use the login API directly via fetch inside the script

const outDir = 'C:\\Users\\shrou\\.gemini\\antigravity\\brain\\baf65b26-c2c0-4858-ae03-de292b67d87c\\scratch';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();
  page.on('console', m => console.log('PAGE:', m.text()));

  console.log('Navigating to login...');
  await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle0' });

  // Let's use the SuperAdmin account
  console.log('Filling login form...');
  await page.type('input[type="email"]', 'superadmin@system.com');
  await page.type('input[type="password"]', 'SuperAdmin123!');
  await page.click('button[type="submit"]');

  console.log('Waiting for navigation...');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

  console.log('Current URL:', page.url());

  console.log('Navigating to facebook-inbox...');
  await page.goto('http://localhost:3000/facebook-inbox', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 5000));

  console.log('Inbox URL:', page.url());

  // Screenshot full page
  await page.screenshot({ path: path.join(outDir, 'inbox_live_login.png'), fullPage: false });
  console.log('Screenshot saved!');

  await browser.close();
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
