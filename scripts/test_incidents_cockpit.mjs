import { chromium } from 'playwright';
import path from 'path';

const outDir = 'C:\\Users\\mokhtar\\.gemini\\antigravity\\brain\\ee10e7ef-a4d1-4c6a-abf2-e5aa3467d6f1';

async function run() {
  console.log('Launching Chrome browser...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    serviceWorkers: 'block',
    locale: 'ar-EG',
  });

  const page = await context.newPage();
  page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER_ERROR:', err.message));

  console.log('Navigating to login...');
  await page.goto('https://maxp.online/login', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);

  console.log('Filling login credentials...');
  const emailInput = page.locator('input[type="email"], input[type="text"]').first();
  await emailInput.fill('swan@h2m.com');

  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill('0165676135');

  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.click();

  console.log('Waiting for authentication...');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
  await page.waitForTimeout(3000);

  console.log('Navigating to Tenant AI Hub Incidents Tab (/admin/ai-hub?tab=incidents)...');
  await page.goto('https://maxp.online/admin/ai-hub?tab=incidents', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  console.log('Capturing AI Hub Incidents Tab screenshot...');
  await page.screenshot({
    path: path.join(outDir, 'ai_hub_incidents_tab.png'),
    fullPage: false,
  });

  console.log('Navigating to Direct AI Incidents Cockpit (/admin/ai-incidents)...');
  await page.goto('https://maxp.online/admin/ai-incidents', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  console.log('Capturing AI Incidents Cockpit screenshot...');
  await page.screenshot({
    path: path.join(outDir, 'ai_incidents_cockpit_2026.png'),
    fullPage: false,
  });

  console.log('Done!');
  await browser.close();
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
