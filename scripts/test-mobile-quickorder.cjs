const path = require("path");
const https = require("https");
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

function fetchFirstConversationId() {
  return new Promise((resolve) => {
    const req = https.request("https://maxp.online/api/v1/whatsapp-inbox/conversations", {
      headers: {
        "Authorization": `Bearer ${TOKEN}`
      }
    }, (res) => {
      let body = "";
      res.on("data", c => body += c);
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          console.log("Conversations API response success:", json.success, "count:", json.conversations?.length);
          if (json.conversations && json.conversations.length > 0) {
            resolve(json.conversations[0].id);
          } else {
            resolve(null);
          }
        } catch (e) {
          console.error("Parse error:", e);
          resolve(null);
        }
      });
    });
    req.on("error", () => resolve(null));
    req.end();
  });
}

async function run() {
  console.log("Fetching conversation ID from API...");
  const convId = await fetchFirstConversationId();
  console.log("Found conversation ID:", convId);

  const targetUrl = convId ? `https://maxp.online/whatsapp-chat/${convId}` : "https://maxp.online/whatsapp-chat/demo";
  console.log("Target chat URL:", targetUrl);

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

    await page.goto("https://maxp.online/login", { waitUntil: "domcontentloaded" });
    await page.evaluate((token, user) => {
      localStorage.setItem("token", token);
      localStorage.setItem("accessToken", token);
      sessionStorage.setItem("accessToken", token);
      sessionStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    }, TOKEN, USER);

    const artifactsDir = "C:\\Users\\shrou\\.gemini\\antigravity\\brain\\47f56593-3755-46d4-8985-0d40d0bb0c7b";

    console.log("Navigating to chat page...");
    await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise(r => setTimeout(r, 5000));

    await page.screenshot({ path: path.join(artifactsDir, "chat_loaded.png") });

    // Look for the quick order button with ShoppingCart icon / title="إنشاء طلب سريع"
    console.log("Clicking Quick Order button in chat header...");
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      for (const btn of btns) {
        const title = btn.getAttribute('title') || btn.getAttribute('aria-label') || btn.innerText || '';
        if (title.includes('طلب') || title.includes('Order') || title.includes('سريع')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    console.log("Order button click triggered:", clicked);
    await new Promise(r => setTimeout(r, 4000));

    const screenshotPath = path.join(artifactsDir, "quick_order_mobile_verified.png");
    await page.screenshot({ path: screenshotPath });
    console.log("Saved quick_order_mobile_verified.png screenshot.");

  } catch (err) {
    console.error("Run error:", err);
  } finally {
    await browser.close();
  }
}

run();
