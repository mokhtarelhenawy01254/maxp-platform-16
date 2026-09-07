const path = require("path");
const puppeteer = require(path.resolve(__dirname, "../backend/node_modules/puppeteer-core"));

async function run() {
  console.log("Launching browser...");
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

    // Click conversation
    await page.evaluate(() => {
      const el = document.querySelector('div.cursor-pointer, [class*="conversation"], [class*="contact"]');
      if (el) el.click();
    });
    await new Promise(r => setTimeout(r, 3000));

    // Click at coordinates (85, 130) where the Customer Profile button is located
    console.log("Clicking coordinates (222, 130)...");
    await page.mouse.click(222, 130);
    await new Promise(r => setTimeout(r, 2500));

    const artifactsDir = "C:\\Users\\shrou\\.gemini\\antigravity\\brain\\47f56593-3755-46d4-8985-0d40d0bb0c7b";
    await page.screenshot({ path: path.join(artifactsDir, "drawer_open_step1.png") });

    // Click quick order button
    console.log("Searching and clicking quick order button...");
    const clicked = await page.evaluate(() => {
      const el = document.querySelector('button[title*="طلب"], button[aria-label*="طلب"]');
      if (el) { el.click(); return true; }
      const btns = Array.from(document.querySelectorAll('button, a, span'));
      for (const b of btns) {
        if ((b.innerText || '').includes('طلب سريع') || (b.innerText || '').includes('إنشاء طلب')) {
          b.click();
          return true;
        }
      }
      return false;
    });

    console.log("Quick order clicked:", clicked);
    await new Promise(r => setTimeout(r, 4000));

    await page.screenshot({ path: path.join(artifactsDir, "quick_order_mobile_verified.png") });
    console.log("Saved quick_order_mobile_verified.png screenshot.");

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
}

run();
