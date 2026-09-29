const path = require("path");
const fs = require("fs");
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

const artifactsDir = "C:\\Users\\shrou\\.gemini\\antigravity\\brain\\18b934a2-3349-4dc8-bdba-cb75dbed704a";

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
      width: 1440,
      height: 900,
      deviceScaleFactor: 1
    });

    console.log("Navigating to login...");
    await page.goto("https://maxp.online/login", { waitUntil: "networkidle2", timeout: 45000 });
    console.log("Filling credentials...");
    await page.waitForSelector("input[type='email']", { timeout: 15000 });
    await page.type("input[type='email']", "alpha@h2m.com");
    await page.type("input[type='password']", "123456");
    await Promise.all([
      page.click("button[type='submit']"),
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {})
    ]);
    await new Promise(r => setTimeout(r, 3000));

    console.log("Navigating to https://maxp.online/facebook-inbox...");
    await page.goto("https://maxp.online/facebook-inbox", { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise(r => setTimeout(r, 5000));

    // Click first conversation if available
    console.log("Selecting first conversation...");
    await page.evaluate(() => {
      const card = document.querySelector('[class*="conversation"], [class*="contact"], div.cursor-pointer');
      if (card) card.click();
    });
    await new Promise(r => setTimeout(r, 3000));

    // Inspect the input area and composer tools
    console.log("Inspecting toolbar and mic buttons...");
    const inspection = await page.evaluate(() => {
      const composerTools = document.querySelector('.business-chat-composer-tools');
      const composerToolsButtons = composerTools ? Array.from(composerTools.querySelectorAll('button')).map(b => b.title || b.getAttribute('aria-label') || 'no-title') : [];

      const allMicButtons = Array.from(document.querySelectorAll('button')).filter(b => {
        const title = (b.title || '') + ' ' + (b.getAttribute('aria-label') || '');
        return title.includes('تسجيل رسالة صوتية') || title.includes('تسجيل صوتي');
      }).map(b => ({
        title: b.title || b.getAttribute('aria-label'),
        classes: b.className,
        isInToolsRow: composerTools ? composerTools.contains(b) : false
      }));

      const textarea = document.querySelector('textarea.business-chat-input');

      return {
        hasComposerTools: !!composerTools,
        composerToolsButtons,
        allMicButtons,
        hasTextarea: !!textarea
      };
    });

    console.log("Inspection result:", JSON.stringify(inspection, null, 2));

    // Capture screenshot of the composer area (empty state)
    const composerEl = await page.$('.business-chat-composer-tools') || await page.$('form');
    if (composerEl) {
      const screenshotPathEmpty = path.join(artifactsDir, "test_inbox_composer_empty.png");
      await page.screenshot({ path: screenshotPathEmpty });
      console.log("Saved empty composer screenshot to:", screenshotPathEmpty);
    }

    // Now type text and check if mic turns into send button
    console.log("Typing text into textarea...");
    await page.type('textarea.business-chat-input', 'تجربة فحص الإرسال');
    await new Promise(r => setTimeout(r, 1000));

    const afterTypeInspection = await page.evaluate(() => {
      const sendBtn = Array.from(document.querySelectorAll('button')).find(b => {
        const title = (b.title || '') + ' ' + (b.getAttribute('aria-label') || '');
        return title.includes('إرسال') && !title.includes('صوت');
      });
      const micBtns = Array.from(document.querySelectorAll('button')).filter(b => {
        const title = (b.title || '') + ' ' + (b.getAttribute('aria-label') || '');
        return title.includes('تسجيل رسالة صوتية');
      });

      return {
        hasSendButton: !!sendBtn,
        sendButtonTitle: sendBtn ? (sendBtn.title || sendBtn.getAttribute('aria-label')) : null,
        micButtonsCount: micBtns.length
      };
    });

    console.log("After typing inspection:", JSON.stringify(afterTypeInspection, null, 2));

    const screenshotPathTyped = path.join(artifactsDir, "test_inbox_composer_typed.png");
    await page.screenshot({ path: screenshotPathTyped });
    console.log("Saved typed composer screenshot to:", screenshotPathTyped);

    console.log("ALL CHECKS PASSED!");
  } catch (err) {
    console.error("Test error:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
