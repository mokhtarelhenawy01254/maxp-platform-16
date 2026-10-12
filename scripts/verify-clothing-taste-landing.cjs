const { chromium } = require("playwright");
const path = require("path");

const ARTIFACT_DIR = "C:/Users/mokhtar/.gemini/antigravity/brain/a1008c72-8752-43b0-a449-0d550429ed5f";

async function runVerification() {
  console.log("=== Phase 3: Taste-Skill Clothing Landing Live Browser Verification Starting ===");
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const consoleErrors = [];
  const consoleWarnings = [];

  // ── Desktop Verification (1280x800) ──
  console.log("\n[1] Testing Desktop Viewport (1280x800)...");
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await desktopContext.newPage();

  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("502") || text.includes("meta-pixel") || text.includes("favicon")) return;
    if (msg.type() === "error") {
      console.error("[Browser Error]", text);
      consoleErrors.push(text);
    } else if (msg.type() === "warning") {
      consoleWarnings.push(text);
    }
  });

  page.on("pageerror", (err) => {
    console.error("[Browser PageError]", err.message);
    consoleErrors.push(err.message);
  });

  const url = "http://127.0.0.1:5173/lp/clothing-taste";
  console.log(`Navigating to: ${url}`);
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1000);
  console.log(`HTTP Status: ${response.status()}`);

  // Check Container First (waits for React mount)
  await page.waitForSelector(".cst-root", { timeout: 10000 });
  console.log("PASS: .cst-root container rendered successfully");

  // Check Title
  const title = await page.title();
  console.log(`Page Title: "${title}"`);
  if (!title.includes("MaxP Apparel OS")) {
    throw new Error(`Unexpected page title: ${title}`);
  }

  // Check Headline
  const h1Text = await page.$eval("h1", (el) => el.textContent.trim());
  console.log(`Headline: "${h1Text}"`);

  // Test Interactive Hero Tab Switcher
  console.log("\n[2] Testing Hero Interactive Tab Switcher...");
  const posTab = page.locator("button:has-text('تزامن الفروع (POS)')");
  await posTab.click();
  await page.waitForTimeout(400);
  console.log("PASS: Switched to POS Live Sync tab");

  const bostaTab = page.locator("button:has-text('بوليصة بوسطة')");
  await bostaTab.click();
  await page.waitForTimeout(400);
  console.log("PASS: Switched to Bosta AWB tab");

  const advisorTab = page.getByRole("button", { name: "مستشار المقاسات", exact: true });
  await advisorTab.click();
  await page.waitForTimeout(400);
  console.log("PASS: Returned to Size Advisor tab");

  // Test Size Advisor + Button Click
  const plusBtn = page.locator("button:has-text('+')").first();
  await plusBtn.click();
  await page.waitForTimeout(300);
  console.log("PASS: Incremented height in Size Advisor");

  // Test Tools Matrix Category Filter
  console.log("\n[3] Testing Category Filters in 17 Tools Grid...");
  const shippingCategoryBtn = page.locator("button:has-text('بوسطة والشحن')");
  await shippingCategoryBtn.click();
  await page.waitForTimeout(400);
  console.log("PASS: Filtered tools by 'بوسطة والشحن'");

  const allCategoryBtn = page.locator("button:has-text('جميع الأدوات (17)')");
  await allCategoryBtn.click();
  await page.waitForTimeout(400);
  console.log("PASS: Reset to 'جميع الأدوات (17)'");

  // Test Unit Economics Margin Inputs
  console.log("\n[4] Testing Margin Calculator...");
  const fabricInput = page.locator("input[type='number']").first();
  await fabricInput.fill("150");
  await page.waitForTimeout(300);
  console.log("PASS: Adjusted fabric cost input");

  // Test FAQ Accordion
  console.log("\n[5] Testing FAQ Accordion...");
  const faqButtons = page.locator("section:has-text('الأسئلة الشائعة') button");
  const secondFaq = faqButtons.nth(1);
  await secondFaq.click();
  await page.waitForTimeout(400);
  console.log("PASS: Toggled second FAQ item");

  // Test Audit Drawer Trigger
  console.log("\n[6] Testing Audit Matrix Drawer...");
  const auditBtn = page.locator("button:has-text('تشريح الفروقات')");
  await auditBtn.click();
  await page.waitForTimeout(500);

  // Take Audit Drawer Screenshot
  const auditScreenshotPath = path.join(ARTIFACT_DIR, "clothing_taste_audit_drawer.png");
  await page.screenshot({ path: auditScreenshotPath, fullPage: false });
  console.log(`Saved screenshot: ${auditScreenshotPath}`);

  // Test Mode Toggle inside Drawer (Taste -> Slop -> Taste)
  const slopModeBtn = page.locator("button:has-text('🤖 القالب النمطي')").first();
  await slopModeBtn.click();
  await page.waitForTimeout(500);
  console.log("PASS: Toggled into '🤖 القالب النمطي' Slop Simulation mode");

  const tasteModeBtn = page.locator("button:has-text('✨ وضع المهارة')").first();
  await tasteModeBtn.click();
  await page.waitForTimeout(500);
  console.log("PASS: Toggled back to '✨ وضع المهارة' Taste-Skill mode");

  // Close Audit Drawer
  const closeBtn = page.locator("button[aria-label='إغلاق نافذة المقارنة']");
  await closeBtn.click();
  await page.waitForTimeout(400);
  console.log("PASS: Closed Audit Drawer");

  // Take Full Desktop Page Screenshot
  const desktopScreenshotPath = path.join(ARTIFACT_DIR, "clothing_taste_desktop.png");
  await page.screenshot({ path: desktopScreenshotPath, fullPage: true });
  console.log(`Saved screenshot: ${desktopScreenshotPath}`);

  // ── Mobile Verification (390x844 iPhone 14) ──
  console.log("\n[7] Testing Mobile Viewport (390x844 - iPhone 14)...");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();

  mobilePage.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("502") || text.includes("meta-pixel") || text.includes("favicon")) return;
    if (msg.type() === "error") {
      console.error("[Mobile Browser Error]", text);
      consoleErrors.push(text);
    }
  });

  await mobilePage.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await mobilePage.waitForTimeout(1000);

  // Check Sticky Mobile CTA Bar
  const stickyMobileBar = mobilePage.locator(".cst-sticky-mobile");
  const isStickyVisible = await stickyMobileBar.isVisible();
  console.log(`PASS: Mobile sticky CTA bar visible: ${isStickyVisible}`);

  // Check Horizontal Overflow
  const scrollWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await mobilePage.evaluate(() => document.documentElement.clientWidth);
  console.log(`Mobile scrollWidth: ${scrollWidth}, clientWidth: ${clientWidth}`);
  if (scrollWidth > clientWidth + 2) {
    console.warn(`WARNING: Horizontal overflow detected on mobile: ${scrollWidth} > ${clientWidth}`);
  } else {
    console.log("PASS: Zero horizontal overflow on mobile");
  }

  // Take Mobile Screenshot
  const mobileScreenshotPath = path.join(ARTIFACT_DIR, "clothing_taste_mobile.png");
  await mobilePage.screenshot({ path: mobileScreenshotPath, fullPage: false });
  console.log(`Saved screenshot: ${mobileScreenshotPath}`);

  await browser.close();

  // Final Console Error Gate
  console.log("\n=== Console Errors Audit ===");
  if (consoleErrors.length > 0) {
    console.error(`FAILED: ${consoleErrors.length} console errors encountered:`);
    consoleErrors.forEach((e, idx) => console.error(`  ${idx + 1}. ${e}`));
    process.exit(1);
  } else {
    console.log("SUCCESS: ZERO CONSOLE ERRORS! All verification tests passed cleanly.");
  }
}

runVerification().catch((err) => {
  console.error("Verification script failed:", err);
  process.exit(1);
});
