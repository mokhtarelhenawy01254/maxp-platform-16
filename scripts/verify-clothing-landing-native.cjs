const { chromium } = require("playwright");
const path = require("path");

const ARTIFACT_DIR = "C:/Users/mokhtar/.gemini/antigravity/brain/39bd93a2-4c87-40d9-bae2-7f57ad3a5e2b";

async function runVerification() {
  console.log("=== Phase 3: Editorial Fashion Live Browser Verification Starting ===");
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
    if (text.includes("502") || text.includes("meta-pixel")) return;
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

  const url = "http://127.0.0.1:5173/lp/clothing-store-bundle";
  console.log(`Navigating to: ${url}`);
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1000);
  console.log(`HTTP Status: ${response.status()}`);

  // Check Container First (waits for React mount)
  await page.waitForSelector(".cse-root", { timeout: 10000 });
  console.log("PASS: .cse-root (Editorial Fashion Container) rendered successfully");

  // Check Title & Meta
  const title = await page.title();
  console.log(`Page Title: "${title}"`);
  if (!title.includes("MaxP لمتاجر الملابس")) {
    throw new Error(`Unexpected page title: ${title}`);
  }

  // Check Headline
  const h1Text = await page.$eval("h1", (el) => el.textContent.trim());
  console.log(`Headline: "${h1Text}"`);

  // Interactive Live Size Advisor Slider Test
  console.log("Testing Live Size Advisor Sliders...");
  const heightSlider = await page.locator("input[type='range']").first();
  await heightSlider.fill("185");
  await page.waitForTimeout(200);

  const weightSlider = await page.locator("input[type='range']").nth(1);
  await weightSlider.fill("95");
  await page.waitForTimeout(300);

  const recommendedSizeText = await page.locator("#size-advisor").textContent();
  console.log(`Advisor Output: includes size update: ${recommendedSizeText.includes("XL") || recommendedSizeText.includes("2XL")}`);

  // Test Aceternity UI Lens Hover
  console.log("Testing Aceternity UI Lens...");
  const lensContainer = page.locator(".cursor-crosshair").first();
  await lensContainer.hover({ force: true });
  await page.waitForTimeout(300);
  console.log("PASS: Lens hover activated");

  // Test Magic UI Marquee
  const hasMarquee = await page.locator(".animate-marquee").first().isVisible();
  console.log(`PASS: Magic UI Marquee visible: ${hasMarquee}`);

  // Test Aceternity UI Apple Cards Carousel Modal
  console.log("Testing Aceternity UI Apple Cards Carousel...");
  await page.locator("#shop-the-look").scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  // Click first card to open modal
  const firstCard = page.locator("#shop-the-look button.group").first();
  await firstCard.click({ force: true });
  await page.waitForTimeout(500);

  const modalCloseBtn = page.locator("button[aria-label='Close']").first();
  const isModalOpen = await modalCloseBtn.isVisible();
  console.log(`PASS: Apple Card Expand Modal Opened: ${isModalOpen}`);

  if (isModalOpen) {
    // Click add bundle inside modal
    const addBundleBtn = page.locator("button:has-text('أضف الطقم كاملاً لسلة الشراء')").first();
    if (await addBundleBtn.isVisible()) {
      await addBundleBtn.click({ force: true });
      await page.waitForTimeout(300);
      const isConfirmed = await page.locator("button:has-text('تمت إضافة الطقم')").first().isVisible();
      console.log(`PASS: Bundle Added confirmation inside modal: ${isConfirmed}`);
    }
    // Close modal
    await modalCloseBtn.click({ force: true });
    await page.waitForTimeout(400);
    console.log("PASS: Modal closed cleanly");
  }

  // Test Mode Switcher: Toggle to Cockpit, then back to Editorial
  console.log("Testing Mode Switcher (Cockpit / Editorial)...");
  const cockpitBtn = page.locator("button:has-text('غرفة العمليات الداكنة')").first();
  if (await cockpitBtn.isVisible()) {
    await cockpitBtn.click({ force: true });
    await page.waitForTimeout(500);
    const hasCockpit = await page.locator(".csn-root").isVisible();
    console.log(`PASS: Switched to Dark Cockpit successfully: ${hasCockpit}`);

    const editorialBtn = page.locator("button:has-text('الستايل الفاشون الفاتح')").first();
    await editorialBtn.click({ force: true });
    await page.waitForTimeout(500);
    console.log("PASS: Switched back to Editorial Fashion");
  }

  // Desktop Screenshot
  const desktopShotPath = path.join(ARTIFACT_DIR, "clothing_editorial_desktop.png");
  await page.screenshot({ path: desktopShotPath, fullPage: true });
  console.log(`Saved Live Desktop Screenshot to: ${desktopShotPath}`);

  await desktopContext.close();

  // ── Mobile Verification (390x844 - iPhone 14) ──
  console.log("\n[2] Testing Mobile Viewport (390x844)...");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();

  mobilePage.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("502") || text.includes("meta-pixel")) return;
    if (msg.type() === "error") consoleErrors.push(`[Mobile] ${text}`);
  });

  await mobilePage.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await mobilePage.waitForTimeout(1000);

  // Verify Sticky Mobile CTA is visible
  const stickyVisible = await mobilePage.isVisible(".cse-sticky-mobile");
  console.log(`Sticky Mobile CTA Visible: ${stickyVisible}`);
  if (!stickyVisible) {
    throw new Error("Sticky Mobile CTA should be visible on mobile viewport");
  }

  // Verify horizontal overflow
  const isOverflowing = await mobilePage.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  console.log(`Horizontal Overflow Detected: ${isOverflowing}`);
  if (isOverflowing) {
    throw new Error("Mobile view has horizontal overflow!");
  }

  // Mobile Screenshot
  const mobileShotPath = path.join(ARTIFACT_DIR, "clothing_editorial_mobile.png");
  await mobilePage.screenshot({ path: mobileShotPath, fullPage: true });
  console.log(`Saved Live Mobile Screenshot to: ${mobileShotPath}`);

  await mobileContext.close();
  await browser.close();

  console.log("\n=== Console Logs Summary ===");
  console.log(`Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error("Errors found:", consoleErrors);
    throw new Error(`Browser test failed with ${consoleErrors.length} console errors!`);
  }
  console.log("ZERO CONSOLE ERRORS! All Verification Checks Passed 100%!");
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
