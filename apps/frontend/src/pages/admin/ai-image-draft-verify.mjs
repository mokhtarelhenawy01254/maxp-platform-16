import { chromium } from "playwright";

const url = "http://localhost:3002/admin/ai-image-generator";
const screenshotPath = "H:/maxp-platform/apps/frontend/src/pages/admin/ai-image-draft-verify.png";

const browser = await chromium.launch({ headless: true, executablePath: "C:/Users/mokhtar/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe" });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

await page.goto(url, { waitUntil: "networkidle" });

// Login if needed
if (await page.locator('button[type="submit"]').isVisible().catch(() => false)) {
  await page.fill('input[type="email"]', "swan@h2m.com");
  await page.fill('input[type="password"]', "0165676135");
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle", timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.goto(url, { waitUntil: "networkidle" });
}

await page.waitForSelector("text=مصمم الصور", { timeout: 20000 });

// Fill a few fields to test draft auto-save
await page.fill("input#productName, input[placeholder*='اسم المنتج']", "هاتف ذكي جديد");
await page.fill("input#headline, input[placeholder*='العنوان الرئيسي']", "عرض خاص لفترة محدودة");

// Wait for localStorage save
await page.waitForTimeout(500);
const draftBefore = await page.evaluate(() => localStorage.getItem("aiImageGenerator_draft_v1"));
console.log("Draft saved:", !!draftBefore);

// Reload and check restoration
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector("text=مصمم الصور", { timeout: 20000 });
const productName = await page.inputValue("input#productName, input[placeholder*='اسم المنتج']").catch(() => "");
const headline = await page.inputValue("input#headline, input[placeholder*='العنوان الرئيسي']").catch(() => "");
console.log("Restored productName:", productName);
console.log("Restored headline:", headline);

// Check gallery search/filter visibility
const hasSearch = await page.locator("input[placeholder*='ابحث']").isVisible().catch(() => false);
const hasPlatformFilter = await page.locator("text=المنصة").first().isVisible().catch(() => false);
console.log("Gallery search visible:", hasSearch);
console.log("Gallery platform filter visible:", hasPlatformFilter);

await page.screenshot({ path: screenshotPath, fullPage: true });
console.log("Screenshot saved to", screenshotPath);

await browser.close();
