const path = require("path");
const puppeteer = require(path.resolve(__dirname, "../backend/node_modules/puppeteer-core"));

async function run() {
  console.log("Launching mobile browser (390x844)...");
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

    await page.goto("https://maxp.online/login", { waitUntil: "networkidle2" });
    await page.waitForSelector("input[type='email']");
    await page.type("input[type='email']", "alpha@h2m.com");
    await page.type("input[type='password']", "123456");
    await Promise.all([
      page.click("button[type='submit']"),
      page.waitForNavigation({ waitUntil: "networkidle2" }).catch(() => {})
    ]);

    await page.goto("https://maxp.online/facebook-inbox", { waitUntil: "networkidle2" });
    await new Promise(r => setTimeout(r, 4000));

    console.log("Selecting conversation...");
    await page.evaluate(() => {
      const card = document.querySelector('div.cursor-pointer, [class*="conversation"], [class*="contact"]');
      if (card) card.click();
    });
    await new Promise(r => setTimeout(r, 3000));

    console.log("Opening Customer Profile drawer by clicking 'بيانات العميل'...");
    await page.evaluate(() => {
      const btn = document.querySelector('button[title*="بيانات العميل"], button[aria-label*="بيانات العميل"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 3000));

    const artifactsDir = "C:\\Users\\shrou\\.gemini\\antigravity\\brain\\47f56593-3755-46d4-8985-0d40d0bb0c7b";
    await page.screenshot({ path: path.join(artifactsDir, "profile_drawer_open.png") });
    console.log("Saved profile_drawer_open.png");

    console.log("Clicking 'طلب سريع' inside drawer...");
    const clickedQuickOrder = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      for (const btn of btns) {
        const title = btn.getAttribute('title') || btn.getAttribute('aria-label') || btn.innerText || '';
        if (title.includes('إنشاء طلب') || title.includes('طلب سريع') || title.trim() === 'طلب') {
          btn.click();
          return true;
        }
      }
      return false;
    });

    console.log("Quick order button clicked:", clickedQuickOrder);
    await new Promise(r => setTimeout(r, 4000));

    const screenshotPath = path.join(artifactsDir, "quick_order_mobile_verified.png");
    await page.screenshot({ path: screenshotPath });
    console.log("Saved quick_order_mobile_verified.png screenshot.");

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
}

run();
