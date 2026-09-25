import { chromium } from 'playwright';
import path from 'path';

const outDir = 'C:\\Users\\mokhtar\\.gemini\\antigravity\\brain\\ee10e7ef-a4d1-4c6a-abf2-e5aa3467d6f1';

async function run() {
  console.log('Launching Chrome browser for Kill-Switch test...');
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
  page.on('response', async res => {
    if (res.url().includes('incidents') || res.url().includes('kill-switch')) {
      console.log(`INCIDENTS_API [${res.status()}]:`, res.url());
      try {
        const body = await res.json();
        console.log('INCIDENTS_BODY:', JSON.stringify(body));
      } catch {}
    }
  });

  console.log('Navigating to login...');
  await page.goto('https://maxp.online/login', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2000);

  const emailInput = page.locator('input[type="email"], input[type="text"]').first();
  await emailInput.fill('swan@h2m.com');

  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill('0165676135');

  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.click();

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
  await page.waitForTimeout(3000);

  console.log('Navigating to AI Hub Incidents Tab (/admin/ai-hub?tab=incidents)...');
  await page.goto('https://maxp.online/admin/ai-hub?tab=incidents', { waitUntil: 'domcontentloaded', timeout: 30000 });
  
  console.log('Waiting for incidents list to load...');
  await page.waitForSelector('text=unknown_tool', { timeout: 15000 });
  await page.waitForTimeout(1000);

  console.log('Selecting incident from list...');
  const incidentCard = page.locator('text=unknown_tool').first();
  await incidentCard.click();
  await page.waitForTimeout(1500);

  console.log('Testing Kill-Switch Toggle (Activate Isolation)...');
  const killSwitchBtn = page.locator('button:has-text("Kill-Switch"), button:has-text("عزل الأداة")').first();
  if (await killSwitchBtn.isVisible()) {
    await killSwitchBtn.click();
    await page.waitForTimeout(3000);
  }

  console.log('Capturing Kill-Switch Active Screenshot...');
  await page.screenshot({
    path: path.join(outDir, 'ai_incident_kill_switch_active.png'),
    fullPage: false,
  });

  console.log('Testing Kill-Switch Toggle (Deactivate Isolation)...');
  const unisolatedBtn = page.locator('button:has-text("إلغاء العزل")').first();
  if (await unisolatedBtn.isVisible()) {
    await unisolatedBtn.click();
    await page.waitForTimeout(3000);
  }

  console.log('Capturing Kill-Switch Reverted Screenshot...');
  await page.screenshot({
    path: path.join(outDir, 'ai_incident_kill_switch_reverted.png'),
    fullPage: false,
  });

  console.log('Done testing kill switch!');
  await browser.close();
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
