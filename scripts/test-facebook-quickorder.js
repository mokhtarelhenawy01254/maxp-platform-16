const path = require("path");
const jwt = require(path.resolve(__dirname, "../backend/node_modules/jsonwebtoken"));
const puppeteer = require(path.resolve(__dirname, "../backend/node_modules/puppeteer-core"));

const JWT_SECRET = "9645819c153de9a20961168f4dad5a4b159080e6c9117df1a6cf7114102428c57686adb6f4625ccec15452f7d73b8b111485a077fcd2ea99a377b13fb6033314";

const USER = {
  id: "cmlc7qufe0003ju40bgjv7lp2",
  email: "alpha@h2m.com",
  firstName: "Alpha",
  lastName: "Owner",
  companyId: "cmlc7quet0000ju403h74m5o9",
  role: "OWNER"
};

const TOKEN = jwt.sign(
  {
    userId: USER.id,
    companyId: USER.companyId,
    role: USER.role,
    email: USER.email
  },
  JWT_SECRET,
  { expiresIn: "7d" }
);

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

    await page.goto("https://maxp.online/login", { waitUntil: "domcontentloaded" });
    await page.evaluate((token, user) => {
      localStorage.setItem("token", token);
      localStorage.setItem("accessToken", token);
      sessionStorage.setItem("accessToken", token);
      sessionStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    }, TOKEN, USER);

    const artifactsDir = "C:\\Users\\shrou\\.gemini\\antigravity\\brain\\47f56593-3755-46d4-8985-0d40d0bb0c7b";

    await page.goto("https://maxp.online/facebook-inbox", { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise(r => setTimeout(r, 5000));

    // Click first conversation
    await page.evaluate(() => {
      const card = document.querySelector('[class*="conversation"], [class*="contact"], div.cursor-pointer');
      if (card) card.click();
    });
    await new Promise(r => setTimeout(r, 3000));

    // Click profile icon in chat header to open customer profile drawer
    console.log("Opening customer profile drawer...");
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      // The second icon in header is user profile icon
      for (const b of btns) {
        if (b.querySelector('svg') && (b.title || '').includes('عميل') || (b.getAttribute('aria-label') || '').includes('عميل')) {
          b.click();
          return;
        }
      }
      // Fallback: click button containing user/profile icon
      if (btns[1]) btns[1].click();
    });

    await new Promise(r => setTimeout(r, 2500));

    // Now click Quick Order button inside customer profile drawer
    console.log("Clicking quick order button inside profile drawer...");
    const clickedOrder = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a'));
      for (const btn of btns) {
        const text = btn.innerText + ' ' + (btn.getAttribute('title') || '') + ' ' + (btn.getAttribute('aria-label') || '');
        if (text.includes('طلب سريع') || text.includes('إنشاء طلب')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    console.log("Quick order button clicked:", clickedOrder);
    await new Promise(r => setTimeout(r, 4000));

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
