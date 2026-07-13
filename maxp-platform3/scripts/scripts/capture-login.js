const puppeteer = require('puppeteer-core');
const path = require('path');

async function run() {
  const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  const artifactsDir = path.join(process.cwd(), 'artifacts');
  
  const pagesToCapture = [
    { name: 'landing', url: 'http://localhost:3001/' },
    { name: 'login', url: 'http://localhost:3001/auth/login' },
    { name: 'register', url: 'http://localhost:3001/auth/register' },
    { name: 'forgot-password', url: 'http://localhost:3001/auth/forgot-password' }
  ];

  for (const pageInfo of pagesToCapture) {
    try {
      console.log(`Navigating to ${pageInfo.name} page...`);
      await page.goto(pageInfo.url, { waitUntil: 'networkidle2' });
      
      const screenshotPath = path.join(artifactsDir, `${pageInfo.name}_redesign.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`${pageInfo.name} screenshot saved to:`, screenshotPath);
    } catch (error) {
      console.error(`Error capturing ${pageInfo.name}:`, error);
    }
  }

  await browser.close();
}

run();
