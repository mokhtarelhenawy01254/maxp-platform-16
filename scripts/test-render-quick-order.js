const path = require("path");
const fs = require("fs");
const puppeteer = require(path.resolve(__dirname, "../backend/node_modules/puppeteer-core"));

async function run() {
  console.log("Launching Puppeteer for swan@h2m.com direct navigation...");
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--user-data-dir=C:\\Users\\shrou\\AppData\\Local\\Temp\\test-swan-profile-6"
    ]
  });

  const artifactsDir = "C:\\Users\\shrou\\.gemini\\antigravity\\brain\\47f56593-3755-46d4-8985-0d40d0bb0c7b";

  try {
    const page = await browser.newPage();
    
    // Set mobile viewport (iPhone 14)
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2
    });

    console.log("Navigating to https://maxp.online/login...");
    await page.goto("https://maxp.online/login", { waitUntil: "networkidle2", timeout: 45000 });

    await page.type("input[type='email']", "swan@h2m.com");
    await page.type("input[type='password']", "0165676135");

    await Promise.all([
      page.click("button[type='submit']"),
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {})
    ]);

    await new Promise(r => setTimeout(r, 3000));
    console.log("Logged in. Navigating directly to https://maxp.online/whatsapp...");

    await page.goto("https://maxp.online/whatsapp", { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise(r => setTimeout(r, 4000));
    console.log("Current URL after navigating to whatsapp:", page.url());

    await page.screenshot({ path: path.join(artifactsDir, "swan_direct_whatsapp.png") });
    console.log("Saved swan_direct_whatsapp.png");

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
}

run();
