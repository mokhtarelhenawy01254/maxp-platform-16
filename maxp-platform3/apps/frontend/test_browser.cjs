const { chromium } = require('playwright');
const path = require('path');

async function run() {
    console.log('Starting browser test on http://localhost:3001...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Capture console messages
    page.on('console', msg => {
        console.log(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
    });

    // Capture page errors (unhandled exceptions)
    page.on('pageerror', err => {
        console.error(`[PAGE ERROR] ${err.stack || err.message}`);
    });

    try {
        await page.goto('http://localhost:3001/', { waitUntil: 'load', timeout: 10000 });
        console.log('Page loaded, waiting 5 seconds for React to render...');
        await page.waitForTimeout(5000);

        // Take a screenshot
        const screenshotPath = path.join(__dirname, 'screenshot.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`Screenshot saved to: ${screenshotPath}`);

        // Dump HTML structure
        const bodyHTML = await page.evaluate(() => document.body.innerHTML);
        console.log('\n--- BODY HTML ---');
        console.log(bodyHTML);
        console.log('-----------------\n');
    } catch (e) {
        console.error('Error during navigation:', e);
    } finally {
        await browser.close();
    }
}

run();
