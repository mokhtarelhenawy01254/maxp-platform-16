const { chromium } = require("playwright");
const path = require("path");

const ARTIFACT_DIR = "C:\\Users\\mokhtar\\.gemini\\antigravity\\brain\\41ef79a3-5cc9-46f9-9677-3f9a7948aeaa";
const BASE_URL = "http://127.0.0.1:5173";

const pagesToCapture = [
  { name: "an_orders", path: "/analytics/orders/orders" },
  { name: "an_revenue", path: "/analytics/orders/revenue" },
  { name: "an_stock", path: "/analytics/orders/stock" },
  { name: "an_customers", path: "/analytics/orders/customers" },
  { name: "an_payments", path: "/analytics/orders/payments" },
];

const mode = process.argv[2] || "before";

(async () => {
  console.log(`Starting Batch 80 capture in mode: ${mode}...`);
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();
  let fatalErrors = 0;

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (
        text.includes("401") ||
        text.includes("Refresh token") ||
        text.includes("Authentication failed") ||
        text.includes("Failed to load resource") ||
        text.includes("WebSocket") ||
        text.includes("Error fetching company") ||
        text.includes("vite:preload")
      ) {
        return;
      }
      console.error(`[Browser Error]: ${text}`);
      fatalErrors++;
    }
  });

  page.on("pageerror", (err) => {
    console.error(`[Page Error]: ${err.message}`);
    fatalErrors++;
  });

  for (const item of pagesToCapture) {
    try {
      console.log(`[${mode}] Navigating to ${item.name} at ${item.path}...`);
      await page.goto(`${BASE_URL}${item.path}`, {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });
      await page.waitForTimeout(1500);

      const screenshotPath = path.join(ARTIFACT_DIR, `${item.name}_${mode}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`[${mode}] Saved screenshot to: ${screenshotPath}`);
    } catch (err) {
      console.error(`[${mode}] Failed to capture ${item.name}:`, err.message);
    }
  }

  await browser.close();
  console.log(`\n=== Fatal Errors Count: ${fatalErrors} ===`);
  if (fatalErrors > 0) {
    console.error("FAILED: Fatal errors detected during capture.");
    process.exit(1);
  } else {
    console.log("Capture completed cleanly with ZERO fatal errors.");
    process.exit(0);
  }
})();
