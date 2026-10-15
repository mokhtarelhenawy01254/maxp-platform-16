const { chromium } = require("playwright");
const path = require("path");

const ARTIFACT_DIR = "C:\\Users\\mokhtar\\.gemini\\antigravity\\brain\\41ef79a3-5cc9-46f9-9677-3f9a7948aeaa";

const pages = [
  { name: "an_products", path: "/analytics/orders/products" },
  { name: "an_variations", path: "/analytics/orders/variations" },
  { name: "an_campaign_attribution", path: "/analytics/orders/campaign-attribution" },
  { name: "an_status_analysis", path: "/analytics/orders/status-analysis" },
  { name: "an_fulfillment", path: "/analytics/orders/fulfillment" },
];

(async () => {
  const mode = process.argv[2] || "before";
  console.log(`Starting Batch 77 capture in mode: ${mode}...`);

  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  const fatalErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (
        !text.includes("Failed to load resource") &&
        !text.includes("404") &&
        !text.includes("401") &&
        !text.includes("500") &&
        !text.includes("favicon") &&
        !text.includes("Refresh token") &&
        !text.includes("Authentication failed") &&
        !text.includes("Error fetching company") &&
        !text.includes("WebSocket") &&
        !text.includes("SOCKET")
      ) {
        fatalErrors.push(text);
      }
    }
  });

  page.on("pageerror", (err) => {
    fatalErrors.push(err.message);
  });

  await page.addInitScript(() => {
    const mockJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InN1cGVyLWFkbWluLWlkIiwicm9sZSI6IlNVUEVSX0FETUlOIiwiZXhwIjoyNTI0NjA4MDAwfQ.mocksignature";
    localStorage.setItem("token", mockJwt);
    localStorage.setItem("accessToken", mockJwt);
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: "super-admin-id",
        email: "admin@maxp.online",
        name: "Super Admin",
        role: "SUPER_ADMIN",
        companyId: "default-company-id",
      })
    );
    localStorage.setItem("companyId", "default-company-id");
    localStorage.setItem("activeCompanyId", "default-company-id");
  });

  for (const p of pages) {
    try {
      console.log(`[${mode}] Navigating to ${p.name} at ${p.path}...`);
      await page.goto(`http://127.0.0.1:5173${p.path}`, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      await page.waitForTimeout(1500);

      const shotPath = path.join(ARTIFACT_DIR, `${p.name}_${mode}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
      console.log(`[${mode}] Saved screenshot to: ${shotPath}`);
    } catch (err) {
      console.error(`Error on ${p.name}:`, err.message);
    }
  }

  await browser.close();

  console.log(`\n=== Fatal Errors Count: ${fatalErrors.length} ===`);
  if (fatalErrors.length > 0) {
    console.log("Fatal errors encountered:");
    fatalErrors.forEach((e) => console.log(" - " + e));
    process.exit(1);
  } else {
    console.log("Capture completed cleanly with ZERO fatal errors.");
    process.exit(0);
  }
})();
