const path = require("path");
const puppeteer = require(path.resolve(__dirname, "../backend/node_modules/puppeteer-core"));

async function run() {
  console.log("Launching headless browser (390x844)...");
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2
    });
    await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");

    console.log("Navigating to https://maxp.online/login...");
    await page.goto("https://maxp.online/login", { waitUntil: "networkidle2", timeout: 45000 });

    console.log("Filling login credentials...");
    await page.waitForSelector("input[type='email'], input[name='email']", { timeout: 15000 });
    await page.type("input[type='email'], input[name='email']", "alpha@h2m.com");
    await page.type("input[type='password'], input[name='password']", "123456");

    console.log("Clicking submit...");
    await Promise.all([
      page.click("button[type='submit']"),
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {})
    ]);

    await new Promise(r => setTimeout(r, 3000));
    console.log("Current URL after login:", page.url());

    const artifactsDir = "C:\\Users\\shrou\\.gemini\\antigravity\\brain\\47f56593-3755-46d4-8985-0d40d0bb0c7b";

    console.log("Navigating to https://maxp.online/facebook-inbox...");
    await page.goto("https://maxp.online/facebook-inbox", { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise(r => setTimeout(r, 4000));

    console.log("Clicking conversation...");
    await page.evaluate(() => {
      const el = document.querySelector('div.cursor-pointer, [class*="conversation"], [class*="contact"]');
      if (el) el.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    console.log("Opening customer profile drawer by clicking header user button...");
    await page.evaluate(() => {
      // Find buttons in the top header row of the chat
      const headerBtns = Array.from(document.querySelectorAll('button'));
      for (const btn of headerBtns) {
        const title = btn.getAttribute('title') || btn.getAttribute('aria-label') || '';
        if (title.includes('عميل') || title.includes('Customer') || title.includes('ملف')) {
          btn.click();
          return;
        }
      }
      // If no title match, click the 2nd button in header
      const userBtn = document.querySelectorAll('header button, div.border-b button')[1];
      if (userBtn) userBtn.click();
    });

    await new Promise(r => setTimeout(r, 2500));

    console.log("Clicking 'طلب سريع' button inside customer profile...");
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      for (const btn of btns) {
        const text = (btn.getAttribute('title') || '') + ' ' + (btn.getAttribute('aria-label') || '') + ' ' + (btn.innerText || '');
        if (text.includes('طلب سريع') || text.includes('إنشاء طلب')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    console.log("Order button clicked result:", clicked);
    await new Promise(r => setTimeout(r, 4000));

    const screenshotPath = path.join(artifactsDir, "quick_order_mobile_verified.png");
    await page.screenshot({ path: screenshotPath });
    console.log("Saved quick_order_mobile_verified.png screenshot.");

  } catch (err) {
    console.error("Error during run:", err);
  } finally {
    await browser.close();
  }
}

run();
