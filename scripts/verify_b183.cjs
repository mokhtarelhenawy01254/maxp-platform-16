const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/mokhtar/.gemini/antigravity/brain/41ef79a3-5cc9-46f9-9677-3f9a7948aeaa';

(async () => {
  let browser;
  let exitCode = 0;
  try {
    let switchedToken = null;
    let switchedUser = null;
    try {
      const loginRes = await fetch('https://maxp.online/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'swan@h2m.com', password: '0165676135' })
      });
      const loginData = await loginRes.json();
      if (loginData?.data?.token) {
        const token = loginData.data.token;
        const switchRes = await fetch('https://maxp.online/api/v1/auth/switch-company/cmu5iix000aa6juwmmqcrls8i', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }
        });
        const switchData = await switchRes.json();
        switchedToken = switchData?.data?.token || token;
        const meRes = await fetch('https://maxp.online/api/v1/auth/me', {
          headers: { Authorization: 'Bearer ' + switchedToken }
        });
        const meData = await meRes.json();
        switchedUser = meData?.data || { id: 'test', email: 'swan@h2m.com' };
      }
    } catch (e) {
      console.log('Online auth fetch error:', e.message);
    }

    browser = await chromium.launch({
      channel: 'msedge',
      headless: true,
      args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-software-rasterizer']
    });

    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 }
    });

    if (switchedToken && switchedUser) {
      await page.goto('http://localhost:3001/auth/login', { waitUntil: 'domcontentloaded' });
      await page.evaluate(({ token, user }) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('auth_token', token);
        localStorage.setItem('accessToken', token);
      }, { token: switchedToken, user: switchedUser });
    }

    const fatalErrors = [];
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        if (!text.includes('favicon') && !text.includes('404') && !text.includes('Failed to load resource') && !text.includes('SOCKET') && !text.includes('403')) {
          fatalErrors.push(text);
        }
      }
    });

    console.log('Navigating to /orders/ORD-108492-471 (to verify embedded OrderActivityLog)...');
    await page.goto('http://localhost:3001/orders/ORD-108492-471', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2500);

    const logCardScreenshot = path.join(ARTIFACT_DIR, 'ord_activity_log_card_after.png');
    await page.screenshot({ path: logCardScreenshot, fullPage: true });
    console.log('Saved screenshot:', logCardScreenshot);

    console.log('Navigating to /orders/incomplete/cart-preview (to verify IncompleteOrderDetails)...');
    await page.goto('http://localhost:3001/orders/incomplete/cart-preview', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const incompleteDetailsScreenshot = path.join(ARTIFACT_DIR, 'ord_incomplete_order_details_after.png');
    await page.screenshot({ path: incompleteDetailsScreenshot, fullPage: true });
    console.log('Saved screenshot:', incompleteDetailsScreenshot);

    console.log('Fatal Console Errors caught:', fatalErrors.length);
    if (fatalErrors.length > 0) {
      console.log('Errors:', fatalErrors);
      exitCode = 1;
    }
  } catch (err) {
    console.error('Test execution failed:', err);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    process.exit(exitCode);
  }
})();
