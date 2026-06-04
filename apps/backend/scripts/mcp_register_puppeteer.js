const puppeteer = require('puppeteer');

async function registerViaOpenChrome() {
    console.log('--- STARTING PUPPETEER CONNECT ---');
    let browser;
    try {
        // Connect to the already open Chrome instance
        browser = await puppeteer.connect({
            browserURL: 'http://127.0.0.1:9222',
        });

        const pages = await browser.pages();
        // Use the first page or create a new one
        const page = pages.length > 0 ? pages[0] : await browser.newPage();

        console.log('Connected to browser. Navigating to register page...');
        await page.goto('http://localhost:3000/auth/register', { waitUntil: 'networkidle0' });

        console.log('Filling form...');
        await page.type('#companyName', 'BrowserCompany');
        await page.type('#firstName', 'Browser');
        await page.type('#lastName', 'User');
        await page.type('#email', 'mcp_browser_final_6@example.com'); // Unique email
        await page.type('#phone', '0123456789');
        await page.type('#password', 'Password123!');
        await page.type('#confirmPassword', 'Password123!');

        console.log('Submitting form...');
        await page.click('button[type="submit"]');

        console.log('Waiting for redirect or success message...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for processing

        const url = page.url();
        console.log('Current URL:', url);

        // Save a screenshot for proof
        const screenshotPath = 'C:\\Users\\38asfasf\\.gemini\\antigravity\\brain\\6bf34595-88ea-4993-9dcc-80a0ea20d9e9\\registration_browser_success.png';
        await page.screenshot({ path: screenshotPath });
        console.log('Screenshot saved to:', screenshotPath);

        if (url.includes('dashboard') || url.includes('company-dashboard')) {
            console.log('--- REGISTRATION SUCCESSFUL VIA BROWSER ---');
        } else {
            const errorMsg = await page.evaluate(() => {
                const el = document.querySelector('.bg-red-50');
                return el ? el.innerText : 'No visible error';
            });
            console.log('Final Page State:', errorMsg);
        }

    } catch (error) {
        console.error('--- ERROR DURING BROWSER AUTOMATION ---');
        console.error(error.message);
        process.exit(1);
    } finally {
        if (browser) {
            await browser.disconnect();
        }
        console.log('--- DISCONNECTED ---');
    }
}

registerViaOpenChrome();
