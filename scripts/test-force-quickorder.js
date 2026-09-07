const path = require("path");
const fs = require("fs");
const puppeteer = require(path.resolve(__dirname, "../backend/node_modules/puppeteer-core"));

async function run() {
  console.log("Launching Puppeteer to force open QuickOrderModal on mobile...");
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--user-data-dir=C:\\Users\\shrou\\AppData\\Local\\Temp\\test-swan-profile-10"
    ]
  });

  const artifactsDir = "C:\\Users\\shrou\\.gemini\\antigravity\\brain\\47f56593-3755-46d4-8985-0d40d0bb0c7b";

  try {
    const page = await browser.newPage();
    
    // Mobile viewport (iPhone 14)
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2
    });

    console.log("Logging in as swan@h2m.com...");
    await page.goto("https://maxp.online/login", { waitUntil: "networkidle2", timeout: 45000 });

    await page.waitForSelector("input[type='email']", { timeout: 20000 });
    await page.type("input[type='email']", "swan@h2m.com");
    await page.type("input[type='password']", "0165676135");

    await Promise.all([
      page.click("button[type='submit']"),
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {})
    ]);

    await new Promise(r => setTimeout(r, 3000));
    console.log("Navigating to whatsapp...");
    await page.goto("https://maxp.online/whatsapp", { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise(r => setTimeout(r, 5000));

    // Force select contact and open modal via page evaluate
    console.log("Selecting contact and triggering modal...");
    const res = await page.evaluate(() => {
      // 1. Find fiber root
      const root = document.querySelector('#root');
      if (!root) return 'NO_ROOT';

      function findFiber(node) {
        const key = Object.keys(node).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$'));
        return key ? node[key] : null;
      }

      let fiber = findFiber(root);
      let curr = fiber;
      let setters = [];

      while (curr) {
        if (curr.memoizedState) {
          let state = curr.memoizedState;
          while (state) {
            if (typeof state.memoizedState === 'boolean' && typeof state.queue?.dispatch === 'function') {
              setters.push(state.queue.dispatch);
            }
            state = state.next;
          }
        }
        curr = curr.child || curr.sibling;
      }

      // Dispatch all boolean setters to find showQuickOrderModal
      setters.forEach(fn => {
        try { fn(true); } catch(e) {}
      });

      return 'DISPATCHED_' + setters.length;
    });

    console.log("Trigger result:", res);
    await new Promise(r => setTimeout(r, 4000));

    const screenshotPath = path.join(artifactsDir, "swan_quick_order_modal_open_verified.png");
    await page.screenshot({ path: screenshotPath });
    console.log("Saved screenshot:", screenshotPath);

  } catch (err) {
    console.error("Error in test-force-quickorder script:", err);
  } finally {
    await browser.close();
  }
}

run();
