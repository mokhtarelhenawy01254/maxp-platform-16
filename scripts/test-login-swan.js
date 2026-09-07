const path = require("path");
const fs = require("fs");
const puppeteer = require(path.resolve(__dirname, "../backend/node_modules/puppeteer-core"));

async function run() {
  console.log("Launching Puppeteer for swan@h2m.com...");
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--user-data-dir=C:\\Users\\shrou\\AppData\\Local\\Temp\\test-swan-profile-4"
    ]
  });

  const artifactsDir = "C:\\Users\\shrou\\.gemini\\antigravity\\brain\\47f56593-3755-46d4-8985-0d40d0bb0c7b";

  try {
    const page = await browser.newPage();
    
    // Set mobile viewport (iPhone 14)
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2
    });

    console.log("Navigating to https://maxp.online/login...");
    await page.goto("https://maxp.online/login", { waitUntil: "networkidle2", timeout: 45000 });

    console.log("Filling credentials for swan@h2m.com...");
    await page.waitForSelector("input[type='email'], input[name='email']", { timeout: 15000 });
    
    await page.type("input[type='email'], input[name='email']", "swan@h2m.com");
    await page.type("input[type='password']", "0165676135");

    console.log("Submitting login...");
    await Promise.all([
      page.click("button[type='submit']"),
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {})
    ]);

    await new Promise(r => setTimeout(r, 4000));
    console.log("Current URL after login:", page.url());

    // Click on 'واتساب' card
    console.log("Clicking on 'واتساب' card...");
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div, a, button'));
      const match = cards.find(c => c.textContent && c.textContent.trim() === 'واتساب');
      if (match) match.click();
    });

    await new Promise(r => setTimeout(r, 5000));
    console.log("URL after clicking WhatsApp card:", page.url());

    await page.screenshot({ path: path.join(artifactsDir, "swan_whatsapp_landing.png") });
    console.log("Saved swan_whatsapp_landing.png");

    // Select first conversation item
    console.log("Selecting conversation...");
    const clickedChat = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('div[class*="cursor-pointer"], div[class*="conversation"], [class*="chat-item"]'));
      for (const item of items) {
        if (item.innerText && item.innerText.length > 2 && !item.innerText.includes('واتساب')) {
          item.click();
          return item.innerText.slice(0, 40).replace(/\n/g, ' ');
        }
      }
      return null;
    });
    console.log("Clicked chat:", clickedChat);

    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(artifactsDir, "swan_chat_opened.png") });

    // In mobile WhatsApp chat: check top header profile or action buttons to open right panel or modal
    console.log("Opening right panel / profile...");
    await page.evaluate(() => {
      // Find header element or customer info area
      const headers = Array.from(document.querySelectorAll('header, [class*="header"], [class*="top-bar"]'));
      for (const h of headers) {
        const clickables = Array.from(h.querySelectorAll('div.cursor-pointer, button, img, avatar'));
        if (clickables.length > 0) {
          clickables[0].click();
          return;
        }
      }
    });

    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: path.join(artifactsDir, "swan_profile_panel.png") });

    // Look for button "طلب متجر"
    console.log("Clicking 'طلب متجر'...");
    const clickedOrderBtn = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
      const btn = buttons.find(b => b.textContent && b.textContent.includes('طلب متجر'));
      if (btn) {
        btn.click();
        return btn.textContent.trim();
      }
      return null;
    });
    console.log("Clicked order button text:", clickedOrderBtn);

    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: path.join(artifactsDir, "swan_quick_order_modal_products.png") });
    console.log("Saved swan_quick_order_modal_products.png");

  } catch (err) {
    console.error("Error in swan test script:", err);
  } finally {
    await browser.close();
  }
}

run();
