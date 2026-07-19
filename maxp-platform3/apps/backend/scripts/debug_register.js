const puppeteer = require('puppeteer');

async function debugRegistration() {
    console.log('--- STARTING DEBUG SESSION ---');
    let browser;
    try {
        browser = await puppeteer.connect({
            browserURL: 'http://127.0.0.1:9222',
        });

        const pages = await browser.pages();
        const page = pages.length > 0 ? pages[0] : await browser.newPage();

        // Capture console logs
        page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
        page.on('requestfailed', request => console.log('BROWSER_NET_FAIL:', request.url(), request.failure().errorText));

        console.log('Re-Navigating to register page...');
        await page.goto('http://localhost:3000/auth/register', { waitUntil: 'networkidle0' });

        console.log('Filling form with unique email...');
        const uniqueEmail = `mcp_debug_${Date.now()}@example.com`;
        await page.type('#companyName', 'DebugCompany');
        await page.type('#firstName', 'Debug');
        await page.type('#lastName', 'User');
        await page.type('#email', uniqueEmail);
        await page.type('#phone', '0123456789');
        await page.type('#password', 'Password123!');
        await page.type('#confirmPassword', 'Password123!');

        console.log('Submitting form...');
        await page.click('button[type="submit"]');

        console.log('Waiting 10 seconds for result...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        const url = page.url();
        console.log('Current URL:', url);

        // Check for error text on page
        const errorText = await page.evaluate(() => {
            const errorEl = document.querySelector('.bg-red-50');
            return errorEl ? errorEl.innerText : 'None';
        });
        console.log('Error displayed on page:', errorText);

        // Screenshot for state
        const screenshotPath = `C:\\Users\\38asfasf\\.gemini\\antigravity\\brain\\6bf34595-88ea-4993-9dcc-80a0ea20d9e9\\debug_reg_${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath });
        console.log('Screenshot saved:', screenshotPath);

    } catch (error) {
        console.error('DEBUG_ERROR:', error.message);
    } finally {
        if (browser) await browser.disconnect();
        console.log('--- DEBUG SESSION FINISHED ---');
    }
}

debugRegistration();
