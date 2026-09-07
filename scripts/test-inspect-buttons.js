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
      "--disable-gpu",
      "--user-data-dir=C:\\Users\\shrou\\AppData\\Local\\Temp\\test-quick-order-profile-inspect"
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
    await new Promise(r => setTimeout(r, 5000));

    // Click conversation card
    await page.evaluate(() => {
      const card = document.querySelector('div.cursor-pointer, [class*="conversation"], [class*="contact"]');
      if (card) card.click();
    });
    await new Promise(r => setTimeout(r, 3000));

    // Inspect ALL buttons inside chat container
    const buttons = await page.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll('button'));
      return allBtns.map((b, i) => ({
        index: i,
        text: (b.innerText || '').trim(),
        title: b.getAttribute('title') || '',
        ariaLabel: b.getAttribute('aria-label') || '',
        className: b.className,
        rect: b.getBoundingClientRect()
      }));
    });

    console.log("Found buttons:", JSON.stringify(buttons, null, 2));

    // Click the button in chat header (rect.top between 50 and 150)
    console.log("Clicking candidate header profile button...");
    const clickedHeaderBtn = await page.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll('button'));
      for (const b of allBtns) {
        const rect = b.getBoundingClientRect();
        // Check if button is in subheader (y between 60 and 140)
        if (rect.top > 60 && rect.top < 140 && rect.left > 150 && rect.left < 280) {
          b.click();
          return true;
        }
      }
      return false;
    });

    console.log("Clicked header profile button:", clickedHeaderBtn);
    await new Promise(r => setTimeout(r, 3000));

    const artifactsDir = "C:\\Users\\shrou\\.gemini\\antigravity\\brain\\47f56593-3755-46d4-8985-0d40d0bb0c7b";
    await page.screenshot({ path: path.join(artifactsDir, "profile_panel_open.png") });

    // Now click Quick Order button inside panel
    console.log("Searching for Quick Order button inside drawer...");
    const clickedQuickOrder = await page.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      for (const b of allBtns) {
        const str = (b.getAttribute('title') || '') + ' ' + (b.getAttribute('aria-label') || '') + ' ' + (b.innerText || '');
        if (str.includes('طلب') || str.includes('Order')) {
          b.click();
          return true;
        }
      }
      return false;
    });

    console.log("Clicked Quick Order button:", clickedQuickOrder);
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
