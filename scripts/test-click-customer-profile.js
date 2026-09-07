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

    // Click the 2nd button in the conversation sub-header row (User Profile button)
    console.log("Clicking 2nd button in chat header row...");
    await page.evaluate(() => {
      // Find the header row containing "عميل فيسبوك"
      const allDivs = Array.from(document.querySelectorAll('div'));
      const headerDiv = allDivs.find(d => d.innerText && d.innerText.includes('عميل فيسبوك') && d.querySelectorAll('button').length >= 2);
      if (headerDiv) {
        const buttons = Array.from(headerDiv.querySelectorAll('button'));
        console.log("Header buttons count:", buttons.length);
        // Button index 1 is the profile button
        if (buttons[1]) buttons[1].click();
      } else {
        // Fallback search all buttons in top 200px
        const buttons = Array.from(document.querySelectorAll('button')).filter(b => {
          const rect = b.getBoundingClientRect();
          return rect.top > 40 && rect.top < 150;
        });
        if (buttons[1]) buttons[1].click();
      }
    });

    await new Promise(r => setTimeout(r, 3000));

    const artifactsDir = "C:\\Users\\shrou\\.gemini\\antigravity\\brain\\47f56593-3755-46d4-8985-0d40d0bb0c7b";
    await page.screenshot({ path: path.join(artifactsDir, "customer_profile_drawer_open.png") });
    console.log("Saved customer_profile_drawer_open.png");

    // Click Quick Order button inside drawer
    console.log("Clicking 'طلب سريع'...");
    const clickedQuickOrder = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      for (const btn of btns) {
        const text = (btn.getAttribute('title') || '') + ' ' + (btn.getAttribute('aria-label') || '') + ' ' + (btn.innerText || '');
        if (text.includes('طلب سريع') || text.includes('إنشاء طلب')) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    console.log("Quick order click result:", clickedQuickOrder);
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
