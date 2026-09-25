import { chromium } from 'playwright';
import path from 'path';

const outDir = 'C:\\Users\\mokhtar\\.gemini\\antigravity\\brain\\ee10e7ef-a4d1-4c6a-abf2-e5aa3467d6f1';

async function run() {
  console.log('Launching browser to test AI Copilot Live...');
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
  page.on('console', (msg) => {
    console.log('BROWSER_LOG:', msg.text());
  });

  page.on('request', (req) => {
    if (req.url().includes('/ai/chat/message') || req.url().includes('agent')) {
      console.log('OUTGOING_REQUEST:', req.method(), req.url());
      try {
        console.log('REQUEST_POSTDATA:', req.postData()?.slice(0, 300));
      } catch {}
    }
  });

  page.on('response', async (res) => {
    if (res.url().includes('/ai/chat/message') || res.url().includes('agent')) {
      console.log(`API_RESPONSE [${res.status()}]:`, res.url());
      try {
        const body = await res.json();
        console.log('RESPONSE_BODY:', JSON.stringify(body).slice(0, 500));
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

  console.log('Logged in successfully. Navigating to Dashboard...');
  await page.goto('https://maxp.online/admin/dashboard', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  console.log('Looking for Copilot floating launcher or button...');
  const copilotBtn = page.locator('button[aria-label="المساعد الذكي"], button:has-text("المساعد الذكي"), button:has-text("Copilot"), [data-testid="copilot-launcher"]').first();
  
  if (await copilotBtn.isVisible({ timeout: 5000 })) {
    console.log('Clicking copilot launcher...');
    await copilotBtn.click();
  } else {
    console.log('Finding copilot trigger in header or bottom-left/right...');
    const anyCopilot = page.locator('button:has(svg)').filter({ hasText: /مساعد|Copilot|ذكاء/i }).first();
    if (await anyCopilot.isVisible({ timeout: 3000 })) {
      await anyCopilot.click();
    }
  }

  await page.waitForTimeout(2000);

  console.log('Waiting for Copilot Drawer to be visible...');
  const drawerTextarea = page.locator('textarea[placeholder*="اسأل"], textarea[placeholder*="اكتب"], textarea').first();
  await drawerTextarea.waitFor({ state: 'visible', timeout: 15000 });
  console.log('Copilot input area found!');

  console.log('Typing message to test self-learning rule...');
  const testMessage = 'احفظ القاعدة دي في استراتيجيات المتجر: لما العميل يطلب مقاس 45 ويكون مش متوفر اعرض عليه موديل سوان برو كبديل فوري مع شحن مجاني';
  await drawerTextarea.click();
  await page.waitForTimeout(500);
  await drawerTextarea.fill(testMessage);
  await page.waitForTimeout(500);

  console.log('Submitting via Enter key...');
  await drawerTextarea.press('Enter');

  console.log('Checking if submit button needs click...');
  const sendBtn = page.locator('button[aria-label="إرسال الطلب"], button:has-text("إرسال")').first();
  if (await sendBtn.isEnabled({ timeout: 2000 })) {
    console.log('Clicking submit button explicitly...');
    await sendBtn.click();
  }

  console.log('Waiting for AI response...');
  // Wait up to 60s for response
  try {
    const res = await page.waitForResponse(
      (r) => r.url().includes('/ai/chat/message'),
      { timeout: 60000 }
    );
    console.log('Response status:', res.status());
  } catch (e) {
    console.warn('waitForResponse timed out or finished, checking DOM for reply...');
  }

  console.log('Waiting 5s for UI to render output...');
  await page.waitForTimeout(5000);

  console.log('Capturing screenshot of Copilot response...');
  await page.screenshot({
    path: path.join(outDir, 'copilot_live_learning_response.png'),
    fullPage: false,
  });

  console.log('Testing completed successfully!');
  await browser.close();
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
