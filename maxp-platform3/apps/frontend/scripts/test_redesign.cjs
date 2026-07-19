const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    isRTL: true
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to Login Page...');
    await page.goto('http://localhost:3001/auth/login', { waitUntil: 'networkidle' });

    console.log('Logging in...');
    await page.type('input[type="email"]', 'admin@superadmin.com');
    await page.type('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    console.log('Current URL after login:', page.url());

    console.log('Navigating to SuperAdmin Companies V2...');
    await page.goto('http://localhost:3001/super-admin/companies-v2', { waitUntil: 'networkidle' });

    // Wait a bit for React to render
    await page.waitForTimeout(5000);

    console.log('Page title:', await page.title());
    console.log('URL:', page.url());

    const bodyText = await page.innerText('body');
    if (bodyText.includes('حدث خطأ')) {
      console.log('Error found on page!');
      console.log('Body text snippet:', bodyText.substring(0, 1000));
    } else {
      console.log('No visible error on page.');
      console.log('Body text contains "إدارة الشركات":', bodyText.includes('إدارة الشركات'));
      console.log('Body text contains "إجمالي الشركات":', bodyText.includes('إجمالي الشركات'));

      // Take a final screenshot
      await page.screenshot({ path: 'redesign_test_final_auth.png', fullPage: true });
      console.log('Final authenticated screenshot saved to redesign_test_final_auth.png');
    }

  } catch (error) {
    console.error('Error during testing:', error);
    await page.screenshot({ path: 'redesign_test_auth_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
