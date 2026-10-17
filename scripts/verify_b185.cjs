const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/mokhtar/.gemini/antigravity/brain/41ef79a3-5cc9-46f9-9677-3f9a7948aeaa';

(async () => {
  let browser;
  let exitCode = 0;
  const fatalErrors = [];

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

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (
          !text.includes('favicon') &&
          !text.includes('status of 404') &&
          !text.includes('Failed to load resource') &&
          !text.includes('Authentication failed')
        ) {
          console.error('[Page Console Error]:', text);
          fatalErrors.push(text);
        }
      }
    });

    page.on('pageerror', err => {
      console.error('[Uncaught Page Error]:', err.message);
      fatalErrors.push(err.message);
    });

    // Seed localStorage
    await page.goto('http://localhost:3001/orders/incomplete/reports', { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (switchedToken) {
      await page.evaluate(({ token, user }) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('token', token);
        localStorage.setItem('maxp_token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('currentCompanyId', 'cmu5iix000aa6juwmmqcrls8i');
      }, { token: switchedToken, user: switchedUser });
    }

    console.log('Navigating to /orders/incomplete/reports to verify elevated single-surface chassis...');
    await page.goto('http://localhost:3001/orders/incomplete/reports', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const artifactPath = path.join(ARTIFACT_DIR, 'ord_incomplete_reports_after.png');
    await page.screenshot({ path: artifactPath, fullPage: false });
    console.log('Saved after screenshot:', artifactPath);

    console.log('Total fatal console errors:', fatalErrors.length);
    if (fatalErrors.length > 0) {
      exitCode = 1;
    }
  } catch (err) {
    console.error('Test execution error:', err);
    exitCode = 1;
  } finally {
    if (browser) await browser.close();
    process.exit(exitCode);
  }
})();
