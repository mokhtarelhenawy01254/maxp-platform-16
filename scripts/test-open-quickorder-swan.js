const path = require("path");
const fs = require("fs");
const puppeteer = require(path.resolve(__dirname, "../backend/node_modules/puppeteer-core"));

async function run() {
  console.log("Launching Puppeteer for swan@h2m.com quick order test...");
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--user-data-dir=C:\\Users\\shrou\\AppData\\Local\\Temp\\test-swan-profile-9"
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

    console.log("Navigating to login page...");
    await page.goto("https://maxp.online/login", { waitUntil: "networkidle2", timeout: 45000 });

    await page.waitForSelector("input[type='email']", { timeout: 20000 });
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

    // Click on first contact in list
    console.log("Clicking first contact...");
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('div, button, li'));
      const contact = items.find(el => el.innerText && el.innerText.includes('mai moneer'));
      if (contact) {
        let parent = contact;
        while (parent && !parent.className.includes('cursor-pointer') && parent.parentElement) {
          parent = parent.parentElement;
        }
        (parent || contact).click();
      }
    });

    await new Promise(r => setTimeout(r, 4000));
    console.log("Opened chat window. Looking for ShoppingCart icon or order button...");

    // Click ShoppingCart icon button in header or right panel
    const clickedOrder = await page.evaluate(() => {
      // Look for ShoppingCart button (or SVG with lucide-shopping-cart)
      const btns = Array.from(document.querySelectorAll('button'));
      const cartBtn = btns.find(b => {
        const svg = b.querySelector('svg');
        const title = b.getAttribute('title') || '';
        return (svg && (svg.classList.contains('lucide-shopping-cart') || svg.classList.contains('lucide-shopping-bag'))) || title.includes('طلب') || title.includes('أوردر');
      });

      if (cartBtn) {
        cartBtn.click();
        return 'CLICKED_HEADER_CART_BTN';
      }

      // Or click profile header to open panel first
      const header = document.querySelector('header, [class*="chat-header"]');
      if (header) {
        const clickable = header.querySelector('h2, h3, [class*="avatar"]');
        if (clickable) clickable.click();
      }
      return 'CLICKED_HEADER_PROFILE';
    });

    console.log("First order click attempt:", clickedOrder);
    await new Promise(r => setTimeout(r, 3000));

    if (clickedOrder === 'CLICKED_HEADER_PROFILE') {
      // Now click "طلب متجر" in right panel
      console.log("Clicking 'طلب متجر' in right panel...");
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
        const match = btns.find(b => b.textContent && b.textContent.includes('طلب متجر'));
        if (match) match.click();
      });
      await new Promise(r => setTimeout(r, 3000));
    }

    // Wait for products to load inside QuickOrderModal
    await new Promise(r => setTimeout(r, 5000));

    const imgPath = path.join(artifactsDir, "swan_quick_order_products_mobile.png");
    await page.screenshot({ path: imgPath });
    console.log("Saved screenshot to:", imgPath);

  } catch (err) {
    console.error("Error in test-open-quickorder-swan script:", err);
  } finally {
    await browser.close();
  }
}

run();
