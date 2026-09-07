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
  console.log("Launching browser for DOM inspection...");
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

    await page.goto("https://maxp.online/login", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.evaluate((token, user) => {
      localStorage.setItem("token", token);
      localStorage.setItem("accessToken", token);
      sessionStorage.setItem("accessToken", token);
      sessionStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    }, TOKEN, USER);

    await page.goto("https://maxp.online/whatsapp", { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise(r => setTimeout(r, 6000));

    // Inspect items in list
    const items = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.innerText || '';
        return text.includes('محمد الحمراوى') && el.children.length === 0;
      });
      return elements.map(el => {
        let parent = el;
        for (let i = 0; i < 4; i++) {
          if (parent.parentElement) parent = parent.parentElement;
        }
        return {
          tagName: parent.tagName,
          className: parent.className,
          id: parent.id,
          outerHTML: parent.outerHTML.substring(0, 300)
        };
      });
    });

    console.log("Conversation list items inspect:", JSON.stringify(items, null, 2));

    // Also get all conversation links or IDs
    const conversations = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="whatsapp"]'));
      return links.map(l => ({ href: l.getAttribute('href'), text: l.innerText }));
    });
    console.log("Conversation links:", JSON.stringify(conversations, null, 2));

  } catch (err) {
    console.error("Inspect error:", err);
  } finally {
    await browser.close();
  }
}

run();
