const { chromium } = require('playwright');
const path = require('path');

async function testUrl(url, name) {
    console.log(`\n========================================`);
    console.log(`Testing URL: ${url} (${name})`);
    console.log(`========================================`);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const logs = [];
    const pageErrors = [];

    page.on('console', msg => {
        const text = msg.text();
        const type = msg.type().toUpperCase();
        logs.push(`[CONSOLE ${type}] ${text}`);
        console.log(`[CONSOLE ${type}] ${text}`);
    });

    page.on('pageerror', err => {
        pageErrors.push(err.stack || err.message);
        console.error(`[PAGE ERROR] ${err.stack || err.message}`);
    });

    try {
        const response = await page.goto(url, { waitUntil: 'load', timeout: 15000 });
        console.log(`Response status: ${response ? response.status() : 'No response'}`);
        
        console.log('Waiting 6 seconds for React to mount and run hooks...');
        await page.waitForTimeout(6000);

        const title = await page.title();
        console.log(`Page title: "${title}"`);

        const screenshotPath = path.join(__dirname, `screenshot_${name}.png`);
        await page.screenshot({ path: screenshotPath });
        console.log(`Screenshot saved to: ${screenshotPath}`);

        const bodyHTML = await page.evaluate(() => document.body.innerHTML);
        const hasSpinner = bodyHTML.includes('initial-loading') || bodyHTML.includes('loading-spinner');
        const rootContent = await page.evaluate(() => document.getElementById('root')?.innerHTML || '');
        
        console.log(`Initial Loading element present: ${hasSpinner}`);
        console.log(`Root inner HTML length: ${rootContent.length}`);
        if (rootContent.length < 200) {
            console.log(`WARNING: Root content is very short! Content: "${rootContent}"`);
        }
    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        await browser.close();
    }
}

async function run() {
    try {
        await testUrl('http://localhost:3001/', 'home');
    } catch (e) { console.error(e); }
    try {
        await testUrl('http://localhost:3001/auth/login', 'login');
    } catch (e) { console.error(e); }
    try {
        await testUrl('http://localhost:3001/dashboard', 'dashboard');
    } catch (e) { console.error(e); }
}

run();
