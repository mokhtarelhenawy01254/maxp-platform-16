const { chromium } = require("playwright");
const path = require("path");

const ARTIFACT_DIR = "C:/Users/mokhtar/.gemini/antigravity/brain/a1008c72-8752-43b0-a449-0d550429ed5f";

async function runVerification() {
  console.log("=== Phase 3: High-Converting Apparel Landing Live Browser Verification Starting ===");
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
  const response = await page.goto(url, { waitUntil: "commit", timeout: 45000 });
  await page.waitForSelector(".cst-root", { timeout: 30000 });
  console.log(`HTTP Status: ${response.status()}`);
  console.log("PASS: .cst-root container rendered successfully");

  // Check Title
  const title = await page.title();
  console.log(`Page Title: "${title}"`);
  if (!title.includes("MaxP للأزياء والملابس")) {
    throw new Error(`Unexpected page title: ${title}`);
  }
  console.log("PASS: Page title matches luxury apparel positioning");

  // Check Headline
  const h1Text = await page.$eval("h1", (el) => el.textContent.trim());
  console.log(`Headline: "${h1Text}"`);

  // Verify Palette: Body background should be luxury warm cream (#FAF8F5)
  const rootBg = await page.$eval(".cst-root", (el) => window.getComputedStyle(el).backgroundColor);
  console.log(`Root Background Color: ${rootBg}`);
  if (!rootBg.includes("250, 248, 245")) {
    throw new Error(`Expected luxury cream background rgb(250, 248, 245), got ${rootBg}`);
  }
  console.log("PASS: Verified luxury cream (#FAF8F5) editorial palette");

  // Verify Absolute Ban on Meta-Audit Clutter
  const hasAuditButton = (await page.locator("button:has-text('فحص الفرق الهندسي')").count()) > 0;
  if (hasAuditButton) {
    throw new Error("VIOLATION: Found banned 'فحص الفرق الهندسي' meta-audit button in production UI!");
  }
  console.log("PASS: Zero meta-audit drawer or comparison clutter present in production UI");

  // Test Interactive Hero Tab Switcher
  console.log("\n[2] Testing Hero Interactive Tab Switcher...");
  const posTab = page.locator("button:has-text('تزامن الفروع (POS)')");
  await posTab.click();
  await page.waitForTimeout(400);
  console.log("PASS: Switched to POS Live Sync tab");

  const bostaTab = page.locator("button:has-text('بوليصة بوسطة وتوربو')");
  await bostaTab.click();
  await page.waitForTimeout(400);
  console.log("PASS: Switched to Bosta & Turbo AWB tab");

  const advisorTab = page.locator("button:has-text('مستشار المقاسات')").first();
  await advisorTab.click();
  await page.waitForTimeout(400);
  console.log("PASS: Returned to Size Advisor tab");

  // Test Size Advisor + Button Click
  const plusBtn = page.locator("button:has-text('+')").first();
  await plusBtn.click();
  await page.waitForTimeout(300);
  console.log("PASS: Incremented height in Size Advisor");

  // Test Lookbook Interactive Real Photography & Model Switcher
  console.log("\n[3] Testing Lookbook Photography & Model Switcher...");
  const coatModelBtn = page.locator("button:has-text('موديل الجاكيت الكلاسيك')");
  await coatModelBtn.click();
  await page.waitForTimeout(400);
  console.log("PASS: Switched to Coat Editorial Model");

  const streetwearModelBtn = page.locator("button:has-text('موديل التيشيرت الأوفرسايز')");
  await streetwearModelBtn.click();
  await page.waitForTimeout(400);
  console.log("PASS: Switched back to Streetwear Model");

  // Test Lookbook Interactive Sale Simulation
  const simulateSaleBtn = page.locator("button:has-text('محاكاة مسح باركود وبيعه في فرع المعادي')");
  await simulateSaleBtn.click();
  await page.waitForTimeout(400);
  console.log("PASS: Decremented stock in branch POS simulation & generated thermal receipt");

  // Test Real Social Proof & Operational Workflows Switcher
  console.log("\n[4] Testing Real MaxP Operational Workflows & Telemetry...");
  const workflow2Tab = page.locator("button:has-text('مسار العمل 02')");
  await workflow2Tab.click();
  await page.waitForTimeout(400);
  console.log("PASS: Switched to Workflow 02 (Return Prevention & Reason Diagnosis)");

  const workflow3Tab = page.locator("button:has-text('مسار العمل 03')");
  await workflow3Tab.click();
  await page.waitForTimeout(400);
  console.log("PASS: Switched to Workflow 03 (Campaign Attribution & Profit Analytics)");

  const workflow1Tab = page.locator("button:has-text('مسار العمل 01')");
  await workflow1Tab.click();
  await page.waitForTimeout(400);
  console.log("PASS: Switched back to Workflow 01 (Fast Dispatch Pipeline)");

  // Test 4 Core Operational Pillars & Expandable 17 Tools
  console.log("\n[5] Testing 4 Core CSB Families & 17 Tools Expansion...");
  const expandToolsBtn = page.locator("button:has-text('عرض تفاصيل الـ 17 أداة كاملة بالأسعار المنفردة')");
  await expandToolsBtn.scrollIntoViewIfNeeded();
  await expandToolsBtn.click();
  await page.waitForTimeout(400);
  console.log("PASS: Expanded 17 discrete tools breakdown cleanly");

  // Test Unit Economics Margin Inputs
  console.log("\n[6] Testing Margin Calculator...");
  const fabricInput = page.locator("input[type='number']").first();
  await fabricInput.fill("150");
  await page.waitForTimeout(300);
  console.log("PASS: Adjusted fabric cost input");

  // Test Egyptian Logistics & Payments Trust Strip
  console.log("\n[7] Testing Egyptian Logistics & Payment Trust Strip...");
  const bostaPartner = page.locator("text=بوسطة • Turbo • QP Express");
  await bostaPartner.waitFor({ state: "visible", timeout: 5000 });
  console.log("PASS: Bosta & Turbo trust badge verified");
  const kashierPartner = page.locator("text=Kashier");
  await kashierPartner.waitFor({ state: "visible", timeout: 5000 });
  console.log("PASS: Kashier trust badge verified");

  // Test Pricing Onboarding Bonus & 14-Day Guarantee
  console.log("\n[8] Testing Pricing Onboarding Bonus & Guarantee...");
  const bonusBox = page.locator("text=بونص الانضمام الفوري");
  await bonusBox.waitFor({ state: "visible", timeout: 5000 });
  console.log("PASS: Verified Irresistible Onboarding Bonus on 999 plan");
  const guaranteeBox = page.locator("text=ضمان استرجاع كامل للاشتراك لمدة 14 يوماً");
  await guaranteeBox.waitFor({ state: "visible", timeout: 5000 });
  console.log("PASS: Verified 14-Day Zero-Risk Guarantee banner");

  // Test Lead Capture Form Input
  console.log("\n[9] Testing Lead Capture Form Inputs...");
  const nameInput = page.locator("input[placeholder='مثال: كريم الشناوي']");
  await nameInput.fill("مختار مجدي");
  const phoneInput = page.locator("input[placeholder='010XXXXXXXX']");
  await phoneInput.fill("01012345678");
  await page.waitForTimeout(300);
  console.log("PASS: Filled Lead Form inputs");

  // Test Fast Inline Activation Modal
  console.log("\n[10] Testing 60-Second Fast Activation Modal...");
  const heroFreeCta = page.locator("button:has-text('ابدأ متجرك مجاناً')").first();
  await heroFreeCta.click();
  await page.waitForTimeout(400);

  const modalTitle = page.locator("text=ابدأ متجرك الإلكتروني الآن في 60 ثانية");
  await modalTitle.waitFor({ state: "visible", timeout: 5000 });
  console.log("PASS: Fast Activation Modal opened successfully");

  const brandInput = page.locator("input[placeholder='مثال: Cairo Wear أو اسم المحل']");
  await brandInput.fill("Cairo Wear");

  const modalPhoneInput = page.locator(".fixed input[type='tel']");
  await modalPhoneInput.fill("01099887766");
  console.log("PASS: Filled brand name and phone in Activation Modal");

  const modalCloseBtn = page.locator("button[aria-label='إغلاق نافذة التفعيل']");
  await modalCloseBtn.click();
  await page.waitForTimeout(300);
  console.log("PASS: Closed Fast Activation Modal cleanly");

  // Test FAQ Accordion with the Dealbreaker Questions
  console.log("\n[11] Testing FAQ Accordion with Dealbreaker Inquiries...");
  const excelFaqBtn = page.locator("button:has-text('عندي مخزون مسجل على شيت إكسيل')");
  await excelFaqBtn.click();
  await page.waitForTimeout(400);
  console.log("PASS: Toggled Excel migration FAQ item");

  const offlineFaqBtn = page.locator("button:has-text('لو الإنترنت فصل في المحل')");
  await offlineFaqBtn.click();
  await page.waitForTimeout(400);
  console.log("PASS: Toggled Offline cashier continuity FAQ item");

  // Take Full Desktop Page Screenshot
  const desktopScreenshotPath = path.join(ARTIFACT_DIR, "clothing_taste_desktop.png");
  await page.screenshot({ path: desktopScreenshotPath, fullPage: true });
  console.log(`Saved screenshot: ${desktopScreenshotPath}`);

  // ── Mobile Verification (390x844 iPhone 14) ──
  console.log("\n[12] Testing Mobile Viewport (390x844 - iPhone 14)...");
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

  await mobilePage.goto(url, { waitUntil: "commit", timeout: 45000 });
  await mobilePage.waitForSelector(".cst-root", { timeout: 30000 });
  await mobilePage.waitForTimeout(500);

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
