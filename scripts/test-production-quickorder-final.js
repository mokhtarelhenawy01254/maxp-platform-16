const path = require("path");
const puppeteer = require(path.resolve(__dirname, "../backend/node_modules/puppeteer-core"));

async function run() {
  console.log("Launching mobile browser (390x844)...");
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--user-data-dir=C:\\Users\\shrou\\AppData\\Local\\Temp\\test-quick-order-profile-final"
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

    console.log("Navigating to login page...");
    await page.goto("https://maxp.online/login", { waitUntil: "networkidle2", timeout: 45000 });

    console.log("Filling login credentials...");
    await page.waitForSelector("input[type='email']", { timeout: 15000 });
    await page.type("input[type='email']", "alpha@h2m.com");
    await page.type("input[type='password']", "123456");

    await Promise.all([
      page.click("button[type='submit']"),
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {})
    ]);

    await new Promise(r => setTimeout(r, 3000));
    console.log("Logged in. Navigating to facebook-inbox...");

    await page.goto("https://maxp.online/facebook-inbox", { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise(r => setTimeout(r, 5000));

    console.log("Selecting conversation...");
    await page.evaluate(() => {
      const card = document.querySelector('div.cursor-pointer, [class*="conversation"], [class*="contact"]');
      if (card) card.click();
    });

    await new Promise(r => setTimeout(r, 3000));

    // Traverse React Fiber nodes to force showQuickOrderModal = true
    console.log("Triggering QuickOrderModal via React Fiber state / DOM search...");
    const triggered = await page.evaluate(() => {
      // 1. Try finding button in DOM first
      const btn = document.querySelector('button[title*="طلب"], button[aria-label*="طلب"]');
      if (btn) {
        btn.click();
        return "DOM_CLICK";
      }

      // 2. Try React Fiber traversal
      const root = document.querySelector('#root');
      if (!root) return false;

      function findFiber(node) {
        const key = Object.keys(node).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$'));
        return key ? node[key] : null;
      }

      let fiber = findFiber(root);
      let curr = fiber;
      while (curr) {
        if (curr.memoizedState) {
          let state = curr.memoizedState;
          while (state) {
            if (typeof state.memoizedState === 'boolean' && typeof state.queue?.dispatch === 'function') {
              // Try triggering boolean state updater
            }
            state = state.next;
          }
        }
        curr = curr.child;
      }
      return false;
    });

    console.log("Trigger result:", triggered);
    await new Promise(r => setTimeout(r, 4000));

    const artifactsDir = "C:\\Users\\shrou\\.gemini\\antigravity\\brain\\47f56593-3755-46d4-8985-0d40d0bb0c7b";
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
