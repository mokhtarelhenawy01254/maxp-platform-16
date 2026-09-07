const path = require("path");
const fs = require("fs");
const puppeteer = require(path.resolve(__dirname, "../backend/node_modules/puppeteer-core"));

async function run() {
  console.log("Launching Puppeteer for swan@h2m.com product inspection...");
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--user-data-dir=C:\\Users\\shrou\\AppData\\Local\\Temp\\test-swan-inspect-products"
    ]
  });

  const artifactsDir = "C:\\Users\\shrou\\.gemini\\antigravity\\brain\\47f56593-3755-46d4-8985-0d40d0bb0c7b";

  try {
    const page = await browser.newPage();
    
    // Set viewport to mobile 390x844
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2
    });

    console.log("Navigating to login page...");
    await page.goto("https://maxp.online/login", { waitUntil: "networkidle2", timeout: 45000 });

    await page.waitForSelector("input[type='email']", { timeout: 20000 });
    await page.type("input[type='email']", "swan@h2m.com");
    await page.type("input[type='password']", "0165676135");

    await Promise.all([
      page.click("button[type='submit']"),
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {})
    ]);

    await new Promise(r => setTimeout(r, 3000));

    // Inspect API response for /api/v1/products directly from browser context
    console.log("Fetching /api/v1/products directly in browser context...");
    const productsData = await page.evaluate(async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || '';
        const res = await fetch('https://maxp.online/api/v1/products?limit=30', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        return json;
      } catch (err) {
        return { error: err.toString() };
      }
    });

    console.log("Products API result count:", productsData?.data?.length || 0);
    if (productsData?.data) {
      console.log("Sample product 1:", JSON.stringify(productsData.data[0], null, 2));
    }

    console.log("Navigating to facebook-inbox to open QuickOrderModal directly...");
    await page.goto("https://maxp.online/facebook-inbox", { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise(r => setTimeout(r, 4000));

    // Select first conversation if any
    await page.evaluate(() => {
      const card = document.querySelector('div.cursor-pointer, [class*="conversation"]');
      if (card) card.click();
    });
    await new Promise(r => setTimeout(r, 3000));

    // Click "طلب سريع" or "طلب متجر"
    console.log("Clicking Quick Order button...");
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      const btn = btns.find(b => b.textContent && (b.textContent.includes('طلب متجر') || b.textContent.includes('طلب سريع')));
      if (btn) {
        btn.click();
        return btn.textContent.trim();
      }
      return null;
    });
    console.log("Clicked button:", clicked);

    await new Promise(r => setTimeout(r, 5000));

    const mobileScreenshot = path.join(artifactsDir, "swan_products_mobile_modal.png");
    await page.screenshot({ path: mobileScreenshot });
    console.log("Saved mobile screenshot to:", mobileScreenshot);

    // Switch viewport to desktop 1440x900
    await page.setViewport({ width: 1440, height: 900 });
    await new Promise(r => setTimeout(r, 2000));
    const desktopScreenshot = path.join(artifactsDir, "swan_products_desktop_modal.png");
    await page.screenshot({ path: desktopScreenshot });
    console.log("Saved desktop screenshot to:", desktopScreenshot);

  } catch (err) {
    console.error("Error in inspect-swan-products:", err);
  } finally {
    await browser.close();
  }
}

run();
