const { chromium } = require('playwright');
const path = require('path');

async function run() {
    console.log("Testing Storefront URL: http://localhost:3001/store");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => {
        console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    page.on('pageerror', err => {
        console.error(`[PAGE ERROR] ${err.stack || err.message}`);
    });

    page.on('requestfailed', request => {
        console.error(`[REQUEST FAILED] ${request.url()} - ${request.failure() ? request.failure().errorText : ''}`);
    });

    page.on('response', response => {
        const status = response.status();
        if (status >= 400) {
            console.error(`[HTTP ERROR] ${response.url()} status ${status}`);
        } else {
            // Log api requests for debugging
            if (response.url().includes('/api/')) {
                console.log(`[API RESPONSE] ${response.url()} status ${status}`);
            }
        }
    });

    try {
        const response = await page.goto('http://localhost:3001/store', { waitUntil: 'load', timeout: 15000 });
        console.log(`Response status: ${response ? response.status() : 'No response'}`);
        
        console.log('Waiting 10 seconds...');
        await page.waitForTimeout(10000);

        const title = await page.title();
        console.log(`Page title: "${title}"`);

        const screenshotPath = path.join(__dirname, 'screenshot_shop_test.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`Screenshot saved to: ${screenshotPath}`);

        const rootContent = await page.evaluate(() => document.getElementById('root')?.innerHTML || '');
        console.log(`Root inner HTML length: ${rootContent.length}`);
    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        await browser.close();
    }
}

run();
