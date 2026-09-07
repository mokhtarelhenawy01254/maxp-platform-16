const path = require("path");
const puppeteer = require(path.resolve(__dirname, "../backend/node_modules/puppeteer-core"));

async function run() {
  console.log("Launching headless browser for mobile test...");
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

    console.log("Navigating to http://localhost:3005/test-quick-order...");
    await page.goto("http://localhost:3005/test-quick-order", { waitUntil: "networkidle2", timeout: 30000 });

    await new Promise(r => setTimeout(r, 3000));

    const artifactsDir = "C:\\Users\\shrou\\.gemini\\antigravity\\brain\\47f56593-3755-46d4-8985-0d40d0bb0c7b";
    const screenshotPath = path.join(artifactsDir, "quick_order_mobile_verified.png");

    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log("Saved mobile verified screenshot to:", screenshotPath);

  } catch (err) {
    console.error("Local test error:", err);
  } finally {
    await browser.close();
  }
}

run();
