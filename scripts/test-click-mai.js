const path = require("path");
const fs = require("fs");
const puppeteer = require(path.resolve(__dirname, "../backend/node_modules/puppeteer-core"));

async function run() {
  console.log("Launching Puppeteer for swan@h2m.com chat interaction...");
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--user-data-dir=C:\\Users\\shrou\\AppData\\Local\\Temp\\test-swan-profile-7"
    ]
  });

  const artifactsDir = "C:\\Users\\shrou\\.gemini\\antigravity\\brain\\47f56593-3755-46d4-8985-0d40d0bb0c7b";

  try {
    const page = await browser.newPage();
    
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2
    });

    console.log("Navigating to login page...");
    await page.goto("https://maxp.online/login", { waitUntil: "networkidle2", timeout: 45000 });

    await page.type("input[type='email']", "swan@h2m.com");
    await page.type("input[type='password']", "0165676135");

    await Promise.all([
      page.click("button[type='submit']"),
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {})
    ]);

    await new Promise(r => setTimeout(r, 3000));
    console.log("Navigating to whatsapp page...");
    await page.goto("https://maxp.online/whatsapp", { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise(r => setTimeout(r, 5000));

    // Click on "mai moneer"
    console.log("Clicking 'mai moneer'...");
    const clicked = await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div, span, p, h4'));
      const match = allDivs.find(d => d.innerText && d.innerText.trim() === 'mai moneer');
      if (match) {
        let parent = match;
        while (parent && !parent.className.includes('cursor-pointer') && parent.parentElement) {
          parent = parent.parentElement;
        }
        (parent || match).click();
        return true;
      }
      return false;
    });
    console.log("Clicked mai moneer:", clicked);

    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: path.join(artifactsDir, "swan_mai_chat.png") });
    console.log("Saved swan_mai_chat.png");

    // Look for top bar / header or customer info / right panel toggle button in mobile view
    console.log("Looking for header clickables in chat window...");
    const headerClicked = await page.evaluate(() => {
      // Look for buttons or clickable header in chat view
      const topBars = Array.from(document.querySelectorAll('header, [class*="chat-header"], [class*="header"]'));
      for (const bar of topBars) {
        const titleOrAvatar = bar.querySelector('h2, h3, [class*="avatar"], div.cursor-pointer');
        if (titleOrAvatar) {
          titleOrAvatar.click();
          return 'HEADER_CLICKED';
        }
      }
      return null;
    });
    console.log("Header click result:", headerClicked);

    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(artifactsDir, "swan_mai_profile.png") });
    console.log("Saved swan_mai_profile.png");

    // Look for "طلب متجر" or "طلب سريع" button
    console.log("Looking for 'طلب متجر' button...");
    const orderBtnClicked = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('button, a, div[role="button"], span'));
      const target = allElements.find(el => el.textContent && (el.textContent.includes('طلب متجر') || el.textContent.includes('طلب سريع')));
      if (target) {
        let btn = target;
        while (btn && btn.tagName !== 'BUTTON' && !btn.getAttribute('role') && btn.parentElement) {
          btn = btn.parentElement;
        }
        (btn || target).click();
        return (btn || target).textContent.trim();
      }
      return null;
    });
    console.log("Order button clicked:", orderBtnClicked);

    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: path.join(artifactsDir, "swan_mai_quick_order.png") });
    console.log("Saved swan_mai_quick_order.png");

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await browser.close();
  }
}

run();
