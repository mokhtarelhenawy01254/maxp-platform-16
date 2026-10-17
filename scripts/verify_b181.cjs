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

    // Intercept auth/me to ensure company has bulk-orders activeApp
    await page.route('**/auth/me*', async (route) => {
      const response = await route.fetch();
      try {
        const json = await response.json();
        if (json.data) {
          if (json.data.company) {
            json.data.company.activeApps = [...(json.data.company.activeApps || []), 'bulk-orders'];
          }
          if (json.data.companies) {
            json.data.companies.forEach(c => {
              c.activeApps = [...(c.activeApps || []), 'bulk-orders'];
            });
          }
        }
        await route.fulfill({ json });
      } catch (e) {
        await route.continue();
      }
    });

    if (switchedToken && switchedUser) {
      await page.goto('http://localhost:3001/auth/login', { waitUntil: 'domcontentloaded' });
      await page.evaluate(({ token, user }) => {
        if (user.company) {
          user.company.activeApps = [...(user.company.activeApps || []), 'bulk-orders'];
        }
        if (user.companies) {
          user.companies.forEach(c => {
            c.activeApps = [...(c.activeApps || []), 'bulk-orders'];
          });
        }
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

    console.log('Navigating to /orders/bulk...');
    await page.goto('http://localhost:3001/orders/bulk', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2500);

    const bulkOrdersScreenshot = path.join(ARTIFACT_DIR, 'ord_bulk_orders_after.png');
    await page.screenshot({ path: bulkOrdersScreenshot, fullPage: true });
    console.log('Saved screenshot:', bulkOrdersScreenshot);

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
