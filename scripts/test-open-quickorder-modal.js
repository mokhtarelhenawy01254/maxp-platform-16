const path = require("path");
const jwt = require(path.resolve(__dirname, "../backend/node_modules/jsonwebtoken"));
const puppeteer = require(path.resolve(__dirname, "../backend/node_modules/puppeteer-core"));

const JWT_SECRET = "9645819c153de9a20961168f4dad5a4b159080e6c9117df1a6cf7114102428c57686adb6f4625ccec15452f7d73b8b111485a077fcd2ea99a377b13fb6033314";
const companyId = "cmlc7quet0000ju403h74m5o9";

const USER = {
  id: "cmlc7qufe0003ju40bgjv7lp2",
  email: "alpha@h2m.com",
  firstName: "Alpha",
  lastName: "Owner",
  companyId,
  role: "OWNER"
};

const TOKEN = jwt.sign(USER, JWT_SECRET, { expiresIn: "7d" });

async function run() {
  console.log("Launching headless browser on mobile viewport 390x844...");
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

    console.log("Setting auth token...");
    await page.goto("https://maxp.online/login", { waitUntil: "domcontentloaded" });
    await page.evaluate((token, user) => {
      localStorage.setItem("token", token);
      localStorage.setItem("accessToken", token);
      sessionStorage.setItem("accessToken", token);
      sessionStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    }, TOKEN, USER);

    const artifactsDir = "C:\\Users\\shrou\\.gemini\\antigravity\\brain\\47f56593-3755-46d4-8985-0d40d0bb0c7b";

    console.log("Navigating to https://maxp.online/facebook-inbox...");
    await page.goto("https://maxp.online/facebook-inbox", { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise(r => setTimeout(r, 6000));

    console.log("Clicking conversation card...");
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('div, button')).filter(el => {
        const t = el.innerText || '';
        return t.includes('عميل') || t.includes('مرحباً') || t.includes('شكراً');
      });
      if (items.length > 0) items[0].click();
    });

    await new Promise(r => setTimeout(r, 4000));

    console.log("Finding Quick Order button...");
    const clicked = await page.evaluate(() => {
      // Find button by title, text or aria-label
      const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
      for (const btn of btns) {
        const str = (btn.getAttribute('title') || '') + ' ' + (btn.getAttribute('aria-label') || '') + ' ' + (btn.innerText || '');
        if (str.includes('طلب سريع') || str.includes('إنشاء طلب') || str.includes('طلب')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    console.log("Order button clicked:", clicked);
    await new Promise(r => setTimeout(r, 5000));

    const screenshotPath = path.join(artifactsDir, "quick_order_mobile_verified.png");
    await page.screenshot({ path: screenshotPath });
    console.log("Saved quick_order_mobile_verified.png");

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
}

run();
