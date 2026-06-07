const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await puppeteer.launch({ 
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 }); // Taller viewport for dashboard

  const randomSuffix = Math.floor(Math.random() * 10000);
  const email = `testuser_${randomSuffix}@maxp.online`;
  const password = 'Password123!';

  try {
    console.log('Navigating to Register...');
    await page.goto('http://localhost:3001/auth/register', { waitUntil: 'networkidle2' });

    console.log('Filling Register form...');
    await page.type('input[name="companyName"]', 'Elite Business ' + randomSuffix);
    await page.type('input[name="firstName"]', 'Test');
    await page.type('input[name="lastName"]', 'User');
    await page.type('input[name="email"]', email);
    await page.type('input[name="phone"]', '01012345678');
    await page.type('input[name="password"]', password);
    await page.type('input[name="confirmPassword"]', password);

    console.log('Submitting Register...');
    await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
    ]);

    console.log('Current URL:', page.url());

    if (page.url().includes('/onboarding')) {
        console.log('On onboarding page. Clicking Skip...');
        // Wait for the skip button to appear
        await page.waitForSelector('.business-onboarding-skip button', { timeout: 10000 });
        await Promise.all([
            page.click('.business-onboarding-skip button'),
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
        ]);
        console.log('Skipped onboarding. Current URL:', page.url());
    }

    // Wait for dashboard content to load
    console.log('Waiting for dashboard content...');
    await new Promise(r => setTimeout(r, 10000));
    
    const screenshotPath = path.join(process.cwd(), 'artifacts', 'dashboard_final.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Dashboard screenshot saved to:', screenshotPath);

    // Extract structure for analysis
    const analysis = await page.evaluate(() => {
        const stats = Array.from(document.querySelectorAll('.company-dashboard-inline-fact')).map(el => el.innerText.trim());
        const panels = Array.from(document.querySelectorAll('.business-page-panel')).map(el => el.querySelector('h2, h3')?.innerText);
        return { stats, panels, url: window.location.href };
    });
    console.log('Analysis:', JSON.stringify(analysis, null, 2));

  } catch (err) {
    console.error('Error:', err);
    await page.screenshot({ path: path.join(process.cwd(), 'artifacts', 'journey_error.png') });
  } finally {
    await browser.close();
  }
})();
